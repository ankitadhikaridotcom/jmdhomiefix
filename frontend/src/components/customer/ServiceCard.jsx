import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

const PriceBadge = ({ service }) => {
  const pt = service.priceType;
  if (pt === 'fixed') {
    return (
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-slate-900 font-mono">₹{service.fixedPrice || service.price}</span>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">fixed</span>
        </div>
      </div>
    );
  }
  if (pt === 'inspection') {
    return (
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-slate-900 font-mono">₹{service.inspectionFee || service.price}</span>
          <span className="text-[11px] font-semibold text-slate-400">visit</span>
        </div>
        <div className="text-[10px] text-amber-600 font-medium leading-tight">Quote on inspection</div>
      </div>
    );
  }
  if (pt === 'hourly') {
    return (
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-slate-900 font-mono">₹{service.visitFee || service.price}</span>
          <span className="text-[11px] font-semibold text-slate-400">visit</span>
          {service.hourlyRate && (
            <span className="text-xs text-[#0284C7] font-semibold font-mono ml-0.5">+₹{service.hourlyRate}/h</span>
          )}
        </div>
      </div>
    );
  }
  // Fallback
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold text-slate-900 font-mono">₹{service.price}</span>
        <span className="text-[11px] font-semibold text-slate-400">onwards</span>
      </div>
    </div>
  );
};

const ServiceCard = ({ service, index = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] hover:border-slate-300 transition-all duration-200 overflow-hidden group flex flex-col h-full"
    >
      {/* Image Container with 16:9 ratio feel */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={service.image}
          alt={service.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

        {/* Category Pill */}
        <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xs border border-slate-200/60 capitalize">
          {service.category}
        </span>

        {/* Pro distance */}
        {service.distance !== undefined && (
          <span className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
            <MapPin className="w-3 h-3 text-[#0EA5E9]" />
            <span>{service.distance} km away</span>
          </span>
        )}

        {/* Popular / New Badge */}
        {service.popular ? (
          <span className="absolute top-3 right-3 bg-[#FF7A1A] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
            Popular
          </span>
        ) : service.isNew ? (
          <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            <span>New</span>
          </span>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-4 md:p-5 flex flex-col flex-1">
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 group-hover:text-[#0284C7] transition-colors line-clamp-1 text-base">
            {service.name}
          </h3>

          {service.provider?.name && (
            <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified · {service.provider.name}</span>
            </div>
          )}

          <p className="text-xs md:text-sm text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
            {service.description}
          </p>
        </div>

        {/* Rating Row */}
        <div className="flex items-center gap-1.5 mt-3 pt-2">
          <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 text-amber-700">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold font-mono">{service.rating || '4.8'}</span>
          </div>
          <span className="text-xs text-slate-400">({service.reviewCount || 42} reviews)</span>
        </div>

        {/* Pricing & CTA */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 gap-2">
          <PriceBadge service={service} />
          <Link
            to={`/services/${service.id || service._id}`}
            className="inline-flex items-center gap-1.5 bg-[#FF7A1A] hover:bg-[#EA580C] text-white px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-150 hover:shadow shadow-xs active:scale-98"
          >
            <span>Book Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
