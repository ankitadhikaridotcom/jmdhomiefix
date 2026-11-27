import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, ChevronRight, PlusCircle, IndianRupee, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { EmptyState, ListSkeleton } from '../../components/common/LoadingSpinner';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const tabs = ['active', 'completed', 'cancelled', 'expired'];

const statusColors = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  PROVIDER_SELECTED: 'bg-sky-50 text-sky-800 border-sky-200',
  QUOTE_SENT: 'bg-purple-50 text-purple-800 border-purple-200',
  QUOTE_ACCEPTED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-800 border-rose-200',
  EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const statusLabels = {
  PENDING: 'Waiting for providers',
  PROVIDER_SELECTED: 'Provider Selected',
  QUOTE_SENT: 'Quote Received',
  QUOTE_ACCEPTED: 'Booked',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

const MyCustomRequests = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('active');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
    const timer = setInterval(fetchRequests, 15000);
    return () => clearInterval(timer);
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API}/api/custom-requests`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
      }
    } catch {
      toast.error('Failed to load custom requests');
    } finally {
      setLoading(false);
    }
  };

  const filtered = requests.filter((r) => {
    if (activeTab === 'active') return ['PENDING', 'PROVIDER_SELECTED', 'QUOTE_SENT'].includes(r.status);
    if (activeTab === 'completed') return ['QUOTE_ACCEPTED', 'COMPLETED'].includes(r.status);
    return r.status === activeTab.toUpperCase();
  });

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#1a1a18] pb-24 sm:pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-bold uppercase tracking-wider text-[#b3261e]">Customer Portal</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1a1a18] mt-1">My Custom Requests</h1>
            <p className="text-[#6a675f] text-sm mt-1">Track nearby provider responses, compare quotes, and manage bookings.</p>
          </motion.div>
          <Link
            to="/request-custom-service"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#b3261e] hover:bg-[#9c2019] px-5 py-3 text-sm font-bold text-white shadow-sm transition whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Custom Request</span>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-[#ebe8df] p-1.5 rounded-2xl border border-[#dedad0] overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold capitalize transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-white text-[#b3261e] shadow-xs'
                  : 'text-[#6a675f] hover:text-[#1a1a18]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <ListSkeleton rows={3} />
          ) : filtered.length > 0 ? (
            filtered.map((req, i) => (
              <motion.div
                key={req._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/custom-requests/${req._id}`)}
                className="bg-white p-5 sm:p-6 rounded-2xl border border-[#dedad0] shadow-xs hover:shadow-md hover:border-[#b3261e]/40 transition cursor-pointer group"
              >
                <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {req.category && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f7f5f0] border border-[#dedad0] text-[11px] font-bold text-[#1a1a18]">
                          {req.category}
                        </span>
                      )}
                      {req.isProfessionalBrief && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                          <Sparkles className="w-3 h-3" /> Pro Brief
                        </span>
                      )}
                      {req.acceptedProviders?.length > 0 && req.status === 'PENDING' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
                          {req.acceptedProviders.length} provider{req.acceptedProviders.length > 1 ? 's' : ''} accepted
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-[#1a1a18] text-lg group-hover:text-[#b3261e] transition-colors">
                      {req.serviceTitle || 'Custom Service'}
                    </h3>
                    <p className="text-sm text-[#6a675f] mt-1 line-clamp-2">{req.description}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${
                      statusColors[req.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {statusLabels[req.status] || req.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#6a675f] mt-4 pt-4 border-t border-[#ebe8df]">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#b3261e]" />
                    {req.location?.locality || req.location?.city || req.location?.address?.split(',')[0]}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#6a675f]" /> {req.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#6a675f]" /> {req.time}
                  </span>
                  {req.budget && (
                    <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-mono">
                      <IndianRupee className="w-3 h-3" /> {req.budget}
                    </span>
                  )}

                  <div className="ml-auto flex items-center text-[#b3261e] font-bold group-hover:translate-x-1 transition-transform">
                    View Details <ChevronRight className="ml-1 w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <EmptyState
              icon="📝"
              title="No requests found"
              description={`You don't have any ${activeTab} custom requests yet.`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MyCustomRequests;
