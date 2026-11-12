/**
 * Canonical Universal Analytics, Public Web Discovery & Embed Contracts (JOB 063-066)
 * Authority: Master Product Blueprint (Jobs 063, 064, 065, 066), DEC-188, DEC-189
 */

// ==============================================================================
// 1. PUBLIC WEB DISCOVERY CONTRACTS (JOB 063)
// ==============================================================================

export interface PublicStateOverviewDTO {
  stateCode: string;
  name: string;
  capital: string | null;
  totalAssemblyConstituencies: number | null;
  totalParliamentaryConstituencies: number | null;
  rulingParty: string | null;
  districtsCount: number | null;
  delimitationSeatChange: number | null;
  sourceVerificationStatus: 'not_verified';
  canonicalUrl: string;
}

export interface PublicConstituencyProfileDTO {
  acId: string;
  acNo: number;
  name: string;
  stateCode: string;
  districtId: string | null;
  districtName: string | null;
  reservedCategory: 'GEN' | 'SC' | 'ST' | null;
  currentRepresentative: {
    id: string;
    name: string;
    party: string | null;
    termStart: string | null;
  } | null;
  electorateSummary: {
    totalElectors: number | null;
    maleElectors: number | null;
    femaleElectors: number | null;
    turnoutPercentage: number | null;
  };
  delimitationImpact: {
    previousBoundaries: string | null;
    newBoundaries2026: string | null;
    boundaryShiftMagnitude: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  } | null;
  civicSummary: {
    openIssuesCount: number | null;
    resolvedIssuesCount: number | null;
    cdiScore: number | null;
  };
  sourceVerificationStatus: 'not_verified';
  canonicalUrl: string;
}

export interface PublicRepresentativeProfileDTO {
  id: string;
  name: string;
  stateCode: string | null;
  constituencyId: string | null;
  constituencyName: string | null;
  party: string | null;
  termStart: string | null;
  questionsAsked: number | null;
  debatesParticipated: number | null;
  declaredAssetsINR: number | null;
  criminalCasesCount: number | null;
  sourceVerificationStatus: 'not_verified';
  canonicalUrl: string;
}

// ==============================================================================
// 2. MEDIA EMBEDS CONTRACTS (JOB 064)
// ==============================================================================

export type PoligramEmbedWidgetType =
  'constituency' | 'delimitation' | 'election' | 'candidate' | 'issue' | 'live' | 'short';

export type PaninEmbedWidgetType = PoligramEmbedWidgetType;

export interface PoligramEmbedMetadataDTO {
  widgetType: PoligramEmbedWidgetType;
  entityId: string;
  title: string;
  attribution: string;
  canonicalUrl: string;
  minHeight: number;
}

export type PaninEmbedMetadataDTO = PoligramEmbedMetadataDTO;

// ==============================================================================
// 3. UNIVERSAL ANALYTICS CONTRACTS (JOB 065 - Canonical 10-Field Event Schema)
// ==============================================================================

export interface UniversalAnalyticsEventDTO {
  id?: string;
  eventName: string;
  userId?: string | null;
  anonymousId: string;
  sessionId: string;
  timestamp: string;
  screen: string;
  geography: {
    stateCode?: string;
    districtId?: string;
    pcId?: string;
    acId?: string;
    pinCode?: string;
    [key: string]: any;
  };
  entity: {
    entityType?: string;
    entityId?: string;
    [key: string]: any;
  };
  metadata: Record<string, any>;
  appVersion: string;
}

export interface BatchAnalyticsEventsRequest {
  events: UniversalAnalyticsEventDTO[];
}

export interface BatchAnalyticsEventsResponse {
  success: boolean;
  ingestedCount: number;
  rejectedCount: number;
  errors?: string[];
}

// ==============================================================================
// 4. EXECUTIVE PRODUCT DASHBOARD CONTRACTS (JOB 066)
// ==============================================================================

export interface ProductDashboardMetricsDTO {
  activation: {
    totalSignups: number;
    verifiedUsers: number;
    geographySelectedCount: number;
    firstCivicActionCount: number;
    activationRatePercent: number | null;
  };
  retention: {
    dau: number;
    wau: number;
    mau: number;
    stickinessRatioPercent: number | null;
    day7RetentionRatePercent: number | null;
    day30RetentionRatePercent: number | null;
    day7MaturedCohortSize: number;
    day30MaturedCohortSize: number;
  };
  liveStreams: {
    verifiedLiveCount: number | null;
    staleReportedCount: number | null;
    scheduledCount: number | null;
    currentViewerCount: number | null;
    freshnessWindowSeconds: number;
    latestHeartbeatAt: string | null;
    inventory: Array<{
      id: string;
      title: string;
      channelTitle: string;
      stateCode: string | null;
      startedAt: string | null;
      currentViewers: number;
      telemetryAt: string;
    }>;
  };
  engagement: {
    totalSessions: number;
    avgSessionDurationSeconds: number | null;
    avgInteractionsPerSession: number | null;
    totalCivicInteractions: number;
  };
  geographyDensity: {
    totalConstituencies: number | null;
    activeConstituencies: number;
    penetrationPercentage: number | null;
    topActiveConstituencies: Array<{
      acId: string;
      name: string;
      activeUsers: number;
      eventCount: number;
    }>;
  };
  revenue: {
    b2bSubscriptionMrrINR: number | null;
    activeB2bSubscriptions: number | null;
    adDeliveryEnabled: boolean;
    adRevenueINR: number | null;
    totalPrepaidBalancesINR: number | null;
    arpuINR: number | null;
  };
  dataQuality: {
    source: 'durable_database' | 'local_development_buffer';
    metricWindowDays: number;
    eventsInMetricWindow: number;
    analyticsCoverageStart: string | null;
    notes: string[];
  };
  generatedAt: string;
}
