import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  X,
  MapPin,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import ServiceCard from '../../components/customer/ServiceCard';
import LocationModal from '../../components/common/LocationModal';
import { useAuth } from '../../context/AuthContext';
import { ServiceCardSkeleton } from '../../components/common/ui/Skeleton';
import EmptyState from '../../components/common/ui/EmptyState';

const defaultCategories = [
  'Home Cleaning', 'Plumber', 'Electrician', 'Painting', 'Carpenter', 'Appliance Repair', 'AC Repair', 'Pest Control', 'Salon at Home'
];

const Services = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [categoriesList, setCategoriesList] = useState(defaultCategories);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState('popular');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const perPage = 9;

  // Load real active categories
  useEffect(() => {
    fetch('http://localhost:5000/api/service-categories')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.categories)) {
          const names = data.categories
            .map(c => c.name)
            .filter(n => !n.startsWith('QA Category'));
          if (names.length > 0) setCategoriesList(names);
        }
      })
      .catch(console.error);
  }, []);

  // Sync state whenever URL searchParams change
  useEffect(() => {
    const qSearch = searchParams.get('search') || '';
    const qCat = searchParams.get('category') || '';
    setSearch(qSearch);
    setSelectedCategory(qCat);
  }, [searchParams]);

  useEffect(() => {
    if (user?.address?.latitude && user?.address?.longitude) {
      setUserLocation({
        latitude: user.address.latitude,
        longitude: user.address.longitude,
        address: user.address.formattedAddress || `${user.address.city || ''}, ${user.address.state || ''}`,
      });
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      let endpoint = '';
      if (userLocation?.latitude && userLocation?.longitude) {
        endpoint = `http://localhost:5000/api/providers/nearby?lat=${userLocation.latitude}&lng=${userLocation.longitude}`;
        if (selectedCategory) endpoint += `&category=${encodeURIComponent(selectedCategory)}`;
        if (search) endpoint += `&search=${encodeURIComponent(search)}`;
      } else {
        const queryParams = new URLSearchParams();
        if (selectedCategory) queryParams.append('category', selectedCategory);
        if (search) queryParams.append('search', search);
        if (sortBy) queryParams.append('sort', sortBy);
        endpoint = `http://localhost:5000/api/services?${queryParams.toString()}`;
      }

      fetch(endpoint)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.services) {
            setFilteredServices(data.services);
            setCurrentPage(1);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [search, selectedCategory, sortBy, userLocation]);

  const handleSearchChange = (val) => {
    setSearch(val);
    const newParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      newParams.set('search', val.trim());
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleCategorySelect = (cat) => {
    const nextCat = selectedCategory === cat ? '' : cat;
    setSelectedCategory(nextCat);
    const newParams = new URLSearchParams(searchParams);
    if (nextCat) {
      newParams.set('category', nextCat);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSearchParams({}, { replace: true });
  };

  const totalPages = Math.ceil(filteredServices.length / perPage);
  const paginated = filteredServices.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-12">
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={(loc) => setUserLocation(loc)}
        initialLocation={userLocation}
      />

      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F1D33] tracking-tight">
                All Home Services
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                {loading ? (
                  'Discovering verified professionals...'
                ) : (
                  <>
                    <span className="font-semibold text-slate-800">{filteredServices.length}</span>{' '}
                    service{filteredServices.length === 1 ? '' : 's'} available
                    {search && (
                      <span className="font-semibold text-[#0284C7]"> matching &ldquo;{search}&rdquo;</span>
                    )}
                  </>
                )}
              </p>
            </div>

            {/* Location Pill */}
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="bg-sky-50 hover:bg-sky-100 text-[#0284C7] text-xs font-bold px-3.5 py-2 rounded-xl border border-sky-200 flex items-center gap-2 self-start sm:self-auto transition shadow-xs"
            >
              <MapPin className="w-3.5 h-3.5 text-[#0EA5E9]" />
              <span className="max-w-[200px] truncate">
                {userLocation?.address || 'Set Location for Local Feed'}
              </span>
            </button>
          </motion.div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search services (e.g. Electrician, AC Repair, Cleaning)..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 outline-none transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-700 outline-none focus:border-[#0EA5E9] focus:ring-2 focus:ring-[#0EA5E9]/20 transition cursor-pointer"
              >
                <option value="popular">Sort: Most Popular</option>
                <option value="newest">Sort: Newly Added</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>

              {(search || selectedCategory) && (
                <button
                  onClick={handleClearFilters}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition shrink-0"
                  title="Clear all filters"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Horizontal Filter Strip */}
      <div className="bg-white border-b border-slate-200/80 sticky top-16 md:top-18 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleCategorySelect('')}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-150 ${
                !selectedCategory
                  ? 'bg-[#0F1D33] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {categoriesList.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                  selectedCategory === cat
                    ? 'bg-[#0EA5E9] text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Services Grid Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        ) : paginated.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((service, i) => (
                <ServiceCard key={service.id || service._id || i} service={service} index={i} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-9 h-9 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      currentPage === i + 1
                        ? 'bg-[#0EA5E9] text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={Search}
            title="No services match your filters"
            description={
              search || selectedCategory
                ? `We couldn't find any service matching "${search || selectedCategory}". Try clearing your filters or choosing another category.`
                : 'There are currently no services available in this area.'
            }
            actionLabel="Reset All Filters"
            onAction={handleClearFilters}
          />
        )}
      </div>
    </div>
  );
};

export default Services;
