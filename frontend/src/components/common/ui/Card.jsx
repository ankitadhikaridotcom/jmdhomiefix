import React from 'react';

export const Card = ({ children, className = '', hover = false, ...props }) => (
  <div
    className={`bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(15,23,42,0.04)] ${hover ? 'transition-all duration-200 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:border-slate-300' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`p-5 md:p-6 pb-2 md:pb-3 flex flex-col gap-1.5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`text-lg md:text-xl font-bold text-slate-900 tracking-tight leading-snug ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '', ...props }) => (
  <p className={`text-xs md:text-sm text-slate-500 leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={`p-5 md:p-6 pt-3 md:pt-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`p-5 md:p-6 pt-3 md:pt-4 border-t border-slate-100 flex items-center justify-between gap-3 ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
