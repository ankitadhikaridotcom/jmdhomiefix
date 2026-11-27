const express = require('express');
const net = require('net');
const router = express.Router();
const User = require('../models/User');
const Service = require('../models/Service');
const ServiceCategory = require('../models/ServiceCategory');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  CATEGORY_ALIASES,
  escapeRegex,
  isValidCoordinate,
  isApprovedProvider,
  haversineKm,
  resolveServiceCoordinates,
  mapService,
  buildServiceSearchClauses,
  sortServices,
} = require('../utils/serviceHelpers');

// In-memory cache for Nominatim requests to strictly respect usage policies
const geocodeCache = new Map();
const searchCache = new Map();

const isPrivateOrLoopbackIp = (ip) => {
  if (!ip) return true;
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168.')) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.toLowerCase().startsWith('fe80:') || ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) {
    return true;
  }
  return false;
};

// Helper: Multi-provider Reverse Geocode (Nominatim -> Photon -> BigDataCloud)
async function reverseGeocode(lat, lon) {
  const cacheKey = `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  let result = null;

  // 1. OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'Nivestry/1.0 (contact@nivestry.com)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};

      const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.village || addr.subdistrict || '';
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.subdistrict || addr.county || addr.district || addr.state_district || '';
      const state = addr.state || '';
      const country = addr.country || 'India';
      const pincode = (addr.postcode || '').replace(/\s+/g, '').slice(0, 6);
      const formattedAddress = data.display_name || [locality, city, state, country].filter(Boolean).join(', ');

      result = {
        formattedAddress,
        locality,
        city,
        state,
        country,
        pincode,
        latitude: Number(lat),
        longitude: Number(lon),
      };
    }
  } catch (err) {
    console.warn('[Nominatim Reverse Geocode Fallback]', err.message);
  }

  // 2. Komoot Photon Reverse Geocode
  if (!result) {
    try {
      const photonUrl = `https://photon.komoot.io/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
      const photonRes = await fetch(photonUrl, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Nivestry/1.0 (contact@nivestry.com)' },
      });
      if (photonRes.ok) {
        const photonData = await photonRes.json();
        const props = photonData?.features?.[0]?.properties;
        if (props) {
          const locality = props.locality || props.suburb || props.district || props.street || props.name || '';
          const city = props.city || props.town || props.village || props.county || props.district || '';
          const state = props.state || '';
          const country = props.country || 'India';
          const pincode = (props.postcode || '').replace(/\s+/g, '').slice(0, 6);
          const formattedAddress = [props.name, locality !== props.name ? locality : '', city, state, pincode, country]
            .filter(Boolean)
            .join(', ');
          result = {
            formattedAddress: formattedAddress || `${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`,
            locality,
            city,
            state,
            country,
            pincode,
            latitude: Number(lat),
            longitude: Number(lon),
          };
        }
      }
    } catch (photonErr) {
      console.warn('[Photon Reverse Geocode Fallback]', photonErr.message);
    }
  }

  // 3. BigDataCloud Reverse Geocode
  if (!result) {
    try {
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;
      const bdcRes = await fetch(bdcUrl, { signal: AbortSignal.timeout(5000) });
      if (bdcRes.ok) {
        const bdc = await bdcRes.json();
        const locality = bdc.locality || '';
        const city = bdc.city || bdc.locality || '';
        const state = bdc.principalSubdivision || '';
        const country = bdc.countryName || 'India';
        const pincode = (bdc.postcode || '').replace(/\s+/g, '').slice(0, 6);
        const formattedAddress = [locality !== city ? locality : '', city, state, country].filter(Boolean).join(', ');
        result = {
          formattedAddress: formattedAddress || `${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`,
          locality,
          city,
          state,
          country,
          pincode,
          latitude: Number(lat),
          longitude: Number(lon),
        };
      }
    } catch (bdcErr) {
      console.warn('[BigDataCloud Reverse Geocode Fallback]', bdcErr.message);
    }
  }

  if (!result) {
    throw new Error('All reverse geocoding providers failed.');
  }

  if (geocodeCache.size >= 500) geocodeCache.clear();
  geocodeCache.set(cacheKey, result);
  return result;
}

// 1. Reverse Geocode Endpoint
router.post('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon, latitude, longitude } = req.body;
    const finalLat = lat !== undefined ? lat : latitude;
    const finalLon = lon !== undefined ? lon : longitude;

    if (!isValidCoordinate(finalLat, finalLon)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' });
    }

    const result = await reverseGeocode(finalLat, finalLon);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Reverse Geocode Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to reverse geocode location.' });
  }
});

