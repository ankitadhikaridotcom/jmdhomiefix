import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star,
  Check,
  X,
  ArrowLeft,
  ShieldCheck,
  Clock,
  Tag,
  Info,
  Search,
  User as UserIcon,
  Sparkles,
  Lock,
  ArrowRight,
  AlertCircle,
  MapPin
} from 'lucide-react';
import { ServiceCardSkeleton } from '../../components/common/ui/Skeleton';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/services/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.service) setService(data.service);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="animate-pulse bg-slate-200 h-72 w-full rounded-2xl" />
            <div className="animate-pulse bg-slate-200 h-8 w-1/2 rounded-xl" />
            <div className="animate-pulse bg-slate-200 h-24 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="animate-pulse bg-slate-200 h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-sm bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Service not found</h2>
          <p className="text-xs text-slate-500 mb-6">The service requested might have been removed or is temporarily unavailable.</p>
          <Link
            to="/services"
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-sm shadow-xs transition"
          >
            <span>Browse All Services</span>
          </Link>
        </div>
      </div>
    );
  }

  const providerInfo = service.provider || null;
  const pt = service.priceType || service.pricingType;
  const serviceHighlights = Array.isArray(service.highlights) && service.highlights.length > 0
    ? service.highlights
    : [
      '100% Background-Verified Professional',
      'Upfront & Transparent Costing',
      'Safe & Contactless Payment',
      'Post-Service Warranty & Support',
    ];
  const serviceLocationText = service.address?.formattedAddress
    || [service.address?.locality, service.address?.city, service.address?.state, service.address?.pincode]
      .filter(Boolean)
      .join(', ');

  const handleBooking = () => {
    if (providerInfo) {
      navigate(`/booking?serviceId=${service.id || service._id}&providerId=${providerInfo.id || providerInfo._id}`);
    }
  };

  // Pricing info bar text
  const pricingLabel = pt === 'fixed' ? 'Fixed price package'
    : pt === 'inspection' ? 'Quote after inspection'
    : pt === 'hourly' ? 'Hourly rate service' : 'Estimated price';

  const pricingIcon = pt === 'fixed' ? <Tag className="w-4 h-4 text-[#0EA5E9]" />
    : pt === 'inspection' ? <Search className="w-4 h-4 text-amber-500" />
    : <Clock className="w-4 h-4 text-[#0EA5E9]" />;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Breadcrumb / Back button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Services</span>
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Hero Image & Service Info */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-md aspect-[16/9]"
            >
              <img
                src={service.image || '/deep-home-cleaning.jpg'}
                alt={service.name}
                onError={(e) => {
                  if (!e.currentTarget.dataset.fallbackApplied) {
                    e.currentTarget.dataset.fallbackApplied = '1';
                    e.currentTarget.src = '/deep-home-cleaning.jpg';
                  }
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-block bg-[#0EA5E9] text-white text-xs font-bold px-3 py-1 rounded-lg shadow-xs uppercase tracking-wider">
                    {service.category}
                  </span>
                  {service.serviceKind && (
                    <span className="inline-block bg-white/90 text-slate-900 text-xs font-bold px-3 py-1 rounded-lg shadow-xs">
                      {service.serviceKind}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                  {service.name}
                </h1>
              </div>
            </motion.div>

            {/* Quick Spec Strip */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700">
                {pricingIcon}
                {pt === 'fixed' && <span>₹{service.fixedPrice || service.price} fixed</span>}
                {pt === 'inspection' && <span>Visit fee from ₹{service.inspectionFee || service.price}</span>}
                {pt === 'hourly' && <span>₹{service.visitFee || service.price} visit + ₹{service.hourlyRate}/h</span>}
              </div>
              <span className="text-slate-200">|</span>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600">
                <Info className="w-4 h-4 text-slate-400" />
                <span>{pricingLabel}</span>
              </div>
              {service.estimatedDuration && (
                <>
                  <span className="text-slate-200">|</span>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-[#0EA5E9]" />
                    <span>{service.estimatedDuration}</span>
                  </div>
                </>
              )}
              {providerInfo && (
                <>
                  <span className="text-slate-200">|</span>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Verified Pro: {providerInfo.name}</span>
                  </div>
                </>
              )}
            </div>

            {/* Description Card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs"
            >
              <h2 className="text-lg font-bold text-slate-900 mb-3">Service Details</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {service.description ||
                  'Professional home service delivered by certified and background-verified technicians. Our team guarantees punctual arrival, genuine spare parts when applicable, and full service warranty.'}
              </p>

              {/* Quality / Highlights Checklist */}
              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {serviceHighlights.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Service Location & Coverage Card */}
            {(serviceLocationText || service.serviceAreas?.length > 0 || service.address?.pincode) && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs"
              >
                <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0EA5E9]" />
                  <span>Service Area & Coverage</span>
                </h2>
                <div className="space-y-2 text-sm text-slate-600">
                  {serviceLocationText && (
                    <p>
                      <span className="font-semibold text-slate-800">Base Address:</span> {serviceLocationText}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs pt-1">
                    {service.address?.pincode && (
                      <span className="bg-slate-100 text-slate-700 font-mono font-semibold px-2.5 py-1 rounded-lg">
                        PIN: {service.address.pincode}
                      </span>
                    )}
                    {service.serviceRadius && (
                      <span className="bg-sky-50 text-[#0284C7] font-semibold px-2.5 py-1 rounded-lg">
                        Covers up to {service.serviceRadius} km
                      </span>
                    )}
                  </div>
                  {service.serviceAreas?.length > 0 && (
                    <p className="text-xs text-slate-500 pt-1">
                      <span className="font-semibold text-slate-700">Localities:</span> {service.serviceAreas.join(', ')}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Provider Credentials Card */}
            {providerInfo && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs"
              >
                <h2 className="text-base font-bold text-slate-900 mb-4">Assigned Service Professional</h2>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 text-[#0284C7] flex items-center justify-center font-bold text-lg shrink-0">
                    {providerInfo.name?.charAt(0) || <UserIcon className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{providerInfo.name}</h3>
                    <p className="text-xs text-slate-500">Certified Professional Partner</p>
                  </div>
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Sticky Price & Booking Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-md sticky top-24"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">Order Breakdown</h3>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0284C7] bg-sky-50 px-2 py-0.5 rounded-md">
                  Transparent
                </span>
              </div>

              {pt === 'fixed' && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Service Price</span>
                    <span className="font-semibold text-slate-900 font-mono">₹{service.fixedPrice || service.price}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Platform Convenience Fee (3%)</span>
                    <span className="font-semibold text-slate-900 font-mono">₹{Math.round((service.fixedPrice || service.price) * 0.03)}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-slate-900">Total Payable</span>
                    <span className="font-extrabold text-[#0284C7] text-xl font-mono">
                      ₹{(service.fixedPrice || service.price) + Math.round((service.fixedPrice || service.price) * 0.03)}
                    </span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-3 rounded-xl mt-2 font-medium flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Fixed pricing guaranteed. No unexpected surge fees.</span>
                  </div>
                </div>
              )}

              {pt === 'inspection' && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Visit & Inspection Charge</span>
                    <span className="font-semibold text-slate-900 font-mono">₹{service.inspectionFee || service.price}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Platform Fee (3%)</span>
                    <span className="font-semibold text-slate-900 font-mono">₹{Math.round((service.inspectionFee || service.price) * 0.03)}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-slate-900">Pay at Booking</span>
                    <span className="font-extrabold text-[#0284C7] text-xl font-mono">
                      ₹{(service.inspectionFee || service.price) + Math.round((service.inspectionFee || service.price) * 0.03)}
                    </span>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs p-3 rounded-xl mt-2 font-medium leading-relaxed">
                    Provider inspects on-site and provides an itemized quote. You approve before work starts.
                  </div>
                </div>
              )}

              {pt === 'hourly' && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Visit Fee</span>
                    <span className="font-semibold text-slate-900 font-mono">₹{service.visitFee || service.price}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Hourly Rate</span>
                    <span className="font-semibold text-slate-900 font-mono">₹{service.hourlyRate}/h</span>
                  </div>
                  <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-slate-900">Initial Deposit</span>
                    <span className="font-extrabold text-[#0284C7] text-xl font-mono">
                      ₹{(service.visitFee || service.price) + Math.round((service.visitFee || service.price) * 0.03)}
                    </span>
                  </div>
                  <div className="bg-sky-50 border border-sky-100 text-[#0284C7] text-xs p-3 rounded-xl mt-2 font-medium leading-relaxed">
                    Final invoice calculated based on actual logged hours upon job completion.
                  </div>
                </div>
              )}

              {/* Primary Conversion CTA */}
              <button
                onClick={handleBooking}
                disabled={!providerInfo}
                className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#FF7A1A] hover:bg-[#EA580C] text-white font-bold text-sm shadow-sm transition hover:shadow focus:ring-2 focus:ring-[#FF7A1A]/40 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{providerInfo ? 'Proceed to Booking' : 'No Provider Currently Available'}</span>
                {providerInfo && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="flex items-center gap-1.5 mt-4 text-[11px] text-slate-400 justify-center font-medium">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>256-Bit Encrypted Secure Checkout</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;
