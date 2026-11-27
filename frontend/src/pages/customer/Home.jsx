import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Star,
  CheckCircle2,
  X,
  Zap,
  Droplets,
  Hammer,
  Wind,
  Sparkles,
  Paintbrush,
  Wrench,
  ShieldAlert,
  Scissors,
  Clock,
  Award,
  ChevronRight,
  PhoneCall,
  CalendarCheck
} from 'lucide-react';
import ServiceCard from '../../components/customer/ServiceCard';
import BookingCard from '../../components/customer/BookingCard';
import LocationModal from '../../components/common/LocationModal';
import { ServiceCardSkeleton } from '../../components/common/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const categoryIcons = {
  Electrician: Zap,
  Plumber: Droplets,
  Carpenter: Hammer,
  'AC Repair': Wind,
  'Home Cleaning': Sparkles,
  Painting: Paintbrush,
  'Appliance Repair': Wrench,
  'Pest Control': ShieldAlert,
  'Salon at Home': Scissors,
};

const categoryBadgeStyles = {
  Electrician: 'bg-[#f7f5f0] text-[#b3261e] border-[#dedad0]',
  Plumber: 'bg-[#f7f5f0] text-[#b3261e] border-[#dedad0]',
  Carpenter: 'bg-[#f7f5f0] text-[#b3261e] border-[#dedad0]',
  'AC Repair': 'bg-[#f7f5f0] text-[#b3261e] border-[#dedad0]',
  'Home Cleaning': 'bg-[#f7f5f0] text-[#b3261e] border-[#dedad0]',
  Painting: 'bg-[#f7f5f0] text-[#b3261e] border-[#dedad0]',
  'Appliance Repair': 'bg-[#f7f5f0] text-[#b3261e] border-[#dedad0]',
  'Pest Control': 'bg-[#f7f5f0] text-[#b3261e] border-[#dedad0]',
  'Salon at Home': 'bg-[#f7f5f0] text-[#b3261e] border-[#dedad0]',
};

// Icon background colors per category (matching screenshot design)
const categoryIconBg = {
  'AC Repair': 'bg-orange-50 text-orange-500',
  Electrician: 'bg-amber-50 text-amber-500',
  Plumber: 'bg-teal-50 text-teal-500',
  'Home Cleaning': 'bg-emerald-50 text-emerald-600',
  Carpenter: 'bg-orange-50 text-orange-600',
  'Appliance Repair': 'bg-slate-100 text-slate-600',
  Painting: 'bg-teal-50 text-teal-600',
  'Pest Control': 'bg-slate-100 text-slate-600',
  'Salon at Home': 'bg-emerald-50 text-emerald-500',
};

// Category metadata for the new "Popular Home Services" cards
const categoryMeta = {
  'AC Repair': {
    description: 'Deep jet cleaning, gas refill & fixes',
    startsAt: 399,
    badge: { text: 'Hot Season', color: 'bg-orange-100 text-orange-600' },
  },
  Electrician: {
    description: 'Wiring, MCB tripping, fan installation',
    startsAt: 149,
    badge: { text: '30m Express', color: 'bg-[#1a1a18] text-white' },
  },
  Plumber: {
    description: 'Tap leaks, pipeline choking, geyser fits',
    startsAt: 199,
    badge: null,
  },
  'Home Cleaning': {
    description: 'Bathrooms, kitchen, sofa shampooing',
    startsAt: 499,
    badge: { text: 'Top Rated', color: 'bg-teal-100 text-teal-700' },
  },
  Carpenter: {
    description: 'Locks, hinge repairs, custom woodwork',
    startsAt: 199,
    badge: null,
  },
  'Appliance Repair': {
    description: 'Washing machine, fridge, microwave',
    startsAt: 299,
    badge: null,
  },
  Painting: {
    description: 'Damp proofing, full home repaint',
    startsAt: 999,
    badge: null,
  },
  'Pest Control': {
    description: 'Cockroach, termite & bedbug relief',
    startsAt: 599,
    badge: null,
  },
  'Salon at Home': {
    description: 'Spa, haircuts, hygiene grooming',
    startsAt: 249,
    badge: null,
  },
};

