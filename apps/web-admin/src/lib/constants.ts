export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://kshetra-api-production-9f06.up.railway.app';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://pbbdglklyjwhzwhwixfs.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiYmRnbGtseWp3aHp3aHdpeGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzNjMwMzksImV4cCI6MjA1NTkzOTAzOX0.S1k-eJ08X-0t47hE-Uv56ZzM7hJj_97P3hT-uO8T4c';

export const DEFAULT_STATES = [
  { code: 'TS', name: 'Telangana', acCount: 119, pcCount: 17 },
  { code: 'AP', name: 'Andhra Pradesh', acCount: 175, pcCount: 25 },
  { code: 'MH', name: 'Maharashtra', acCount: 288, pcCount: 48 },
  { code: 'KA', name: 'Karnataka', acCount: 224, pcCount: 28 },
  { code: 'TN', name: 'Tamil Nadu', acCount: 234, pcCount: 39 },
  { code: 'UP', name: 'Uttar Pradesh', acCount: 403, pcCount: 80 },
  { code: 'WB', name: 'West Bengal', acCount: 294, pcCount: 42 },
  { code: 'BR', name: 'Bihar', acCount: 243, pcCount: 40 },
  { code: 'GJ', name: 'Gujarat', acCount: 182, pcCount: 26 },
  { code: 'RJ', name: 'Rajasthan', acCount: 200, pcCount: 25 },
  { code: 'MP', name: 'Madhya Pradesh', acCount: 230, pcCount: 29 },
  { code: 'KL', name: 'Kerala', acCount: 140, pcCount: 20 },
  { code: 'OD', name: 'Odisha', acCount: 147, pcCount: 21 },
  { code: 'PB', name: 'Punjab', acCount: 117, pcCount: 13 },
  { code: 'HR', name: 'Haryana', acCount: 90, pcCount: 10 },
  { code: 'DL', name: 'Delhi', acCount: 70, pcCount: 7 },
];

export const USER_ROLES = [
  { id: 'citizen', label: 'Citizen', color: 'bg-slate-700 text-slate-200' },
  { id: 'verified_citizen', label: 'Verified Citizen', color: 'bg-blue-900/60 text-blue-300 border border-blue-600/40' },
  { id: 'local_leader', label: 'Local Leader', color: 'bg-emerald-900/60 text-emerald-300 border border-emerald-600/40' },
  { id: 'journalist', label: 'Journalist / Press', color: 'bg-amber-900/60 text-amber-300 border border-amber-600/40' },
  { id: 'aspirant', label: 'Political Aspirant', color: 'bg-pink-900/60 text-pink-300 border border-pink-600/40' },
  { id: 'politician', label: 'Elected Politician (MLA/MP)', color: 'bg-purple-900/60 text-purple-300 border border-purple-600/40' },
  { id: 'moderator', label: 'Trust & Safety Moderator', color: 'bg-orange-900/60 text-orange-300 border border-orange-600/40' },
  { id: 'admin', label: 'System Administrator', color: 'bg-red-900/60 text-red-300 border border-red-600/40' },
  { id: 'super_admin', label: 'Super Administrator', color: 'bg-rose-950 text-rose-200 border border-rose-500 font-bold' },
];
