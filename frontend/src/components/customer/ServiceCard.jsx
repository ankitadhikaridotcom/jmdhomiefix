import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

const PriceBadge = ({ service }) => {
  const pt = service.priceType;
  if (pt === 'fixed') {
    return (
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-[#1a1a18] font-mono">₹{service.fixedPrice || service.price}</span>
          <span className="text-[11px] font-semibold text-[#6a675f] uppercase tracking-wider">fixed</span>
        </div>
      </div>
    );
  }
  if (pt === 'inspection') {
    return (
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-[#1a1a18] font-mono">₹{service.inspectionFee || service.price}</span>
          <span className="text-[11px] font-semibold text-[#6a675f]">visit</span>
        </div>
        <div className="text-[10px] text-[#b3261e] font-medium leading-tight">Quote on inspection</div>
      </div>
    );
  }
  if (pt === 'hourly') {
    return (
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-[#1a1a18] font-mono">₹{service.visitFee || service.price}</span>
          <span className="text-[11px] font-semibold text-[#6a675f]">visit</span>
          {service.hourlyRate && (
            <span className="text-xs text-[#b3261e] font-semibold font-mono ml-0.5">+₹{service.hourlyRate}/h</span>
          )}
        </div>
      </div>
    );
  }
  // Fallback
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold text-[#1a1a18] font-mono">₹{service.price}</span>
        <span className="text-[11px] font-semibold text-[#6a675f]">onwards</span>
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
      className="bg-[#ebe8df] rounded-2xl border border-[#dedad0] shadow-[0_2px_8px_rgba(26,26,24,0.04)] hover:shadow-[0_12px_28px_rgba(26,26,24,0.08)] hover:border-[#b3261e]/40 transition-all duration-200 overflow-hidden group flex flex-col h-full"
    >
      {/* Image Container with 16:9 ratio feel */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#dedad0]">
        <img
          src={service.image}
          alt={service.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a18]/60 via-transparent to-transparent pointer-events-none" />

        {/* Category Pill */}
        <span className="absolute top-3 left-3 bg-[#f7f5f0]/95 backdrop-blur-xs text-[#1a1a18] text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xs border border-[#dedad0] capitalize">
          {service.category}
        </span>

        {/* Pro distance */}
        {service.distance !== undefined && (
          <span className="absolute bottom-3 left-3 bg-[#1a1a18]/80 backdrop-blur-xs text-[#f7f5f0] text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
            <MapPin className="w-3 h-3 text-[#b3261e]" />
            <span>{service.distance} km away</span>
          </span>
        )}

        {/* Popular / New Badge */}
        {service.popular ? (
          <span className="absolute top-3 right-3 bg-[#b3261e] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
            Popular
          </span>
        ) : service.isNew ? (
          <span className="absolute top-3 right-3 bg-[#1a1a18] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-[#b3261e]" />
            <span>New</span>
          </span>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-4 md:p-5 flex flex-col flex-1">
        <div className="flex-1">
          <h3 className="font-bold text-[#1a1a18] group-hover:text-[#b3261e] transition-colors line-clamp-1 text-base">
            {service.name}
          </h3>

          {service.provider?.name && (
            <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-[#1a1a18]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#b3261e]" />
              <span>Verified · {service.provider.name}</span>
            </div>
          )}

          <p className="text-xs md:text-sm text-[#6a675f] mt-1.5 line-clamp-2 leading-relaxed">
            {service.description}
          </p>
        </div>

        {/* Rating Row */}
        <div className="flex items-center gap-1.5 mt-3 pt-2">
          <div className="flex items-center gap-1 bg-[#f7f5f0] px-2 py-0.5 rounded-md border border-[#dedad0] text-[#1a1a18]">
            <Star className="w-3.5 h-3.5 fill-[#b3261e] text-[#b3261e]" />
            <span className="text-xs font-bold font-mono">{service.rating || '4.8'}</span>
          </div>
          <span className="text-xs text-[#6a675f]">({service.reviewCount || 42} reviews)</span>
        </div>

        {/* Pricing & CTA */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#dedad0] gap-2">
          <PriceBadge service={service} />
          <Link
            to={`/services/${service.id || service._id}`}
            className="inline-flex items-center gap-1.5 bg-[#b3261e] hover:bg-[#9c2019] text-white px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-150 hover:shadow shadow-xs active:scale-98"
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