const steps = [
  {
    number: '01',
    title: 'Select Your Service',
    description: 'Browse transparent pricing across 50+ home repair, maintenance, and cleaning services.',
    icon: Search,
  },
  {
    number: '02',
    title: 'Pick Time & Verified Pro',
    description: 'Choose your preferred date, convenient time slot, and review verified provider credentials.',
    icon: CalendarCheck,
  },
  {
    number: '03',
    title: 'Hassle-Free Doorstep Service',
    description: 'Our background-checked expert arrives on time and resolves your issue with guaranteed satisfaction.',
    icon: ShieldCheck,
  },
];

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);
  const [services, setServices] = useState([]);
  const [latestServices, setLatestServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);

  // Live auto-complete suggestions for hero search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/services?search=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.services)) {
          setSuggestions(data.services.slice(0, 5));
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Home search suggestion error:', err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    fetch(`${API}/api/service-categories`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setCategories(
            (data.categories || []).map((category) => ({
              name: category.name,
              icon: categoryIcons[category.name] || Wrench,
              color: categoryBadgeStyles[category.name] || 'bg-slate-50 text-slate-700 border-slate-200',
            }))
          );
        }
      })
      .catch((error) => console.error('Failed to load service categories', error));

    fetch(`${API}/api/services?sort=newest`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success && Array.isArray(data.services)) {
          setLatestServices(data.services);
        }
      })
      .catch((error) => console.error('Failed to load latest services', error));
  }, []);

  useEffect(() => {
    if (user?.address?.latitude && user?.address?.longitude) {
      const location = {
        latitude: user.address.latitude,
        longitude: user.address.longitude,
        address: user.address.formattedAddress || `${user.address.city || ''}, ${user.address.state || ''}`,
        locality: user.address.locality || '',
        city: user.address.city || '',
        state: user.address.state || '',
        pincode: user.address.pincode || '',
      };
      setUserLocation(location);
      fetchNearbyServices(location.latitude, location.longitude, location.pincode);
    } else {
      try {
        const savedLoc = localStorage.getItem('nivestry_user_location') || localStorage.getItem('homiefix_user_location');
        if (savedLoc) {
          const parsed = JSON.parse(savedLoc);
          if (parsed?.latitude && parsed?.longitude) {
            setUserLocation(parsed);
            fetchNearbyServices(parsed.latitude, parsed.longitude, parsed.pincode);
            return;
          }
        }
      } catch {
        // ignore storage errors
      }
      fetchDefaultServices();
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role === 'admin') {
      setRecentBookings([]);
      return;
    }
    fetch(`${API}/api/bookings`, { credentials: 'include' })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setRecentBookings((data.bookings || []).slice(0, 2));
      })
      .catch((error) => console.error('Failed to load recent bookings', error));
  }, [user]);

  const fetchDefaultServices = () => {
    setServicesLoading(true);
    fetch(`${API}/api/services?sort=newest`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.services) setServices(data.services);
      })
      .catch((error) => console.error('Failed to load services', error))
      .finally(() => setServicesLoading(false));
  };

  const fetchNearbyServices = (latitude, longitude, pincode = '') => {
    setServicesLoading(true);
    const pinParam = pincode ? `&pincode=${encodeURIComponent(pincode)}` : '';
    fetch(`${API}/api/providers/nearby?lat=${latitude}&lng=${longitude}${pinParam}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.services?.length) {
          setServices(data.services);
          setServicesLoading(false);
        } else {
          fetchDefaultServices();
        }
      })
      .catch(() => fetchDefaultServices());
  };

  const handleSearch = (event) => {
    if (event) event.preventDefault();
    setShowSuggestions(false);
    if (searchQuery.trim()) {
      navigate(`/services?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/services');
    }
  };

  const handleLocationSelected = (location) => {
    setUserLocation(location);
    fetchNearbyServices(location.latitude, location.longitude, location.pincode);
  };

  const recommendedServices = services.slice(0, 8);
  const displayedServiceIds = new Set(recommendedServices.map((s) => s.id || s._id));
  const newlyListedOtherServices = latestServices
    .filter((svc) => !displayedServiceIds.has(svc.id || svc._id))
    .slice(0, 4);

  const catalogForCategoryStats = latestServices.length > 0 ? latestServices : services;
  const categoryStats = catalogForCategoryStats.reduce((acc, svc) => {
    const key = svc.category;
    if (!key) return acc;
    const price = Number(svc.price || svc.fixedPrice || svc.inspectionFee || svc.visitFee || 0);
    if (!acc[key]) {
      acc[key] = { count: 1, minPrice: price > 0 ? price : null };
    } else {
      acc[key].count += 1;
      if (price > 0 && (acc[key].minPrice === null || price < acc[key].minPrice)) {
        acc[key].minPrice = price;
      }
    }
    return acc;
  }, {});

  return (
    <div className="home-page min-h-screen bg-[#f7f5f0] text-[#1a1a18]">
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={handleLocationSelected}
        initialLocation={userLocation}
      />

      {/* Hero Section — Full-Width Left-to-Right Background with Integrated Header Overlay */}
      <section className="relative w-full bg-[#1a1a18] border-b border-[#dedad0] pt-24 pb-14 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24">
        {/* Full-Bleed Background Image & Directional Gradient Overlay */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src="/deep-home-cleaning.jpg"
            alt="Professional Deep Home Cleaning"
            className="h-full w-full object-cover object-center opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a18]/92 via-[#1a1a18]/68 to-[#1a1a18]/25" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a18]/65 via-transparent to-[#1a1a18]/75" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative z-20 max-w-2xl"
            >
              {/* Trust Pill */}
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f7f5f0]/20 bg-[#1a1a18]/45 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-[#f7f5f0] shadow-xs">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#b3261e] text-[#f7f5f0]">
                  <CheckCircle2 className="w-3 h-3" />
                </span>
                <span>Trusted Doorstep Home Services</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-extrabold leading-[1.08] tracking-tight text-[#f7f5f0]">
                Your Home Fixed by{' '}
                <span className="text-[#ebe8df] underline decoration-[#b3261e] decoration-4 underline-offset-8">
                  Verified Experts
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base sm:text-lg text-[#ebe8df]/90 leading-relaxed">
                Book skilled electricians, plumbers, appliance technicians, and cleaning specialists with transparent pricing and instant booking confirmation.
              </p>

              {/* Unified Pill Search + Location Bar (matching reference layout with Stitch colors) */}
              <div ref={searchContainerRef} className="relative mt-8 max-w-2xl">
                <form
                  onSubmit={handleSearch}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 rounded-2xl sm:rounded-full border border-[#f7f5f0]/30 bg-[#1a1a18]/60 backdrop-blur-md p-1.5 shadow-xl hover:border-[#f7f5f0]/50 transition-all"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 px-4 py-1">
                    <Search className="w-4 h-4 text-[#ebe8df]/80 shrink-0" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                      placeholder="Search services (e.g. AC Repair, Electrician)..."
                      aria-label="Search home services"
                      className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-[#f7f5f0] outline-none placeholder:text-[#ebe8df]/70 focus:ring-0"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                        className="text-[#ebe8df]/70 hover:text-[#f7f5f0] p-1"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Vertical Divider */}
                  <div className="hidden sm:block h-7 w-px bg-[#f7f5f0]/25 mx-1 shrink-0" />

                  {/* Location Selector Pill Half */}
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-left text-sm text-[#f7f5f0] hover:bg-white/10 rounded-xl sm:rounded-full transition shrink-0 max-w-full sm:max-w-[200px]"
                    title={userLocation?.address || 'Set your location to see nearby pros'}
                  >
                    <MapPin className="w-4 h-4 text-[#b3261e] shrink-0" />
                    <span className="truncate font-medium text-[#ebe8df]">
                      {userLocation?.city || userLocation?.locality || userLocation?.address || 'Set Location'}
                    </span>
                  </button>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-full bg-[#b3261e] hover:bg-[#9c2019] px-5 py-2.5 font-semibold text-white text-sm shadow-sm transition hover:shadow focus:outline-none focus:ring-2 focus:ring-[#b3261e]/40 shrink-0"
                  >
                    <span>Find Experts</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Suggestions Flyout */}
                <AnimatePresence>
                  {showSuggestions && searchQuery.trim() && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 top-full mt-2 bg-[#f7f5f0] rounded-2xl shadow-2xl border border-[#dedad0] overflow-hidden z-50 py-2 text-left"
                    >
                      {suggestions.length > 0 ? (
                        <div>
                          <div className="px-4 py-1.5 text-[11px] font-bold text-[#6a675f] uppercase tracking-wider flex items-center justify-between">
                            <span>Services Available</span>
                            <span className="text-[10px] text-[#6a675f] font-normal">{suggestions.length} found</span>
                          </div>
                          {suggestions.map((svc) => (
                            <button
                              key={svc.id || svc._id}
                              type="button"
                              onClick={() => {
                                setShowSuggestions(false);
                                navigate(`/services/${svc.id || svc._id}`);
                              }}
                              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#ebe8df] transition-colors group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-[#ebe8df] text-[#b3261e] flex items-center justify-center shrink-0">
                                  <Search className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[#1a1a18] truncate group-hover:text-[#b3261e] transition-colors">
                                    {svc.name}
                                  </p>
                                  <p className="text-xs text-[#6a675f] capitalize">{svc.category}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <span className="text-sm font-bold text-[#1a1a18] font-mono">
                                  ₹{svc.price || svc.fixedPrice || svc.basePrice || 0}
                                </span>
                                <span className="block text-[10px] text-[#6a675f] font-medium">onwards</span>
                              </div>
                            </button>
                          ))}
                          <div className="border-t border-[#dedad0] mt-1 pt-1">
                            <button
                              type="button"
                              onClick={handleSearch}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-[#b3261e] hover:bg-[#ebe8df] text-left flex items-center justify-between"
                            >
                              <span>View all results for &ldquo;{searchQuery}&rdquo;</span>
                              <span className="font-bold">Explore &rarr;</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-5 text-center">
                          <p className="text-sm text-[#1a1a18] font-medium">No direct match for &ldquo;{searchQuery}&rdquo;</p>
                          <p className="text-xs text-[#6a675f] mt-1">Press Find Experts to view all available services</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Micro Guarantees */}
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs sm:text-sm text-[#ebe8df]/85">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-[#b3261e]" />
                  <span>Verified & Background Checked</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Star className="w-4 h-4 text-[#b3261e] fill-[#b3261e]" />
                  <span>4.8/5 Avg Professional Rating</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-[#ebe8df]" />
                  <span>On-Time Arrival Guarantee</span>
                </span>
              </div>
          </motion.div>
        </div>
      </section>

      {/* Numerical Stats Banner */}
      <section className="border-b border-[#dedad0] bg-[#ebe8df]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-6 px-4 py-8 text-center sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { value: '15,000+', label: 'Happy Homeowners' },
            { value: '500+', label: 'Certified Pros' },
            { value: '98.5%', label: 'On-Time Completion' },
            { value: '4.9 ★', label: 'Customer Rating' },
          ].map((stat) => (
            <div key={stat.label} className="border-r last:border-0 border-[#dedad0]">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#1a1a18] tracking-tight font-mono">{stat.value}</p>
              <p className="mt-1 text-xs font-semibold text-[#6a675f] uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Home Services – Card Grid */}
      <section className="pt-10 pb-0 sm:pt-12 sm:pb-0 bg-[#f7f5f0] font-sans">
        {/* Shared 80% Container so Heading aligns cleanly with AC Repair & Service and Deep Cleaning cards */}
        <div className="w-[92%] sm:w-[88%] lg:w-[80%] mx-auto">
          {/* Section Header */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end mb-8 sm:mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a18] tracking-tight font-sans">
                Popular Home Services
              </h2>
              <p className="mt-1 text-sm text-[#6a675f] font-normal tracking-normal">
                Handpicked, background-verified trade specialists ready to assist.
              </p>
            </div>
            <Link
              to="/services"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#b3261e] hover:text-[#9c2019] transition group"
            >
              <span>View All 30+ Categories</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-5">
            {categories.map(({ name, icon: Icon }) => {
              const meta = categoryMeta[name] || {};
              const stats = categoryStats[name];
              const iconColors = categoryIconBg[name] || 'bg-slate-100 text-slate-600';
              const displayStartsAt = stats?.minPrice ?? meta.startsAt ?? 199;
              return (
                <Link
                  key={name}
                  to={`/services?category=${encodeURIComponent(name)}`}
                  className="group relative flex flex-col justify-between min-h-[195px] rounded-2xl border border-[#e5e2db] bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#b3261e]/40 hover:shadow-lg"
                >
                  {/* Top Row: Icon + Badge */}
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconColors} transition group-hover:scale-105`}>
                        <Icon className="w-6 h-6 stroke-[1.8]" />
                      </span>
                      {meta.badge ? (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${meta.badge.color}`}>
                          {meta.badge.text}
                        </span>
                      ) : stats?.count ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide bg-slate-100 text-slate-700">
                          {stats.count} {stats.count === 1 ? 'service' : 'services'}
                        </span>
                      ) : null}
                    </div>

                    {/* Title */}
                    <h3 className="text-[15px] font-bold text-[#1a1a18] group-hover:text-[#b3261e] transition-colors leading-snug tracking-tight font-sans">
                      {name === 'Home Cleaning' ? 'Deep Cleaning' : name === 'AC Repair' ? 'AC Repair & Service' : name === 'Plumber' ? 'Plumbing Fixes' : name === 'Painting' ? 'Painting Solutions' : name === 'Pest Control' ? 'Pest Management' : name === 'Salon at Home' ? 'Grooming & Salon' : name}
                    </h3>

                    {/* Description */}
                    <p className="mt-1.5 text-xs leading-relaxed text-[#6a675f] font-normal not-italic">
                      {meta.description || 'Professional home services'}
                    </p>
                  </div>

                  {/* Bottom: Starts at Price */}
                  <div className="mt-5 flex items-center justify-between pt-2">
                    <span className="text-xs font-medium text-[#6a675f]">Starts at</span>
                    <span className="text-base font-bold text-[#1a1a18]">
                      ₹{displayStartsAt}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Bookings (if logged in) */}
      {recentBookings.length > 0 && (
        <section className="bg-[#f7f5f0] py-12 border-y border-[#ebe8df]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#b3261e]">Account Activity</p>
                <h2 className="mt-1 text-2xl font-extrabold text-[#1a1a18]">Recent Bookings</h2>
              </div>
              <Link to="/my-bookings" className="text-sm font-bold text-[#b3261e] hover:underline">
                View all bookings &rarr;
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {recentBookings.map((booking) => (
                <BookingCard key={booking._id || booking.id} booking={booking} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recommended Services Section */}
      <section className="pt-[5%] pb-16 sm:pb-20 bg-[#f7f5f0]">
        <div className="w-[92%] sm:w-[88%] lg:w-[80%] mx-auto">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#b3261e]">High-Demand Services</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#1a1a18] tracking-tight">
                Recommended Services
              </h2>
              <p className="mt-1 text-sm text-[#6a675f]">Most booked repairs and maintenance packages in your area.</p>
            </div>
            <Link
              to="/services"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-[#b3261e] hover:text-[#9c2019] transition group"
            >
              <span>Browse Catalog</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {servicesLoading && services.length === 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((n) => (
                <ServiceCardSkeleton key={n} />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-2xl border border-[#dedad0] bg-[#ebe8df] p-10 text-center">
              <p className="text-sm font-semibold text-[#1a1a18]">No services found in this location.</p>
              <p className="text-xs text-[#6a675f] mt-1">Try switching location or browsing all categories.</p>
              <Link
                to="/services"
                className="inline-block mt-4 px-4 py-2 bg-[#b3261e] text-white text-xs font-bold rounded-xl"
              >
                View Full Catalog
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recommendedServices.map((service, index) => (
                <ServiceCard key={service.id || service._id || index} service={service} index={index} />
              ))}
            </div>
          )}

          {newlyListedOtherServices.length > 0 && (
            <div className="mt-14 pt-10 border-t border-[#dedad0]">
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#b3261e]">Fresh From Providers</p>
                  <h3 className="mt-1.5 text-xl sm:text-2xl font-extrabold text-[#1a1a18] tracking-tight">
                    Newly Listed Services
                  </h3>
                  <p className="mt-1 text-sm text-[#6a675f]">Recently published offerings across Nivestry.</p>
                </div>
                <Link
                  to="/services"
                  className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-[#b3261e] hover:text-[#9c2019] transition group"
                >
                  <span>Explore All</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {newlyListedOtherServices.map((service, index) => (
                  <ServiceCard key={service.id || service._id || index} service={service} index={index} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How it Works / 3-Step Process */}
      <section className="py-16 sm:py-24 bg-[#ebe8df] border-t border-[#dedad0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-[#b3261e]">Transparent Booking Process</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#1a1a18] tracking-tight">
              How Nivestry Works
            </h2>
            <p className="mt-2 text-sm text-[#6a675f]">
              Three simple steps to book verified professionals at your convenience.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-8">
            {steps.map((step) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.number}
                  className="group relative rounded-2xl bg-[#f7f5f0] border border-[#dedad0] p-6 sm:p-8 shadow-xs hover:border-[#b3261e]/40 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ebe8df] text-[#b3261e] border border-[#dedad0]">
                      <StepIcon className="w-6 h-6 stroke-[1.8]" />
                    </span>
                    <span className="text-2xl font-extrabold text-[#dedad0] group-hover:text-[#b3261e]/30 font-mono transition-colors">{step.number}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#1a1a18]">{step.title}</h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#6a675f]">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* High-Conversion Bottom Banner */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-[#f7f5f0]">
        <div className="mx-auto max-w-7xl rounded-3xl bg-[#1a1a18] px-6 py-12 sm:px-12 sm:py-16 text-[#f7f5f0] relative overflow-hidden shadow-xl border border-[#2b2b28]">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#b3261e]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#b3261e]/20 text-[#f7f5f0] border border-[#b3261e]/30 uppercase tracking-wider">
                Instant Guarantee
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#f7f5f0]">
                Ready to fix or upgrade your home?
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#ebe8df] leading-relaxed">
                Connect with top-rated local technicians. Fair pricing, guaranteed service, and zero booking fee surprises.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-xl bg-[#b3261e] hover:bg-[#9c2019] px-6 py-3.5 text-sm font-bold text-white shadow-md transition active:scale-98"
              >
                <span>Book a Service</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/help"
                className="inline-flex items-center gap-2 rounded-xl border border-[#383833] bg-[#2b2b28] hover:bg-[#383833] px-5 py-3.5 text-sm font-bold text-[#ebe8df] transition"
              >
                <span>FAQ & Help</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
