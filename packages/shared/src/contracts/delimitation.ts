/**
 * Canonical Delimitation API Contracts & Response Envelopes
 * Master Execution Track — Job W020-G5
 * Specification: PLAN-W020-G5-REV-1.2.md
 */

import type { ApiSuccessEnvelope, ApiErrorEnvelope } from './envelopes';

// ─── ORTHOGONAL TAXONOMY DIMENSIONS (Directive G5-17) ───

/**
 * Dimension A: G5 Output / Calculation Classification
 * Represents the computational and legal nature of the analytical output.
 */
export type OutputClassification =
  | 'STATUTORY_FACT'            // Enacted legal orders, gazette notices, statutory seat counts
  | 'DETERMINISTIC_DERIVED'     // Computed via deterministic mathematical formulas from official figures
  | 'STATUTORY_BENCHMARK'       // Historical baselines verified against official commission orders
  | 'SCENARIO_PROJECTION'       // Hypothetical research models and user-defined simulations
  | 'GEOGRAPHIC_APPROXIMATION'  // Spatial heuristics, PIN code centroid lookups
  | 'POLITICAL_HEURISTIC'       // Incumbent vulnerability heuristics, swing models
  | 'UNKNOWN_UNAVAILABLE';      // Data or projection mathematically or legally unresolvable

/**
 * Dimension B: Canonical W012 Data Status
 * Represents the data governance, auditability, and verification state.
 */
export type W012DataStatus =
  | 'OFFICIAL'                  // Primary gazetted statutory authority
  | 'DERIVED'                   // Deterministically derived from official data
  | 'VERIFIED'                  // Audited and corroborated against external source
  | 'SCENARIO'                  // Unenacted scenario projection
  | 'ESTIMATE'                  // Approximate statistical or spatial estimate
  | 'INFERRED'                  // Heuristically inferred analytical attribute
  | 'UNVERIFIED'                // Raw input pending authoritative corroboration
  | 'UNKNOWN';                  // Missing, withheld, or pending statutory operation

/**
 * Canonical W014 Legal Regimes (Migration 041)
 * Exactly four canonical legal regimes exist in the PANIN schema.
 * Do NOT introduce SIMULATION_PROPOSED, SIMULATION_PROPOSED_REGIME, or other ad-hoc values.
 */
export type DelimitationLegalRegime =
  | 'HISTORICAL_LEGAL_REGIME'
  | 'CURRENT_LEGAL_REGIME'
  | 'FUTURE_ANTICIPATED_REGIME'
  | 'SCENARIO_PROPOSED_REGIME';

/**
 * Typed Regime Selection Modes (Directive G5-12)
 */
export type RegimeSelectionMode =
  | 'CURRENT'                   // Latest in-force statutory regime
  | 'AS_OF'                     // Statutory regime in force on specified ISO date
  | 'EXPLICIT_VERSION'          // Explicitly requested regime identifier
  | 'FUTURE_ANTICIPATED'        // Prospective constitutional post-freeze regime
  | 'SCENARIO';                 // User-defined hypothetical research model

// ─── PROVENANCE INTERFACES (Directives G5-07, G5-13, G5-18) ───

export interface DatasetVersionProvenance {
  datasetId: string;
  versionTag: string;
  sourceAuthority: string;
  publicationDate: string;
  checksum?: string;
}

export interface MathematicalProvenance {
  inputDatasetVersions: DatasetVersionProvenance[];
  geographyVersion?: string;
  constituencyVersion?: string;
  methodology: string;
  modelVersion: string;
  calculatedAt: string;
  legalStatus: DelimitationLegalRegime;
  outputClassification: OutputClassification;
  dataStatus: W012DataStatus;
  provenanceId?: string;
  evidenceReferences?: string[];
}

/**
 * Mandatory Scenario Enclosure (Directives G5-08, G5-13, R2)
 * Enforces the 10 required metadata fields.
 * isScenario is strictly derived at runtime from (legalStatus === 'SCENARIO_PROPOSED_REGIME').
 * Zero client-supplied or persisted isScenario boolean.
 */
