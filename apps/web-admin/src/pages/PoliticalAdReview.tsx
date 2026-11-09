import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export function PoliticalAdReview() {
  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><ShieldCheck className="text-amber-400" />Political Ad Compliance Review</h1>
        <p className="text-sm text-slate-400 mt-2">Review and certify political advertising only from a persisted, authenticated compliance queue.</p>
      </div>
      <div className="bg-amber-950/20 border border-amber-800/50 rounded-2xl p-8 text-center space-y-3">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-400" />
        <h2 className="font-semibold text-white">Ad review queue is not connected</h2>
        <p className="text-sm text-slate-300 max-w-2xl mx-auto">
          The available API does not provide a durable admin review queue and decision endpoint for this screen. No ad count or compliance decision is being represented as live here.
        </p>
        <p className="text-xs text-slate-400">Keep political ad delivery disabled until the review API persists decisions, verifies reviewer roles, and records the required audit evidence.</p>
      </div>
    </div>
  );
}

export default PoliticalAdReview;
