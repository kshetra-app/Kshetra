import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileCheck,
  DollarSign,
  MapPin,
  ExternalLink,
} from 'lucide-react';

interface PoliticalAdQueueItem {
  id: string;
  page_id: string;
  post_id: string;
  mcmc_certificate_id: string;
  status: string;
  amount_paid: number;
  target_scope: string;
  target_value?: string;
  created_at: string;
  pages?: {
    id: string;
    title: string;
    handle: string;
    role: string;
  };
}

export function PoliticalAdReview() {
  const [queue, setQueue] = useState<PoliticalAdQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/political-ads/review-queue', {
        headers: {
          'x-user-id': 'admin-compliance-1',
          'x-user-role': 'admin',
        },
      });
      const data = await res.json();
      if (data && data.queue) {
        setQueue(data.queue);
      }
    } catch (err) {
      console.error('Failed to load political ad review queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleAction = async (adId: string, action: 'certify' | 'reject') => {
    if (!window.confirm(`Are you sure you want to ${action.toUpperCase()} this political promotion? This compliance action is audit logged.`)) {
      return;
    }

    setActionInProgress(adId);
    try {
      const res = await fetch(`/api/v1/admin/political-ads/${adId}/certify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-compliance-1',
          'x-user-role': 'admin',
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Certification failed');
      }

      alert(`Ad successfully ${action === 'certify' ? 'certified & activated' : 'rejected'}.`);
      fetchQueue();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-amber-600" />
            Political Ad Compliance Review
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            ECI Media Certification and Monitoring Committee (MCMC) verification queue.
            Ads can only transition to certified via manual human reviewer decision.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/ad-library"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ExternalLink size={16} />
            Public Ad Library
          </a>
          <button
            onClick={fetchQueue}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Refresh Queue
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          Loading review queue...
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          <FileCheck className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
          <p className="font-semibold text-gray-700">Compliance Queue is Clear</p>
          <p className="text-sm text-gray-500 mt-1">All political ads have been evaluated by human compliance reviewers.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((ad) => (
            <div key={ad.id} className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                      Pending Human Certification
                    </span>
                    <span className="text-xs text-gray-400">ID: {ad.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {ad.pages?.title || ad.page_id}
                    {ad.pages?.handle && <span className="text-sm font-normal text-gray-500 ml-2">@{ad.pages.handle}</span>}
                  </h3>
                  <div className="text-sm text-gray-600 mt-1">
                    Target Post: <span className="font-mono font-medium">{ad.post_id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={actionInProgress === ad.id}
                    onClick={() => handleAction(ad.id, 'certify')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle size={16} />
                    Certify & Activate
                  </button>
                  <button
                    disabled={actionInProgress === ad.id}
                    onClick={() => handleAction(ad.id, 'reject')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <FileCheck size={16} className="text-emerald-600 flex-shrink-0" />
                  <span><strong>MCMC Cert:</strong> {ad.mcmc_certificate_id}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <DollarSign size={16} className="text-amber-600 flex-shrink-0" />
                  <span><strong>Budget:</strong> ₹{(ad.amount_paid / 100).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin size={16} className="text-blue-600 flex-shrink-0" />
                  <span><strong>Scope:</strong> {ad.target_scope.toUpperCase()} {ad.target_value ? `(${ad.target_value})` : ''}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default PoliticalAdReview;
