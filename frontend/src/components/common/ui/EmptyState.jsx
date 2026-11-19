import React from 'react';
import { PackageOpen } from 'lucide-react';
import Button from './Button';

export const EmptyState = ({
  icon: Icon = PackageOpen,
  title = 'No items found',
  description = 'There is currently no data to display here.',
  actionLabel,
  onAction,
  actionTo,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 ${className}`}>
      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center text-slate-400 mb-4">
        <Icon className="w-7 h-7 text-slate-400 stroke-[1.75]" />
      </div>
      <h4 className="text-base md:text-lg font-bold text-slate-900 mb-1">{title}</h4>
      <p className="text-xs md:text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && (
        actionTo ? (
          <a href={actionTo}>
            <Button variant="primary" size="md">
              {actionLabel}
            </Button>
          </a>
        ) : (
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
};

export default EmptyState;
