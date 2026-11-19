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
  Electrician: 'bg-amber-50 text-amber-600 border-amber-200/80',
  Plumber: 'bg-sky-50 text-[#0284C7] border-sky-200/80',
  Carpenter: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  'AC Repair': 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
  'Home Cleaning': 'bg-orange-50 text-[#FF7A1A] border-orange-200/80',
  Painting: 'bg-purple-50 text-purple-700 border-purple-200/80',
  'Appliance Repair': 'bg-slate-100 text-slate-700 border-slate-200',
  'Pest Control': 'bg-rose-50 text-rose-600 border-rose-200/80',
  'Salon at Home': 'bg-pink-50 text-pink-700 border-pink-200/80',
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
        const res = await fetch(`http://localhost:5000/api/services?search=${encodeURIComponent(searchQuery.trim())}`);
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
    fetch('http://localhost:5000/api/service-categories')
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
  }, []);

  useEffect(() => {
    if (user?.address?.latitude && user?.address?.longitude) {
      const location = {
        latitude: user.address.latitude,
        longitude: user.address.longitude,
        address: user.address.formattedAddress || `${user.address.city || ''}, ${user.address.state || ''}`,
      };
      setUserLocation(location);
      fetchNearbyServices(location.latitude, location.longitude);
    } else {
      fetchDefaultServices();
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role === 'admin') {
      setRecentBookings([]);
      return;
    }
    fetch('http://localhost:5000/api/bookings', { credentials: 'include' })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setRecentBookings((data.bookings || []).slice(0, 2));
      })
      .catch((error) => console.error('Failed to load recent bookings', error));
  }, [user]);

  const fetchDefaultServices = () => {
    setServicesLoading(true);
    fetch('http://localhost:5000/api/services')
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.services) setServices(data.services);
      })
      .catch((error) => console.error('Failed to load services', error))
      .finally(() => setServicesLoading(false));
  };

  const fetchNearbyServices = (latitude, longitude) => {
    setServicesLoading(true);
    fetch(`http://localhost:5000/api/providers/nearby?lat=${latitude}&lng=${longitude}`)
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
    fetchNearbyServices(location.latitude, location.longitude);
  };

  return (
    <div className="home-page min-h-screen bg-slate-50">
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={handleLocationSelected}
        initialLocation={userLocation}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/70 pt-10 pb-16 md:pt-16 md:pb-24">
        {/* Ambient Subtle Gradients */}
        <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-sky-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-orange-100/40 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10"
          >
            {/* Trust Pill */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 px-3.5 py-1.5 text-xs font-semibold text-[#0284C7] shadow-xs">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0EA5E9] text-white">
                <CheckCircle2 className="w-3 h-3" />
              </span>
              <span>Trusted Doorstep Home Services</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.8rem] font-extrabold leading-[1.1] tracking-tight text-[#0F1D33]">
              Your Home Fixed by{' '}
              <span className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] bg-clip-text text-transparent">
                Verified Experts
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed">
              Book skilled electricians, plumbers, appliance technicians, and cleaning specialists with transparent pricing and instant booking confirmation.
            </p>

            {/* Omni Search Box */}
            <div ref={searchContainerRef} className="relative mt-8 max-w-xl">
              <form
                onSubmit={handleSearch}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-slate-300 transition-all"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-1">
                  <Search className="w-5 h-5 text-[#0EA5E9] shrink-0" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    placeholder="Search services (e.g. AC Repair, Electrician)..."
                    aria-label="Search home services"
                    className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                      className="text-slate-400 hover:text-slate-600 p-1"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF7A1A] hover:bg-[#EA580C] px-6 py-3 font-semibold text-white text-sm shadow-sm transition hover:shadow focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/40 shrink-0"
                >
                  <span>Find Pros</span>
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
                    className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden z-50 py-2 text-left"
                  >
                    {suggestions.length > 0 ? (
                      <div>
                        <div className="px-4 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Services Available</span>
                          <span className="text-[10px] text-slate-400 font-normal">{suggestions.length} found</span>
                        </div>
                        {suggestions.map((svc) => (
                          <button
                            key={svc.id || svc._id}
                            type="button"
                            onClick={() => {
                              setShowSuggestions(false);
                              navigate(`/services/${svc.id || svc._id}`);
                            }}
                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center shrink-0">
                                <Search className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-[#0284C7] transition-colors">
                                  {svc.name}
                                </p>
                                <p className="text-xs text-slate-400 capitalize">{svc.category}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <span className="text-sm font-bold text-slate-900 font-mono">
                                ₹{svc.price || svc.fixedPrice || svc.basePrice || 0}
                              </span>
                              <span className="block text-[10px] text-slate-400 font-medium">onwards</span>
                            </div>
                          </button>
                        ))}
                        <div className="border-t border-slate-100 mt-1 pt-1">
                          <button
                            type="button"
                            onClick={handleSearch}
                            className="w-full px-4 py-2.5 text-xs font-semibold text-[#0284C7] hover:bg-sky-50 text-left flex items-center justify-between"
                          >
                            <span>View all results for &ldquo;{searchQuery}&rdquo;</span>
                            <span className="font-bold">Explore &rarr;</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-5 text-center">
                        <p className="text-sm text-slate-600 font-medium">No direct match for &ldquo;{searchQuery}&rdquo;</p>
                        <p className="text-xs text-slate-400 mt-1">Press Find Pros to view all available services</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Location Selector Pill */}
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 px-3.5 py-1.5 text-xs text-slate-700 transition"
              >
                <MapPin className="w-3.5 h-3.5 text-[#0EA5E9]" />
                <span className="font-medium truncate max-w-[240px]">
                  {userLocation?.address || 'Set your location to see nearby pros'}
                </span>
                <span className="font-bold text-[#0284C7] ml-1">
                  {userLocation ? 'Change' : 'Choose'}
                </span>
              </button>
            </div>

            {/* Micro Guarantees */}
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs sm:text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#0EA5E9]" />
                <span>Verified & Background Checked</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                <span>4.8/5 Avg Professional Rating</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>On-Time Arrival Guarantee</span>
              </span>
            </div>
          </motion.div>

          {/* Hero Visual Card Stack */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative mx-auto w-full max-w-[540px] lg:ml-auto"
          >
            <div className="relative aspect-[16/11] overflow-hidden rounded-3xl border border-slate-200/80 shadow-[0_20px_50px_rgba(15,23,42,0.12)] bg-gradient-to-tr from-slate-900 to-slate-800">
              <img
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80"
                alt="Professional Home Service"
                className="w-full h-full object-cover mix-blend-overlay opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F1D33]/90 via-[#0F1D33]/30 to-transparent" />

              {/* Top Floating Badge */}
              <div className="absolute left-5 top-5 rounded-2xl border border-white/40 bg-white/95 px-4 py-2.5 shadow-md backdrop-blur-md">
                <div className="flex items-center gap-1 text-amber-500">
                  {[0, 1, 2, 3, 4].map((star) => (
                    <Star key={star} className="w-3.5 h-3.5 fill-amber-400" />
                  ))}
                  <span className="ml-1 text-xs font-bold text-slate-900 font-mono">4.9/5</span>
                </div>
                <p className="text-[11px] font-semibold text-slate-600 mt-0.5">Over 10,000+ homes serviced</p>
              </div>

              {/* Bottom Card Overlay */}
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/20 bg-white/95 p-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#0284C7] flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-[#0EA5E9]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">Need a custom job done?</p>
                      <p className="text-xs text-slate-500 truncate">Post your custom request & receive quotes.</p>
                    </div>
                  </div>
                  <Link
                    to="/request-custom-service"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-bold transition shadow-xs shrink-0"
                  >
                    <span>Post Request</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Numerical Stats Banner */}
      <section className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-6 px-4 py-8 text-center sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { value: '15,000+', label: 'Happy Homeowners' },
            { value: '500+', label: 'Certified Pros' },
            { value: '98.5%', label: 'On-Time Completion' },
            { value: '4.9 ★', label: 'Customer Rating' },
          ].map((stat) => (
            <div key={stat.label} className="border-r last:border-0 border-slate-100">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#0F1D33] tracking-tight font-mono">{stat.value}</p>
              <p className="mt-1 text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Category Grid Section */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#0284C7]">Full Service Taxonomy</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#0F1D33] tracking-tight">
                Explore by Category
              </h2>
              <p className="mt-1 text-sm text-slate-500">Pick from our specialized home repair and maintenance divisions.</p>
            </div>
            <Link
              to="/services"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0284C7] hover:text-[#0369A1] transition group"
            >
              <span>See all services</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
            {categories.map(({ name, icon: Icon, color }) => (
              <Link
                key={name}
                to={`/services?category=${encodeURIComponent(name)}`}
                className="group flex flex-col sm:flex-row items-center sm:items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md text-center sm:text-left"
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${color} transition group-hover:scale-105`}>
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-800 group-hover:text-[#0284C7] transition-colors">
                    {name}
                  </span>
                  <span className="mt-1 flex items-center justify-center sm:justify-start gap-1 text-[11px] font-semibold text-slate-400">
                    <span>Explore</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Bookings (if logged in) */}
      {recentBookings.length > 0 && (
        <section className="bg-white py-12 border-y border-slate-200/70">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#0284C7]">Account Activity</p>
                <h2 className="mt-1 text-2xl font-extrabold text-[#0F1D33]">Recent Bookings</h2>
              </div>
              <Link to="/my-bookings" className="text-sm font-bold text-[#0284C7] hover:underline">
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
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#0284C7]">High-Demand Services</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#0F1D33] tracking-tight">
                Recommended Services
              </h2>
              <p className="mt-1 text-sm text-slate-500">Most booked repairs and maintenance packages in your area.</p>
            </div>
            <Link
              to="/services"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-[#0284C7] hover:text-[#0369A1] transition group"
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
              <p className="text-sm font-semibold text-slate-700">No services found in this location.</p>
              <p className="text-xs text-slate-400 mt-1">Try switching location or browsing all categories.</p>
              <Link
                to="/services"
                className="inline-block mt-4 px-4 py-2 bg-[#0EA5E9] text-white text-xs font-bold rounded-xl"
              >
                View Full Catalog
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {services.slice(0, 4).map((service, index) => (
                <ServiceCard key={service.id || service._id || index} service={service} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it Works / 3-Step Process */}
      <section className="py-16 sm:py-24 bg-slate-50 border-t border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0284C7]">Transparent Booking Process</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#0F1D33] tracking-tight">
              How HomeFix Works
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Three simple steps to book verified professionals at your convenience.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-8">
            {steps.map((step) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.number}
                  className="relative rounded-2xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-[#0284C7] border border-sky-100">
                      <StepIcon className="w-6 h-6 stroke-[1.8]" />
                    </span>
                    <span className="text-2xl font-extrabold text-slate-200 font-mono">{step.number}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-500">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* High-Conversion Bottom Banner */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl bg-[#0F1D33] px-6 py-12 sm:px-12 sm:py-16 text-white relative overflow-hidden shadow-xl">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#0EA5E9]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/10 text-sky-300 border border-white/10 uppercase tracking-wider">
                Instant Guarantee
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
                Ready to fix or upgrade your home?
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
                Connect with top-rated local technicians. Fair pricing, guaranteed service, and zero booking fee surprises.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A1A] hover:bg-[#EA580C] px-6 py-3.5 text-sm font-bold text-white shadow-md transition active:scale-98"
              >
                <span>Book a Service</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/help"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-5 py-3.5 text-sm font-bold text-slate-200 transition"
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
