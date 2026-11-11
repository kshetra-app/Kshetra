import React from 'react';
import { ShieldAlert } from 'lucide-react';

export function PoliticalAdReview() {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-700 bg-[#111827] p-8 text-center">
      <ShieldAlert className="mx-auto mb-4 h-8 w-8 text-amber-300" />
      <h1 className="text-lg font-bold text-white">Political ad review is not available yet</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        The API currently blocks political ad delivery because durable campaign storage, a secure reviewer queue, authenticated certification, and delivery reporting are not connected. This screen will not display sample ads or accept review actions as if they were live.
      </p>
      <p className="mt-4 text-xs text-slate-400">Existing campaign actions remain disabled until those systems are implemented and verified.</p>
    </section>
  );
}

export default PoliticalAdReview;
