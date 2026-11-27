import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaTag, FaSearch, FaClock, FaInfoCircle, FaMapMarkerAlt,
  FaCrosshairs, FaUpload, FaSpinner, FaTimes, FaMapMarkedAlt,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import LeafletMap from '../common/LeafletMap';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const pricingModels = [
  {
    id: 'fixed',
    label: 'Fixed Price',
    icon: <FaTag />,
    color: 'from-emerald-500 to-emerald-600',
    desc: 'Set a complete price. Customer pays the exact amount at booking.',
  },
  {
    id: 'inspection',
    label: 'Inspection / Quote',
    icon: <FaSearch />,
    color: 'from-amber-500 to-orange-500',
    desc: 'Charge a visit fee. Send a detailed quote after inspecting the problem.',
  },
  {
    id: 'hourly',
    label: 'Hourly Rate',
    icon: <FaClock />,
    color: 'from-blue-500 to-indigo-600',
    desc: 'Charge a visit fee plus hourly labour rate. Bill based on actual time spent.',
  },
];

const SERVICE_KIND_PRESETS = [
  'Repair & Troubleshooting',
  'Installation & Setup',
  'Maintenance & Servicing',
  'Deep Cleaning & Sanitization',
  'Inspection & Consultation',
  'Emergency / Express',
  'Full Package',
];

const DURATION_PRESETS = ['30–60 mins', '1–2 hours', '2–4 hours', 'Half Day'];

export const buildInitialServiceForm = (user = null, existing = null) => {
  const addr = existing?.address || user?.address || {};
  const coords = existing?.location?.coordinates?.length === 2
    ? existing.location.coordinates
    : (user?.location?.coordinates?.length === 2 ? user.location.coordinates : null);
  const lat = addr.latitude ?? (coords ? coords[1] : undefined) ?? 29.3803;
  const lng = addr.longitude ?? (coords ? coords[0] : undefined) ?? 79.5126;

  return {
    name: existing?.name || '',
    category: existing?.category || '',
    serviceKind: existing?.serviceKind || '',
    estimatedDuration: existing?.estimatedDuration || '',
    highlights: Array.isArray(existing?.highlights) ? existing.highlights.join(', ') : (existing?.highlights || ''),
    description: existing?.description || '',
    image: existing?.image || '',
    pricingType: existing?.pricingType || 'fixed',
    fixedPrice: existing?.fixedPrice ?? '',
    inspectionFee: existing?.inspectionFee ?? '',
    visitFee: existing?.visitFee ?? '',
    hourlyRate: existing?.hourlyRate ?? '',
    billingIncrement: String(existing?.billingIncrement || 60),
    pincode: addr.pincode || '',
    street: addr.street || '',
    locality: addr.locality || '',
    city: addr.city || user?.city || '',
    state: addr.state || '',
    formattedAddress: addr.formattedAddress || '',
    serviceAreas: Array.isArray(existing?.serviceAreas)
      ? existing.serviceAreas.join(', ')
      : (Array.isArray(user?.serviceAreas) ? user.serviceAreas.join(', ') : ''),
    serviceRadius: String(existing?.serviceRadius || user?.serviceRadius || 10),
    latitude: Number(lat),
    longitude: Number(lng),
  };
};

export const validateServiceForm = (formData) => {
  if (!String(formData.name || '').trim()) return 'Service name is required.';
  if (!String(formData.category || '').trim()) return 'Please select a category.';
  const pt = formData.pricingType;
  if (pt === 'fixed' && (!formData.fixedPrice || Number(formData.fixedPrice) <= 0)) {
    return 'Please enter a valid fixed price.';
  }
  if (pt === 'inspection' && (!formData.inspectionFee || Number(formData.inspectionFee) <= 0)) {
    return 'Please enter a valid inspection/visit fee.';
  }
  if (pt === 'hourly') {
    if (!formData.visitFee || Number(formData.visitFee) <= 0) return 'Please enter a valid visit fee.';
    if (!formData.hourlyRate || Number(formData.hourlyRate) <= 0) return 'Please enter a valid hourly rate.';
  }
  const pin = String(formData.pincode || '').trim();
  if (!pin || !/^\d{6}$/.test(pin)) {
    return 'Please enter a valid 6-digit PIN code.';
  }
  if (!String(formData.city || '').trim()) {
    return 'Please enter the service city.';
  }
  if (!String(formData.formattedAddress || formData.street || formData.locality || '').trim()) {
    return 'Please enter a service address or locality.';
  }
  const radius = Number(formData.serviceRadius);
  if (!Number.isFinite(radius) || radius < 1 || radius > 500) {
    return 'Service radius must be between 1 and 500 km.';
  }
  return null;
};

