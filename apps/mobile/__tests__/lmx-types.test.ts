/**
 * Node-safe unit tests for the Live Media Exchange (LMX) pure utilities.
 * Covers: AI-optional defaults, buffer timing, priority scoring, credibility
 * feedback loop, and per-department-type jurisdiction resolution.
 */
import {
  neutralAI,
  hasAI,
  computeBufferSeconds,
  computePriorityScore,
  applyAckToCredibility,
  resolveJurisdiction,
  haversineKm,
  TIER_CONFIG,
  type LiveEvent,
  type GovernmentDepartment,
  type ReporterCredibility,
} from '../lib/lmxTypes';

function makeEvent(over: Partial<LiveEvent> = {}): LiveEvent {
  return {
    id: 'e1', streamId: 'KX-1', reporterId: 'r1', reporterName: 'R',
    accreditationTier: 'citizen', credibilityScore: 50,
    gpsLat: 17.4, gpsLng: 78.4, stateCode: 'TS', districtName: 'Hyderabad',
    mandalName: null, constituencyAcNo: null, locality: null,
    issueCategory: 'general', tags: [], language: 'en',
    mediaIngestUrl: null, mediaPlaybackHls: null, mediaPlaybackWebrtc: null,
    thumbnailUrl: null, multiCameraAngles: [],
    affiliationId: null, activeBrandKitId: null, organizationName: null, exclusivityFlag: false,
    visibilityMode: 'public', alertDepartments: [],
    bufferState: 'cleared', bufferSeconds: 25, humanDecision: 'allow',
    status: 'live', viewerCount: 0, peakViewers: 0, priorityScore: 0,
    contentHash: null, rawRecordingUrl: null, brandedRecordingUrl: null, retentionExpiry: null,
    startedAt: new Date().toISOString(), endedAt: null,
    ai: neutralAI(),
    ...over,
  };
}

