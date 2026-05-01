/**
 * Delimitation Engine types — Boundary redrawing, census data, simulations, impact analysis.
 * Mirrors the Supabase schema from 011_delimitation.sql.
 *
 * India's delimitation exercise (post-Census 2026) will redraw every constituency.
 * These types power: prediction engine, monitoring pipeline, impact calculator, citizen tools.
 */

// ─── ENUMS ───

export type DelimitationStatus =
  | 'pre_census'         // Census not yet conducted
  | 'census_underway'    // Census data collection in progress
  | 'census_published'   // Census results published, commission not yet formed
  | 'commission_formed'  // Delimitation Commission constituted
  | 'draft_published'    // Draft proposals published for public feedback
  | 'objections_period'  // Public objection/feedback window open
  | 'final_notified'     // Final gazette notification issued
  | 'implemented';       // ECI has adopted new boundaries for elections

export type DelimitationEventType =
  | 'census_notification'
  | 'census_data_release'
  | 'commission_formation'
  | 'commission_meeting'
  | 'draft_proposal'
  | 'public_hearing'
  | 'objection_filed'
  | 'gazette_notification'
  | 'eci_implementation'
  | 'court_order'
  | 'parliamentary_debate'
  | 'media_report'
  | 'rti_response'
  | 'expert_analysis';

export type BoundaryChangeType =
  | 'unchanged'      // Constituency boundaries remain the same
  | 'minor_adjust'   // Small boundary tweaks (ward-level)
  | 'major_redraw'   // Significant boundary changes
  | 'split'          // Constituency split into 2+
  | 'merged'         // Two+ constituencies merged
  | 'new'            // Entirely new constituency
  | 'abolished';     // Constituency no longer exists

export type ReservationChange =
  | 'gen_to_sc'
  | 'gen_to_st'
  | 'sc_to_gen'
  | 'sc_to_st'
  | 'st_to_gen'
  | 'st_to_sc'
  | 'unchanged';

export type ImpactSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type MonitorSource =
  | 'gazette_of_india'
  | 'eci'
  | 'census_india'
  | 'parliament'
  | 'prs_legislative'
  | 'state_gazette'
  | 'survey_of_india'
  | 'rti_response'
  | 'media'
  | 'crowdsourced';

// ─── CORE INTERFACES ───

/** A delimitation proposal (draft or final) for a state */
export interface DelimitationProposal {
  id: string;
  stateCode: string;
  proposalNumber?: string;
  title: string;
  description?: string;
  status: 'draft' | 'final' | 'superseded' | 'rejected';
  commissionId?: string;

  // Seat changes
  currentSeats: number;
  proposedSeats: number;
  seatChange: number;

  // Reservation
  currentSCSeats: number;
  currentSTSeats: number;
  proposedSCSeats: number;
  proposedSTSeats: number;

  // Source
  gazetteUrl?: string;
  sourceUrl?: string;
  publishedAt?: string;
  objectionsDeadline?: string;

  createdAt: string;
  updatedAt: string;
}

/** A proposed new constituency under a delimitation proposal */
export interface ProposedConstituency {
  id: string;
  proposalId: string;
  stateCode: string;

  // New constituency details
  newAcNo: number;
  newName: string;
  newDistrictName: string;
  reservationType: 'GEN' | 'SC' | 'ST';
  proposedPopulation: number;
  proposedSCPopulation: number;
  proposedSTPopulation: number;
  deviationFromIdeal: number; // percentage deviation from ideal population per seat

  // Predecessor mapping
  predecessorAcNos: number[];         // old AC numbers that contribute to this
  predecessorOverlaps: number[];      // overlap % from each predecessor (parallel array)
  primaryPredecessorAcNo?: number;    // old AC with highest overlap

  // Computed
  changeType: BoundaryChangeType;
  reservationChange: ReservationChange;
}

