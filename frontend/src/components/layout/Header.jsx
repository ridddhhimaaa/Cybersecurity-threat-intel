import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Search, RefreshCw, Menu, Radio, Shield } from 'lucide-react';
import { WORKSPACE_TABS } from '../../utils/constants';

export function Header({
  onOpenSearch,
  onRefresh,
  refreshing,
  apiHealthy,
  setMobileOpen,
}) {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#070B12]/85 backdrop-blur-xl px-4 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Menu & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-lg lg:text-xl font-bold tracking-tight text-white truncate uppercase">
              Cyber Threat Intelligence
            </h1>
            <p className="text-[11px] text-slate-400">
              Vulnerability intelligence & risk posture
            </p>
          </div>
        </div>

        {/* Center: Workspace tabs (desktop) */}
        <div className="hidden xl:flex items-center p-1 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          {WORKSPACE_TABS.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <NavLink
                key={tab.id}
                to={tab.path}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-glow-cyan'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {tab.label}
              </NavLink>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Global Search Button */}
          <button
            onClick={onOpenSearch}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs text-slate-400 hover:text-cyan-200 transition-all"
            title="Global CVE Search (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Search CVEs...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-[10px] font-mono text-slate-400">
              ⌘K
            </kbd>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh Intelligence Data"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`}
            />
          </button>

          {/* Live Status Pill */}
          <div
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
              apiHealthy
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                apiHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              }`}
            />
            <span>{apiHealthy ? 'SYSTEM OPERATIONAL' : 'SYSTEM OFFLINE'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
