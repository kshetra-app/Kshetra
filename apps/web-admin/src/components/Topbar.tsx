import React, { useEffect, useState } from 'react';
import { api, type HealthResponse } from '../lib/api';
import { Activity, RefreshCw, Shield, Globe, Terminal } from 'lucide-react';

export function Topbar() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'API Unreachable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-[#0d1224]/80 backdrop-blur border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-slate-300">
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span>Production Core</span>
        </div>
        <div className="text-xs text-slate-400 hidden md:block">
          Fastify v5 + Supabase PostGIS + WebRTC Media Plane
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* Real-time Health Indicator */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            error
              ? 'bg-red-950/50 border-red-800/60 text-red-400'
              : health?.status === 'ok'
              ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
              : 'bg-amber-950/50 border-amber-800/60 text-amber-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              error ? 'bg-red-500' : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <span>{error ? 'API Offline' : `API: ${health?.service || 'Online'} (v${health?.version || '0.1.0'})`}</span>
          <button
            onClick={checkHealth}
            disabled={loading}
            title="Refresh Health"
            className="p-0.5 hover:text-white transition opacity-70 hover:opacity-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Superadmin Badge */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-xs font-black text-white shadow-md shadow-purple-500/20">
            A
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-200 leading-tight">Master Admin</div>
            <div className="text-[10px] text-purple-400 font-mono">Super Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}
