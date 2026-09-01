/**
 * Kshetra Live Media Exchange (LMX) — Types
 *
 * The Live Event Object is the source of truth for every live session. Video is
 * ONE field; routing, dashboards, department alerts, archive and audit all read
 * from this record. See product doc Sections 3, 9, 12, 14.
 *
 * TWO ORTHOGONAL reporter choices at go-live:
 *   - visibility_mode  → who ELSE can see it (Live tab / exclusive partner / nobody)
 *   - alertDepartments → which authorities get a direct alert (reporter-initiated)
 *
 * AI is OPTIONAL. `LiveEventAI.aiEnabled === false` means no model is subscribed;
 * the whole flow still works with neutral defaults. AI never triggers routing —
 * it only enriches alert context and the Live tab priority score.
 *
 * Mirrors: supabase/migrations/024_live_media_exchange.sql
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type VisibilityMode = 'public' | 'exclusive_partner' | 'confidential_direct';

export type AccreditationTier =
  | 'citizen'
  | 'stringer'
  | 'accredited'
  | 'senior'
  | 'editor'
  | 'organization';

export type IssueCategory =
  | 'emergency'
  | 'traffic'
  | 'weather'
  | 'civic'
  | 'breaking_news'
  | 'general';

export type DepartmentType =
  | 'police'
  | 'fire'
  | 'hospital'
  | 'disaster_management'
  | 'anti_corruption'
  | 'traffic_police'
  | 'municipal'
  | 'collectorate'
  | 'electricity_board'
  | 'water_board'
  | 'women_child_helpline'
  | 'forest';

export type JurisdictionType =
  | 'police_station'
  | 'hospital_catchment'
  | 'administrative'
  | 'municipal_ward'
  | 'custom';

export type DeliveryMethod = 'webhook' | 'dashboard' | 'sms' | 'push';

export type SubscriptionStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export type BufferState = 'buffering' | 'cleared' | 'held' | 'cut' | 'bypassed';

export type HumanDecision = 'allow' | 'mute' | 'cut' | 'escalate';

export type LiveEventStatus = 'preparing' | 'live' | 'ended' | 'archived' | 'removed';

export type DistributionProtocol =
  | 'hls'
  | 'dash'
  | 'webrtc'
  | 'srt'
  | 'rtmp'
  | 'mpegts'
  | 'ndi'
  | 'embed';

export type AlertAcknowledgment = 'genuine' | 'false' | 'unable_to_verify';

export type AffiliationStatus = 'active' | 'expired' | 'revoked' | 'pending';

// ─── Config maps ──────────────────────────────────────────────────────────────

export const VISIBILITY_CONFIG: Record<
  VisibilityMode,
  { labelKey: string; label: string; shortLabel: string; descriptionKey: string; description: string; icon: string; color: string }
> = {
  public: {
    labelKey: 'lmx.visibility.public',
    label: 'Public',
    shortLabel: 'Public',
    descriptionKey: 'lmx.visibility.publicDesc',
    description: 'Appears on the Kshetra Live tab and is eligible for media/broadcast distribution.',
    icon: 'earth',
    color: '#10B981',
  },
  exclusive_partner: {
    labelKey: 'lmx.visibility.exclusivePartner',
    label: 'Exclusive to Partner',
    shortLabel: 'Exclusive',
    descriptionKey: 'lmx.visibility.exclusivePartnerDesc',
    description: 'Only your affiliated organization receives it. Not shown on the Live tab.',
    icon: 'briefcase',
    color: '#F59E0B',
  },
  confidential_direct: {
    labelKey: 'lmx.visibility.confidentialDirect',
    label: 'Confidential / Direct',
    shortLabel: 'Confidential',
    descriptionKey: 'lmx.visibility.confidentialDirectDesc',
    description: 'Never public and never distributed to media. Only alerted departments can see it.',
    icon: 'lock-closed',
    color: '#EF4444',
  },
};

export const ISSUE_CATEGORY_CONFIG: Record<
  IssueCategory,
  { labelKey: string; label: string; icon: string; color: string; weight: number }
> = {
  emergency: { labelKey: 'lmx.categories.emergency', label: 'Emergency', icon: 'alert-circle', color: '#EF4444', weight: 100 },
  breaking_news: { labelKey: 'lmx.categories.breakingNews', label: 'Breaking News', icon: 'flash', color: '#F97316', weight: 80 },
  traffic: { labelKey: 'lmx.categories.traffic', label: 'Traffic', icon: 'car', color: '#F59E0B', weight: 50 },
  weather: { labelKey: 'lmx.categories.weather', label: 'Weather', icon: 'rainy', color: '#38BDF8', weight: 50 },
  civic: { labelKey: 'lmx.categories.civic', label: 'Civic / Infra', icon: 'construct', color: '#8B5CF6', weight: 40 },
  general: { labelKey: 'lmx.categories.general', label: 'General', icon: 'videocam', color: '#6B7280', weight: 20 },
};

export const DEPARTMENT_CONFIG: Record<
  DepartmentType,
  { labelKey: string; label: string; icon: string; color: string; jurisdictionType: JurisdictionType }
> = {
  police: { labelKey: 'lmx.departments.police', label: 'Police', icon: 'shield', color: '#3B82F6', jurisdictionType: 'police_station' },
  fire: { labelKey: 'lmx.departments.fire', label: 'Fire Services', icon: 'flame', color: '#EF4444', jurisdictionType: 'administrative' },
  hospital: { labelKey: 'lmx.departments.hospital', label: 'Hospital / Medical', icon: 'medkit', color: '#EC4899', jurisdictionType: 'hospital_catchment' },
  disaster_management: { labelKey: 'lmx.departments.disasterManagement', label: 'Disaster Management', icon: 'warning', color: '#F97316', jurisdictionType: 'administrative' },
  anti_corruption: { labelKey: 'lmx.departments.antiCorruption', label: 'Anti-Corruption / Vigilance', icon: 'eye', color: '#A855F7', jurisdictionType: 'administrative' },
  traffic_police: { labelKey: 'lmx.departments.trafficPolice', label: 'Traffic Police', icon: 'car-sport', color: '#F59E0B', jurisdictionType: 'police_station' },
  municipal: { labelKey: 'lmx.departments.municipal', label: 'Municipal / Civic', icon: 'business', color: '#14B8A6', jurisdictionType: 'municipal_ward' },
  collectorate: { labelKey: 'lmx.departments.collectorate', label: 'Collectorate / Secretariat', icon: 'library', color: '#6366F1', jurisdictionType: 'administrative' },
  electricity_board: { labelKey: 'lmx.departments.electricityBoard', label: 'Electricity Board', icon: 'flash', color: '#EAB308', jurisdictionType: 'administrative' },
  water_board: { labelKey: 'lmx.departments.waterBoard', label: 'Water Board', icon: 'water', color: '#0EA5E9', jurisdictionType: 'administrative' },
  women_child_helpline: { labelKey: 'lmx.departments.womenChildHelpline', label: 'Women & Child Helpline', icon: 'heart', color: '#F43F5E', jurisdictionType: 'administrative' },
  forest: { labelKey: 'lmx.departments.forest', label: 'Forest Department', icon: 'leaf', color: '#22C55E', jurisdictionType: 'administrative' },
};

export const TIER_CONFIG: Record<
  AccreditationTier,
  { labelKey: string; label: string; color: string; bufferSeconds: number; badgeIcon: string }
> = {
  citizen: { labelKey: 'lmx.tiers.citizen', label: 'Citizen', color: '#6B7280', bufferSeconds: 25, badgeIcon: 'person' },
  stringer: { labelKey: 'lmx.tiers.stringer', label: 'Stringer', color: '#38BDF8', bufferSeconds: 15, badgeIcon: 'create' },
  accredited: { labelKey: 'lmx.tiers.accredited', label: 'Accredited', color: '#10B981', bufferSeconds: 8, badgeIcon: 'ribbon' },
  senior: { labelKey: 'lmx.tiers.senior', label: 'Senior', color: '#8B5CF6', bufferSeconds: 5, badgeIcon: 'star' },
  editor: { labelKey: 'lmx.tiers.editor', label: 'Editor', color: '#F59E0B', bufferSeconds: 3, badgeIcon: 'shield-checkmark' },
  organization: { labelKey: 'lmx.tiers.organization', label: 'Organization', color: '#4F8EF7', bufferSeconds: 3, badgeIcon: 'business' },
};

export const ACK_CONFIG: Record<AlertAcknowledgment, { labelKey: string; label: string; color: string; icon: string; credibilityDelta: number }> = {
  genuine: { labelKey: 'lmx.ack.genuine', label: 'Genuine', color: '#10B981', icon: 'checkmark-circle', credibilityDelta: 5 },
  false: { labelKey: 'lmx.ack.falseAlert', label: 'False Alert', color: '#EF4444', icon: 'close-circle', credibilityDelta: -15 },
  unable_to_verify: { labelKey: 'lmx.ack.unableToVerify', label: 'Unable to Verify', color: '#6B7280', icon: 'help-circle', credibilityDelta: 0 },
};

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface BrandKit {
  id: string;
  organizationId: string;
  organizationName: string;
  logoUrl?: string | null;
  lowerThirdTemplate?: string | null;
  colorPrimary: string;
  colorSecondary: string;
  introBumperUrl?: string | null;
  outroBumperUrl?: string | null;
  watermarkUrl?: string | null;
  isApproved: boolean;
}

export interface Affiliation {
  id: string;
  contributorId: string;
  organizationId: string;
  organizationName: string;
  brandKitId?: string | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  exclusivityFlag: boolean;
  status: AffiliationStatus;
}

export interface GovernmentDepartment {
  id: string;
  departmentType: DepartmentType;
  officeName: string;
  jurisdictionType: JurisdictionType;
  stateCode: string;
  districtName?: string | null;
  mandalName?: string | null;
  catchmentRadiusKm?: number | null;
  centerLat?: number | null;
  centerLng?: number | null;
  deliveryMethod: DeliveryMethod;
  webhookUrl?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  subscriptionStatus: SubscriptionStatus;
  verified: boolean;
}

export interface LiveEventAI {
  aiEnabled: boolean; // false => no model subscribed; flow continues with defaults
  transcript?: string | null;
  translation?: string | null;
  summary?: string | null;
  autoHeadline?: string | null;
  detectedObjects?: string[];
  crowdEstimate?: number | null;
  sentiment?: string | null;
  emergencyScore?: number | null; // enrichment ONLY, never a routing trigger
  authenticityScore?: number | null;
  deepfakeFlag?: boolean;
  violenceFlag?: boolean;
  weaponFlag?: boolean;
  modelProvider?: string | null;
  processedAt?: string | null;
}

export interface DepartmentAlert {
  id: string;
  liveEventId: string;
  departmentId?: string | null;
  departmentType: DepartmentType;
  reporterId: string;
  feedAccessUrl?: string | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
  aiSummary?: string | null;
  dispatchedAt: string;
  deliveryStatus: 'queued' | 'dispatched' | 'delivered' | 'failed';
  acknowledgment?: AlertAcknowledgment | null;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
}

export interface DistributionDestination {
  id: string;
  liveEventId?: string | null;
  organizationId?: string | null;
  protocol: DistributionProtocol;
  destinationUrl?: string | null;
  streamKey?: string | null;
  srtPassphrase?: string | null;
  branded: boolean;
  brandKitId?: string | null;
  active: boolean;
  health: 'healthy' | 'degraded' | 'down' | 'unknown';
}

export interface ModerationEvent {
  id: string;
  liveEventId: string;
  layer: 'ai_screen' | 'human_buffer' | 'audit' | 'grievance';
  flagType?: string | null;
  raisedBy: string;
  action?: 'flag' | 'allow' | 'mute' | 'cut' | 'escalate' | 'takedown' | null;
  note?: string | null;
  createdAt: string;
}

export interface ReporterCredibility {
  reporterId: string;
  score: number;
  totalStreams: number;
  genuineAlerts: number;
  falseAlerts: number;
  unverifiedAlerts: number;
  mediaPickups: number;
  communityUpvotes: number;
  communityDownvotes: number;
  departmentAlertsRestricted: boolean;
  requiresModeratorCosign: boolean;
}

/** THE Live Event Object (doc Section 3) */
export interface LiveEvent {
  id: string;
  streamId: string;
  reporterId: string;
  reporterName: string;
  accreditationTier: AccreditationTier;
  credibilityScore: number;

