const DEFAULT_CATEGORY_IMAGES = {
  'Home Cleaning': '/deep-home-cleaning.jpg',
  Electrician: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop',
  Plumber: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop',
  Carpenter: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&auto=format&fit=crop',
  'AC Repair': 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&auto=format&fit=crop',
  'Appliance Repair': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop',
  Painting: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&auto=format&fit=crop',
  'Pest Control': 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=800&auto=format&fit=crop',
  'Salon at Home': 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&auto=format&fit=crop',
};

const FALLBACK_SERVICE_IMAGE = '/deep-home-cleaning.jpg';

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

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

/** Checks whether a user record holds active, non-suspended provider approval. */
const isApprovedProvider = (provider) => Boolean(
  provider
  && provider.role !== 'admin'
  && provider.accountStatus !== 'suspended'
  && provider.verificationStatus !== 'suspended'
  && (
    provider.providerStatus === 'approved'
    || (provider.role === 'provider'
      && provider.providerStatus === 'not_applied'
      && provider.verificationStatus === 'approved')
  )
);

const getDefaultServiceImage = (category) => DEFAULT_CATEGORY_IMAGES[category] || FALLBACK_SERVICE_IMAGE;

/** Calculates great-circle distance in kilometers between two coordinate pairs. */
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/** Extracts [longitude, latitude] from service first, then provider fallback. */
const resolveServiceCoordinates = (service) => {
  const sCoords = service?.location?.coordinates;
  if (Array.isArray(sCoords) && sCoords.length === 2 && isValidCoordinate(sCoords[1], sCoords[0])
    && (Number(sCoords[0]) !== 0 || Number(sCoords[1]) !== 0)) {
    return [Number(sCoords[0]), Number(sCoords[1])];
  }
  if (isValidCoordinate(service?.address?.latitude, service?.address?.longitude)
    && (Number(service.address.latitude) !== 0 || Number(service.address.longitude) !== 0)) {
    return [Number(service.address.longitude), Number(service.address.latitude)];
  }
  const p = service?.provider;
  const pCoords = p?.location?.coordinates;
  if (Array.isArray(pCoords) && pCoords.length === 2 && isValidCoordinate(pCoords[1], pCoords[0])
    && (Number(pCoords[0]) !== 0 || Number(pCoords[1]) !== 0)) {
    return [Number(pCoords[0]), Number(pCoords[1])];
  }
  if (isValidCoordinate(p?.address?.latitude, p?.address?.longitude)
    && (Number(p.address.latitude) !== 0 || Number(p.address.longitude) !== 0)) {
    return [Number(p.address.longitude), Number(p.address.latitude)];
  }
  return null;
};

/** Merges service-level address with provider address fallback for public display. */
const resolveServiceAddress = (service) => {
  const sAddr = service?.address || {};
  const pAddr = service?.provider?.address || {};
  const city = sAddr.city || pAddr.city || service?.provider?.city || '';
  const state = sAddr.state || pAddr.state || '';
  const locality = sAddr.locality || pAddr.locality || '';
  const street = sAddr.street || pAddr.street || '';
  const pincode = sAddr.pincode || pAddr.pincode || '';
  const country = sAddr.country || pAddr.country || 'India';
  const formattedAddress = sAddr.formattedAddress
    || pAddr.formattedAddress
    || [street, locality, city, state, pincode].filter(Boolean).join(', ');
  const coords = resolveServiceCoordinates(service);

  return {
    formattedAddress,
    street,
    locality,
    city,
    state,
    country,
    pincode,
    latitude: sAddr.latitude ?? pAddr.latitude ?? (coords ? coords[1] : undefined),
    longitude: sAddr.longitude ?? pAddr.longitude ?? (coords ? coords[0] : undefined),
  };
};

