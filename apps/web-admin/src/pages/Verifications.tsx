import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BadgeCheck, Check, RefreshCw, ShieldX, UserRound } from 'lucide-react';
import { api, type ContributorVerificationQueueItem } from '../lib/api';

const PAGE_SIZE = 20;

export function Verifications() {
  const [records, setRecords] = useState<ContributorVerificationQueueItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const loadQueue = useCallback(async (append = false) => {
    const currentOffset = append ? records.length : 0;
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setError(null);
    }
    try {
      const page = await api.getContributorVerificationQueue(PAGE_SIZE, currentOffset);
      setRecords((current) => append ? [...current, ...page.records] : page.records);
      setHasMore(page.hasMore);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The verification queue could not be loaded.';
      if (append) setActionError(message);
      else setError(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [records.length]);

  useEffect(() => { void loadQueue(); }, []); // initial page only

  const review = async (record: ContributorVerificationQueueItem, decision: 'verified' | 'rejected') => {
    if (!record.evidenceAvailable) {
      setActionError('This record has no accessible private selfie evidence. No decision was made.');
      return;
    }
    const rejectionReason = rejectionReasons[record.id]?.trim();
    if (decision === 'rejected' && (!rejectionReason || rejectionReason.length < 10)) {
      setActionError('Enter a rejection reason with at least 10 characters.');
      return;
    }
    const prompt = decision === 'verified'
      ? 'Confirm that you reviewed the identity evidence and want to verify this contributor?'
      : 'Confirm that you want to reject this contributor verification?';
    if (!window.confirm(prompt)) return;

    setActionError(null);
    setBusyId(record.id);
    try {
      await api.reviewContributorVerification(record.id, decision, rejectionReason);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setRejectionReasons((current) => {
        const next = { ...current };
        delete next[record.id];
        return next;
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The review decision was not saved. Refresh and try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-[#111827] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white">
            <BadgeCheck className="h-5 w-5 text-emerald-400" />Contributor identity review
          </h1>
          <p className="mt-2 text-sm text-slate-400">Applicant details and private selfie evidence are loaded from the authenticated review API. Decisions are recorded before an item leaves the queue.</p>
        </div>
        <button onClick={() => void loadQueue()} disabled={loading || loadingMore} className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh queue
        </button>
      </header>

      <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-200">
        <strong>Handle identity evidence as confidential.</strong> Selfie links expire after 10 minutes. Refresh the queue if an image no longer opens. Only approve after reviewing the evidence and following your organization’s verification procedure.
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {actionError && <Notice tone="error">{actionError}</Notice>}

      {loading ? <Notice>Loading verification queue…</Notice> : error ? null : records.length === 0 ? (
        <Notice>The API returned no pending contributor verification records.</Notice>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <article key={record.id} className="grid gap-6 rounded-2xl border border-slate-800 bg-[#111827] p-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-slate-800 p-2 text-slate-300"><UserRound className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <h2 className="break-words text-base font-bold text-white">{record.fullLegalName || 'Name unavailable'}</h2>
                    <p className="mt-1 break-all font-mono text-xs text-slate-400">Account {record.userId}</p>
                  </div>
                </div>
                <dl className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-slate-500">Phone</dt><dd className="mt-1 text-slate-200">{record.phoneNumber || 'Unavailable'}</dd></div>
                  <div><dt className="text-xs text-slate-500">Phone verified</dt><dd className="mt-1 text-slate-200">{record.phoneVerified ? 'Yes' : 'No'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Submitted</dt><dd className="mt-1 text-slate-200">{new Date(record.createdAt).toLocaleString()}</dd></div>
                </dl>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-slate-300">Rejection reason (required when rejecting)</span>
                  <textarea
                    value={rejectionReasons[record.id] ?? ''}
                    onChange={(event) => setRejectionReasons((current) => ({ ...current, [record.id]: event.target.value }))}
                    maxLength={500}
                    rows={3}
                    placeholder="Give the applicant a clear, actionable reason."
                    className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-amber-500"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void review(record, 'verified')} disabled={busyId === record.id || !record.evidenceAvailable} className="flex items-center gap-2 rounded-xl border border-emerald-800/70 bg-emerald-950/50 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-900/50 disabled:opacity-40">
                    <Check className="h-4 w-4" />Verify
                  </button>
                  <button onClick={() => void review(record, 'rejected')} disabled={busyId === record.id || !record.evidenceAvailable || (rejectionReasons[record.id]?.trim().length ?? 0) < 10} className="flex items-center gap-2 rounded-xl border border-red-800/70 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-900/40 disabled:opacity-40">
                    <ShieldX className="h-4 w-4" />Reject
                  </button>
                  {busyId === record.id && <span className="self-center text-xs text-slate-400">Saving decision…</span>}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                {record.evidenceAvailable && record.selfieSignedUrl ? (
                  <img src={record.selfieSignedUrl} alt="Private contributor selfie evidence" className="max-h-[420px] w-full object-contain" />
                ) : (
                  <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-400">
                    <AlertCircle className="h-7 w-7 text-amber-400" />
                    <span>Private selfie evidence is unavailable. This record cannot be approved from this screen.</span>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && hasMore && (
        <div className="text-center">
          <button onClick={() => void loadQueue(true)} disabled={loadingMore} className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
            {loadingMore ? 'Loading…' : 'Load more pending records'}
          </button>
        </div>
      )}
    </div>
  );
}

function Notice({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'error' }) {
  return <div className={`rounded-2xl border p-8 text-center text-sm ${tone === 'error' ? 'border-red-800/60 bg-red-950/30 text-red-300' : 'border-slate-800 bg-[#111827] text-slate-400'}`}>{tone === 'error' && <AlertCircle className="mx-auto mb-2 h-5 w-5" />}{children}</div>;
}
