import React from 'react';

export function Card({
  children,
  className = '',
  title,
  subtitle,
  icon: Icon,
  action,
  glow = false,
}) {
  return (
    <div
      className={`glass-card rounded-2xl p-5 relative overflow-hidden transition-all duration-300 ${
        glow ? 'border-cyan-500/40 shadow-glow-cyan' : ''
      } ${className}`}
    >
      {(title || Icon || action) && (
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-sm font-semibold text-slate-100 tracking-wide truncate uppercase">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'cyan',
  onClick,
  className = '',
}) {
  const colorMap = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    teal: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    critical: 'text-red-400 bg-red-500/10 border-red-500/20',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  const badgeStyle = colorMap[color] || colorMap.cyan;

  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-2xl p-5 relative overflow-hidden group ${
        onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-xl border ${badgeStyle} transition-transform group-hover:scale-110 shadow-sm`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl lg:text-3xl font-bold tracking-tight text-white font-mono">
          {value}
        </span>
        {trend && (
          <span className="text-xs font-medium text-emerald-400 flex items-center">
            {trend}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-400 truncate">{subtitle}</p>
      )}
    </div>
  );
}