/** Mapping from old constituency → new constituency (many-to-many) */
export interface ConstituencyMapping {
  id: string;
  proposalId: string;
  stateCode: string;
  oldAcNo: number;
  oldName: string;
  newAcNo: number;
  newName: string;
  overlapPercentage: number; // 0-100: what % of old AC goes into new AC
  populationTransferred: number;
  votersTransferred: number;
}

/** Ward/sub-district level population data (Census basis) */
export interface WardPopulation {
  id: string;
  stateCode: string;
  districtName: string;
  subDistrictName?: string; // tehsil/taluk/mandal
  wardName?: string;
  censusYear: number;

  totalPopulation: number;
  malePopulation: number;
  femalePopulation: number;
  scPopulation: number;
  stPopulation: number;
  literatePopulation: number;
  urbanPopulation: number;

  // Geographic
  areaKmSq?: number;
  latitude?: number;
  longitude?: number;

  // Current constituency (pre-delimitation)
  currentAcNo?: number;
  currentAcName?: string;
}

/** District-level population aggregate (used for seat calculation) */
export interface DistrictPopulation {
  stateCode: string;
  districtName: string;
  censusYear: number;
  totalPopulation: number;
  scPopulation: number;
  stPopulation: number;
  literatePopulation: number;
  urbanPopulation: number;
  areaKmSq: number;
  currentSeats: number;         // existing ACs in this district
  projectedPopulation2026?: number;
}

/** State-level population summary for seat allocation */
export interface StatePopulationSummary {
  stateCode: string;
  stateName: string;
  censusYear: number;
  totalPopulation: number;
  scPopulation: number;
  stPopulation: number;
  scPercentage: number;
  stPercentage: number;
  literacyRate: number;
  urbanPercentage: number;
  currentAssemblySeats: number;
  currentLokSabhaSeats: number;
  projectedSeats?: number;        // based on equal-population principle
  projectedLokSabhaSeats?: number;
  populationPerSeat: number;
  idealPopulationPerSeat?: number; // national average
  deviationFromIdeal: number;     // % above/below national average
  districts: DistrictPopulation[];
}

/** A delimitation event in the timeline */
export interface DelimitationEvent {
  id: string;
  eventType: DelimitationEventType;
  title: string;
  description: string;
  date: string;
  stateCode?: string; // null = national-level event
  source: MonitorSource;
  sourceUrl?: string;
  isVerified: boolean;
  significance: ImpactSeverity;
  relatedProposalId?: string;
}

/** Citizen impact record — what changes for a specific location */
export interface CitizenImpact {
  pinCode: string;
  latitude?: number;
  longitude?: number;
  stateCode: string;
  districtName: string;

  // Current
  currentAcNo: number;
  currentAcName: string;
  currentMLA?: string;
  currentParty?: string;
  currentReservation: 'GEN' | 'SC' | 'ST';

  // Proposed
  proposedAcNo?: number;
  proposedAcName?: string;
  proposedReservation?: 'GEN' | 'SC' | 'ST';

  // Change summary
  changeType: BoundaryChangeType;
  reservationChange: ReservationChange;
  impactSeverity: ImpactSeverity;
  impactSummary: string;
}

/** Political impact on sitting MLA */
export interface MLAImpact {
  mlaName: string;
  party: string;
  currentAcNo: number;
  currentAcName: string;
  stateCode: string;

  // What happens to their seat
  seatChangeType: BoundaryChangeType;
  reservationChange: ReservationChange;
  primaryNewAcNo?: number;
  primaryNewAcName?: string;

  // Electoral viability
  currentMargin: number;
  currentMarginPercent: number;
  estimatedNewMargin?: number;       // projected based on ward-level voting patterns
  estimatedViabilityScore?: number;  // 0-100

  // Risk factors
  impactSeverity: ImpactSeverity;
  riskFactors: string[];
  opportunities: string[];
}

/** Party impact summary for a state */
export interface PartyDelimitationImpact {
  party: string;
  stateCode: string;

