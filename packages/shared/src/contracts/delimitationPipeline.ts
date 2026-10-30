/**
 * Delimitation Source Pipeline Contracts (JOB 076)
 *
 * Geographic boundary revision pipeline with automated topological integrity auditing:
 * - PostGIS spatial validation (ST_IsValid, ST_Overlaps, ST_Covers).
 * - Area delta computation in square kilometers.
 * - Centroid displacement vectors in meters.
 * - Polling station and voter reallocation crosswalk estimation.
 */

export interface DelimitationBoundaryDelta {
  constituencyId: string;
  constituencyName: string;
  previousAreaKm2: number;
  newAreaKm2: number;
  areaDeltaKm2: number;
  percentAreaChange: number;
  centroidShiftMeters: number;
  voterReassignmentEstimate: number;
}

export interface DelimitationTopologyCheckResult {
  isValid: boolean;
  selfIntersectionsCount: number;
  overlapsCount: number;
  sliversCount: number;
  isContainedInParentState: boolean;
  issues: string[];
}

export interface DelimitationImpactReport {
  revisionId: string;
  orderNumber: string;
  gazetteDate: string;
  stateCode: string;
  constituencyCount: number;
  totalAreaDeltaKm2: number;
  centroidShiftMetersMax: number;
  voterShiftEstimate: number;
  topologyValid: boolean;
  topologyAudit: DelimitationTopologyCheckResult;
  boundaryDeltas: DelimitationBoundaryDelta[];
  generatedAt: string;
}

export interface DelimitationRevisionSubmission {
  orderNumber: string;
  gazetteDate: string;
  stateCode: string;
  boundaries: Array<{
    constituencyId: string;
    constituencyName: string;
    geojsonGeometry: Record<string, unknown>;
    previousAreaKm2?: number;
    estimatedVoters?: number;
  }>;
}