export interface ScenarioEnclosure<T = unknown> {
  isScenario: boolean;
  scenarioId: string;
  scenarioName: string;
  scenarioAuthor: string;
  scenarioDescription: string;
  statutoryBasisDisclaimer: string;
  hypotheticalParameters: Record<string, unknown>;
  baselineDatasetVersion: string;
  modelType: string;
  createdAt: string;
  provenance: MathematicalProvenance;
  data: T;
}

// ─── CORE DOMAIN DATA STRUCTURES ───

export interface DynamicSeatProjection {
  stateCode: string;
  stateName: string;
  currentSeats: number;
  projectedSeats: number;
  seatChange: number;
  population: number;
  popPerSeat: number;
  reservedSC: number;
  reservedST: number;
  general: number;
  deviationPercent: number;
  outputClassification: OutputClassification;
  dataStatus: W012DataStatus;
}

export interface DelimitationProjectionsDTO {
  censusYear: number;
  model: string;
  methodology: string;
  disclaimer: string;
  summary: {
    statesAnalyzed: number;
    totalCurrentSeats: number;
    totalProjectedSeats: number;
    totalGained: number;
    totalLost: number;
    biggestGainer?: string;
    biggestLoser?: string;
  };
  projections: DynamicSeatProjection[];
  provenance: MathematicalProvenance;
}

export interface SingleStateProjectionDTO {
  projection: DynamicSeatProjection;
  provenance: MathematicalProvenance;
}

export interface TimelineEventItem {
  id: string;
  date: string;
  title: string;
  significance: 'critical' | 'high' | 'medium' | 'informational';
  verified: boolean;
  instrument?: string;
  authority?: string;
  description?: string;
}

export interface DelimitationTimelineDTO {
  status: string;
  totalEvents: number;
  verifiedEvents: number;
  latestEvent: {
    title: string;
    date: string;
    type: string;
    verified: boolean;
    source: string;
  };
  events: TimelineEventItem[];
  provenance: MathematicalProvenance;
}

export interface DelimitationStatusDTO {
  nationalStatus: string;
  statusLabel: string;
  description: string;
  constitutionalFramework: string;
  nextMilestone: string;
  censusTracking: {
    constitutionalTrigger: string;
    currentExpectedCensusOperation: string;
    paninFutureAnticipatedRegime: string;
    finalPopulationAvailable: boolean;
  };
  lastUpdated: string;
  provenance: MathematicalProvenance;
}

export interface GainerLoserItem {
  stateCode: string;
  stateName: string;
  change: string;
  current: number;
  projected: number;
}

export interface GainersLosersDTO {
  gainers: GainerLoserItem[];
  losers: GainerLoserItem[];
  provenance: MathematicalProvenance;
}

export interface CitizenImpactDTO {
  available: boolean;
  status: string;
  pinCode: string;
  location: {
    stateCode: string;
    stateName: string;
    district: string;
    region: string;
  };
  currentConstituency: {
    acNo: number;
    name: string;
    sittingMLA: string;
    party: string;
    reservation: 'GEN' | 'SC' | 'ST';
  };
  proposedConstituency: {
    acNo: number;
    name: string;
    reservation: 'GEN' | 'SC' | 'ST';
  };
  impactAnalysis: {
    changeType: string;
    reservationChange: string;
    impactSeverity: string;
    votersRetainedPercent: number;
    explanation: string;
    spatialCaveat: string;
  };
  provenance: MathematicalProvenance;
}

export interface DistrictSimulationAllocation {
  districtName: string;
  population: number;
  projectedSeats: number;
  populationPerSeat: number;
  deviationPercent: number;
  scReserved: number;
  stReserved: number;
  general: number;
}

export interface BoundarySimulationDTO {
  stateCode: string;
  stateName: string;
  mode: string;
  targetSeats: number;
  currentSeats: number;
  seatChange: number;
  population: number;
  populationPerSeat: number;
  reservation: {
    scReserved: number;
    stReserved: number;
    general: number;
  };
  qualityScore: number;
  districtBreakdown: DistrictSimulationAllocation[];
  methodology: {
    formula: string;
    idealPopPerSeat: number;
    maxDeviationAllowedPercent: number;
    withinDeviationCount: number;
  };
  scenarioEnclosure: ScenarioEnclosure<unknown>;
}

