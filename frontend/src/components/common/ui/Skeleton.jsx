import React from 'react';

export const Skeleton = ({ className = '', ...props }) => (
  <div
    className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`}
    {...props}
  />
);

export const ServiceCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-4 shadow-sm">
    <Skeleton className="h-44 w-full rounded-xl" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
    </div>
    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-9 w-24 rounded-lg" />
    </div>
  </div>
);

export default Skeleton;
