const getBrowserPosition = (options) => (
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  })
);

const getGeolocationPermissionState = async () => {
  try {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      return status?.state || 'prompt';
    }
  } catch {
    // Ignore unsupported permissions query errors
  }
  return 'prompt';
};

export const reverseGeocodeCoordinates = async (apiBase, latitude, longitude) => {
  // 1. Primary backend multi-provider reverse geocode (Nominatim -> Photon -> BigDataCloud)
  try {
    const res = await fetch(`${apiBase}/api/location/reverse-geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
    });
    const data = await res.json();
    if (data?.success) {
      return {
        latitude: Number(latitude),
        longitude: Number(longitude),
        locality: data.locality || '',
        city: data.city || data.locality || '',
        state: data.state || '',
        country: data.country || 'India',
        pincode: data.pincode || '',
        formattedAddress: data.formattedAddress || `GPS (${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)})`,
      };
    }
  } catch (err) {
    console.warn('[Backend Reverse Geocode Warning]', err?.message);
  }

  // 2. Direct client-side BigDataCloud fallback if backend is unreachable
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&localityLanguage=en`,
      { signal: AbortSignal.timeout(4500) }
    );
    if (bdcRes.ok) {
      const bdc = await bdcRes.json();
      const locality = bdc.locality || '';
      const city = bdc.city || bdc.locality || '';
      const state = bdc.principalSubdivision || '';
      const country = bdc.countryName || 'India';
      const pincode = (bdc.postcode || '').replace(/\s+/g, '').slice(0, 6);
      const formattedAddress = [locality !== city ? locality : '', city, state, country].filter(Boolean).join(', ');
      return {
        latitude: Number(latitude),
        longitude: Number(longitude),
        locality,
        city,
        state,
        country,
        pincode,
        formattedAddress: formattedAddress || `GPS (${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)})`,
      };
    }
  } catch (bdcErr) {
    console.warn('[Direct Reverse Geocode Warning]', bdcErr?.message);
  }

  return {
    latitude: Number(latitude),
    longitude: Number(longitude),
    locality: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    formattedAddress: `GPS Location (${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)})`,
  };
};

/**
 * Detect genuine browser/device GPS location (never overrides with inaccurate ISP GeoIP cities).
 * Throws a structured Error with `code` ('PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED' | 'INSECURE_ORIGIN').
 */
export const detectCurrentLocation = async (apiBase) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    const err = new Error('Geolocation is not supported by your browser. Search by city/PIN or click on the map.');
    err.code = 'UNSUPPORTED';
    throw err;
  }

  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    const err = new Error('Browser GPS requires localhost or HTTPS. Open via localhost or search by city/PIN.');
    err.code = 'INSECURE_ORIGIN';
    throw err;
  }

  const permissionState = await getGeolocationPermissionState();
  if (permissionState === 'denied') {
    const err = new Error(
      'Location permission is blocked in your browser or Windows Settings (Privacy & security → Location). Turn it on for GPS, or enter your PIN / search city / drag the map pin.'
    );
    err.code = 'PERMISSION_DENIED';
    throw err;
  }

  let position;
  try {
    try {
      position = await getBrowserPosition({
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      });
    } catch (firstErr) {
      if (firstErr?.code === 1 || firstErr?.code === firstErr?.PERMISSION_DENIED) {
        throw firstErr;
      }
      position = await getBrowserPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      });
    }
  } catch (geoErr) {
    if (geoErr?.code === 1 || geoErr?.code === geoErr?.PERMISSION_DENIED) {
      const err = new Error(
        'Location access was denied by your browser or Windows Location Services (Settings → Privacy & security → Location). Enable it for GPS, or enter your PIN code / search area / pick on map.'
      );
      err.code = 'PERMISSION_DENIED';
      throw err;
    }
    if (geoErr?.code === 3 || geoErr?.code === geoErr?.TIMEOUT) {
      const err = new Error(
        'Device GPS timed out (common on desktops when Windows Location Services is off). Enter your PIN code, search your area, or pick on the map.'
      );
      err.code = 'TIMEOUT';
      throw err;
    }
    const err = new Error(
      'Device GPS / Wi-Fi location is unavailable on this browser (check Windows Settings → Privacy & security → Location). Enter your PIN code, search your area, or pick on the map.'
    );
    err.code = 'POSITION_UNAVAILABLE';
    throw err;
  }

  const { latitude, longitude } = position.coords;
  const geo = await reverseGeocodeCoordinates(apiBase, latitude, longitude);
  return {
    ...geo,
    source: 'gps',
    approximate: false,
  };
};