export interface ReservationStateProfile {
  stateCode: string;
  stateName: string;
  currentSeats: number;
  projectedSeats: number;
  scReserved: number;
  stReserved: number;
  general: number;
  scPercent: number;
  stPercent: number;
}

export interface NationalReservationDTO {
  summary: {
    totalSCReserved: number;
    totalSTReserved: number;
    totalGeneral: number;
    totalSeats: number;
  };
  topSCStates: ReservationStateProfile[];
  topSTStates: ReservationStateProfile[];
  profiles: ReservationStateProfile[];
  provenance: MathematicalProvenance;
}

export interface StatutoryReservationBaseline {
  total: number;
  scReserved: number;
  stReserved: number;
  general: number;
  source: string;
  censusBasis: string;
  outputClassification: 'STATUTORY_FACT';
  dataStatus: 'OFFICIAL';
}

export interface Article332DerivationDetail {
  total: number;
  scReserved: number;
  stReserved: number;
  general: number;
  quotaSC: number;
  quotaST: number;
  remainderSC: number;
  remainderST: number;
  surplusSeatsDistributed: number;
  censusBasis: string;
  methodology: string;
  outputClassification: 'DETERMINISTIC_DERIVED';
  dataStatus: 'DERIVED';
  disclaimer: string;
}

export interface StateReservationDetailDTO {
  stateCode: string;
  stateName: string;
  current: StatutoryReservationBaseline;
  census2011MathematicalDerivation: Article332DerivationDetail;
  projected: {
    total: number;
    scReserved: number;
    stReserved: number;
    general: number;
  };
  change: {
    scChange: number;
    stChange: number;
  };
  provenance: MathematicalProvenance;
}

export interface StateComparisonDTO {
  comparison: DynamicSeatProjection[];
  statesCompared: number;
  provenance: MathematicalProvenance;
}

export interface MlaProfileRiskItem {
  mlaName: string;
  party: string;
  currentAcNo: number;
  currentAcName: string;
  stateCode: string;
  seatChangeType: string;
  riskScore: number;
  riskRating: 'critical_risk' | 'high_risk' | 'moderate_risk' | 'safe';
  currentMarginVotes: number;
  currentMarginPercent: number;
}

export interface MlaImpactDTO {
  stateCode: string;
  totalMLAsAnalyzed: number;
  highRiskCount: number;
  safeCount: number;
  mlaProfiles: MlaProfileRiskItem[];
  provenance: MathematicalProvenance;
}

export interface PartySeatProjectionItem {
  party: string;
  currentSeats: number;
  projectedSeats: number;
  seatChange: number;
}

export interface PartyProjectionsDTO {
  stateCode: string;
  stateName: string;
  currentAssemblySeats: number;
  projectedAssemblySeats: number;
  parties: PartySeatProjectionItem[];
  provenance: MathematicalProvenance;
}

export interface DelimitationMethodologyDTO {
  title: string;
  computationalSafetyPolicy: {
    maxSafeRequestedSeats: number;
    statement: string;
  };
  constitutionalArticles: Array<{
    article: string;
    title: string;
    description: string;
  }>;
  formulas: {
    idealPopulation: string;
    deviation: string;
    hareNiemeyer: string;
    article332Algorithm: string;
  };
  provenance: MathematicalProvenance;
}

export interface MonitorWebhookEntry {
  id: string;
  title: string;
  date: string;
  relevanceScore?: number;
}

export interface MonitorWebhookPayloadDTO {
  type: string;
  entries: MonitorWebhookEntry[];
  timestamp?: string;
}

export interface MonitorWebhookResponseDTO {
  received: true;
  processed: number;
  highRelevance: number;
  timestamp: string;
}

// ─── STANDARDIZED API ENVELOPE TYPES ───