  currentSeats: number;
  projectedSeats: number;        // seats estimated under new boundaries
  seatChange: number;

  safeSeatsCurrent: number;
  safeSeatsProjected: number;

  affectedMLAs: number;          // MLAs whose boundaries change significantly
  atRiskMLAs: number;            // MLAs who may lose viability

  gainConstituencies: string[];  // new ACs likely favorable
  loseConstituencies: string[];  // current ACs where party weakens
}

/** Seat calculation result for a state */
export interface SeatAllocation {
  stateCode: string;
  stateName: string;
  censusYear: number;
  totalPopulation: number;
  idealPopulationPerSeat: number; // national average
  currentSeats: number;
  projectedSeats: number;
  seatChange: number;
  populationPerProjectedSeat: number;
  deviationPercent: number;
  reservedSC: number;
  reservedST: number;
  general: number;
}

// ─── CONFIGS ───

export const DELIMITATION_STATUS_CONFIG: Record<DelimitationStatus, { label: string; color: string; icon: string }> = {
  pre_census: { label: 'Pre-Census', color: '#6B7280', icon: 'time' },
  census_underway: { label: 'Census Underway', color: '#3B82F6', icon: 'clipboard' },
  census_published: { label: 'Census Published', color: '#8B5CF6', icon: 'document-text' },
  commission_formed: { label: 'Commission Formed', color: '#F59E0B', icon: 'people' },
  draft_published: { label: 'Draft Published', color: '#F97316', icon: 'map' },
  objections_period: { label: 'Objections Open', color: '#EF4444', icon: 'chatbubbles' },
  final_notified: { label: 'Final Notified', color: '#10B981', icon: 'checkmark-done' },
  implemented: { label: 'Implemented', color: '#059669', icon: 'flag' },
};

export const EVENT_TYPE_CONFIG: Record<DelimitationEventType, { label: string; icon: string; color: string }> = {
  census_notification: { label: 'Census Notification', icon: 'newspaper', color: '#3B82F6' },
  census_data_release: { label: 'Census Data Release', icon: 'bar-chart', color: '#8B5CF6' },
  commission_formation: { label: 'Commission Formed', icon: 'people', color: '#F59E0B' },
  commission_meeting: { label: 'Commission Meeting', icon: 'calendar', color: '#6B7280' },
  draft_proposal: { label: 'Draft Proposal', icon: 'map', color: '#F97316' },
  public_hearing: { label: 'Public Hearing', icon: 'mic', color: '#EC4899' },
  objection_filed: { label: 'Objection Filed', icon: 'alert-circle', color: '#EF4444' },
  gazette_notification: { label: 'Gazette Notification', icon: 'document-text', color: '#10B981' },
  eci_implementation: { label: 'ECI Implementation', icon: 'flag', color: '#059669' },
  court_order: { label: 'Court Order', icon: 'briefcase', color: '#DC2626' },
  parliamentary_debate: { label: 'Parliamentary Debate', icon: 'chatbubbles', color: '#7C3AED' },
  media_report: { label: 'Media Report', icon: 'newspaper', color: '#6B7280' },
  rti_response: { label: 'RTI Response', icon: 'mail-open', color: '#06B6D4' },
  expert_analysis: { label: 'Expert Analysis', icon: 'analytics', color: '#14B8A6' },
};

export const BOUNDARY_CHANGE_CONFIG: Record<BoundaryChangeType, { label: string; color: string; icon: string }> = {
  unchanged: { label: 'Unchanged', color: '#6B7280', icon: 'remove' },
  minor_adjust: { label: 'Minor Adjustment', color: '#3B82F6', icon: 'resize' },
  major_redraw: { label: 'Major Redraw', color: '#F59E0B', icon: 'shuffle' },
  split: { label: 'Split', color: '#F97316', icon: 'git-branch' },
  merged: { label: 'Merged', color: '#8B5CF6', icon: 'git-merge' },
  new: { label: 'New Constituency', color: '#10B981', icon: 'add-circle' },
  abolished: { label: 'Abolished', color: '#EF4444', icon: 'close-circle' },
};