describe('LMX — AI is optional', () => {
  it('neutralAI is disabled and flags-clear', () => {
    const ai = neutralAI();
    expect(ai.aiEnabled).toBe(false);
    expect(ai.violenceFlag).toBe(false);
    expect(ai.emergencyScore).toBeNull();
  });

  it('hasAI is false for neutral, true only when enabled', () => {
    expect(hasAI(makeEvent())).toBe(false);
    expect(hasAI(makeEvent({ ai: { ...neutralAI(), aiEnabled: true } }))).toBe(true);
  });

  it('priority score computes without any AI record', () => {
    const score = computePriorityScore(makeEvent({ ai: undefined }));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('LMX — moderation buffer timing', () => {
  it('citizen public stream uses the long tier buffer', () => {
    expect(computeBufferSeconds('citizen', false)).toBe(TIER_CONFIG.citizen.bufferSeconds);
  });

  it('department alert shortens the buffer to <=5s', () => {
    expect(computeBufferSeconds('citizen', true)).toBeLessThanOrEqual(5);
  });

  it('an active AI violence flag EXTENDS the buffer', () => {
    const withFlag = computeBufferSeconds('citizen', false, { ...neutralAI(), aiEnabled: true, violenceFlag: true });
    expect(withFlag).toBeGreaterThan(TIER_CONFIG.citizen.bufferSeconds);
  });

  it('AI flags on a disabled AI record do NOT extend the buffer', () => {
    const noExtend = computeBufferSeconds('citizen', false, { ...neutralAI(), violenceFlag: true });
    expect(noExtend).toBe(TIER_CONFIG.citizen.bufferSeconds);
  });
});

describe('LMX — priority score ranking', () => {
  it('emergency ranks above general, all else equal', () => {
    const emergency = computePriorityScore(makeEvent({ issueCategory: 'emergency' }));
    const general = computePriorityScore(makeEvent({ issueCategory: 'general' }));
    expect(emergency).toBeGreaterThan(general);
  });

  it('more viewers raises the score', () => {
    const low = computePriorityScore(makeEvent({ viewerCount: 10 }));
    const high = computePriorityScore(makeEvent({ viewerCount: 10000 }));
    expect(high).toBeGreaterThan(low);
  });
});

describe('LMX — credibility feedback loop', () => {
  const base: ReporterCredibility = {
    reporterId: 'r1', score: 50, totalStreams: 0, genuineAlerts: 0, falseAlerts: 0,
    unverifiedAlerts: 0, mediaPickups: 0, communityUpvotes: 0, communityDownvotes: 0,
    departmentAlertsRestricted: false, requiresModeratorCosign: false,
  };

  it('genuine acknowledgment raises the score', () => {
    const next = applyAckToCredibility(base, 'genuine');
    expect(next.score).toBeGreaterThan(50);
    expect(next.genuineAlerts).toBe(1);
  });

  it('false acknowledgment lowers the score', () => {
    const next = applyAckToCredibility(base, 'false');
    expect(next.score).toBeLessThan(50);
    expect(next.falseAlerts).toBe(1);
  });

  it('repeated false alerts restrict department privileges', () => {
    let c = base;
    for (let i = 0; i < 3; i++) c = applyAckToCredibility(c, 'false');
    expect(c.score).toBeLessThan(25);
    expect(c.departmentAlertsRestricted).toBe(true);
    expect(c.requiresModeratorCosign).toBe(true);
  });

  it('score is clamped to [0, 100]', () => {
    let c = { ...base, score: 2 };
    c = applyAckToCredibility(c, 'false');
    expect(c.score).toBeGreaterThanOrEqual(0);
  });
});

describe('LMX — jurisdiction resolution per department type', () => {
  const depts: GovernmentDepartment[] = [
    {
      id: 'ps-near', departmentType: 'police', officeName: 'Near PS', jurisdictionType: 'police_station',
      stateCode: 'TS', centerLat: 17.40, centerLng: 78.40, catchmentRadiusKm: null,
      deliveryMethod: 'dashboard', subscriptionStatus: 'active', verified: true,
    },
    {
      id: 'ps-far', departmentType: 'police', officeName: 'Far PS', jurisdictionType: 'police_station',
      stateCode: 'TS', centerLat: 18.50, centerLng: 79.50, catchmentRadiusKm: null,
      deliveryMethod: 'dashboard', subscriptionStatus: 'active', verified: true,
    },
    {
      id: 'hosp-in', departmentType: 'hospital', officeName: 'In-catchment Hosp', jurisdictionType: 'hospital_catchment',
      stateCode: 'TS', centerLat: 17.41, centerLng: 78.41, catchmentRadiusKm: 8,
      deliveryMethod: 'webhook', subscriptionStatus: 'active', verified: true,
    },
    {
      id: 'ps-unverified', departmentType: 'police', officeName: 'Unverified PS', jurisdictionType: 'police_station',
      stateCode: 'TS', centerLat: 17.40, centerLng: 78.40, catchmentRadiusKm: null,
      deliveryMethod: 'dashboard', subscriptionStatus: 'active', verified: false,
    },
  ];

  it('police resolves to the nearest verified office only', () => {
    const res = resolveJurisdiction('police', 17.40, 78.40, depts);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('ps-near');
  });

  it('excludes unverified and inactive subscriptions', () => {
    const res = resolveJurisdiction('police', 17.40, 78.40, depts);
    expect(res.every((d) => d.verified && d.subscriptionStatus === 'active')).toBe(true);
  });

  it('hospital uses catchment radius', () => {
    const res = resolveJurisdiction('hospital', 17.41, 78.41, depts);
    expect(res.map((d) => d.id)).toContain('hosp-in');
  });

  it('returns empty when no department of that type is subscribed', () => {
    expect(resolveJurisdiction('fire', 17.4, 78.4, depts)).toHaveLength(0);
  });
});

describe('LMX — haversine sanity', () => {
  it('distance to self is ~0', () => {
    expect(haversineKm(17.4, 78.4, 17.4, 78.4)).toBeCloseTo(0, 5);
  });
  it('Hyderabad → Bengaluru is roughly 500km', () => {
    const d = haversineKm(17.385, 78.4867, 12.9757, 77.6068);
    expect(d).toBeGreaterThan(450);
    expect(d).toBeLessThan(600);
  });
});
