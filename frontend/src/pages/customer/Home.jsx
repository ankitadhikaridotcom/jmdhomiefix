import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaArrowRight,
  FaBolt,
  FaBroom,
  FaCheck,
  FaFaucet,
  FaHammer,
  FaMapMarkerAlt,
  FaPaintRoller,
  FaSearch,
  FaShieldAlt,
  FaSnowflake,
  FaStar,
  FaWrench,
} from 'react-icons/fa';
import ServiceCard from '../../components/customer/ServiceCard';
import LocationModal from '../../components/common/LocationModal';
import { useAuth } from '../../context/AuthContext';

const categories = [
  { name: 'Cleaning', icon: FaBroom, color: 'bg-orange-50 text-orange-600' },
  { name: 'Plumbing', icon: FaFaucet, color: 'bg-sky-50 text-sky-600' },
  { name: 'Electrical', icon: FaBolt, color: 'bg-amber-50 text-amber-600' },
  { name: 'Painting', icon: FaPaintRoller, color: 'bg-violet-50 text-violet-600' },
  { name: 'Carpentry', icon: FaHammer, color: 'bg-emerald-50 text-emerald-700' },
  { name: 'Appliances', icon: FaSnowflake, color: 'bg-cyan-50 text-cyan-700' },
  { name: 'Pest Control', icon: FaShieldAlt, color: 'bg-rose-50 text-rose-600' },
  { name: 'Handyman', icon: FaWrench, color: 'bg-slate-100 text-slate-700' },
];

