import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  LiveEvent,
  LiveEventAI,
  GovernmentDepartment,
  DepartmentAlert,
  DepartmentType,
  Affiliation,
  BrandKit,
  DistributionDestination,
  DistributionProtocol,
  ModerationEvent,
  ReporterCredibility,
  VisibilityMode,
  IssueCategory,
  AccreditationTier,
  HumanDecision,
  AlertAcknowledgment,
} from '../lib/lmxTypes';
import {
  neutralAI,
  computeBufferSeconds,
  computePriorityScore,
  applyAckToCredibility,
  resolveJurisdiction,
} from '../lib/lmxTypes';

// ─── Seed: brand kits + affiliations (doc Section 11) ────────────────────────

const SEED_BRAND_KITS: BrandKit[] = [
  {
    id: 'bk-dc', organizationId: 'org-dc', organizationName: 'Deccan Chronicle',
    logoUrl: null, lowerThirdTemplate: 'classic', colorPrimary: '#C8102E', colorSecondary: '#0A0A1A',
    introBumperUrl: null, outroBumperUrl: null, watermarkUrl: null, isApproved: true,
  },
  {
    id: 'bk-tv9', organizationId: 'org-tv9', organizationName: 'TV9 Network',
    logoUrl: null, lowerThirdTemplate: 'bold', colorPrimary: '#E11D48', colorSecondary: '#111827',
    introBumperUrl: null, outroBumperUrl: null, watermarkUrl: null, isApproved: true,
  },
];

const SEED_AFFILIATIONS: Affiliation[] = [
  {
    id: 'aff-1', contributorId: 'u-j1', organizationId: 'org-dc', organizationName: 'Deccan Chronicle',
    brandKitId: 'bk-dc', contractStart: '2024-01-15', contractEnd: '2027-01-14',
    exclusivityFlag: false, status: 'active',
  },
  {
    id: 'aff-2', contributorId: 'u-j1', organizationId: 'org-tv9', organizationName: 'TV9 Network',
    brandKitId: 'bk-tv9', contractStart: '2025-06-01', contractEnd: '2026-05-31',
    exclusivityFlag: false, status: 'active',
  },
];

// ─── Seed: subscribed government departments (doc Section 12.1) ───────────────

const SEED_DEPARTMENTS: GovernmentDepartment[] = [
  {
    id: 'dep-ps-hyd-1', departmentType: 'police', officeName: 'Hyderabad City Police — Abids PS',
    jurisdictionType: 'police_station', stateCode: 'TS', districtName: 'Hyderabad', mandalName: 'Abids',
    centerLat: 17.3902, centerLng: 78.4744, catchmentRadiusKm: null,
    deliveryMethod: 'dashboard', contactPhone: '100', contactEmail: 'abids.ps@tspolice.gov.in',
    subscriptionStatus: 'active', verified: true,
  },
  {
    id: 'dep-fire-hyd', departmentType: 'fire', officeName: 'Telangana Fire Services — Gandhi Nagar',
    jurisdictionType: 'administrative', stateCode: 'TS', districtName: 'Hyderabad',
    centerLat: 17.4239, centerLng: 78.4738, catchmentRadiusKm: null,
    deliveryMethod: 'dashboard', contactPhone: '101', contactEmail: null,
    subscriptionStatus: 'active', verified: true,
  },
  {
    id: 'dep-hosp-nims', departmentType: 'hospital', officeName: 'NIMS Hospital — Punjagutta',
    jurisdictionType: 'hospital_catchment', stateCode: 'TS', districtName: 'Hyderabad',
    centerLat: 17.4275, centerLng: 78.4489, catchmentRadiusKm: 8,
    deliveryMethod: 'webhook', webhookUrl: 'https://nims.example/alerts', contactPhone: '108',
    contactEmail: null, subscriptionStatus: 'active', verified: true,
  },
  {
    id: 'dep-hosp-osmania', departmentType: 'hospital', officeName: 'Osmania General Hospital',
    jurisdictionType: 'hospital_catchment', stateCode: 'TS', districtName: 'Hyderabad',
    centerLat: 17.3713, centerLng: 78.4804, catchmentRadiusKm: 6,
    deliveryMethod: 'dashboard', contactPhone: '108', contactEmail: null,
    subscriptionStatus: 'active', verified: true,
  },
  {
    id: 'dep-vig-ts', departmentType: 'anti_corruption', officeName: 'TS Anti-Corruption Bureau',
    jurisdictionType: 'administrative', stateCode: 'TS', districtName: 'Hyderabad',
    centerLat: 17.4126, centerLng: 78.4482, catchmentRadiusKm: null,
    deliveryMethod: 'dashboard', contactPhone: null, contactEmail: 'acb@telangana.gov.in',
    subscriptionStatus: 'active', verified: true,
  },
  {
    id: 'dep-collectorate-hyd', departmentType: 'collectorate', officeName: 'Hyderabad District Collectorate',
    jurisdictionType: 'administrative', stateCode: 'TS', districtName: 'Hyderabad',
    centerLat: 17.3850, centerLng: 78.4867, catchmentRadiusKm: null,
    deliveryMethod: 'dashboard', contactPhone: null, contactEmail: null,
    subscriptionStatus: 'active', verified: true,
  },
  {
    id: 'dep-disaster-ts', departmentType: 'disaster_management', officeName: 'TS Disaster Response (SDRF)',
    jurisdictionType: 'administrative', stateCode: 'TS', districtName: 'Hyderabad',
    centerLat: 17.4000, centerLng: 78.4700, catchmentRadiusKm: null,
    deliveryMethod: 'push', contactPhone: null, contactEmail: null,
    subscriptionStatus: 'active', verified: true,
  },
];

