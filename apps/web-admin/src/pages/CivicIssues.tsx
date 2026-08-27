import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  ThumbsUp,
  MapPin,
  Send,
  Filter,
} from 'lucide-react';

interface CivicIssue {
  id: string;
  title: string;
  category: 'roads' | 'water' | 'electricity' | 'drainage' | 'sanitation' | 'education';
  constituency: string;
  upvotes: number;
  reportedBy: string;
  department: string;
  status: 'reported' | 'in_progress' | 'resolved';
  reportedAt: string;
}

const INITIAL_ISSUES: CivicIssue[] = [
  {
    id: 'iss_1',
    title: 'Major water pipeline rupture near Punjagutta junction causing street flooding',
    category: 'water',
    constituency: 'TS-AC-60 (Khairatabad)',
    upvotes: 342,
    reportedBy: 'Kiran_V',
    department: 'HMWSSB (Hyderabad Water Supply)',
    status: 'in_progress',
    reportedAt: '4 hours ago',
  },
  {
    id: 'iss_2',
    title: 'Street lights malfunctioning on Jubilee Hills Road No. 36',
    category: 'electricity',
    constituency: 'TS-AC-61 (Jubilee Hills)',
    upvotes: 118,
    reportedBy: 'Citizen_Forum',
    department: 'TSSPDCL Electrical Wing',
    status: 'reported',
    reportedAt: '12 hours ago',
  },
  {
    id: 'iss_3',
    title: 'Severe cratering on Banjara Hills Road 12 after heavy rains',
    category: 'roads',
    constituency: 'TS-AC-60 (Khairatabad)',
    upvotes: 512,
    reportedBy: 'RWA_Banjara',
    department: 'GHMC Engineering Division',
    status: 'in_progress',
    reportedAt: '1 day ago',
  },
  {
    id: 'iss_4',
    title: 'Overflowing garbage bin near Nampally station market',
    category: 'sanitation',
    constituency: 'TS-AC-63 (Nampally)',
    upvotes: 89,
    reportedBy: 'Saeed_H',
    department: 'GHMC Sanitation Wing',
    status: 'resolved',
    reportedAt: '2 days ago',
  },
];

export function CivicIssues() {
  const [issues, setIssues] = useState<CivicIssue[]>(INITIAL_ISSUES);
  const [statusFilter, setStatusFilter] = useState<'all' | 'reported' | 'in_progress' | 'resolved'>('all');

  const handleUpdateStatus = (id: string, newStatus: 'reported' | 'in_progress' | 'resolved') => {
    setIssues((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
    );
  };

  const filtered = statusFilter === 'all' ? issues : issues.filter((i) => i.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Civic Grievances & Municipal Escalation Console</span>
          </h1>
          <p className="text-xs text-slate-400">
            Triage citizen infrastructure reports, track upvote velocity, and escalate directly to responsible government departments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'reported', 'in_progress', 'resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                statusFilter === s
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Issues Grid */}
      <div className="space-y-4">
        {filtered.map((issue) => (
          <div
            key={issue.id}
            className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 transition hover:border-slate-700"
          >
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    issue.status === 'resolved'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : issue.status === 'in_progress'
                      ? 'bg-blue-950 text-blue-400 border border-blue-800/60'
                      : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                  }`}
                >
                  {issue.status.replace('_', ' ')}
                </span>
                <span className="text-xs font-mono font-bold text-slate-300 uppercase px-2 py-0.5 rounded bg-slate-800">
                  {issue.category}
                </span>
                <span className="text-xs text-slate-400">• {issue.constituency}</span>
                <span className="text-xs text-slate-400">• {issue.reportedAt}</span>
              </div>

              <h3 className="text-sm font-bold text-white leading-snug">{issue.title}</h3>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Assigned: <strong className="text-slate-300">{issue.department}</strong></span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{issue.upvotes} Citizens Impacted</span>
                </div>
              </div>
            </div>

            {/* Status Change Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={issue.status}
                onChange={(e) => handleUpdateStatus(issue.id, e.target.value as any)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500"
              >
                <option value="reported">Reported</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
