import React, { useState } from 'react';
import {
  GitMerge,
  TrendingUp,
  Scale,
  Building,
  Info,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface DelimitationState {
  state: string;
  code: string;
  currentSeats: number;
  projectedSeats2026: number;
  projectedSeats848: number;
  shift: number;
}

const DELIMITATION_DATA: DelimitationState[] = [
  { state: 'Uttar Pradesh', code: 'UP', currentSeats: 80, projectedSeats2026: 143, projectedSeats848: 128, shift: 63 },
  { state: 'Bihar', code: 'BR', currentSeats: 40, projectedSeats2026: 79, projectedSeats848: 71, shift: 39 },
  { state: 'Rajasthan', code: 'RJ', currentSeats: 25, projectedSeats2026: 50, projectedSeats848: 44, shift: 25 },
  { state: 'Madhya Pradesh', code: 'MP', currentSeats: 29, projectedSeats2026: 52, projectedSeats848: 47, shift: 23 },
  { state: 'Maharashtra', code: 'MH', currentSeats: 48, projectedSeats2026: 76, projectedSeats848: 68, shift: 28 },
  { state: 'Gujarat', code: 'GJ', currentSeats: 26, projectedSeats2026: 43, projectedSeats848: 38, shift: 17 },
  { state: 'Tamil Nadu', code: 'TN', currentSeats: 39, projectedSeats2026: 31, projectedSeats848: 41, shift: -8 },
  { state: 'Andhra Pradesh', code: 'AP', currentSeats: 25, projectedSeats2026: 20, projectedSeats848: 28, shift: -5 },
  { state: 'Telangana', code: 'TS', currentSeats: 17, projectedSeats2026: 15, projectedSeats848: 20, shift: -2 },
  { state: 'Kerala', code: 'KL', currentSeats: 20, projectedSeats2026: 12, projectedSeats848: 19, shift: -8 },
  { state: 'Karnataka', code: 'KA', currentSeats: 28, projectedSeats2026: 26, projectedSeats848: 36, shift: -2 },
  { state: 'West Bengal', code: 'WB', currentSeats: 42, projectedSeats2026: 48, projectedSeats848: 52, shift: 6 },
];

export function Delimitation() {
  const [modelType, setModelType] = useState<'848_seats' | 'population_pure'>('848_seats');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-indigo-400" />
            <span>Post-2026 Delimitation Scenario Simulator</span>
          </h1>
          <p className="text-xs text-slate-400">
            Interactive mathematical modeling of the upcoming Lok Sabha reapportionment and boundary re-demarcation based on 2026 census estimates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModelType('848_seats')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              modelType === '848_seats'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            New Parliament (848 Seats Model)
          </button>
          <button
            onClick={() => setModelType('population_pure')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              modelType === 'population_pure'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Pure Population Share (543 Base)
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-bold uppercase mb-2">Total Lok Sabha Capacity</div>
          <div className="text-3xl font-extrabold text-white">848 Seats</div>
          <div className="text-xs text-indigo-400 mt-2 font-medium">New Sansad Bhavan Capable</div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-bold uppercase mb-2">Northern States Share Shift</div>
          <div className="text-3xl font-extrabold text-emerald-400 flex items-center gap-1">
            <span>+152 Seats</span>
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">UP, BR, MP, RJ demographic expansion</div>
        </div>

        <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-bold uppercase mb-2">Southern States Share Shift</div>
          <div className="text-3xl font-extrabold text-amber-400 flex items-center gap-1">
            <span>-25 Seats</span>
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">Under pure proportional formula</div>
        </div>
      </div>

      {/* State-by-State Seat Reapportionment Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">
            State-by-State Projected Seat Allocations
          </h3>
          <span className="text-xs font-mono text-slate-400">ECI Article 82 Modeling</span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0A0A1A] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5 font-bold uppercase">State</th>
                <th className="p-3.5 font-bold uppercase">Code</th>
                <th className="p-3.5 font-bold uppercase">Current Seats (1971 Base)</th>
                <th className="p-3.5 font-bold uppercase text-indigo-400">
                  {modelType === '848_seats' ? 'Projected (848 House)' : 'Projected (543 House)'}
                </th>
                <th className="p-3.5 font-bold uppercase">Seat Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-300">
              {DELIMITATION_DATA.map((row) => {
                const targetSeats = modelType === '848_seats' ? row.projectedSeats848 : row.projectedSeats2026;
                const variance = targetSeats - row.currentSeats;
                return (
                  <tr key={row.code} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-sans font-bold text-white">{row.state}</td>
                    <td className="p-3.5 text-slate-400">{row.code}</td>
                    <td className="p-3.5 text-slate-200">{row.currentSeats}</td>
                    <td className="p-3.5 font-bold text-indigo-300">{targetSeats}</td>
                    <td className="p-3.5 font-bold">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          variance > 0
                            ? 'text-emerald-400'
                            : variance < 0
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {variance > 0 ? `+${variance}` : variance}
                        {variance > 0 && <ArrowUpRight className="w-3.5 h-3.5" />}
                        {variance < 0 && <ArrowDownRight className="w-3.5 h-3.5" />}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
