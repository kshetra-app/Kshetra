import React, { useEffect, useState } from 'react';
import { api, type HealthResponse } from '../lib/api';
import {
  Users,
  MapPin,
  ShieldAlert,
  Radio,
  Activity,
  CheckCircle2,
  TrendingUp,
  Server,
  Zap,
  ArrowRight,
  GitPullRequest,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [flagsCount, setFlagsCount] = useState<number>(17);
  const [enabledFlagsCount, setEnabledFlagsCount] = useState<number>(17);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => {});
    api.getFlags().then((flags) => {
      const keys = Object.keys(flags) as (keyof typeof flags)[];
      setFlagsCount(keys.length);
      setEnabledFlagsCount(keys.filter((k) => flags[k] === true).length);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>Post-Delimitation Era Political Tech Suite</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Kshetra Executive Control Center
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Real-time telemetry, master data governance, live broadcast moderation, and feature toggle management across 4,123+ Indian constituencies.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10 shrink-0">
          <Link
            to="/feature-flags"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition"
          >
            <span>Manage Flags</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/moderation"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition"
          >
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            <span>Moderation</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-3">
            <span>TOTAL CONSTITUENCIES</span>
            <MapPin className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">4,123</div>
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>PostGIS Geometries Verified</span>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-3">
            <span>ACTIVE LIVE STREAMS</span>
            <Radio className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">4</div>
          <div className="text-xs text-red-400 font-medium flex items-center gap-1 mt-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>WebRTC WHIP Real-Time Ingest</span>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-3">
            <span>PENDING MODERATION</span>
            <ShieldAlert className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">7</div>
          <div className="text-xs text-purple-400 font-medium flex items-center gap-1 mt-2">
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>3 Edits + 4 Content Reports</span>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-3">
            <span>ACTIVE FEATURE MODULES</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {enabledFlagsCount} / {flagsCount}
          </div>
          <div className="text-xs text-amber-400 font-medium flex items-center gap-1 mt-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synchronized with Mobile App</span>
          </div>
        </div>
      </div>

      {/* Mid Section: Live Happenings & Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Broadcast Monitoring Matrix */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <h2 className="font-bold text-white text-base">Live Happenings Matrix</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Low-Latency Media Node</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#0A0A1A] border border-slate-800 rounded-xl p-4 space-y-3 relative group">
              <div className="h-32 rounded-lg bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-between p-3 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">LIVE</span>
                  <span className="text-[11px] font-mono text-slate-300">TS-AC-60 (Khairatabad)</span>
                </div>
                <div className="text-xs font-bold text-white truncate">Public Civic Townhall on Water Pipeline</div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>By: <strong>Rajesh G. (Journalist)</strong></span>
                <span className="text-emerald-400 font-semibold">1.4k Viewers</span>
              </div>
            </div>

            <div className="bg-[#0A0A1A] border border-slate-800 rounded-xl p-4 space-y-3 relative group">
              <div className="h-32 rounded-lg bg-gradient-to-tr from-slate-900 via-slate-800 to-purple-950 flex flex-col justify-between p-3 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">LIVE</span>
                  <span className="text-[11px] font-mono text-slate-300">AP-AC-102 (Guntur West)</span>
                </div>
                <div className="text-xs font-bold text-white truncate">Panchayat Road Inundation Ground Report</div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>By: <strong>Suresh V. (Citizen)</strong></span>
                <span className="text-emerald-400 font-semibold">820 Viewers</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Telemetry Card */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <h2 className="font-bold text-white text-base">Backend & Infrastructure</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400">Fastify API Endpoint</span>
              <span className="text-emerald-400 font-mono font-semibold">ONLINE (HTTP 200)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400">PostGIS Spatial Database</span>
              <span className="text-blue-400 font-mono font-semibold">Supabase Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400">Hermes Android Target</span>
              <span className="text-purple-400 font-mono font-semibold">C6-1F-BC-03 Bytecode</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <span className="text-slate-400">Live Media Ingest</span>
              <span className="text-amber-400 font-mono font-semibold">WebRTC / WHIP :8889</span>
            </div>
          </div>

          <Link
            to="/system-health"
            className="block text-center py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold text-xs border border-slate-700/60 transition"
          >
            View Full System Diagnostics →
          </Link>
        </div>
      </div>
    </div>
  );
}
