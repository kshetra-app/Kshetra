/**
 * KSHETRA Feature Flags Definition & Defaults
 *
 * Provides a single source of truth for progressive feature rollouts.
 * Any feature can be toggled in code, overridden in the in-app Developer Modal,
 * or controlled remotely from the API/Supabase database.
 */

export interface AppFeatureFlags {
  // ── Phase 1: Core Foundation & Civic Directory (MVP) ──
  /** Interactive Assembly & Parliamentary Map */
  enableMap: boolean;
  /** Search & Discovery, Demographics, MLA/MP profiles */
  enableExploreSearch: boolean;
  /** Multi-cycle election history (2014–2024) */
  enableElectionHistory: boolean;
  /** "Did You Know?" political trivia engine */
  enableTriviaEngine: boolean;
  /** Multi-language i18n support (10+ Indian languages) */
  enableMultiLanguage: boolean;

  // ── Phase 2: Civic Engagement & Community Voice ──
  /** Community discussions, posts & verified citizen polls */
  enableFeed: boolean;
  /** Issue reporting, department tracking & citizen sentiment */
  enableCivicDashboard: boolean;
  /** Push notifications & breaking civic alerts */
  enableNotifications: boolean;

  // ── Phase 3: Media, Video & Live Streaming ──
  /** Live Media Exchange (LMX) broadcasting and live tab */
  enableLiveTab: boolean;
  /** Curated geo-tagged news feed & in-app reader */
  enableNewsTab: boolean;
  /** Political Shorts vertical video carousel */
  enableShortsTab: boolean;

  // ── Phase 4: Delimitation & Real-Time Deep Analytics ──
  /** Delimitation boundary simulator & impact analysis */
  enableDelimitation: boolean;
  /** KSHETRA Pulse Core (Anti-incumbency vulnerability, sentiment radar, AI briefs) */
  enableDeepAnalytics: boolean;

  // ── Phase 5: Political SaaS & Campaign Tools ──
  /** Verified legislator dashboard & KYC portal */
  enablePoliticianPortal: boolean;
  /** Candidate onboarding & Candidate X-Ray */
  enableAspirants: boolean;
  /** WhatsApp / SMS outreach panel & field campaign manager */
  enableCampaignManager: boolean;
  /** Aspirant training courses & certification */
  enableLeadershipAcademy: boolean;

  // ── Phase 6: Enterprise & B2B ──
  /** Investor demo showcase & moat visualization */
  enableInvestorDemo: boolean;
  /** Enterprise B2B / B2G API Suite & metering */
  enableEnterpriseApis: boolean;
}

/**
 * Default Feature Flag configuration.
 * Change any value here to instantly enable or disable features across the app.
 */
export const DEFAULT_FEATURE_FLAGS: AppFeatureFlags = {
  // Phase 1 (Core MVP - Active)
  enableMap: true,
  enableExploreSearch: true,
  enableElectionHistory: true,
  enableTriviaEngine: true,
  enableMultiLanguage: true,

  // Phase 2 (Civic Engagement - Active)
  enableFeed: true,
  enableCivicDashboard: true,
  enableNotifications: true,

  // Phase 3 (Media & Video - Active)
  enableLiveTab: true,
  enableNewsTab: true,
  enableShortsTab: true,

  // Phase 4 (Delimitation & Deep Analytics - Active)
  enableDelimitation: true,
  enableDeepAnalytics: true,

  // Phase 5 (Political SaaS - Active)
  enablePoliticianPortal: true,
  enableAspirants: true,
  enableCampaignManager: true,
  enableLeadershipAcademy: true,

  // Phase 6 (Enterprise & B2B - Active)
  enableInvestorDemo: true,
  enableEnterpriseApis: true,
};
