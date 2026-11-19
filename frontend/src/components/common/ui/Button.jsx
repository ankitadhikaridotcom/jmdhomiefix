import React from 'react';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-[#0EA5E9] hover:bg-[#0284C7] active:bg-[#0369A1] text-white shadow-sm hover:shadow focus:ring-[#0EA5E9]/40',
  secondary: 'bg-[#FF7A1A] hover:bg-[#EA580C] active:bg-[#C2410C] text-white shadow-sm hover:shadow focus:ring-[#FF7A1A]/40',
  navy: 'bg-[#0F1D33] hover:bg-[#1E293B] active:bg-[#020617] text-white shadow-sm hover:shadow focus:ring-[#0F1D33]/40',
  outline: 'border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 shadow-sm focus:ring-slate-300',
  outlinePrimary: 'border border-[#0EA5E9]/50 text-[#0284C7] bg-white hover:bg-[#0EA5E9]/5 active:bg-[#0EA5E9]/10 focus:ring-[#0EA5E9]/30',
  ghost: 'text-slate-600 hover:bg-slate-100/80 active:bg-slate-200/70 hover:text-slate-900 focus:ring-slate-200',
  danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm focus:ring-rose-400',
  dangerOutline: 'border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 active:bg-rose-100 focus:ring-rose-200',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-lg gap-1.5',
  sm: 'px-3.5 py-1.5 text-xs font-semibold rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm font-semibold rounded-xl gap-2',
  lg: 'px-6 py-3 text-base font-semibold rounded-xl gap-2.5',
};

export const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-1 select-none ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${isDisabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'hover:-translate-y-0.5 active:translate-y-0'} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {!isLoading && Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />}
      <span>{children}</span>
      {!isLoading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" />}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
