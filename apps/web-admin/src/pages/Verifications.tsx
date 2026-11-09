import React from 'react';
import { BadgeCheck, AlertCircle } from 'lucide-react';

export function Verifications() {
  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><BadgeCheck className="w-5 h-5 text-emerald-400" />Identity Verification</h1>
        <p className="text-xs text-slate-400 mt-2">Verification decisions require a protected review queue and durable evidence handling.</p>
      </div>
      <div className="bg-amber-950/20 border border-amber-800/50 rounded-2xl p-8 text-center space-y-3">
        <AlertCircle className="w-9 h-9 mx-auto text-amber-400" />
        <h2 className="font-semibold text-white">Verification review queue is not connected</h2>
        <p className="text-sm text-slate-300 max-w-2xl mx-auto">The API can accept a verification request, but this build does not have a persisted admin queue and review workflow. No applicant counts or approval actions are shown.</p>
      </div>
    </div>
  );
}
