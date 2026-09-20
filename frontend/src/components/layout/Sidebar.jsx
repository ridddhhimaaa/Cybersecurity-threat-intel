import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Globe,
  LayoutDashboard,
  ShieldAlert,
  BarChart3,
  FolderGit2,
  Cpu,
  Binary,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { NAV_ITEMS } from '../../utils/constants';

const ICON_MAP = {
  Globe,
  LayoutDashboard,
  ShieldAlert,
  BarChart3,
  FolderGit2,
  Cpu,
  Binary,
};

export function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  apiHealthy,
}) {
  const location = useLocation();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen flex flex-col justify-between transition-all duration-300 ease-in-out border-r border-white/[0.08] bg-[#070B12]/95 backdrop-blur-xl ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Logo & Title */}
        <div>
          <div className="h-20 flex items-center px-5 border-b border-white/[0.06] justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-glow-cyan shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              {!collapsed && (
                <div className="min-w-0 transition-opacity duration-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-wider text-white">
                      CYBERTHREAT
                    </span>
                  </div>
                  <p className="text-[10px] text-cyan-400 tracking-widest uppercase">
                    Intel Platform
                  </p>
                </div>
              )}
            </div>

            {/* Collapse toggle (desktop only) */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 mt-2">
            {NAV_ITEMS.map((item) => {
              const Icon = ICON_MAP[item.icon] || Shield;
              const isActive = location.pathname === item.path;

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-white border border-cyan-500/30 shadow-glow-cyan'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'text-cyan-400 bg-cyan-500/20'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {!collapsed && (
                    <span className="truncate tracking-wide">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: API Status & System Metadata */}
        <div className="p-4 border-t border-white/[0.06] space-y-3">
          {/* API Status Indicator */}
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              apiHealthy
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-red-500/5 border-red-500/20'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    apiHealthy ? 'bg-emerald-400' : 'bg-red-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    apiHealthy ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
              </span>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-slate-200 flex items-center justify-between">
                    <span>API Service</span>
                    <span
                      className={`text-[10px] font-mono uppercase ${
                        apiHealthy ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {apiHealthy ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-mono truncate">
                    FastAPI :8000
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