export const ServiceFormFields = ({ formData, setFormData, categories = [], user = null, compact = false }) => {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchBoxRef = useRef(null);
  const lastLookedUpPinRef = useRef('');

  useEffect(() => {
    const handleOutside = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const pin = String(formData.pincode || '').trim();
    if (!/^\d{6}$/.test(pin) || pin === lastLookedUpPinRef.current) return;
    if (user?.address?.pincode === pin && user?.address?.latitude && user?.address?.longitude) {
      lastLookedUpPinRef.current = pin;
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/location/search?q=${encodeURIComponent(`${pin}, India`)}`);
        const data = await res.json();
        const first = data?.results?.[0];
        if (data.success && first) {
          lastLookedUpPinRef.current = pin;
          setFormData((prev) => ({
            ...prev,
            latitude: Number(first.latitude),
            longitude: Number(first.longitude),
            city: prev.city || first.city || first.locality || '',
            state: prev.state || first.state || '',
            locality: prev.locality || first.locality || '',
            formattedAddress: prev.formattedAddress || first.formattedAddress || '',
          }));
        }
      } catch {
        // Silent auto-lookup fallback; provider can click Locate or use the map
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [formData.pincode, setFormData, user]);

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (e) => {
    updateField(e.target.name, e.target.value);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be under 5MB.');
      return;
    }
    setUploadingImage(true);
    const body = new FormData();
    body.append('image', file);
    try {
      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        credentials: 'include',
        body,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Image upload failed.');
      updateField('image', data.photoUrl);
      toast.success('Service image uploaded!');
    } catch (err) {
      toast.error(err.message || 'Could not upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const applySavedProfileLocation = () => {
    if (!user?.address && !user?.location) {
      toast.error('No saved base location found on your profile yet.');
      return;
    }
    const addr = user.address || {};
    const coords = user.location?.coordinates;
    setFormData((prev) => ({
      ...prev,
      pincode: addr.pincode || prev.pincode,
      street: addr.street || prev.street,
      locality: addr.locality || prev.locality,
      city: addr.city || user.city || prev.city,
      state: addr.state || prev.state,
      formattedAddress: addr.formattedAddress || prev.formattedAddress,
      serviceAreas: Array.isArray(user.serviceAreas) && user.serviceAreas.length
        ? user.serviceAreas.join(', ')
        : prev.serviceAreas,
      serviceRadius: String(user.serviceRadius || prev.serviceRadius || 10),
      latitude: addr.latitude ?? (coords?.length === 2 ? coords[1] : prev.latitude),
      longitude: addr.longitude ?? (coords?.length === 2 ? coords[0] : prev.longitude),
    }));
    toast.success('Applied your saved base location.');
  };

  const reverseGeocodeAndFill = async (latitude, longitude, toastId = null) => {
    try {
      const res = await fetch(`${API}/api/location/reverse-geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });
      const loc = await res.json();
      if (loc.success) {
        setFormData((prev) => ({
          ...prev,
          latitude: Number(latitude),
          longitude: Number(longitude),
          city: loc.city || loc.locality || prev.city,
          state: loc.state || prev.state,
          locality: loc.locality || prev.locality,
          pincode: loc.pincode || prev.pincode,
          formattedAddress: loc.formattedAddress || prev.formattedAddress,
          street: prev.street || loc.locality || '',
        }));
        if (toastId) toast.success(`Pinned: ${loc.city || loc.locality || 'Location updated'}`, { id: toastId });
        return;
      }
    } catch (err) {
      console.error('[Service Reverse Geocode Error]', err);
    }
    if (toastId) toast.success('GPS coordinates captured.', { id: toastId });
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetecting(true);
    const toastId = toast.loading('Detecting GPS location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        updateField('latitude', Number(latitude));
        updateField('longitude', Number(longitude));
        await reverseGeocodeAndFill(latitude, longitude, toastId);
        setIsDetecting(false);
      },
      (error) => {
        setIsDetecting(false);
        toast.error(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied. Search by PIN or drag the map pin.'
            : 'Could not detect GPS location. Search by PIN or drag the map pin.',
          { id: toastId }
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const runSearch = async (query) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setDropdownOpen(false);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`${API}/api/location/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.success) {
        const list = data.results || [];
        setSearchResults(list);
        setDropdownOpen(list.length > 0);
      }
    } catch (err) {
      console.error('[Service Location Search Error]', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInput = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setDropdownOpen(false);
      setIsSearching(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => runSearch(query), 350);
  };

  const handleSelectSearchItem = (item) => {
    setFormData((prev) => ({
      ...prev,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      city: item.city || item.locality || prev.city,
      state: item.state || prev.state,
      locality: item.locality || prev.locality,
      pincode: item.pincode || prev.pincode,
      formattedAddress: item.formattedAddress || prev.formattedAddress,
      street: prev.street || item.locality || '',
    }));
    setSearchQuery(item.formattedAddress || `${item.city}, ${item.state}`);
    setSearchResults([]);
    setDropdownOpen(false);
    toast.success(`Selected ${item.city || item.locality || 'location'}`);
  };

  const handleLookupPincode = async () => {
    const pin = String(formData.pincode || '').trim();
    if (!/^\d{6}$/.test(pin)) {
      toast.error('Enter a valid 6-digit PIN code first.');
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`${API}/api/location/search?q=${encodeURIComponent(`${pin}, India`)}`);
      const data = await res.json();
      const first = data?.results?.[0];
      if (data.success && first) {
        setFormData((prev) => ({
          ...prev,
          latitude: Number(first.latitude),
          longitude: Number(first.longitude),
          city: first.city || first.locality || prev.city,
          state: first.state || prev.state,
          locality: first.locality || prev.locality,
          formattedAddress: prev.formattedAddress || first.formattedAddress,
        }));
        toast.success(`PIN ${pin} located: ${first.city || first.locality || first.state}`);
      } else {
        toast.error('Could not auto-locate that PIN code; enter city & address manually or pin on the map.');
      }
    } catch {
      toast.error('Failed to look up PIN code.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapPositionChange = async (lat, lng) => {
    setFormData((prev) => ({ ...prev, latitude: Number(lat), longitude: Number(lng) }));
    setIsReverseGeocoding(true);
    await reverseGeocodeAndFill(lat, lng);
    setIsReverseGeocoding(false);
  };

  const pt = formData.pricingType;

  return (
    <div className="space-y-6">
      {/* 1. Basic Details & Service Kind */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g. AC Master Jet Servicing & Gas Top-Up"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select
            name="category"
            required
            value={formData.category}
            onChange={handleChange}
            className="input-field"
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kind of Service</label>
          <input
            type="text"
            name="serviceKind"
            value={formData.serviceKind}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g. Repair & Troubleshooting, Installation..."
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {SERVICE_KIND_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => updateField('serviceKind', preset)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition font-medium ${
                  formData.serviceKind === preset
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration</label>
          <input
            type="text"
            name="estimatedDuration"
            value={formData.estimatedDuration}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g. 1–2 hours"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => updateField('estimatedDuration', preset)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition font-medium ${
                  formData.estimatedDuration === preset
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Photo (Upload or URL)</label>
          <div className="flex items-center gap-2">
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3.5 py-2.5 text-xs font-semibold text-gray-700 transition">
              {uploadingImage ? <FaSpinner className="animate-spin" /> : <FaUpload />}
              <span>{uploadingImage ? 'Uploading...' : 'Upload'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />
            </label>
            <input
              type="text"
              name="image"
              value={formData.image}
              onChange={handleChange}
              className="input-field flex-1"
              placeholder="Or paste image URL (optional)"
            />
          </div>
          {formData.image && (
            <div className="mt-2 flex items-center gap-2">
              <img
                src={formData.image}
                alt="Service preview"
                className="w-12 h-12 rounded-lg object-cover border border-gray-200"
              />
              <button
                type="button"
                onClick={() => updateField('image', '')}
                className="text-xs text-red-500 hover:underline"
              >
                Remove image
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Pricing Model Selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Pricing Model *</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {pricingModels.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => updateField('pricingType', model.id)}
              className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                pt === model.id
                  ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200'
                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${model.color} flex items-center justify-center text-white text-sm mb-3`}>
                {model.icon}
              </div>
              <h4 className="font-semibold text-gray-900 text-sm">{model.label}</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{model.desc}</p>
              {pt === model.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Price Fields */}
      <motion.div
        key={pt}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50 rounded-xl p-5 border border-gray-100"
      >
        {pt === 'fixed' && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              Fixed Price (₹) *
              <span className="group relative">
                <FaInfoCircle className="text-gray-400 text-xs cursor-help" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-gray-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  The complete price the customer pays for this service. No additional charges.
                </span>
              </span>
            </label>
            <input
              type="number"
              name="fixedPrice"
              required
              min="1"
              value={formData.fixedPrice}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g. 499"
            />
            {Number(formData.fixedPrice) > 0 && (
              <p className="text-xs text-emerald-600 mt-2 font-medium">
                ✓ Customer will see: <strong>₹{formData.fixedPrice} fixed</strong>
              </p>
            )}
          </div>
        )}

        {pt === 'inspection' && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
              Visit / Inspection Fee (₹) *
              <span className="group relative">
                <FaInfoCircle className="text-gray-400 text-xs cursor-help" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-52 bg-gray-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Customer pays this upfront. You'll send a detailed quote after inspecting the issue.
                </span>
              </span>
            </label>
            <input
              type="number"
              name="inspectionFee"
              required
              min="1"
              value={formData.inspectionFee}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g. 99"
            />
            {Number(formData.inspectionFee) > 0 && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                ✓ Customer will see: <strong>Starting from ₹{formData.inspectionFee}</strong> · Final quote after inspection
              </p>
            )}
          </div>
        )}

        {pt === 'hourly' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Visit Fee (₹) *</label>
                <input
                  type="number"
                  name="visitFee"
                  required
                  min="1"
                  value={formData.visitFee}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g. 199"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Hourly Rate (₹/hr) *</label>
                <input
                  type="number"
                  name="hourlyRate"
                  required
                  min="1"
                  value={formData.hourlyRate}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g. 150"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Billing Increment</label>
                <select
                  name="billingIncrement"
                  value={formData.billingIncrement}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="60">1 hour increments</option>
                  <option value="30">30 minute increments</option>
                </select>
              </div>
            </div>
            {Number(formData.visitFee) > 0 && Number(formData.hourlyRate) > 0 && (
              <p className="text-xs text-blue-600 font-medium">
                ✓ Customer will see: <strong>₹{formData.visitFee} visit + ₹{formData.hourlyRate}/hr</strong>
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* 3. Service Address, PIN Code & Map Pin */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FaMapMarkerAlt className="text-primary-600" /> Service Address, PIN & Coverage Area *
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Set where you provide this service so nearby customers can find and book it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {user && (
              <button
                type="button"
                onClick={applySavedProfileLocation}
                className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs font-semibold text-gray-700 transition"
              >
                Use Saved Location
              </button>
            )}
            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={isDetecting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition disabled:opacity-60"
            >
              {isDetecting ? <FaSpinner className="animate-spin" /> : <FaCrosshairs />}
              <span>{isDetecting ? 'Detecting...' : 'Detect GPS'}</span>
            </button>
          </div>
        </div>

        {/* Search Address / PIN Autosuggest */}
        <div className="relative" ref={searchBoxRef}>
          <div className="relative flex items-center">
            <FaSearch className="absolute left-3.5 text-gray-400 text-xs pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInput}
              onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
              placeholder="Search city, locality, street, or PIN code..."
              className="input-field pl-9 pr-9 text-sm bg-white"
            />
            {isSearching && <FaSpinner className="animate-spin absolute right-3.5 text-primary-600 text-xs" />}
            {!isSearching && searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSearchResults([]); setDropdownOpen(false); }}
                className="absolute right-3 text-gray-400 hover:text-gray-600 p-1"
              >
                <FaTimes className="text-xs" />
              </button>
            )}
          </div>
          {dropdownOpen && searchResults.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
              {searchResults.map((item, idx) => (
                <li
                  key={idx}
                  onClick={() => handleSelectSearchItem(item)}
                  className="flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-primary-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-left"
                >
                  <FaMapMarkerAlt className="text-primary-600 text-xs mt-1 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {item.city || item.locality || item.formattedAddress?.split(',')[0]}
                      {item.state ? `, ${item.state}` : ''}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{item.formattedAddress}</p>
                  </div>
                  {item.pincode && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700 shrink-0">
                      {item.pincode}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Address & PIN Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">PIN Code *</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                name="pincode"
                required
                maxLength={6}
                value={formData.pincode}
                onChange={handleChange}
                className="input-field text-sm bg-white"
                placeholder="e.g. 263139"
              />
              <button
                type="button"
                onClick={handleLookupPincode}
                disabled={isSearching}
                className="px-2.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-xs font-semibold text-gray-700 shrink-0"
                title="Locate PIN on map"
              >
                Locate
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">City *</label>
            <input
              type="text"
              name="city"
              required
              value={formData.city}
              onChange={handleChange}
              className="input-field text-sm bg-white"
              placeholder="e.g. Haldwani"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="input-field text-sm bg-white"
              placeholder="e.g. Uttarakhand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Locality / Area</label>
            <input
              type="text"
              name="locality"
              value={formData.locality}
              onChange={handleChange}
              className="input-field text-sm bg-white"
              placeholder="e.g. Kusumkhera / Mall Road"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Address / Landmark *</label>
            <input
              type="text"
              name="formattedAddress"
              required
              value={formData.formattedAddress}
              onChange={handleChange}
              className="input-field text-sm bg-white"
              placeholder="Shop/House No., Street, Landmark..."
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Service Areas Covered</label>
            <input
              type="text"
              name="serviceAreas"
              value={formData.serviceAreas}
              onChange={handleChange}
              className="input-field text-sm bg-white"
              placeholder="Comma-separated areas (e.g. Haldwani, Kathgodam, Lalkuan)"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Coverage Radius (km) *</label>
            <input
              type="number"
              name="serviceRadius"
              min="1"
              max="500"
              required
              value={formData.serviceRadius}
              onChange={handleChange}
              className="input-field text-sm bg-white"
            />
          </div>
        </div>

        {/* Interactive Map Pin */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="font-semibold flex items-center gap-1.5">
              <FaMapMarkedAlt className="text-primary-600" /> Pin Exact Location on Map
            </span>
            <span className="text-[11px] font-mono text-gray-500">
              {isReverseGeocoding
                ? 'Resolving address...'
                : `${Number(formData.latitude).toFixed(4)}, ${Number(formData.longitude).toFixed(4)}`}
            </span>
          </div>
          <LeafletMap
            center={[Number(formData.latitude) || 29.3803, Number(formData.longitude) || 79.5126]}
            markerPosition={[Number(formData.latitude) || 29.3803, Number(formData.longitude) || 79.5126]}
            radius={Number(formData.serviceRadius) || 10}
            useCustomRedIcon={true}
            interactive={true}
            height={compact ? '210px' : '260px'}
            onPositionChange={handleMapPositionChange}
          />
        </div>
      </div>

      {/* 4. Highlights & Description */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">What's Included / Key Highlights</label>
          <input
            type="text"
            name="highlights"
            value={formData.highlights}
            onChange={handleChange}
            className="input-field"
            placeholder="Comma-separated (e.g. 30-day warranty, Safety check, Genuine parts)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Description</label>
          <textarea
            name="description"
            rows={compact ? 3 : 4}
            value={formData.description}
            onChange={handleChange}
            className="input-field resize-none"
            placeholder="Describe what is included in this service, tools used, and any requirements..."
          />
        </div>
      </div>
    </div>
  );
};