export type DelimitationProjectionsResponse = ApiSuccessEnvelope<DelimitationProjectionsDTO>;
export type SingleStateProjectionResponse = ApiSuccessEnvelope<SingleStateProjectionDTO>;
export type DelimitationTimelineResponse = ApiSuccessEnvelope<DelimitationTimelineDTO>;
export type DelimitationStatusResponse = ApiSuccessEnvelope<DelimitationStatusDTO>;
export type GainersLosersResponse = ApiSuccessEnvelope<GainersLosersDTO>;
export type CitizenImpactResponse = ApiSuccessEnvelope<CitizenImpactDTO>;
export type BoundarySimulationResponse = ApiSuccessEnvelope<BoundarySimulationDTO>;
export type NationalReservationResponse = ApiSuccessEnvelope<NationalReservationDTO>;
export type StateReservationDetailResponse = ApiSuccessEnvelope<StateReservationDetailDTO>;
export type StateComparisonResponse = ApiSuccessEnvelope<StateComparisonDTO>;
export type MlaImpactResponse = ApiSuccessEnvelope<MlaImpactDTO>;
export type PartyProjectionsResponse = ApiSuccessEnvelope<PartyProjectionsDTO>;
export type DelimitationMethodologyResponse = ApiSuccessEnvelope<DelimitationMethodologyDTO>;
export type MonitorWebhookResponse = ApiSuccessEnvelope<MonitorWebhookResponseDTO>;

// ─── W020-G7 CANONICAL QUERY SURFACE & TYPED REGIME SELECTION (PLAN-W020-G7-REV-1.1) ───

export type TypedRegimeSelectionMode =
  | 'current'
  | 'as_of'
  | 'explicit'
  | 'future_anticipated'
  | 'scenario';

export type ScenarioSelector =
  | { type: 'proposal_id'; proposalId: string }
  | { type: 'regime_id'; regimeId: string };

export type RegimeSelectionQuery =
  | { mode: 'current' }
  | { mode: 'as_of'; date: string }
  | { mode: 'explicit'; regimeId: string }
  | { mode: 'future_anticipated' }
  | { mode: 'scenario'; selector: ScenarioSelector };

export interface DelimitationRegimeRecord {
  id: string;
  name: string;
  regimeType: DelimitationLegalRegime;
  description: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  authority: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DelimitationProposalRecord {
  id: string;
  stateCode: string;
  title: string;
  description: string;
  currentSeats: number;
  proposedSeats: number;
  seatChange: number;
  reservedScSeats: number;
  reservedStSeats: number;
  generalSeats: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'final';
  outputClassification: OutputClassification;
  dataStatus: W012DataStatus;
  legalStatus: DelimitationLegalRegime;
  isScenario: boolean; // Strictly derived at runtime: (legalStatus === 'SCENARIO_PROPOSED_REGIME')
  regimeId: string | null;
  provenanceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConstituencyMappingRecord {
  id: string;
  predecessorConstituencyVersionId: string;
  successorConstituencyVersionId: string;
  relationshipType: string;
  effectiveDate: string;
  source: string;
  evidence: string;
  provenanceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ConstituencyLineageClaim {
  constituencyCode: string;
  constituencyName: string;
  lineageStatus: 'UNKNOWN';
  statutoryTransferCitation: string;
  mappingCount: number;
  evidenceNote: string;
}

export interface ProvenanceDetailRecord {
  id: string;
  sourceAuthority: string;
  methodology: string;
  citation: string;
  verificationNotes?: string;
  metadata: Record<string, unknown>;
}

export interface ResolvedRegimeResult {
  regime: DelimitationRegimeRecord;
  proposals: DelimitationProposalRecord[];
  provenance: ProvenanceDetailRecord | null;
  isScenario: boolean; // Derived strictly: (regime.regimeType === 'SCENARIO_PROPOSED_REGIME')
}

export type DelimitationRegimesResponse = ApiSuccessEnvelope<DelimitationRegimeRecord[]>;
export type DelimitationProposalsResponse = ApiSuccessEnvelope<DelimitationProposalRecord[]>;
export type SingleProposalResponse = ApiSuccessEnvelope<{
  proposal: DelimitationProposalRecord;
  provenance: ProvenanceDetailRecord | null;
}>;
export type ConstituencyMappingResponse = ApiSuccessEnvelope<{
  mappings: ConstituencyMappingRecord[];
  claims: ConstituencyLineageClaim[];
  count: number;
}>;
export type ConstituencyLineageResponse = ApiSuccessEnvelope<ConstituencyLineageClaim>;
export type ResolvedRegimeResponse = ApiSuccessEnvelope<ResolvedRegimeResult>;