// ─── Seed: credibility profiles ──────────────────────────────────────────────

const SEED_CREDIBILITY: ReporterCredibility[] = [
  {
    reporterId: 'u-j1', score: 88, totalStreams: 142, genuineAlerts: 31, falseAlerts: 1,
    unverifiedAlerts: 4, mediaPickups: 58, communityUpvotes: 4200, communityDownvotes: 90,
    departmentAlertsRestricted: false, requiresModeratorCosign: false,
  },
  {
    reporterId: 'u-citizen-1', score: 52, totalStreams: 6, genuineAlerts: 2, falseAlerts: 0,
    unverifiedAlerts: 1, mediaPickups: 1, communityUpvotes: 40, communityDownvotes: 5,
    departmentAlertsRestricted: false, requiresModeratorCosign: false,
  },
];

// ─── Seed: demo live events (so the Live tab renders immediately) ─────────────

function seedEvent(partial: Partial<LiveEvent> & { id: string; streamId: string }): LiveEvent {
  const base: LiveEvent = {
    id: partial.id,
    streamId: partial.streamId,
    reporterId: 'u-citizen-1',
    reporterName: 'Citizen Reporter',
    accreditationTier: 'citizen',
    credibilityScore: 52,
    gpsLat: 17.385, gpsLng: 78.4867,
    stateCode: 'TS', districtName: 'Hyderabad', mandalName: null, constituencyAcNo: null, locality: null,
    issueCategory: 'general', tags: [], language: 'en',
    mediaIngestUrl: null,
    mediaPlaybackHls: 'https://demo.kshetra.in/live/placeholder.m3u8',
    mediaPlaybackWebrtc: null, thumbnailUrl: null, multiCameraAngles: [],
    affiliationId: null, activeBrandKitId: null, organizationName: null, exclusivityFlag: false,
    visibilityMode: 'public', alertDepartments: [],
    bufferState: 'cleared', bufferSeconds: 25, humanDecision: 'allow',
    status: 'live', viewerCount: 0, peakViewers: 0, priorityScore: 0,
    contentHash: null, rawRecordingUrl: null, brandedRecordingUrl: null, retentionExpiry: null,
    startedAt: new Date().toISOString(), endedAt: null,
    ai: neutralAI(),
  };
  const merged = { ...base, ...partial };
  merged.priorityScore = computePriorityScore(merged);
  return merged;
}

