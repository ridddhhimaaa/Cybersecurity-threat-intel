import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  BarChart2,
  ShieldAlert,
  ArrowUpRight,
  Info,
  Layers,
  Search,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import { Card } from '../components/common/Card';
import { ChartSkeleton, TableSkeleton } from '../components/common/Skeleton';
import { ErrorCard } from '../components/common/ErrorCard';
import { EmptyState } from '../components/common/EmptyState';
import { formatCVSS, formatPercent } from '../utils/formatters';

export function CWEIntelligence() {
  const { refreshKey } = useOutletContext() || {};
  const navigate = useNavigate();

  const [cweList, setCweList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCWE, setSelectedCWE] = useState(null);

  const fetchCWEData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCWESummary();
      const list = res.data || [];
      setCweList(list);
      if (list.length > 0) {
        setSelectedCWE(list[0]);
      }
    } catch (err) {
      console.error('Failed to load CWE analytics:', err);
      setError(err.message || 'Unable to load CWE intelligence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCWEData();
  }, [refreshKey]);

  // Filter out any non-recognized numeric CWE entries if necessary, or classify them
  const recognizedCWEs = cweList.filter(
    (item) => item.cwe_id && item.cwe_id.startsWith('CWE-')
  );
  const otherCWEs = cweList.filter(
    (item) => !item.cwe_id || !item.cwe_id.startsWith('CWE-')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-white">
              CWE Intelligence & Taxonomy
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.04] text-slate-400 border border-white/10">
              Dataset scope: Current loaded CVE records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Recognized CWE relationships in the current dataset, weakness exposure frequency, and severity correlation.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <ChartSkeleton height="h-64" />
          <TableSkeleton rows={4} cols={5} />
        </div>
      ) : error ? (
        <ErrorCard message={error} onRetry={fetchCWEData} />
      ) : cweList.length === 0 ? (
        <EmptyState
          title="No CWE Intelligence Data"
          description="There are currently no recorded CWE mappings in the dataset."
          icon={FolderGit2}
        />
      ) : (
        <>
          {/* Top Section: Bar Chart & Highlight Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2">
              <Card
                title="CWE Vulnerability Distribution"
                subtitle="Vulnerability frequency per weakness classification in the current dataset"
                icon={BarChart2}
              >
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={recognizedCWEs}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="cwe_id"
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
                      />
                      <Bar
                        dataKey="cve_count"
                        name="Vulnerabilities"
                        fill="#06B6D4"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Selected CWE Detail Card */}
            <div className="lg:col-span-1">
              <Card
                title="Weakness Focus"
                subtitle="Selected classification profile"
                icon={FolderGit2}
                action={
                  selectedCWE && (
                    <button
                      onClick={() =>
                        navigate(`/vulnerabilities?cwe_id=${selectedCWE.cwe_id}`)
                      }
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                    >
                      View CVEs <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )
                }
              >
                {selectedCWE ? (
                  <div className="space-y-4 pt-1">
                    <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                      <span className="font-mono text-sm font-bold text-cyan-300 block mb-1">
                        {selectedCWE.cwe_id}
                      </span>
                      <p className="text-xs font-medium text-white leading-snug">
                        {selectedCWE.cwe_name || 'Unclassified Name'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <span className="text-slate-400 block text-[10px]">Vulnerabilities</span>
                        <span className="text-base font-bold font-mono text-white">
                          {selectedCWE.cve_count}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <span className="text-slate-400 block text-[10px]">Avg CVSS</span>
                        <span className="text-base font-bold font-mono text-cyan-300">
                          {formatCVSS(selectedCWE.average_cvss)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <span className="text-slate-400 block text-[10px]">Max CVSS</span>
                        <span className="text-base font-bold font-mono text-orange-400">
                          {formatCVSS(selectedCWE.maximum_cvss)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                        <span className="text-slate-400 block text-[10px]">High Severity</span>
                        <span className="text-base font-bold font-mono text-red-400">
                          {selectedCWE.high_severity_count || 0}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.06]">
                      Represents {formatPercent(selectedCWE.percentage_of_total)} of recognized weaknesses in the current dataset.
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Select a CWE from the table below.</p>
                )}
              </Card>
            </div>
          </div>

          {/* Ranked CWE Table */}
          <Card
            title="Ranked CWE Intelligence Roster"
            subtitle="Recognized weakness enumeration records from the current dataset"
            icon={Layers}
            className="p-0 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 uppercase text-[10px]">
                    <th className="py-3.5 px-4 font-semibold">CWE ID</th>
                    <th className="py-3.5 px-3 font-semibold">Weakness Name</th>
                    <th className="py-3.5 px-3 font-semibold">Vulnerability Count</th>
                    <th className="py-3.5 px-3 font-semibold">Average CVSS</th>
                    <th className="py-3.5 px-3 font-semibold">Max CVSS</th>
                    <th className="py-3.5 px-3 font-semibold">High Severity Count</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {cweList.map((item) => {
                    const isSelected = selectedCWE?.cwe_id === item.cwe_id;
                    const isOther = !item.cwe_id?.startsWith('CWE-');

                    return (
                      <tr
                        key={item.cwe_id}
                        onClick={() => setSelectedCWE(item)}
                        className={`hover:bg-white/[0.03] transition-colors cursor-pointer ${
                          isSelected ? 'bg-cyan-500/[0.08]' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-cyan-300">
                          {item.cwe_id}
                          {isOther && (
                            <span className="ml-2 text-[10px] text-slate-400 font-normal">
                              (Uncategorized)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-medium text-slate-200">
                          {item.cwe_name || '—'}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-white">
                          {item.cve_count}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-300">
                          {formatCVSS(item.average_cvss)}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-300">
                          {formatCVSS(item.maximum_cvss)}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-red-400">
                          {item.high_severity_count || 0}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/vulnerabilities?cwe_id=${item.cwe_id}`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium transition-all"
                          >
                            Explore CVEs
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
