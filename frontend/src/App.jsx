import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { Component, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard,
  ClipboardList,
  Wallet,
  Star,
  User,
  Users,
  UserCheck,
  Package,
  Briefcase,
  Bell,
  MessageSquare,
  Menu,
  ArrowRight,
  Home as HomeIcon,
  HelpCircle,
  ShieldCheck,
  AlertCircle,
  PlusCircle
} from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { getDefaultRouteForUser, isApprovedProviderUser } from './utils/authRedirect';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Sidebar from './components/common/Sidebar';
import BrandLogo from './components/common/BrandLogo';
import { PageLoader } from './components/common/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Customer Pages
import Home from './pages/customer/Home';
import Services from './pages/customer/Services';
import ServiceDetail from './pages/customer/ServiceDetail';
import Booking from './pages/customer/Booking';
import MyBookings from './pages/customer/MyBookings';
import CustomerProfile from './pages/customer/CustomerProfile';
import MyAddresses from './pages/customer/MyAddresses';
import RequestCustomService from './pages/customer/RequestCustomService';
import MyCustomRequests from './pages/customer/MyCustomRequests';
import CustomRequestDetail from './pages/customer/CustomRequestDetail';

// Provider Pages
import ProviderDashboard from './pages/provider/ProviderDashboard';
import ProviderEarnings from './pages/provider/ProviderEarnings';
import ProviderBookings from './pages/provider/ProviderBookings';
import ProviderProfile from './pages/provider/ProviderProfile';
import ProviderServices from './pages/provider/ProviderServices';
import ProviderReviews from './pages/provider/ProviderReviews';
import ProviderNotifications from './pages/provider/ProviderNotifications';
import AddService from './pages/provider/AddService';
import ProviderCustomRequests from './pages/provider/ProviderCustomRequests';
import ProviderOnboarding from './pages/provider/ProviderOnboarding';
import ManageProviderApplications from './pages/admin/ManageProviderApplications';
import ManageProviders from './pages/admin/ManageProviders';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageServices from './pages/admin/ManageServices';
import AdminBookings from './pages/admin/AdminBookings';

// Static Customer Pages
import About from './pages/customer/About';
import Terms from './pages/customer/Terms';
import Help from './pages/customer/Help';

// Page transition wrapper
const PageTransition = ({ children }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Provider Layout Links with Lucide Icons
const providerLinks = [
  { to: '/provider', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/provider/services', label: 'My Services', icon: Briefcase },
  { to: '/provider/add-service', label: 'Add Service', icon: PlusCircle },
  { to: '/provider/bookings', label: 'Bookings', icon: ClipboardList },
  { to: '/provider/custom-requests', label: 'Custom Requests', icon: MessageSquare },
  { to: '/provider/earnings', label: 'Earnings', icon: Wallet },
  { to: '/provider/reviews', label: 'Reviews', icon: Star },
  { to: '/provider/notifications', label: 'Notifications', icon: Bell },
  { to: '/provider/profile', label: 'My Profile', icon: User },
];

const ProviderLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-[#f7f5f0] text-[#1a1a18]">
      <Sidebar links={providerLinks} title="Provider" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0">
        {/* Top Bar for provider */}
        <div className="sticky top-0 z-30 bg-[#f7f5f0]/90 backdrop-blur-md border-b border-[#dedad0] px-6 py-3.5 flex items-center justify-between lg:hidden shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-[#1a1a18] hover:bg-[#ebe8df] transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <BrandLogo size="sm" to="/provider" />
          <div className="w-9" />
        </div>
        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Admin Layout Links with Lucide Icons
const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Bookings', icon: ClipboardList },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/providers', label: 'Active Providers', icon: UserCheck },
  { to: '/admin/provider-applications', label: 'Applications', icon: Briefcase },
  { to: '/admin/services', label: 'Services', icon: Package },
];

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar links={adminLinks} title="Admin" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between lg:hidden shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" to="/admin" />
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              Admin
            </span>
          </div>
          <div className="w-9" />
        </div>
        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Public Layout
const PublicLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f5f0] text-[#1a1a18]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

// Landing route guard — providers always land on their dashboard, never customer Home
const HomeRoute = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated && isApprovedProviderUser(user)) {
    return <Navigate to="/provider" replace />;
  }
  return <Home />;
};

