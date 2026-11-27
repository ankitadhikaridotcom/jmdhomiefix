import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Check,
  X,
  MapPin,
  Calendar,
  Clock,
  IndianRupee,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const notifTypeConfig = {
  NEW_BOOKING_REQUEST: { icon: '📅', color: 'bg-sky-100 text-sky-700', label: 'New Booking' },
  SUCCESS: { icon: '✅', color: 'bg-emerald-100 text-emerald-700', label: 'Success' },
  WARNING: { icon: '⚠️', color: 'bg-amber-100 text-amber-700', label: 'Alert' },
  INFO: { icon: 'ℹ️', color: 'bg-sky-50 text-sky-600', label: 'Info' },
  CUSTOM_REQUEST: { icon: '🔔', color: 'bg-[#b3261e]/10 text-[#b3261e]', label: 'Custom Request' },
  PAYMENT: { icon: '💰', color: 'bg-emerald-100 text-emerald-700', label: 'Payment' },
  DEFAULT: { icon: '🔔', color: 'bg-[#ebe8df] text-[#1a1a18]', label: 'Notification' },
};

const ProviderNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);
  const [actingId, setActingId] = useState(null);

  const loadNotifications = async (showError = false) => {
    try {
      const res = await fetch(`${API}/api/notifications`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setNotifications(data.notifications || []);
    } catch {
      if (showError) toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(true);
    const timer = setInterval(() => loadNotifications(false), 15000);
    return () => clearInterval(timer);
  }, []);

  const markAsRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    try {
      await fetch(`${API}/api/notifications/${id}/read`, { method: 'PUT', credentials: 'include' });
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch(`${API}/api/notifications/read-all`, { method: 'PUT', credentials: 'include' });
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleCustomRequestAction = async (e, notif, action) => {
    e.stopPropagation();
    const requestId = notif.relatedId || notif.metadata?.requestId;
    if (!requestId) return;

    setActingId(notif._id);
    try {
      const res = await fetch(`${API}/api/custom-requests/${requestId}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          action === 'accept'
            ? 'Custom request accepted! Customer has been notified.'
            : 'Custom request declined.'
        );
        setNotifications((prev) =>
          prev.map((item) =>
            item._id === notif._id
              ? { ...item, read: true, actionStatus: action === 'accept' ? 'accepted' : 'declined' }
              : item
          )
        );
      } else {
        toast.error(data.message || `Failed to ${action} request`);
        loadNotifications(false);
      }
    } catch {
      toast.error(`Failed to ${action} request`);
    } finally {
      setActingId(null);
    }
  };

  const getConfig = (type) => notifTypeConfig[type] || notifTypeConfig.DEFAULT;

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'CUSTOM_REQUEST', label: 'Custom Requests' },
    { key: 'NEW_BOOKING_REQUEST', label: 'Bookings' },
    { key: 'SUCCESS', label: 'Updates' },
  ];

  const filtered = notifications.filter((n) => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !n.read;
    return n.type === filterType;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1a1a18] flex items-center gap-3">
            <Bell className="text-[#b3261e] w-6 h-6" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="bg-[#b3261e] text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-[#6a675f] text-sm mt-1">
            Receive nearby custom service alerts and accept or decline directly here.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2 bg-white text-[#1a1a18] border border-[#dedad0] rounded-xl text-xs font-bold hover:bg-[#ebe8df] transition"
          >
            <CheckCheck className="w-4 h-4 text-[#b3261e]" />
            <span>{markingAll ? 'Marking...' : 'Mark all read'}</span>
          </button>
        )}
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 bg-[#ebe8df] p-1.5 rounded-2xl border border-[#dedad0] overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`flex-shrink-0 py-2 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === tab.key
                ? 'bg-white text-[#b3261e] shadow-xs'
                : 'text-[#6a675f] hover:text-[#1a1a18]'
            }`}
          >
            {tab.label}
            {tab.key === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-[#b3261e] text-white text-[9px] px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((notif, i) => {
            const config = getConfig(notif.type);
            const meta = notif.metadata || {};
            const requestId = notif.relatedId || meta.requestId;
            const isPendingCustomRequest =
              notif.type === 'CUSTOM_REQUEST' && notif.actionStatus === 'pending' && Boolean(requestId);
            const isActing = actingId === notif._id;

            return (
              <motion.div
                key={notif._id || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => !notif.read && markAsRead(notif._id)}
                className={`flex items-start gap-4 p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-sm ${
                  !notif.read
                    ? 'bg-white border-[#b3261e]/30 shadow-xs'
                    : 'bg-white border-[#dedad0] hover:bg-[#f7f5f0]/40'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center text-lg flex-shrink-0`}>
                  {config.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-extrabold text-[#1a1a18]">{notif.title}</p>
                        {!notif.read && <span className="w-2 h-2 bg-[#b3261e] rounded-full flex-shrink-0" />}
                        {notif.actionStatus === 'accepted' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase">
                            Accepted
                          </span>
                        )}
                        {notif.actionStatus === 'declined' && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase">
                            Declined
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-[#4a4842] mt-1 leading-relaxed">{notif.message}</p>
                    </div>
                    <p className="text-[11px] text-[#6a675f] flex-shrink-0 mt-0.5">
                      {notif.createdAt
                        ? new Date(notif.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </p>
                  </div>

                  {/* Metadata Badges for Custom Request */}
                  {notif.type === 'CUSTOM_REQUEST' && (meta.address || meta.date || meta.budget) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#6a675f]">
                      {meta.category && (
                        <span className="px-2 py-0.5 rounded-md bg-[#f7f5f0] border border-[#dedad0] text-[#1a1a18]">
                          {meta.category}
                        </span>
                      )}
                      {meta.distanceKm !== null && meta.distanceKm !== undefined && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700">
                          {meta.distanceKm} km away
                        </span>
                      )}
                      {meta.address && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#b3261e]" />
                          {meta.locality || meta.city || meta.address.split(',')[0]}
                        </span>
                      )}
                      {meta.date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {meta.date}
                          {meta.time ? ` · ${meta.time}` : ''}
                        </span>
                      )}
                      {meta.budget && (
                        <span className="inline-flex items-center gap-0.5 text-emerald-700 font-mono">
                          <IndianRupee className="w-3 h-3" /> {meta.budget}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Inline Accept / Decline Buttons */}
                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    {isPendingCustomRequest && (
                      <>
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={(e) => handleCustomRequestAction(e, notif, 'accept')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#b3261e] hover:bg-[#9c2019] disabled:opacity-60 text-white text-xs font-bold transition shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept Request</span>
                        </button>
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={(e) => handleCustomRequestAction(e, notif, 'decline')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#dedad0] hover:bg-[#f7f5f0] disabled:opacity-60 text-[#1a1a18] text-xs font-bold transition"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </>
                    )}

                    {notif.link && (
                      <Link
                        to={notif.link}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-[#b3261e] font-bold hover:underline ml-auto"
                      >
                        <span>View details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 bg-white rounded-3xl border border-dashed border-[#dedad0]"
        >
          <span className="text-5xl">🔔</span>
          <h3 className="text-lg font-bold text-[#1a1a18] mt-4">
            {filterType !== 'all' ? 'No notifications in this category' : 'All caught up!'}
          </h3>
          <p className="text-sm text-[#6a675f] mt-1">
            {filterType !== 'all'
              ? 'Try switching to All notifications.'
              : 'Nearby custom requests, bookings, and updates will appear here.'}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default ProviderNotifications;
