/**
 * packages/shared/src/types/spatialAnalytics.ts
 *
 * Milestone W017 — Spatial Gateway, Boundary Diff & Spatial Query Engine
 * Authoritative types for typed spatial selection, overlap, boundary diff, and anomaly detection.
 */

export type SpatialSelectionMode = 'current' | 'as_of' | 'version' | 'future' | 'scenario';

export interface SpatialSelectionCriteria {
  mode: SpatialSelectionMode;
  asOfDate?: string;       // Required if mode === 'as_of' (YYYY-MM-DD)
  versionId?: string;      // Required if mode === 'version' (UUID)
  scenarioId?: string;     // Required if mode === 'scenario' (UUID)
  futureRegimeId?: string; // Required if mode === 'future' (e.g. 'delimitation_post2026_draft')
}

export interface SpatialEntityReference {
  entityId: string; // Stable internal anchor mandals.id
  selection: SpatialSelectionCriteria;
}

export interface SpatialOverlapOptions {
  projection?: 'SPHEROIDAL_GEOGRAPHY' | 'PLANAR_UTM44N';
  planarSrid?: number;
  includeIntersectionGeoJson?: boolean;
}

export interface RegimeContext {
  isCrossRegime: boolean;
  baseSelection?: SpatialSelectionCriteria;
  comparisonSelection?: SpatialSelectionCriteria;
  warning?: string;
}

export interface SpatialOverlapResult {
  baseEntityAreaM2: number;
  comparisonEntityAreaM2: number;
  intersectionAreaM2: number;
  baseOverlapPercentage: number;
  comparisonOverlapPercentage: number;
  intersectionDimension: number;
  isDisjoint: boolean;
  regimeContext: RegimeContext;
  intersectionGeoJson?: Record<string, unknown> | null;
}

export interface SpatialBoundaryDiffOptions {
  toleranceMeters?: number;
  includeDiffGeoJson?: boolean;
}

export interface SpatialBoundaryDiffResult {
  entityId: string;
  sourceAreaM2: number;
  targetAreaM2: number;
  netAreaChangeM2: number;
  addedAreaM2: number;
  removedAreaM2: number;
  unmodifiedAreaM2: number;
  similarityIndex: number;
  regimeContext: RegimeContext;
  addedGeoJson?: Record<string, unknown> | null;
  removedGeoJson?: Record<string, unknown> | null;
}

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type AnomalyType = 'INTERNAL_OVERLAP' | 'INVALID_GEOMETRY' | 'SLIVER_POLYGON';

export interface SpatialAnomalyItem {
  type: AnomalyType;
  entityAId: string;
  entityBId?: string | null;
  anomalyAreaM2: number;
  severity: AnomalySeverity;
  centroid?: [number, number] | null;
  diagnosticDetails: Record<string, unknown>;
  actionRequired?: string;
}

export interface SpatialAnomalyReport {
  layer: string;
  profile: string;
  scannedFeatureCount: number;
  anomalyCount: number;
  anomalies: SpatialAnomalyItem[];
  governanceNotice: string;
}
