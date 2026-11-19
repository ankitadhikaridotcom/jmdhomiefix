const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Service = require('../models/Service');
const ServiceCategory = require('../models/ServiceCategory');
const { requireAuth, requireRole } = require('../middleware/auth');

// In-memory cache for Nominatim requests to strictly respect usage policies
const geocodeCache = new Map();
const searchCache = new Map();
const isValidCoordinate = (latitude, longitude) => (
  latitude !== undefined && latitude !== null && latitude !== ''
  && longitude !== undefined && longitude !== null && longitude !== ''
  && Number.isFinite(Number(latitude))
  && Number.isFinite(Number(longitude))
  && Number(latitude) >= -90
  && Number(latitude) <= 90
  && Number(longitude) >= -180
  && Number(longitude) <= 180
);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Helper: Nominatim Reverse Geocode
async function reverseGeocode(lat, lon) {
  const cacheKey = `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'HomieFix/1.0 (contact@homiefix.com)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.statusText}`);
  }

  const data = await response.json();
  const addr = data.address || {};

  const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.road || addr.village || addr.subdistrict || '';
  const city = addr.city || addr.town || addr.village || addr.municipality || addr.subdistrict || addr.county || addr.district || addr.state_district || '';
  const state = addr.state || '';
  const country = addr.country || 'India';
  const pincode = (addr.postcode || '').replace(/\s+/g, '').slice(0, 6);
  const formattedAddress = data.display_name || `${locality}, ${city}, ${state}`.replace(/^,\s*/, '');

  const result = {
    formattedAddress,
    locality,
    city,
    state,
    country,
    pincode,
    latitude: Number(lat),
    longitude: Number(lon),
  };

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

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&addressdetails=1&limit=8`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HomieFix/1.0 (contact@homiefix.com)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim search error: ${response.statusText}`);
    }

    const data = await response.json();
    const results = data.map(item => {
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

// 4. GET /api/providers/nearby - Geospatial search using $geoNear with fallback for all services
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, latitude, longitude, maxDistance, category, search, serviceId } = req.query;

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
    providers.forEach(p => providerMap.set(p._id.toString(), p));

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
    const CATEGORY_ALIASES = {
      plumbing: 'Plumber',
      plumber: 'Plumber',
      electrical: 'Electrician',
      electrician: 'Electrician',
      electric: 'Electrician',
      cleaning: 'Home Cleaning',
      clean: 'Home Cleaning',
      'home cleaning': 'Home Cleaning',
      house: 'Home Cleaning',
      carpentry: 'Carpenter',
      carpenter: 'Carpenter',
      appliances: 'Appliance Repair',
      appliance: 'Appliance Repair',
      'appliance repair': 'Appliance Repair',
      painting: 'Painting',
      paint: 'Painting',
      painter: 'Painting',
      'pest control': 'Pest Control',
      pest: 'Pest Control',
      'salon at home': 'Salon at Home',
      salon: 'Salon at Home',
      'ac repair': 'AC Repair',
      ac: 'AC Repair',
    };

    if (category && category.trim()) {
      const catTrim = category.trim().toLowerCase();
      const mappedName = CATEGORY_ALIASES[catTrim] || category.trim();
      serviceQuery.category = new RegExp(`^(${escapeRegex(mappedName)}|${escapeRegex(category.trim())})$`, 'i');
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const terms = cleanSearch.toLowerCase().split(/\s+/).filter(Boolean);
      const orClauses = [];

      // Exact phrase match
      const phraseRegex = new RegExp(escapeRegex(cleanSearch), 'i');
      orClauses.push({ name: phraseRegex }, { category: phraseRegex }, { description: phraseRegex });

      // Individual terms
      terms.forEach((term) => {
        const termRegex = new RegExp(escapeRegex(term), 'i');
        orClauses.push({ name: termRegex }, { category: termRegex }, { description: termRegex });
        if (CATEGORY_ALIASES[term]) {
          const catName = CATEGORY_ALIASES[term];
          orClauses.push({ category: new RegExp(`^${escapeRegex(catName)}$`, 'i') });
        }
      });

      // Special domain keywords
      if (/fan|switch|breaker|mcb|wire|wiring|inverter|short/i.test(cleanSearch)) {
        orClauses.push({ category: new RegExp('^Electrician$', 'i') });
      }
      if (/pipe|tap|drain|leak|water|flush|basin/i.test(cleanSearch)) {
        orClauses.push({ category: new RegExp('^Plumber$', 'i') });
      }
      if (/wood|furniture|door|lock|table|chair|bed/i.test(cleanSearch)) {
        orClauses.push({ category: new RegExp('^Carpenter$', 'i') });
      }
      if (/wash|mop|dust|vacuum|maid|sofa|carpet/i.test(cleanSearch)) {
        orClauses.push({ category: new RegExp('^Home Cleaning$', 'i') });
      }
      if (/cooling|filter|gas|compressor/i.test(cleanSearch)) {
        orClauses.push({ category: new RegExp('^(AC Repair|Appliance Repair)$', 'i') });
      }

      serviceQuery.$or = orClauses;
    }

    const services = await Service.find(serviceQuery)
      .populate('provider', 'name phone profileImage location address serviceRadius role providerStatus verificationStatus');
    const activeCategories = new Set(await ServiceCategory.distinct('name', { isActive: true }));

    const nearbyServices = [];
    const otherServices = [];

    services.forEach(s => {
      if (!s.provider || !(
        s.provider.providerStatus === 'approved'
        || (s.provider.role === 'provider'
          && s.provider.providerStatus === 'not_applied'
          && s.provider.verificationStatus === 'approved')
      ) || !activeCategories.has(s.category)) return;
      const providerIdStr = (s.provider._id || s.provider).toString();
      const providerData = providerMap.get(providerIdStr);

      const serviceObj = {
        id: s._id.toString(),
        name: s.name,
        category: s.category,
        description: s.description || '',
        price: s.basePrice,
        pricingType: s.pricingType,
        fixedPrice: s.fixedPrice || null,
        inspectionFee: s.inspectionFee || null,
        visitFee: s.visitFee || null,
        hourlyRate: s.hourlyRate || null,
        image: s.image || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
        provider: {
          id: providerIdStr,
          name: s.provider.name || 'Provider',
          phone: s.provider.phone || '',
          profileImage: s.provider.profileImage || '',
          serviceRadius: s.provider.serviceRadius || 10,
          address: s.provider.address,
          location: s.provider.location,
        },
        rating: 4.8,
        reviewCount: 12,
        createdAt: s.createdAt || null,
        isNew: Boolean(s.createdAt && (Date.now() - new Date(s.createdAt).getTime()) < 14 * 24 * 60 * 60 * 1000),
      };

      if (providerData && providerData.distanceInKm !== undefined) {
        serviceObj.distance = providerData.distanceInKm;
        if (providerData.distanceInKm <= (s.provider.serviceRadius || 10)) {
          nearbyServices.push(serviceObj);
        } else {
          serviceObj.distance = null;
          otherServices.push(serviceObj);
        }
      } else {
        serviceObj.distance = null;
        otherServices.push(serviceObj);
      }
    });

    // Sort nearby services by distance first
    nearbyServices.sort((a, b) => a.distance - b.distance);

    // Combine nearby services first, then other available services
    const combinedServices = [...nearbyServices, ...otherServices];

    res.json({
      success: true,
      count: combinedServices.length,
      nearbyCount: nearbyServices.length,
      services: combinedServices,
      providers: providers.map(p => ({
        id: p._id.toString(),
        name: p.name,
        phone: p.phone,
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
