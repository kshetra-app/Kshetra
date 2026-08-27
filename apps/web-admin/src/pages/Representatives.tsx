import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Mail,
  Phone,
  Building,
  GraduationCap,
  Scale,
  CheckCircle,
  X,
} from 'lucide-react';

interface Representative {
  id: string;
  name: string;
  role: 'MLA' | 'MP' | 'Mayor' | 'Corporator';
  constituency: string;
  party: string;
  email: string;
  phone: string;
  education: string;
  criminalCases: number;
  assetsCrores: number;
}

const INITIAL_REPRESENTATIVES: Representative[] = [
  { id: 'rep_1', name: 'Danam Nagender', role: 'MLA', constituency: 'TS-AC-60 (Khairatabad)', party: 'INC', email: 'danam.mla@telangana.gov.in', phone: '+91 98490 12345', education: 'B.A.', criminalCases: 3, assetsCrores: 48.5 },
  { id: 'rep_2', name: 'Maganti Gopinath', role: 'MLA', constituency: 'TS-AC-61 (Jubilee Hills)', party: 'BRS', email: 'gopinath.mla@telangana.gov.in', phone: '+91 98490 23456', education: 'Graduate', criminalCases: 1, assetsCrores: 34.2 },
  { id: 'rep_3', name: 'Talasani Srinivas Yadav', role: 'MLA', constituency: 'TS-AC-62 (Sanathnagar)', party: 'BRS', email: 'talasani.mla@telangana.gov.in', phone: '+91 98490 34567', education: 'Intermediate', criminalCases: 4, assetsCrores: 72.8 },
  { id: 'rep_4', name: 'T. Raja Singh', role: 'MLA', constituency: 'TS-AC-65 (Goshamahal)', party: 'BJP', email: 'rajasingh.mla@telangana.gov.in', phone: '+91 98490 45678', education: 'Intermediate', criminalCases: 12, assetsCrores: 14.1 },
  { id: 'rep_5', name: 'Asaduddin Owaisi', role: 'MP', constituency: 'TS-PC-09 (Hyderabad)', party: 'AIMIM', email: 'asad.owaisi@sansad.nic.in', phone: '+91 98490 56789', education: 'Barrister-at-Law (Lincoln\'s Inn)', criminalCases: 5, assetsCrores: 19.3 },
  { id: 'rep_6', name: 'G. Kishan Reddy', role: 'MP', constituency: 'TS-PC-10 (Secunderabad)', party: 'BJP', email: 'kishanreddy.mp@sansad.nic.in', phone: '+91 98490 67890', education: 'Diploma', criminalCases: 2, assetsCrores: 28.6 },
];

export function Representatives() {
  const [representatives, setRepresentatives] = useState<Representative[]>(INITIAL_REPRESENTATIVES);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRep, setEditingRep] = useState<Representative | null>(null);

  const filtered = representatives.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.constituency.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.party.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveEdit = (updated: Representative) => {
    setRepresentatives((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setEditingRep(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span>Elected Representatives & Political Dossiers</span>
          </h1>
          <p className="text-xs text-slate-400">
            Manage official dossiers, ECI affidavit disclosures, contact information, and terms for MLAs and MPs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search politician..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0A0A1A] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Grid of Politician Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((rep) => (
          <div
            key={rep.id}
            className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">{rep.name}</h3>
                  <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-bold border border-purple-800/60">
                    {rep.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">{rep.constituency}</p>
              </div>

              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-950/80 text-blue-300 border border-blue-800/60">
                {rep.party}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-300 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{rep.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{rep.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <span>{rep.education}</span>
              </div>
            </div>

            {/* Affidavit metrics */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block">Declared Assets</span>
                <span className="font-bold text-emerald-400">₹{rep.assetsCrores} Cr</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Criminal Cases</span>
                <span className={`font-bold ${rep.criminalCases > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {rep.criminalCases}
                </span>
              </div>
              <button
                onClick={() => setEditingRep(rep)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingRep && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Edit Representative Dossier</h3>
              <button onClick={() => setEditingRep(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingRep.name}
                  onChange={(e) => setEditingRep({ ...editingRep, name: e.target.value })}
                  className="w-full bg-[#0A0A1A] border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Official Email</label>
                  <input
                    type="text"
                    value={editingRep.email}
                    onChange={(e) => setEditingRep({ ...editingRep, email: e.target.value })}
                    className="w-full bg-[#0A0A1A] border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editingRep.phone}
                    onChange={(e) => setEditingRep({ ...editingRep, phone: e.target.value })}
                    className="w-full bg-[#0A0A1A] border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Education Qualification</label>
                <input
                  type="text"
                  value={editingRep.education}
                  onChange={(e) => setEditingRep({ ...editingRep, education: e.target.value })}
                  className="w-full bg-[#0A0A1A] border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Assets (₹ Crores)</label>
                  <input
                    type="number"
                    value={editingRep.assetsCrores}
                    onChange={(e) => setEditingRep({ ...editingRep, assetsCrores: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0A0A1A] border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Criminal Cases</label>
                  <input
                    type="number"
                    value={editingRep.criminalCases}
                    onChange={(e) => setEditingRep({ ...editingRep, criminalCases: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#0A0A1A] border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingRep(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(editingRep)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