// Modern 404
const NotFound = () => {
  const { user } = useAuth();
  const fallbackRoute = getDefaultRouteForUser(user);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-8 md:p-10 rounded-2xl border border-slate-200/80 shadow-lg text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-sky-50 text-[#0284C7] mx-auto flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 stroke-[1.75]" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Error 404</span>
        <h1 className="text-3xl font-extrabold text-slate-900 mt-2 mb-3">Page not found</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          The page you are looking for might have been moved, removed, or is temporarily unavailable.
        </p>
        <Link
          to={fallbackRoute}
          className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-sm shadow-sm transition hover:shadow focus:ring-2 focus:ring-[#0EA5E9]/40"
        >
          <HomeIcon className="w-4 h-4" />
          <span>{fallbackRoute === '/provider' ? 'Return to Provider Dashboard' : 'Return to Home'}</span>
        </Link>
      </motion.div>
    </div>
  );
};

// Graceful fallback UI if an unexpected client rendering error occurs
class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected rendering error.' };
  }

  componentDidCatch(error, info) {
    console.error('UI ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f5f0] p-6 text-[#1a1a18]">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-[#dedad0] shadow-lg text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-[#b3261e] border border-rose-200 mx-auto flex items-center justify-center mb-5">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-extrabold text-[#1a1a18]">Something went wrong</h1>
            <p className="text-xs text-[#6a675f] mt-2 mb-6 leading-relaxed">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="w-full px-5 py-2.5 rounded-xl bg-[#b3261e] hover:bg-[#9c2019] text-white text-sm font-bold transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppErrorBoundary>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#ffffff',
              color: '#0F172A',
              boxShadow: '0 10px 25px -5px rgba(15,23,42,0.1), 0 8px 10px -6px rgba(15,23,42,0.05)',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '14px 18px',
              fontSize: '14px',
              fontWeight: '500',
            },
          }}
        />

        <Routes>
          {/* Auth Routes — no navbar */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Provider Routes */}
          <Route path="/provider" element={<ProtectedRoute allowedRoles={['provider']}><ProviderLayout /></ProtectedRoute>}>
            <Route index element={<ProviderDashboard />} />
            <Route path="bookings" element={<ProviderBookings />} />
            <Route path="services" element={<ProviderServices />} />
            <Route path="earnings" element={<ProviderEarnings />} />
            <Route path="profile" element={<ProviderProfile />} />
            <Route path="reviews" element={<ProviderReviews />} />
            <Route path="notifications" element={<ProviderNotifications />} />
            <Route path="add-service" element={<AddService />} />
            <Route path="custom-requests" element={<ProviderCustomRequests />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="providers" element={<ManageProviders />} />
            <Route path="provider-applications" element={<ManageProviderApplications />} />
            <Route path="services" element={<ManageServices />} />
          </Route>

          {/* Public + Customer Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:id" element={<ServiceDetail />} />
            
            {/* New Static Pages */}
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/help" element={<Help />} />

            {/* Protected customer routes */}
            <Route path="/booking" element={<ProtectedRoute allowedRoles={['customer']}><Booking /></ProtectedRoute>} />
            <Route path="/my-bookings" element={<ProtectedRoute allowedRoles={['customer']}><MyBookings /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute allowedRoles={['customer']}><CustomerProfile /></ProtectedRoute>} />
            <Route path="/provider-application" element={<ProtectedRoute allowedRoles={['customer']}><ProviderOnboarding /></ProtectedRoute>} />
            <Route path="/my-addresses" element={<ProtectedRoute allowedRoles={['customer']}><MyAddresses /></ProtectedRoute>} />
            
            {/* Custom Service Routes */}
            <Route path="/request-custom-service" element={<ProtectedRoute allowedRoles={['customer']}><RequestCustomService /></ProtectedRoute>} />
            <Route path="/my-custom-requests" element={<ProtectedRoute allowedRoles={['customer']}><MyCustomRequests /></ProtectedRoute>} />
            <Route path="/custom-requests/:id" element={<ProtectedRoute allowedRoles={['customer']}><CustomRequestDetail /></ProtectedRoute>} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </AppErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
