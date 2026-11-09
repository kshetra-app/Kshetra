import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface StateOption { code: string; name: string; dataStatus?: string; }
interface ConstituencyItem {
  id: string;
  name: string;
  stateCode: string;
  district?: string;
  currentParty?: string | null;
  currentMLA?: string | null;
}

export function Constituencies() {
  const [states, setStates] = useState<StateOption[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [constituencies, setConstituencies] = useState<ConstituencyItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void api.getStates().then((result: { states?: StateOption[] }) => {
      if (!active) return;
      const rows = Array.isArray(result.states) ? result.states : [];
      setStates(rows);
      if (rows[0]?.code) setSelectedState(rows[0].code);
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : 'State list could not be loaded.');
    }).finally(() => { if (active) setLoadingStates(false); });
    return () => { active = false; };
  }, []);

  const loadConstituencies = useCallback(async () => {
    if (!selectedState) return;
    setLoadingList(true);
    setError(null);
    try {
      const result = await api.getConstituencies(selectedState) as { data?: ConstituencyItem[] };
      setConstituencies(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setConstituencies([]);
      setError(err instanceof Error ? err.message : 'Constituencies could not be loaded.');
    } finally {
      setLoadingList(false);
    }
  }, [selectedState]);

  useEffect(() => { void loadConstituencies(); }, [loadConstituencies]);

  const filtered = useMemo(() => constituencies.filter((item) => {
    const query = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(query) || item.id.toLowerCase().includes(query) || (item.district ?? '').toLowerCase().includes(query);
  }), [constituencies, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-400" />Constituency Directory</h1>
          <p className="text-xs text-slate-400">Records below are returned by the states and constituencies API. Electorate totals and map boundaries are not supplied by this screen.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedState} onChange={(event) => setSelectedState(event.target.value)} disabled={loadingStates || states.length === 0} className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl">
            {states.map((state) => <option key={state.code} value={state.code}>{state.name} ({state.code})</option>)}
          </select>
          <button onClick={() => void loadConstituencies()} disabled={loadingList || !selectedState} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      </div>

      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input type="text" placeholder="Search constituency, ID, or district" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full bg-[#0A0A1A] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          </div>
          <div className="text-xs text-slate-400">{loadingList ? 'Loading…' : `${filtered.length} records returned`}</div>
        </div>

        {error && <div className="rounded-xl border border-red-800/60 bg-red-950/30 p-4 text-sm text-red-300 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
        {!loadingList && !error && filtered.length === 0 && <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">No constituency records were returned for this state and search.</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-800 bg-[#0A0A1A] p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold text-sm text-white">{item.name}</h2>
                  <p className="text-[11px] font-mono text-slate-400">{item.id}</p>
                </div>
                <span className="text-[10px] uppercase text-slate-500">{item.stateCode}</span>
              </div>
              <p className="text-xs text-slate-400">District: {item.district || 'Not recorded'}</p>
              <p className="text-xs text-slate-400">Representative: {item.currentMLA || 'Not recorded'}</p>
              <p className="text-xs text-slate-400">Party: {item.currentParty || 'Not recorded'}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
