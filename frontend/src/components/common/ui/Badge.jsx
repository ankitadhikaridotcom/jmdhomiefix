import React from 'react';

const variants = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  primary: 'bg-sky-50 text-sky-700 border-sky-200/80',
  secondary: 'bg-orange-50 text-orange-700 border-orange-200/80',
  navy: 'bg-[#0F1D33]/10 text-[#0F1D33] border-[#0F1D33]/20',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
  purple: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  className = '',
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border tracking-wide uppercase ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
