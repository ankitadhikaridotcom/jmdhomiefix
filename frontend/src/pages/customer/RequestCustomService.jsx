import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  Navigation,
  Calendar,
  Clock,
  IndianRupee,
  ImagePlus,
  Sparkles,
  Wand2,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  BellRing,
  Wrench,
  X,
  Loader2,
  Home as HomeIcon,
  ArrowLeft,
  ArrowRight,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import LocationModal from '../../components/common/LocationModal';
import LeafletMap from '../../components/common/LeafletMap';
import { useAuth } from '../../context/AuthContext';
import { detectCurrentLocation, reverseGeocodeCoordinates } from '../../utils/locationDetect';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const QUICK_TEMPLATES = [
  { label: 'Water Tank / Pipeline Fix', category: 'Plumber', title: 'Water Tank & Pipeline Repair' },
  { label: 'Electrical Wiring & MCB', category: 'Electrician', title: 'Electrical Wiring & MCB Setup' },
  { label: 'Custom Carpentry / Shelving', category: 'Carpenter', title: 'Custom Carpentry & Shelving Work' },
  { label: 'AC Service & Gas Refill', category: 'AC Repair', title: 'AC Deep Service & Cooling Fix' },
  { label: 'Deep Post-Renovation Clean', category: 'Home Cleaning', title: 'Deep Post-Renovation Home Cleaning' },
  { label: 'Wall Dampness & Repaint', category: 'Painting', title: 'Damp Proofing & Room Painting' },
  { label: 'Home Shifting / Mini Truck', category: 'Pack & Move', title: 'Pack & Move with Mini Truck & Helpers' },
];

const URGENCY_OPTIONS = [
  { id: 'flexible', label: 'Flexible Schedule', sub: 'Standard response' },
  { id: 'within_24h', label: 'Within 24 Hours', sub: 'Priority matching' },
  { id: 'urgent', label: 'Urgent / Same Day', sub: 'Immediate alert' },
];

const MATERIAL_OPTIONS = [
  { id: 'discuss', label: 'Discuss after inspection' },
  { id: 'provider_brings', label: 'Provider brings materials' },
  { id: 'customer_provides', label: 'I will provide materials' },
];

const TIME_PRESETS = ['09:00', '11:00', '14:00', '17:00'];
const BUDGET_PRESETS = [500, 1000, 2000, 5000];

const getTodayISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toTitleCase = (str) =>
  str
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const formatProfessionalBrief = ({ serviceTitle, category, description, urgency, materialPreference, houseOrFlat, landmark }) => {
  const cleanDesc = (description || '').trim().replace(/\s+/g, ' ');
  const sentences = cleanDesc
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  const formattedScope = sentences
    .map((s) => (/[.!?]$/.test(s) ? s : `${s}.`))
    .join(' ');

  const urgencyLabel = URGENCY_OPTIONS.find((u) => u.id === urgency)?.label || 'Flexible Schedule';
  const materialLabel = MATERIAL_OPTIONS.find((m) => m.id === materialPreference)?.label || 'Discuss after inspection';
  const titleSuggestion = serviceTitle?.trim()
    ? toTitleCase(serviceTitle)
    : `${category && category !== 'Custom' ? category : 'Custom Home'} Service Requirement`;

  const lines = [
    `Scope of Work: ${formattedScope || 'Professional inspection and completion of the requested custom task.'}`,
    `Service Category: ${category || 'Custom'}`,
    `Priority / Timeline: ${urgencyLabel}`,
    `Tools & Materials: ${materialLabel}`,
  ];

  if (houseOrFlat || landmark) {
    lines.push(`Access Details: ${[houseOrFlat, landmark ? `Near ${landmark}` : ''].filter(Boolean).join(', ')}`);
  }
  lines.push('Expectation: Verified professional with standard tools, transparent pricing quote, and clean post-work finish.');

  return {
    title: titleSuggestion,
    description: lines.join('\n'),
  };
};

