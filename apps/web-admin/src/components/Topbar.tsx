import React, { useEffect, useState } from 'react';
import { api, type HealthResponse } from '../lib/api';
import { supabase } from '../lib/supabase';
import { RefreshCw, Globe } from 'lucide-react';

export function Topbar() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState('');

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API Unreachable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    let unsubscribe: (() => void) | undefined;
    if (supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setAccountEmail(session?.user.email ?? '');
      });
      unsubscribe = () => listener.subscription.unsubscribe();
      void supabase.auth.getSession().then(({ data }) => setAccountEmail(data.session?.user.email ?? ''));
    }
    return () => {
      clearInterval(interval);
      unsubscribe?.();
    };
  }, []);

  return (
    <header className="h-16 bg-[#0d1224]/80 backdrop-blur border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-slate-300">
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span>Admin Console</span>
        </div>
        <div className="text-xs text-slate-400 hidden md:block">Poligram platform operations</div>
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
              error ? 'bg-red-500' : health?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span>{error ? 'API Unavailable' : health ? `API: ${health.service} (v${health.version})` : 'API: Checking'}</span>
          <button
            onClick={checkHealth}
            disabled={loading}
            title="Refresh Health"
            className="p-0.5 hover:text-white transition opacity-70 hover:opacity-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Signed-in account */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
          <div className="hidden lg:block text-right">
            <div className="text-xs font-bold text-slate-200 leading-tight">{accountEmail || 'Signed-in account'}</div>
            <div className="text-[10px] text-slate-400 font-mono">Administrator access checked by API</div>
          </div>
          <button onClick={() => { if (supabase) void supabase.auth.signOut(); }} disabled={!supabase} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white disabled:opacity-50">Sign out</button>
        </div>
      </div>
    </header>
  );
}
