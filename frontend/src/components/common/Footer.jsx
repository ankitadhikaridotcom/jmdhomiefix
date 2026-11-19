import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  Heart,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Award,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from './BrandLogo';

const Footer = () => {
  const { isAuthenticated, user } = useAuth();
  const [categories, setCategories] = useState([]);
  const providerApproved = user?.providerStatus === 'approved'
    || (user?.role === 'provider' && user?.verificationStatus === 'approved');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/service-categories`)
      .then((response) => response.json())
      .then((data) => data.success && setCategories(data.categories || []))
      .catch((error) => console.error('Failed to load footer categories', error));
  }, []);

  return (
    <footer className="relative bg-[#0F172A] text-slate-300 overflow-hidden pt-16 pb-10 border-t border-slate-800">
      {/* Subtle Glow Accents */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-[#0EA5E9]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-[#FF7A1A]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 pb-14 border-b border-slate-800/80">

          {/* Column 1: Brand Info */}
          <div className="space-y-5">
            <BrandLogo size="md" artwork />
            <p className="text-sm text-slate-400 leading-relaxed">
              Your trusted marketplace for verified, high-rated home service professionals. Electricians, plumbers, appliance technicians, and cleaning specialists at your doorstep.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-[#0EA5E9]" />
                <span className="font-medium">100% Verified Pros</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                <Award className="w-4 h-4 text-[#FF7A1A]" />
                <span className="font-medium">Quality Guaranteed</span>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Services */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0EA5E9]"></span> Top Services
            </h4>
            <ul className="space-y-3 text-sm">
              {categories.length > 0 ? (
                categories.slice(0, 6).map((category) => (
                  <li key={category._id || category.name}>
                    <Link
                      to={`/services?category=${encodeURIComponent(category.name)}`}
                      className="text-slate-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-[#0EA5E9] group-hover:translate-x-0.5 transition-all" />
                      <span>{category.name}</span>
                    </Link>
                  </li>
                ))
              ) : (
                ['Appliance Repair', 'Plumbing Service', 'Electrical Fixes', 'Deep Cleaning', 'AC Maintenance'].map((name) => (
                  <li key={name}>
                    <Link
                      to={`/services?category=${encodeURIComponent(name)}`}
                      className="text-slate-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-[#0EA5E9] group-hover:translate-x-0.5 transition-all" />
                      <span>{name}</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Column 3: Company Links */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF7A1A]"></span> Company
            </h4>
            <ul className="space-y-3 text-sm">
              {[
                { label: 'About HomeFix', to: '/about' },
                { label: 'Help & FAQ Center', to: '/help' },
                { label: 'Terms of Service', to: '/terms' },
                { label: 'Browse All Services', to: '/services' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-slate-400 hover:text-white transition-colors duration-200 flex items-center gap-2 group"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-[#FF7A1A] group-hover:translate-x-0.5 transition-all" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {isAuthenticated && user?.role !== 'admin' && (
              <Link
                to={providerApproved ? '/provider' : '/provider-application'}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-xs md:text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 hover:text-white"
              >
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>{providerApproved ? 'Provider Dashboard' : 'Become a Service Partner'}</span>
              </Link>
            )}
          </div>

          {/* Column 4: Contact & Support */}
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/60 backdrop-blur-sm space-y-4">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0EA5E9]" /> 24/7 Dedicated Support
            </h4>

            <div className="space-y-3 text-sm">
              {/* Phone */}
              <a
                href="tel:+917451086410"
                className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700"
              >
                <div className="w-9 h-9 rounded-xl bg-[#0EA5E9]/15 text-[#0EA5E9] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Direct Helpline</p>
                  <p className="font-bold text-white group-hover:text-[#0EA5E9] transition-colors">+91 7451086410</p>
                </div>
              </a>

              {/* Email */}
              <a
                href="mailto:support@homefix.in"
                className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group p-2.5 rounded-xl hover:bg-slate-800/80 border border-transparent hover:border-slate-700"
              >
                <div className="w-9 h-9 rounded-xl bg-[#FF7A1A]/15 text-[#FF7A1A] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Email Inquiry</p>
                  <p className="font-medium text-slate-200">support@homefix.in</p>
                </div>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} HomeFix Services Pvt Ltd. All rights reserved.</p>
          <div className="flex items-center gap-2 bg-slate-800/60 px-4 py-2 rounded-full border border-slate-700/50">
            <span>Built for trust & reliability</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
