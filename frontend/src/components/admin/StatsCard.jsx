import { motion } from 'framer-motion';

const StatsCard = ({ title, value, change, icon: Icon, color = 'primary', index = 0 }) => {
  const colors = {
    primary: { bg: 'bg-sky-50', icon: 'bg-sky-100 text-[#0284C7] border-sky-200' },
    success: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    warning: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-700 border-amber-200' },
    info: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-700 border-purple-200' },
  };

  const c = colors[color] || colors.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono tracking-tight">{value}</p>
          {change !== undefined && (
            <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              <span>{change >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(change)}% vs last month</span>
            </p>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${c.icon}`}>
          {typeof Icon === 'function' || typeof Icon === 'object' ? (
            <Icon className="w-5 h-5 stroke-[1.8]" />
          ) : (
            <span className="text-lg">{Icon}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;
