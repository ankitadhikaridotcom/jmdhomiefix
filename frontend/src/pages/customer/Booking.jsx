import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ShieldCheck,
  CreditCard,
  Check,
  ArrowLeft,
  Crosshair,
  Search,
  X,
  Loader2,
  Home as HomeIcon,
  Briefcase,
  Bookmark,
  Smartphone,
  Landmark,
  Banknote,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Booking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState('');

  const { register, handleSubmit, formState: { errors }, getValues, setValue } = useForm();

  const serviceId = searchParams.get('serviceId');
  const providerIdParam = searchParams.get('providerId');
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState([]);

  // Customer saved addresses & location auto-detect states
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch saved customer addresses
  useEffect(() => {
    fetch(`${API}/api/addresses`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.addresses?.length > 0) {
          setSavedAddresses(data.addresses);
          const defaultAddr = data.addresses.find((a) => a.isDefault) || data.addresses[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr._id);
            setValue('address', defaultAddr.address || '');
            setValue('city', defaultAddr.city || '');
            setValue('pincode', defaultAddr.pincode || '');
          }
        }
      })
      .catch((err) => console.error('Failed to load saved addresses', err));
  }, [setValue]);

  // Auto-detect GPS location handler
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingLocation(true);
    const toastId = toast.loading('Detecting your GPS location...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`${API}/api/location/reverse-geocode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          });
          const data = await res.json();
          if (data.success) {
            setValue('address', data.formattedAddress || `${data.locality || ''}, ${data.city || ''}`);
            setValue('city', data.city || data.locality || '');
            setValue('pincode', data.pincode || '');
            setSelectedAddressId(null);
            setSearchQuery(data.formattedAddress || `${data.city}, ${data.state}`);
            toast.success(`Location detected: ${data.city || data.locality || 'Address filled'}`, { id: toastId });
          } else {
            toast.error('Could not determine address from location.', { id: toastId });
          }
        } catch {
          toast.error('Failed to resolve GPS address.', { id: toastId });
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        setIsDetectingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission was denied. Please allow location access or type manually.', { id: toastId });
        } else {
          toast.error('Could not detect device location. Please search manually.', { id: toastId });
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Autosuggest search query handler
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/location/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.results || []);
          setShowSearchDropdown((data.results || []).length > 0);
        }
      } catch (err) {
        console.error('[Location Search Error]', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleSelectSearchResult = (item) => {
    setValue('address', item.formattedAddress || item.locality || item.city);
    setValue('city', item.city || item.locality || '');
    setValue('pincode', item.pincode || '');
    setSearchQuery(item.formattedAddress || `${item.city}, ${item.state}`);
    setSearchResults([]);
    setShowSearchDropdown(false);
    setSelectedAddressId(null);
    toast.success(`Selected: ${item.city || item.locality || 'Location'}`);
  };

  const handleSelectSavedAddress = (addr) => {
    setSelectedAddressId(addr._id);
    setValue('address', addr.address || '');
    setValue('city', addr.city || '');
    setValue('pincode', addr.pincode || '');
    toast.success(`Using "${addr.label}" address`);
  };

  useEffect(() => {
    if (!serviceId) { setLoading(false); return; }
    fetch(`${API}/api/services/${serviceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.service) setService(data.service);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [serviceId]);

  useEffect(() => {
    if (selectedDate && service && service.provider?.id) {
      fetch(`${API}/api/providers/${service.provider.id}/availability?date=${selectedDate}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAvailableSlots(data.availableSlots || []);
            setSelectedTime('');
          }
        });
    }
  }, [selectedDate, service]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><LoadingSpinner /></div>;

  if (!service) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-sm bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Booking Details</h2>
          <p className="text-xs text-slate-500 mb-6">The service requested could not be found or loaded.</p>
          <button
            onClick={() => navigate('/services')}
            className="w-full py-2.5 px-4 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-sm rounded-xl transition shadow-xs"
          >
            Browse Services
          </button>
        </div>
      </div>
    );
  }

  const providerName = service.provider?.name || 'Verified Provider';
  const providerId = providerIdParam || service.provider?.id || service.provider?._id || (typeof service.provider === 'string' ? service.provider : '');
  const pt = service.priceType || service.pricingType;

  // Compute pricing
  let visitCharge = 0, labourCharge = 0, platformFee = 0, total = 0, initialPayment = 0;
  if (pt === 'fixed') {
    labourCharge = service.fixedPrice || service.price;
    platformFee = Math.round(labourCharge * 0.03);
    total = labourCharge + platformFee;
    initialPayment = total;
  } else if (pt === 'inspection') {
    visitCharge = service.inspectionFee || service.price;
    platformFee = Math.round(visitCharge * 0.03);
    total = visitCharge + platformFee;
    initialPayment = total;
  } else if (pt === 'hourly') {
    visitCharge = service.visitFee || service.price;
    const hrs = duration;
    labourCharge = (service.hourlyRate || 0) * hrs;
    platformFee = Math.round((visitCharge + labourCharge) * 0.03);
    total = visitCharge + labourCharge + platformFee;
    initialPayment = visitCharge + Math.round(visitCharge * 0.03);
  }

  const dates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1);
    return {
      value: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' })
    };
  });

  const onSubmitBooking = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both a date and time slot.');
      return;
    }
    setStep(2);
  };

  const processPayment = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1400));
      
      const formValues = getValues();
      const res = await fetch(`${API}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          serviceId, providerId, date: selectedDate, time: selectedTime,
          duration, paymentMethod,
          address: formValues.address || '', city: formValues.city || '',
          pincode: formValues.pincode || '', landmark: formValues.landmark || '',
          description: formValues.description || '',
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setBookingId(data.booking.id);
      setBookingConfirmed(true);
      setStep(3);
      toast.success('Booking confirmed! 🎉');
    } catch (err) {
      toast.error(err.message || 'Booking failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 3 Confirmation Screen
  if (bookingConfirmed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 18 }}
          className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 max-w-md w-full text-center shadow-xl"
        >
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-100">
            <CheckCircle2 className="w-9 h-9 stroke-[2]" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Booking Confirmed!</h2>
          <p className="text-xs text-slate-500 mt-1 font-mono">Reference ID: #{bookingId}</p>

          <div className="mt-6 space-y-3 text-left bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <CalendarIcon className="w-4 h-4 text-[#0EA5E9] shrink-0" />
              <span className="text-slate-600">Date: <strong className="text-slate-900 font-semibold">{selectedDate}</strong></span>
            </div>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <Clock className="w-4 h-4 text-[#0EA5E9] shrink-0" />
              <span className="text-slate-600">Slot: <strong className="text-slate-900 font-semibold">{selectedTime}</strong></span>
            </div>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-slate-600">Pro: <strong className="text-slate-900 font-semibold">{providerName}</strong></span>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm border-t border-slate-200 pt-3">
              <span className="text-slate-600 font-medium">{pt === 'fixed' ? 'Total Paid' : 'Initial Paid'}:</span>
              <span className="font-extrabold text-[#0284C7] text-base font-mono">₹{initialPayment}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={() => navigate('/my-bookings')}
              className="py-2.5 px-4 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-bold text-xs sm:text-sm shadow-xs transition"
            >
              My Bookings
            </button>
            <button
              onClick={() => navigate('/')}
              className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition"
            >
              Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step > 1 ? 'Back to Details' : 'Back'}</span>
        </button>

        {/* Step Progress Bar */}
        <div className="flex items-center gap-3 mb-8">
          {['Details & Slot', 'Payment', 'Confirmed'].map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                  step > i + 1
                    ? 'bg-emerald-600 text-white'
                    : step === i + 1
                    ? 'bg-[#0EA5E9] text-white shadow-xs'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {step > i + 1 ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : i + 1}
              </div>
              <span className={`text-xs sm:text-sm font-semibold hidden sm:inline ${step >= i + 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                {s}
              </span>
              {i < 2 && (
                <div className={`w-6 sm:w-12 h-0.5 rounded-full ${step > i + 1 ? 'bg-emerald-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                  <form onSubmit={handleSubmit(onSubmitBooking)} className="space-y-6">
                    {/* Selected Service Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                      <h3 className="font-bold text-slate-900 text-sm mb-3">Selected Service</h3>
                      <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <img src={service.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{service.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{providerName}</p>
                        </div>
                        <span className="font-mono text-sm font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200/60 shadow-2xs shrink-0">
                          ₹{service.fixedPrice || service.inspectionFee || service.visitFee || service.price}
                        </span>
                      </div>

                      {pt === 'hourly' && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Estimated Duration (Hours)</label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setDuration(Math.max(1, duration - 1))}
                              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition"
                            >
                              -
                            </button>
                            <span className="text-base font-bold w-8 text-center font-mono">{duration}</span>
                            <button
                              type="button"
                              onClick={() => setDuration(Math.min(8, duration + 1))}
                              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Schedule Date & Time Slot */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                      <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-[#0EA5E9]" />
                        <span>Choose Preferred Date</span>
                      </h3>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {dates.map((d) => (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => setSelectedDate(d.value)}
                            className={`shrink-0 flex flex-col items-center py-2.5 px-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                              selectedDate === d.value
                                ? 'border-[#0EA5E9] bg-sky-50 text-[#0284C7] font-bold shadow-xs'
                                : 'border-slate-100 hover:border-slate-200 text-slate-700 bg-white'
                            }`}
                          >
                            <span className="text-[10px] uppercase font-semibold text-slate-400">{d.day}</span>
                            <span className="text-base font-extrabold font-mono mt-0.5">{d.date}</span>
                            <span className="text-[10px] text-slate-500">{d.month}</span>
                          </button>
                        ))}
                      </div>

                      <div className="mt-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#0EA5E9]" />
                          <span>Select Arrival Time Slot</span>
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {availableSlots.length > 0 ? (
                            availableSlots.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setSelectedTime(t)}
                                className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                  selectedTime === t
                                    ? 'border-[#0EA5E9] bg-sky-50 text-[#0284C7] shadow-xs'
                                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                                }`}
                              >
                                {t}
                              </button>
                            ))
                          ) : (
                            <div className="col-span-full text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                              Please select a date above to display available pro slots.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Address Card */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#0EA5E9]" />
                            <span>Service Location Address</span>
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">Where will the technician perform the job?</p>
                        </div>

                        {/* GPS Detect */}
                        <button
                          type="button"
                          onClick={handleAutoDetectLocation}
                          disabled={isDetectingLocation}
                          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-sky-50 hover:bg-sky-100 text-[#0284C7] text-xs font-bold px-3 py-1.5 border border-sky-200 transition disabled:opacity-60"
                        >
                          {isDetectingLocation ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Detecting GPS...</span>
                            </>
                          ) : (
                            <>
                              <Crosshair className="w-3.5 h-3.5 text-[#0EA5E9]" />
                              <span>Auto-detect GPS</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Saved Address Pills */}
                      {savedAddresses.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="font-semibold">Saved Addresses</span>
                            <Link to="/my-addresses" className="text-[#0284C7] hover:underline font-medium">Manage</Link>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {savedAddresses.map((addr) => (
                              <button
                                key={addr._id}
                                type="button"
                                onClick={() => handleSelectSavedAddress(addr)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                                  selectedAddressId === addr._id
                                    ? 'border-[#0EA5E9] bg-sky-50 text-[#0284C7] font-semibold ring-1 ring-[#0EA5E9]'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <HomeIcon className="w-3.5 h-3.5 text-slate-400" />
                                <span>{addr.label === 'Other' && addr.customLabel ? addr.customLabel : addr.label}</span>
                                {addr.isDefault && <span className="text-[10px] text-[#0284C7] font-bold">(Default)</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Search Locality */}
                      <div className="relative" ref={searchContainerRef}>
                        <div className="relative flex items-center">
                          <Search className="absolute left-3 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                            placeholder="Search locality or landmark (autosuggest)..."
                            className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 outline-none transition"
                          />
                          {isSearching && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 text-[#0EA5E9]" />
                          )}
                          {!isSearching && searchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setSearchResults([]);
                                setShowSearchDropdown(false);
                              }}
                              className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {showSearchDropdown && searchResults.length > 0 && (
                          <ul className="absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                            {searchResults.map((item, idx) => (
                              <li
                                key={idx}
                                onClick={() => handleSelectSearchResult(item)}
                                className="flex items-start gap-2.5 px-3 py-2 hover:bg-sky-50/70 cursor-pointer text-left border-b border-slate-100 last:border-b-0 transition"
                              >
                                <MapPin className="w-3.5 h-3.5 text-[#0EA5E9] mt-0.5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-slate-900 truncate">
                                    {item.city || item.locality || item.formattedAddress?.split(',')[0]}
                                  </div>
                                  <div className="text-[11px] text-slate-500 line-clamp-1">
                                    {item.formattedAddress}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Manual Address Inputs */}
                      <div className="space-y-3 pt-1">
                        <div>
                          <input
                            {...register('address', { required: 'Address is required' })}
                            placeholder="House No., Flat, Building or Street Address"
                            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 outline-none transition"
                          />
                          {errors.address && <p className="text-rose-500 text-xs mt-1">{errors.address.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            {...register('city', { required: 'City is required' })}
                            placeholder="City"
                            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 outline-none transition"
                          />
                          <input
                            {...register('pincode')}
                            placeholder="Postal Code (6 digits)"
                            maxLength={6}
                            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 outline-none transition"
                          />
                        </div>
                        <input
                          {...register('landmark')}
                          placeholder="Nearby Landmark (optional)"
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Job Instructions */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                      <h3 className="font-bold text-slate-900 text-sm mb-2">Job Instructions & Notes</h3>
                      <textarea
                        {...register('description')}
                        placeholder="Add any specific issue details, parts required, or instructions for the pro..."
                        rows={3}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 outline-none transition resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 px-4 rounded-xl bg-[#FF7A1A] hover:bg-[#EA580C] text-white font-bold text-sm shadow-sm transition hover:shadow active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continue to Payment Method</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
                    <h3 className="font-bold text-slate-900 text-base mb-5">Select Payment Option</h3>
                    <div className="space-y-3">
                      {[
                        { id: 'upi', label: 'UPI Instant Pay', desc: 'Google Pay, PhonePe, Paytm, BHIM', icon: Smartphone },
                        { id: 'card', label: 'Credit or Debit Card', desc: 'Visa, MasterCard, RuPay cards', icon: CreditCard },
                        { id: 'netbanking', label: 'Net Banking', desc: 'All leading banks supported', icon: Landmark },
                        { id: 'cash', label: 'Cash on Service Delivery', desc: 'Pay technician after job completion', icon: Banknote },
                      ].map((method) => {
                        const Icon = method.icon;
                        const isSelected = paymentMethod === method.id;
                        return (
                          <label
                            key={method.id}
                            className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[#0EA5E9] bg-sky-50/60 shadow-xs'
                                : 'border-slate-100 hover:border-slate-200 bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="payment"
                              value={method.id}
                              checked={isSelected}
                              onChange={() => setPaymentMethod(method.id)}
                              className="sr-only"
                            />
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-[#0EA5E9] text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Icon className="w-5 h-5 stroke-[1.8]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-slate-900">{method.label}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{method.desc}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-[#0EA5E9]' : 'border-slate-300'
                            }`}>
                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9]" />}
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="mt-5 p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center gap-2.5 text-xs text-amber-800">
                      <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Simulated Secure Payment — zero real charges processed on card or UPI.</span>
                    </div>

                    <button
                      onClick={processPayment}
                      disabled={isProcessing}
                      className="w-full mt-6 py-3.5 px-4 rounded-xl bg-[#FF7A1A] hover:bg-[#EA580C] text-white font-bold text-sm shadow-sm transition hover:shadow active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Authorizing Payment...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>
                            {pt === 'fixed' ? `Pay Total ₹${initialPayment}` : `Pay Initial Fee ₹${initialPayment}`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Sticky Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-md sticky top-24">
              <h3 className="font-bold text-slate-900 text-sm mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                <span>Summary</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0284C7] bg-sky-50 px-2 py-0.5 rounded-md">
                  Step {step} of 2
                </span>
              </h3>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4 border border-slate-100">
                <img src={service.image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{service.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{providerName}</p>
                </div>
              </div>

              {selectedDate && (
                <div className="text-xs text-slate-600 space-y-1.5 mb-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedDate}</span>
                  </div>
                  {selectedTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedTime}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-2 text-xs">
                {pt === 'fixed' && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Service Package</span>
                      <span className="font-semibold text-slate-900 font-mono">₹{labourCharge}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Platform Fee (3%)</span>
                      <span className="font-semibold text-slate-900 font-mono">₹{platformFee}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2.5 font-bold text-slate-900 text-sm">
                      <span>Total Amount</span>
                      <span className="text-[#0284C7] text-base font-mono">₹{total}</span>
                    </div>
                  </>
                )}

                {pt === 'inspection' && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Visit & Inspection Charge</span>
                      <span className="font-semibold text-slate-900 font-mono">₹{visitCharge}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Platform Fee (3%)</span>
                      <span className="font-semibold text-slate-900 font-mono">₹{platformFee}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2.5 font-bold text-slate-900 text-sm">
                      <span>Pay at Booking</span>
                      <span className="text-[#0284C7] text-base font-mono">₹{total}</span>
                    </div>
                  </>
                )}

                {pt === 'hourly' && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Base Visit Fee</span>
                      <span className="font-semibold text-slate-900 font-mono">₹{visitCharge}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Labour ({duration} hr × ₹{service.hourlyRate})</span>
                      <span className="font-semibold text-slate-900 font-mono">₹{labourCharge}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Platform Fee</span>
                      <span className="font-semibold text-slate-900 font-mono">₹{platformFee}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2.5 font-bold text-slate-900 text-sm">
                      <span>Initial Payment</span>
                      <span className="text-[#0284C7] text-base font-mono">₹{initialPayment}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-5 flex items-center gap-1.5 text-[11px] text-slate-400 justify-center font-medium">
                <Lock className="w-3.5 h-3.5" />
                <span>Verified Provider Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
