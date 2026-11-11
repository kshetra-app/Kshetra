import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Radio,
  Server,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import { API_BASE_URL } from '../lib/constants';

type Probe = {
  state: 'checking' | 'available' | 'unavailable';
  statusCode: number | null;
  connected?: boolean;
};

const initialProbe: Probe = { state: 'checking', statusCode: null };

export function Dashboard() {
  const [apiProbe, setApiProbe] = useState<Probe>(initialProbe);
  const [databaseProbe, setDatabaseProbe] = useState<Probe>(initialProbe);
  const [flags, setFlags] = useState<{ total: number; enabled: number } | null>(null);
  const [flagsLoading, setFlagsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkEndpoint = async (path: string, isDatabase = false): Promise<Probe> => {
      try {
        const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: 'application/json' } });
        let payload: Record<string, unknown> | null = null;
        try {
          payload = await response.json();
        } catch {
          // HTTP status remains useful when the service returns a non-JSON body.
        }
        return {
          state: response.ok ? 'available' : 'unavailable',
          statusCode: response.status,
          connected: isDatabase && typeof payload?.connected === 'boolean' ? payload.connected : undefined,
        };
      } catch {
        return { state: 'unavailable', statusCode: null, connected: false };
      }
    };

    void checkEndpoint('/api/health').then((result) => {
      if (!cancelled) setApiProbe(result);
    });
    void checkEndpoint('/api/health/db', true).then((result) => {
      if (!cancelled) setDatabaseProbe(result);
    });
    void api.getFlags().then((loadedFlags) => {
      if (cancelled) return;
      const values = Object.values(loadedFlags);
      setFlags({ total: values.length, enabled: values.filter((value) => value === true).length });
    }).catch(() => {
      if (!cancelled) setFlags(null);
    }).finally(() => {
      if (!cancelled) setFlagsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const apiStatus = apiProbe.state === 'checking'
    ? 'Checking'
    : apiProbe.statusCode === null ? 'Unreachable' : `HTTP ${apiProbe.statusCode}`;
  const databaseStatus = databaseProbe.state === 'checking'
    ? 'Checking'
    : databaseProbe.connected === true ? 'Connected'
    : databaseProbe.statusCode === null ? 'Unreachable' : `HTTP ${databaseProbe.statusCode}`;
  const statusColor = (state: Probe['state']) => state === 'available'
    ? 'text-emerald-400'
    : state === 'unavailable' ? 'text-amber-300' : 'text-slate-400';

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>Poligram Operations</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Executive Control Center</h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Current API and database readiness, plus verified feature configuration. Metrics without a connected source are shown as unavailable.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10 shrink-0">
          <Link to="/feature-flags" className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition">
            <span>Manage Flags</span><ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/moderation" className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition">
            <ShieldAlert className="w-4 h-4 text-purple-400" /><span>Moderation</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard title="API readiness" icon={<Server className="w-4 h-4 text-blue-400" />} value={apiStatus} detail={new URL(API_BASE_URL).host} color={statusColor(apiProbe.state)} />
        <MetricCard title="Database readiness" icon={<Activity className="w-4 h-4 text-emerald-400" />} value={databaseStatus} detail="Live Supabase health check" color={statusColor(databaseProbe.state)} />
        <MetricCard title="Feature flags" icon={<Zap className="w-4 h-4 text-amber-400" />} value={flagsLoading ? 'Loading' : flags ? `${flags.enabled} / ${flags.total}` : 'Unavailable'} detail={flags ? 'Enabled / total from API' : 'No verified flag response'} color={flags ? 'text-amber-300' : 'text-slate-400'} />
        <MetricCard title="Live streams" icon={<Radio className="w-4 h-4 text-purple-400" />} value="Not connected" detail="No live inventory service is configured" color="text-slate-300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-slate-400" />
            <h2 className="font-bold text-white text-base">Live broadcast inventory</h2>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
            No stream inventory is connected to this dashboard. Stream titles, audience counts, and live status will appear here only when the app has a verified streaming source.
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <h2 className="font-bold text-white text-base">Connected services</h2>
          </div>
          <div className="space-y-3 text-xs">
            <ServiceStatus label="Fastify API" status={apiStatus} state={apiProbe.state} />
            <ServiceStatus label="Supabase database" status={databaseStatus} state={databaseProbe.state} />
            <ServiceStatus label="Mobile build telemetry" status="Not collected" state="unavailable" />
            <ServiceStatus label="Streaming inventory" status="Not configured" state="unavailable" />
          </div>
          <Link to="/system-health" className="block text-center py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold text-xs border border-slate-700/60 transition">
            View system diagnostics →
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        {apiProbe.state === 'available' && databaseProbe.connected === true
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          : <AlertCircle className="w-3.5 h-3.5 text-amber-300" />}
        <span>Target: {new URL(API_BASE_URL).host}</span>
      </div>
    </div>
  );
}

function MetricCard({ title, icon, value, detail, color }: {
  title: string;
  icon: React.ReactNode;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
      <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-3">
        <span>{title}</span>{icon}
      </div>
      <div className={`text-2xl font-extrabold tracking-tight ${color}`}>{value}</div>
      <div className="text-xs text-slate-400 font-medium mt-2">{detail}</div>
    </div>
  );
}

function ServiceStatus({ label, status, state }: { label: string; status: string; state: Probe['state'] }) {
  const color = state === 'available' ? 'text-emerald-400' : state === 'unavailable' ? 'text-amber-300' : 'text-slate-400';
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
      <span className="text-slate-400">{label}</span>
      <span className={`${color} font-mono font-semibold`}>{status}</span>
    </div>
  );
}
