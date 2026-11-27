import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Bell,
  TrendingUp,
  Star,
  Clock,
  MapPin,
  Check,
  X,
  Navigation,
  Save,
  AlertTriangle,
  Phone,
  Calendar,
  Plus,
  Ban,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LeafletMap from '../../components/common/LeafletMap';
import ServiceManager from '../../components/provider/ServiceManager';
import ProviderRequestDetailModal from '../../components/provider/ProviderRequestDetailModal';
import { detectCurrentLocation } from '../../utils/locationDetect';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const StatCard = ({ title, value, subtitle, icon: Icon, accent = 'default', index }) => {
  const iconStyles = {
    default: 'bg-[#ebe8df] text-[#1a1a18] border-[#dedad0]',
    crimson: 'bg-[#b3261e]/10 text-[#b3261e] border-[#b3261e]/20',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-white rounded-2xl p-5 border border-[#dedad0] shadow-xs hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-[#6a675f] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-extrabold text-[#1a1a18] mt-1 font-mono tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#6a675f] mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconStyles[accent] || iconStyles.default}`}>
          {Icon && <Icon className="w-5 h-5 stroke-[1.8]" />}
        </div>
      </div>
    </motion.div>
  );
};

const ProviderDashboard = () => {
  const { user, updateProviderSettings, refreshUser } = useAuth();
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedJobs: 0,
    thisMonthEarnings: 0,
    avgRating: 0,
    totalReviews: 0,
    pendingBookings: 0,
    activeBookings: 0,
  });
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [categories, setCategories] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pendingCustomRequests, setPendingCustomRequests] = useState([]);
  const [addServiceModalOpen, setAddServiceModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null); // { item, type }

  // Location state
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({
    street: user?.address?.street || '',
    locality: user?.address?.locality || '',
    city: user?.address?.city || user?.city || 'Nainital',
    state: user?.address?.state || 'Uttarakhand',
    pincode: user?.address?.pincode || '',
    latitude: user?.address?.latitude || user?.location?.coordinates?.[1] || 29.3803,
    longitude: user?.address?.longitude || user?.location?.coordinates?.[0] || 79.5126,
    serviceRadius: user?.serviceRadius || 10,
  });
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  useEffect(() => {
    if (user) {
      setLocationForm((prev) => ({
        ...prev,
        street: user.address?.street || prev.street,
        locality: user.address?.locality || prev.locality,
        city: user.address?.city || user.city || prev.city,
        state: user.address?.state || prev.state,
        pincode: user.address?.pincode || prev.pincode,
        latitude: user.address?.latitude || user.location?.coordinates?.[1] || prev.latitude,
        longitude: user.address?.longitude || user.location?.coordinates?.[0] || prev.longitude,
        serviceRadius: user.serviceRadius || prev.serviceRadius,
      }));
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const res = await fetch(`${API}/api/service-categories`);
      const data = await res.json();
      if (data.success) {
        setCategories((data.categories || []).map((c) => c.name));
      }
    } catch (e) { console.error('Categories error', e); }

    try {
      const res = await fetch(`${API}/api/providers/me/stats`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) { console.error('Stats error', e); }

    try {
      const res = await fetch(`${API}/api/bookings?mode=provider`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setPendingBookings(data.bookings.filter((b) => b.status === 'pending'));
        setUpcomingBookings(
          data.bookings
            .filter((b) => ['confirmed', 'upcoming', 'ongoing'].includes(b.status))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5)
        );
      }
    } catch (e) { console.error('Bookings error', e); }

    setLoadingServices(true);
    try {
      const res = await fetch(`${API}/api/services/me`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setMyServices(data.services || []);
    } catch (e) { console.error('Services error', e); }
    finally { setLoadingServices(false); }

    try {
      const res = await fetch(`${API}/api/providers/me/reviews`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setRecentReviews((data.reviews || []).slice(0, 3));
    } catch (e) { /* Reviews optional */ }

    try {
      const res = await fetch(`${API}/api/notifications`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setNotifications(data.notifications || []);
    } catch (e) { console.error('Notifications error', e); }

    try {
      const res = await fetch(`${API}/api/custom-requests?mode=provider`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const myId = (user?.id || user?._id)?.toString();
        const unhandled = (data.requests || []).filter((r) => {
          const isAccepted = (r.acceptedProviders?.some((p) => (p._id || p)?.toString() === myId))
            || (r.selectedProviderId && (r.selectedProviderId._id || r.selectedProviderId)?.toString() === myId);
          const isDeclined = r.declinedProviders?.some((p) => (p._id || p)?.toString() === myId);
          return (r.status === 'PENDING' || r.status === 'pending') && !isAccepted && !isDeclined;
        });
        setPendingCustomRequests(unhandled);
      }
    } catch (e) { console.error('Custom requests error', e); }
  };

  useEffect(() => {
    loadDashboardData();
    const timer = setInterval(loadDashboardData, 15000);
    return () => clearInterval(timer);
  }, [user]);

  const handleToggleAvailability = async (e) => {
    const newValue = e.target.checked;
    const hasValidLocation = user?.location?.coordinates
      && (user.location.coordinates[0] !== 0 || user.location.coordinates[1] !== 0);
    if (newValue && !hasValidLocation) {
      toast.error('Please save your service location before turning on availability.');
      setIsEditingLocation(true);
      return;
    }
    setTogglingAvailability(true);
    try {
      const res = await updateProviderSettings({ openToCustomRequests: newValue });
      if (res.success) toast.success(newValue ? 'You are now Online & accepting requests!' : 'You are now Offline.');
    } catch (err) {
      toast.error(err.message || 'Failed to update availability');
    } finally { setTogglingAvailability(false); }
  };

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    toast.loading('Detecting location...', { id: 'geo' });
    try {
      const loc = await detectCurrentLocation(API);
      setLocationForm((prev) => ({
        ...prev,
        latitude: loc.latitude,
        longitude: loc.longitude,
        city: loc.city || loc.locality || prev.city,
        state: loc.state || prev.state,
        locality: loc.locality || prev.locality,
        street: loc.formattedAddress || prev.street,
        pincode: loc.pincode || prev.pincode,
      }));
      toast.success(
        `Location detected: ${loc.city || loc.locality || 'Coordinates updated'}`,
        { id: 'geo' }
      );
    } catch (err) {
      toast.error(err.message || 'Could not detect location', { id: 'geo' });
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setSavingLocation(true);
    try {
      const res = await fetch(`${API}/api/location/provider`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          latitude: Number(locationForm.latitude),
          longitude: Number(locationForm.longitude),
          street: locationForm.street,
          locality: locationForm.locality,
          city: locationForm.city,
          state: locationForm.state,
          pincode: locationForm.pincode,
          serviceRadius: Number(locationForm.serviceRadius),
          formattedAddress: `${locationForm.street || ''} ${locationForm.locality || ''} ${locationForm.city}, ${locationForm.state} ${locationForm.pincode}`.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Base location saved!');
        setIsEditingLocation(false);
        if (refreshUser) await refreshUser().catch(() => {});
        loadDashboardData();
      } else toast.error(data.message || 'Failed to save location');
    } catch (e) { toast.error('Network error saving location'); }
    finally { setSavingLocation(false); }
  };

  const handleAcceptBooking = async (id) => {
    setPendingBookings((prev) => prev.filter((b) => b.id !== id));
    try {
      const res = await fetch(`${API}/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'confirmed', mode: 'provider' }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Booking accepted!'); loadDashboardData(); }
      else throw new Error(data.message);
    } catch (e) { toast.error('Failed to accept booking'); loadDashboardData(); }
  };

  const handleRejectBooking = async (id) => {
    setPendingBookings((prev) => prev.filter((b) => b.id !== id));
    try {
      const res = await fetch(`${API}/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled', mode: 'provider' }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Booking declined'); loadDashboardData(); }
    } catch (e) { toast.error('Failed to decline booking'); loadDashboardData(); }
  };

  const handleCustomRequestAction = async (id, action) => {
    setPendingCustomRequests((prev) => prev.filter((r) => r._id !== id));
    try {
      const res = await fetch(`${API}/api/custom-requests/${id}/${action}`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        toast.success(action === 'accept' ? 'Custom request accepted!' : 'Request declined');
        loadDashboardData();
      } else {
        toast.error(data.message || `Failed to ${action} request`);
        loadDashboardData();
      }
    } catch (e) {
      toast.error(`Failed to ${action} request`);
      loadDashboardData();
    }
  };

  const isAvailable = user?.openToCustomRequests || false;
  const hasSavedLocation = user?.location?.coordinates
    && (user.location.coordinates[0] !== 0 || user.location.coordinates[1] !== 0);
  const totalPending = pendingBookings.length + pendingCustomRequests.length;
  const unreadNotifCount = notifications.filter((n) => !n.read).length;
  const activeServicesCount = myServices.filter((s) => s.isActive).length;

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    upcoming: 'bg-indigo-100 text-indigo-700',
    ongoing: 'bg-purple-100 text-purple-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6 pb-16">
      <ProviderRequestDetailModal
        isOpen={Boolean(detailModal)}
        onClose={() => setDetailModal(null)}
        item={detailModal?.item}
        type={detailModal?.type || 'custom'}
        onUpdated={(patch) => {
          setDetailModal((prev) => (prev ? { ...prev, item: { ...prev.item, ...patch } } : null));
          loadDashboardData();
        }}
        actions={
          detailModal?.type === 'custom' && detailModal.item?.status === 'PENDING' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  handleCustomRequestAction(detailModal.item._id, 'accept');
                  setDetailModal(null);
                }}
                className="bg-[#b3261e] hover:bg-[#9c2019] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Check className="w-4 h-4" /> Accept Request
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCustomRequestAction(detailModal.item._id, 'decline');
                  setDetailModal(null);
                }}
                className="bg-white border border-[#dedad0] text-[#1a1a18] hover:bg-[#ebe8df] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <X className="w-4 h-4" /> Decline
              </button>
            </>
          ) : detailModal?.type === 'booking' && detailModal.item?.status === 'pending' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  handleAcceptBooking(detailModal.item.id);
                  setDetailModal(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Check className="w-4 h-4" /> Accept Booking
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRejectBooking(detailModal.item.id);
                  setDetailModal(null);
                }}
                className="bg-white border border-[#dedad0] text-[#1a1a18] hover:bg-[#ebe8df] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <X className="w-4 h-4" /> Decline
              </button>
            </>
          ) : null
        }
      />
      {user?.verificationStatus === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="mt-0.5 text-amber-600 shrink-0 w-5 h-5" />
          <div className="text-sm">
            <p className="font-bold">Profile Under Verification</p>
            <p className="mt-0.5 text-amber-700">Your provider account is currently pending verification. You can prepare your services, and they will go live once approved.</p>
          </div>
        </div>
      )}
      {user?.verificationStatus === 'rejected' && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-start gap-3 shadow-xs">
          <Ban className="mt-0.5 text-rose-600 shrink-0 w-5 h-5" />
          <div className="text-sm">
            <p className="font-bold">Profile Application Rejected</p>
            <p className="mt-0.5 text-rose-700">Your provider account application has been rejected. Please contact support for more details.</p>
          </div>
        </div>
      )}

      {/* ===== EXECUTIVE HEADER ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1a1a18] text-[#f7f5f0] rounded-3xl p-6 sm:p-7 border border-[#2b2b28] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider text-[#ebe8df] mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#b3261e]" />
            <span>Verified Partner Workspace</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#f7f5f0]">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-[#ebe8df]/75 text-sm mt-1">
            Manage incoming bookings, configure your coverage area, and publish or update your service offerings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Online/Offline Toggle */}
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300 ${
            isAvailable
              ? 'bg-emerald-950/60 border-emerald-500/40'
              : 'bg-white/5 border-white/15'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${isAvailable ? 'text-emerald-300' : 'text-[#ebe8df]/75'}`}>
                {isAvailable ? 'Online' : 'Offline'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={handleToggleAvailability}
                disabled={togglingAvailability}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer
                peer-checked:after:translate-x-full peer-checked:after:border-white
                after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setAddServiceModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#b3261e] hover:bg-[#9c2019] text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>
        </div>
      </motion.div>

      {/* Location Warning */}
      {!hasSavedLocation && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3"
        >
          <AlertTriangle className="text-amber-500 shrink-0 w-5 h-5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Base service location not configured</p>
            <p className="text-xs text-amber-700">Set your service base location and PIN code so nearby customers can discover your offerings.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingLocation(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shrink-0"
          >
            Configure Location
          </button>
        </motion.div>
      )}

      {/* ===== KPI STATS STRIP ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Active Services" value={`${activeServicesCount}/${myServices.length}`} subtitle="Published listings" icon={Briefcase} accent="crimson" index={0} />
        <StatCard title="Total Bookings" value={stats.totalBookings} subtitle="All time orders" icon={Calendar} accent="default" index={1} />
        <StatCard title="Completed Jobs" value={stats.completedJobs} subtitle="Successfully delivered" icon={Check} accent="emerald" index={2} />
        <StatCard title="This Month" value={`₹${stats.thisMonthEarnings.toLocaleString()}`} subtitle="Net earnings" icon={TrendingUp} accent="default" index={3} />
        <StatCard
          title="Avg Rating"
          value={stats.avgRating > 0 ? `★ ${stats.avgRating}` : '—'}
          subtitle={stats.totalReviews > 0 ? `${stats.totalReviews} reviews` : 'No reviews yet'}
          icon={Star}
          accent="amber"
          index={4}
        />
      </div>

      {/* ===== Location Edit Panel ===== */}
      <AnimatePresence>
        {isEditingLocation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl p-6 border border-[#dedad0] shadow-md overflow-hidden space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1a1a18] flex items-center gap-2">
                  <MapPin className="text-[#b3261e] w-4 h-4" /> Service Base Location
                </h3>
                <p className="text-xs text-[#6a675f]">Set your operational base — customers within your radius will see your offerings.</p>
              </div>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingLocation}
                className="px-3 py-1.5 bg-[#1a1a18] hover:bg-[#2b2b28] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-60"
              >
                <Navigation className="w-3.5 h-3.5" /> {detectingLocation ? 'Detecting...' : 'Detect GPS'}
              </button>
            </div>
            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#1a1a18] mb-1">Street / Locality</label>
                  <input
                    type="text"
                    value={locationForm.street}
                    onChange={(e) => setLocationForm({ ...locationForm, street: e.target.value })}
                    placeholder="e.g. Near Bus Stand, Mall Road"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#dedad0] outline-none focus:border-[#b3261e]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1a1a18] mb-1">City *</label>
                  <input
                    type="text"
                    value={locationForm.city}
                    onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#dedad0] outline-none focus:border-[#b3261e]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1a1a18] mb-1">PIN Code *</label>
                  <input
                    type="text"
                    value={locationForm.pincode}
                    onChange={(e) => setLocationForm({ ...locationForm, pincode: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#dedad0] outline-none focus:border-[#b3261e]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-[#1a1a18] mb-1">Service Radius (km) *</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={locationForm.serviceRadius}
                    onChange={(e) => setLocationForm({ ...locationForm, serviceRadius: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#dedad0] outline-none focus:border-[#b3261e]"
                  />
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-[#1a1a18] font-semibold">
                    Coordinates: <span className="font-mono text-[#b3261e]">{Number(locationForm.latitude).toFixed(4)}, {Number(locationForm.longitude).toFixed(4)}</span>
                  </p>
                  <p className="text-[11px] text-[#6a675f]">Drag pin or click map to adjust position</p>
                </div>
              </div>
              <LeafletMap
                center={[locationForm.latitude, locationForm.longitude]}
                markerPosition={[locationForm.latitude, locationForm.longitude]}
                radius={Number(locationForm.serviceRadius || 10)}
                useCustomRedIcon={true}
                interactive={true}
                height="260px"
                circleColor="#b3261e"
                circleFillColor="#b3261e"
                onPositionChange={(lat, lng) => setLocationForm((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
              />
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setIsEditingLocation(false)} className="px-4 py-2 text-xs font-bold text-[#6a675f] hover:text-[#1a1a18] transition">Cancel</button>
                <button type="submit" disabled={savingLocation} className="px-4 py-2 rounded-xl bg-[#b3261e] hover:bg-[#9c2019] text-white text-xs font-bold flex items-center gap-2 transition">
                  <Save className="w-3.5 h-3.5" /> {savingLocation ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== FULL-WIDTH PROFESSIONAL SERVICE OFFERINGS MANAGER ===== */}
      <ServiceManager
        services={myServices}
        setServices={setMyServices}
        categories={categories}
        user={user}
        loading={loadingServices}
        title="Service Offerings & Catalog"
        subtitle="Add, edit, duplicate, pause, preview, or delete the services customers can book from you."
        defaultView="table"
        externalAddOpen={addServiceModalOpen}
        onExternalAddClose={() => setAddServiceModalOpen(false)}
      />

      {/* ===== OPERATIONS GRID (BOOKINGS, LOCATION, REVIEWS, NOTIFICATIONS) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Pending Requests + Upcoming Bookings */}
        <div className="lg:col-span-2 space-y-6">
          {totalPending > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-[#1a1a18] flex items-center gap-2">
                  <span>Incoming Requests</span>
                  <span className="bg-[#b3261e] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{totalPending}</span>
                </h2>
              </div>
              <div className="space-y-3">
                {pendingBookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setDetailModal({ item: b, type: 'booking' })}
                    className="bg-white p-4 rounded-2xl border border-[#dedad0] shadow-xs hover:border-[#b3261e]/40 hover:shadow-md cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-[#ebe8df] text-[#1a1a18] text-[10px] uppercase font-bold px-2 py-0.5 rounded">Booking</span>
                        <span className="text-xs text-[#6a675f] font-mono">#{b.id}</span>
                      </div>
                      <h3 className="font-bold text-[#1a1a18]">{b.serviceName}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6a675f]">
                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {b.customerName}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {b.date} {b.time}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {typeof b.address === 'string' ? b.address.split(',')[0] : b.address?.street || 'N/A'}</span>
                        <span className="font-bold text-emerald-700 font-mono">₹{b.total}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setDetailModal({ item: b, type: 'booking' })}
                        className="bg-[#f7f5f0] border border-[#dedad0] text-[#1a1a18] hover:bg-[#ebe8df] px-3 py-1.5 rounded-xl text-xs font-bold transition">
                        Details
                      </button>
                      <button onClick={() => handleAcceptBooking(b.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition">
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button onClick={() => handleRejectBooking(b.id)}
                        className="bg-white border border-[#dedad0] text-[#6a675f] hover:bg-[#f7f5f0] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition">
                        <X className="w-3.5 h-3.5" /> Decline
                      </button>
                    </div>
                  </div>
                ))}
                {pendingCustomRequests.map((r) => (
                  <div
                    key={r._id}
                    onClick={() => setDetailModal({ item: r, type: 'custom' })}
                    className="bg-white p-4 rounded-2xl border border-[#dedad0] shadow-xs hover:border-[#b3261e]/40 hover:shadow-md cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-[#b3261e]/10 text-[#b3261e] text-[10px] uppercase font-bold px-2 py-0.5 rounded">Custom Request</span>
                        {r.pincodeMatch && <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">Same PIN {r.location?.pincode || ''}</span>}
                        {r.distanceKm !== null && r.distanceKm !== undefined && <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded">{r.distanceKm} km</span>}
                        {r.budget && <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded font-mono">Budget: ₹{r.budget}</span>}
                      </div>
                      <h3 className="font-bold text-[#1a1a18]">{r.serviceTitle || 'Custom Service'}</h3>
                      <p className="text-xs text-[#6a675f] line-clamp-1">{r.description}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6a675f]">
                        <span>{r.location?.address?.split(',')[0]}</span>
                        <span>{r.date} {r.time}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setDetailModal({ item: r, type: 'custom' })}
                        className="bg-[#f7f5f0] border border-[#dedad0] text-[#1a1a18] hover:bg-[#ebe8df] px-3 py-1.5 rounded-xl text-xs font-bold transition">
                        Details
                      </button>
                      <button onClick={() => handleCustomRequestAction(r._id, 'accept')}
                        className="bg-[#b3261e] hover:bg-[#9c2019] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition">
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button onClick={() => handleCustomRequestAction(r._id, 'decline')}
                        className="bg-white border border-[#dedad0] text-[#6a675f] hover:bg-[#f7f5f0] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition">
                        <X className="w-3.5 h-3.5" /> Ignore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Upcoming Bookings */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-[#1a1a18] flex items-center gap-2">
                <Clock className="text-[#b3261e] w-4 h-4" /> Upcoming Appointments ({upcomingBookings.length})
              </h2>
              <Link to="/provider/bookings" className="text-xs font-bold text-[#b3261e] hover:underline">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingBookings.length > 0 ? upcomingBookings.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setDetailModal({ item: b, type: 'booking' })}
                  className="bg-white p-4 rounded-2xl border border-[#dedad0] shadow-xs hover:border-[#b3261e]/40 hover:shadow-md cursor-pointer transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-[#1a1a18] text-sm">{b.serviceName}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${statusColors[b.status] || 'bg-slate-100 text-slate-600'}`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#6a675f] mt-2">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-semibold text-[#1a1a18]">{b.customerName}</span>
                          {b.customerPhone && <span>{b.customerPhone}</span>}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {b.date} at {b.time}
                        </span>
                        <span className="flex items-center gap-1.5 sm:col-span-2">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-[#b3261e]" />
                          {typeof b.address === 'string' ? b.address : b.address?.formattedAddress || b.address?.street || 'Address not provided'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-extrabold text-[#1a1a18] font-mono">₹{b.finalTotal || b.total}</p>
                      <p className="text-[10px] text-[#6a675f] capitalize">{b.paymentMethod}</p>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="bg-white p-8 rounded-2xl border border-[#dedad0] text-center">
                  <Clock className="w-8 h-8 text-[#dedad0] mx-auto" />
                  <p className="text-[#6a675f] text-xs mt-2">No upcoming appointments scheduled right now.</p>
                  {!isAvailable && (
                    <p className="text-xs text-amber-700 mt-1">Turn ON your availability toggle above to receive live requests.</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* RIGHT SIDEBAR: Location + Reviews + Notifications */}
        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-[#dedad0] shadow-xs p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-[#1a1a18] text-sm flex items-center gap-2">
                  <MapPin className="text-[#b3261e] w-4 h-4" /> My Base Location
                </h3>
                <p className="text-xs text-[#6a675f] mt-1">
                  {user?.address?.city || user?.city || 'Not set'}
                  {user?.address?.pincode ? ` · PIN ${user.address.pincode}` : ''}
                </p>
                <p className="text-xs text-[#6a675f] mt-0.5">
                  Coverage: <span className="font-bold text-[#1a1a18]">{user?.serviceRadius || 10} km</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingLocation(!isEditingLocation)}
                className="text-xs font-bold text-[#b3261e] hover:bg-[#ebe8df] px-2.5 py-1.5 rounded-lg transition shrink-0"
              >
                {isEditingLocation ? 'Close' : 'Edit Pin'}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-[#dedad0] shadow-xs p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#1a1a18] text-sm flex items-center gap-2">
                <Star className="text-amber-400 w-4 h-4 fill-amber-400" /> Recent Reviews
              </h3>
              <Link to="/provider/reviews" className="text-xs font-bold text-[#b3261e] hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {recentReviews.length > 0 ? recentReviews.map((review, i) => (
                <div key={i} className="p-3 bg-[#f7f5f0] rounded-xl border border-[#ebe8df]">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-[#1a1a18]">{review.customerId?.name || 'Customer'}</p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={`text-xs ${s <= review.rating ? 'text-amber-400' : 'text-[#dedad0]'}`}>★</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-[#6a675f] line-clamp-2">{review.comment || review.reviewText}</p>
                </div>
              )) : (
                <p className="text-xs text-[#6a675f] text-center py-4">No reviews yet. Complete bookings to earn ratings.</p>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-[#dedad0] shadow-xs p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#1a1a18] text-sm flex items-center gap-2">
                <Bell className="text-[#b3261e] w-4 h-4" /> Notifications
                {unreadNotifCount > 0 && (
                  <span className="bg-[#b3261e] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadNotifCount}</span>
                )}
              </h3>
              <Link to="/provider/notifications" className="text-xs font-bold text-[#b3261e] hover:underline">View all</Link>
            </div>
            <div className="space-y-2.5 max-h-72 overflow-y-auto no-scrollbar">
              {notifications.slice(0, 6).length > 0 ? notifications.slice(0, 6).map((n) => {
                const reqId = n.relatedId || n.metadata?.requestId;
                const canRespond = n.type === 'CUSTOM_REQUEST' && n.actionStatus === 'pending' && Boolean(reqId);
                return (
                  <div key={n._id} className={`p-3 rounded-xl text-xs ${!n.read ? 'bg-[#ebe8df] border border-[#dedad0]' : 'bg-[#f7f5f0]'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-[#1a1a18]">{n.title}</p>
                      {(n.actionStatus === 'accepted' || n.actionStatus === 'declined') && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          n.actionStatus === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {n.actionStatus}
                        </span>
                      )}
                    </div>
                    <p className="text-[#6a675f] mt-0.5 line-clamp-2">{n.message}</p>
                    {canRespond && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleCustomRequestAction(reqId, 'accept')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#b3261e] hover:bg-[#9c2019] text-white text-[11px] font-bold transition"
                        >
                          <Check className="w-3 h-3" /> Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCustomRequestAction(reqId, 'decline')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#dedad0] hover:bg-[#f7f5f0] text-[#1a1a18] text-[11px] font-bold transition"
                        >
                          <X className="w-3 h-3" /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                );
              }) : (
                <p className="text-xs text-[#6a675f] text-center py-3">No notifications.</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;
