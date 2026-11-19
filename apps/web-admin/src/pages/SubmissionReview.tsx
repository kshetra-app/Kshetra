import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  api,
  type PublicationDecision,
  type ReviewSubmission,
  type SubmissionKind,
} from '../lib/api';

export function SubmissionReview() {
  const [kind, setKind] = useState<SubmissionKind>('post');
  const [records, setRecords] = useState<ReviewSubmission[]>([]);
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setError('');
    try {
      const data = await api.getSubmissions(kind, offset);
      if (sequence.current === request) {
        setRecords(data.records);
        setMore(data.hasMore);
      }
    } catch (e) {
      if (sequence.current === request) {
        setRecords([]);
        setMore(false);
        setError(e instanceof Error ? e.message : 'Could not load submissions.');
      }
    } finally {
      if (sequence.current === request) setLoading(false);
    }
  }, [kind, offset]);
  useEffect(() => {
    void load();
    return () => {
      sequence.current++;
    };
  }, [load]);
  async function decide(item: ReviewSubmission, decision: PublicationDecision) {
    setSaving(true);
    setError('');
    try {
      await api.reviewSubmission(kind, item, decision);
      if (offset > 0 && records.length === 1 && !more) setOffset(Math.max(0, offset - 20));
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the decision.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-200">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="font-bold">Awaiting publication</h2>
        <select
          aria-label="Submission type"
          className="bg-slate-800 p-2 rounded"
          value={kind}
          disabled={saving}
          onChange={(e) => {
            setKind(e.target.value as SubmissionKind);
            setOffset(0);
          }}
        >
          <option value="post">Community posts</option>
          <option value="short">Shorts</option>
        </select>
        <button disabled={loading || saving} onClick={() => void load()}>
          Refresh submissions
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      {loading ? (
        <p>Loading submissions…</p>
      ) : (
        <>
          {!error && !records.length && <p>No submissions awaiting review.</p>}
          {records.map((item) => (
            <article key={item.id} className="space-y-2 rounded border border-slate-700 p-4">
              <p className="text-xs text-slate-400">
                {item.type || 'Short'} · {item.constituency_id || item.state_code || 'National'}
              </p>
              {item.title && <h3>{item.title}</h3>}
              <p className="whitespace-pre-wrap break-words">{item.content || item.description}</p>
              {item.polls && (
                <ul className="list-disc pl-5">
                  {[...item.polls.poll_options]
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((o) => (
                      <li key={o.sort_order}>{o.label}</li>
                    ))}
                </ul>
              )}
              {!!item.post_hashtags?.length && (
                <p>{item.post_hashtags.map((h) => '#' + h.hashtags.tag).join(' ')}</p>
              )}
              {item.post_media
                ?.slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((media) => (
                  <div key={media.id}>
                    {!media.reviewUrl ? (
                      <span className="text-amber-300">
                        Attachment unavailable. Refresh to retry.
                      </span>
                    ) : media.media_type === 'image' ? (
                      <img
                        className="max-h-64 object-contain"
                        src={media.reviewUrl}
                        alt={media.alt_text || 'Submitted photo'}
                      />
                    ) : media.media_type === 'video' ? (
                      <video
                        className="max-h-64"
                        src={media.reviewUrl}
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <a
                        className="underline break-all"
                        href={media.reviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {media.reviewUrl}
                      </a>
                    )}
                  </div>
                ))}
              {kind === 'short' && item.video_url && /^https:\/\//i.test(item.video_url) && (
                <div className="space-y-2">
                  <video className="max-h-80" src={item.video_url} controls preload="metadata" />
                  {item.media_metadata && <p>
                    {item.duration} s · {item.media_metadata.width} × {item.media_metadata.height} · {item.media_metadata.videoCodec.toUpperCase()} · {(item.media_metadata.bytes / (1024 * 1024)).toFixed(2)} MB
                    {item.language ? ` · ${item.language}` : ''}
                  </p>}
                  {item.rights_confirmed_at && <p>Creator confirmed sharing rights.</p>}
                </div>
              )}
              <div className="flex gap-4">
                <button
                  className="text-emerald-300"
                  disabled={
                    saving ||
                    (kind === 'short' && (!item.video_url || !item.media_metadata || !item.rights_confirmed_at)) ||
                    item.post_media?.some((media) => !media.reviewUrl) ||
                    (item.type === 'poll' && (item.polls?.poll_options.length ?? 0) < 2)
                  }
                  onClick={() => void decide(item, 'approved')}
                >
                  Approve for publication
                </button>
                <button
                  className="text-red-300"
                  disabled={saving}
                  onClick={() => void decide(item, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
          <div className="flex gap-4">
            {offset > 0 && (
              <button disabled={saving} onClick={() => setOffset(offset - 20)}>
                Previous
              </button>
            )}
            {more && (
              <button disabled={saving} onClick={() => setOffset(offset + 20)}>
                Next
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