const steps = [
  { number: '01', title: 'Tell us what you need', description: 'Choose a service and share a few details about the job.' },
  { number: '02', title: 'Pick your pro', description: 'Compare trusted local professionals and find the right fit.' },
  { number: '03', title: 'Relax, it’s handled', description: 'Book a time that works for you and let the expert take it from here.' },
];

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState([]);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

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

  const fetchDefaultServices = () => {
    fetch('http://localhost:5000/api/services')
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.services) setServices(data.services);
      })
      .catch(console.error);
  };

  const fetchNearbyServices = (latitude, longitude) => {
    fetch(`http://localhost:5000/api/providers/nearby?lat=${latitude}&lng=${longitude}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.services?.length) {
          setServices(data.services);
        } else {
          fetchDefaultServices();
        }
      })
      .catch(() => fetchDefaultServices());
  };

  const handleSearch = (event) => {
    event.preventDefault();
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
    <div className="home-page">
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={handleLocationSelected}
        initialLocation={userLocation}
      />

      <section className="relative overflow-hidden bg-[#f7f8f4]">
        <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -top-20 h-96 w-96 rounded-full bg-orange-100/70 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:px-10 lg:pb-24 lg:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="relative z-10"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-sm sm:text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <FaCheck className="text-[9px]" />
              </span>
              Home care you can feel good about
            </div>

            <h1 className="max-w-2xl text-5xl font-extrabold leading-[1.05] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[4.35rem]">
              Your home,
              <br />
              <span className="text-emerald-700">in good hands.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Find trusted local pros for the jobs that make a house feel like home. Easy to book, lovely to work with.
            </p>

            <form onSubmit={handleSearch} className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_14px_45px_-22px_rgba(15,23,42,0.28)] sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
                <FaSearch className="shrink-0 text-emerald-700" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="What can we help with?"
                  aria-label="Search home services"
                  className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
                />
              </div>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-6 py-3 font-semibold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2">
                Explore services <FaArrowRight className="text-xs" />
              </button>
            </form>

            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm text-slate-500 transition hover:text-emerald-800"
            >
              <FaMapMarkerAlt className="shrink-0 text-emerald-700" />
              <span className="truncate">{userLocation?.address || 'Set your location to find pros nearby'}</span>
              <span className="shrink-0 font-semibold text-emerald-800">{userLocation ? 'Change' : 'Set location'}</span>
            </button>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2"><FaShieldAlt className="text-emerald-700" /> Verified professionals</span>
              <span className="inline-flex items-center gap-2"><FaStar className="text-amber-500" /> Top-rated local experts</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="relative mx-auto w-full max-w-[560px] lg:ml-auto"
          >
            <div className="home-hero-photo relative aspect-[1.08/1] overflow-hidden rounded-[2rem] shadow-[0_35px_80px_-35px_rgba(15,23,42,0.45)] sm:aspect-[1.15/1]">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/5 to-transparent" />
              <div className="absolute left-5 top-5 rounded-2xl border border-white/60 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-md sm:left-7 sm:top-7">
                <div className="flex items-center gap-1 text-amber-500">
                  {[0, 1, 2, 3, 4].map((star) => <FaStar key={star} className="text-xs" />)}
                  <span className="ml-1 text-sm font-bold text-slate-900">4.9</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Loved by local homeowners</p>
              </div>
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/50 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:bottom-7 sm:left-7 sm:right-7 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg text-emerald-800">✦</div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">A little help goes a long way</p>
                      <p className="mt-1 text-xs text-slate-500">The right pro is just around the corner.</p>
                    </div>
                  </div>
                  <Link to="/services" aria-label="Browse all services" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white transition hover:bg-emerald-900">
                    <FaArrowRight className="text-sm" />
                  </Link>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -right-2 -z-10 h-28 w-28 rounded-full border-[18px] border-orange-200/70 sm:-right-5 sm:h-36 sm:w-36" />
          </motion.div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-7 px-5 py-8 text-center sm:px-8 md:grid-cols-4 lg:px-10">
          {[
            { value: '10k+', label: 'happy customers' },
            { value: '500+', label: 'local professionals' },
            { value: '25k+', label: 'jobs completed' },
            { value: '4.8/5', label: 'average rating' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">A better kind of to-do list</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">What needs fixing?</h2>
              <p className="mt-3 text-slate-500">Find the right hands for all the jobs around your home.</p>
            </div>
            <Link to="/services" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800 transition hover:text-emerald-950">
              See all services <FaArrowRight className="text-xs" />
            </Link>
          </div>
          <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {categories.map(({ name, icon: Icon, color }) => (
              <Link
                key={name}
                to={`/services?category=${encodeURIComponent(name)}`}
                className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#fbfcfa] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-100 hover:bg-white hover:shadow-lg sm:gap-4 sm:p-5"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${color} transition group-hover:scale-105`}>
                  <Icon />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-800">{name}</span>
                  <span className="mt-1 block text-xs text-slate-500">Find a pro <span aria-hidden="true">→</span></span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {services.length > 0 && (
        <section className="bg-[#f7f8f4] py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mb-9 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Popular near you</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Good work, great people.</h2>
              </div>
              <Link to="/services" className="hidden items-center gap-2 text-sm font-bold text-emerald-800 sm:inline-flex">
                Browse all <FaArrowRight className="text-xs" />
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {services.slice(0, 4).map((service, index) => (
                <ServiceCard key={service.id || service._id || index} service={service} index={index} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Simple from start to finish</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Home help, without the hassle.</h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
            {steps.map((step) => (
              <div key={step.number} className="relative rounded-2xl bg-[#f7f8f4] p-6 sm:p-8">
                <span className="text-sm font-extrabold tracking-[0.16em] text-emerald-700">{step.number}</span>
                <h3 className="mt-5 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 sm:pb-20 lg:px-10 lg:pb-24">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 overflow-hidden rounded-[2rem] bg-emerald-950 px-7 py-10 text-white sm:px-10 sm:py-12 lg:flex-row lg:items-center lg:px-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Your next project starts here</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Make home feel even more like home.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100/80">Browse services, find your person, and get that job off your mind.</p>
          </div>
          <Link to="/services" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-50">
            Find your pro <FaArrowRight className="text-xs" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
