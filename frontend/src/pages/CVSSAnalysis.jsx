import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Binary,
  Activity,
  Layers,
  ShieldAlert,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import api from '../services/api';
import { Card } from '../components/common/Card';
import { ChartSkeleton, TableSkeleton } from '../components/common/Skeleton';
import { ErrorCard } from '../components/common/ErrorCard';
import { EmptyState } from '../components/common/EmptyState';
import { formatCVSS, formatPercent } from '../utils/formatters';

const VERSION_COLORS = {
  '2.0': '#06B6D4',
  '3.0': '#0D9488',
  '3.1': '#22D3EE',
  'Unknown': '#64748B',
};

export function CVSSAnalysis() {
  const { refreshKey } = useOutletContext() || {};
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cvssBands, setCvssBands] = useState([]);
  const [severityData, setSeverityData] = useState([]);
  const [versionDistribution, setVersionDistribution] = useState([]);
  const [sampleCVEs, setSampleCVEs] = useState([]);

  const fetchCVSSData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cvssRes, sevRes, cvesRes] = await Promise.all([
        api.getCVSSSummary(),
        api.getSeveritySummary(),
        api.getCVEs({ limit: 50 }),
      ]);

      setCvssBands(cvssRes.data || []);
      setSeverityData(sevRes.data || []);

      const cveList = cvesRes.data || [];
      setSampleCVEs(cveList);

      // Compute CVSS version distribution from actual records
      const counts = {};
      let total = 0;
      cveList.forEach((c) => {
        const ver = c.cvss_version || '2.0';
        counts[ver] = (counts[ver] || 0) + 1;
        total += 1;
      });

      const versionList = Object.entries(counts).map(([version, count]) => ({
        version,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }));

      setVersionDistribution(versionList);
    } catch (err) {
      console.error('Failed to load CVSS analytics:', err);
      setError(err.message || 'Unable to load CVSS analysis data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCVSSData();
  }, [refreshKey]);

  if (error) {
    return (
      <div className="py-8">
        <ErrorCard message={error} onRetry={fetchCVSSData} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-white">
              CVSS Framework & Scoring Analysis
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.04] text-slate-400 border border-white/10">
              Dataset scope: Current loaded CVE records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Comparative analysis between CVSS v2 legacy metrics and CVSS v3.x vector standards.
          </p>
        </div>
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3 text-xs text-cyan-200">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-cyan-300">CVSS v2 vs v3 Normalization:</span>{' '}
          CVSS v2 primarily captured Authentication, Access Complexity, and granular Privilege acquisition flags (Obtain All/User/Other). CVSS v3 introduced Privileges Required (PR), User Interaction (UI), and Scope (S) boundaries. Fields with no v2 equivalent are explicitly preserved as non-applicable.
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartSkeleton height="h-72" />
          <ChartSkeleton height="h-72" />
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CVSS Version Distribution */}
            <Card
              title="CVSS Version Distribution"
              subtitle="Proportion of current dataset CVEs scored under CVSS standards"
              icon={Binary}
            >
              <div className="h-64 w-full flex flex-col items-center justify-center pt-2">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={versionDistribution}
                      dataKey="count"
                      nameKey="version"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {versionDistribution.map((entry) => (
                        <Cell
                          key={`ver-${entry.version}`}
                          fill={VERSION_COLORS[entry.version] || '#06B6D4'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '0.75rem',
                      }}
                      formatter={(val, name, item) => [
                        `${val} CVEs (${formatPercent(item.payload.percentage)})`,
                        `CVSS v${item.payload.version}`,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex justify-center gap-6 text-xs text-slate-300 mt-2">
                  {versionDistribution.map((item) => (
                    <div key={item.version} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            VERSION_COLORS[item.version] || '#06B6D4',
                        }}
                      />
                      <span className="font-mono">
                        v{item.version}: {item.count} ({formatPercent(item.percentage)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* CVSS Score Bands Distribution */}
            <Card
              title="CVSS Score Band Distribution"
              subtitle="Volume across standardized scoring tiers"
              icon={Activity}
            >
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cvssBands}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="cvss_band"
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '0.75rem',
                      }}
                      formatter={(val, name, item) => [
                        `${val} vulnerabilities (${formatPercent(
                          item.payload.percentage_of_total
                        )})`,
                        'Count',
                      ]}
                    />
                    <Bar
                      dataKey="cve_count"
                      name="CVE Count"
                      fill="#8B5CF6"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Metric Comparison Matrix */}
          <Card
            title="CVSS Specification Metric Matrix"
            subtitle="Architectural comparison of standard attributes"
            icon={Layers}
            className="p-0 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 uppercase text-[10px]">
                    <th className="py-3.5 px-4 font-semibold">Metric Dimension</th>
                    <th className="py-3.5 px-3 font-semibold">CVSS v2.0 (Legacy)</th>
                    <th className="py-3.5 px-3 font-semibold">CVSS v3.0 / v3.1 (Modern)</th>
                    <th className="py-3.5 px-3 font-semibold">Platform Handling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-slate-300">
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-medium text-white">Attack Vector</td>
                    <td className="py-3.5 px-3">Network, Adjacent, Local</td>
                    <td className="py-3.5 px-3">Network, Adjacent, Local, Physical</td>
                    <td className="py-3.5 px-3 font-mono text-emerald-400">Normalized</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-medium text-white">Privileges / Authentication</td>
                    <td className="py-3.5 px-3">Multiple, Single, None</td>
                    <td className="py-3.5 px-3">None, Low, High</td>
                    <td className="py-3.5 px-3 font-mono text-cyan-400">Preserved v2 Auth</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-medium text-white">User Interaction</td>
                    <td className="py-3.5 px-3">User Interaction Required (Boolean)</td>
                    <td className="py-3.5 px-3">None, Required</td>
                    <td className="py-3.5 px-3 font-mono text-cyan-400">Preserved v2 Flag</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-medium text-white">Scope Change</td>
                    <td className="py-3.5 px-3 text-slate-400">Not present in v2</td>
                    <td className="py-3.5 px-3">Unchanged, Changed</td>
                    <td className="py-3.5 px-3 font-mono text-slate-400">Labeled "Not applicable in v2"</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-medium text-white">Privilege Acquisition</td>
                    <td className="py-3.5 px-3">Obtain All/User/Other Privilege</td>
                    <td className="py-3.5 px-3 text-slate-400">Covered by CIA Impact</td>
                    <td className="py-3.5 px-3 font-mono text-emerald-400">Captured in v2 specifics</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
