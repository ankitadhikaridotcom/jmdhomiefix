import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheck,
  FaClock,
  FaUpload,
  FaMapMarkerAlt,
  FaCrosshairs,
  FaSearch,
  FaTimes,
  FaSpinner,
  FaMapMarkedAlt,
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LeafletMap from '../../components/common/LeafletMap';
import { detectCurrentLocation } from '../../utils/locationDetect';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const steps = ['Personal', 'Professional', 'Location', 'Verification', 'Review'];
const emptyData = (user) => ({
  fullName: user?.name || '',
  phone: user?.phone || '',
  email: user?.email || '',
  profilePhoto: user?.profileImage || '',
  dateOfBirth: '',
  categories: [],
  skills: '',
  experience: '',
  previousWork: '',
  certifications: '',
  city: user?.address?.city || user?.city || '',
  state: user?.address?.state || '',
  pincode: user?.address?.pincode || '',
  areas: (user?.serviceAreas && user.serviceAreas.join(', ')) || '',
  radius: user?.serviceRadius ? String(user.serviceRadius) : '10',
  latitude: user?.address?.latitude || user?.location?.coordinates?.[1] || 29.3803,
  longitude: user?.address?.longitude || user?.location?.coordinates?.[0] || 79.5126,
  formattedAddress: user?.address?.formattedAddress || '',
  govtIdType: '',
  govtIdNumber: '',
  govtIdDocument: '',
  workProof: '',
});

