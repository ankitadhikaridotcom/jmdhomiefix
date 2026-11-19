import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  ClipboardList,
  Wallet,
  ArrowRight,
  TrendingUp,
  Briefcase,
  Package,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import StatsCard from '../../components/admin/StatsCard';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProviders: 0,
    totalBookings: 0,
    totalRevenue: 0,
    pendingProviders: 0,
    monthlyGrowth: 12.5,
    revenueGrowth: 8.4,
    recentRevenue: [
      { day: 'Mon', revenue: 0 },
      { day: 'Tue', revenue: 0 },
      { day: 'Wed', revenue: 0 },
      { day: 'Thu', revenue: 0 },
      { day: 'Fri', revenue: 0 },
      { day: 'Sat', revenue: 0 },
      { day: 'Sun', revenue: 0 },
    ],
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, bookingsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/bookings`, { credentials: 'include' }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.stats) {
          setStats(prev => ({
            ...prev,
            ...statsData.stats,
            recentRevenue: statsData.stats.recentRevenue || prev.recentRevenue,
          }));
        }
      }

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        if (bookingsData.success && Array.isArray(bookingsData.bookings)) {
          const list = bookingsData.bookings;
          setRecentBookings(list.slice(0, 5));

          // Aggregate top services from bookings
          const svcCounts = {};
          list.forEach(b => {
            const name = b.serviceName || b.service?.name || 'Home Maintenance';
            svcCounts[name] = (svcCounts[name] || 0) + 1;
          });
          const sortedServices = Object.entries(svcCounts)
            .map(([name, count]) => ({ name, bookings: count }))
            .sort((a, b) => b.bookings - a.bookings)
            .slice(0, 4);

          setTopServices(sortedServices);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const revenueList = stats.recentRevenue || [];
  const maxRevenue = Math.max(1, ...revenueList.map(d => d.revenue || 0));

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#0F1D33] tracking-tight">
          Admin Executive Workspace
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Platform-wide volume, revenue metrics, provider approvals, and service health.
        </p>
      </motion.div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Customers"
          value={stats.totalUsers.toLocaleString()}
          change={stats.monthlyGrowth}
          icon={Users}
          color="primary"
          index={0}
        />
        <StatsCard
          title="Active Providers"
          value={stats.totalProviders.toString()}
          change={8.2}
          icon={UserCheck}
          color="success"
          index={1}
        />
        <StatsCard
          title="Total Bookings"
          value={stats.totalBookings.toLocaleString()}
          change={12.5}
          icon={ClipboardList}
          color="warning"
          index={2}
        />
        <StatsCard
          title="Gross Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          change={stats.revenueGrowth}
          icon={Wallet}
          color="info"
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="text-[#0EA5E9] w-4 h-4" />
              <span>Revenue Trend (7-Day Rolling)</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">Daily platform volume</span>
          </div>

          <div className="flex items-end gap-3 sm:gap-4 h-52 pt-4">
            {revenueList.map((item, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(8, ((item.revenue || 0) / maxRevenue) * 100)}%` }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.4 }}
                className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
              >
                <span className="text-[10px] font-mono font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  ₹{item.revenue || 0}
                </span>
                <div
                  className="w-full bg-gradient-to-t from-[#0284C7] to-[#0EA5E9] rounded-t-xl transition-all duration-150 group-hover:from-[#0369A1] group-hover:to-[#0284C7] cursor-pointer shadow-2xs"
                  style={{ height: `${Math.max(12, ((item.revenue || 0) / maxRevenue) * 100)}%` }}
                />
                <span className="text-xs font-semibold text-slate-400 mt-1">{item.day}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions + Activity */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Quick Actions Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h2 className="font-bold text-slate-900 text-sm mb-4">Management Shortcuts</h2>
            <div className="space-y-2">
              <Link
                to="/admin/provider-applications"
                className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 hover:bg-amber-100/70 border border-amber-200/60 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-bold text-amber-900">Review Applications</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-800">
                    {stats.pendingProviders} pending
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>

              <Link
                to="/admin/providers"
                className="flex items-center justify-between p-3 rounded-xl bg-sky-50/70 hover:bg-sky-100/60 border border-sky-200/60 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-[#0284C7]" />
                  <span className="text-xs font-bold text-slate-800">Active Service Providers</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/admin/bookings"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold text-slate-800">All Booking Lifecycles</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                to="/admin/services"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold text-slate-800">Service Taxonomy Control</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Top Services */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h2 className="font-bold text-slate-900 text-sm mb-3">Top Requested Services</h2>
            <div className="space-y-2.5">
              {topServices.length > 0 ? (
                topServices.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-sky-50 text-[#0284C7] text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate">{s.name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500 shrink-0 ml-2">
                      {s.bookings} jobs
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No booking requests logged yet.</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Bookings Table */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 text-base">Latest Platform Bookings</h2>
          <Link
            to="/admin/bookings"
            className="text-xs font-bold text-[#0284C7] hover:underline"
          >
            View Complete Log &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[11px] tracking-wider">
                <th className="py-3 px-3">Order ID</th>
                <th className="py-3 px-3">Service Name</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentBookings.length > 0 ? (
                recentBookings.map((b) => (
                  <tr key={b.id || b._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-mono font-bold text-[#0284C7]">#{b.id || b._id?.slice(-6)}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{b.serviceName || b.service?.name || 'Service'}</td>
                    <td className="py-3 px-3">{b.customerName || b.customer?.name || 'Customer'}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 font-mono">₹{b.total || b.totalAmount || 0}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : b.status === 'ongoing'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-sky-50 text-[#0284C7] border border-sky-200'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No bookings logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
