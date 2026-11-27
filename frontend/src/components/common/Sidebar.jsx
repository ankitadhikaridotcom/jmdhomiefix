import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRouteForUser } from '../../utils/authRedirect';
import BrandLogo from './BrandLogo';

const Sidebar = ({ links, title, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/');
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#1a1a18]/45 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-[#dedad0] z-50
                   transform transition-transform duration-300 ease-in-out
                   lg:translate-x-0 lg:static lg:z-auto shadow-sm flex flex-col
                   ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#ebe8df] flex items-center justify-between">
          <BrandLogo size="sm" to={getDefaultRouteForUser(user)} subtitle={title} className="hover:opacity-90 transition-opacity" />
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-xl text-[#6a675f] hover:bg-[#ebe8df] hover:text-[#1a1a18] transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        {user && (
          <div className="p-3.5 mx-4 mt-4 bg-[#f7f5f0] border border-[#dedad0] rounded-2xl">
            <div className="flex items-center gap-3">
              {user?.profileImage || user?.avatar ? (
                <img
                  src={user.profileImage || user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#1a1a18] text-[#f7f5f0] flex items-center justify-center font-bold text-sm shadow-xs">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#1a1a18] truncate">{user.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-[#6a675f] capitalize">{user.role}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
          {links.map((link, index) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={index}
                to={link.to}
                end={link.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 group ${
                    isActive
                      ? 'bg-[#1a1a18] text-[#f7f5f0] shadow-xs'
                      : 'text-[#6a675f] hover:bg-[#ebe8df]/70 hover:text-[#1a1a18]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#b3261e]' : 'text-[#6a675f] group-hover:text-[#1a1a18]'}`} />
                    <span className="truncate">{link.label}</span>
                    {link.badge && (
                      <span className="ml-auto bg-[#b3261e] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        {link.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-[#ebe8df] mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#6a675f] hover:text-[#b3261e] hover:bg-rose-50/70 w-full transition-colors group"
          >
            <LogOut className="w-4 h-4 text-[#6a675f] group-hover:text-[#b3261e] transition-colors shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