const now = Date.now();
const SEED_EVENTS: LiveEvent[] = [
  seedEvent({
    id: 'le-1', streamId: 'KX-240001', reporterId: 'u-j1', reporterName: 'Kavitha Reddy',
    accreditationTier: 'senior', credibilityScore: 88,
    issueCategory: 'breaking_news', tags: ['assembly', 'session'],
    districtName: 'Hyderabad', locality: 'Assembly',
    organizationName: 'Deccan Chronicle', affiliationId: 'aff-1', activeBrandKitId: 'bk-dc',
    viewerCount: 4200, peakViewers: 5100, startedAt: new Date(now - 12 * 60000).toISOString(),
  }),
  seedEvent({
    id: 'le-2', streamId: 'KX-240002', reporterName: 'Anil Kumar',
    issueCategory: 'traffic', tags: ['waterlogging', 'monsoon'],
    districtName: 'Hyderabad', locality: 'Panjagutta',
    gpsLat: 17.4275, gpsLng: 78.4489,
    viewerCount: 860, startedAt: new Date(now - 4 * 60000).toISOString(),
  }),
  seedEvent({
    id: 'le-3', streamId: 'KX-240003', reporterName: 'Sunitha Rao', reporterId: 'u-citizen-1',
    issueCategory: 'emergency', tags: ['fire', 'building'],
    districtName: 'Hyderabad', locality: 'Abids',
    gpsLat: 17.3902, gpsLng: 78.4744,
    alertDepartments: ['fire', 'police'],
    viewerCount: 2100, startedAt: new Date(now - 2 * 60000).toISOString(),
  }),
  seedEvent({
    id: 'le-4', streamId: 'KX-240004', reporterName: 'Ground Report — KA',
    stateCode: 'KA', districtName: 'Bengaluru Urban', locality: 'MG Road',
    gpsLat: 12.9757, gpsLng: 77.6068,
    issueCategory: 'civic', tags: ['pothole', 'infrastructure'],
    viewerCount: 320, status: 'ended', endedAt: new Date(now - 30 * 60000).toISOString(),
    startedAt: new Date(now - 90 * 60000).toISOString(),
  }),
];

// ─── State ────────────────────────────────────────────────────────────────────

interface LiveExchangeState {
  // AI is OPTIONAL — false until a model is subscribed. Everything works either way.
  aiServiceEnabled: boolean;
  aiModelProvider: string | null;

  events: LiveEvent[];
  departments: GovernmentDepartment[];
  affiliations: Affiliation[];
  brandKits: BrandKit[];
  alerts: DepartmentAlert[];
  credibility: ReporterCredibility[];
  moderationEvents: ModerationEvent[];
  distribution: DistributionDestination[];

  // The reporter currently viewing / operating as (demo: default to citizen)
  currentReporterId: string;

  // ─── Queries ──────────────────────────────────────────────────────────────
  getLiveTabFeed: () => LiveEvent[];
  getEventById: (id: string) => LiveEvent | undefined;
  getEventsByState: (stateCode: string) => LiveEvent[];
  getDepartmentsByType: (type: DepartmentType) => GovernmentDepartment[];
  getActiveAffiliations: (contributorId: string) => Affiliation[];
  getBrandKit: (id: string | null | undefined) => BrandKit | undefined;
  getAlertsForEvent: (eventId: string) => DepartmentAlert[];
  getInboxForDepartment: (departmentId: string) => DepartmentAlert[];
  getCredibility: (reporterId: string) => ReporterCredibility | undefined;
  getModerationQueue: () => LiveEvent[];

  // ─── Actions ────────────────────────────────────────────────────────────────
  setAIService: (enabled: boolean, provider?: string | null) => void;
  setCurrentReporter: (id: string) => void;

  /** Go-live: build the Live Event Object, run buffer + dispatch dept alerts. */
  startLiveEvent: (input: StartLiveInput) => LiveEvent;
  clearBuffer: (eventId: string) => void;
  setHumanDecision: (eventId: string, decision: HumanDecision, note?: string) => void;
  incrementViewers: (eventId: string, delta?: number) => void;
  endEvent: (eventId: string) => void;

