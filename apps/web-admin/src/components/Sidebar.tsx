import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ToggleLeft,
  ShieldAlert,
  GitPullRequest,
  MapPin,
  Users,
  UploadCloud,
  BadgeCheck,
  AlertTriangle,
  GitMerge,
  Activity,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    category: 'Overview & Control',
    items: [
      { to: '/', label: 'Executive Dashboard', icon: LayoutDashboard },
      { to: '/feature-flags', label: 'Feature Flags & Switches', icon: ToggleLeft, badge: 'Live Sync' },
      { to: '/system-health', label: 'System Health & Latency', icon: Activity },
    ],
  },
  {
    category: 'Trust & Safety',
    items: [
      { to: '/moderation', label: 'Moderation Queue', icon: ShieldAlert },
      { to: '/representative-edits', label: 'Politician Edits Review', icon: GitPullRequest, badge: 'Community' },
      { to: '/verifications', label: 'KYC & Aspirant Vetting', icon: BadgeCheck },
    ],
  },
  {
    category: 'Master Data & Governance',
    items: [
      { to: '/constituencies', label: 'Constituencies & Maps', icon: MapPin },
      { to: '/representatives', label: 'Elected Representatives', icon: Users },
      { to: '/civic-issues', label: 'Civic Grievances Console', icon: AlertTriangle },
      { to: '/delimitation', label: 'Delimitation Scenarios', icon: GitMerge },
    ],
  },
  {
    category: 'Utilities & Ingestion',
    items: [
      { to: '/bulk-import', label: 'Bulk CSV / Excel Ingestion', icon: UploadCloud },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="w-72 bg-[#0d1224] border-r border-slate-800/80 flex flex-col h-screen select-none shrink-0 sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-blue-500/20 font-black text-white text-lg tracking-wider">
            K
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-100 text-lg tracking-tight">KSHETRA</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Admin</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Governance & Command</p>
          </div>
        </div>
      </div>

      {/* Nav Link Tree */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {NAV_ITEMS.map((section, idx) => (
          <div key={idx} className="space-y-1.5">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              {section.category}
            </h3>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 opacity-80" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer System Info */}
      <div className="p-4 border-t border-slate-800/80 bg-[#0a0e1c] flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[11px] text-slate-300">Railway Live API</span>
        </div>
        <a
          href="https://railway.com/project/2a0fc52a-b365-4f1d-881a-081276738288"
          target="_blank"
          rel="noreferrer"
          className="text-slate-400 hover:text-blue-400 transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </aside>
  );
}
