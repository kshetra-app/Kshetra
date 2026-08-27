import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { DEFAULT_STATES } from '../lib/constants';
import {
  MapPin,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Info,
  ExternalLink,
} from 'lucide-react';

interface ConstituencyItem {
  id: string;
  name: string;
  type: 'AC' | 'PC';
  stateCode: string;
  totalVoters: number;
  currentParty: string;
  representative: string;
}

const SAMPLE_CONSTITUENCIES: ConstituencyItem[] = [
  { id: 'TS-AC-60', name: 'Khairatabad', type: 'AC', stateCode: 'TS', totalVoters: 284520, currentParty: 'INC', representative: 'Danam Nagender' },
  { id: 'TS-AC-61', name: 'Jubilee Hills', type: 'AC', stateCode: 'TS', totalVoters: 364910, currentParty: 'BRS', representative: 'Maganti Gopinath' },
  { id: 'TS-AC-62', name: 'Sanathnagar', type: 'AC', stateCode: 'TS', totalVoters: 241900, currentParty: 'BRS', representative: 'Talasani Srinivas Yadav' },
  { id: 'TS-AC-63', name: 'Nampally', type: 'AC', stateCode: 'TS', totalVoters: 312400, currentParty: 'AIMIM', representative: 'Mohammed Majid Hussain' },
  { id: 'TS-AC-64', name: 'Karwan', type: 'AC', stateCode: 'TS', totalVoters: 341200, currentParty: 'AIMIM', representative: 'Kausar Mohiuddin' },
  { id: 'TS-AC-65', name: 'Goshamahal', type: 'AC', stateCode: 'TS', totalVoters: 275800, currentParty: 'BJP', representative: 'T. Raja Singh' },
  { id: 'TS-AC-66', name: 'Charminar', type: 'AC', stateCode: 'TS', totalVoters: 221940, currentParty: 'AIMIM', representative: 'Mir Zulfeqar Ali' },
  { id: 'TS-PC-09', name: 'Hyderabad', type: 'PC', stateCode: 'TS', totalVoters: 1982400, currentParty: 'AIMIM', representative: 'Asaduddin Owaisi' },
  { id: 'TS-PC-10', name: 'Secunderabad', type: 'PC', stateCode: 'TS', totalVoters: 2145000, currentParty: 'BJP', representative: 'G. Kishan Reddy' },
];

export function Constituencies() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [selectedState, setSelectedState] = useState<string>('TS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<ConstituencyItem | null>(SAMPLE_CONSTITUENCIES[0]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [78.4867, 17.3850], // Hyderabad
      zoom: 10,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, []);

  const filtered = SAMPLE_CONSTITUENCIES.filter(
    (c) =>
      c.stateCode === selectedState &&
      (c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.representative.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            <span>Constituencies & PostGIS Boundaries Inspector</span>
          </h1>
          <p className="text-xs text-slate-400">
            Search, filter, and inspect 4,123 Assembly and Parliamentary constituencies with polygon geometries.
          </p>
        </div>

        {/* State Selector */}
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500"
        >
          {DEFAULT_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.acCount} ACs / {s.pcCount} PCs)
            </option>
          ))}
        </select>
      </div>

      {/* Main Grid: Directory + Map Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Search & Table List */}
        <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col h-[600px]">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, ID, or MLA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A0A1A] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  selectedItem?.id === item.id
                    ? 'bg-blue-950/40 border-blue-500/60 shadow-sm shadow-blue-500/10'
                    : 'bg-[#0A0A1A] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{item.name}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {item.id}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    MLA: <strong className="text-slate-300">{item.representative}</strong> ({item.currentParty})
                  </div>
                </div>

                <div className="text-right text-[11px]">
                  <div className="text-slate-400">{(item.totalVoters / 1000).toFixed(0)}k Voters</div>
                  <div className="text-blue-400 font-semibold">{item.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: MapLibre View & Selected Dossier */}
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col h-[600px]">
          {/* Map header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-xs text-slate-200">
                Spatial Boundary: <span className="text-white font-mono">{selectedItem?.name || 'Overview'}</span>
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">EPSG:4326 PostGIS</span>
          </div>

          {/* Interactive Map Container */}
          <div ref={mapContainer} className="flex-1 rounded-xl overflow-hidden border border-slate-800 bg-[#0A0A1A]" />

          {/* Selected Item Quick Details Footer */}
          {selectedItem && (
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Constituency</span>
                  <span className="font-bold text-white">{selectedItem.name} ({selectedItem.id})</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Current Incumbent</span>
                  <span className="font-bold text-slate-200">{selectedItem.representative}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Party</span>
                  <span className="font-bold text-emerald-400">{selectedItem.currentParty}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Electorate</span>
                <span className="font-mono font-bold text-blue-400">{selectedItem.totalVoters.toLocaleString()} voters</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
