import React, { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle, Trash2, Radio, MessageSquare, FileText, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

type TargetType = 'post' | 'comment' | 'stream' | 'unknown';
interface ReportItem {
  id: string;
  targetId?: string;
  targetType: TargetType;
  targetTitle: string;
  reporter: string;
  reason: string;
  severity: string | null;
  timestamp: string;
}

function normalizeReport(raw: Record<string, unknown>): ReportItem {
  const post = raw.post && typeof raw.post === 'object' ? raw.post as Record<string, unknown> : {};
  const comment = raw.comment && typeof raw.comment === 'object' ? raw.comment as Record<string, unknown> : {};
  const postId = raw.post_id ?? raw.postId ?? post.id;
  const commentId = raw.comment_id ?? raw.commentId ?? comment.id;
  const targetType: TargetType = postId ? 'post' : commentId ? 'comment' : raw.stream_id ? 'stream' : 'unknown';
  const targetId = String(postId ?? commentId ?? raw.stream_id ?? '');
  const content = targetType === 'post' ? post.content : comment.content;
  const createdAt = String(raw.created_at ?? raw.createdAt ?? '');
  const date = createdAt ? new Date(createdAt) : null;
  const reporterId = raw.reporter_id ?? raw.reporterId;

  return {
    id: String(raw.id ?? ''),
    targetId,
    targetType,
    targetTitle: typeof content === 'string' && content.trim() ? content.trim() : `${targetType} ${targetId || 'target details unavailable'}`,
    reporter: reporterId ? String(reporterId) : 'Reporter details unavailable',
    reason: String(raw.description ?? raw.reason ?? 'Reason not provided'),
    severity: typeof raw.severity === 'string' ? raw.severity : null,
    timestamp: date && !Number.isNaN(date.valueOf()) ? date.toLocaleString() : 'Date unavailable',
  };
}

export function Moderation() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'stream' | 'post' | 'comment'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getModerationQueue() as { data?: { queue?: Record<string, unknown>[] } };
      const queue = result.data?.queue;
      setReports(Array.isArray(queue) ? queue.map(normalizeReport).filter((item) => item.id) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Moderation queue could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadQueue(); }, [loadQueue]);

  const handleAction = async (item: ReportItem, action: 'dismiss' | 'delete_content') => {
    if (!item.targetId || (item.targetType !== 'post' && item.targetType !== 'comment' && action !== 'dismiss')) {
      setActionError('This report does not include a supported content target. No action was taken.');
      return;
    }
    setActionError(null);
    setBusyId(item.id);
    try {
      await api.decideModeration({
        reportId: item.id,
        ...(item.targetType === 'post' ? { targetPostId: item.targetId } : {}),
        ...(item.targetType === 'comment' ? { targetCommentId: item.targetId } : {}),
        actionType: action,
        reason: item.reason || 'Moderator decision',
      });
      setReports((current) => current.filter((report) => report.id !== item.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The moderation decision was not saved.');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = selectedFilter === 'all' ? reports : reports.filter((item) => item.targetType === selectedFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-purple-400" />Trust & Safety Moderation</h1>
          <p className="text-xs text-slate-400">Queue items and decisions come from the moderation API. Decisions appear complete only after the API confirms them.</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300">{loading ? 'Loading queue' : `${reports.length} pending`}</span>
          <button onClick={() => void loadQueue()} disabled={loading} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {actionError && <Notice tone="error">{actionError}</Notice>}

      <div className="flex gap-2">
        {(['all', 'stream', 'post', 'comment'] as const).map((filter) => (
          <button key={filter} onClick={() => setSelectedFilter(filter)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${selectedFilter === filter ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {filter === 'all' ? 'All queue' : `${filter}s`}
          </button>
        ))}
      </div>

      {loading ? <Notice>Loading moderation queue…</Notice> : error ? null : filtered.length === 0 ? (
        <Notice>{reports.length === 0 ? 'The moderation API returned no pending reports.' : 'No reports match this filter.'}</Notice>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div key={item.id} className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">{item.severity ?? 'Priority unavailable'}</span>
                  <span className="text-xs font-mono text-slate-400 capitalize flex items-center gap-1">
                    {item.targetType === 'stream' && <Radio className="w-3.5 h-3.5 text-red-400" />}
                    {item.targetType === 'post' && <FileText className="w-3.5 h-3.5 text-blue-400" />}
                    {item.targetType === 'comment' && <MessageSquare className="w-3.5 h-3.5 text-purple-400" />}
                    {item.targetType}
                  </span>
                  <span className="text-xs text-slate-400">• {item.timestamp}</span>
                </div>
                <h3 className="text-sm font-bold text-white break-words">{item.targetTitle}</h3>
                <div className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div><span className="font-semibold text-slate-200">Report reason:</span> {item.reason}<div className="text-[11px] text-slate-400 mt-1">Reporter ID: <span className="font-mono">{item.reporter}</span></div></div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button disabled={busyId === item.id} onClick={() => void handleAction(item, 'dismiss')} className="px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 disabled:opacity-50 text-emerald-300 border border-emerald-800/60 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />Dismiss report
                </button>
                {(item.targetType === 'post' || item.targetType === 'comment') && <button disabled={busyId === item.id} onClick={() => void handleAction(item, 'delete_content')} className="px-3.5 py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 disabled:opacity-50 text-amber-300 border border-amber-800/60 text-xs font-bold flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />Remove content
                </button>}
                {busyId === item.id && <span className="text-xs text-slate-400">Saving…</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Notice({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'error' }) {
  return <div className={`rounded-2xl border p-8 text-center text-sm ${tone === 'error' ? 'border-red-800/60 bg-red-950/30 text-red-300' : 'border-slate-800 bg-[#111827] text-slate-400'}`}>{tone === 'error' && <AlertCircle className="w-5 h-5 mx-auto mb-2" />}{children}</div>;
}
