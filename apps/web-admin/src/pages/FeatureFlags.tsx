import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { AppFeatureFlags } from '@kshetra/shared';
import { DEFAULT_FEATURE_FLAGS } from '@kshetra/shared';
import { supabase } from '../lib/supabase';
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

  { key: 'enablePoliticianPortal', label: 'Politician Portal', category: 'Phase 5: Commercial', description: 'Candidate dashboard, voter CRM & volunteer outreach' },
  { key: 'enableAspirants', label: 'Political Aspirant Incubation', category: 'Phase 5: Commercial', description: 'New candidate onboarding & constituency readiness scores' },
  { key: 'enableCampaignManager', label: 'Campaign Manager HQ', category: 'Phase 5: Commercial', description: 'Voice OBD & booth/cadre campaign tools' },
  { key: 'enableLeadershipAcademy', label: 'Leadership Academy', category: 'Phase 5: Commercial', description: 'Training courses & governance certifications for youth leaders' },
];

export function FeatureFlags() {
  const [flags, setFlags] = useState<AppFeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [hasSession, setHasSession] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuthChecking(false);
      setAuthError('Secure sign-in is not configured for this web-admin environment.');
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setHasSession(Boolean(data.session?.access_token));
      if (error) setAuthError(error.message);
      setAuthChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session?.access_token));
      if (session) setAuthError(null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchFlags = async () => {
    setLoading(true);
    setLoadError(null);
    setSavedSuccess(false);
    try {
      const data = await api.getFlags();
      setFlags(data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load feature flags from the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleToggle = (key: keyof AppFeatureFlags) => {
    if (!flags || loadError || !hasSession) return;
    setFlags((prev) => prev ? ({
      ...prev,
      [key]: !prev[key],
    }) : prev);
  };

  const handleSave = async () => {
    if (!flags || loading || loadError || !hasSession) return;
    setSaving(true);
    setSavedSuccess(false);
    setSaveError(null);
    try {
      const result = await api.updateFlags(flags);
      if (result.status !== 'updated') throw new Error('The server did not confirm that the flags were saved.');
      setFlags(result.flags);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Feature flags could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!flags || loading || loadError || !hasSession) return;
    setFlags({ ...DEFAULT_FEATURE_FLAGS });
    setSavedSuccess(false);
    setSaveError(null);
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setSigningIn(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setPassword('');
      setHasSession(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Administrator sign-in failed.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
    else setHasSession(false);
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
            disabled={loading || saving || !flags || Boolean(loadError) || !hasSession}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || !flags || Boolean(loadError) || !hasSession}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Publishing...' : 'Publish Flags'}</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-xs text-slate-300">Loading feature flags from the server…</div>
      )}
      {loadError && (
        <div role="alert" className="rounded-xl border border-amber-800/60 bg-amber-950/40 p-4 text-xs text-amber-200">
          Feature flags are unavailable from the server. No default values are being presented as live state. Refresh after the connection is restored. Details: {loadError}
        </div>
      )}
      {saveError && (
        <div role="alert" className="rounded-xl border border-red-800/60 bg-red-950/40 p-4 text-xs text-red-200">Save failed. The server did not confirm an update. Details: {saveError}</div>
      )}

      <section className="rounded-xl border border-slate-800 bg-[#111827] p-4">
        {authChecking ? (
          <p className="text-xs text-slate-300">Checking administrator sign-in…</p>
        ) : hasSession ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-emerald-300">Signed in. The API verifies administrator permissions when changes are published.</p>
            <button onClick={handleSignOut} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">Sign out</button>
          </div>
        ) : (
          <form onSubmit={handleSignIn} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="grid gap-1 text-xs text-slate-300">
              Administrator email
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" required disabled={!supabase || signingIn} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-50" />
            </label>
            <label className="grid gap-1 text-xs text-slate-300">
              Password
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required disabled={!supabase || signingIn} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-50" />
            </label>
            <button type="submit" disabled={!supabase || signingIn} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{signingIn ? 'Signing in…' : 'Sign in'}</button>
          </form>
        )}
        {authError && <p role="alert" className="mt-3 text-xs text-amber-200">{authError}</p>}
      </section>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Feature flags were saved successfully by the server.</span>
        </div>
      )}

      {/* Category Tabs */}
      {flags && !loadError && <div className="flex gap-2 overflow-x-auto pb-1">
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
      </div>}

      {/* Flag Cards Grid */}
      {flags && !loadError && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFlags.map((flag) => {
          const isEnabled = Boolean(flags[flag.key]);
          return (
            <div
              key={String(flag.key)}
              onClick={() => handleToggle(flag.key)}
              role="button"
              aria-pressed={isEnabled}
              aria-disabled={!hasSession || Boolean(loadError)}
              tabIndex={!hasSession || loadError ? -1 : 0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleToggle(flag.key);
                }
              }}
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
                <span className="text-slate-400">{String(flag.key)}</span>
                <span className={isEnabled ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {isEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}