  // Location
  gpsLat?: number | null;
  gpsLng?: number | null;
  stateCode?: string | null;
  districtName?: string | null;
  mandalName?: string | null;
  constituencyAcNo?: number | null;
  locality?: string | null;

  // Classification
  issueCategory: IssueCategory;
  tags: string[];
  language: string;

  // Media
  mediaIngestUrl?: string | null;
  mediaPlaybackHls?: string | null;
  mediaPlaybackWebrtc?: string | null;
  thumbnailUrl?: string | null;
  multiCameraAngles: string[];

  // Brand context
  affiliationId?: string | null;
  activeBrandKitId?: string | null;
  organizationName?: string | null; // denormalized for display
  exclusivityFlag: boolean;

  // Two orthogonal choices
  visibilityMode: VisibilityMode;
  alertDepartments: DepartmentType[];

  // Moderation
  bufferState: BufferState;
  bufferSeconds: number;
  humanDecision?: HumanDecision | null;

  // Lifecycle
  status: LiveEventStatus;
  viewerCount: number;
  peakViewers: number;
  priorityScore: number;

  // Audit
  contentHash?: string | null;
  rawRecordingUrl?: string | null;
  brandedRecordingUrl?: string | null;
  retentionExpiry?: string | null;

  startedAt: string;
  endedAt?: string | null;