const RequestCustomService = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const photoInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationOn, setLocationOn] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [nearbyCount, setNearbyCount] = useState(null);

  const [categories, setCategories] = useState([
    'Electrician',
    'Plumber',
    'Carpenter',
    'AC Repair',
    'Home Cleaning',
    'Appliance Repair',
    'Painting',
    'Pest Control',
    'Pack & Move',
    'Custom',
  ]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [originalDraft, setOriginalDraft] = useState(null);
  const [isProfessionalMode, setIsProfessionalMode] = useState(false);

  const [formData, setFormData] = useState({
    category: 'Custom',
    serviceTitle: '',
    description: '',
    urgency: 'flexible',
    materialPreference: 'discuss',
    date: getTodayISO(),
    time: '10:00',
    budget: '',
    address: '',
    houseOrFlat: '',
    landmark: '',
    locality: '',
    city: '',
    state: '',
    pincode: '',
    latitude: null,
    longitude: null,
  });

  // Load service categories and saved addresses
  useEffect(() => {
    fetch(`${API}/api/service-categories`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
          const names = data.categories.map((c) => c.name);
          if (!names.includes('Custom')) names.push('Custom');
          setCategories(names);
        }
      })
      .catch(() => {});

    fetch(`${API}/api/addresses`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.addresses)) {
          setSavedAddresses(data.addresses);
        }
      })
      .catch(() => {});
  }, []);

  // Hydrate initial location from user profile or localStorage
  useEffect(() => {
    if (formData.latitude && formData.longitude) return;

    if (user?.address?.latitude && user?.address?.longitude) {
      setFormData((prev) => ({
        ...prev,
        address: user.address.formattedAddress || `${user.address.city || ''}, ${user.address.state || ''}`.replace(/^,\s*|,\s*$/g, ''),
        locality: user.address.locality || '',
        city: user.address.city || '',
        state: user.address.state || '',
        pincode: user.address.pincode || '',
        latitude: Number(user.address.latitude),
        longitude: Number(user.address.longitude),
      }));
      setLocationOn(true);
      return;
    }

    try {
      const savedLoc = localStorage.getItem('nivestry_user_location') || localStorage.getItem('homiefix_user_location');
      if (savedLoc) {
        const parsed = JSON.parse(savedLoc);
        if (parsed?.latitude && parsed?.longitude) {
          setFormData((prev) => ({
            ...prev,
            address: parsed.address || parsed.formattedAddress || '',
            locality: parsed.locality || '',
            city: parsed.city || '',
            state: parsed.state || '',
            pincode: parsed.pincode || '',
            latitude: Number(parsed.latitude),
            longitude: Number(parsed.longitude),
          }));
          setLocationOn(true);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [user]);

  // Check nearby online providers whenever location coordinates or PIN code update
  useEffect(() => {
    if (!locationOn || !formData.latitude || !formData.longitude) {
      setNearbyCount(null);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({
      lat: String(formData.latitude),
      lng: String(formData.longitude),
    });
    if (formData.pincode) params.set('pincode', formData.pincode);
    if (formData.city) params.set('city', formData.city);
    if (formData.locality) params.set('locality', formData.locality);

    fetch(`${API}/api/custom-requests/nearby-providers-count?${params.toString()}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success) {
          setNearbyCount(data.nearbyCount);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locationOn, formData.latitude, formData.longitude, formData.pincode, formData.city, formData.locality]);

  const applyLocationObject = (loc) => {
    const resolvedAddress = loc.address || loc.formattedAddress || '';
    setFormData((prev) => ({
      ...prev,
      address: resolvedAddress || prev.address,
      locality: loc.locality || '',
      city: loc.city || '',
      state: loc.state || '',
      pincode: loc.pincode || '',
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
    }));
    setLocationOn(true);
    try {
      localStorage.setItem('nivestry_user_location', JSON.stringify({
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        address: resolvedAddress,
        locality: loc.locality || '',
        city: loc.city || '',
        state: loc.state || '',
        pincode: loc.pincode || '',
      }));
    } catch {
      // ignore
    }
  };

  const handleToggleLocationOn = async () => {
    if (locationOn) {
      setLocationOn(false);
      toast('Live location turned off. You can turn it back on or pick a saved address.');
      return;
    }

    setDetectingLocation(true);
    try {
      const detected = await detectCurrentLocation(API);
      applyLocationObject(detected);
      toast.success(`Location On: ${detected.city || detected.locality || 'GPS coordinates captured'}`);
    } catch (err) {
      toast.error(err.message || 'Could not detect GPS. You can search or pin on the map.');
      setIsLocationModalOpen(true);
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleMapPinDrag = async (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
    setLocationOn(true);
    try {
      const geo = await reverseGeocodeCoordinates(API, lat, lng);
      applyLocationObject(geo);
    } catch {
      // keep coordinates even if reverse geocode fails
    }
  };

  const handleMakeProfessional = () => {
    if (!formData.description.trim() && !formData.serviceTitle.trim()) {
      toast.error('Write a short description or title first so we can format it professionally.');
      return;
    }

    if (!isProfessionalMode) {
      setOriginalDraft({
        serviceTitle: formData.serviceTitle,
        description: formData.description,
      });
      const polished = formatProfessionalBrief(formData);
      setFormData((prev) => ({
        ...prev,
        serviceTitle: polished.title,
        description: polished.description,
      }));
      setIsProfessionalMode(true);
      toast.success('Formatted into a professional service brief!');
    } else if (originalDraft) {
      setFormData((prev) => ({
        ...prev,
        serviceTitle: originalDraft.serviceTitle,
        description: originalDraft.description,
      }));
      setIsProfessionalMode(false);
      toast('Restored your original text');
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (photos.length + files.length > 5) {
      toast.error('You can upload up to 5 photos.');
      e.target.value = '';
      return;
    }

    setUploadingPhotos(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 5MB limit.`);
          continue;
        }
        const body = new FormData();
        body.append('image', file);
        const res = await fetch(`${API}/api/upload`, {
          method: 'POST',
          credentials: 'include',
          body,
        });
        const data = await res.json();
        if (data.success && data.photoUrl) {
          uploadedUrls.push(data.photoUrl);
        } else {
          toast.error(data.message || `Failed to upload ${file.name}`);
        }
      }
      if (uploadedUrls.length > 0) {
        setPhotos((prev) => [...prev, ...uploadedUrls].slice(0, 5));
        toast.success(`${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} uploaded`);
      }
    } catch {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      return toast.error('Please describe the service you need.');
    }
    if (!locationOn || !formData.latitude || !formData.longitude) {
      return toast.error('Please turn on Location or select a service location on the map.');
    }
    if (!formData.address.trim()) {
      return toast.error('Please confirm your service address.');
    }
    if (!formData.date || !formData.time) {
      return toast.error('Please choose a preferred date and time.');
    }

    const locationObj = {
      address: formData.address.trim(),
      houseOrFlat: formData.houseOrFlat.trim(),
      landmark: formData.landmark.trim(),
      locality: formData.locality,
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      latitude: Number(formData.latitude),
      longitude: Number(formData.longitude),
      coordinates: [Number(formData.longitude), Number(formData.latitude)],
    };

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/custom-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category: formData.category,
          serviceTitle: formData.serviceTitle.trim() || `${formData.category} Request`,
          description: formData.description.trim(),
          urgency: formData.urgency,
          materialPreference: formData.materialPreference,
          isProfessionalBrief: isProfessionalMode,
          photos,
          location: locationObj,
          date: formData.date,
          time: formData.time,
          budget: formData.budget ? Number(formData.budget) : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const count = data.notifiedCount;
        toast.success(
          count > 0
            ? `Request sent! ${count} nearby provider${count > 1 ? 's' : ''} notified.`
            : 'Custom request posted! Nearby providers will be notified.'
        );
        if (data.request?._id) {
          navigate(`/custom-requests/${data.request._id}`);
        } else {
          navigate('/my-custom-requests');
        }
      } else {
        toast.error(data.message || 'Failed to submit request');
      }
    } catch {
      toast.error('Network error while submitting request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#1a1a18] py-8 sm:py-10 pb-24">
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={applyLocationObject}
        initialLocation={
          formData.latitude && formData.longitude
            ? {
                latitude: formData.latitude,
                longitude: formData.longitude,
                address: formData.address,
                formattedAddress: formData.address,
                locality: formData.locality,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode,
              }
            : null
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Breadcrumb & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#6a675f] hover:text-[#1a1a18] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <Link
            to="/my-custom-requests"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b3261e] hover:underline"
          >
            <span>View My Custom Requests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a1a18] text-[#f7f5f0] rounded-3xl p-6 sm:p-8 border border-[#2b2b28] shadow-sm mb-8"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#b3261e]/25 border border-[#b3261e]/40 text-[11px] font-bold uppercase tracking-wider text-[#f7f5f0] mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#b3261e]" />
            <span>Custom Service Concierge</span>
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            Create a Custom Service Request
          </h1>
          <p className="text-sm sm:text-base text-[#ebe8df]/80 mt-2 max-w-2xl">
            Describe what you need, format your request professionally, turn on your location, and nearby verified providers will receive an instant notification to accept or decline.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT MAIN COLUMN */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Category & Quick Templates */}
            <section className="bg-white rounded-3xl p-6 border border-[#dedad0] shadow-xs space-y-5">
              <div className="flex items-center justify-between gap-2 border-b border-[#ebe8df] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-[#b3261e]/10 text-[#b3261e] flex items-center justify-center">
                    <Wrench className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#1a1a18]">1. Service Category &amp; Scope</h2>
                    <p className="text-xs text-[#6a675f]">Choose a category or start from a common template</p>
                  </div>
                </div>
              </div>

              {/* Category Chips */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6a675f] mb-2.5">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const active = formData.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, category: cat }))}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                          active
                            ? 'bg-[#1a1a18] text-[#f7f5f0] border-[#1a1a18] shadow-xs'
                            : 'bg-[#f7f5f0] text-[#1a1a18] border-[#dedad0] hover:border-[#b3261e]/40'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Templates */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6a675f] mb-2">
                  Quick Templates (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          category: tpl.category,
                          serviceTitle: tpl.title,
                        }));
                        toast.success(`Selected "${tpl.title}"`);
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#ebe8df]/70 hover:bg-[#ebe8df] text-[#1a1a18] border border-[#dedad0] transition"
                    >
                      + {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-[#1a1a18] mb-1.5">
                  Request Title
                </label>
                <input
                  type="text"
                  value={formData.serviceTitle}
                  onChange={(e) => setFormData((prev) => ({ ...prev, serviceTitle: e.target.value }))}
                  placeholder="e.g., 500L Terrace Water Tank Installation"
                  className="w-full px-4 py-3 rounded-xl border border-[#dedad0] bg-[#f7f5f0]/40 text-sm text-[#1a1a18] outline-none focus:bg-white focus:border-[#b3261e] focus:ring-2 focus:ring-[#b3261e]/15 transition"
                />
              </div>

              {/* Description + Make It Professional */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label className="text-xs font-bold text-[#1a1a18]">
                    Detailed Description *
                  </label>
                  <button
                    type="button"
                    onClick={handleMakeProfessional}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                      isProfessionalMode
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-[#b3261e]/10 text-[#b3261e] border-[#b3261e]/25 hover:bg-[#b3261e] hover:text-white'
                    }`}
                  >
                    {isProfessionalMode ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revert to Original</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>Make It Professional</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, description: e.target.value }));
                  }}
                  required
                  rows={5}
                  placeholder="Describe the issue, dimensions, quantity, or exact work needed. Tip: Write a quick note and click 'Make It Professional' to structure it automatically!"
                  className="w-full px-4 py-3 rounded-xl border border-[#dedad0] bg-[#f7f5f0]/40 text-sm text-[#1a1a18] outline-none focus:bg-white focus:border-[#b3261e] focus:ring-2 focus:ring-[#b3261e]/15 transition resize-y"
                />
                {isProfessionalMode && (
                  <p className="mt-1.5 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Formatted as a professional job brief for faster, clearer provider quotes.</span>
                  </p>
                )}
              </div>

              {/* Urgency & Materials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-[#1a1a18] mb-2">Urgency</label>
                  <div className="space-y-2">
                    {URGENCY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, urgency: opt.id }))}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition ${
                          formData.urgency === opt.id
                            ? 'bg-[#1a1a18] text-white border-[#1a1a18]'
                            : 'bg-[#f7f5f0]/60 text-[#1a1a18] border-[#dedad0] hover:border-[#b3261e]/40'
                        }`}
                      >
                        <span className="text-xs font-bold">{opt.label}</span>
                        <span className={`text-[11px] ${formData.urgency === opt.id ? 'text-[#ebe8df]/80' : 'text-[#6a675f]'}`}>
                          {opt.sub}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1a1a18] mb-2">Materials &amp; Parts</label>
                  <div className="space-y-2">
                    {MATERIAL_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, materialPreference: opt.id }))}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-left text-xs font-bold transition ${
                          formData.materialPreference === opt.id
                            ? 'bg-[#b3261e] text-white border-[#b3261e]'
                            : 'bg-[#f7f5f0]/60 text-[#1a1a18] border-[#dedad0] hover:border-[#b3261e]/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#1a1a18]">
                    Work Area Photos (Optional, up to 5)
                  </label>
                  <span className="text-[11px] text-[#6a675f] font-mono">{photos.length}/5 uploaded</span>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div
                  onClick={() => !uploadingPhotos && photos.length < 5 && photoInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition ${
                    photos.length >= 5
                      ? 'border-[#dedad0] bg-[#f7f5f0]/50 opacity-60 cursor-not-allowed'
                      : 'border-[#dedad0] hover:border-[#b3261e] hover:bg-[#f7f5f0] cursor-pointer'
                  }`}
                >
                  {uploadingPhotos ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#b3261e]">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading photos...</span>
                    </div>
                  ) : (
                    <>
                      <ImagePlus className="w-7 h-7 text-[#b3261e] mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-[#1a1a18]">Click to upload photos of the issue or site</p>
                      <p className="text-[11px] text-[#6a675f] mt-0.5">JPEG, PNG, or WebP up to 5MB each</p>
                    </>
                  )}
                </div>

                {photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                    {photos.map((url, idx) => (
                      <div key={url + idx} className="relative group rounded-xl overflow-hidden border border-[#dedad0] aspect-square bg-[#ebe8df]">
                        <img src={url} alt={`Request photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#1a1a18]/80 text-white flex items-center justify-center hover:bg-[#b3261e] transition"
                          aria-label="Remove photo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* 2. Location On & Service Address */}
            <section className="bg-white rounded-3xl p-6 border border-[#dedad0] shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebe8df] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-[#b3261e]/10 text-[#b3261e] flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#1a1a18]">2. Service Location</h2>
                    <p className="text-xs text-[#6a675f]">Turn on location so nearby service providers are notified</p>
                  </div>
                </div>

                {/* Location On Toggle Control */}
                <button
                  type="button"
                  onClick={handleToggleLocationOn}
                  disabled={detectingLocation}
                  className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-bold border transition shadow-xs ${
                    locationOn
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-[#1a1a18] text-white border-[#1a1a18] hover:bg-[#2b2b28]'
                  }`}
                >
                  {detectingLocation ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {detectingLocation
                      ? 'Detecting GPS...'
                      : locationOn
                      ? 'Location On ✓'
                      : 'Turn On Location'}
                  </span>
                </button>
              </div>

              {/* Location Status Banner */}
              <div className={`rounded-2xl p-4 border flex flex-wrap items-center justify-between gap-3 ${
                locationOn && formData.latitude
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-amber-50/70 border-amber-200'
              }`}>
                <div className="flex items-start gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    locationOn && formData.latitude ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`} />
                  <div>
                    <p className="text-xs font-bold text-[#1a1a18]">
                      {locationOn && formData.latitude
                        ? `Live Location Active${formData.city || formData.locality ? ` · ${formData.locality || formData.city}` : ''}`
                        : 'Location is currently off'}
                    </p>
                    <p className="text-[11px] text-[#6a675f] mt-0.5">
                      {locationOn && formData.latitude
                        ? nearbyCount !== null
                          ? `${nearbyCount} verified provider${nearbyCount === 1 ? '' : 's'} currently online within range of this pin.`
                          : 'Nearby verified providers in your area will receive an instant notification.'
                        : 'Click "Turn On Location" to use GPS or choose an address / map pin below.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#dedad0] text-xs font-bold text-[#1a1a18] hover:border-[#b3261e] transition shrink-0"
                >
                  <Search className="w-3.5 h-3.5 text-[#b3261e]" />
                  <span>Search / Map Picker</span>
                </button>
              </div>

              {/* Saved Address Quick Picks */}
              {savedAddresses.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6a675f] mb-2">
                    Or Use Saved Address
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr._id}
                        type="button"
                        onClick={() => {
                          applyLocationObject(addr);
                          toast.success(`Selected ${addr.customLabel || addr.label} address`);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#f7f5f0] hover:bg-[#ebe8df] border border-[#dedad0] text-xs font-semibold text-[#1a1a18] transition"
                      >
                        <HomeIcon className="w-3.5 h-3.5 text-[#b3261e]" />
                        <span>{addr.customLabel || addr.label}:</span>
                        <span className="text-[#6a675f] max-w-[180px] truncate">{addr.address}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Embedded Interactive Map when coordinates exist */}
              {locationOn && formData.latitude && formData.longitude && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#6a675f]">
                    <span>Drag the pin or click anywhere on the map to adjust exact doorstep location</span>
                    <span className="font-mono text-[#1a1a18]">
                      {Number(formData.latitude).toFixed(4)}, {Number(formData.longitude).toFixed(4)}
                    </span>
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-[#dedad0]">
                    <LeafletMap
                      center={[formData.latitude, formData.longitude]}
                      markerPosition={[formData.latitude, formData.longitude]}
                      interactive={true}
                      useCustomRedIcon={true}
                      height="220px"
                      onPositionChange={handleMapPinDrag}
                    />
                  </div>
                </div>
              )}

              {/* Address Inputs */}
              <div>
                <label className="block text-xs font-bold text-[#1a1a18] mb-1.5">Complete Street Address *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  required
                  placeholder="e.g., 42 Mallital Road, Nainital"
                  className="w-full px-4 py-3 rounded-xl border border-[#dedad0] bg-[#f7f5f0]/40 text-sm text-[#1a1a18] outline-none focus:bg-white focus:border-[#b3261e] focus:ring-2 focus:ring-[#b3261e]/15 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1a1a18] mb-1.5">House / Flat / Floor No.</label>
                  <input
                    type="text"
                    value={formData.houseOrFlat}
                    onChange={(e) => setFormData((prev) => ({ ...prev, houseOrFlat: e.target.value }))}
                    placeholder="e.g., Flat 3B, 2nd Floor"
                    className="w-full px-4 py-3 rounded-xl border border-[#dedad0] bg-[#f7f5f0]/40 text-sm text-[#1a1a18] outline-none focus:bg-white focus:border-[#b3261e] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1a1a18] mb-1.5">Nearby Landmark</label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => setFormData((prev) => ({ ...prev, landmark: e.target.value }))}
                    placeholder="e.g., Near Central Bank"
                    className="w-full px-4 py-3 rounded-xl border border-[#dedad0] bg-[#f7f5f0]/40 text-sm text-[#1a1a18] outline-none focus:bg-white focus:border-[#b3261e] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1a1a18] mb-1.5">PIN Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                    placeholder="e.g., 263136"
                    className="w-full px-4 py-3 rounded-xl border border-[#dedad0] bg-[#f7f5f0]/40 text-sm font-mono text-[#1a1a18] outline-none focus:bg-white focus:border-[#b3261e] transition"
                  />
                </div>
              </div>
            </section>

            {/* 3. Schedule & Budget */}
            <section className="bg-white rounded-3xl p-6 border border-[#dedad0] shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 border-b border-[#ebe8df] pb-3">
                <span className="w-8 h-8 rounded-xl bg-[#b3261e]/10 text-[#b3261e] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#1a1a18]">3. Preferred Schedule &amp; Budget</h2>
                  <p className="text-xs text-[#6a675f]">Let providers know when you need them and your estimated budget</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1a1a18] mb-1.5">Preferred Date *</label>
                  <input
                    type="date"
                    min={getTodayISO()}
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[#dedad0] bg-[#f7f5f0]/40 text-sm text-[#1a1a18] outline-none focus:bg-white focus:border-[#b3261e] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1a1a18] mb-1.5">Preferred Time *</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[#dedad0] bg-[#f7f5f0]/40 text-sm text-[#1a1a18] outline-none focus:bg-white focus:border-[#b3261e] transition"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TIME_PRESETS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, time: slot }))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          formData.time === slot
                            ? 'bg-[#1a1a18] text-white border-[#1a1a18]'
                            : 'bg-[#f7f5f0] text-[#6a675f] border-[#dedad0] hover:text-[#1a1a18]'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1a1a18] mb-1">
                  Estimated Budget (Optional)
                </label>
                <p className="text-[11px] text-[#6a675f] mb-2">
                  Providers will see your estimate and send an itemized quote after accepting.
                </p>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 text-[#6a675f] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    value={formData.budget}
                    onChange={(e) => setFormData((prev) => ({ ...prev, budget: e.target.value }))}
                    placeholder="Enter amount in ₹"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#dedad0] bg-[#f7f5f0]/40 text-sm text-[#1a1a18] outline-none focus:bg-white focus:border-[#b3261e] transition font-mono"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {BUDGET_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, budget: String(amt) }))}
                      className={`px-3 py-1 rounded-full text-xs font-bold font-mono border transition ${
                        Number(formData.budget) === amt
                          ? 'bg-[#b3261e] text-white border-[#b3261e]'
                          : 'bg-[#f7f5f0] text-[#1a1a18] border-[#dedad0] hover:border-[#b3261e]/50'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT STICKY SUMMARY COLUMN */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-[#dedad0] shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-[#ebe8df] pb-3">
                <h3 className="text-base font-extrabold text-[#1a1a18]">Request Summary</h3>
                {isProfessionalMode && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                    Pro Brief
                  </span>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-[#6a675f]">Category</span>
                  <span className="font-bold text-[#1a1a18] text-right">{formData.category}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#6a675f]">Title</span>
                  <span className="font-bold text-[#1a1a18] text-right truncate max-w-[180px]">
                    {formData.serviceTitle || 'Custom Service'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#6a675f]">Urgency</span>
                  <span className="font-bold text-[#1a1a18] text-right">
                    {URGENCY_OPTIONS.find((u) => u.id === formData.urgency)?.label}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#6a675f]">Location</span>
                  <span className={`font-bold text-right ${locationOn ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {locationOn
                      ? (formData.locality || formData.city || 'Location On ✓')
                      : 'Location Off'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#6a675f]">Schedule</span>
                  <span className="font-bold text-[#1a1a18] font-mono">
                    {formData.date} · {formData.time}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#6a675f]">Budget</span>
                  <span className="font-bold text-[#1a1a18] font-mono">
                    {formData.budget ? `₹${Number(formData.budget).toLocaleString()}` : 'Open for quotes'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#6a675f]">Photos</span>
                  <span className="font-bold text-[#1a1a18] font-mono">{photos.length} attached</span>
                </div>
              </div>

              <div className="rounded-2xl bg-[#f7f5f0] border border-[#e5e2db] p-3.5 space-y-2 text-[11px] text-[#6a675f]">
                <p className="font-bold text-[#1a1a18] flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 text-[#b3261e]" />
                  <span>What happens next?</span>
                </p>
                <p>1. Nearby verified providers get an instant notification with your location and brief.</p>
                <p>2. Providers can <strong>Accept</strong> or <strong>Decline</strong> your request.</p>
                <p>3. You choose your preferred provider and review their itemized quote before paying.</p>
              </div>

              <button
                type="submit"
                disabled={loading || uploadingPhotos}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#b3261e] hover:bg-[#9c2019] disabled:opacity-60 px-5 py-4 text-sm font-bold text-white shadow-md transition active:scale-98"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Notifying Nearby Providers...</span>
                  </>
                ) : (
                  <>
                    <BellRing className="w-4 h-4" />
                    <span>Notify Nearby Providers</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-[#6a675f] flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Only verified providers within your area are alerted</span>
              </p>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
};

export default RequestCustomService;
