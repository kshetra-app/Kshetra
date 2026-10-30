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
  capital: string;
  totalAssemblyConstituencies: number;
  totalParliamentaryConstituencies: number;
  rulingParty: string;
  districtsCount: number;
  delimitationSeatChange: number;
  canonicalUrl: string;
}

export interface PublicConstituencyProfileDTO {
  acId: string;
  acNo: number;
  name: string;
  stateCode: string;
  districtId: string;
  districtName: string;
  reservedCategory: 'GEN' | 'SC' | 'ST';
  currentRepresentative: {
    id: string;
    name: string;
    party: string;
    termStart: string;
  } | null;
  electorateSummary: {
    totalElectors: number;
    maleElectors: number;
    femaleElectors: number;
    turnoutPercentage: number;
  };
  delimitationImpact: {
    previousBoundaries: string;
    newBoundaries2026: string;
    boundaryShiftMagnitude: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  civicSummary: {
    openIssuesCount: number;
    resolvedIssuesCount: number;
    cdiScore: number;
  };
  canonicalUrl: string;
}

export interface PublicRepresentativeProfileDTO {
  id: string;
  name: string;
  stateCode: string;
  constituencyId: string;
  constituencyName: string;
  party: string;
  termStart: string;
  attendancePercentage: number;
  questionsAsked: number;
  debatesParticipated: number;
  declaredAssetsINR: number;
  criminalCasesCount: number;
  canonicalUrl: string;
}

// ==============================================================================
// 2. MEDIA EMBEDS CONTRACTS (JOB 064)
// ==============================================================================

export type PoligramEmbedWidgetType =
  | 'constituency'
  | 'delimitation'
  | 'election'
  | 'candidate'
  | 'issue'
  | 'live'
  | 'short';

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
    activationRatePercent: number;
  };
  retention: {
    dau: number;
    wau: number;
    mau: number;
    stickinessRatioPercent: number;
    day7RetentionRatePercent: number;
    day30RetentionRatePercent: number;
  };
  engagement: {
    totalSessions: number;
    avgSessionDurationSeconds: number;
    avgInteractionsPerSession: number;
    totalCivicInteractions: number;
  };
  geographyDensity: {
    totalConstituencies: number;
    activeConstituencies: number;
    penetrationPercentage: number;
    topActiveConstituencies: Array<{
      acId: string;
      name: string;
      activeUsers: number;
      eventCount: number;
    }>;
  };
  revenue: {
    b2bSubscriptionMrrINR: number;
    adRevenueINR: number;
    totalPrepaidBalancesINR: number;
    arpuINR: number;
  };
  generatedAt: string;
}
