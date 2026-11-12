import React from 'react';
import { GitPullRequest, AlertCircle } from 'lucide-react';

export function RepresentativeEdits() {
  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><GitPullRequest className="w-5 h-5 text-indigo-400" />Representative Profile Corrections</h1>
        <p className="text-xs text-slate-400 mt-2">Proposed corrections must be reviewed against source evidence before they change an official profile.</p>
      </div>
      <div className="bg-amber-950/20 border border-amber-800/50 rounded-2xl p-8 text-center space-y-3">
        <AlertCircle className="w-9 h-9 mx-auto text-amber-400" />
        <h2 className="font-semibold text-white">Correction queue is not connected</h2>
        <p className="text-sm text-slate-300 max-w-2xl mx-auto">There is no API in this build to load, approve, or reject representative profile corrections. A blank queue here means unavailable, not that all edits have been reviewed.</p>
      </div>
    </div>
  );
}
