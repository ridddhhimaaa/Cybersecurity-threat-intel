import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Globe,
  Lock,
  UserCheck,
  Layers,
  Calendar,
  Clock,
  FolderGit2,
  FileText,
  CheckCircle2,
  XCircle,
  Hash,
} from 'lucide-react';
import api from '../services/api';
import { Card } from '../components/common/Card';
import { SeverityBadge, CVSSBadge } from '../components/common/Badge';
import { CardSkeleton } from '../components/common/Skeleton';
import { ErrorCard } from '../components/common/ErrorCard';
import {
  formatDate,
  formatDateTime,
  formatCVSS,
  formatCVSSv2Metric,
  formatAttackVector,
} from '../utils/formatters';

export function CVEDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cve, setCve] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCVE(id);
      setCve(data);
    } catch (err) {
      console.error('Failed to load CVE details:', err);
      setError(err.message || `Unable to load details for ${id}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
        <CardSkeleton count={3} height="h-44" />
      </div>
    );
  }

  if (error || !cve) {
    return (
      <div className="py-12">
        <ErrorCard
          message={error || `Vulnerability ${id} could not be found.`}
          onRetry={fetchDetail}
        />
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/vulnerabilities')}
            className="text-xs text-cyan-400 hover:underline flex items-center justify-center gap-1 mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Vulnerability Explorer
          </button>
        </div>
      </div>
    );
  }

  const isV2 = cve.cvss_version === '2.0';

  return (
    <div className="space-y-6">
      {/* Back button & Title Bar */}
      <div className="space-y-3 pb-3 border-b border-cyan-500/15">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Explorer</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/30 text-cyan-400 shadow-glow-cyan">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono text-white tracking-tight">
                  {cve.cve_id}
                </h1>
                <SeverityBadge severity={cve.severity} />
                <CVSSBadge score={cve.cvss_score} />
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>CVSS Standard: v{cve.cvss_version || '2.0'}</span>
                <span>•</span>
                <span>Base Score: {formatCVSS(cve.cvss_score)} / 10.0</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.06]">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Published: {formatDate(cve.published)}</span>
            </div>
            {cve.last_modified && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Modified: {formatDate(cve.last_modified)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Description & Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Description & Overview */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Vulnerability Description"
            subtitle="Authoritative NVD record summary"
            icon={FileText}
          >
            <p className="text-sm text-slate-200 leading-relaxed bg-white/[0.02] p-5 rounded-xl border border-white/[0.06]">
              {cve.description || 'No detailed vulnerability description is available for this record.'}
            </p>
          </Card>

          {/* CVSS Attack Metrics Grid */}
          <Card
            title="Attack Vector & Exploitation Metrics"
            subtitle="CVSS vector evaluation parameters"
            icon={AlertTriangle}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Attack Vector (AV)</span>
                </div>
                <div className="text-base font-semibold text-white">
                  {formatAttackVector(cve.attack_vector)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Network proximity required to trigger the vulnerability.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <span>Attack Complexity (AC)</span>
                </div>
                <div className="text-base font-semibold text-white">
                  {cve.attack_complexity || 'Not specified'}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Conditions beyond attacker control required for successful exploit.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Lock className="w-4 h-4 text-yellow-400" />
                  <span>Privileges Required (PR)</span>
                </div>
                <div className="text-base font-semibold text-white">
                  {formatCVSSv2Metric(cve.privileges_required, cve.cvss_version)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Level of privileges an attacker must possess before exploiting.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>User Interaction (UI)</span>
                </div>
                <div className="text-base font-semibold text-white">
                  {formatCVSSv2Metric(cve.user_interaction, cve.cvss_version)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Whether a user other than the attacker must participate in exploitation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] sm:col-span-2">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Scope (S)</span>
                </div>
                <div className="text-base font-semibold text-white">
                  {formatCVSSv2Metric(cve.scope, cve.cvss_version)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Whether an exploited vulnerability can affect resources beyond its authorization scope.
                </p>
              </div>
            </div>
          </Card>

          {/* CVSS v2 Normalized Specifics (if CVSS v2) */}
          {isV2 && (
            <Card
              title="CVSS v2 Normalized Specifications"
              subtitle="Legacy CVSS v2 authorization and privilege acquisition flags"
              icon={Layers}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Authentication</span>
                  <span className="text-xs font-mono font-semibold text-cyan-300 uppercase">
                    {cve.cvss_v2_authentication || 'None'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20 flex items-center justify-between">
                  <span className="text-xs text-slate-300">User Interaction Required</span>
                  <span className="text-xs font-mono font-semibold text-cyan-300">
                    {cve.cvss_v2_user_interaction_required ? 'Required' : 'None'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Obtain All Privilege</span>
                  <span className="flex items-center gap-1 text-xs font-mono font-semibold text-slate-200">
                    {cve.cvss_v2_obtain_all_privilege ? (
                      <span className="text-red-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Yes</span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> No</span>
                    )}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Obtain User Privilege</span>
                  <span className="flex items-center gap-1 text-xs font-mono font-semibold text-slate-200">
                    {cve.cvss_v2_obtain_user_privilege ? (
                      <span className="text-orange-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Yes</span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> No</span>
                    )}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right 1 Col: CWE Taxonomy & Impact Summary */}
        <div className="space-y-6">
          <Card
            title="CWE Categorization"
            subtitle="Common Weakness Enumeration classification"
            icon={FolderGit2}
          >
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Primary Weakness:</span>
                  <span className="px-2.5 py-1 rounded text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {cve.cwe_id || 'Not categorized'}
                  </span>
                </div>
                {cve.cwe_name && (
                  <p className="text-sm font-medium text-slate-200 mt-1">
                    {cve.cwe_name}
                  </p>
                )}
              </div>

              {Array.isArray(cve.cwe_ids) && cve.cwe_ids.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    All Enumerated Weaknesses ({cve.cwe_count || cve.cwe_ids.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {cve.cwe_ids.map((id, index) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono bg-white/[0.04] text-slate-300 border border-white/[0.08]"
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Risk Posture & Remediation Advice */}
          <Card
            title="Security Posture Impact"
            subtitle="Triage guidance"
            icon={Shield}
          >
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[11px] text-slate-400 block mb-1">Exposure Scope:</span>
                <p className="text-slate-200">
                  {cve.attack_vector === 'NETWORK'
                    ? 'Remote network vector implies wide attack surface over perimeter networks.'
                    : 'Local execution context requires authenticated host access or prior compromise.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <span className="text-[11px] text-slate-400 block mb-1">Remediation Priority:</span>
                <p className="text-slate-200">
                  {cve.severity === 'CRITICAL' || cve.severity === 'HIGH'
                    ? 'Immediate patching or isolation recommended within standard SOC SLA.'
                    : 'Standard maintenance cycle remediation recommended.'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
