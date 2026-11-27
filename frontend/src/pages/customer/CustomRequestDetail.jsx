import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  Calendar,
  Clock,
  IndianRupee,
  Check,
  X,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  User as UserIcon,
  Search,
  PhoneCall
} from 'lucide-react';
import toast from 'react-hot-toast';
import LeafletMap from '../../components/common/LeafletMap';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CustomRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

  useEffect(() => {
    fetchDetail();
    const timer = setInterval(fetchDetail, 10000);
    return () => clearInterval(timer);
  }, [id]);

  const fetchDetail = async () => {
    try {
      const res = await fetch(`${API}/api/custom-requests/${id}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.request) {
        setRequest(data.request);
      } else if (loading) {
        toast.error(data.message || 'Request not found');
      }
    } catch {
      if (loading) toast.error('Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProvider = async (providerId) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API}/api/custom-requests/${id}/select-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Provider selected! Waiting for their quote.');
        fetchDetail();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setProcessing(false);
    }
  };

  const handleQuoteResponse = async (action) => {
    setProcessing(true);
    try {
      const res = await fetch(`${API}/api/custom-requests/${id}/quote-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, paymentMethod: 'card' }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'accept') {
          toast.success('Quote accepted and booking confirmed!');
          navigate('/my-bookings');
        } else {
          toast.success('Quote rejected.');
          fetchDetail();
        }
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelRequest = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`${API}/api/custom-requests/${id}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Custom request cancelled.');
        fetchDetail();
      } else {
        toast.error(data.message || 'Could not cancel request');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setProcessing(false);
    }
  };

  const handleSharePhone = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`${API}/api/custom-requests/${id}/share-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(phoneInput.trim() ? { phone: phoneInput.trim() } : {}),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Phone number shared with provider!');
        fetchDetail();
      } else {
        toast.error(data.message || 'Could not share phone number');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center text-sm font-semibold text-[#6a675f]">
        Loading request details...
      </div>
    );
  }
  if (!request) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-bold text-[#1a1a18]">Request not found</p>
        <Link to="/my-custom-requests" className="mt-3 text-sm font-bold text-[#b3261e] hover:underline">
          Back to My Custom Requests
        </Link>
      </div>
    );
  }

  const lat = request.location?.latitude ?? request.location?.coordinates?.[1];
  const lng = request.location?.longitude ?? request.location?.coordinates?.[0];

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#1a1a18] py-8 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/my-custom-requests"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#6a675f] hover:text-[#1a1a18] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>My Custom Requests</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="bg-white border border-[#dedad0] text-[#1a1a18] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
              {request.status.replace('_', ' ')}
            </span>
            {['PENDING', 'PROVIDER_SELECTED'].includes(request.status) && (
              <button
                type="button"
                onClick={handleCancelRequest}
                disabled={processing}
                className="px-3 py-1 rounded-full text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition"
              >
                Cancel Request
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xs border border-[#dedad0] overflow-hidden">
          <div className="p-6 border-b border-[#ebe8df]">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {request.category && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#f7f5f0] border border-[#dedad0] text-[11px] font-bold text-[#1a1a18]">
                  {request.category}
                </span>
              )}
              {request.urgency && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#b3261e]/10 text-[11px] font-bold text-[#b3261e] uppercase">
                  {request.urgency.replace('_', ' ')}
                </span>
              )}
              {request.isProfessionalBrief && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
                  <Sparkles className="w-3 h-3" /> Professional Brief
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-[#1a1a18]">
              {request.serviceTitle || 'Custom Service'}
            </h1>
            <p className="text-[#4a4842] mt-3 whitespace-pre-wrap text-sm leading-relaxed">
              {request.description}
            </p>

            {Array.isArray(request.photos) && request.photos.length > 0 && (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {request.photos.map((photo, idx) => (
                  <a
                    key={photo + idx}
                    href={photo}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl overflow-hidden border border-[#dedad0] aspect-square bg-[#ebe8df]"
                  >
                    <img src={photo} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-[#f7f5f0]/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#6a675f] block mb-1">Schedule</span>
              <span className="font-bold text-[#1a1a18] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#b3261e]" /> {request.date}
                <Clock className="w-4 h-4 text-[#6a675f] ml-1" /> {request.time}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#6a675f] block mb-1">Service Location</span>
              <span className="font-bold text-[#1a1a18] flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-[#b3261e] shrink-0 mt-0.5" />
                <span>
                  {[request.location?.houseOrFlat, request.location?.address, request.location?.landmark ? `Near ${request.location.landmark}` : '']
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </span>
            </div>
            {request.budget && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#6a675f] block mb-1">Target Budget</span>
                <span className="font-extrabold text-emerald-700 font-mono flex items-center gap-1">
                  <IndianRupee className="w-4 h-4" /> {request.budget}
                </span>
              </div>
            )}
          </div>

          {lat && lng && (
            <div className="border-t border-[#ebe8df]">
              <LeafletMap
                center={[lat, lng]}
                markerPosition={[lat, lng]}
                interactive={false}
                useCustomRedIcon={true}
                height="200px"
              />
            </div>
          )}
        </div>

        {/* Phone Number Request Banner */}
        {request.phoneRequestStatus === 'requested' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-amber-950">Provider requested your phone number</h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Share your contact number so the service provider can call to coordinate details.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!request.customerPhone && (
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="Enter phone (if not saved)"
                  className="px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs text-[#1a1a18] outline-none"
                />
              )}
              <button
                type="button"
                onClick={handleSharePhone}
                disabled={processing}
                className="px-4 py-2.5 rounded-xl bg-[#b3261e] hover:bg-[#9c2019] text-white text-xs font-bold transition shrink-0"
              >
                Share Phone Number
              </button>
            </div>
          </div>
        )}

        {request.phoneRequestStatus === 'shared' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-xs font-bold text-emerald-800">
            <PhoneCall className="w-4 h-4 text-emerald-600" />
            <span>Your phone number ({request.customerPhone || 'saved number'}) is shared with the provider.</span>
          </div>
        )}

        {/* Phase 1: PENDING - Show accepted providers */}
        {request.status === 'PENDING' && request.acceptedProviders && request.acceptedProviders.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-extrabold text-[#1a1a18]">
              Nearby Providers Who Accepted ({request.acceptedProviders.length})
            </h3>
            {request.acceptedProviders.map((provider) => (
              <motion.div
                key={provider._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-5 rounded-2xl border border-[#dedad0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  {provider.profileImage ? (
                    <img src={provider.profileImage} alt={provider.name} className="w-12 h-12 rounded-2xl object-cover border border-[#dedad0]" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-[#ebe8df] text-[#1a1a18] flex items-center justify-center">
                      <UserIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-[#1a1a18] flex items-center gap-1.5">
                      <span>{provider.name}</span>
                      <ShieldCheck className="text-emerald-600 w-4 h-4" />
                    </h4>
                    <p className="text-xs text-[#6a675f] mt-0.5">
                      {provider.profession || 'Verified Professional'}
                      {provider.experience ? ` · ${provider.experience} yrs exp` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleSelectProvider(provider._id)}
                  disabled={processing}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#b3261e] hover:bg-[#9c2019] text-white text-sm font-bold transition shadow-xs"
                >
                  Select &amp; Request Quote
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {request.status === 'PENDING' && (!request.acceptedProviders || request.acceptedProviders.length === 0) && (
          <div className="text-center p-8 bg-white rounded-3xl border border-[#dedad0] border-dashed">
            <div className="w-12 h-12 rounded-2xl bg-[#b3261e]/10 text-[#b3261e] flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#1a1a18]">Waiting for nearby providers to respond...</h3>
            <p className="text-sm text-[#6a675f] mt-1">
              Nearby verified providers have been notified and can accept or decline your request. This page updates automatically.
            </p>
          </div>
        )}

        {/* Phase 2: PROVIDER_SELECTED - Waiting for quote */}
        {request.status === 'PROVIDER_SELECTED' && request.selectedProviderId && (
          <div className="text-center p-8 bg-white rounded-3xl border border-[#dedad0]">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#1a1a18]">Waiting for Quote</h3>
            <p className="text-sm text-[#6a675f] mt-1">
              You selected <b>{request.selectedProviderId.name}</b>. They are preparing your itemized quote.
            </p>
          </div>
        )}

        {/* Phase 3: QUOTE_SENT - Accept/Reject */}
        {request.status === 'QUOTE_SENT' && request.quoteId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 border-2 border-[#b3261e]/30 shadow-sm"
          >
            <h3 className="text-lg font-extrabold text-[#1a1a18] flex items-center gap-2 mb-4">
              <IndianRupee className="w-5 h-5 text-[#b3261e]" />
              <span>Provider Sent You an Itemized Quote</span>
            </h3>

            <div className="bg-[#f7f5f0] rounded-2xl p-4 space-y-3 text-sm text-[#1a1a18] border border-[#ebe8df] mb-6">
              <div className="flex justify-between">
                <span>Inspection / Visit Fee</span>
                <span className="font-bold font-mono">₹{request.quoteId.inspectionFee || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Labour Charges</span>
                <span className="font-bold font-mono">₹{request.quoteId.labourFee || 0}</span>
              </div>
              {request.quoteId.materialFee > 0 && (
                <div className="flex justify-between">
                  <span>Materials</span>
                  <span className="font-bold font-mono">₹{request.quoteId.materialFee}</span>
                </div>
              )}
              {request.quoteId.additionalFee > 0 && (
                <div className="flex justify-between">
                  <span>Additional Charges</span>
                  <span className="font-bold font-mono">₹{request.quoteId.additionalFee}</span>
                </div>
              )}

              <div className="border-t border-[#dedad0] pt-3 mt-3 flex justify-between items-center text-lg font-extrabold text-[#1a1a18]">
                <span>Total Quote</span>
                <span className="font-mono">₹{request.quoteId.totalAmount}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleQuoteResponse('accept')}
                disabled={processing}
                className="flex-1 bg-[#b3261e] hover:bg-[#9c2019] text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Check className="w-4 h-4" /> Accept &amp; Book ₹{request.quoteId.totalAmount + Math.round(request.quoteId.totalAmount * 0.03)}
              </button>
              <button
                onClick={() => handleQuoteResponse('reject')}
                disabled={processing}
                className="flex-1 bg-white hover:bg-[#f7f5f0] text-rose-700 border border-rose-200 font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Reject Quote
              </button>
            </div>
            <p className="text-center text-xs text-[#6a675f] mt-3">
              Includes 3% platform service fee. Accepting confirms your booking immediately.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CustomRequestDetail;