const ProviderOnboarding = () => {
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState(() => emptyData(user));
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState(null);
  const [categories, setCategories] = useState([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [errors, setErrors] = useState({});

  // Location detection & autosuggest states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;
    axios.get(`${API}/api/service-categories`)
      .then(({ data: result }) => active && setCategories((result.categories || []).map((category) => category.name)))
      .catch((error) => toast.error(error.response?.data?.message || 'Could not load service categories.'));
    axios.get(`${API}/api/provider-applications/me`, { withCredentials: true })
      .then(({ data: result }) => {
        if (!active) return;
        if (result.application?.data) {
          setData((current) => ({
            ...current,
            ...result.application.data,
            latitude: result.application.data.latitude !== undefined ? Number(result.application.data.latitude) : current.latitude,
            longitude: result.application.data.longitude !== undefined ? Number(result.application.data.longitude) : current.longitude,
          }));
          if (result.application.data.formattedAddress) {
            setSearchQuery(result.application.data.formattedAddress);
          } else if (result.application.data.city) {
            setSearchQuery(`${result.application.data.city}${result.application.data.state ? `, ${result.application.data.state}` : ''}`);
          }
        }
        setStatus(result.status);
        setRejectionReason(result.rejectionReason || '');
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Could not load your application.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const update = (field, value) => {
    setData((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleArrayValue = (field, value) => {
    setData((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Browser Geolocation handler (Auto-detect with IP fallback)
  const handleDetectGPS = async () => {
    setIsDetecting(true);
    const toastId = toast.loading('Detecting your location...');
    try {
      const loc = await detectCurrentLocation(API);
      setData((prev) => ({
        ...prev,
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        city: loc.city || loc.locality || prev.city,
        state: loc.state || prev.state,
        pincode: loc.pincode || prev.pincode,
        formattedAddress: loc.formattedAddress || prev.formattedAddress,
        areas: prev.areas ? prev.areas : (loc.locality || loc.city || ''),
      }));
      setSearchQuery(loc.formattedAddress || `${loc.city}, ${loc.state}`);
      toast.success(
        loc.approximate
          ? `Approximate location set (${loc.city || 'network'}). Drag the map pin to adjust.`
          : `Location detected: ${loc.city || loc.locality || 'Coordinates updated'}`,
        { id: toastId }
      );
    } catch (error) {
      toast.error(error.message || 'Could not detect device location. Please search manually.', { id: toastId });
    } finally {
      setIsDetecting(false);
    }
  };

  // Autosuggest Search input handler
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearchDropdownOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/api/location/search`, {
          params: { q: query.trim() },
        });
        if (res.data?.success) {
          const list = res.data.results || [];
          setSearchResults(list);
          setSearchDropdownOpen(list.length > 0);
        }
      } catch (err) {
        console.error('[Location Search Error]', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // Select location from autosuggest list
  const handleSelectLocation = (item) => {
    setData((prev) => ({
      ...prev,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      city: item.city || item.locality || prev.city,
      state: item.state || prev.state,
      pincode: item.pincode || prev.pincode,
      formattedAddress: item.formattedAddress || prev.formattedAddress,
      areas: prev.areas ? prev.areas : (item.locality || item.city || ''),
    }));
    setSearchQuery(item.formattedAddress || `${item.city}, ${item.state}`);
    setSearchResults([]);
    setSearchDropdownOpen(false);
    toast.success(`Selected: ${item.city || item.locality || 'Location'}`);
  };

  // Map click or pin drag handler
  const handleMapPositionChange = async (lat, lng) => {
    setData((prev) => ({
      ...prev,
      latitude: Number(lat),
      longitude: Number(lng),
    }));

    setIsReverseGeocoding(true);
    try {
      const res = await axios.post(`${API}/api/location/reverse-geocode`, {
        latitude: lat,
        longitude: lng,
      });
      if (res.data?.success) {
        const loc = res.data;
        setData((prev) => ({
          ...prev,
          city: loc.city || loc.locality || prev.city,
          state: loc.state || prev.state,
          pincode: loc.pincode || prev.pincode,
          formattedAddress: loc.formattedAddress || prev.formattedAddress,
        }));
        setSearchQuery(loc.formattedAddress || `${loc.city}, ${loc.state}`);
        toast.success(`Location updated: ${loc.city || loc.locality || 'Pin placed'}`);
      }
    } catch (err) {
      console.error('[Map Reverse Geocode Error]', err);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const uploadFile = async (event, field, kind) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const maxSize = kind === 'image' ? 5 : 10;
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File must be smaller than ${maxSize}MB.`);
      return;
    }
    setUploading(field);
    const formData = new FormData();
    formData.append(kind === 'image' ? 'image' : 'document', file);
    try {
      const path = kind === 'image' ? '/api/upload' : '/api/provider-applications/documents';
      const { data: result } = await axios.post(`${API}${path}`, formData, { withCredentials: true });
      update(field, result.photoUrl || result.documentUrl);
      toast.success('File uploaded.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'File upload failed.');
    } finally {
      setUploading('');
    }
  };

  const validateCurrentStep = (stepIdx = step) => {
    const newErrors = {};

    if (stepIdx === 0) {
      // Step 0: Personal
      if (!String(data.fullName || '').trim()) {
        newErrors.fullName = 'Full name is required.';
      } else if (data.fullName.trim().length < 2) {
        newErrors.fullName = 'Full name must be at least 2 characters.';
      } else if (data.fullName.trim().length > 120) {
        newErrors.fullName = 'Full name cannot exceed 120 characters.';
      }

      if (!String(data.phone || '').trim()) {
        newErrors.phone = 'Phone number is required.';
      } else if (!/^\+?[0-9\s\-()]{10,20}$/.test(data.phone.trim())) {
        newErrors.phone = 'Please enter a valid phone number (at least 10 digits).';
      }

      if (!String(data.email || '').trim()) {
        newErrors.email = 'Email address is required.';
      } else if (user?.email && data.email.trim().toLowerCase() !== user.email.toLowerCase()) {
        newErrors.email = `Must use your account email (${user.email}).`;
      }

      if (!data.profilePhoto) {
        newErrors.profilePhoto = 'Please upload a profile photo.';
      }

      if (!data.dateOfBirth) {
        newErrors.dateOfBirth = 'Date of birth is required.';
      } else {
        const dob = new Date(data.dateOfBirth);
        const today = new Date();
        if (isNaN(dob.getTime()) || dob >= today) {
          newErrors.dateOfBirth = 'Enter a valid date of birth in the past.';
        } else {
          const ageYears = (today - dob) / (365.25 * 24 * 60 * 60 * 1000);
          if (ageYears < 18) {
            newErrors.dateOfBirth = 'You must be at least 18 years old.';
          }
        }
      }
    }

    if (stepIdx === 1) {
      // Step 1: Professional
      if (!Array.isArray(data.categories) || data.categories.length === 0) {
        newErrors.categories = 'Please select at least one service category.';
      }

      if (!String(data.skills || '').trim()) {
        newErrors.skills = 'Skills and specialization are required.';
      }

      const exp = Number(data.experience);
      if (data.experience === '' || !Number.isFinite(exp) || exp < 0) {
        newErrors.experience = 'Enter valid years of experience (0 or more).';
      } else if (exp > 60) {
        newErrors.experience = 'Experience cannot exceed 60 years.';
      }

      if (!String(data.previousWork || '').trim()) {
        newErrors.previousWork = 'Previous work description is required.';
      }
    }

    if (stepIdx === 2) {
      // Step 2: Location
      if (!String(data.city || '').trim()) {
        newErrors.city = 'City is required.';
      }

      if (!String(data.state || '').trim()) {
        newErrors.state = 'State is required.';
      }

      const pin = String(data.pincode || '').trim();
      if (!pin) {
        newErrors.pincode = 'PIN code is required.';
      } else if (!/^\d{6}$/.test(pin)) {
        newErrors.pincode = 'PIN code must be exactly 6 digits.';
      }

      if (!String(data.areas || '').trim()) {
        newErrors.areas = 'Please specify areas where you offer services.';
      }

      const rad = Number(data.radius);
      if (data.radius === '' || !Number.isFinite(rad) || rad < 1 || rad > 500) {
        newErrors.radius = 'Service radius must be between 1 and 500 km.';
      }
    }

    if (stepIdx === 3) {
      // Step 3: Verification
      if (!String(data.govtIdType || '').trim()) {
        newErrors.govtIdType = 'Government ID type is required.';
      }

      if (!String(data.govtIdNumber || '').trim()) {
        newErrors.govtIdNumber = 'Government ID number is required.';
      } else if (data.govtIdNumber.trim().length > 100) {
        newErrors.govtIdNumber = 'Government ID number cannot exceed 100 characters.';
      }

      if (!data.govtIdDocument) {
        newErrors.govtIdDocument = 'Government ID document upload is required.';
      }
    }

    setErrors(newErrors);

    const firstError = Object.values(newErrors)[0];
    if (firstError) {
      toast.error(firstError);
      return false;
    }

    return true;
  };

  const cleanPayload = (currentData) => {
    const payload = { ...currentData };
    delete payload.price;
    delete payload.pricingModel;
    delete payload.workingDays;
    delete payload.timeSlots;
    return payload;
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const { data: result } = await axios.put(
        `${API}/api/provider-applications/me`,
        { data: cleanPayload(data) },
        { withCredentials: true },
      );
      setStatus(result.status);
      await refreshUser();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save your application.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const nextStep = async () => {
    if (!validateCurrentStep(step)) return;
    if (await saveDraft()) setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const submitApplication = async () => {
    // Validate all preceding steps before final submit
    for (let i = 0; i < steps.length - 1; i++) {
      if (!validateCurrentStep(i)) {
        setStep(i);
        return;
      }
    }
    setSaving(true);
    try {
      await axios.put(`${API}/api/provider-applications/me`, { data: cleanPayload(data) }, { withCredentials: true });
      await axios.post(`${API}/api/provider-applications/me/submit`, {}, { withCredentials: true });
      setStatus('pending');
      setRejectionReason('');
      await refreshUser();
      toast.success('Your application is submitted for review.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not submit your application.');
    } finally {
      setSaving(false);
    }
  };

  const field = (label, name, options = {}) => (
    <div key={name}>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {options.required !== false && <span className="text-red-500 ml-1">*</span>}
      </label>
      {options.multiline ? (
        <textarea
          value={data[name] || ''}
          onChange={(event) => update(name, event.target.value)}
          rows={3}
          disabled={options.disabled}
          className={`input-field mt-1.5 resize-y ${errors[name] ? '!border-red-500 !ring-red-500 ring-1' : ''}`}
          placeholder={options.placeholder || label}
        />
      ) : (
        <input
          value={data[name] || ''}
          onChange={(event) => update(name, event.target.value)}
          type={options.type || 'text'}
          min={options.min}
          max={options.max}
          disabled={options.disabled}
          className={`input-field mt-1.5 ${options.disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''} ${errors[name] ? '!border-red-500 !ring-red-500 ring-1' : ''}`}
          placeholder={options.placeholder || label}
        />
      )}
      {errors[name] && (
        <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
          <span>⚠️</span> {errors[name]}
        </p>
      )}
      {options.hint && !errors[name] && (
        <p className="mt-1 text-xs text-slate-400">{options.hint}</p>
      )}
    </div>
  );

  const uploadControl = (label, name, kind) => (
    <div key={name}>
      <label className="block text-sm font-medium text-slate-700">
        {label} {name !== 'workProof' && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${errors[name] ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
          {uploading === name ? <LoadingSpinner size="sm" /> : <FaUpload />}
          {data[name] ? 'Replace file' : 'Upload file'}
          <input type="file" className="sr-only" accept={kind === 'image' ? 'image/jpeg,image/png,image/webp' : 'application/pdf,image/jpeg,image/png'}
            onChange={(event) => uploadFile(event, name, kind)} disabled={Boolean(uploading)} />
        </label>
        {data[name] && (kind === 'image'
          ? <img src={data[name]} alt="Uploaded profile" className="h-12 w-12 rounded-lg object-cover border border-slate-200 shadow-sm" />
          : <a className="text-sm font-semibold text-emerald-800 underline" href={`${API}${data[name]}`} target="_blank" rel="noreferrer">View uploaded document</a>)}
      </div>
      {errors[name] && (
        <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
          <span>⚠️</span> {errors[name]}
        </p>
      )}
    </div>
  );

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><LoadingSpinner /></div>;

  if (status === 'approved' || status === 'pending') {
    const approved = status === 'approved';
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm sm:p-12">
          <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {approved ? <FaCheck className="text-2xl" /> : <FaClock className="text-2xl" />}
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Provider application</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-950">{approved ? 'You’re approved!' : 'Application under review'}</h1>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
            {approved
              ? 'Your provider dashboard is ready. You can continue to book home services as a customer at any time.'
              : 'Your application has been submitted. We’ll review your details and notify you when there’s an update.'}
          </p>
          <div className="mx-auto mt-8 max-w-md rounded-2xl bg-slate-50 p-5 text-left">
            <p className="text-sm font-semibold text-slate-900">Application status</p>
            <p className={`mt-2 text-sm font-bold ${approved ? 'text-emerald-700' : 'text-amber-700'}`}>
              {approved ? 'Approved' : 'Pending approval'}
            </p>
            <p className="mt-1 text-xs text-slate-500">Submitted details remain attached to your customer account.</p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {approved && <Link to="/provider" className="rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900">Open provider dashboard</Link>}
            <Link to="/" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Continue as customer</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Link to="/profile" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><FaArrowLeft /> Back to profile</Link>
      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Grow with Nivestry</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Become a service provider</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Tell us about your experience and the services you offer. You can save a draft and return whenever you’re ready.</p>
      </div>
      {status === 'rejected' && rejectionReason && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Changes requested:</strong> {rejectionReason}
        </div>
      )}
      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Application steps" className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-1">
          {steps.map((label, index) => (
            <button type="button" key={label} onClick={() => index < step && setStep(index)}
              className={`rounded-xl px-3 py-2.5 text-left text-xs font-bold transition lg:text-sm ${index === step ? 'bg-emerald-800 text-white' : index < step ? 'bg-emerald-50 text-emerald-800' : 'bg-white text-slate-400'}`}>
              <span className="mr-1.5 opacity-70">0{index + 1}</span>{label}
            </button>
          ))}
        </nav>
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-slate-950">{steps[step]} information</h2>
          <p className="mt-1 text-sm text-slate-500">Step {step + 1} of {steps.length}</p>
          <div className="mt-6 space-y-5">
            {step === 0 && (
              <>
                {field('Full name', 'fullName', { placeholder: 'Your legal full name' })}
                {field('Phone number', 'phone', { type: 'tel', placeholder: '10-digit mobile number' })}
                {field('Email', 'email', { type: 'email', disabled: true, hint: 'Linked to your Nivestry account' })}
                {uploadControl('Profile photo', 'profilePhoto', 'image')}
                {field('Date of birth', 'dateOfBirth', { type: 'date', max: new Date().toISOString().split('T')[0] })}
              </>
            )}
            {step === 1 && (
              <>
                <fieldset>
                  <legend className="text-sm font-semibold text-slate-700">
                    Service categories <span className="text-red-500">*</span>
                  </legend>
                  <div className={`mt-3 grid gap-2 sm:grid-cols-2 p-1.5 rounded-xl transition ${errors.categories ? 'border border-red-500 bg-red-50/40' : ''}`}>
                    {categories.map((category) => (
                      <label key={category} className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={data.categories.includes(category)} onChange={() => toggleArrayValue('categories', category)} />
                        {category}
                      </label>
                    ))}
                  </div>
                  {errors.categories && (
                    <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                      <span>⚠️</span> {errors.categories}
                    </p>
                  )}
                </fieldset>
                {field('Skills and specialization', 'skills', { multiline: true, placeholder: 'Describe your expertise, tools, and specialty...' })}
                {field('Years of experience', 'experience', { type: 'number', min: 0, max: 60, placeholder: 'e.g. 5' })}
                {field('Previous work description', 'previousWork', { multiline: true, placeholder: 'Brief summary of past projects, clients, or experience...' })}
                {field('Certifications (optional)', 'certifications', { multiline: true, required: false, placeholder: 'Relevant diplomas, trade licenses, or certificates' })}
              </>
            )}
            {step === 2 && (
              <div className="space-y-6">
                {/* Action Banner: Auto-detect & Autosuggest Search */}
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 p-4 sm:p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FaMapMarkerAlt className="text-emerald-700" /> Set Your Base Location
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Auto-detect using GPS, search an address, or drag the pin on the map.
                      </p>
                    </div>

                    {/* Auto-detect button */}
                    <button
                      type="button"
                      onClick={handleDetectGPS}
                      disabled={isDetecting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-900 disabled:opacity-60 transition"
                    >
                      {isDetecting ? (
                        <>
                          <FaSpinner className="animate-spin text-sm" /> Detecting GPS...
                        </>
                      ) : (
                        <>
                          <FaCrosshairs className="text-sm" /> Auto-detect my location
                        </>
                      )}
                    </button>
                  </div>

                  {/* Location Autosuggest Search Bar */}
                  <div className="relative" ref={searchContainerRef}>
                    <div className="relative flex items-center">
                      <FaSearch className="absolute left-3.5 text-slate-400 text-sm pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => searchResults.length > 0 && setSearchDropdownOpen(true)}
                        placeholder="Search city, locality, town, or address (autosuggest)..."
                        className="input-field pl-10 pr-10 text-sm h-11 bg-white shadow-sm"
                      />
                      {isSearching && (
                        <FaSpinner className="animate-spin absolute right-3.5 text-emerald-700 text-sm" />
                      )}
                      {!isSearching && searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                            setSearchDropdownOpen(false);
                          }}
                          className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1"
                        >
                          <FaTimes className="text-xs" />
                        </button>
                      )}
                    </div>

                    {/* Autosuggest Dropdown */}
                    {searchDropdownOpen && searchResults.length > 0 && (
                      <ul className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                        {searchResults.map((item, idx) => (
                          <li
                            key={idx}
                            onClick={() => handleSelectLocation(item)}
                            className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-emerald-50/80 cursor-pointer text-left border-b border-slate-100 last:border-b-0 transition"
                          >
                            <FaMapMarkerAlt className="text-emerald-700 text-sm mt-1 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-slate-900 truncate">
                                {item.city || item.locality || item.formattedAddress?.split(',')[0]}
                                {item.state ? <span className="text-slate-500 font-normal">, {item.state}</span> : ''}
                              </div>
                              <div className="text-xs text-slate-500 line-clamp-1">
                                {item.formattedAddress}
                              </div>
                            </div>
                            {item.pincode && (
                              <span className="shrink-0 text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                {item.pincode}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Interactive Map */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                    <span className="font-semibold flex items-center gap-1.5 text-slate-800">
                      <FaMapMarkedAlt className="text-emerald-700" /> Interactive Coverage Map
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isReverseGeocoding ? (
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <FaSpinner className="animate-spin" /> Fetching address...
                        </span>
                      ) : (
                        `📍 ${Number(data.latitude || 29.3803).toFixed(4)}, ${Number(data.longitude || 79.5126).toFixed(4)} · Drag pin or click map to adjust`
                      )}
                    </span>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                    <LeafletMap
                      center={[Number(data.latitude) || 29.3803, Number(data.longitude) || 79.5126]}
                      markerPosition={[Number(data.latitude) || 29.3803, Number(data.longitude) || 79.5126]}
                      radius={Number(data.radius) || 10}
                      onPositionChange={handleMapPositionChange}
                      interactive={true}
                      height="320px"
                      circleColor="#047857"
                      circleFillColor="#10b981"
                    />

                    {/* Coverage badge overlay */}
                    <div className="absolute top-3 left-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-medium text-slate-700 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 border border-emerald-400"></span>
                      <span>Coverage radius: <strong>{data.radius || 10} km</strong></span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 px-1">
                    The highlighted circle shows your customer service area. Customers within this radius will be able to book you.
                  </p>
                </div>

                {/* Form fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('City', 'city', { placeholder: 'e.g. Dwarahat' })}
                  {field('State', 'state', { placeholder: 'e.g. Uttarakhand' })}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {field('PIN code', 'pincode', { type: 'text', max: 6, placeholder: 'e.g. 263653' })}
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Service radius (km) <span className="text-red-500 ml-1">*</span>
                      <div className="mt-1.5 flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="150"
                          value={Number(data.radius) || 10}
                          onChange={(e) => update('radius', e.target.value)}
                          className="flex-1 accent-emerald-800"
                        />
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={data.radius || ''}
                          onChange={(e) => update('radius', e.target.value)}
                          className={`input-field w-24 text-center font-semibold ${errors.radius ? '!border-red-500 !ring-red-500 ring-1' : ''}`}
                          placeholder="km"
                        />
                      </div>
                    </label>
                    {errors.radius && (
                      <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                        <span>⚠️</span> {errors.radius}
                      </p>
                    )}
                  </div>
                </div>

                {field('Areas where you offer services', 'areas', { placeholder: 'Separate areas with commas (e.g. Dwarahat Bazar, Chaukhutia, Ranikhet Road)' })}
              </div>
            )}
            {step === 3 && (
              <>
                {field('Government ID type', 'govtIdType', { placeholder: 'e.g. Aadhaar, PAN, Passport' })}
                {field('Government ID number', 'govtIdNumber')}
                {uploadControl('Government ID document (PDF, JPG or PNG)', 'govtIdDocument', 'document')}
                {uploadControl('Work experience proof (optional)', 'workProof', 'document')}
              </>
            )}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-slate-600">Review your details before sending them for admin approval. You can go back to any step to make changes.</p>
                {[
                  ['Personal', `${data.fullName} · ${data.phone} · ${data.email} · DOB ${data.dateOfBirth} · profile photo ${data.profilePhoto ? 'uploaded' : 'missing'}`],
                  ['Services', `${data.categories.join(', ')} · ${data.skills} · ${data.experience} years · ${data.previousWork} · certifications: ${data.certifications || 'none'}`],
                  ['Location', `${data.city}, ${data.state} ${data.pincode} · areas: ${data.areas} · ${data.radius} km radius${data.latitude && data.longitude ? ` (📍 ${Number(data.latitude).toFixed(4)}, ${Number(data.longitude).toFixed(4)})` : ''}`],
                  ['Verification', `${data.govtIdType} ${data.govtIdNumber} · ID document ${data.govtIdDocument ? 'uploaded' : 'missing'} · work proof ${data.workProof ? 'uploaded' : 'not provided'}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-1 rounded-xl bg-slate-50 p-4 sm:flex-row sm:justify-between">
                    <span className="text-sm font-bold text-slate-800">{label}</span>
                    <span className="text-sm text-slate-600 sm:text-right">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || saving}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:invisible">Back</button>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={saveDraft} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              {step < steps.length - 1 ? (
                <button type="button" onClick={nextStep} disabled={saving || Boolean(uploading)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-60">
                  Continue <FaArrowRight />
                </button>
              ) : (
                <button type="button" onClick={submitApplication} disabled={saving || Boolean(uploading)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-60">
                  {saving ? 'Submitting…' : 'Submit application'} <FaCheck />
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProviderOnboarding;
