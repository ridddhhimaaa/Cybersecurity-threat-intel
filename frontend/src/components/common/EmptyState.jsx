import React from 'react';
import { ShieldCheck, Database, SearchX, FileQuestion } from 'lucide-react';

export function EmptyState({
  title = 'No data available',
  description = 'There are no records matching your current filter criteria.',
  icon: Icon = SearchX,
  action,
  className = '',
}) {
  return (
    <div
      className={`glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-slate-400 mb-3">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-base font-semibold text-slate-200 mb-1">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
