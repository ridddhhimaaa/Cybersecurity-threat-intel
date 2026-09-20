import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  ShieldAlert,
  Activity,
  TrendingUp,
  Globe,
  AlertTriangle,
  Lock,
  UserCheck,
  Layers,
} from 'lucide-react';
import api from '../services/api';
import { Card } from '../components/common/Card';
import { ChartSkeleton } from '../components/common/Skeleton';
import { ErrorCard } from '../components/common/ErrorCard';
import { EmptyState } from '../components/common/EmptyState';

const SEVERITY_COLORS = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#10B981',
  UNKNOWN: '#64748B',
};

export function Analytics() {
  const { refreshKey } = useOutletContext() || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [severity, setSeverity] = useState([]);
  const [cvss, setCvss] = useState([]);
  const [trends, setTrends] = useState([]);
  const [vectors, setVectors] = useState([]);
  const [complexity, setComplexity] = useState([]);
  const [privileges, setPrivileges] = useState([]);
  const [userInteraction, setUserInteraction] = useState([]);
  const [scope, setScope] = useState([]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        sevRes,
        cvssRes,
        trendsRes,
        vecRes,
        compRes,
        privRes,
        uiRes,
        scopeRes,
      ] = await Promise.all([
        api.getSeveritySummary(),
        api.getCVSSSummary(),
        api.getTrends(),
        api.getAttackVectors(),
        api.getAttackComplexity(),
        api.getPrivileges(),
        api.getUserInteraction(),
        api.getScope(),
      ]);

      setSeverity(sevRes.data || []);
      setCvss(cvssRes.data || []);
      setTrends(trendsRes.data || []);
      setVectors(vecRes.data || []);
      setComplexity(compRes.data || []);
      setPrivileges(privRes.data || []);
      setUserInteraction(uiRes.data || []);
      setScope(scopeRes.data || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Unable to load analytics datasets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [refreshKey]);

  if (error) {
    return (
      <div className="py-8">
        <ErrorCard message={error} onRetry={fetchAnalytics} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Threat Analytics Workspace
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.04] text-slate-400 border border-white/10">
              Dataset scope: Current loaded CVE records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-dimensional breakdown of vulnerability characteristics, metrics, and patterns across the current dataset.
          </p>
        </div>
      </div>

      {/* Analytics Grid: 2-column / 3-column responsive layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Vulnerability Trends (Spans 2 cols on lg) */}
        <div className="lg:col-span-2">
          <Card
            title="1. Vulnerability Trends"
            subtitle="Yearly volume and high-severity evolution in the current dataset"
            icon={TrendingUp}
          >
            {loading ? (
              <ChartSkeleton height="h-64" />
            ) : trends.length === 0 ? (
              <EmptyState description="No trends data available." />
            ) : (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="anTrends" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="year" stroke="#475569" fontSize={11} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '0.75rem',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area
                      type="monotone"
                      dataKey="cve_count"
                      name="Total CVEs"
                      stroke="#06B6D4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#anTrends)"
                    />
                    <Area
                      type="monotone"
                      dataKey="high_severity_count"
                      name="High Severity"
                      stroke="#F97316"
                      strokeWidth={2}
                      fill="#F97316"
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* 2. Severity Distribution */}
        <Card
          title="2. Severity Distribution"
          subtitle="Relative breakdown across impact levels"
          icon={ShieldAlert}
        >
          {loading ? (
            <ChartSkeleton height="h-64" />
          ) : severity.length === 0 ? (
            <EmptyState description="No severity data available." />
          ) : (
            <div className="h-64 w-full flex flex-col justify-center items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={severity}
                    dataKey="cve_count"
                    nameKey="severity"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {severity.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SEVERITY_COLORS[entry.severity?.toUpperCase()] || '#64748B'}
                      />
                    ))}
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
              <div className="flex flex-wrap justify-center gap-3 text-[11px] text-slate-400 mt-2">
                {severity.map((item) => (
                  <div key={item.severity} className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          SEVERITY_COLORS[item.severity?.toUpperCase()] || '#64748B',
                      }}
                    />
                    <span>{item.severity} ({item.cve_count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* 3. CVSS Distribution */}
        <Card
          title="3. CVSS Score Bands"
          subtitle="Vulnerabilities classified by CVSS ranges"
          icon={Activity}
        >
          {loading ? (
            <ChartSkeleton height="h-64" />
          ) : cvss.length === 0 ? (
            <EmptyState description="No CVSS band data available." />
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cvss} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="cvss_band" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <Bar dataKey="cve_count" name="CVEs" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* 4. Attack Vector Distribution */}
        <Card
          title="4. Attack Vectors"
          subtitle="Proximity vector distribution"
          icon={Globe}
        >
          {loading ? (
            <ChartSkeleton height="h-64" />
          ) : vectors.length === 0 ? (
            <EmptyState description="No attack vector data." />
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vectors} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis type="category" dataKey="attack_vector" stroke="#94A3B8" fontSize={10} width={65} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <Bar dataKey="cve_count" name="CVEs" fill="#06B6D4" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* 5. Attack Complexity */}
        <Card
          title="5. Attack Complexity"
          subtitle="Exploitation pre-conditions"
          icon={AlertTriangle}
        >
          {loading ? (
            <ChartSkeleton height="h-64" />
          ) : complexity.length === 0 ? (
            <EmptyState description="No attack complexity data." />
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complexity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="attack_complexity" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <Bar dataKey="cve_count" name="CVEs" fill="#F97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* 6. Privileges Required */}
        <Card
          title="6. Privileges Required"
          subtitle="Authorization level required"
          icon={Lock}
        >
          {loading ? (
            <ChartSkeleton height="h-64" />
          ) : privileges.length === 0 ? (
            <EmptyState description="No privileges data." />
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={privileges} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="privileges_required" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <Bar dataKey="cve_count" name="CVEs" fill="#EAB308" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* 7. User Interaction */}
        <Card
          title="7. User Interaction"
          subtitle="Human intervention requirement"
          icon={UserCheck}
        >
          {loading ? (
            <ChartSkeleton height="h-64" />
          ) : userInteraction.length === 0 ? (
            <EmptyState description="No user interaction data." />
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userInteraction} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="user_interaction" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <Bar dataKey="cve_count" name="CVEs" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* 8. Scope */}
        <Card
          title="8. Scope"
          subtitle="Cross-boundary authority impact"
          icon={Layers}
        >
          {loading ? (
            <ChartSkeleton height="h-64" />
          ) : scope.length === 0 ? (
            <EmptyState description="No scope data." />
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scope} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="scope" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <Bar dataKey="cve_count" name="CVEs" fill="#06B6D4" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
