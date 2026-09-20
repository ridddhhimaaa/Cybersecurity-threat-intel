import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ExternalLink,
  Shield,
  AlertTriangle,
  Server,
  Lock,
  UserCheck,
  Globe,
  Calendar,
  Layers,
} from 'lucide-react';
import { SeverityBadge, CVSSBadge } from '../common/Badge';
import {
  formatDate,
  formatCVSS,
  formatCVSSv2Metric,
  formatAttackVector,
} from '../../utils/formatters';

export function CVEDetailDrawer({ cve, isOpen, onClose }) {
  const navigate = useNavigate();

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !cve) return null;

  const isV2 = cve.cvss_version === '2.0';

  const handleOpenDetailPage = () => {
    onClose();
    navigate(`/vulnerabilities/${encodeURIComponent(cve.cve_id)}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-[#0B1017] border-l border-cyan-500/20 shadow-2xl flex flex-col justify-between overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-cyan-500/15 bg-[#080D14]/90 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Shield className="w-4 h-4" />
                </span>
                <span className="text-xs text-cyan-400 uppercase tracking-wider">
                  Vulnerability Inspection
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold font-mono text-white tracking-tight">
                {cve.cve_id}
              </h2>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={cve.severity} />
                <CVSSBadge score={cve.cvss_score} />
              </div>
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span>CVSS v{cve.cvss_version || '2.0'}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Published {formatDate(cve.published)}
              </span>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 flex-1">
            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Vulnerability Description
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/[0.06]">
                {cve.description || 'No description provided for this CVE.'}
              </p>
            </div>

            {/* CVSS Metrics Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Attack & Impact Metrics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    Attack Vector
                  </span>
                  <span className="text-sm font-medium text-white">
                    {formatAttackVector(cve.attack_vector)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                    Attack Complexity
                  </span>
                  <span className="text-sm font-medium text-white">
                    {cve.attack_complexity || 'Not specified'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-yellow-400" />
                    Privileges Required
                  </span>
                  <span className="text-sm font-medium text-white">
                    {formatCVSSv2Metric(cve.privileges_required, cve.cvss_version)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    User Interaction
                  </span>
                  <span className="text-sm font-medium text-white">
                    {formatCVSSv2Metric(cve.user_interaction, cve.cvss_version)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] col-span-2">
                  <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Scope
                  </span>
                  <span className="text-sm font-medium text-white">
                    {formatCVSSv2Metric(cve.scope, cve.cvss_version)}
                  </span>
                </div>
              </div>
            </div>

            {/* CVSS v2 Normalized Flags (if v2 record) */}
            {isV2 && (
              <div className="space-y-2 p-4 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20">
                <h4 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                  CVSS v2 Specific Metrics
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Authentication:</span>{' '}
                    <span className="text-slate-200 font-mono">
                      {cve.cvss_v2_authentication || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">User Interaction:</span>{' '}
                    <span className="text-slate-200 font-mono">
                      {cve.cvss_v2_user_interaction_required ? 'Required' : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Obtain All Priv:</span>{' '}
                    <span className="text-slate-200 font-mono">
                      {cve.cvss_v2_obtain_all_privilege ? 'True' : 'False'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Obtain User Priv:</span>{' '}
                    <span className="text-slate-200 font-mono">
                      {cve.cvss_v2_obtain_user_privilege ? 'True' : 'False'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CWE Taxonomy */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Weakness Enumeration (CWE)
              </h3>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {cve.cwe_id || 'Not categorized'}
                  </span>
                  {cve.cwe_name && (
                    <span className="text-xs text-slate-300 font-medium">
                      {cve.cwe_name}
                    </span>
                  )}
                </div>
                {Array.isArray(cve.cwe_names) && cve.cwe_names.length > 1 && (
                  <div className="pt-2 text-xs text-slate-400">
                    Related Weaknesses: {cve.cwe_names.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-cyan-500/15 bg-[#080D14]/90 flex items-center justify-between gap-3 sticky bottom-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Close Drawer
            </button>
            <button
              onClick={handleOpenDetailPage}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-semibold shadow-glow-cyan transition-all"
            >
              <span>Full CVE Analysis Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
