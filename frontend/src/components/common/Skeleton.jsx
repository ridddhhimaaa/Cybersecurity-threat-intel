import React from 'react';

export function CardSkeleton({ count = 1, height = 'h-32' }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`glass-card rounded-2xl p-5 ${height} animate-pulse relative overflow-hidden flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between">
            <div className="h-4 bg-white/10 rounded w-28" />
            <div className="h-8 w-8 bg-white/10 rounded-xl" />
          </div>
          <div>
            <div className="h-7 bg-white/10 rounded w-20 mb-2" />
            <div className="h-3 bg-white/10 rounded w-36" />
          </div>
        </div>
      ))}
    </>
  );
}

export function ChartSkeleton({ height = 'h-72' }) {
  return (
    <div className={`glass-card rounded-2xl p-6 ${height} animate-pulse flex flex-col justify-between`}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-white/10 rounded w-44" />
        <div className="h-4 bg-white/10 rounded w-24" />
      </div>
      <div className="flex-1 flex items-end gap-3 pt-6 pb-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-white/[0.06] rounded-t-lg"
            style={{ height: `${25 + ((i * 17) % 65)}%` }}
          />
        ))}
      </div>
      <div className="h-3 bg-white/10 rounded w-full mt-2" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="w-full animate-pulse space-y-3 p-4">
      <div className="flex gap-4 pb-2 border-b border-white/5">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-white/10 rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-3 border-b border-white/5 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-4 bg-white/[0.06] rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
