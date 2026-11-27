import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, Receipt, Check, X, Wrench, ShieldCheck, PhoneCall } from 'lucide-react';
import toast from 'react-hot-toast';

const statusBadgeStyles = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200/80',
  upcoming: 'bg-sky-50 text-sky-700 border-sky-200/80',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  ongoing: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  quote_sent: 'bg-purple-50 text-purple-700 border-purple-200/80',
  quote_approved: 'bg-teal-50 text-teal-700 border-teal-200/80',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200/80',
};

const statusLabels = {
  pending: 'Pending',
  upcoming: 'Upcoming',
  confirmed: 'Confirmed',
  ongoing: 'In Progress',
  quote_sent: 'Quote Received',
  quote_approved: 'Quote Approved',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const BookingCard = ({ booking, index = 0, onCancel, onReview, onQuoteResponse }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneShared, setPhoneShared] = useState(booking.phoneRequestStatus === 'shared');
  const [phoneRequested, setPhoneRequested] = useState(booking.phoneRequestStatus === 'requested');
  const [phoneInput, setPhoneInput] = useState('');

  const handleSharePhone = async () => {
    setIsProcessing(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/bookings/${booking.id || booking._id}/share-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(phoneInput.trim() ? { phone: phoneInput.trim() } : {}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPhoneShared(true);
      setPhoneRequested(false);
      toast.success('Phone number shared with provider!');
    } catch (err) {
      toast.error(err.message || 'Failed to share phone number');
    } finally {
      setIsProcessing(false);
    }
  };

  const addressText = typeof booking.address === 'string'
    ? booking.address.split(',')[0]
    : booking.address?.street || 'Address not provided';

  const handleQuoteResponse = async (action) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`http://localhost:5000/api/bookings/${booking.id || booking._id}/quote-response`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      toast.success(action === 'approve' ? 'Quote approved successfully!' : 'Quote rejected and booking cancelled.');
      if (onQuoteResponse) onQuoteResponse(data.booking);
    } catch (err) {
      toast.error(err.message || `Failed to ${action} quote`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Service Image or icon */}
        {booking.serviceImage ? (
          <img
            src={booking.serviceImage}
            alt={booking.serviceName}
            className="w-14 h-14 rounded-xl object-cover shrink-0 ring-1 ring-slate-100"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center shrink-0 border border-sky-100">
            <Wrench className="w-6 h-6 stroke-[1.8]" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span>{booking.serviceName}</span>
                {booking.pricingType === 'inspection' && (
                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    Inspection
                  </span>
                )}
                {booking.pricingType === 'hourly' && (
                  <span className="text-[10px] bg-sky-50 text-[#0284C7] border border-sky-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    Hourly
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Assigned pro: <strong className="text-slate-700 font-semibold">{booking.providerName}</strong></p>
            </div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
              statusBadgeStyles[booking.status] || 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {statusLabels[booking.status] || booking.status}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{booking.date}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{booking.time}</span>
            </span>
            <span className="flex items-center gap-1.5 truncate max-w-xs">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{addressText}</span>
            </span>
          </div>

          {/* Quote Section for Customers */}
          {phoneRequested && !phoneShared && (
            <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-amber-900 font-semibold">
                <PhoneCall className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Provider requested your phone number for this booking.</span>
              </div>
              <div className="flex items-center gap-2">
                {!booking.customerPhone && (
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="Phone number"
                    className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-900 outline-none w-32"
                  />
                )}
                <button
                  type="button"
                  onClick={handleSharePhone}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-lg bg-[#b3261e] hover:bg-[#9c2019] text-white text-xs font-bold transition"
                >
                  Share Phone
                </button>
              </div>
            </div>
          )}
          <AnimatePresence>
            {booking.status === 'quote_sent' && booking.quote && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 bg-purple-50 rounded-2xl border border-purple-200/80 overflow-hidden"
              >
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs mb-3">
                  <Receipt className="w-4 h-4 text-purple-700" />
                  <span>Provider Submitted Repair Quote</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700 mb-4 bg-white p-3 rounded-xl border border-purple-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Labour Charge</span>
                    <span className="font-semibold font-mono">₹{booking.quote.labourCharge}</span>
                  </div>
                  {booking.quote.partsCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Parts / Materials</span>
                      <span className="font-semibold font-mono">₹{booking.quote.partsCharge}</span>
                    </div>
                  )}
                  {booking.quote.additionalCharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Additional Charges</span>
                      <span className="font-semibold font-mono">₹{booking.quote.additionalCharge}</span>
                    </div>
                  )}
                  {booking.quote.description && (
                    <p className="text-[11px] text-slate-500 italic mt-1 pb-1">
                      &ldquo;{booking.quote.description}&rdquo;
                    </p>
                  )}
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold text-slate-900">
                    <span>Quote Total</span>
                    <span className="font-mono text-sm text-purple-900">₹{booking.quote.total}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleQuoteResponse('approve')}
                    disabled={isProcessing}
                    className="flex-1 bg-purple-700 hover:bg-purple-800 text-white py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Quote</span>
                  </button>
                  <button
                    onClick={() => handleQuoteResponse('reject')}
                    disabled={isProcessing}
                    className="flex-1 bg-white text-rose-600 border border-rose-200 py-2 px-3 rounded-xl text-xs font-bold hover:bg-rose-50 transition flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject & Cancel</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-slate-900 font-mono">
                ₹{booking.finalTotal || booking.initialPayment || booking.total}
              </span>
              {(booking.pricingType === 'inspection' || booking.pricingType === 'hourly') &&
                booking.status !== 'completed' &&
                booking.status !== 'quote_approved' && (
                  <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                    Paid Visit Fee
                  </span>
                )}
            </div>

            <span className="text-xs text-slate-300 ml-2">•</span>
            <span className="text-xs text-slate-500 ml-1 capitalize font-medium">{booking.paymentMethod}</span>

            <div className="flex items-center gap-2 ml-auto">
              {(booking.status === 'pending' || booking.status === 'upcoming' || booking.status === 'confirmed') && onCancel && (
                <button
                  onClick={() => onCancel(booking.id || booking._id)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-1.5 border border-rose-200 rounded-xl hover:bg-rose-50 transition"
                >
                  Cancel
                </button>
              )}
              {booking.status === 'completed' && booking.isReviewed && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Reviewed</span>
                </span>
              )}
              {booking.status === 'completed' && !booking.isReviewed && onReview && (
                <button
                  onClick={() => onReview(booking.id || booking._id)}
                  className="text-xs font-semibold text-[#FF7A1A] hover:text-[#EA580C] px-3 py-1.5 border border-[#FF7A1A]/40 rounded-xl hover:bg-orange-50 transition"
                >
                  Write Review
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BookingCard;
