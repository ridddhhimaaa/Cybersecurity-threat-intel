import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { SeverityBadge, CVSSBadge } from './Badge';

export function CommandKSearch({ isOpen, onClose, onSelectCVE }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Global keydown listener for Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onSelectCVE(null, true); // Signal open search
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSelectCVE]);

  // Perform search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        // Search through CVE list
        const res = await api.getCVEs({ limit: 10 });
        const list = res.data || [];
        const q = query.toLowerCase();
        const filtered = list.filter(
          (cve) =>
            cve.cve_id?.toLowerCase().includes(q) ||
            cve.description?.toLowerCase().includes(q) ||
            cve.cwe_id?.toLowerCase().includes(q)
        );
        setResults(filtered);
      } catch (err) {
        setError(err.message || 'Failed to search vulnerabilities');
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (cve) => {
    onClose();
    if (onSelectCVE) {
      onSelectCVE(cve);
    } else {
      navigate(`/vulnerabilities/${encodeURIComponent(cve.cve_id)}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20 flex justify-center items-start">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
      />

      <div className="relative w-full max-w-2xl bg-[#0B1017] rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Box */}
        <div className="flex items-center px-4 py-3.5 border-b border-cyan-500/20 gap-3 bg-cyan-950/20">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search CVE ID (e.g. CVE-1999-0082) or description..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {error && (
            <div className="p-4 text-xs text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}

          {!loading && query && results.length === 0 && !error && (
            <div className="p-8 text-center">
              <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">
                No matching vulnerabilities found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching for a different CVE ID or keyword.
              </p>
            </div>
          )}

          {results.map((cve) => (
            <div
              key={cve.cve_id}
              onClick={() => handleSelect(cve)}
              className="p-3 rounded-xl hover:bg-cyan-500/[0.06] border border-transparent hover:border-cyan-500/20 transition-all cursor-pointer flex items-center justify-between gap-4 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-semibold text-cyan-300 group-hover:text-cyan-200">
                    {cve.cve_id}
                  </span>
                  <SeverityBadge severity={cve.severity} />
                  <CVSSBadge score={cve.cvss_score} />
                </div>
                <p className="text-xs text-slate-400 line-clamp-1">
                  {cve.description || 'No description available'}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-300 transition-colors shrink-0" />
            </div>
          ))}

          {!query && (
            <div className="p-6 text-center text-xs text-slate-400">
              Type a CVE ID (e.g. <code className="text-cyan-300">CVE-1999</code>) or vulnerability keywords to explore.
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-black/40 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
          <span>Navigate with click or arrow keys</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