  // Enrichment (optional)
  ai?: LiveEventAI;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Neutral AI record used when no AI model is subscribed. Flow continues normally. */
export function neutralAI(): LiveEventAI {
  return {
    aiEnabled: false,
    transcript: null,
    translation: null,
    summary: null,
    autoHeadline: null,
    detectedObjects: [],
    crowdEstimate: null,
    sentiment: null,
    emergencyScore: null,
    authenticityScore: null,
    deepfakeFlag: false,
    violenceFlag: false,
    weaponFlag: false,
    modelProvider: null,
    processedAt: null,
  };
}

/** Is AI enrichment present and active on this event? */
export function hasAI(event: Pick<LiveEvent, 'ai'>): boolean {
  return !!event.ai && event.ai.aiEnabled === true;
}

/**
 * Moderation buffer length (seconds) for a stream.
 * - Department-directed alerts get the SHORTEST buffer (intent is unambiguous).
 * - Otherwise the tier default applies.
 * - An AI violence/weapon/deepfake flag EXTENDS the buffer (only when AI active).
 */
export function computeBufferSeconds(
  tier: AccreditationTier,
  hasDepartmentAlert: boolean,
  ai?: LiveEventAI,
): number {
  let base = TIER_CONFIG[tier]?.bufferSeconds ?? 25;
  if (hasDepartmentAlert) base = Math.min(base, 5);
  if (ai?.aiEnabled && (ai.violenceFlag || ai.weaponFlag || ai.deepfakeFlag)) {
    base += 20;
  }
  return base;
}

/**
 * AI priority score (0-100) for Live tab / dashboard ranking (doc Section 14).
 * Combines viewer count, credibility, category weight, freshness, and — when
 * available — the AI emergency score. Purely a ranking signal; unrelated to
 * whether a department alert fires.
 */
export function computePriorityScore(
  event: Pick<
    LiveEvent,
    'viewerCount' | 'credibilityScore' | 'issueCategory' | 'startedAt' | 'status' | 'ai'
  >,
): number {
  const categoryWeight = ISSUE_CATEGORY_CONFIG[event.issueCategory]?.weight ?? 20;

  // Viewer signal (log-scaled, capped)
  const viewerSignal = Math.min(30, Math.log10(Math.max(1, event.viewerCount)) * 12);

  // Credibility (0-100 → 0-20)
  const credibilitySignal = (event.credibilityScore / 100) * 20;

  // Category (0-100 → 0-25)
  const categorySignal = (categoryWeight / 100) * 25;

  // Freshness: live gets full, decays over 6h once ended
  let freshnessSignal = 15;
  if (event.status !== 'live') {
    const ageMs = Date.now() - new Date(event.startedAt).getTime();
    const ageHours = ageMs / 3_600_000;
    freshnessSignal = Math.max(0, 15 - (ageHours / 6) * 15);
  }

  // AI emergency score (optional, 0-100 → 0-10). Omitted entirely without AI.
  const aiSignal =
    event.ai?.aiEnabled && typeof event.ai.emergencyScore === 'number'
      ? (event.ai.emergencyScore / 100) * 10
      : 0;

  const total = viewerSignal + credibilitySignal + categorySignal + freshnessSignal + aiSignal;
  return Math.round(Math.min(100, total) * 100) / 100;
}

/**
 * Apply a department acknowledgment to a credibility score.
 * Genuine boosts, false penalizes, unable_to_verify is neutral.
 */
export function applyAckToCredibility(
  cred: ReporterCredibility,
  ack: AlertAcknowledgment,
): ReporterCredibility {
  const delta = ACK_CONFIG[ack].credibilityDelta;
  const next = Math.max(0, Math.min(100, cred.score + delta));
  const updated: ReporterCredibility = {
    ...cred,
    score: Math.round(next * 100) / 100,
    genuineAlerts: cred.genuineAlerts + (ack === 'genuine' ? 1 : 0),
    falseAlerts: cred.falseAlerts + (ack === 'false' ? 1 : 0),
    unverifiedAlerts: cred.unverifiedAlerts + (ack === 'unable_to_verify' ? 1 : 0),
  };
  // Privilege gates (doc Section 12.6)
  updated.departmentAlertsRestricted = updated.score < 25;
  updated.requiresModeratorCosign = updated.score < 40;
  return updated;
}

/** Haversine distance in km — used for hospital-catchment nearest-facility logic. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Resolve which subscribed office(s) should receive an alert for a given
 * department type at a GPS point (doc Section 12.3). Uses per-type jurisdiction
 * logic: catchment radius for hospitals, administrative match otherwise.
 * Returns matching departments sorted by proximity.
 */
export function resolveJurisdiction(
  departmentType: DepartmentType,
  lat: number,
  lng: number,
  departments: GovernmentDepartment[],
): GovernmentDepartment[] {
  const active = departments.filter(
    (d) =>
      d.departmentType === departmentType &&
      d.subscriptionStatus === 'active' &&
      d.verified,
  );

  const withDistance = active
    .map((d) => ({
      dept: d,
      dist:
        typeof d.centerLat === 'number' && typeof d.centerLng === 'number'
          ? haversineKm(lat, lng, d.centerLat, d.centerLng)
          : Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => a.dist - b.dist);

  const jType = DEPARTMENT_CONFIG[departmentType].jurisdictionType;

  if (jType === 'hospital_catchment') {
    // Nearest facility within its catchment radius (fallback: single nearest).
    const within = withDistance.filter(
      (x) => x.dept.catchmentRadiusKm != null && x.dist <= (x.dept.catchmentRadiusKm as number),
    );
    if (within.length > 0) return within.map((x) => x.dept);
    return withDistance.slice(0, 1).map((x) => x.dept);
  }

  // Administrative / police / municipal: nearest verified office.
  return withDistance.slice(0, 1).map((x) => x.dept);
}

/**
 * Pre-poll silence enforcement (RPA 1951, Section 126).
 * Broadcasting is restricted during the 48-hour window before polling day.
 * This function checks if the current time falls within an active silence period.
 */
export interface PrePollSilenceWindow {
  electionName: string;
  pollingDate: string; // ISO date of polling day
  silenceStartsAt: string; // ISO datetime (48h before)
  silenceEndsAt: string; // ISO datetime (end of polling day)
  stateCode?: string; // null = national
}

/**
 * Returns the active pre-poll silence window if one is currently in effect.
 * In production, these windows are fetched from the election_schedule table.
 * For now, we check against locally configured windows.
 */
export function getActivePrePollSilence(
  windows: PrePollSilenceWindow[],
  now: Date = new Date(),
): PrePollSilenceWindow | null {
  for (const w of windows) {
    const start = new Date(w.silenceStartsAt);
    const end = new Date(w.silenceEndsAt);
    if (now >= start && now <= end) return w;
  }
  return null;
}

export function isPrePollSilenceActive(
  windows: PrePollSilenceWindow[],
  stateCode?: string | null,
  now: Date = new Date(),
): boolean {
  const active = getActivePrePollSilence(windows, now);
  if (!active) return false;
  // National silence applies everywhere; state-specific only to that state
  if (!active.stateCode) return true;
  return active.stateCode === stateCode;
}
