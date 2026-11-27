import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MapPin,
  Navigation,
  ExternalLink,
  Calendar,
  Clock,
  IndianRupee,
  Phone,
  PhoneCall,
  User,
  Sparkles,
  Check,
  Loader2,
  ShieldCheck,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import LeafletMap from '../common/LeafletMap';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const buildFullAddress = (item, isCustom) => {
  if (isCustom) {
    const loc = item?.location || {};
    const parts = [
      loc.houseOrFlat,
      loc.address,
      loc.locality && !loc.address?.includes(loc.locality) ? loc.locality : '',
      loc.city && !loc.address?.includes(loc.city) ? loc.city : '',
      loc.state && !loc.address?.includes(loc.state) ? loc.state : '',
      loc.pincode && !loc.address?.includes(loc.pincode) ? loc.pincode : '',
      loc.landmark ? `Landmark: ${loc.landmark}` : '',
    ].filter(Boolean);
    return parts.join(', ') || 'Address not provided';
  }

  const d = item?.addressDetails || {};
  const base = d.formattedAddress || (typeof item?.address === 'string' ? item.address : '');
  const parts = [
    base || [d.street, d.locality, d.city, d.state, d.pincode].filter(Boolean).join(', '),
    d.landmark && !base?.includes(d.landmark) ? `Landmark: ${d.landmark}` : '',
  ].filter(Boolean);
  return parts.join(' · ') || 'Address not provided';
};

const getCoords = (item, isCustom) => {
  if (isCustom) {
    const lat = item?.location?.latitude ?? item?.location?.coordinates?.[1];
    const lng = item?.location?.longitude ?? item?.location?.coordinates?.[0];
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && (Number(lat) !== 0 || Number(lng) !== 0)) {
      return [Number(lat), Number(lng)];
    }
    return null;
  }

  const lat = item?.addressDetails?.latitude;
  const lng = item?.addressDetails?.longitude;
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && (Number(lat) !== 0 || Number(lng) !== 0)) {
    return [Number(lat), Number(lng)];
  }
  return null;
};