/** Normalizes a Service document into the unified API contract for all consumer views. */
function mapService(s, { distance = undefined } = {}) {
  const isRecent = s.createdAt && (Date.now() - new Date(s.createdAt).getTime()) < 14 * 24 * 60 * 60 * 1000;
  const providerObj = s.provider && typeof s.provider === 'object' && s.provider._id ? s.provider : null;
  const resolvedAddress = resolveServiceAddress(s);
  const resolvedCoords = resolveServiceCoordinates(s);
  const serviceAreas = Array.isArray(s.serviceAreas) && s.serviceAreas.length > 0
    ? s.serviceAreas
    : (Array.isArray(providerObj?.serviceAreas) ? providerObj.serviceAreas : []);
  const serviceRadius = s.serviceRadius || providerObj?.serviceRadius || 10;

  const mapped = {
    id: s._id.toString(),
    _id: s._id.toString(),
    name: s.name,
    category: s.category,
    serviceKind: s.serviceKind || '',
    estimatedDuration: s.estimatedDuration || '',
    highlights: Array.isArray(s.highlights) ? s.highlights : [],
    description: s.description || '',
    price: s.basePrice,
    priceType: s.pricingType,
    pricingType: s.pricingType,
    fixedPrice: s.fixedPrice || null,
    inspectionFee: s.inspectionFee || null,
    visitFee: s.visitFee || null,
    hourlyRate: s.hourlyRate || null,
    billingIncrement: s.billingIncrement || 60,
    isActive: s.isActive !== undefined ? s.isActive : true,
    image: (s.image && s.image.trim()) ? s.image.trim() : getDefaultServiceImage(s.category),
    address: resolvedAddress,
    location: resolvedCoords ? { type: 'Point', coordinates: resolvedCoords } : undefined,
    serviceRadius,
    serviceAreas,
    provider: s.provider
      ? {
        id: (s.provider._id || s.provider).toString(),
        name: providerObj?.name || '',
        phone: providerObj?.phone?.startsWith('email_') ? '' : (providerObj?.phone || ''),
        profileImage: providerObj?.profileImage || '',
        profession: providerObj?.profession || '',
        experience: providerObj?.experience || 0,
        serviceRadius: providerObj?.serviceRadius || serviceRadius,
        address: providerObj?.address || resolvedAddress,
        location: providerObj?.location,
      }
      : null,
    rating: s.rating || 0,
    reviewCount: s.reviewCount || 0,
    createdAt: s.createdAt || null,
    isNew: Boolean(isRecent),
  };

  if (distance !== undefined) {
    mapped.distance = distance;
  }

  return mapped;
}

/** Builds Mongo search filter clauses covering name, category, kind, description, and location fields. */
function buildServiceSearchClauses(rawSearch) {
  const cleanSearch = rawSearch.trim();
  const terms = cleanSearch.toLowerCase().split(/\s+/).filter(Boolean);
  const orClauses = [];

  const phraseRegex = new RegExp(escapeRegex(cleanSearch), 'i');
  orClauses.push(
    { name: phraseRegex },
    { category: phraseRegex },
    { serviceKind: phraseRegex },
    { description: phraseRegex },
    { highlights: phraseRegex },
    { serviceAreas: phraseRegex },
    { 'address.city': phraseRegex },
    { 'address.locality': phraseRegex },
    { 'address.pincode': phraseRegex },
  );

  terms.forEach((term) => {
    const termRegex = new RegExp(escapeRegex(term), 'i');
    orClauses.push(
      { name: termRegex },
      { category: termRegex },
      { serviceKind: termRegex },
      { description: termRegex },
      { serviceAreas: termRegex },
      { 'address.city': termRegex },
      { 'address.locality': termRegex },
      { 'address.pincode': termRegex },
    );

    if (CATEGORY_ALIASES[term]) {
      const catName = CATEGORY_ALIASES[term];
      orClauses.push({ category: new RegExp(`^${escapeRegex(catName)}$`, 'i') });
    }
  });

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

  return orClauses;
}

/** Sorts mapped services by the requested sort mode. */
function sortServices(list, sort) {
  const copy = [...list];
  if (sort === 'newest') {
    copy.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else if (sort === 'price-low') {
    copy.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-high') {
    copy.sort((a, b) => b.price - a.price);
  } else if (sort === 'rating') {
    copy.sort((a, b) => (b.rating - a.rating) || (new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
  } else if (sort === 'popular') {
    copy.sort((a, b) => ((b.rating * b.reviewCount) - (a.rating * a.reviewCount)) || (new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
  }
  return copy;
}

module.exports = {
  CATEGORY_ALIASES,
  escapeRegex,
  isValidCoordinate,
  isApprovedProvider,
  getDefaultServiceImage,
  haversineKm,
  resolveServiceCoordinates,
  resolveServiceAddress,
  mapService,
  buildServiceSearchClauses,
  sortServices,
};
