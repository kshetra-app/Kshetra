import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Building2, ThumbsUp, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

type IssueStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
interface CivicIssue {
  id: string;
  title: string;
  category: string;
  constituency: string;
  upvotes: number | null;
  reportedBy: string;
  department: string;
  status: IssueStatus;
  reportedAt: string;
}

function normalizeIssue(raw: Record<string, unknown>): CivicIssue {
  const rawStatus = String(raw.status ?? 'open').toLowerCase();
  const allowedStatuses: IssueStatus[] = ['open', 'acknowledged', 'in_progress', 'resolved', 'closed', 'reopened'];
  const status = allowedStatuses.includes(rawStatus as IssueStatus) ? rawStatus as IssueStatus : 'open';
  const createdAt = String(raw.createdAt ?? raw.created_at ?? '');
  const createdDate = createdAt ? new Date(createdAt) : null;
  const reportedAt = createdDate && !Number.isNaN(createdDate.valueOf())
    ? createdDate.toLocaleString()
    : 'Date unavailable';
  const constituencyId = raw.constituencyId ?? raw.constituency_id ?? raw.constituencyName ?? raw.constituency_name;
  const stateCode = raw.stateCode ?? raw.state_code;

  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? 'Untitled issue'),
    category: String(raw.category ?? 'uncategorized'),
    constituency: [constituencyId, stateCode].filter(Boolean).map(String).join(' · ') || 'Location unavailable',
    upvotes: typeof (raw.upvoteCount ?? raw.upvote_count ?? raw.upvotes) === 'number'
      ? Number(raw.upvoteCount ?? raw.upvote_count ?? raw.upvotes)
      : null,
    reportedBy: String(raw.reporterName ?? raw.reporter_name ?? 'Reporter unavailable'),
    department: String(raw.assignedDepartment ?? raw.assigned_department ?? raw.department ?? 'Not assigned'),
    status,
    reportedAt,
  };
}

export function CivicIssues() {
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | IssueStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getCivicIssues() as { issues?: Record<string, unknown>[] };
      setIssues(Array.isArray(result.issues) ? result.issues.map(normalizeIssue).filter((issue) => issue.id) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Civic issues could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadIssues(); }, [loadIssues]);

  const handleUpdateStatus = async (id: string, status: IssueStatus) => {
    const prior = issues.find((issue) => issue.id === id);
    if (!prior || prior.status === status) return;
    setActionError(null);
    setSavingId(id);
    try {
      await api.updateCivicIssueStatus(id, status);
      setIssues((current) => current.map((issue) => issue.id === id ? { ...issue, status } : issue));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The issue status was not saved.');
    } finally {
      setSavingId(null);
    }
  };

  const filtered = statusFilter === 'all' ? issues : issues.filter((issue) => issue.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400" />Civic Issues</h1>
          <p className="text-xs text-slate-400">Issues and status changes are loaded from and saved through the civic API.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadIssues()} disabled={loading} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
          <div className="flex flex-wrap gap-2">
            {(['all', 'open', 'acknowledged', 'in_progress', 'resolved', 'closed'] as const).map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider ${statusFilter === status ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {actionError && <Notice tone="error">{actionError}</Notice>}

      {loading ? <Notice>Loading issues from the civic API…</Notice> : error ? null : filtered.length === 0 ? (
        <Notice>{issues.length === 0 ? 'No civic issues were returned by the API.' : 'No issues match this status filter.'}</Notice>
      ) : (
        <div className="space-y-4">
          {filtered.map((issue) => (
            <div key={issue.id} className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-200 font-bold uppercase">{issue.status.replace('_', ' ')}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 font-mono font-bold uppercase">{issue.category}</span>
                  <span>• {issue.constituency}</span><span>• {issue.reportedAt}</span>
                </div>
                <h3 className="text-sm font-bold text-white leading-snug">{issue.title}</h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /><span>Assigned: <strong className="text-slate-300">{issue.department}</strong></span></div>
                  <div className="flex items-center gap-1 text-emerald-400 font-semibold"><ThumbsUp className="w-3.5 h-3.5" /><span>{issue.upvotes === null ? 'Upvote count unavailable' : `${issue.upvotes.toLocaleString()} upvotes`}</span></div>
                  <span>Reported by {issue.reportedBy}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select value={issue.status} disabled={savingId === issue.id} onChange={(event) => void handleUpdateStatus(issue.id, event.target.value as IssueStatus)} className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl">
                  {(['open', 'acknowledged', 'in_progress', 'resolved', 'closed', 'reopened'] as IssueStatus[]).map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                </select>
                {savingId === issue.id && <span className="text-xs text-slate-400">Saving…</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Notice({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'error' }) {
  return (
    <div className={`rounded-2xl border p-8 text-center text-sm ${tone === 'error' ? 'border-red-800/60 bg-red-950/30 text-red-300' : 'border-slate-800 bg-[#111827] text-slate-400'}`}>
      {tone === 'error' && <AlertCircle className="w-5 h-5 mx-auto mb-2" />}{children}
    </div>
  );
}
