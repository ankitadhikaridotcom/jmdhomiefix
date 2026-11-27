import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Calendar,
  Clock,
  Check,
  X,
  IndianRupee,
  FileText,
  Sparkles,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { EmptyState, ListSkeleton } from '../../components/common/LoadingSpinner';
import ProviderRequestDetailModal from '../../components/provider/ProviderRequestDetailModal';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const tabs = ['new', 'accepted'];

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

const ProviderCustomRequests = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('new');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [quoteForm, setQuoteForm] = useState(null);
  const [quoteData, setQuoteData] = useState({
    inspectionFee: '',
    labourFee: '',
    materialFee: '',
    additionalFee: '',
  });

  const fetchRequests = async (showError = false) => {
    try {
      const res = await fetch(`${API}/api/custom-requests?mode=provider`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        const list = data.requests || [];
        setRequests(list);
        const paramReqId = searchParams.get('requestId');
        if (paramReqId) {
          const target = list.find((item) => item._id === paramReqId);
          if (target) {
            setSelectedRequest(target);
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('requestId');
            setSearchParams(nextParams, { replace: true });
          }
        } else {
          setSelectedRequest((prev) => (prev ? list.find((item) => item._id === prev._id) || prev : null));
        }
      }
    } catch {
      if (showError) toast.error('Failed to load custom requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(true);
    const timer = setInterval(() => fetchRequests(false), 15000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = async (id, action) => {
    setRequests((prev) => prev.filter((r) => r._id !== id));
    if (selectedRequest?._id === id) setSelectedRequest(null);
    try {
      const res = await fetch(`${API}/api/custom-requests/${id}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === 'accept' ? 'Request accepted!' : 'Request declined');
        fetchRequests();
      } else {
        toast.error(data.message);
        fetchRequests();
      }
    } catch {
      toast.error(`Failed to ${action} request`);
      fetchRequests();
    }
  };

  const submitQuote = async (id) => {
    try {
      const res = await fetch(`${API}/api/custom-requests/${id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(quoteData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Quote sent to customer successfully');
        setQuoteForm(null);
        setQuoteData({ inspectionFee: '', labourFee: '', materialFee: '', additionalFee: '' });
        fetchRequests();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Failed to submit quote');
    }
  };

  const myId = user?.id || user?._id;

  const getDistanceForReq = (req) => {
    const reqLat = req?.location?.latitude || (req?.location?.coordinates && req.location.coordinates[1]);
    const reqLng = req?.location?.longitude || (req?.location?.coordinates && req.location.coordinates[0]);
    const provLat = user?.address?.latitude || user?.location?.coordinates?.[1];
    const provLng = user?.address?.longitude || user?.location?.coordinates?.[0];
    return calculateHaversineDistance(provLat, provLng, reqLat, reqLng);
  };

  const filtered = requests.filter((r) => {
    const isAccepted =
      (r.acceptedProviders && r.acceptedProviders.some((p) => (p._id || p)?.toString() === myId?.toString())) ||
      (r.selectedProviderId && (r.selectedProviderId._id || r.selectedProviderId)?.toString() === myId?.toString());
    if (activeTab === 'new') return (r.status === 'PENDING' || r.status === 'pending') && !isAccepted;
    if (activeTab === 'accepted') return isAccepted;
    return false;
  });

  const selectedIsAccepted = selectedRequest
    ? ((selectedRequest.acceptedProviders?.some((p) => (p._id || p)?.toString() === myId?.toString()))
      || (selectedRequest.selectedProviderId && (selectedRequest.selectedProviderId._id || selectedRequest.selectedProviderId)?.toString() === myId?.toString()))
    : false;

  return (
    <div className="space-y-6 pb-20">
      <ProviderRequestDetailModal
        isOpen={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        item={selectedRequest}
        type="custom"
        distanceKm={selectedRequest ? getDistanceForReq(selectedRequest) : null}
        onUpdated={(patch) => {
          setSelectedRequest((prev) => (prev ? { ...prev, ...patch } : null));
          fetchRequests();
        }}
        actions={
          selectedRequest && !selectedIsAccepted && selectedRequest.status === 'PENDING' ? (
            <>
              <button
                type="button"
                onClick={() => handleAction(selectedRequest._id, 'accept')}
                className="bg-[#b3261e] hover:bg-[#9c2019] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Check className="w-4 h-4" /> Accept Request
              </button>
              <button
                type="button"
                onClick={() => handleAction(selectedRequest._id, 'decline')}
                className="bg-white border border-[#dedad0] text-[#1a1a18] hover:bg-[#ebe8df] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <X className="w-4 h-4" /> Decline
              </button>
            </>
          ) : null
        }
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#1a1a18]">Custom Requests</h1>
        <p className="text-[#6a675f] text-sm mt-1">
          Click any request to inspect full address, maps, budget, and contact options.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-[#ebe8df] p-1.5 rounded-2xl border border-[#dedad0] overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold capitalize transition-all whitespace-nowrap ${
              activeTab === tab ? 'bg-white text-[#b3261e] shadow-xs' : 'text-[#6a675f] hover:text-[#1a1a18]'
            }`}
          >
            {tab === 'new' ? 'New Nearby Requests' : 'Accepted & Active'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <ListSkeleton rows={3} />
        ) : filtered.length > 0 ? (
          filtered.map((req, i) => {
            const isSelected =
              req.selectedProviderId &&
              (req.selectedProviderId._id === myId || req.selectedProviderId === myId);
            const distanceKm = getDistanceForReq(req);

            return (
              <motion.div
                key={req._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedRequest(req)}
                className={`bg-white p-5 sm:p-6 rounded-2xl border cursor-pointer hover:border-[#b3261e]/50 hover:shadow-md ${
                  isSelected ? 'border-[#b3261e]/40 shadow-md ring-1 ring-[#b3261e]/15' : 'border-[#dedad0] shadow-xs'
                } transition`}
              >
                <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {req.category && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f7f5f0] border border-[#dedad0] text-[11px] font-bold text-[#1a1a18]">
                          {req.category}
                        </span>
                      )}
                      {req.urgency && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#b3261e]/10 text-[#b3261e] text-[10px] font-bold uppercase">
                          {req.urgency.replace('_', ' ')}
                        </span>
                      )}
                      {req.isProfessionalBrief && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                          <Sparkles className="w-3 h-3" /> Pro Brief
                        </span>
                      )}
                      {isSelected && (
                        <span className="bg-purple-100 text-purple-800 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full">
                          Selected by Customer
                        </span>
                      )}
                      {req.pincodeMatch && (
                        <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                          Same PIN {req.location?.pincode || ''}
                        </span>
                      )}
                      {distanceKm && (
                        <span className="bg-sky-50 text-sky-700 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-sky-200">
                          <MapPin className="w-3 h-3" /> {distanceKm} km away
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-[#1a1a18] text-lg">
                      {req.serviceTitle || 'Custom Service'}
                    </h3>
                    <p className="text-sm text-[#4a4842] mt-2 whitespace-pre-wrap line-clamp-3">{req.description}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-[#f7f5f0] border border-[#dedad0] text-[#1a1a18]">
                    {req.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#6a675f] mt-4 pt-4 border-t border-[#ebe8df]">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#b3261e]" />
                    {[req.location?.houseOrFlat, req.location?.address, req.location?.city]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {req.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {req.time}
                  </span>
                  {req.budget && (
                    <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-mono">
                      <IndianRupee className="w-3 h-3" /> Budget: ₹{req.budget}
                    </span>
                  )}

                  <div className="ml-auto flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSelectedRequest(req)}
                      className="bg-[#f7f5f0] border border-[#dedad0] text-[#1a1a18] hover:bg-[#ebe8df] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#b3261e]" /> View Details
                    </button>

                    {activeTab === 'new' && (
                      <>
                        <button
                          onClick={() => handleAction(req._id, 'accept')}
                          className="bg-[#b3261e] hover:bg-[#9c2019] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button
                          onClick={() => handleAction(req._id, 'decline')}
                          className="bg-white border border-[#dedad0] text-[#1a1a18] hover:bg-[#f7f5f0] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <X className="w-3.5 h-3.5" /> Decline
                        </button>
                      </>
                    )}

                    {activeTab === 'accepted' && isSelected && req.status === 'PROVIDER_SELECTED' && (
                      <button
                        onClick={() => setQuoteForm({ id: req._id })}
                        className="bg-[#1a1a18] hover:bg-[#2b2b28] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <FileText className="w-3.5 h-3.5" /> Send Quote
                      </button>
                    )}

                    {activeTab === 'accepted' && !isSelected && req.status === 'PENDING' && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                        Waiting for Customer Selection...
                      </span>
                    )}

                    {req.status === 'QUOTE_SENT' && isSelected && (
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl">
                        Quote Sent · Awaiting Customer
                      </span>
                    )}
                  </div>
                </div>

                {/* Quote Form */}
                <AnimatePresence>
                  {quoteForm?.id === req._id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-4 p-4 bg-[#f7f5f0] rounded-2xl border border-[#dedad0] overflow-hidden"
                    >
                      <h4 className="text-sm font-extrabold text-[#1a1a18] mb-3 flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-[#b3261e]" /> Prepare Itemized Quote
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-bold text-[#1a1a18] mb-1">Inspection / Visit Fee *</label>
                          <input
                            type="number"
                            value={quoteData.inspectionFee}
                            onChange={(e) => setQuoteData({ ...quoteData, inspectionFee: e.target.value })}
                            className="w-full text-sm p-2.5 rounded-xl border border-[#dedad0] bg-white"
                            placeholder="₹"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#1a1a18] mb-1">Labour Charge *</label>
                          <input
                            type="number"
                            value={quoteData.labourFee}
                            onChange={(e) => setQuoteData({ ...quoteData, labourFee: e.target.value })}
                            className="w-full text-sm p-2.5 rounded-xl border border-[#dedad0] bg-white"
                            placeholder="₹"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#1a1a18] mb-1">Parts / Materials</label>
                          <input
                            type="number"
                            value={quoteData.materialFee}
                            onChange={(e) => setQuoteData({ ...quoteData, materialFee: e.target.value })}
                            className="w-full text-sm p-2.5 rounded-xl border border-[#dedad0] bg-white"
                            placeholder="₹"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#1a1a18] mb-1">Additional Charges</label>
                          <input
                            type="number"
                            value={quoteData.additionalFee}
                            onChange={(e) => setQuoteData({ ...quoteData, additionalFee: e.target.value })}
                            className="w-full text-sm p-2.5 rounded-xl border border-[#dedad0] bg-white"
                            placeholder="₹"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => submitQuote(req._id)}
                          className="flex-1 bg-[#b3261e] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-[#9c2019] transition"
                        >
                          Send Quote to Customer
                        </button>
                        <button
                          onClick={() => setQuoteForm(null)}
                          className="px-4 bg-white text-[#1a1a18] border border-[#dedad0] py-2.5 rounded-xl text-xs font-bold hover:bg-[#ebe8df] transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        ) : (
          <EmptyState
            icon="📬"
            title="No requests found"
            description={`There are no ${activeTab} custom requests matching your area right now.`}
          />
        )}
      </div>
    </div>
  );
};

export default ProviderCustomRequests;