export const IMPACT_SEVERITY_CONFIG: Record<ImpactSeverity, { label: string; color: string }> = {
  none: { label: 'No Impact', color: '#6B7280' },
  low: { label: 'Low Impact', color: '#3B82F6' },
  medium: { label: 'Medium Impact', color: '#F59E0B' },
  high: { label: 'High Impact', color: '#F97316' },
  critical: { label: 'Critical Impact', color: '#EF4444' },
};

export const MONITOR_SOURCE_CONFIG: Record<MonitorSource, { label: string; icon: string; reliability: number }> = {
  gazette_of_india: { label: 'Gazette of India', icon: 'document-text', reliability: 100 },
  eci: { label: 'Election Commission', icon: 'shield-checkmark', reliability: 100 },
  census_india: { label: 'Census of India', icon: 'bar-chart', reliability: 100 },
  parliament: { label: 'Parliament Proceedings', icon: 'business', reliability: 95 },
  prs_legislative: { label: 'PRS Legislative Research', icon: 'analytics', reliability: 90 },
  state_gazette: { label: 'State Gazette', icon: 'document', reliability: 95 },
  survey_of_india: { label: 'Survey of India', icon: 'map', reliability: 100 },
  rti_response: { label: 'RTI Response', icon: 'mail-open', reliability: 90 },
  media: { label: 'Media Report', icon: 'newspaper', reliability: 60 },
  crowdsourced: { label: 'Citizen Report', icon: 'people', reliability: 40 },
};

// ─── CONSTANTS ───

/** Current national average population per Lok Sabha seat (Census 2011) */
export const NATIONAL_AVG_POP_PER_LS_SEAT = 2_251_103; // ~1.21B / 543 seats (excl. nominated)

/** Current national average population per assembly seat (rough) */
export const NATIONAL_AVG_POP_PER_AC_SEAT = 325_000; // approximate mean

/** Constitutional deviation tolerance for constituency populations */
export const MAX_POPULATION_DEVIATION_PERCENT = 10;

/** Minimum SC/ST population percentage to qualify for reservation */
export const SC_RESERVATION_THRESHOLD_PERCENT = 15;
export const ST_RESERVATION_THRESHOLD_PERCENT = 10;

// ─── UTILITY FUNCTIONS ───

