import React, { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { api, type HealthResponse } from '../lib/api';
import { API_BASE_URL } from '../lib/constants';

interface EndpointCheck {
  name: string;
  path: string;
  status: 'ok' | 'error';
  latencyMs: number;
  detail: string;
}

export function SystemHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checks, setChecks] = useState<EndpointCheck[]>([]);
  const [testing, setTesting] = useState(false);

  const runDiagnostics = useCallback(async () => {
    setTesting(true);
    const probes: { name: string; path: string; run: () => Promise<unknown> }[] = [
      { name: 'API health', path: '/api/health', run: api.getHealth },
      { name: 'Feature flags', path: '/api/v1/config/flags', run: api.getFlags },
      { name: 'Civic issues', path: '/api/v1/civic/issues', run: api.getCivicIssues },
      { name: 'Constituencies (TS)', path: '/api/v1/states/TS/constituencies', run: () => api.getConstituencies('TS') },
    ];

    const results = await Promise.all(probes.map(async (probe): Promise<EndpointCheck> => {
      const startedAt = performance.now();
      try {
        const result = await probe.run();
        if (probe.name === 'API health') setHealth(result as HealthResponse);
        return { name: probe.name, path: probe.path, status: 'ok', latencyMs: Math.round(performance.now() - startedAt), detail: 'Request returned successfully' };
      } catch (error) {
        if (probe.name === 'API health') setHealth(null);
        return {
          name: probe.name,
          path: probe.path,
          status: 'error',
          latencyMs: Math.round(performance.now() - startedAt),
          detail: error instanceof Error ? error.message : 'Request failed',
        };
      }
    }));
    setChecks(results);
    setTesting(false);
  }, []);

  useEffect(() => { void runDiagnostics(); }, [runDiagnostics]);

  const apiHealth = checks.find((check) => check.name === 'API health');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-400" />API Reachability Diagnostics</h1>
          <p className="text-xs text-slate-400">Runs real HTTP requests to these API endpoints. A successful request does not certify database, media, or mobile-client health.</p>
        </div>
        <button onClick={() => void runDiagnostics()} disabled={testing} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />{testing ? 'Checking…' : 'Run Checks'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="text-xs text-slate-400 font-bold uppercase">API service</div>
          <div className="text-xl font-extrabold text-white">{health?.service ?? 'No health response'}</div>
          <div className="text-xs text-slate-400">{health ? `Version ${health.version} · status ${health.status}` : 'The health route has not returned successfully.'}</div>
        </div>
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="text-xs text-slate-400 font-bold uppercase">API target</div>
          <div className="text-sm font-mono text-blue-300 break-all">{API_BASE_URL}</div>
          <div className={`text-xs font-semibold flex items-center gap-1.5 ${apiHealth?.status === 'ok' ? 'text-emerald-400' : apiHealth?.status === 'error' ? 'text-red-300' : 'text-slate-400'}`}>
            {apiHealth?.status === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5" /> : apiHealth?.status === 'error' ? <AlertCircle className="w-3.5 h-3.5" /> : null}
            {apiHealth ? (apiHealth.status === 'ok' ? `Health request responded in ${apiHealth.latencyMs} ms` : 'Health request failed') : 'Not checked yet'}
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-xs uppercase tracking-wider text-slate-300">Observed endpoint checks</h2>
        {checks.length === 0 ? <p className="text-sm text-slate-400">No checks have completed.</p> : (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0A0A1A] text-slate-400 border-b border-slate-800">
                <tr><th className="p-3.5">Endpoint</th><th className="p-3.5">Path</th><th className="p-3.5">Result</th><th className="p-3.5">Observed time</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-300">
                {checks.map((check) => (
                  <tr key={check.path}>
                    <td className="p-3.5 font-semibold text-white">{check.name}</td>
                    <td className="p-3.5 font-mono text-blue-300">{check.path}</td>
                    <td className={`p-3.5 font-semibold ${check.status === 'ok' ? 'text-emerald-400' : 'text-red-300'}`}>{check.status === 'ok' ? check.detail : check.detail}</td>
                    <td className="p-3.5">{check.latencyMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