  /** Attach AI enrichment (only when aiServiceEnabled). No-op otherwise. */
  enrichWithAI: (eventId: string, ai: Partial<LiveEventAI>) => void;

  /** Department acknowledges an alert → feeds reporter credibility. */
  acknowledgeAlert: (alertId: string, ack: AlertAcknowledgment, by?: string) => void;

  addDistribution: (dest: Omit<DistributionDestination, 'id'>) => DistributionDestination;
  subscribeDepartment: (dept: Omit<GovernmentDepartment, 'id'>) => GovernmentDepartment;
}

export interface StartLiveInput {
  reporterId: string;
  reporterName: string;
  accreditationTier: AccreditationTier;
  visibilityMode: VisibilityMode;
  alertDepartments: DepartmentType[];
  affiliationId?: string | null;
  issueCategory: IssueCategory;
  tags?: string[];
  language?: string;
  gpsLat?: number | null;
  gpsLng?: number | null;
  stateCode?: string | null;
  districtName?: string | null;
  locality?: string | null;
}

let seq = 240100;
function nextStreamId(): string {
  seq += 1;
  return `KX-${seq}`;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useLiveExchangeStore = create<LiveExchangeState>()(
  persist(
    (set, get) => ({
      aiServiceEnabled: false,
      aiModelProvider: null,

      events: SEED_EVENTS,
      departments: SEED_DEPARTMENTS,
      affiliations: SEED_AFFILIATIONS,
      brandKits: SEED_BRAND_KITS,
      alerts: [],
      credibility: SEED_CREDIBILITY,
      moderationEvents: [],
      distribution: [],
      currentReporterId: 'u-citizen-1',

      // ─── Queries ──────────────────────────────────────────────────────────

      getLiveTabFeed: () =>
        get()
          .events.filter(
            (e) =>
              e.visibilityMode === 'public' &&
              (e.status === 'live' || e.status === 'ended') &&
              (e.bufferState === 'cleared' || e.bufferState === 'bypassed'),
          )
          .sort((a, b) => {
            if (a.status === 'live' && b.status !== 'live') return -1;
            if (b.status === 'live' && a.status !== 'live') return 1;
            return b.priorityScore - a.priorityScore;
          }),

      getEventById: (id) => get().events.find((e) => e.id === id),

      getEventsByState: (stateCode) =>
        get().events.filter((e) => e.stateCode === stateCode),

      getDepartmentsByType: (type) =>
        get().departments.filter((d) => d.departmentType === type),

      getActiveAffiliations: (contributorId) =>
        get().affiliations.filter(
          (a) => a.contributorId === contributorId && a.status === 'active',
        ),

      getBrandKit: (id) => (id ? get().brandKits.find((b) => b.id === id) : undefined),

      getAlertsForEvent: (eventId) =>
        get().alerts.filter((a) => a.liveEventId === eventId),

      getInboxForDepartment: (departmentId) =>
        get()
          .alerts.filter((a) => a.departmentId === departmentId)
          .sort((a, b) => new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime()),

      getCredibility: (reporterId) =>
        get().credibility.find((c) => c.reporterId === reporterId),

      getModerationQueue: () =>
        get()
          .events.filter((e) => e.bufferState === 'buffering' || e.bufferState === 'held')
          .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),

      // ─── Actions ──────────────────────────────────────────────────────────

      setAIService: (enabled, provider = null) =>
        set({ aiServiceEnabled: enabled, aiModelProvider: enabled ? provider : null }),

      setCurrentReporter: (id) => set({ currentReporterId: id }),

      startLiveEvent: (input) => {
        const state = get();
        const cred = state.credibility.find((c) => c.reporterId === input.reporterId);
        const credibilityScore = cred?.score ?? 50;

        const aff = input.affiliationId
          ? state.affiliations.find((a) => a.id === input.affiliationId)
          : undefined;
        const brandKitId = aff?.brandKitId ?? null;

        const hasDeptAlert = input.alertDepartments.length > 0;
        const ai = neutralAI();
        const bufferSeconds = computeBufferSeconds(input.accreditationTier, hasDeptAlert, ai);

        // Accredited+ tiers or department alerts skip the long public buffer.
        const shortTier = input.accreditationTier !== 'citizen';
        const initialBuffer = shortTier || hasDeptAlert ? 'cleared' : 'buffering';

        const id = `le-${Date.now().toString(36)}`;
        const streamId = nextStreamId();

        const event: LiveEvent = {
          id,
          streamId,
          reporterId: input.reporterId,
          reporterName: input.reporterName,
          accreditationTier: input.accreditationTier,
          credibilityScore,
          gpsLat: input.gpsLat ?? null,
          gpsLng: input.gpsLng ?? null,
          stateCode: input.stateCode ?? null,
          districtName: input.districtName ?? null,
          mandalName: null,
          constituencyAcNo: null,
          locality: input.locality ?? null,
          issueCategory: input.issueCategory,
          tags: input.tags ?? [],
          language: input.language ?? 'en',
          mediaIngestUrl: `rtmp://ingest-ap-south-1.kshetra.in/live/${streamId}`,
          mediaPlaybackHls: `https://cdn.kshetra.in/live/${streamId}/index.m3u8`,
          mediaPlaybackWebrtc: `https://cdn.kshetra.in/live/${streamId}/whep`,
          thumbnailUrl: null,
          multiCameraAngles: [],
          affiliationId: input.affiliationId ?? null,
          activeBrandKitId: brandKitId,
          organizationName: aff?.organizationName ?? null,
          exclusivityFlag: aff?.exclusivityFlag ?? false,
          visibilityMode: input.visibilityMode,
          alertDepartments: input.alertDepartments,
          bufferState: initialBuffer,
          bufferSeconds,
          humanDecision: initialBuffer === 'cleared' ? 'allow' : null,
          status: 'live',
          viewerCount: 0,
          peakViewers: 0,
          priorityScore: 0,
          contentHash: null,
          rawRecordingUrl: null,
          brandedRecordingUrl: null,
          retentionExpiry: null,
          startedAt: new Date().toISOString(),
          endedAt: null,
          ai,
        };
        event.priorityScore = computePriorityScore(event);

        // Dispatch department alerts (reporter-initiated, jurisdiction-resolved).
        const newAlerts: DepartmentAlert[] = [];
        if (hasDeptAlert && input.gpsLat != null && input.gpsLng != null) {
          for (const deptType of input.alertDepartments) {
            const offices = resolveJurisdiction(
              deptType,
              input.gpsLat,
              input.gpsLng,
              state.departments,
            );
            for (const office of offices) {
              newAlerts.push({
                id: `al-${Date.now().toString(36)}-${deptType}-${office.id}`,
                liveEventId: id,
                departmentId: office.id,
                departmentType: deptType,
                reporterId: input.reporterId,
                feedAccessUrl: event.mediaPlaybackHls,
                gpsLat: input.gpsLat,
                gpsLng: input.gpsLng,
                aiSummary: null, // populated later if AI is enabled
                dispatchedAt: new Date().toISOString(),
                deliveryStatus: 'dispatched',
                acknowledgment: null,
                acknowledgedAt: null,
                acknowledgedBy: null,
              });
            }
          }
        }

        set((s) => ({
          events: [event, ...s.events],
          alerts: [...newAlerts, ...s.alerts],
        }));
        return event;
      },

      clearBuffer: (eventId) =>
        set((s) => ({
          events: s.events.map((e) =>
            e.id === eventId
              ? { ...e, bufferState: 'cleared' as const, humanDecision: 'allow' as const }
              : e,
          ),
        })),

      setHumanDecision: (eventId, decision, note) =>
        set((s) => {
          const bufferState =
            decision === 'allow'
              ? ('cleared' as const)
              : decision === 'cut'
                ? ('cut' as const)
                : decision === 'escalate'
                  ? ('held' as const)
                  : ('cleared' as const);
          return {
            events: s.events.map((e) =>
              e.id === eventId ? { ...e, humanDecision: decision, bufferState } : e,
            ),
            moderationEvents: [
              {
                id: `mod-${Date.now().toString(36)}`,
                liveEventId: eventId,
                layer: 'human_buffer' as const,
                flagType: null,
                raisedBy: 'moderator',
                action: decision,
                note: note ?? null,
                createdAt: new Date().toISOString(),
              },
              ...s.moderationEvents,
            ],
          };
        }),

      incrementViewers: (eventId, delta = 1) =>
        set((s) => ({
          events: s.events.map((e) => {
            if (e.id !== eventId) return e;
            const viewerCount = Math.max(0, e.viewerCount + delta);
            const peakViewers = Math.max(e.peakViewers, viewerCount);
            const updated = { ...e, viewerCount, peakViewers };
            updated.priorityScore = computePriorityScore(updated);
            return updated;
          }),
        })),

      endEvent: (eventId) =>
        set((s) => ({
          events: s.events.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  status: 'ended' as const,
                  endedAt: new Date().toISOString(),
                  contentHash: `sha-${Math.abs(hashStr(e.streamId + e.startedAt)).toString(16)}`,
                  retentionExpiry: new Date(Date.now() + 90 * 86400000).toISOString(),
                }
              : e,
          ),
        })),

      enrichWithAI: (eventId, ai) => {
        if (!get().aiServiceEnabled) return; // AI optional — silently skip.
        set((s) => ({
          events: s.events.map((e) => {
            if (e.id !== eventId) return e;
            const merged: LiveEventAI = {
              ...(e.ai ?? neutralAI()),
              ...ai,
              aiEnabled: true,
              modelProvider: s.aiModelProvider,
              processedAt: new Date().toISOString(),
            };
            const updated = { ...e, ai: merged };
            updated.priorityScore = computePriorityScore(updated);
            return updated;
          }),
          // Backfill AI summary into any pending alerts for this event.
          alerts: s.alerts.map((al) =>
            al.liveEventId === eventId && ai.summary != null
              ? { ...al, aiSummary: ai.summary ?? null }
              : al,
          ),
        }));
      },

      acknowledgeAlert: (alertId, ack, by) =>
        set((s) => {
          const alert = s.alerts.find((a) => a.id === alertId);
          if (!alert) return {};
          const updatedAlerts = s.alerts.map((a) =>
            a.id === alertId
              ? {
                  ...a,
                  acknowledgment: ack,
                  acknowledgedAt: new Date().toISOString(),
                  acknowledgedBy: by ?? 'department',
                }
              : a,
          );
          // Feed the reporter's credibility score (doc Section 12.6).
          let credibility = s.credibility;
          const existing = credibility.find((c) => c.reporterId === alert.reporterId);
          if (existing) {
            credibility = credibility.map((c) =>
              c.reporterId === alert.reporterId ? applyAckToCredibility(c, ack) : c,
            );
          }
          return { alerts: updatedAlerts, credibility };
        }),

      addDistribution: (dest) => {
        const created: DistributionDestination = {
          ...dest,
          id: `dist-${Date.now().toString(36)}`,
        };
        set((s) => ({ distribution: [...s.distribution, created] }));
        return created;
      },

      subscribeDepartment: (dept) => {
        const created: GovernmentDepartment = {
          ...dept,
          id: `dep-${Date.now().toString(36)}`,
        };
        set((s) => ({ departments: [...s.departments, created] }));
        return created;
      },
    }),
    {
      name: 'kshetra-live-exchange',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        aiServiceEnabled: state.aiServiceEnabled,
        aiModelProvider: state.aiModelProvider,
        // Persist user-created runtime data; seed arrays reset on load.
        alerts: state.alerts,
        credibility: state.credibility,
        distribution: state.distribution,
        currentReporterId: state.currentReporterId,
      }),
    },
  ),
);

// Simple string hash for content-hash demo (mirrors simpleContentHash).
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h &= h;
  }
  return h;
}
