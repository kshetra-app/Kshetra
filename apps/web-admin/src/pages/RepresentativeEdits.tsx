import { useCallback, useEffect, useState } from 'react';
import { GitPullRequest } from 'lucide-react';
import { api, type RepresentativeCorrection } from '../lib/api';

export function RepresentativeEdits() {
  const [records, setRecords] = useState<RepresentativeCorrection[] | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setRecords(await api.getRepresentativeCorrections()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load corrections.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function review(id: number, decision: 'approved' | 'rejected') {
    if (saving !== null || !notes[id] || notes[id].trim().length < 10) return;
    setSaving(id);
    setError('');
    try {
      await api.reviewRepresentativeCorrection(id, decision, notes[id].trim());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the review.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-xl font-bold text-white">
          <GitPullRequest className="w-5 h-5 text-indigo-400" /> Representative Profile Corrections
        </h1>
        <button disabled={loading || saving !== null} onClick={() => void load()} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">Refresh</button>
      </div>
      <p className="text-sm text-slate-300">Check the official evidence and the person’s identity before approving. Publish contact details only when the authority lists them for public use.</p>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {loading ? <p>Loading corrections…</p> : !error && records?.length === 0 ? <p>No pending corrections.</p> : null}
      {records?.map((record) => (
        <article key={record.id} className="rounded-2xl border border-slate-800 bg-[#111827] p-5 space-y-3">
          <h2 className="break-all font-semibold">{record.representative_id}</h2>
          <p className="text-sm text-slate-400">{new Date(record.submitted_at).toLocaleString()}</p>
          {record.source_url?.startsWith('https://') && (
            <a className="text-indigo-300 underline" href={record.source_url} target="_blank" rel="noreferrer">Open supporting source</a>
          )}
          {record.citation && <p className="text-sm">{record.citation}</p>}
          <dl className="space-y-2 break-words text-sm">
            {Object.entries(record.diff ?? {}).map(([field, values]) => (
              <div key={field}><dt className="font-semibold">{field}</dt>
                <dd className="text-slate-400">{String(values?.from ?? '—')} → {String(values?.to ?? '—')}</dd>
              </div>
            ))}
          </dl>
          <label className="block text-sm">Review note
            <textarea value={notes[record.id] ?? ''} onChange={(event) => {
              const value = event.target.value;
              setNotes((previous) => ({ ...previous, [record.id]: value }));
            }} maxLength={500} className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 p-2" />
          </label>
          <div className="flex gap-2">
            {(['approved', 'rejected'] as const).map((decision) => (
              <button key={decision} disabled={loading || saving !== null || (notes[record.id]?.trim().length ?? 0) < 10}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-50"
                onClick={() => void review(record.id, decision)}>
                {decision === 'approved' ? 'Approve correction' : 'Reject correction'}
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
