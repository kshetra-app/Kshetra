import React, { useState } from 'react';
import { USER_ROLES } from '../lib/constants';
import {
  BadgeCheck,
  CheckCircle2,
  XCircle,
  FileCheck,
  User,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';

interface VerificationRequest {
  id: string;
  applicantName: string;
  requestedRole: string;
  constituency: string;
  documentType: 'Voter ID (EPIC)' | 'Aadhaar Card' | 'Press Card' | 'Party Authorization';
  documentNumber: string;
  submissionDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

const INITIAL_REQUESTS: VerificationRequest[] = [
  {
    id: 'ver_1',
    applicantName: 'Vikramaditya Rao',
    requestedRole: 'aspirant',
    constituency: 'TS-AC-60 (Khairatabad)',
    documentType: 'Party Authorization',
    documentNumber: 'AICC/TS/AUTH/2026/041',
    submissionDate: 'Today, 10:14 AM',
    status: 'pending',
  },
  {
    id: 'ver_2',
    applicantName: 'Sneha Reddy',
    requestedRole: 'journalist',
    constituency: 'Telangana State Desk',
    documentType: 'Press Card',
    documentNumber: 'IJU/HYD/PRESS/2024/991',
    submissionDate: 'Today, 08:30 AM',
    status: 'pending',
  },
  {
    id: 'ver_3',
    applicantName: 'K. Venkatesh',
    requestedRole: 'verified_citizen',
    constituency: 'TS-AC-61 (Jubilee Hills)',
    documentType: 'Voter ID (EPIC)',
    documentNumber: 'ZXZ8821904',
    submissionDate: 'Yesterday',
    status: 'pending',
  },
  {
    id: 'ver_4',
    applicantName: 'M. Shashi Kumar',
    requestedRole: 'local_leader',
    constituency: 'GHMC Ward 92 (Somajiguda)',
    documentType: 'Voter ID (EPIC)',
    documentNumber: 'ZXZ9910243',
    submissionDate: 'Yesterday',
    status: 'pending',
  },
];

export function Verifications() {
  const [requests, setRequests] = useState<VerificationRequest[]>(INITIAL_REQUESTS);

  const handleAction = (id: string, decision: 'approved' | 'rejected') => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-emerald-400" />
            <span>Identity & KYC Verification Queue</span>
          </h1>
          <p className="text-xs text-slate-400">
            Verify official identity documents to award verified blue badges, press credentials, and political aspirant statuses.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
            {requests.length} Pending Verifications
          </span>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">All KYC requests verified!</h3>
            <p className="text-xs text-slate-400">No applicants are currently waiting in the verification queue.</p>
          </div>
        ) : (
          requests.map((req) => {
            const roleConfig = USER_ROLES.find((r) => r.id === req.requestedRole);
            return (
              <div
                key={req.id}
                className="bg-[#111827] border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 transition hover:border-slate-700"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-white">{req.applicantName}</h3>
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${roleConfig?.color}`}>
                      Applying for: {roleConfig?.label || req.requestedRole}
                    </span>
                    <span className="text-xs text-slate-400">• {req.constituency}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Document Type</span>
                      <span className="font-semibold text-slate-200">{req.documentType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Document / Auth ID</span>
                      <span className="font-mono font-bold text-blue-400">{req.documentNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleAction(req.id, 'rejected')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'approved')}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition"
                  >
                    <BadgeCheck className="w-4 h-4" />
                    <span>Approve & Grant Badge</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
