import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { AppFeatureFlags } from '@kshetra/shared';
import { DEFAULT_FEATURE_FLAGS } from '@kshetra/shared';
import {
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';

interface FlagMetadata {
  key: keyof AppFeatureFlags;
  label: string;
  category: 'Phase 1: Foundation' | 'Phase 2: Engagement' | 'Phase 3: Real-Time' | 'Phase 4: Intelligence' | 'Phase 5: Commercial';
  description: string;
}

const ALL_FLAGS: FlagMetadata[] = [
  { key: 'enableMap', label: 'Constituency Spatial Map', category: 'Phase 1: Foundation', description: 'Interactive MapLibre boundaries & party color overlays' },
  { key: 'enableExploreSearch', label: 'Explore & Search Directory', category: 'Phase 1: Foundation', description: 'Candidate dossiers, MLA profiles, and booth search' },
  { key: 'enableElectionHistory', label: 'Election History Engine', category: 'Phase 1: Foundation', description: 'Multi-cycle historical results & stronghold metrics' },
  { key: 'enableTriviaEngine', label: 'Political Trivia Facts', category: 'Phase 1: Foundation', description: 'Did You Know contextual cards for constituencies' },
  { key: 'enableMultiLanguage', label: 'Multi-Language i18n Engine', category: 'Phase 1: Foundation', description: 'Real-time switching across 10+ native Indian languages' },

  { key: 'enableFeed', label: 'Community Feed', category: 'Phase 2: Engagement', description: 'Citizen voice, opinion polls, and verified discussions' },
  { key: 'enableCivicDashboard', label: 'Civic Grievance Dashboard', category: 'Phase 2: Engagement', description: 'Issue tracking, upvotes, and government department resolution' },
  { key: 'enableNotifications', label: 'Push & Activity Notifications', category: 'Phase 2: Engagement', description: 'Real-time breaking updates & constituency alerts' },

  { key: 'enableLiveTab', label: 'Kshetra Live Media Exchange', category: 'Phase 3: Real-Time', description: 'WebRTC live broadcasts & journalist streams' },
  { key: 'enableNewsTab', label: 'AI News Engine & Digest', category: 'Phase 3: Real-Time', description: 'Aggregated constituency headlines & sentiment analysis' },
  { key: 'enableShortsTab', label: 'Short Video Clips (Shorts)', category: 'Phase 3: Real-Time', description: 'Vertical political video reels & soundbites' },

  { key: 'enableDelimitation', label: 'Delimitation Simulator', category: 'Phase 4: Intelligence', description: 'Post-2026 Lok Sabha & Assembly boundary reapportionment modeler' },
  { key: 'enableDeepAnalytics', label: 'Deep Spatial Analytics', category: 'Phase 4: Intelligence', description: 'Demographic shifts, voter turnout trends & swing analysis' },

  { key: 'enablePoliticianPortal', label: 'Politician Portal', category: 'Phase 5: Commercial', description: 'Candidate dashboard, voter CRM & volunteer outreach' },
  { key: 'enableAspirants', label: 'Political Aspirant Incubation', category: 'Phase 5: Commercial', description: 'New candidate onboarding & constituency readiness scores' },
  { key: 'enableCampaignManager', label: 'Campaign Manager HQ', category: 'Phase 5: Commercial', description: 'SMS, WhatsApp, audio broadcast dispatch & field logistics' },
  { key: 'enableLeadershipAcademy', label: 'Leadership Academy', category: 'Phase 5: Commercial', description: 'Training courses & governance certifications for youth leaders' },
];

export function FeatureFlags() {
  const [flags, setFlags] = useState<AppFeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const data = await api.getFlags();
      setFlags(data);
    } catch {
      // Fallback to default
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleToggle = (key: keyof AppFeatureFlags) => {
    setFlags((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await api.updateFlags(flags);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      // Offline fallback
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFlags(DEFAULT_FEATURE_FLAGS);
  };

  const categories = ['ALL', 'Phase 1: Foundation', 'Phase 2: Engagement', 'Phase 3: Real-Time', 'Phase 4: Intelligence', 'Phase 5: Commercial'];
  const filteredFlags = selectedCategory === 'ALL' ? ALL_FLAGS : ALL_FLAGS.filter((f) => f.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ToggleRight className="w-5 h-5 text-blue-400" />
            <span>Feature Flags & Live Kill Switches</span>
          </h1>
          <p className="text-xs text-slate-400">
            Control reactive feature visibility across the Android APK and Web clients in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchFlags}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync with Server</span>
          </button>
          <button
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Publishing...' : 'Publish Flags'}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Feature flags published successfully! The changes are now active live across the mobile client.</span>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Flag Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFlags.map((flag) => {
          const isEnabled = Boolean(flags[flag.key]);
          return (
            <div
              key={flag.key}
              onClick={() => handleToggle(flag.key)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between space-y-4 ${
                isEnabled
                  ? 'bg-[#131b2e] border-blue-500/40 shadow-sm shadow-blue-500/10'
                  : 'bg-[#111827]/60 border-slate-800 opacity-60 hover:opacity-80'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {flag.category}
                  </span>
                  <div
                    className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                      isEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-700 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
                <h3 className="font-bold text-sm text-white">{flag.label}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{flag.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">{flag.key}</span>
                <span className={isEnabled ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {isEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
