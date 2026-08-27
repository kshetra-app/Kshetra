import React, { useState } from 'react';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Users,
  Building,
  Phone,
  Mail,
  GraduationCap,
  Scale,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface EditItem {
  id: string;
  representativeName: string;
  constituency: string;
  contributorName: string;
  contributorScore: number;
  fieldName: string;
  currentValue: string;
  proposedValue: string;
  sourceAttribution: string;
  timestamp: string;
}

const INITIAL_EDITS: EditItem[] = [
  {
    id: 'edit_1',
    representativeName: 'Danam Nagender',
    constituency: 'TS-AC-60 (Khairatabad)',
    contributorName: 'Praveen K. (Verified Contributor)',
    contributorScore: 94,
    fieldName: 'official_email',
    currentValue: 'danam.mla@telangana.gov.in',
    proposedValue: 'mla.khairatabad@telangana.gov.in',
    sourceAttribution: 'Official Telangana Legislative Assembly Directory 2024 (Page 44)',
    timestamp: '18 mins ago',
  },
  {
    id: 'edit_2',
    representativeName: 'Gadwal Vijayalakshmi',
    constituency: 'GHMC Mayor',
    contributorName: 'Srinivas R.',
    contributorScore: 82,
    fieldName: 'office_address',
    currentValue: 'GHMC Head Office, Tank Bund Road, Hyderabad',
    proposedValue: 'CC Complex, Tank Bund Rd, Lower Tank Bund, Hyderabad - 500063',
    sourceAttribution: 'GHMC Citizen Charter Portal update',
    timestamp: '2 hours ago',
  },
  {
    id: 'edit_3',
    representativeName: 'T. Raja Singh',
    constituency: 'TS-AC-65 (Goshamahal)',
    contributorName: 'Voter_Analyst',
    contributorScore: 78,
    fieldName: 'education_qualification',
    currentValue: 'Intermediate',
    proposedValue: 'Higher Secondary (Intermediate) - Board of Intermediate Education AP',
    sourceAttribution: 'ECI 2023 Form 26 Affidavit',
    timestamp: '4 hours ago',
  },
];

export function RepresentativeEdits() {
  const [edits, setEdits] = useState<EditItem[]>(INITIAL_EDITS);

  const handleDecision = (id: string, decision: 'merge' | 'reject') => {
    setEdits((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-indigo-400" />
            <span>Crowd-Sourced Politician Profile Edits</span>
          </h1>
          <p className="text-xs text-slate-400">
            Review community-submitted corrections to politician contact info, education, and assets before merging into the canonical PostGIS database.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-800/60 text-indigo-300">
            {edits.length} Edits in Triage
          </span>
        </div>
      </div>

      {/* Edits List with Side-by-Side Diff */}
      <div className="space-y-5">
        {edits.length === 0 ? (
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">All community edits reviewed!</h3>
            <p className="text-xs text-slate-400">There are no pending edits in the moderation queue.</p>
          </div>
        ) : (
          edits.map((item) => (
            <div
              key={item.id}
              className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5 transition hover:border-slate-700"
            >
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{item.representativeName}</h3>
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 text-[11px] font-mono border border-blue-800/60">
                      {item.constituency}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Submitted by <strong>{item.contributorName}</strong> (Trust Score: <span className="text-emerald-400 font-bold">{item.contributorScore}%</span>) • {item.timestamp}
                  </div>
                </div>

                <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                  Field: <strong className="text-indigo-400">{item.fieldName}</strong>
                </span>
              </div>

              {/* Visual Diff Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Value (Red) */}
                <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 space-y-2">
                  <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                    CURRENT CANONICAL VALUE
                  </div>
                  <div className="text-xs font-mono text-red-200 bg-red-950/40 p-3 rounded-lg border border-red-900/30 break-all">
                    {item.currentValue}
                  </div>
                </div>

                {/* Proposed Value (Green) */}
                <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4 space-y-2">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    PROPOSED UPDATE (NEW)
                  </div>
                  <div className="text-xs font-mono text-emerald-200 bg-emerald-950/40 p-3 rounded-lg border border-emerald-900/30 break-all font-semibold">
                    {item.proposedValue}
                  </div>
                </div>
              </div>

              {/* Source Attribution */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200">Source Evidence:</span> {item.sourceAttribution}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleDecision(item.id, 'reject')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  <span>Reject Edit</span>
                </button>
                <button
                  onClick={() => handleDecision(item.id, 'merge')}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Merge to Database</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
