import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  User,
  Menu,
  X,
  LogOut,
  Calendar,
  ChevronDown,
  Home as HomeIcon,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Sparkles,
  HelpCircle,
  Briefcase,
  CheckCheck,
  ArrowRight,
  ShieldCheck,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from './BrandLogo';

const Navbar = () => {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const providerApproved = user?.providerStatus === 'approved'
    || (user?.role === 'provider' && user?.verificationStatus === 'approved');

  // Live auto-complete suggestions
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/services?search=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.services)) {
          setSuggestions(data.services.slice(0, 5));
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Navbar search suggestion error:', err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchNotifications = async () => {
        try {
          const res = await fetch('http://localhost:5000/api/notifications', { credentials: 'include' });
          const data = await res.json();
          if (data.success) {
            setNotifications(data.notifications || []);
          }
        } catch (e) {
          console.error('Failed to fetch notifications', e);
        }
      };
      fetchNotifications();
    }
  }, [isAuthenticated, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setNotifOpen(false);
    setShowSuggestions(false);
  }, [location.pathname]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const markAsRead = async (id, link) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: 'PUT',
        credentials: 'include'
      });
      setNotifications(prev => prev.map(n => n._id === id || n.id === id ? { ...n, read: true } : n));
      if (link) navigate(link);
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  };

  const isAdminOrProvider = user?.role === 'admin' || user?.role === 'provider';
  const isOnDashboardRoute = location.pathname.startsWith('/provider') || location.pathname.startsWith('/admin');
  if (loading) return <div className="h-16 md:h-18" />;
  if (isAdminOrProvider && isAuthenticated && isOnDashboardRoute) return null;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18 gap-4">
            {/* Logo */}
            <BrandLogo size="sm" />

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6 ml-4">
              <Link
                to="/"
                className={`text-sm font-semibold transition-colors duration-150 ${
                  location.pathname === '/' ? 'text-[#0284C7]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Home
              </Link>
              <Link
                to="/services"
                className={`text-sm font-semibold transition-colors duration-150 ${
                  location.pathname === '/services' ? 'text-[#0284C7]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Services
              </Link>
              <Link
                to="/about"
                className={`text-sm font-semibold transition-colors duration-150 ${
                  location.pathname === '/about' ? 'text-[#0284C7]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                About
              </Link>
              <Link
                to="/help"
                className={`text-sm font-semibold transition-colors duration-150 ${
                  location.pathname === '/help' ? 'text-[#0284C7]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Help
              </Link>
            </div>

            {/* Omni Search Bar — Desktop */}
            <form onSubmit={handleSearch} ref={searchRef} className="hidden md:flex items-center flex-1 max-w-lg mx-4 relative">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  placeholder="Search services (e.g. Electrician, AC Repair, Cleaning)..."
                  className="w-full pl-11 pr-10 py-2.5 rounded-full bg-slate-100/80 border border-slate-200/60
                           focus:bg-white focus:border-[#0EA5E9] focus:ring-4 focus:ring-[#0EA5E9]/15
                           text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label="Clear search input"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Live Dropdown Suggestions */}
              <AnimatePresence>
                {showSuggestions && searchQuery.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50 py-2"
                  >
                    {suggestions.length > 0 ? (
                      <div>
                        <div className="px-4 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Matching Services</span>
                          <span className="text-[10px] text-slate-400">{suggestions.length} results</span>
                        </div>
                        {suggestions.map((svc) => (
                          <button
                            key={svc.id || svc._id}
                            type="button"
                            onClick={() => {
                              setShowSuggestions(false);
                              setSearchQuery('');
                              navigate(`/services/${svc.id || svc._id}`);
                            }}
                            className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#0284C7] flex items-center justify-center shrink-0 group-hover:bg-[#0EA5E9] group-hover:text-white transition-colors">
                                <Search className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[#0284C7] transition-colors">
                                  {svc.name}
                                </p>
                                <p className="text-xs text-slate-400 capitalize">{svc.category}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-slate-700 font-mono shrink-0 ml-3 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                              ₹{svc.price || svc.fixedPrice || svc.basePrice || 0}
                            </span>
                          </button>
                        ))}
                        <div className="border-t border-slate-100 mt-1 pt-1">
                          <button
                            type="button"
                            onClick={handleSearch}
                            className="w-full px-4 py-2 text-xs font-semibold text-[#0284C7] hover:bg-sky-50 text-left flex items-center justify-between"
                          >
                            <span>Search all results for &ldquo;{searchQuery}&rdquo;</span>
                            <span className="text-[10px] font-mono text-slate-400">↵ Enter</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-5 text-center">
                        <p className="text-sm text-slate-600 font-medium">No services matching &ldquo;{searchQuery}&rdquo;</p>
                        <p className="text-xs text-slate-400 mt-1">Press Enter to search all catalog items</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {/* Right Section Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {!isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:shadow focus:ring-2 focus:ring-[#0EA5E9]/40"
                  >
                    Get Started
                  </Link>
                </div>
              ) : (
                <>
                  {/* Notifications Flyout */}
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={async () => {
                        const opening = !notifOpen;
                        setNotifOpen(opening);
                        setProfileOpen(false);
                        if (opening && unreadCount > 0) {
                          try {
                            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                            await fetch('http://localhost:5000/api/notifications/read-all', {
                              method: 'PUT',
                              credentials: 'include'
                            });
                          } catch (e) {
                            console.error('Failed to mark all as read', e);
                          }
                        }
                      }}
                      className="relative p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      aria-label="Notifications"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute 1 top-1.5 right-1.5 w-4 h-4 bg-[#FF7A1A] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {notifOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-80 md:w-88 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50"
                        >
                          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                              <span className="text-[11px] font-semibold text-[#0284C7] bg-sky-50 px-2 py-0.5 rounded-full">
                                {unreadCount} new
                              </span>
                            )}
                          </div>
                          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                            {notifications.length > 0 ? (
                              notifications.map((n) => (
                                <div
                                  key={n._id || n.id}
                                  onClick={() => markAsRead(n._id || n.id, n.link)}
                                  className={`flex items-start gap-3 p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                                    !n.read ? 'bg-sky-50/40' : ''
                                  }`}
                                >
                                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#0284C7] flex items-center justify-center shrink-0 text-sm">
                                    <Bell className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs md:text-sm ${!n.read ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                                      {n.message}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-1">{n.time || 'Recently'}</p>
                                  </div>
                                  {!n.read && <span className="w-2 h-2 bg-[#0EA5E9] rounded-full shrink-0 mt-1.5" />}
                                </div>
                              ))
                            ) : (
                              <div className="p-8 text-center text-slate-400">
                                <CheckCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-xs">All caught up! No notifications.</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Profile Menu */}
                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                      className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl hover:bg-slate-100 transition-colors"
                      aria-label="User menu"
                    >
                      {user?.profileImage || user?.avatar ? (
                        <img
                          src={user.profileImage || user.avatar}
                          alt={user.name}
                          className="w-8 h-8 rounded-xl object-cover ring-2 ring-slate-100"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#0284C7] flex items-center justify-center text-xs font-bold ring-2 ring-slate-100">
                          {user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="hidden sm:inline text-xs font-semibold text-slate-700 max-w-[100px] truncate">
                        {user.name?.split(' ')[0]}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50"
                        >
                          {/* User Header */}
                          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-bold text-slate-900 text-sm truncate">{user.name}</p>
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase tracking-wider ${
                                providerApproved
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : user.role === 'admin'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-sky-50 text-sky-700 border-sky-200'
                              }`}>
                                {providerApproved ? 'Provider' : user.role === 'admin' ? 'Admin' : 'Customer'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{user.email}</p>
                          </div>

                          {/* Links */}
                          <div className="p-2 space-y-0.5 text-sm">
                            {user?.role !== 'admin' && (
                              <>
                                <Link
                                  to="/profile"
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition-colors"
                                >
                                  <User className="w-4 h-4 text-slate-400" />
                                  <span>My Profile</span>
                                </Link>

                                {providerApproved ? (
                                  <Link
                                    to="/provider"
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#0284C7] bg-sky-50/60 hover:bg-sky-50 font-semibold transition-colors"
                                  >
                                    <LayoutDashboard className="w-4 h-4 text-[#0EA5E9]" />
                                    <span>Provider Dashboard</span>
                                  </Link>
                                ) : (
                                  <Link
                                    to="/provider-application"
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-emerald-700 bg-emerald-50/60 hover:bg-emerald-50 font-semibold transition-colors"
                                  >
                                    <Sparkles className="w-4 h-4 text-emerald-500" />
                                    <span>
                                      {user?.providerStatus === 'pending'
                                        ? 'Application Pending'
                                        : 'Become a Partner'}
                                    </span>
                                  </Link>
                                )}
                              </>
                            )}

                            {user?.role === 'customer' && (
                              <>
                                <Link
                                  to="/my-bookings"
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition-colors"
                                >
                                  <Calendar className="w-4 h-4 text-slate-400" />
                                  <span>My Bookings</span>
                                </Link>
                                <Link
                                  to="/my-addresses"
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition-colors"
                                >
                                  <MapPin className="w-4 h-4 text-slate-400" />
                                  <span>Saved Addresses</span>
                                </Link>
                                <Link
                                  to="/my-custom-requests"
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition-colors"
                                >
                                  <Sparkles className="w-4 h-4 text-[#FF7A1A]" />
                                  <span>Custom Requests</span>
                                </Link>
                              </>
                            )}

                            {user?.role === 'provider' && (
                              <>
                                <Link
                                  to="/provider"
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition-colors"
                                >
                                  <LayoutDashboard className="w-4 h-4 text-slate-400" />
                                  <span>Dashboard</span>
                                </Link>
                                <Link
                                  to="/provider/bookings"
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition-colors"
                                >
                                  <Calendar className="w-4 h-4 text-slate-400" />
                                  <span>Bookings Queue</span>
                                </Link>
                              </>
                            )}

                            {user?.role === 'admin' && (
                              <Link
                                to="/admin"
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition-colors"
                              >
                                <LayoutDashboard className="w-4 h-4 text-slate-400" />
                                <span>Admin Dashboard</span>
                              </Link>
                            )}
                          </div>

                          {/* Sign out */}
                          <div className="border-t border-slate-100 p-2">
                            <button
                              onClick={handleLogout}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-semibold w-full text-left transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
                              <span>Sign out</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-white z-50 shadow-2xl md:hidden flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <BrandLogo size="sm" />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="p-4 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search services..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#0EA5E9]/30"
                  />
                </div>
              </form>

              {/* Mobile Navigation Links */}
              <div className="p-4 space-y-1 flex-1 overflow-y-auto">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 p-3 mb-3 bg-slate-50 border border-slate-100 rounded-xl">
                      {user?.profileImage ? (
                        <img src={user.profileImage} alt="" className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#0284C7] flex items-center justify-center font-bold text-sm">
                          {user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{providerApproved ? 'Provider Approved' : user.role}</p>
                      </div>
                    </div>

                    <Link to="/" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-semibold">
                      <HomeIcon className="w-4 h-4 text-slate-400" />
                      <span>Home</span>
                    </Link>
                    <Link to="/services" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-semibold">
                      <Search className="w-4 h-4 text-slate-400" />
                      <span>All Services</span>
                    </Link>
                    <Link to="/about" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-semibold">
                      <Info className="w-4 h-4 text-slate-400" />
                      <span>About Us</span>
                    </Link>
                    <Link to="/help" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-semibold">
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>Help & FAQs</span>
                    </Link>

                    {user?.role === 'customer' && (
                      <>
                        <Link to="/my-bookings" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-semibold">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>My Bookings</span>
                        </Link>
                        <Link to="/my-addresses" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-semibold">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>My Addresses</span>
                        </Link>
                        <Link to="/profile" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-semibold">
                          <User className="w-4 h-4 text-slate-400" />
                          <span>Profile</span>
                        </Link>
                        {providerApproved ? (
                          <Link to="/provider" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-sky-50 text-[#0284C7] text-sm font-bold">
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Provider Dashboard</span>
                          </Link>
                        ) : (
                          <Link to="/provider-application" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-bold">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <span>{user?.providerStatus === 'pending' ? 'Track Application' : 'Become a Partner'}</span>
                          </Link>
                        )}
                      </>
                    )}

                    <div className="pt-4 border-t border-slate-100 mt-4">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-sm font-bold w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link to="/" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-semibold">
                      <HomeIcon className="w-4 h-4 text-slate-400" />
                      <span>Home</span>
                    </Link>
                    <Link to="/services" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-semibold">
                      <Search className="w-4 h-4 text-slate-400" />
                      <span>All Services</span>
                    </Link>
                    <Link to="/about" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-semibold">
                      <Info className="w-4 h-4 text-slate-400" />
                      <span>About Us</span>
                    </Link>
                    <Link to="/help" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-semibold">
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>Help & FAQs</span>
                    </Link>
                    <div className="pt-4 space-y-2">
                      <Link to="/login" className="block w-full py-2.5 text-center font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition">
                        Log in
                      </Link>
                      <Link to="/register" className="block w-full py-2.5 text-center font-bold text-sm bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl shadow-xs transition">
                        Create Account
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      {isAuthenticated && user?.role === 'customer' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-40 md:hidden shadow-lg">
          <div className="flex items-center justify-around py-2">
            {[
              { to: '/', icon: HomeIcon, label: 'Home' },
              { to: '/services', icon: Search, label: 'Services' },
              { to: '/my-bookings', icon: ClipboardList, label: 'Bookings' },
              { to: '/profile', icon: User, label: 'Profile' },
            ].map((item) => {
              const isActive = location.pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
                    isActive ? 'text-[#0284C7]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                  <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="h-16 md:h-18" />
    </>
  );
};

export default Navbar;
