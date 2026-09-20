import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Flame,
  AlertTriangle,
  Activity,
  Layers,
  TrendingUp,
  ArrowUpRight,
  Radio,
  ExternalLink,
  Lock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../services/api';
import { Card, MetricCard } from '../components/common/Card';
import { SeverityBadge, CVSSBadge } from '../components/common/Badge';
import { CardSkeleton, ChartSkeleton } from '../components/common/Skeleton';
import { ErrorCard } from '../components/common/ErrorCard';
import { EmptyState } from '../components/common/EmptyState';
import { formatCVSS, formatDate, formatAttackVector } from '../utils/formatters';

const SEVERITY_COLORS = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#10B981',
  UNKNOWN: '#64748B',
};

export function Dashboard() {
  const { refreshKey, onOpenCVE } = useOutletContext() || {};
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [severityData, setSeverityData] = useState([]);
  const [cvssData, setCvssData] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [vectorData, setVectorData] = useState([]);
  const [topCVEs, setTopCVEs] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sevRes, cvssRes, trendsRes, vectorRes, topRes, mlRes] = await Promise.all([
        api.getSeveritySummary(),
        api.getCVSSSummary(),
        api.getTrends(),
        api.getAttackVectors(),
        api.getTopVulnerabilities(),
        api.getMLFeatures(),
      ]);

      const mlMap = {};
      (mlRes.data || []).forEach((item) => {
        if (item.cve_id) {
          mlMap[item.cve_id.toUpperCase()] = item.ml_priority_score;
        }
      });

      const enrichedTop = (topRes.data || []).map((cve) => ({
        ...cve,
        ml_priority_score: mlMap[cve.cve_id?.toUpperCase()] ?? cve.ml_priority_score,
      }));

      setSeverityData(sevRes.data || []);
      setCvssData(cvssRes.data || []);
      setTrendsData(trendsRes.data || []);
      setVectorData(vectorRes.data || []);
      setTopCVEs(enrichedTop);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to fetch threat intelligence summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  // Derived metrics from real API data
  const totalCVEs = severityData.reduce((acc, curr) => acc + (curr.cve_count || 0), 0);
  const criticalCount = severityData.find((s) => s.severity?.toUpperCase() === 'CRITICAL')?.cve_count || 0;
  const highCount = severityData.find((s) => s.severity?.toUpperCase() === 'HIGH')?.cve_count || 0;

  // Compute weighted average CVSS from severity summary
  const totalWeightedCVSS = severityData.reduce(
    (acc, curr) => acc + (curr.average_cvss || 0) * (curr.cve_count || 0),
    0
  );
  const avgCVSS = totalCVEs > 0 ? (totalWeightedCVSS / totalCVEs).toFixed(1) : 'N/A';

  if (error) {
    return (
      <div className="py-8">
        <ErrorCard message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Threat Intelligence & Risk Overview
            </h2>
            {totalCVEs > 0 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.04] text-slate-400 border border-white/10">
                Current dataset: {totalCVEs} CVEs
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Vulnerability metrics, CVSS scoring distributions, and threat trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/vulnerabilities')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold shadow-glow-cyan transition-all"
          >
            <span>Open CVE Explorer</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 1: KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <CardSkeleton count={4} />
        ) : (
          <>
            <MetricCard
              title="Total Vulnerabilities"
              value={totalCVEs}
              subtitle="Current dataset scope"
              icon={ShieldAlert}
              color="cyan"
              onClick={() => navigate('/vulnerabilities')}
            />
            <MetricCard
              title="Critical Severity"
              value={criticalCount}
              subtitle={`${((criticalCount / (totalCVEs || 1)) * 100).toFixed(0)}% of dataset`}
              icon={Flame}
              color="critical"
              onClick={() => navigate('/vulnerabilities?severity=CRITICAL')}
            />
            <MetricCard
              title="High Severity"
              value={highCount}
              subtitle={`${((highCount / (totalCVEs || 1)) * 100).toFixed(0)}% of dataset`}
              icon={AlertTriangle}
              color="high"
              onClick={() => navigate('/vulnerabilities?severity=HIGH')}
            />
            <MetricCard
              title="Average CVSS Score"
              value={avgCVSS}
              subtitle="Dataset mean baseline"
              icon={Activity}
              color="yellow"
              onClick={() => navigate('/cvss')}
            />
          </>
        )}
      </div>

      {/* Row 2: Main Analytics Area + Risk Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Large Vulnerability Trends Area Chart */}
        <div className="lg:col-span-2">
          <Card
            title="Vulnerability Trends Over Time"
            subtitle="CVE publication distribution in the current dataset"
            icon={TrendingUp}
            action={
              <button
                onClick={() => navigate('/analytics')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
              >
                Deep Analytics <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            {loading ? (
              <ChartSkeleton height="h-80" />
            ) : trendsData.length === 0 ? (
              <EmptyState description="No yearly trend data currently recorded." />
            ) : (
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendsData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="year"
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <YAxis
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '0.75rem',
                      }}
                      labelStyle={{ color: '#E2E8F0', fontWeight: 'bold' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cve_count"
                      name="Total CVEs"
                      stroke="#06B6D4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCount)"
                    />
                    <Area
                      type="monotone"
                      dataKey="high_severity_count"
                      name="High Severity"
                      stroke="#14B8A6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorHigh)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Right 1 Col: Risk Snapshot Panel */}
        <div className="lg:col-span-1">
          <Card
            title="Risk Snapshot"
            subtitle="Top priority threat records"
            icon={Flame}
            action={
              <button
                onClick={() => navigate('/risk-ml')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
              >
                ML Prioritization <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            {loading ? (
              <CardSkeleton count={4} height="h-16" />
            ) : topCVEs.length === 0 ? (
              <EmptyState description="No priority vulnerabilities found." />
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400 leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
                  <span className="text-slate-300 font-medium">Metric distinction:</span>{' '}
                  <span className="text-slate-300 font-mono font-semibold">CVSS</span> is the standardized vulnerability score.{' '}
                  <span className="text-cyan-300 font-mono font-semibold">Model Priority</span> is the project's algorithmic prioritization score.
                </p>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {topCVEs.slice(0, 5).map((cve) => (
                    <div
                      key={cve.cve_id}
                      onClick={() => onOpenCVE && onOpenCVE(cve)}
                      className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-cyan-500/30 transition-all cursor-pointer group space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                            {cve.cve_id}
                          </span>
                          <SeverityBadge severity={cve.severity} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {formatAttackVector(cve.attack_vector).split(' ')[0]}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 truncate">
                        {cve.cwe_name || cve.description || 'No description'}
                      </p>

                      <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04] text-[11px] font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[10px] uppercase">CVSS:</span>
                          <CVSSBadge score={cve.cvss_score} />
                        </div>
                        {cve.ml_priority_score !== undefined && cve.ml_priority_score !== null && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[10px] uppercase">Model Priority:</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              {Number(cve.ml_priority_score).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Row 3: Secondary Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Attack Vector Distribution */}
        <Card
          title="Attack Vector"
          subtitle="Exploitation entry points"
          icon={Layers}
        >
          {loading ? (
            <ChartSkeleton height="h-56" />
          ) : (
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={vectorData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="attack_vector"
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <Bar
                    dataKey="cve_count"
                    name="CVE Count"
                    fill="#06B6D4"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Card 2: Severity Distribution */}
        <Card
          title="Severity Distribution"
          subtitle="Impact tier breakdown"
          icon={ShieldAlert}
        >
          {loading ? (
            <ChartSkeleton height="h-56" />
          ) : (
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="cve_count"
                    nameKey="severity"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {severityData.map((entry, index) => {
                      const color =
                        SEVERITY_COLORS[entry.severity?.toUpperCase()] || '#64748B';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-[11px] text-slate-400 -mt-2">
                {severityData.map((item) => (
                  <div key={item.severity} className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          SEVERITY_COLORS[item.severity?.toUpperCase()] || '#64748B',
                      }}
                    />
                    <span>{item.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Card 3: CVSS Score Bands */}
        <Card
          title="CVSS Score Bands"
          subtitle="Normalized scoring tiers"
          icon={Activity}
        >
          {loading ? (
            <ChartSkeleton height="h-56" />
          ) : (
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cvssData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="cvss_band"
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <Bar
                    dataKey="cve_count"
                    name="CVE Count"
                    fill="#14B8A6"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
