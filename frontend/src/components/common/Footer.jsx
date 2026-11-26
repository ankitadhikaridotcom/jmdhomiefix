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
    <footer className="relative bg-[#1a1a18] text-[#ebe8df] overflow-hidden pt-16 pb-10 border-t border-[#2b2b28]">
      {/* Subtle Glow Accents */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-[#b3261e]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-[#ebe8df]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12 pb-14 border-b border-[#2b2b28]">

          {/* Column 1: Brand Info */}
          <div className="space-y-5">
            <BrandLogo size="md" variant="inverse" artwork />
            <p className="text-sm text-[#6a675f] leading-relaxed">
              Your trusted marketplace for verified, high-rated home service professionals. Electricians, plumbers, appliance technicians, and cleaning specialists at your doorstep.
            </p>

          </div>

          {/* Column 2: Quick Services */}
          <div>
            <h4 className="text-[#f7f5f0] font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#b3261e]"></span> Top Services
            </h4>
            <ul className="space-y-3 text-sm">
              {categories.length > 0 ? (
                categories.slice(0, 6).map((category) => (
                  <li key={category._id || category.name}>
                    <Link
                      to={`/services?category=${encodeURIComponent(category.name)}`}
                      className="text-[#6a675f] hover:text-[#f7f5f0] transition-colors duration-200 flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-[#383833] group-hover:text-[#b3261e] group-hover:translate-x-0.5 transition-all" />
                      <span>{category.name}</span>
                    </Link>
                  </li>
                ))
              ) : (
                ['Appliance Repair', 'Plumbing Service', 'Electrical Fixes', 'Deep Cleaning', 'AC Maintenance'].map((name) => (
                  <li key={name}>
                    <Link
                      to={`/services?category=${encodeURIComponent(name)}`}
                      className="text-[#6a675f] hover:text-[#f7f5f0] transition-colors duration-200 flex items-center gap-2 group"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-[#383833] group-hover:text-[#b3261e] group-hover:translate-x-0.5 transition-all" />
                      <span>{name}</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Column 3: Company Links */}
          <div>
            <h4 className="text-[#f7f5f0] font-bold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#b3261e]"></span> Company
            </h4>
            <ul className="space-y-3 text-sm">
              {[
                { label: 'About Nivestry', to: '/about' },
                { label: 'Help & FAQ Center', to: '/help' },
                { label: 'Terms of Service', to: '/terms' },
                { label: 'Browse All Services', to: '/services' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-[#6a675f] hover:text-[#f7f5f0] transition-colors duration-200 flex items-center gap-2 group"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-[#383833] group-hover:text-[#b3261e] group-hover:translate-x-0.5 transition-all" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {isAuthenticated && user?.role !== 'admin' && (
              <Link
                to={providerApproved ? '/provider' : '/provider-application'}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#b3261e]/40 bg-[#b3261e]/15 px-4 py-2 text-xs md:text-sm font-semibold text-[#f7f5f0] transition hover:bg-[#b3261e]/25 hover:text-white"
              >
                <Sparkles className="w-4 h-4 text-[#b3261e]" />
                <span>{providerApproved ? 'Provider Dashboard' : 'Become a Service Partner'}</span>
              </Link>
            )}
          </div>

          {/* Column 4: Contact & Support */}
          <div className="bg-[#242421] p-6 rounded-2xl border border-[#383833] backdrop-blur-sm space-y-4">
            <h4 className="text-[#f7f5f0] font-bold text-sm uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#b3261e]" /> 24/7 Dedicated Support
            </h4>

            <div className="space-y-3 text-sm">
              {/* Phone */}
              <a
                href="tel:+917451086410"
                className="flex items-center gap-3 text-[#ebe8df] hover:text-white transition-colors group p-2.5 rounded-xl hover:bg-[#2b2b28] border border-transparent hover:border-[#383833]"
              >
                <div className="w-9 h-9 rounded-xl bg-[#b3261e]/20 text-[#b3261e] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-[#6a675f] uppercase font-semibold tracking-wider">Direct Helpline</p>
                  <p className="font-bold text-[#f7f5f0] group-hover:text-[#b3261e] transition-colors">+91 7451086410</p>
                </div>
              </a>

              {/* Email */}
              <a
                href="mailto:support@nivestry.com"
                className="flex items-center gap-3 text-[#ebe8df] hover:text-white transition-colors group p-2.5 rounded-xl hover:bg-[#2b2b28] border border-transparent hover:border-[#383833]"
              >
                <div className="w-9 h-9 rounded-xl bg-[#b3261e]/20 text-[#b3261e] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-[#6a675f] uppercase font-semibold tracking-wider">Email Inquiry</p>
                  <p className="font-medium text-[#ebe8df]">support@nivestry.com</p>
                </div>
              </a>
            </div>
          </div>

        </div>


      </div>
    </footer>
  );
};

export default Footer;