// 1b. Approximate IP-based Location Fallback (for desktop browsers where GPS/Windows Location is unavailable)
router.get('/ip-detect', async (req, res) => {
  try {
    const forwarded = req.headers['x-forwarded-for'];
    let clientIp = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : (req.ip || req.socket?.remoteAddress || '');
    clientIp = clientIp.replace(/^::ffff:/, '');

    const hasPublicIp = Boolean(clientIp && net.isIP(clientIp) && !isPrivateOrLoopbackIp(clientIp));
    const ipParam = hasPublicIp ? encodeURIComponent(clientIp) : '';

    let detected = null;

    // 1. ipwho.is (HTTPS)
    try {
      const whoRes = await fetch(`https://ipwho.is/${ipParam}`, { signal: AbortSignal.timeout(4000) });
      if (whoRes.ok) {
        const who = await whoRes.json();
        if (who.success && isValidCoordinate(who.latitude, who.longitude)) {
          detected = {
            latitude: Number(who.latitude),
            longitude: Number(who.longitude),
            city: who.city || '',
            state: who.region || '',
            country: who.country || 'India',
            pincode: (who.postal || '').replace(/\s+/g, '').slice(0, 6),
          };
        }
      }
    } catch (whoErr) {
      console.warn('[IP Detect ipwho.is warning]', whoErr.message);
    }

    // 2. ipinfo.io (HTTPS)
    if (!detected) {
      try {
        const infoUrl = ipParam ? `https://ipinfo.io/${ipParam}/json` : 'https://ipinfo.io/json';
        const infoRes = await fetch(infoUrl, { signal: AbortSignal.timeout(4000) });
        if (infoRes.ok) {
          const info = await infoRes.json();
          const [latStr, lonStr] = String(info.loc || '').split(',');
          if (isValidCoordinate(latStr, lonStr)) {
            detected = {
              latitude: Number(latStr),
              longitude: Number(lonStr),
              city: info.city || '',
              state: info.region || '',
              country: info.country === 'IN' ? 'India' : (info.country || 'India'),
              pincode: (info.postal || '').replace(/\s+/g, '').slice(0, 6),
            };
          }
        }
      } catch (infoErr) {
        console.warn('[IP Detect ipinfo.io warning]', infoErr.message);
      }
    }

    // 3. api.ip.sb (HTTPS)
    if (!detected) {
      try {
        const sbUrl = ipParam ? `https://api.ip.sb/geoip/${ipParam}` : 'https://api.ip.sb/geoip';
        const sbRes = await fetch(sbUrl, {
          signal: AbortSignal.timeout(4000),
          headers: { 'User-Agent': 'Nivestry/1.0' },
        });
        if (sbRes.ok) {
          const sb = await sbRes.json();
          if (isValidCoordinate(sb.latitude, sb.longitude)) {
            detected = {
              latitude: Number(sb.latitude),
              longitude: Number(sb.longitude),
              city: sb.city || '',
              state: sb.region || '',
              country: sb.country || 'India',
              pincode: (sb.postal_code || '').replace(/\s+/g, '').slice(0, 6),
            };
          }
        }
      } catch (sbErr) {
        console.warn('[IP Detect api.ip.sb warning]', sbErr.message);
      }
    }

    // 4. ip-api.com (HTTP fallback)
    if (!detected) {
      try {
        const ipApiRes = await fetch(
          `http://ip-api.com/json/${ipParam}?fields=status,country,regionName,city,zip,lat,lon`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (ipApiRes.ok) {
          const ipApi = await ipApiRes.json();
          if (ipApi.status === 'success' && isValidCoordinate(ipApi.lat, ipApi.lon)) {
            detected = {
              latitude: Number(ipApi.lat),
              longitude: Number(ipApi.lon),
              city: ipApi.city || '',
              state: ipApi.regionName || '',
              country: ipApi.country || 'India',
              pincode: (ipApi.zip || '').replace(/\s+/g, '').slice(0, 6),
            };
          }
        }
      } catch (ipApiErr) {
        console.warn('[IP Detect ip-api warning]', ipApiErr.message);
      }
    }

    if (!detected) {
      return res.status(503).json({ success: false, message: 'Could not detect approximate location from IP.' });
    }

    let enrichedGeo = null;
    try {
      enrichedGeo = await reverseGeocode(detected.latitude, detected.longitude);
    } catch {
      // Fallback silently to IP provider fields
    }

    const city = detected.city || enrichedGeo?.city || '';
    const state = detected.state || enrichedGeo?.state || '';
    const country = detected.country || enrichedGeo?.country || 'India';
    const locality = enrichedGeo?.locality || city;
    const pincode = detected.pincode || enrichedGeo?.pincode || '';
    const formattedAddress =
      enrichedGeo?.formattedAddress
      || [locality !== city ? locality : '', city, state, country].filter(Boolean).join(', ');

    return res.json({
      success: true,
      source: 'ip',
      formattedAddress: formattedAddress || `${detected.latitude.toFixed(4)}, ${detected.longitude.toFixed(4)}`,
      locality,
      city,
      state,
      country,
      pincode,
      latitude: detected.latitude,
      longitude: detected.longitude,
    });
  } catch (err) {
    console.error('[IP Detect Error]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to detect approximate location.' });
  }
});

