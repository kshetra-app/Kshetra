import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, GitMerge, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import type { DelimitationProjectionsDTO } from '@kshetra/shared';

type ProjectionModel = 'constitutional_proportional' | 'expansion_safe';
const formatCount = (value: number) => value.toLocaleString('en-IN');

export function Delimitation() {
  const [model, setModel] = useState<ProjectionModel>('constitutional_proportional');
  const [projections, setProjections] = useState<DelimitationProjectionsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setProjections(null);

    void api.getDelimitationProjections(model)
      .then((result) => { if (active) setProjections(result); })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Delimitation projections are unavailable.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [model, retry]);

  const inputSources = projections?.provenance.inputDatasetVersions ?? [];
  const sourceReviewPending = inputSources.some(
    (source) => source.substantiveVerificationStatus !== 'PROVISION_VERIFIED_FOR_IMPLEMENTATION',
  );
  const sourceReviewStatus = inputSources.length === 0
    ? 'No input verification metadata was returned'
    : sourceReviewPending
      ? 'At least one source is pending substantive verification'
      : 'The API reports its inputs as verified for implementation';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-indigo-400" />Delimitation Scenario Projections
          </h1>
          <p className="text-xs text-slate-400 max-w-3xl">
            Results are calculated by the configured API from its Census 2011 benchmark inputs. This is a research model, not an official ECI order or a prediction of future seat allocations.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="projection-model" className="sr-only">Projection model</label>
          <select
            id="projection-model"
            value={model}
            onChange={(event) => setModel(event.target.value as ProjectionModel)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl"
          >
            <option value="constitutional_proportional">Equal-population quotient</option>
            <option value="expansion_safe">Equal-population, no baseline reductions</option>
          </select>
          <button
            onClick={() => setRetry((current) => current + 1)}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      </div>

      <div role="note" className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-4 text-sm text-amber-200 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Scenario output only</p>
          <p>{projections?.disclaimer ?? 'This model must not be treated as a statutory allocation or official delimitation proposal.'}</p>
          {projections && <p>Input review status: {sourceReviewStatus}.</p>}
        </div>
      </div>

      {loading && <div className="rounded-xl border border-slate-800 bg-[#111827] p-8 text-center text-sm text-slate-400">Loading scenario output from the API…</div>}
      {error && (
        <div role="alert" className="rounded-xl border border-red-800/60 bg-red-950/30 p-6 text-sm text-red-300 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button onClick={() => setRetry((current) => current + 1)} className="shrink-0 rounded-lg px-3 py-2 text-xs text-red-200 hover:bg-red-900/40">Retry</button>
        </div>
      )}

      {projections && !loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <MetricCard label="States in API response" value={formatCount(projections.summary.statesAnalyzed)} detail={`Census benchmark: ${projections.censusYear}`} />
            <MetricCard label="Baseline seats" value={formatCount(projections.summary.totalCurrentSeats)} detail="Source baseline returned by the API" />
            <MetricCard label="Modeled seats" value={formatCount(projections.summary.totalProjectedSeats)} detail={projections.model} />
          </div>

          <section className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-sm text-slate-200">State model output</h2>
                <p className="text-xs text-slate-400 mt-1">Population and seat values below come from this API response; they are not live electorate counts.</p>
              </div>
              <p className="text-xs text-slate-400">Increased: {formatCount(projections.summary.totalGained)} · Reduced: {formatCount(Math.abs(projections.summary.totalLost))}</p>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A0A1A] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">State</th>
                    <th className="p-3.5">Population input ({projections.censusYear})</th>
                    <th className="p-3.5">Baseline seats</th>
                    <th className="p-3.5">Modeled seats</th>
                    <th className="p-3.5">Change</th>
                    <th className="p-3.5">Data status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 text-slate-300">
                  {projections.projections.map((row) => (
                    <tr key={row.stateCode}>
                      <td className="p-3.5"><span className="font-semibold text-white">{row.stateName}</span><span className="ml-2 text-slate-500">{row.stateCode}</span></td>
                      <td className="p-3.5">{formatCount(row.population)}</td>
                      <td className="p-3.5">{formatCount(row.currentSeats)}</td>
                      <td className="p-3.5 font-semibold text-indigo-300">{formatCount(row.projectedSeats)}</td>
                      <td className={`p-3.5 font-semibold ${row.seatChange > 0 ? 'text-emerald-400' : row.seatChange < 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                        <span className="inline-flex items-center gap-1">
                          {row.seatChange > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : row.seatChange < 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : null}
                          {row.seatChange > 0 ? '+' : ''}{formatCount(row.seatChange)}
                        </span>
                      </td>
                      <td className="p-3.5">{row.dataStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-bold text-sm text-slate-200">Input provenance from API</h2>
            <p className="text-xs text-slate-400">Method: {projections.methodology}</p>
            {inputSources.length === 0 ? <p className="text-xs text-amber-300">No input-source records were returned.</p> : (
              <ul className="space-y-2">
                {inputSources.map((source) => (
                  <li key={`${source.datasetId}:${source.versionTag}`} className="rounded-lg bg-slate-900/70 border border-slate-800 p-3 text-xs text-slate-300">
                    <div className="font-semibold text-white">{source.sourceAuthority} · {source.datasetId} ({source.versionTag})</div>
                    <div className="mt-1">Publication date: {source.publicationDate || 'Not supplied'} · substantive verification: {source.substantiveVerificationStatus ?? 'Not reported'}</div>
                    <div className="mt-1 text-slate-400">{source.evidenceStatus ?? 'Evidence status not supplied by API'}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl">
      <div className="text-xs text-slate-400 font-bold uppercase mb-2">{label}</div>
      <div className="text-2xl font-extrabold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-2">{detail}</div>
    </div>
  );
}
