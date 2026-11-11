import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../lib/constants';
import {
  Activity,
  Server,
  Database,
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cpu,
} from 'lucide-react';

export function SystemHealth() {
  const [testing, setTesting] = useState(false);
  const [endpoints, setEndpoints] = useState<EndpointProbe[]>(
    ENDPOINTS.map((endpoint) => ({ ...endpoint, state: 'pending', statusCode: null, latencyMs: null, connected: null })),
  );
  const apiProbe = endpoints.find((endpoint) => endpoint.path === '/api/health') ?? null;
  const databaseProbe = endpoints.find((endpoint) => endpoint.path === '/api/health/db') ?? null;

  const testAllEndpoints = async () => {
    setTesting(true);
    const results = await Promise.all(
      ENDPOINTS.map(async (endpoint): Promise<EndpointProbe> => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 10_000);
        const start = performance.now();
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint.path}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          });
          let payload: Record<string, unknown> | null = null;
          try {
            payload = await response.json();
          } catch {
            // A non-JSON response still provides a valid HTTP reachability result.
          }
          return {
            ...endpoint,
            state: response.ok ? 'ok' : 'error',
            statusCode: response.status,
            latencyMs: Math.round(performance.now() - start),
            connected: typeof payload?.connected === 'boolean' ? payload.connected : null,
          };
        } catch {
          return {
            ...endpoint,
            state: 'error',
            statusCode: null,
            latencyMs: Math.round(performance.now() - start),
            connected: null,
          };
        } finally {
          window.clearTimeout(timeout);
        }
      }),
    );
    setEndpoints(results);
    setTesting(false);
  };

  useEffect(() => {
    testAllEndpoints();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Infrastructure Health & Real-Time Telemetry</span>
          </h1>
          <p className="text-xs text-slate-400">
            Live HTTP checks against the selected API environment. Streaming and mobile build telemetry is not collected here.
          </p>
        </div>

        <button
          onClick={testAllEndpoints}
          disabled={testing}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
          <span>{testing ? 'Checking endpoints...' : 'Run Diagnostics'}</span>
        </button>
      </div>

      {/* Primary Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Railway API Gateway</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {apiProbe ? (apiProbe.statusCode === null ? 'Unreachable' : `HTTP ${apiProbe.statusCode}`) : 'Not checked'}
          </div>
          <div className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
            {apiProbe?.state === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{apiProbe ? `HTTP ${apiProbe.statusCode ?? 'unreachable'} · ${apiProbe.latencyMs ?? '—'} ms` : 'Not checked yet'}</span>
          </div>
          <div className="text-xs text-slate-500">{new URL(API_BASE_URL).host}</div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Supabase Database</span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {databaseProbe?.connected === true ? 'Connected' : databaseProbe ? 'Unavailable' : 'Not checked'}
          </div>
          <div className="text-xs text-blue-400">{databaseProbe ? `Database probe HTTP ${databaseProbe.statusCode ?? 'unreachable'}` : 'Run diagnostics to check the database connection'}</div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>WHIP Media Ingest</span>
            <Radio className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">Not configured</div>
          <div className="text-xs text-purple-300">No streaming health endpoint is configured</div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
            <span>Android HBC Bytecode</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">Not collected</div>
          <div className="text-xs text-amber-300">Mobile build telemetry is not connected</div>
        </div>
      </div>

      {/* Live Endpoints Ping Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">
            API Endpoints Telemetry Matrix
          </h3>
          <span className="text-xs font-mono text-slate-300">Target: {new URL(API_BASE_URL).host}</span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0A0A1A] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5 font-bold uppercase">Endpoint Name</th>
                <th className="p-3.5 font-bold uppercase">Route Path</th>
                <th className="p-3.5 font-bold uppercase">HTTP Status</th>
                <th className="p-3.5 font-bold uppercase">Round-Trip Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-300">
              {endpoints.map((ep, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-sans font-bold text-white">{ep.name}</td>
                  <td className="p-3.5 text-blue-400">{ep.path}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded font-bold border ${ep.state === 'ok' ? 'bg-emerald-950 text-emerald-300 border-emerald-800/60' : ep.state === 'error' ? 'bg-red-950 text-red-300 border-red-800/60' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                      {ep.state === 'pending' ? 'Not checked' : ep.statusCode === null ? 'Unreachable' : `HTTP ${ep.statusCode}`}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-300 font-semibold">{ep.latencyMs === null ? '—' : `${ep.latencyMs} ms`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type ProbeState = 'pending' | 'ok' | 'error';
type EndpointDefinition = { name: string; path: string };
type EndpointProbe = EndpointDefinition & {
  state: ProbeState;
  statusCode: number | null;
  latencyMs: number | null;
  connected: boolean | null;
};

const ENDPOINTS: EndpointDefinition[] = [
  { name: 'Core health', path: '/api/health' },
  { name: 'Database readiness', path: '/api/health/db' },
  { name: 'Feature configuration', path: '/api/v1/config/flags' },
  { name: 'Telangana constituencies', path: '/api/v1/states/TS/constituencies' },
  { name: 'Delimitation scenarios', path: '/api/v1/delimitation/scenarios/TS' },
];
