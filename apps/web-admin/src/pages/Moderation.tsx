import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Trash2,
  UserX,
  Radio,
  MessageSquare,
  FileText,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface ReportItem {
  id: string;
  targetType: 'post' | 'comment' | 'stream';
  targetTitle: string;
  reporterName: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

const INITIAL_REPORTS: ReportItem[] = [
  {
    id: 'rep_1',
    targetType: 'stream',
    targetTitle: 'TS-AC-60: Unauthorized Polling Station Broadcast',
    reporterName: 'Voter_9281',
    reason: 'Camera filming inside private voting compartment',
    severity: 'high',
    timestamp: '5 mins ago',
    status: 'pending',
  },
  {
    id: 'rep_2',
    targetType: 'post',
    targetTitle: 'Post #412: Unverified claim regarding candidate affidavit assets',
    reporterName: 'Citizen_Press_Hyd',
    reason: 'Misleading financial disclosures without EC attribution',
    severity: 'medium',
    timestamp: '22 mins ago',
    status: 'pending',
  },
  {
    id: 'rep_3',
    targetType: 'comment',
    targetTitle: 'Hate speech in Guntur civic discussion',
    reporterName: 'Mod_Auto_Filter',
    reason: 'Violates community trust & safety guideline layer 2',
    severity: 'high',
    timestamp: '1 hour ago',
    status: 'pending',
  },
  {
    id: 'rep_4',
    targetType: 'post',
    targetTitle: 'Duplicate spam post in Hyderabad Ward 12',
    reporterName: 'Anil_K',
    reason: 'Repeated promotional spam link',
    severity: 'low',
    timestamp: '3 hours ago',
    status: 'pending',
  },
];

export function Moderation() {
  const [reports, setReports] = useState<ReportItem[]>(INITIAL_REPORTS);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'stream' | 'post' | 'comment'>('all');

  const handleAction = (id: string, action: 'approve' | 'delete' | 'ban') => {
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const filtered = selectedFilter === 'all' ? reports : reports.filter((r) => r.targetType === selectedFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-purple-400" />
            <span>Trust & Safety Moderation Command Center</span>
          </h1>
          <p className="text-xs text-slate-400">
            Triage user-reported civic content, real-time broadcasts, and enforce community standards.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300">
            {reports.length} Reports Pending
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'stream', 'post', 'comment'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              selectedFilter === filter
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {filter === 'all' ? 'All Queue' : `${filter}s`}
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">All queues cleared!</h3>
            <p className="text-xs text-slate-400">There are no pending moderation items requiring review.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 transition hover:border-slate-700"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.severity === 'high'
                        ? 'bg-red-950 text-red-400 border border-red-800/60'
                        : item.severity === 'medium'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.severity} Priority
                  </span>
                  <span className="text-xs font-mono text-slate-400 capitalize flex items-center gap-1">
                    {item.targetType === 'stream' && <Radio className="w-3.5 h-3.5 text-red-400" />}
                    {item.targetType === 'post' && <FileText className="w-3.5 h-3.5 text-blue-400" />}
                    {item.targetType === 'comment' && <MessageSquare className="w-3.5 h-3.5 text-purple-400" />}
                    {item.targetType}
                  </span>
                  <span className="text-xs text-slate-400">• {item.timestamp}</span>
                </div>

                <h3 className="text-sm font-bold text-white">{item.targetTitle}</h3>
                <div className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-200">Report Reason:</span> {item.reason}
                    <div className="text-[11px] text-slate-400 mt-1">Reported by: <span className="font-mono">{item.reporterName}</span></div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => handleAction(item.id, 'approve')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Dismiss / Safe</span>
                </button>
                <button
                  onClick={() => handleAction(item.id, 'delete')}
                  className="px-3.5 py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Content</span>
                </button>
                <button
                  onClick={() => handleAction(item.id, 'ban')}
                  className="px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Ban User</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
