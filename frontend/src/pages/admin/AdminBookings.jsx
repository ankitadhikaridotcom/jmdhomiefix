import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch,
  FaEye,
  FaTimes,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaUser,
  FaUserTie,
  FaCheck,
  FaBan,
  FaPlay,
  FaCheckDouble,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import StatsCard from '../../components/admin/StatsCard';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const tabs = ['all', 'pending', 'confirmed', 'upcoming', 'ongoing', 'completed', 'cancelled'];

const statusColors = {
  pending: 'bg-amber-100 text-amber-800',
  upcoming: 'bg-cyan-100 text-cyan-800',
  confirmed: 'bg-emerald-100 text-emerald-700',
  ongoing: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const AdminBookings = () => {
  const [bookingList, setBookingList] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [updating, setUpdating] = useState(null); // id of booking being updated

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const res = await fetch(`${API}/api/bookings`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setBookingList(data.bookings || []);
        } else throw new Error();
      } catch {
        toast.error('Failed to load bookings from server');
      }
    };
    loadBookings();
  }, []);

  const filtered = bookingList.filter(b => {
    const matchesTab = activeTab === 'all' || b.status === activeTab;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (b.id || '').toLowerCase().includes(q) ||
      (b.serviceName || '').toLowerCase().includes(q) ||
      (b.customerName || '').toLowerCase().includes(q) ||
      (b.providerName || '').toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const stats = {
    total: bookingList.length,
    pending: bookingList.filter(b => b.status === 'pending').length,
    active: bookingList.filter(b => ['confirmed', 'upcoming', 'ongoing'].includes(b.status)).length,
    completed: bookingList.filter(b => b.status === 'completed').length,
    revenue: bookingList.reduce((sum, b) => sum + (b.total || 0), 0),
  };

  const handleStatusUpdate = async (id, newStatus) => {
    setUpdating(id);
    try {
      const res = await fetch(`${API}/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to update');

      setBookingList(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
      setSelectedBooking(prev => prev && prev.id === id ? { ...prev, status: newStatus } : prev);

      const label =
        newStatus === 'confirmed' ? 'Booking accepted ✅' :
        newStatus === 'cancelled' ? 'Booking cancelled' :
        newStatus === 'ongoing' ? 'Booking marked as Ongoing' :
        newStatus === 'completed' ? 'Booking marked as Completed' :
        `Status updated to ${newStatus}`;
      toast.success(label);
    } catch (e) {
      toast.error(e.message || 'Failed to update booking status');
    } finally {
      setUpdating(null);
    }
  };

  const pendingCount = bookingList.filter(b => b.status === 'pending').length;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Bookings</h1>
        <p className="text-gray-500 text-sm mt-1">View and manage all bookings across the platform</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Bookings" value={stats.total.toString()} icon="📋" color="primary" index={0} />
        <StatsCard title="Active" value={stats.active.toString()} icon="🔄" color="warning" index={1} />
        <StatsCard title="Completed" value={stats.completed.toString()} icon="✅" color="success" index={2} />
        <StatsCard title="Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon="💰" color="info" index={3} />
      </div>

      {/* Pending alert banner */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm"
        >
          <span className="text-xl">⏳</span>
          <div className="flex-1">
            <span className="font-bold text-amber-800">{pendingCount} pending booking{pendingCount > 1 ? 's' : ''}</span>
            <span className="text-amber-700"> waiting for acceptance. Click <strong>Pending</strong> tab or use Accept/Reject below.</span>
          </div>
          <button
            onClick={() => setActiveTab('pending')}
            className="text-xs font-bold bg-amber-700 text-white px-3 py-1.5 rounded-lg hover:bg-amber-800 transition"
          >
            View Pending
          </button>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative flex-1 py-2.5 px-4 rounded-lg text-sm font-medium capitalize transition-all whitespace-nowrap
              ${activeTab === tab ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
          >
            {tab}
            {tab === 'pending' && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-bold bg-amber-500 text-white rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ID, service, customer, or provider..."
          className="input-field pl-11 !py-2.5"
        />
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-6 py-3">Booking ID</th>
                <th className="px-6 py-3">Service</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Provider</th>
                <th className="px-6 py-3">Date & Time</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <motion.tr
                  key={b.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-gray-50 hover:bg-gray-50/50"
                >
                  <td className="table-cell font-mono text-primary-600 font-semibold text-xs">#{b.id}</td>
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-gray-900">{b.serviceName}</p>
                      <p className="text-xs text-gray-400">{b.serviceCategory || b.category}</p>
                    </div>
                  </td>
                  <td className="table-cell text-sm">{b.customerName}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {b.providerAvatar ? (
                        <img src={b.providerAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                          {(b.providerName || 'P')[0]}
                        </div>
                      )}
                      <span className="text-sm">{b.providerName}</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <p className="text-sm">{b.date}</p>
                    <p className="text-xs text-gray-400">{b.time}</p>
                  </td>
                  <td className="table-cell font-semibold">₹{b.total}</td>
                  <td className="table-cell">
                    <span className={`badge ${statusColors[b.status] || 'bg-gray-100 text-gray-700'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5">
                      {/* Quick Accept / Reject for pending bookings */}
                      {b.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(b.id, 'confirmed')}
                            disabled={updating === b.id}
                            title="Accept Booking"
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-60"
                          >
                            <FaCheck className="text-[10px]" /> Accept
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(b.id, 'cancelled')}
                            disabled={updating === b.id}
                            title="Reject Booking"
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-xs font-semibold rounded-lg transition disabled:opacity-60"
                          >
                            <FaBan className="text-[10px]" /> Reject
                          </button>
                        </>
                      )}

                      {/* View details */}
                      <button
                        onClick={() => setSelectedBooking(b)}
                        title="View Details"
                        className="p-2 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors"
                      >
                        <FaEye className="text-sm" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl">{activeTab === 'pending' ? '⏳' : '🔍'}</span>
            <p className="text-gray-500 mt-3">
              {activeTab === 'pending' ? 'No pending bookings — all caught up!' : 'No bookings found'}
            </p>
          </div>
        )}
      </motion.div>

      {/* Detail Modal — full-height scroll overlay */}
      <AnimatePresence>
        {selectedBooking && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setSelectedBooking(null)}
            />
            {/* Scroll container: fills whole screen and scrolls */}
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 sm:p-6 lg:p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto"
                onClick={(e) => e.stopPropagation()}
              >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Booking #{selectedBooking.id}</h2>
                  <button onClick={() => setSelectedBooking(null)} className="p-2 rounded-lg hover:bg-gray-100">
                    <FaTimes />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`badge ${statusColors[selectedBooking.status] || 'bg-gray-100 text-gray-700'} text-sm`}>
                      {selectedBooking.status}
                    </span>
                    <span className="text-lg font-bold text-gray-900">₹{selectedBooking.total}</span>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                    <p className="font-semibold text-gray-900">
                      {selectedBooking.serviceName}{' '}
                      <span className="text-gray-400 font-normal">({selectedBooking.serviceCategory || selectedBooking.category})</span>
                    </p>
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaUser className="text-gray-400 text-xs" /> Customer: {selectedBooking.customerName}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaUserTie className="text-gray-400 text-xs" /> Provider: {selectedBooking.providerName}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaCalendarAlt className="text-gray-400 text-xs" /> {selectedBooking.date} at {selectedBooking.time}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <FaMapMarkerAlt className="text-gray-400 text-xs" /> {selectedBooking.address}
                    </div>
                  </div>

                  {selectedBooking.description && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">Description</p>
                      <p className="text-sm text-gray-600">{selectedBooking.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Visit Charge</p>
                      <p className="font-semibold">₹{selectedBooking.visitCharge || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Labour</p>
                      <p className="font-semibold">₹{selectedBooking.labourCharge || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Platform Fee</p>
                      <p className="font-semibold">₹{selectedBooking.platformFee || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Payment</p>
                      <p className="font-semibold capitalize">{selectedBooking.paymentMethod}</p>
                    </div>
                  </div>

                  {selectedBooking.timeline && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-500 mb-3">TIMELINE</p>
                      <div className="space-y-3">
                        {selectedBooking.timeline.map((step, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${step.done ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            <div className="flex-1 flex items-center justify-between">
                              <span className={`text-sm ${step.done ? 'text-gray-700' : 'text-gray-400'}`}>{step.step}</span>
                              {step.time && <span className="text-xs text-gray-400">{step.time}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ========= Actions ========= */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                    {/* PENDING: Accept / Reject */}
                    {selectedBooking.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(selectedBooking.id, 'confirmed')}
                          disabled={updating === selectedBooking.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-60"
                        >
                          <FaCheck /> Accept Booking
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(selectedBooking.id, 'cancelled')}
                          disabled={updating === selectedBooking.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-100 transition disabled:opacity-60"
                        >
                          <FaBan /> Reject
                        </button>
                      </>
                    )}

                    {/* CONFIRMED: Mark On-Going */}
                    {selectedBooking.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(selectedBooking.id, 'ongoing')}
                          disabled={updating === selectedBooking.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-60"
                        >
                          <FaPlay className="text-xs" /> Mark On-Going
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(selectedBooking.id, 'cancelled')}
                          disabled={updating === selectedBooking.id}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-100 transition disabled:opacity-60"
                        >
                          <FaBan /> Cancel
                        </button>
                      </>
                    )}

                    {/* UPCOMING: Cancel only */}
                    {selectedBooking.status === 'upcoming' && (
                      <button
                        onClick={() => handleStatusUpdate(selectedBooking.id, 'cancelled')}
                        disabled={updating === selectedBooking.id}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-100 transition disabled:opacity-60"
                      >
                        <FaBan /> Cancel Booking
                      </button>
                    )}

                    {/* ONGOING: Mark Completed */}
                    {selectedBooking.status === 'ongoing' && (
                      <button
                        onClick={() => handleStatusUpdate(selectedBooking.id, 'completed')}
                        disabled={updating === selectedBooking.id}
                        className="flex-1 flex items-center justify-center gap-2 btn-primary !py-2.5 text-sm disabled:opacity-60"
                      >
                        <FaCheckDouble /> Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminBookings;
