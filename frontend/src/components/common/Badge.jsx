import React from 'react';
import { getSeverityStyle, formatCVSS } from '../../utils/formatters';

export function SeverityBadge({ severity, className = '' }) {
  const style = getSeverityStyle(severity);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border uppercase tracking-wider ${style.badge} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

export function CVSSBadge({ score, className = '' }) {
  const num = Number(score);
  let colorClass = 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  if (!isNaN(num)) {
    if (num >= 9.0) colorClass = 'bg-red-500/15 text-red-300 border-red-500/30';
    else if (num >= 7.0) colorClass = 'bg-orange-500/15 text-orange-300 border-orange-500/30';
    else if (num >= 4.0) colorClass = 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
    else if (num > 0) colorClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold border ${colorClass} ${className}`}
    >
      {formatCVSS(score)}
    </span>
  );
}

export function ClusterBadge({ clusterId, className = '' }) {
  const colors = [
    'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    'bg-teal-500/15 text-teal-300 border-teal-500/30',
    'bg-sky-500/15 text-sky-300 border-sky-500/30',
    'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  ];
  const idx = Math.abs(Number(clusterId) || 0) % colors.length;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border ${colors[idx]} ${className}`}
    >
      Cluster {clusterId ?? '?'}
    </span>
  );
}