/** Format population number in readable form (Indian numbering) */
export function formatPopulation(pop: number): string {
  if (pop >= 1_00_00_000) return `${(pop / 1_00_00_000).toFixed(2)} Cr`;
  if (pop >= 1_00_000) return `${(pop / 1_00_000).toFixed(2)} L`;
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(1)}K`;
  return `${pop}`;
}

/** Calculate ideal population per seat for a state */
export function calculateIdealPopPerSeat(totalPopulation: number, totalSeats: number): number {
  if (totalSeats <= 0) return 0;
  return Math.round(totalPopulation / totalSeats);
}

/** Calculate projected seats for a state based on equal-population principle */
export function projectSeats(statePopulation: number, idealPopPerSeat: number): number {
  if (idealPopPerSeat <= 0) return 0;
  return Math.round(statePopulation / idealPopPerSeat);
}

/** Calculate deviation of actual pop/seat from ideal */
export function calculateDeviation(actualPopPerSeat: number, idealPopPerSeat: number): number {
  if (idealPopPerSeat <= 0) return 0;
  return ((actualPopPerSeat - idealPopPerSeat) / idealPopPerSeat) * 100;
}

/** Determine impact severity based on change magnitude */
export function determineImpactSeverity(
  changeType: BoundaryChangeType,
  reservationChange: ReservationChange,
): ImpactSeverity {
  if (changeType === 'unchanged' && reservationChange === 'unchanged') return 'none';
  if (changeType === 'abolished' || changeType === 'new') return 'critical';
  if (changeType === 'split' || changeType === 'merged') return 'high';
  if (reservationChange !== 'unchanged') return 'high';
  if (changeType === 'major_redraw') return 'medium';
  if (changeType === 'minor_adjust') return 'low';
  return 'low';
}

/** Calculate SC reserved seats for a state */
export function calculateSCReservedSeats(
  totalSeats: number,
  scPopulation: number,
  totalPopulation: number,
): number {
  if (totalPopulation <= 0) return 0;
  const scPercent = (scPopulation / totalPopulation) * 100;
  return Math.round((scPercent / 100) * totalSeats);
}

/** Calculate ST reserved seats for a state */
export function calculateSTReservedSeats(
  totalSeats: number,
  stPopulation: number,
  totalPopulation: number,
): number {
  if (totalPopulation <= 0) return 0;
  const stPercent = (stPopulation / totalPopulation) * 100;
  return Math.round((stPercent / 100) * totalSeats);
}

/** Compute seat allocation for a state given census data */
export function computeSeatAllocation(
  summary: StatePopulationSummary,
  nationalIdealPopPerSeat: number,
): SeatAllocation {
  const projectedSeats = projectSeats(summary.totalPopulation, nationalIdealPopPerSeat);
  const scSeats = calculateSCReservedSeats(projectedSeats, summary.scPopulation, summary.totalPopulation);
  const stSeats = calculateSTReservedSeats(projectedSeats, summary.stPopulation, summary.totalPopulation);
  const genSeats = projectedSeats - scSeats - stSeats;
  const popPerSeat = projectedSeats > 0 ? Math.round(summary.totalPopulation / projectedSeats) : 0;
  const deviation = calculateDeviation(popPerSeat, nationalIdealPopPerSeat);

  return {
    stateCode: summary.stateCode,
    stateName: summary.stateName,
    censusYear: summary.censusYear,
    totalPopulation: summary.totalPopulation,
    idealPopulationPerSeat: nationalIdealPopPerSeat,
    currentSeats: summary.currentAssemblySeats,
    projectedSeats,
    seatChange: projectedSeats - summary.currentAssemblySeats,
    populationPerProjectedSeat: popPerSeat,
    deviationPercent: deviation,
    reservedSC: scSeats,
    reservedST: stSeats,
    general: genSeats,
  };
}

/** Build impact summary string for a citizen */
export function buildCitizenImpactSummary(impact: CitizenImpact): string {
  const parts: string[] = [];

  switch (impact.changeType) {
    case 'unchanged':
      parts.push('Your constituency boundaries remain the same.');
      break;
    case 'minor_adjust':
      parts.push(`Your constituency has minor boundary adjustments. You remain in ${impact.proposedAcName ?? impact.currentAcName}.`);
      break;
    case 'major_redraw':
      parts.push(`Your area is being redrawn. You move from ${impact.currentAcName} to ${impact.proposedAcName ?? 'a new constituency'}.`);
      break;
    case 'split':
      parts.push(`${impact.currentAcName} is being split. Your area goes to ${impact.proposedAcName ?? 'a new constituency'}.`);
      break;
    case 'merged':
      parts.push(`${impact.currentAcName} is being merged into ${impact.proposedAcName ?? 'another constituency'}.`);
      break;
    case 'new':
      parts.push(`You are in an entirely new constituency: ${impact.proposedAcName ?? 'TBD'}.`);
      break;
    case 'abolished':
      parts.push(`${impact.currentAcName} is being abolished. You will be assigned to a new constituency.`);
      break;
  }

  if (impact.reservationChange !== 'unchanged') {
    const from = impact.currentReservation;
    const to = impact.proposedReservation ?? 'TBD';
    parts.push(`Reservation changes from ${from} to ${to}.`);
  }

  return parts.join(' ');
}
