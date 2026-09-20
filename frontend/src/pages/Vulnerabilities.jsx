import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
  RotateCcw,
  ExternalLink,
  Eye,
} from 'lucide-react';
import api from '../services/api';
import { Card } from '../components/common/Card';
import { SeverityBadge, CVSSBadge } from '../components/common/Badge';
import { TableSkeleton } from '../components/common/Skeleton';
import { ErrorCard } from '../components/common/ErrorCard';
import { EmptyState } from '../components/common/EmptyState';
import {
  formatDate,
  formatCVSS,
  formatCVSSv2Metric,
  formatAttackVector,
} from '../utils/formatters';
import { ATTACK_VECTOR_OPTIONS, SEVERITY_OPTIONS } from '../utils/constants';

export function Vulnerabilities() {
  const { onOpenCVE, refreshKey } = useOutletContext() || {};
  const location = useLocation();
  const navigate = useNavigate();

  // URL Query param parsing for initial state
  const queryParams = new URLSearchParams(location.search);
  const initialSeverity = queryParams.get('severity') || '';

  const [cves, setCves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severity, setSeverity] = useState(initialSeverity);
  const [minCvss, setMinCvss] = useState('');
  const [maxCvss, setMaxCvss] = useState('');
  const [attackVector, setAttackVector] = useState('');
  const [cweId, setCweId] = useState('');
  const [sortBy, setSortBy] = useState('cvss_desc');

  // Pagination
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchCVEs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit,
        offset,
      };
      if (severity) params.severity = severity;
      if (minCvss !== '') params.min_cvss = parseFloat(minCvss);
      if (maxCvss !== '') params.max_cvss = parseFloat(maxCvss);
      if (attackVector) params.attack_vector = attackVector;
      if (cweId) params.cwe_id = cweId;

      const res = await api.getCVEs(params);
      setCves(res.data || []);
      setTotalCount(res.count || (res.data ? res.data.length : 0));
    } catch (err) {
      console.error('Failed to fetch CVEs:', err);
      setError(err.message || 'Failed to fetch vulnerabilities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCVEs();
  }, [severity, minCvss, maxCvss, attackVector, cweId, limit, offset, refreshKey]);

  // Client-side text search & sorting over fetched batch
  const filteredAndSortedCVEs = React.useMemo(() => {
    let result = [...cves];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.cve_id?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.cwe_id?.toLowerCase().includes(q) ||
          c.cwe_name?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'cvss_desc') return (b.cvss_score || 0) - (a.cvss_score || 0);
      if (sortBy === 'cvss_asc') return (a.cvss_score || 0) - (b.cvss_score || 0);
      if (sortBy === 'newest') return new Date(b.published || 0) - new Date(a.published || 0);
      if (sortBy === 'oldest') return new Date(a.published || 0) - new Date(b.published || 0);
      return 0;
    });

    return result;
  }, [cves, searchQuery, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSeverity('');
    setMinCvss('');
    setMaxCvss('');
    setAttackVector('');
    setCweId('');
    setOffset(0);
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Vulnerability Intelligence Explorer
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] bg-white/[0.04] text-slate-400 border border-white/10">
              Dataset scope: Current loaded CVE records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Search, filter, and inspect verified CVE vulnerabilities and CVSS metrics across the current dataset.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          Showing {cves.length} of {totalCount} records (Current dataset)
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by CVE ID, CWE, or description..."
              className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs placeholder-slate-400"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Severity Filter */}
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setOffset(0);
              }}
              className="glass-input px-3 py-2 rounded-xl text-xs bg-[#0F1422] text-slate-200"
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Attack Vector Filter */}
            <select
              value={attackVector}
              onChange={(e) => {
                setAttackVector(e.target.value);
                setOffset(0);
              }}
              className="glass-input px-3 py-2 rounded-xl text-xs bg-[#0F1422] text-slate-200"
            >
              {ATTACK_VECTOR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="glass-input px-3 py-2 rounded-xl text-xs bg-[#0F1422] text-slate-200"
            >
              <option value="cvss_desc">CVSS: High to Low</option>
              <option value="cvss_asc">CVSS: Low to High</option>
              <option value="newest">Newest Published</option>
              <option value="oldest">Oldest Published</option>
            </select>

            {/* Reset Button */}
            {(severity || minCvss || maxCvss || attackVector || cweId || searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs flex items-center gap-1 transition-all"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Secondary CVSS Score Range Sliders / Inputs */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/[0.04] text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>CVSS Score Range:</span>
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              placeholder="Min"
              value={minCvss}
              onChange={(e) => {
                setMinCvss(e.target.value);
                setOffset(0);
              }}
              className="w-16 px-2 py-1 rounded-lg glass-input text-xs font-mono"
            />
            <span>to</span>
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              placeholder="Max"
              value={maxCvss}
              onChange={(e) => {
                setMaxCvss(e.target.value);
                setOffset(0);
              }}
              className="w-16 px-2 py-1 rounded-lg glass-input text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <span>CWE ID:</span>
            <input
              type="text"
              placeholder="e.g. CWE-269"
              value={cweId}
              onChange={(e) => {
                setCweId(e.target.value);
                setOffset(0);
              }}
              className="w-28 px-2 py-1 rounded-lg glass-input text-xs font-mono uppercase"
            />
          </div>
        </div>
      </Card>

      {/* Vulnerability Table Card */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : error ? (
          <div className="p-6">
            <ErrorCard message={error} onRetry={fetchCVEs} />
          </div>
        ) : filteredAndSortedCVEs.length === 0 ? (
          <EmptyState
            title="No vulnerabilities match your filter criteria"
            description="Try clearing some filters or changing your search terms to explore other CVE records."
            action={
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-medium transition-all"
              >
                Clear All Filters
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 uppercase text-[10px]">
                  <th className="py-3.5 px-4 font-semibold">CVE ID</th>
                  <th className="py-3.5 px-3 font-semibold">Severity</th>
                  <th className="py-3.5 px-3 font-semibold">CVSS</th>
                  <th className="py-3.5 px-3 font-semibold">Vector</th>
                  <th className="py-3.5 px-3 font-semibold">Complexity</th>
                  <th className="py-3.5 px-3 font-semibold">Privileges Req.</th>
                  <th className="py-3.5 px-3 font-semibold">User Interact.</th>
                  <th className="py-3.5 px-3 font-semibold">CWE</th>
                  <th className="py-3.5 px-3 font-semibold">Published</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredAndSortedCVEs.map((cve) => (
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
                    <td className="py-3.5 px-3 font-medium text-slate-200">
                      {formatAttackVector(cve.attack_vector).split(' ')[0]}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {cve.attack_complexity || '—'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {formatCVSSv2Metric(cve.privileges_required, cve.cvss_version)}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {formatCVSSv2Metric(cve.user_interaction, cve.cvss_version)}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 font-mono">
                      {cve.cwe_id || '—'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 font-mono">
                      {formatDate(cve.published)}
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onOpenCVE && onOpenCVE(cve)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                          title="Quick drawer preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/vulnerabilities/${encodeURIComponent(cve.cve_id)}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/[0.06] transition-colors"
                          title="Open full detail view"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400 bg-white/[0.01]">
          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setOffset(0);
              }}
              className="glass-input px-2 py-1 rounded text-xs bg-[#0F1422] text-slate-200"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={offset + limit >= totalCount}
                onClick={() => setOffset(offset + limit)}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
