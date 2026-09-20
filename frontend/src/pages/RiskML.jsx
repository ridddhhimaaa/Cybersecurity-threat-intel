import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Cpu,
  Layers,
  Flame,
  Target,
  BarChart2,
  Info,
  ExternalLink,
  Shield,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import api from '../services/api';
import { Card } from '../components/common/Card';
import { SeverityBadge, CVSSBadge, ClusterBadge } from '../components/common/Badge';
import { ChartSkeleton, TableSkeleton } from '../components/common/Skeleton';
import { ErrorCard } from '../components/common/ErrorCard';
import { EmptyState } from '../components/common/EmptyState';
import { formatCVSS } from '../utils/formatters';

const CLUSTER_COLORS = ['#06B6D4', '#0D9488', '#38BDF8', '#10B981'];

export function RiskML() {
  const { refreshKey, onOpenCVE } = useOutletContext() || {};
  const navigate = useNavigate();

  const [features, setFeatures] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);

  const fetchMLData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [featRes, clustRes] = await Promise.all([
        api.getMLFeatures(),
        api.getMLClusters(),
      ]);
      setFeatures(featRes.data || []);
      setClusters(clustRes.data || []);
    } catch (err) {
      console.error('Failed to load ML datasets:', err);
      setError(err.message || 'Unable to load ML risk intelligence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMLData();
  }, [refreshKey]);

  // Filter features if a cluster is selected
  const filteredFeatures = selectedCluster !== null
    ? features.filter((f) => f.cluster_id === selectedCluster)
    : features;

  // Sort by model-derived priority score
  const topPrioritized = [...filteredFeatures].sort(
    (a, b) => (b.ml_priority_score || 0) - (a.ml_priority_score || 0)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Machine Learning & Risk Prioritization
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.04] text-slate-400 border border-white/10">
              Dataset scope: Current loaded CVE records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Model-derived risk scoring, clustering segmentation, and algorithmic vulnerability prioritization across the current dataset.
          </p>
        </div>
      </div>

      {/* Explanatory Banner */}
      <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3 text-xs text-cyan-200">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-cyan-300">Model-Derived Prioritization Score:</span>{' '}
          Calculated algorithmically from multi-vector feature embeddings (CVSS, attack vectors, privilege requirements, and exposure characteristics). ML cluster IDs represent structural groupings derived from feature spaces without subjective risk labels.
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartSkeleton height="h-72" />
            <ChartSkeleton height="h-72" />
          </div>
          <TableSkeleton rows={6} cols={6} />
        </div>
      ) : error ? (
        <ErrorCard message={error} onRetry={fetchMLData} />
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cluster Distribution */}
            <Card
              title="Machine Learning Clusters"
              subtitle="Vulnerability density across feature space clusters"
              icon={Cpu}
              action={
                selectedCluster !== null && (
                  <button
                    onClick={() => setSelectedCluster(null)}
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    Clear Filter
                  </button>
                )
              }
            >
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={clusters}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="cluster_id"
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `Cluster ${val}`}
                    />
                    <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '0.75rem',
                      }}
                      formatter={(val, name, item) => [
                        `${val} vulnerabilities (Avg CVSS: ${formatCVSS(
                          item.payload.average_cvss
                        )})`,
                        `Cluster ${item.payload.cluster_id}`,
                      ]}
                    />
                    <Bar
                      dataKey="cve_count"
                      name="CVE Count"
                      radius={[6, 6, 0, 0]}
                      onClick={(entry) => setSelectedCluster(entry.cluster_id)}
                      cursor="pointer"
                    >
                      {clusters.map((entry, index) => (
                        <Cell
                          key={`clust-${index}`}
                          fill={
                            selectedCluster === entry.cluster_id
                              ? '#EC4899'
                              : CLUSTER_COLORS[index % CLUSTER_COLORS.length]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                Click a cluster column to filter the prioritized vulnerability table below.
              </p>
            </Card>

            {/* Scatter Matrix: CVSS vs ML Priority Score */}
            <Card
              title="Risk Matrix: CVSS vs Model Priority"
              subtitle="Correlation between standard CVSS score and ML prioritization"
              icon={Target}
            >
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      type="number"
                      dataKey="cvss_score"
                      name="CVSS Base Score"
                      domain={[0, 10]}
                      stroke="#475569"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      type="number"
                      dataKey="ml_priority_score"
                      name="ML Priority Score"
                      domain={[0, 1]}
                      stroke="#475569"
                      fontSize={10}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '0.75rem',
                      }}
                      formatter={(val, name, item) => [
                        val,
                        item.payload.cve_id || name,
                      ]}
                    />
                    <Scatter
                      name="Vulnerabilities"
                      data={features}
                      fill="#06B6D4"
                      onClick={(point) => onOpenCVE && onOpenCVE(point)}
                      cursor="pointer"
                    >
                      {features.map((entry, index) => (
                        <Cell
                          key={`point-${index}`}
                          fill={CLUSTER_COLORS[entry.cluster_id % CLUSTER_COLORS.length]}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-[11px] text-slate-400 mt-2">
                {clusters.map((c, i) => (
                  <div key={c.cluster_id} className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
                      }}
                    />
                    <span>Cluster {c.cluster_id}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Top Priority Table */}
          <Card
            title={`Model-Prioritized Vulnerabilities ${
              selectedCluster !== null ? `(Filtered: Cluster ${selectedCluster})` : ''
            }`}
            subtitle="Ranked by algorithmic model priority score"
            icon={Flame}
            className="p-0 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 uppercase text-[10px]">
                    <th className="py-3.5 px-4 font-semibold">CVE ID</th>
                    <th className="py-3.5 px-3 font-semibold">Severity</th>
                    <th className="py-3.5 px-3 font-semibold">CVSS Score</th>
                    <th className="py-3.5 px-3 font-semibold">Cluster</th>
                    <th className="py-3.5 px-3 font-semibold">Attack Vector</th>
                    <th className="py-3.5 px-3 font-semibold">Model Priority Score</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {topPrioritized.map((cve) => (
                    <tr
                      key={cve.cve_id}
                      onClick={() => onOpenCVE && onOpenCVE(cve)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-cyan-300 group-hover:text-cyan-200">
                        {cve.cve_id}
                      </td>
                      <td className="py-3.5 px-3">
                        <SeverityBadge severity={cve.severity} />
                      </td>
                      <td className="py-3.5 px-3">
                        <CVSSBadge score={cve.cvss_score} />
                      </td>
                      <td className="py-3.5 px-3">
                        <ClusterBadge clusterId={cve.cluster_id} />
                      </td>
                      <td className="py-3.5 px-3 text-slate-300">
                        {cve.attack_vector || '—'}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-white/10 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, (cve.ml_priority_score || 0) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="font-mono text-xs font-semibold text-white">
                            {Number(cve.ml_priority_score || 0).toFixed(3)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/vulnerabilities/${encodeURIComponent(cve.cve_id)}`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium transition-all"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
