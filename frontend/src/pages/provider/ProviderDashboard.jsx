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
  Trash2,
  Phone,
  Calendar,
  Plus,
  Edit,
  Ban,
  CheckCircle2,
  ChevronRight,
  User as UserIcon,
  DollarSign,
  Wallet,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LeafletMap from '../../components/common/LeafletMap';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000';

const StatCard = ({ title, value, subtitle, icon: Icon, color, index }) => {
  const badgeStyles = {
    blue: 'bg-sky-50 text-[#0284C7] border-sky-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${badgeStyles[color] || badgeStyles.blue}`}>
          {Icon && <Icon className="w-5 h-5 stroke-[1.8]" />}
        </div>
      </div>
    </motion.div>
  );
};

const ProviderDashboard = () => {
  const { user, updateProviderSettings, updateUser } = useAuth();
  const [stats, setStats] = useState({ totalBookings: 0, completedJobs: 0, thisMonthEarnings: 0, avgRating: 0, pendingBookings: 0, activeBookings: 0 });
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pendingCustomRequests, setPendingCustomRequests] = useState([]);

  // Location state
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({
    street: user?.address?.street || '',
    locality: user?.address?.locality || '',
    city: user?.address?.city || user?.city || 'Haldwani',
    state: user?.address?.state || 'Uttarakhand',
    pincode: user?.address?.pincode || '',
    latitude: user?.address?.latitude || user?.location?.coordinates?.[1] || 29.3803,
    longitude: user?.address?.longitude || user?.location?.coordinates?.[0] || 79.5126,
    serviceRadius: user?.serviceRadius || 10,
  });
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  useEffect(() => {
    if (user) {
      setLocationForm(prev => ({
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
    // Stats
    try {
      const res = await fetch(`${API}/api/providers/me/stats`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) { console.error('Stats error', e); }

    // Bookings
    try {
      const res = await fetch(`${API}/api/bookings?mode=provider`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setPendingBookings(data.bookings.filter(b => b.status === 'pending'));
        setUpcomingBookings(
          data.bookings.filter(b => ['confirmed', 'upcoming', 'ongoing'].includes(b.status))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5)
        );
      }
    } catch (e) { console.error('Bookings error', e); }

    // My Services
    try {
      const res = await fetch(`${API}/api/services/me`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setMyServices(data.services || []);
    } catch (e) { console.error('Services error', e); }

    // Reviews
    try {
      const res = await fetch(`${API}/api/providers/me/reviews`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setRecentReviews((data.reviews || []).slice(0, 3));
    } catch (e) { /* Reviews model may not exist yet */ }

    // Notifications
    try {
      const res = await fetch(`${API}/api/notifications`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setNotifications(data.notifications || []);
    } catch (e) { console.error('Notifications error', e); }

    // Custom Requests
    try {
      const res = await fetch(`${API}/api/custom-requests?mode=provider`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const myId = (user?.id || user?._id)?.toString();
        const unhandled = (data.requests || []).filter(r => {
          const isAccepted = (r.acceptedProviders?.some(p => (p._id || p)?.toString() === myId)) ||
            (r.selectedProviderId && (r.selectedProviderId._id || r.selectedProviderId)?.toString() === myId);
          const isDeclined = r.declinedProviders?.some(p => (p._id || p)?.toString() === myId);
          return (r.status === 'PENDING' || r.status === 'pending') && !isAccepted && !isDeclined;
        });
        setPendingCustomRequests(unhandled);
      }
    } catch (e) { console.error('Custom requests error', e); }
  };

  useEffect(() => { loadDashboardData(); }, [user]);

  const handleToggleAvailability = async (e) => {
    const newValue = e.target.checked;
    const hasValidLocation = user?.location?.coordinates &&
      (user.location.coordinates[0] !== 0 || user.location.coordinates[1] !== 0);
    if (newValue && !hasValidLocation) {
      toast.error('Please save your service location before turning on availability.');
      setIsEditingLocation(true);
      return;
    }
    setTogglingAvailability(true);
    try {
      const res = await updateProviderSettings({ openToCustomRequests: newValue });
      if (res.success) toast.success(newValue ? '🟢 You are now Online & accepting requests!' : '🔴 You are now Offline.');
    } catch (err) {
      toast.error(err.message || 'Failed to update availability');
    } finally { setTogglingAvailability(false); }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    toast.loading('Detecting GPS location...', { id: 'geo' });
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      try {
        const res = await fetch(`${API}/api/location/reverse-geocode`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: lat, longitude: lng })
        });
        const data = await res.json();
        setLocationForm(prev => ({
          ...prev, latitude: lat, longitude: lng,
          city: data.city || data.locality || prev.city,
          locality: data.locality || prev.locality,
          street: data.formattedAddress || prev.street,
          pincode: data.pincode || prev.pincode,
        }));
        toast.success('Location detected!', { id: 'geo' });
      } catch (e) {
        setLocationForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
        toast.success(`GPS coordinates captured`, { id: 'geo' });
      }
    }, () => toast.error('Could not get GPS location', { id: 'geo' }));
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    setSavingLocation(true);
    try {
      const res = await fetch(`${API}/api/location/provider`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          latitude: Number(locationForm.latitude), longitude: Number(locationForm.longitude),
          street: locationForm.street, locality: locationForm.locality,
          city: locationForm.city, state: locationForm.state, pincode: locationForm.pincode,
          serviceRadius: Number(locationForm.serviceRadius),
          formattedAddress: `${locationForm.street || ''} ${locationForm.locality || ''} ${locationForm.city}, ${locationForm.state} ${locationForm.pincode}`.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('✅ Location saved!');
        setIsEditingLocation(false);
        if (updateUser) updateUser(data.user);
        loadDashboardData();
      } else toast.error(data.message || 'Failed to save location');
    } catch (e) { toast.error('Network error saving location'); }
    finally { setSavingLocation(false); }
  };

  const handleAcceptBooking = async (id) => {
    setPendingBookings(prev => prev.filter(b => b.id !== id));
    try {
      const res = await fetch(`${API}/api/bookings/${id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ status: 'confirmed', mode: 'provider' })
      });
      const data = await res.json();
      if (data.success) { toast.success('Booking accepted!'); loadDashboardData(); }
      else throw new Error(data.message);
    } catch (e) { toast.error('Failed to accept booking'); loadDashboardData(); }
  };

  const handleRejectBooking = async (id) => {
    setPendingBookings(prev => prev.filter(b => b.id !== id));
    try {
      const res = await fetch(`${API}/api/bookings/${id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ status: 'cancelled', mode: 'provider' })
      });
      const data = await res.json();
      if (data.success) { toast.success('Booking declined'); loadDashboardData(); }
    } catch (e) { toast.error('Failed to decline booking'); loadDashboardData(); }
  };

  const handleCustomRequestAction = async (id, action) => {
    setPendingCustomRequests(prev => prev.filter(r => r._id !== id));
    try {
      const res = await fetch(`${API}/api/custom-requests/${id}/${action}`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        toast.success(action === 'accept' ? 'Custom request accepted!' : 'Request ignored');
        loadDashboardData();
      }
    } catch (e) { loadDashboardData(); }
  };

  const handleToggleService = async (serviceId, currentStatus) => {
    setMyServices(prev => prev.map(s => s._id === serviceId ? { ...s, isActive: !currentStatus } : s));
    try {
      const res = await fetch(`${API}/api/services/${serviceId}/toggle`, { method: 'PUT', credentials: 'include' });
      const data = await res.json();
      if (!data.success) {
        setMyServices(prev => prev.map(s => s._id === serviceId ? { ...s, isActive: currentStatus } : s));
        toast.error('Failed to toggle service');
      }
    } catch (e) {
      setMyServices(prev => prev.map(s => s._id === serviceId ? { ...s, isActive: currentStatus } : s));
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      const res = await fetch(`${API}/api/services/${serviceId}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMyServices(prev => prev.filter(s => s._id !== serviceId));
        toast.success('Service deleted');
      } else toast.error(data.message || 'Failed to delete');
    } catch (e) { toast.error('Failed to delete service'); }
  };

  const isAvailable = user?.openToCustomRequests || false;
  const hasSavedLocation = user?.location?.coordinates &&
    (user.location.coordinates[0] !== 0 || user.location.coordinates[1] !== 0);
  const totalPending = pendingBookings.length + pendingCustomRequests.length;
  const unreadNotifCount = notifications.filter(n => !n.read).length;

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
      {user?.verificationStatus === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="mt-0.5 text-amber-600 shrink-0 w-5 h-5" />
          <div className="text-sm">
            <p className="font-bold">Profile Under Verification</p>
            <p className="mt-0.5 text-amber-700">Your provider account is currently pending verification. You can update your profile and add services, but they won't be visible to customers until approved.</p>
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

      {/* ===== HEADER: Welcome + Online Toggle + Add Service ===== */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0F1D33] tracking-tight">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">Here is your business overview and incoming job requests.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Online/Offline Toggle — Prominent */}
          <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all duration-300 ${isAvailable
            ? 'bg-emerald-50 border-emerald-200 shadow-xs'
            : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${isAvailable ? 'text-emerald-700' : 'text-slate-500'}`}>
                {isAvailable ? 'Online' : 'Offline'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isAvailable} onChange={handleToggleAvailability}
                disabled={togglingAvailability} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer
                peer-checked:after:translate-x-full peer-checked:after:border-white
                after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                after:bg-white after:border-slate-300 after:border after:rounded-full
                after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>

          <Link to="/provider/services"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl text-xs md:text-sm font-bold transition shadow-xs">
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </Link>
        </div>
      </motion.div>

      {/* Location Warning */}
      {!hasSavedLocation && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 w-5 h-5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Location not configured!</p>
            <p className="text-xs text-amber-600">Add your service base location so nearby customers can discover your services.</p>
          </div>
          <button onClick={() => setIsEditingLocation(true)}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-2xs">
            Configure Location
          </button>
        </motion.div>
      )}

      {/* ===== STATS CARDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Bookings" value={stats.totalBookings} subtitle="All time completed" icon={Calendar} color="blue" index={0} />
        <StatCard title="Completed Jobs" value={stats.completedJobs} subtitle="Successfully delivered" icon={Check} color="green" index={1} />
        <StatCard title="This Month" value={`₹${stats.thisMonthEarnings.toLocaleString()}`} subtitle="Gross earnings" icon={TrendingUp} color="purple" index={2} />
        <StatCard title="Avg Rating"
          value={stats.avgRating > 0 ? `★ ${stats.avgRating}` : '—'}
          subtitle={stats.totalReviews > 0 ? `${stats.totalReviews} reviews` : 'No reviews yet'}
          icon={Star} color="amber" index={3} />
      </div>

      {/* ===== Location Edit Panel ===== */}
      <AnimatePresence>
        {isEditingLocation && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md overflow-hidden space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="text-[#0EA5E9] w-4 h-4" /> Service Base Location
                </h3>
                <p className="text-xs text-slate-500">Set your operational base — customers within your radius will see your offerings.</p>
              </div>
              <button type="button" onClick={handleDetectLocation}
                className="px-3 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition">
                <Navigation className="w-3.5 h-3.5" /> Detect GPS
              </button>
            </div>
            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Street / Locality</label>
                  <input type="text" value={locationForm.street} onChange={e => setLocationForm({ ...locationForm, street: e.target.value })}
                    placeholder="e.g. Near Bus Stand, Mall Road" className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0EA5E9]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                  <input type="text" value={locationForm.city} onChange={e => setLocationForm({ ...locationForm, city: e.target.value })}
                    required className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0EA5E9]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pincode *</label>
                  <input type="text" value={locationForm.pincode} onChange={e => setLocationForm({ ...locationForm, pincode: e.target.value })}
                    required className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0EA5E9]" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Service Radius (km) *</label>
                  <input type="number" min="1" max="100" value={locationForm.serviceRadius}
                    onChange={e => setLocationForm({ ...locationForm, serviceRadius: e.target.value })}
                    required className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-[#0EA5E9]" />
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-slate-700 font-semibold">
                    📍 Coordinates: <span className="font-mono text-[#0284C7]">{Number(locationForm.latitude).toFixed(4)}, {Number(locationForm.longitude).toFixed(4)}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">Drag pin on map to adjust position</p>
                </div>
              </div>
              <LeafletMap
                center={[locationForm.latitude, locationForm.longitude]}
                markerPosition={[locationForm.latitude, locationForm.longitude]}
                radius={Number(locationForm.serviceRadius || 10)}
                useCustomRedIcon={true} interactive={true} height="280px"
                onPositionChange={(lat, lng) => setLocationForm(prev => ({ ...prev, latitude: lat, longitude: lng }))}
              />
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={() => setIsEditingLocation(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition">Cancel</button>
                <button type="submit" disabled={savingLocation} className="px-4 py-2 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-bold flex items-center gap-2 shadow-2xs transition">
                  <Save className="w-3.5 h-3.5" /> {savingLocation ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== MAIN GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Pending Requests + Upcoming Bookings */}
        <div className="lg:col-span-2 space-y-6">

          {/* Pending Incoming Requests */}
          {totalPending > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  📥 Incoming Requests
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{totalPending}</span>
                </h2>
              </div>
              <div className="space-y-3">
                {pendingBookings.map(b => (
                  <div key={b.id} className="bg-white p-4 rounded-2xl border border-sky-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-sky-100 text-[#0284C7] text-[10px] uppercase font-bold px-2 py-0.5 rounded">Booking</span>
                        <span className="text-xs text-slate-400">#{b.id}</span>
                      </div>
                      <h3 className="font-bold text-slate-900">{b.serviceName}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Phone className="text-slate-400 w-3.5 h-3.5" /> {b.customerName}</span>
                        <span className="flex items-center gap-1"><Calendar className="text-slate-400 w-3.5 h-3.5" /> {b.date} {b.time}</span>
                        <span className="flex items-center gap-1"><MapPin className="text-slate-400 w-3.5 h-3.5" /> {typeof b.address === 'string' ? b.address.split(',')[0] : b.address?.street || 'N/A'}</span>
                        <span className="font-bold text-emerald-600 font-mono">₹{b.total}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center shrink-0">
                      <button onClick={() => handleAcceptBooking(b.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition">
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button onClick={() => handleRejectBooking(b.id)}
                        className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition">
                        <X className="w-3.5 h-3.5" /> Decline
                      </button>
                    </div>
                  </div>
                ))}
                {pendingCustomRequests.map(r => (
                  <div key={r._id} className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-purple-100 text-purple-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Custom Request</span>
                        {r.budget && <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded font-mono">Budget: ₹{r.budget}</span>}
                      </div>
                      <h3 className="font-bold text-slate-900">{r.serviceTitle || 'Custom Service'}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{r.description}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>📍 {r.location?.address?.split(',')[0]}</span>
                        <span>📅 {r.date} {r.time}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center shrink-0">
                      <button onClick={() => handleCustomRequestAction(r._id, 'accept')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition">
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button onClick={() => handleCustomRequestAction(r._id, 'decline')}
                        className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition">
                        <X className="w-3.5 h-3.5" /> Ignore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Upcoming / Active Bookings */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="text-[#0EA5E9] w-4 h-4" /> Upcoming Bookings ({upcomingBookings.length})
              </h2>
              <Link to="/provider/bookings" className="text-xs font-semibold text-[#0284C7] hover:text-[#0369A1]">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingBookings.length > 0 ? upcomingBookings.map((b, i) => (
                <motion.div key={b.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-slate-900 text-sm">{b.serviceName}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${statusColors[b.status] || 'bg-slate-100 text-slate-600'}`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                        <span className="flex items-center gap-1.5">
                          <Phone className="text-slate-400 w-3.5 h-3.5 shrink-0" />
                          <span className="font-semibold text-slate-700">{b.customerName}</span>
                          {b.customerPhone && <span className="text-slate-400">{b.customerPhone}</span>}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="text-slate-400 w-3.5 h-3.5 shrink-0" />
                          {b.date} at {b.time}
                        </span>
                        <span className="flex items-center gap-1.5 sm:col-span-2">
                          <MapPin className="text-slate-400 w-3.5 h-3.5 shrink-0" />
                          {typeof b.address === 'string' ? b.address : b.address?.formattedAddress || b.address?.street || 'Address not provided'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-extrabold text-slate-900 font-mono">₹{b.finalTotal || b.total}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{b.paymentMethod}</p>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-slate-400 text-xs mt-2">No upcoming appointments scheduled right now.</p>
                  {!isAvailable && (
                    <p className="text-xs text-amber-600 mt-1">Turn ON your availability toggle to receive job requests.</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-5">
          {/* Location Status */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="text-[#0EA5E9] w-4 h-4" /> My Base Location
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {user?.address?.city || user?.city || 'Not set'}
                  {user?.address?.pincode ? ` - ${user.address.pincode}` : ''}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Radius: <span className="font-bold text-[#0284C7]">{user?.serviceRadius || 10} km</span></p>
              </div>
              <button onClick={() => setIsEditingLocation(!isEditingLocation)}
                className="text-xs font-bold text-[#0284C7] hover:text-[#0369A1] px-2.5 py-1 rounded-lg hover:bg-sky-50 transition">
                {isEditingLocation ? 'Close' : 'Edit Pin 📍'}
              </button>
            </div>
          </motion.div>

          {/* Recent Reviews */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Star className="text-amber-400 w-4 h-4 fill-amber-400" /> Recent Reviews
              </h3>
              <Link to="/provider/reviews" className="text-xs font-semibold text-[#0284C7] hover:text-[#0369A1]">View all</Link>
            </div>
            <div className="space-y-3">
              {recentReviews.length > 0 ? recentReviews.map((review, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-slate-800">{review.customerId?.name || 'Customer'}</p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} className={`text-xs ${s <= review.rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{review.comment}</p>
                </div>
              )) : (
                <p className="text-xs text-slate-400 text-center py-4">No reviews yet. Complete bookings to earn ratings.</p>
              )}
            </div>
          </motion.div>

          {/* My Services Quick Panel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Briefcase className="text-[#0EA5E9] w-4 h-4" /> My Services ({myServices.length})
              </h3>
              <Link to="/provider/services" className="text-xs font-semibold text-[#0284C7] hover:text-[#0369A1]">Manage</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {myServices.length > 0 ? myServices.map(service => (
                <div key={service._id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={service.image} alt={service.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{service.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">₹{service.price}{service.pricingType === 'hourly' ? '/hr' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleToggleService(service._id, service.isActive)}
                      className={`text-xs font-bold px-2 py-1 rounded-lg transition ${service.isActive
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      {service.isActive ? 'ON' : 'OFF'}
                    </button>
                    <button onClick={() => handleDeleteService(service._id)}
                      className="p-1.5 text-rose-400 hover:bg-rose-50 rounded-lg transition"
                      aria-label="Delete service">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="p-6 text-center">
                  <p className="text-xs text-slate-400">No services listed yet.</p>
                  <Link to="/provider/services" className="text-xs text-[#0284C7] font-semibold mt-1 inline-block">+ Add Service</Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Notifications Panel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Bell className="text-[#0EA5E9] w-4 h-4" /> Notifications
                {unreadNotifCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadNotifCount}</span>
                )}
              </h3>
              <Link to="/provider/notifications" className="text-xs font-semibold text-[#0284C7] hover:text-[#0369A1]">View all</Link>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
              {notifications.slice(0, 5).length > 0 ? notifications.slice(0, 5).map(n => (
                <div key={n._id} className={`p-2.5 rounded-xl text-xs ${!n.read ? 'bg-primary-50 border border-primary-100' : 'bg-gray-50'}`}>
                  <p className="font-bold text-gray-900">{n.title}</p>
                  <p className="text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              )) : (
                <p className="text-xs text-gray-400 text-center py-3">No notifications.</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;