// 2. Address Search Endpoint (Nominatim with debouncing support)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (q !== undefined && typeof q !== 'string') {
      return res.status(400).json({ success: false, message: 'Search query must be text.' });
    }
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, results: [] });
    }
    if (q.length > 120) {
      return res.status(400).json({ success: false, message: 'Search query must be 120 characters or fewer.' });
    }

    const cleanQuery = q.trim().toLowerCase();
    if (searchCache.has(cleanQuery)) {
      return res.json({ success: true, results: searchCache.get(cleanQuery) });
    }

    let results = [];
    const pinOnly = /^\d{6}$/.test(cleanQuery);
    const nomQuery = pinOnly ? `${cleanQuery}, india` : cleanQuery;

    // 1. Nominatim (biased to India for PIN/local queries)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(nomQuery)}&countrycodes=in&addressdetails=1&limit=8`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        headers: {
          'User-Agent': 'Nivestry/1.0 (contact@nivestry.com)',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (response.ok) {
        const data = await response.json();
        results = data.map((item) => {
          const addr = item.address || {};
          const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.village || addr.subdistrict || '';
          const city = addr.city || addr.town || addr.village || addr.municipality || addr.subdistrict || addr.county || addr.district || addr.state_district || '';
          const state = addr.state || '';
          const country = addr.country || 'India';
          const pincode = (addr.postcode || '').replace(/\s+/g, '').slice(0, 6);
          return {
            formattedAddress: item.display_name,
            locality,
            city,
            state,
            country,
            pincode,
            latitude: Number(item.lat),
            longitude: Number(item.lon),
          };
        }).filter((item) => isValidCoordinate(item.latitude, item.longitude));
      }
    } catch (nomErr) {
      console.warn('[Nominatim Search Fallback]', nomErr.message);
    }

    // 2. Komoot Photon Search fallback
    if (results.length === 0) {
      try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(nomQuery)}&limit=8&lat=22.97&lon=78.65`;
        const pRes = await fetch(photonUrl, {
          signal: AbortSignal.timeout(6000),
          headers: { 'User-Agent': 'Nivestry/1.0 (contact@nivestry.com)' },
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          results = (pData.features || []).map((feature) => {
            const props = feature.properties || {};
            const [lon, lat] = feature.geometry?.coordinates || [];
            const locality = props.locality || props.suburb || props.district || props.street || props.name || '';
            const city = props.city || props.town || props.village || props.county || props.district || '';
            const state = props.state || '';
            const country = props.country || 'India';
            const pincode = (props.postcode || '').replace(/\s+/g, '').slice(0, 6);
            return {
              formattedAddress: [props.name, locality !== props.name ? locality : '', city, state, pincode, country]
                .filter(Boolean)
                .join(', '),
              locality,
              city,
              state,
              country,
              pincode,
              latitude: Number(lat),
              longitude: Number(lon),
            };
          }).filter((item) => isValidCoordinate(item.latitude, item.longitude));
        }
      } catch (photonErr) {
        console.warn('[Photon Search Fallback]', photonErr.message);
      }
    }

    if (searchCache.size >= 500) searchCache.clear();
    searchCache.set(cleanQuery, results);
    res.json({ success: true, results });
  } catch (err) {
    console.error('[Address Search Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to search address.' });
  }
});

// 3. Save User Current Location
router.post('/current', requireAuth, async (req, res) => {
  try {
    const { latitude, longitude, formattedAddress, locality, city, state, country, pincode } = req.body;

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.location = {
      type: 'Point',
      coordinates: [Number(longitude), Number(latitude)], // GeoJSON [lng, lat]
    };

    user.address = {
      formattedAddress: formattedAddress || user.address?.formattedAddress || '',
      locality: locality || user.address?.locality || '',
      city: city || user.address?.city || '',
      state: state || user.address?.state || '',
      country: country || user.address?.country || 'India',
      pincode: pincode || user.address?.pincode || '',
      latitude: Number(latitude),
      longitude: Number(longitude),
    };

    await user.save();

    res.json({
      success: true,
      message: 'Location saved successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
        location: user.location,
      },
    });
  } catch (err) {
    console.error('[Save Location Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to save location.' });
  }
});

// 4. GET /api/providers/nearby - Geospatial search using service & provider coordinates with newest-first fallback
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, latitude, longitude, maxDistance, category, search, serviceId, pincode, sort } = req.query;

    const rawLat = lat !== undefined ? lat : latitude;
    const rawLng = lng !== undefined ? lng : longitude;
    const hasCoordinates = rawLat !== undefined || rawLng !== undefined;
    if (hasCoordinates && !isValidCoordinate(rawLat, rawLng)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required together.' });
    }
    if ((category !== undefined && typeof category !== 'string')
      || (search !== undefined && typeof search !== 'string')) {
      return res.status(400).json({ success: false, message: 'Category and search must be text.' });
    }
    if ((search && search.length > 100) || (category && category.length > 100)) {
      return res.status(400).json({ success: false, message: 'Search filters must be 100 characters or fewer.' });
    }
    const customerLat = hasCoordinates ? Number(rawLat) : NaN;
    const customerLng = hasCoordinates ? Number(rawLng) : NaN;
    const maxKm = maxDistance === undefined ? 100 : Number(maxDistance);
    if (!Number.isFinite(maxKm) || maxKm < 1 || maxKm > 500) {
      return res.status(400).json({ success: false, message: 'Maximum distance must be between 1 and 500 km.' });
    }

    let providers = [];
    if (hasCoordinates) {
      try {
        const pipeline = [
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [customerLng, customerLat] },
              distanceField: 'distanceInMeters',
              spherical: true,
              maxDistance: maxKm * 1000,
              query: {
                accountStatus: { $ne: 'suspended' },
                verificationStatus: { $ne: 'suspended' },
                $or: [
                  { providerStatus: 'approved' },
                  { role: 'provider', providerStatus: 'not_applied', verificationStatus: 'approved' },
                ],
                'location.coordinates': { $ne: [0, 0] },
              },
            },
          },
          {
            $addFields: {
              distanceInKm: { $round: [{ $divide: ['$distanceInMeters', 1000] }, 1] },
            },
          },
        ];
        providers = await User.aggregate(pipeline);
      } catch (geoErr) {
        console.warn('[geoNear warning]', geoErr.message);
      }
    }

    const providerMap = new Map();
    providers.forEach((p) => providerMap.set(p._id.toString(), p));

    // Build service query
    const serviceQuery = { isActive: true };
    if (serviceId !== undefined && typeof serviceId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid service ID.' });
    }
    if (serviceId) {
      if (!/^[0-9a-f]{24}$/i.test(serviceId)) {
        return res.status(400).json({ success: false, message: 'Invalid service ID.' });
      }
      serviceQuery._id = serviceId;
    }

    if (category && category.trim()) {
      const catTrim = category.trim().toLowerCase();
      const mappedName = CATEGORY_ALIASES[catTrim] || category.trim();
      serviceQuery.category = new RegExp(`^(${escapeRegex(mappedName)}|${escapeRegex(category.trim())})$`, 'i');
    }

    if (search && search.trim()) {
      serviceQuery.$or = buildServiceSearchClauses(search);
    }

    const services = await Service.find(serviceQuery)
      .sort({ createdAt: -1 })
      .populate('provider', 'name phone profileImage profession experience location address serviceRadius serviceAreas role providerStatus verificationStatus accountStatus');
    const activeCategories = new Set(await ServiceCategory.distinct('name', { isActive: true }));

    const nearbyServices = [];
    const otherServices = [];
    const cleanPincode = typeof pincode === 'string' ? pincode.trim() : '';

    services.forEach((s) => {
      if (!isApprovedProvider(s.provider) || !activeCategories.has(s.category)) return;

      const providerIdStr = (s.provider._id || s.provider).toString();
      const providerAgg = providerMap.get(providerIdStr);
      const effectiveCoords = resolveServiceCoordinates(s);
      const effectiveRadius = s.serviceRadius || s.provider.serviceRadius || 10;
      const thresholdKm = maxDistance !== undefined ? maxKm : effectiveRadius;

      let computedDistance = null;
      if (hasCoordinates && effectiveCoords) {
        computedDistance = Math.round(haversineKm(customerLat, customerLng, effectiveCoords[1], effectiveCoords[0]) * 10) / 10;
      } else if (providerAgg && providerAgg.distanceInKm !== undefined) {
        computedDistance = providerAgg.distanceInKm;
      }

      const matchesPincode = Boolean(
        cleanPincode
        && ((s.address?.pincode && s.address.pincode === cleanPincode)
          || (s.provider.address?.pincode && s.provider.address.pincode === cleanPincode))
      );

      if (computedDistance !== null && computedDistance <= thresholdKm) {
        nearbyServices.push(mapService(s, { distance: computedDistance }));
      } else if (matchesPincode && computedDistance === null) {
        nearbyServices.push(mapService(s, { distance: 0 }));
      } else {
        otherServices.push(mapService(s, { distance: null }));
      }
    });

    const explicitSort = typeof sort === 'string' && ['newest', 'price-low', 'price-high', 'rating', 'popular'].includes(sort)
      ? sort
      : null;

    const sortedNearby = explicitSort
      ? sortServices(nearbyServices, explicitSort)
      : [...nearbyServices].sort((a, b) => (
        (Math.round(a.distance * 10) - Math.round(b.distance * 10))
        || (new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      ));

    const sortedOthers = explicitSort
      ? sortServices(otherServices, explicitSort)
      : sortServices(otherServices, 'newest');

    const combinedServices = [...sortedNearby, ...sortedOthers];

    res.json({
      success: true,
      count: combinedServices.length,
      nearbyCount: sortedNearby.length,
      services: combinedServices,
      providers: providers.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        phone: p.phone?.startsWith('email_') ? '' : (p.phone || ''),
        email: p.email,
        distance: p.distanceInKm,
        serviceRadius: p.serviceRadius || 10,
        address: p.address,
        location: p.location,
      })),
    });
  } catch (err) {
    console.error('[Nearby Providers Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to search nearby providers.' });
  }
});

// 5. Update Provider Service Location & Radius
router.put('/provider', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const { latitude, longitude, formattedAddress, locality, city, state, country, pincode, serviceRadius, openToCustomRequests } = req.body;

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' });
    }
    if (serviceRadius !== undefined && (!Number.isFinite(Number(serviceRadius)) || Number(serviceRadius) < 1 || Number(serviceRadius) > 500)) {
      return res.status(400).json({ success: false, message: 'Service radius must be between 1 and 500 km.' });
    }
    if (openToCustomRequests !== undefined && typeof openToCustomRequests !== 'boolean') {
      return res.status(400).json({ success: false, message: 'openToCustomRequests must be a boolean.' });
    }

    const provider = await User.findById(req.user.id);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found.' });

    provider.location = {
      type: 'Point',
      coordinates: [Number(longitude), Number(latitude)],
    };

    provider.address = {
      formattedAddress: formattedAddress || provider.address?.formattedAddress || '',
      locality: locality || provider.address?.locality || '',
      city: city || provider.address?.city || '',
      state: state || provider.address?.state || '',
      country: country || provider.address?.country || 'India',
      pincode: pincode || provider.address?.pincode || '',
      latitude: Number(latitude),
      longitude: Number(longitude),
    };

    if (serviceRadius !== undefined) {
      provider.serviceRadius = Number(serviceRadius);
    }
    if (openToCustomRequests !== undefined) {
      provider.openToCustomRequests = openToCustomRequests;
    }

    await provider.save();

    res.json({
      success: true,
      message: 'Provider service location updated.',
      provider: {
        id: provider._id,
        name: provider.name,
        address: provider.address,
        location: provider.location,
        serviceRadius: provider.serviceRadius,
        openToCustomRequests: provider.openToCustomRequests,
      },
    });
  } catch (err) {
    console.error('[Provider Location Update Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update provider service location.' });
  }
});

// 6. Get Provider Location Settings
router.get('/provider', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const provider = await User.findById(req.user.id).select('name address location serviceRadius openToCustomRequests');
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found.' });

    res.json({
      success: true,
      provider: {
        id: provider._id,
        name: provider.name,
        address: provider.address,
        location: provider.location,
        serviceRadius: provider.serviceRadius || 10,
        openToCustomRequests: provider.openToCustomRequests || false,
      },
    });
  } catch (err) {
    console.error('[Get Provider Location Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch provider location.' });
  }
});

module.exports = router;