export default function ProviderRequestDetailModal({
  isOpen,
  onClose,
  item,
  type = 'custom', // 'custom' | 'booking'
  distanceKm = null,
  onUpdated,
  actions = null, // Optional JSX or render props for Accept/Decline/Quote/Complete
}) {
  const [requestingPhone, setRequestingPhone] = useState(false);
  const [phoneState, setPhoneState] = useState({
    status: 'none',
    phone: '',
  });

  useEffect(() => {
    if (!item) return;
    setPhoneState({
      status: item.phoneRequestStatus || (item.customerPhone ? 'shared' : 'none'),
      phone: item.customerPhone || '',
    });
  }, [item]);

  if (!isOpen || !item) return null;

  const isCustom = type === 'custom';
  const itemId = isCustom ? item._id : (item.id || item._id);
  const title = isCustom ? (item.serviceTitle || 'Custom Service') : (item.serviceName || 'Service Booking');
  const customerName = isCustom ? (item.customerName || item.customerId?.name || 'Customer') : (item.customerName || 'Customer');
  const fullAddress = buildFullAddress(item, isCustom);
  const coords = getCoords(item, isCustom);

  const mapsUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  const handleRequestPhone = async () => {
    if (!itemId) return;
    setRequestingPhone(true);
    try {
      const endpoint = isCustom
        ? `${API}/api/custom-requests/${itemId}/request-phone`
        : `${API}/api/bookings/${itemId}/request-phone`;
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        const nextStatus = data.phoneRequestStatus || 'requested';
        const nextPhone = data.customerPhone || '';
        setPhoneState({ status: nextStatus, phone: nextPhone });
        toast.success(
          nextStatus === 'shared'
            ? 'Customer phone number loaded!'
            : 'Phone number request sent to customer!'
        );
        if (onUpdated) onUpdated({ phoneRequestStatus: nextStatus, customerPhone: nextPhone });
      } else {
        toast.error(data.message || 'Failed to request phone number');
      }
    } catch {
      toast.error('Network error while requesting phone number');
    } finally {
      setRequestingPhone(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a1a18]/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#f7f5f0] border border-[#dedad0] shadow-2xl text-[#1a1a18]"
        >
          {/* Sticky Modal Header */}
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-[#1a1a18] text-[#f7f5f0] px-6 py-5 border-b border-[#2b2b28]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-[#b3261e] text-white text-[10px] font-bold uppercase tracking-wider">
                  {isCustom ? 'Custom Request' : `Booking #${item.id || ''}`}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[#ebe8df] text-[10px] font-bold uppercase tracking-wider">
                  {String(item.status || '').replace('_', ' ')}
                </span>
                {item.category && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[#ebe8df] text-[10px] font-bold">
                    {item.category}
                  </span>
                )}
                {item.isProfessionalBrief && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    <Sparkles className="w-3 h-3" /> Pro Brief
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold truncate">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#f7f5f0] transition shrink-0"
              aria-label="Close request details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* 1. Customer & Phone Request Card */}
            <div className="bg-white rounded-2xl border border-[#dedad0] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#ebe8df] text-[#1a1a18] flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6a675f]">Customer</p>
                  <p className="text-sm font-extrabold text-[#1a1a18] flex items-center gap-1.5">
                    <span>{customerName}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </p>
                  {phoneState.phone ? (
                    <p className="text-xs font-mono font-bold text-emerald-700 mt-0.5">{phoneState.phone}</p>
                  ) : (
                    <p className="text-[11px] text-[#6a675f] mt-0.5">
                      {phoneState.status === 'requested'
                        ? 'Phone request sent — awaiting customer confirmation'
                        : 'Phone number protected until requested & shared'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {phoneState.phone ? (
                  <a
                    href={`tel:${phoneState.phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call {phoneState.phone}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestPhone}
                    disabled={requestingPhone}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                      phoneState.status === 'requested'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                        : 'bg-[#1a1a18] hover:bg-[#2b2b28] text-white'
                    }`}
                  >
                    {requestingPhone ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PhoneCall className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {phoneState.status === 'requested' ? 'Requested (Resend)' : 'Request Phone Number'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. Full Address & Maps Navigation */}
            <div className="bg-white rounded-2xl border border-[#dedad0] overflow-hidden">
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#b3261e] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Full Service Address</span>
                      {distanceKm && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px]">
                          {distanceKm} km away
                        </span>
                      )}
                    </p>
                    <p className="text-sm font-bold text-[#1a1a18] mt-1.5 leading-relaxed">
                      {fullAddress}
                    </p>
                  </div>

                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#b3261e] hover:bg-[#9c2019] text-white text-xs font-bold shadow-xs transition shrink-0"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Open in Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {coords && (
                <div className="border-t border-[#ebe8df]">
                  <LeafletMap
                    center={coords}
                    markerPosition={coords}
                    interactive={false}
                    useCustomRedIcon={true}
                    height="200px"
                  />
                </div>
              )}
            </div>

            {/* 3. Amount & Pricing Breakdown */}
            <div className="bg-white rounded-2xl border border-[#dedad0] p-4 sm:p-5 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6a675f] flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-[#b3261e]" />
                <span>{isCustom ? 'Budget & Quote Details' : 'Amount & Billing Breakdown'}</span>
              </p>

              {isCustom ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6a675f]">Customer Budget</span>
                    <span className="font-extrabold font-mono text-[#1a1a18]">
                      {item.budget ? `₹${Number(item.budget).toLocaleString('en-IN')}` : 'Open for quote'}
                    </span>
                  </div>
                  {item.quoteId && (
                    <div className="pt-2 mt-2 border-t border-[#ebe8df] space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#6a675f]">Inspection / Visit Fee</span>
                        <span className="font-mono font-bold">₹{item.quoteId.inspectionFee || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6a675f]">Labour Charge</span>
                        <span className="font-mono font-bold">₹{item.quoteId.labourFee || 0}</span>
                      </div>
                      {item.quoteId.materialFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-[#6a675f]">Materials</span>
                          <span className="font-mono font-bold">₹{item.quoteId.materialFee}</span>
                        </div>
                      )}
                      {item.quoteId.additionalFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-[#6a675f]">Additional Charges</span>
                          <span className="font-mono font-bold">₹{item.quoteId.additionalFee}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-[#ebe8df] text-sm font-extrabold">
                        <span>Quoted Total</span>
                        <span className="font-mono text-emerald-700">₹{item.quoteId.totalAmount}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-xs sm:text-sm">
                  {item.visitCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#6a675f]">Visit / Inspection Fee</span>
                      <span className="font-mono font-bold">₹{item.visitCharge}</span>
                    </div>
                  )}
                  {item.labourCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#6a675f]">Service / Labour Charge</span>
                      <span className="font-mono font-bold">₹{item.labourCharge}</span>
                    </div>
                  )}
                  {item.materialCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#6a675f]">Materials</span>
                      <span className="font-mono font-bold">₹{item.materialCharge}</span>
                    </div>
                  )}
                  {item.platformFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#6a675f]">Platform Fee</span>
                      <span className="font-mono font-bold">₹{item.platformFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-[#ebe8df] text-base font-extrabold">
                    <span>Total Amount ({item.paymentMethod || 'cash'})</span>
                    <span className="font-mono text-emerald-700">
                      ₹{Number(item.finalTotal || item.total || item.initialPayment || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Schedule, Description & Photos */}
            <div className="bg-white rounded-2xl border border-[#dedad0] p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap gap-4 text-xs font-bold text-[#1a1a18]">
                <span className="inline-flex items-center gap-1.5 bg-[#f7f5f0] border border-[#dedad0] px-3 py-1.5 rounded-xl">
                  <Calendar className="w-3.5 h-3.5 text-[#b3261e]" /> {item.date}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-[#f7f5f0] border border-[#dedad0] px-3 py-1.5 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-[#b3261e]" /> {item.time}
                </span>
                {item.urgency && (
                  <span className="inline-flex items-center gap-1.5 bg-[#b3261e]/10 text-[#b3261e] px-3 py-1.5 rounded-xl uppercase">
                    {item.urgency.replace('_', ' ')}
                  </span>
                )}
                {item.materialPreference && (
                  <span className="inline-flex items-center gap-1.5 bg-[#f7f5f0] border border-[#dedad0] px-3 py-1.5 rounded-xl">
                    Materials: {item.materialPreference.replace('_', ' ')}
                  </span>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6a675f] flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#b3261e]" />
                  <span>Full Request Details</span>
                </p>
                <p className="text-sm text-[#4a4842] whitespace-pre-wrap leading-relaxed bg-[#f7f5f0]/70 border border-[#ebe8df] rounded-xl p-3.5">
                  {item.description || 'No additional notes provided by the customer.'}
                </p>
              </div>

              {Array.isArray(item.photos) && item.photos.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6a675f] mb-2">
                    Attached Photos ({item.photos.length})
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                    {item.photos.map((photo, idx) => (
                      <a
                        key={photo + idx}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-xl overflow-hidden border border-[#dedad0] block"
                      >
                        <img src={photo} alt={`Site attachment ${idx + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Optional Parent Action Buttons */}
            {actions && (
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                {actions}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
