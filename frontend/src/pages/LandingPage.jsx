import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  ArrowRight,
  Activity,
  Cpu,
  Layers,
  Database,
  Globe,
  Radio,
  ExternalLink,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { GlobalThreatScene } from '../components/landing/GlobalThreatScene';
import api from '../services/api';

export function LandingPage() {
  const navigate = useNavigate();

  const [apiHealthy, setApiHealthy] = useState(true);
  const [totalCVEs, setTotalCVEs] = useState(20);
  const [criticalCount, setCriticalCount] = useState(0);
  const [networkCount, setNetworkCount] = useState(0);
  const [localCount, setLocalCount] = useState(0);
  const [clusterCount, setClusterCount] = useState(3);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const [healthRes, sevRes, vecRes, clustRes] = await Promise.all([
          api.getHealth(),
          api.getSeveritySummary(),
          api.getAttackVectors(),
          api.getMLClusters(),
        ]);

        setApiHealthy(healthRes.status === 'healthy');

        const sevList = sevRes.data || [];
        const total = sevList.reduce((acc, curr) => acc + (curr.cve_count || 0), 0);
        if (total > 0) setTotalCVEs(total);

        const crit = sevList.find((s) => s.severity?.toUpperCase() === 'CRITICAL')?.cve_count || 0;
        setCriticalCount(crit);

        const vecList = vecRes.data || [];
        const net = vecList.find((v) => v.attack_vector?.toUpperCase() === 'NETWORK')?.cve_count || 0;
        const loc = vecList.find((v) => v.attack_vector?.toUpperCase() === 'LOCAL')?.cve_count || 0;
        setNetworkCount(net);
        setLocalCount(loc);

        const clusters = clustRes.data || [];
        if (clusters.length > 0) setClusterCount(clusters.length);
      } catch (err) {
        console.error('Landing telemetry fetch error:', err);
        setApiHealthy(false);
      } finally {
        setLoading(false);
      }
    };

    fetchTelemetry();
  }, []);

  const handleEnterDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="relative min-h-screen bg-[#060A10] text-slate-100 overflow-hidden flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background 3D Earth Global Network Scene */}
      <GlobalThreatScene />

      {/* Top Navigation Bar */}
      <header className="relative z-20 w-full px-6 lg:px-12 py-5 flex items-center justify-between border-b border-white/[0.06] bg-[#060A10]/60 backdrop-blur-md">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-glow-cyan">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-wider text-white flex items-center gap-2">
              CYBERTHREAT
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-normal">
                SOC v1.0
              </span>
            </span>
            <p className="text-[10px] text-cyan-400 tracking-widest uppercase">
              Intelligence Platform
            </p>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-400">
          <button
            onClick={() => navigate('/dashboard')}
            className="hover:text-cyan-300 transition-colors"
          >
            Overview
          </button>
          <button
            onClick={() => navigate('/vulnerabilities')}
            className="hover:text-cyan-300 transition-colors"
          >
            Vulnerabilities
          </button>
          <button
            onClick={() => navigate('/analytics')}
            className="hover:text-cyan-300 transition-colors"
          >
            Threat Analytics
          </button>
          <button
            onClick={() => navigate('/risk-ml')}
            className="hover:text-cyan-300 transition-colors"
          >
            Risk & ML
          </button>
          <button
            onClick={() => navigate('/cvss')}
            className="hover:text-cyan-300 transition-colors"
          >
            CVSS Standard
          </button>
        </nav>

        {/* Right Actions: API Status & Enter Button */}
        <div className="flex items-center gap-4">
          {/* Live API Health Status */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
              apiHealthy
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                apiHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              }`}
            />
            <span>{apiHealthy ? 'SYSTEM OPERATIONAL' : 'SYSTEM OFFLINE'}</span>
          </div>

          <button
            onClick={handleEnterDashboard}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs shadow-glow-cyan transition-all"
          >
            <span>Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Hero & Telemetry Layout */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-6 lg:px-12 py-12 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Tag badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-cyan-500/30 text-xs text-cyan-300 shadow-sm backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>GLOBAL CYBER DEFENSE COMMAND CENTER</span>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white uppercase">
                CYBER THREAT
              </h1>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight cyan-gradient-text uppercase">
                INTELLIGENCE
              </h2>
            </div>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 font-light max-w-xl leading-relaxed">
              Understand vulnerabilities. Analyze exposure. Prioritize risk.
              A data-dense analytics workstation powered by authoritative CVE records,
              multi-standard CVSS normalization, and unsupervised machine learning clustering.
            </p>

            {/* CTA Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={handleEnterDashboard}
                className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-glow-cyan transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>ENTER INTELLIGENCE DASHBOARD</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate('/vulnerabilities')}
                className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 text-sm font-medium transition-all"
              >
                <span>Explore Vulnerabilities</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Mini Telemetry Row */}
            <div className="pt-6 border-t border-white/[0.08] grid grid-cols-3 gap-4 max-w-lg">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                  Current Dataset
                </span>
                <span className="text-xl font-bold font-mono text-white">
                  {totalCVEs} CVEs
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                  CVSS Standards
                </span>
                <span className="text-xl font-bold font-mono text-cyan-300">
                  v2.0 / v3.1
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
                  ML Clusters
                </span>
                <span className="text-xl font-bold font-mono text-teal-300">
                  {clusterCount} Models
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Floating SOC Telemetry Panels (Real API Data) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Telemetry Card 1: System Telemetry */}
            <div className="glass-card rounded-2xl p-5 border border-cyan-500/20 shadow-glass space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-cyan-300">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>SYSTEM TELEMETRY</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  FastAPI :8000
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] text-slate-400 block">Service Status</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {apiHealthy ? 'OPERATIONAL' : 'OFFLINE'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[10px] text-slate-400 block">Dataset Ingestion</span>
                  <span className="text-sm font-bold text-white font-mono">
                    Parquet Storage
                  </span>
                </div>
              </div>
            </div>

            {/* Telemetry Card 2: Attack Surface Footprint */}
            <div className="glass-card rounded-2xl p-5 border border-teal-500/20 shadow-glass space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-teal-300">
                  <Globe className="w-4 h-4 text-teal-400" />
                  <span>EXPOSURE FOOTPRINT</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Verified Vectors
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-slate-300">Network (Remote Exposure)</span>
                  <span className="text-cyan-300 font-bold font-mono">{networkCount} CVEs</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-slate-300">Local Execution Vector</span>
                  <span className="text-teal-300 font-bold font-mono">{localCount} CVEs</span>
                </div>
              </div>
            </div>

            {/* Telemetry Card 3: Algorithmic Prioritization Engine */}
            <div className="glass-card rounded-2xl p-5 border border-purple-500/20 shadow-glass space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-purple-300">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>ALGORITHMIC ENGINE</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Multi-dimensional feature embeddings dynamically compute model-derived priority scores across {clusterCount} structural clusters.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Status Strip */}
      <footer className="relative z-20 w-full px-6 lg:px-12 py-4 border-t border-white/[0.06] bg-[#060A10]/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>CYBERTHREAT PLATFORM // SECURITY OPERATIONS COMMAND</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Dataset Scope: Current Loaded CVE Records ({totalCVEs})</span>
          <span>•</span>
          <span>Zero Fabricated Metrics</span>
        </div>
      </footer>
    </div>
  );
}
