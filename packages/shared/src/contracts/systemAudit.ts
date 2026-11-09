/**
 * System Audit, Performance, Security, Spatial Topology & Disaster Recovery Contracts
 * Domain 10: Deep Testing, Security Audits & Disaster Recovery (JOB 077 - JOB 085)
 * Authority: Master Product Blueprint, Amendment v1.6 Control M, DEC-203 & DEC-204
 */

// ============================================================================
// JOB 077: Low-End Android Performance Benchmarking
// ============================================================================

export interface DeviceHardwareProfile {
  cpuCores: number;
  cpuArchitecture: string; // e.g. 'arm64-v8a', 'cortex-a53'
  ramMb: number; // e.g. 2048 MB
  osVersion: string; // e.g. 'Android 10 (Go edition)'
  jsEngine: 'Hermes' | 'V8' | 'JSC';
  networkThrottleProfile?: '2G' | '3G' | '4G_POOR' | 'WIFI';
}

export interface PerformanceBenchmarkMetrics {
  coldStartupMs: number;
  coldStartupThresholdMs: number; // <= 2000ms
  warmStartupMs: number;
  warmStartupThresholdMs: number; // <= 800ms
  mapFps: number;
  mapFrameTimeP95Ms: number; // <= 16.6ms
  feedFps: number;
  feedFrameTimeP95Ms: number; // <= 16.6ms
  droppedFrameRatio: number; // <= 0.005 (0.5%)
  navigationLatencyP95Ms: number; // <= 100ms
  memoryPeakRssMb: number; // <= 120MB
  memoryGrowthOver15MinMb: number; // <= 5MB
}

export interface PerformanceBenchmarkReport {
  timestamp: string;
  environment:
    'in_engine_synthesizer' | 'low_end_android_emulator' | 'physical_device' | 'cloud_device_farm';
  deviceProfile: DeviceHardwareProfile;
  metrics: PerformanceBenchmarkMetrics;
  certified: boolean;
  violations: string[];
}

// Option B Provision: Cloud Device Farm Adapter
export interface CloudDeviceFarmConfig {
  provider: 'firebase_test_lab' | 'aws_device_farm' | 'browserstack';
  devicePool: Array<{
    manufacturer: string;
    model: string;
    osVersion: string;
    screenResolution: string;
  }>;
  apkPath: string;
  testRunner: string;
  maxExecutionTimeMinutes: number;
}

// ============================================================================
// JOB 078: Database Performance & N+1 Query Elimination
// ============================================================================

export interface DbQueryAuditEntry {
  queryName: string;
  sqlPattern: string;
  executionPlan: string;
  indexScanUsed: boolean;
  seqScanDetected: boolean;
  nPlusOneDetected: boolean;
  p50DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  slaTargetP95Ms: number; // e.g. 20ms
  slaCompliant: boolean;
  rowsExamined: number;
  bufferHits: number;
}

export interface DbPerformanceAuditReport {
  timestamp: string;
  datasetSize: {
    totalEntities: number;
    totalConstituencies: number;
    totalRepresentatives: number;
  };
  auditedQueries: DbQueryAuditEntry[];
  allSlasMet: boolean;
  nPlusOneQueriesCount: number; // Must be 0
}

// Option B Provision: In-Memory L2 Read Cache Fallback
export interface L2QueryCacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  maxEntries: number;
  evictionPolicy: 'LRU' | 'LFU';
}

// ============================================================================
// JOB 079: API Load Testing & Concurrency Latency Benchmarks
// ============================================================================

export interface ApiEndpointLoadBenchmark {
  endpoint: string;
  method: 'GET' | 'POST';
  concurrencyRps: number;
  durationSeconds: number;
  totalRequests: number;
  successfulRequests: number;
  rateLimited429Requests: number;
  error5xxRequests: number;
  errorRatePercent: number; // Must be 0.00%
  latency: {
    p50Ms: number; // Target < 50ms
    p95Ms: number; // Target < 150ms
    p99Ms: number; // Target < 300ms
    maxMs: number;
  };
  rateLimitHeadersVerified: boolean;
}

export interface ApiLoadTestReport {
  timestamp: string;
  totalDurationSeconds: number;
  peakConcurrentRps: number;
  endpoints: ApiEndpointLoadBenchmark[];
  overallPass: boolean;
  failureReasons: string[];
}

// Option B Provision: Lightweight Sequential Latency Benchmark
export interface SequentialLatencyBenchmark {
  endpoint: string;
  iterations: number;
  averageMs: number;
  minMs: number;
  maxMs: number;
  pass: boolean;
}

// ============================================================================
// JOB 080: Mobile App Size Regression Gate
// ============================================================================

export interface MobileArtifactSizes {
  universalApkBytes: number;
  universalApkCeilingBytes: number; // 45 * 1024 * 1024 (45 MB)
  aabBaseModuleBytes: number;
  aabCeilingBytes: number; // 25 * 1024 * 1024 (25 MB)
  hermesBundleBytes: number;
  hermesBundleCeilingBytes: number; // 25 * 1024 * 1024 (25 MB)
  fontAssetsTotalBytes: number;
  fontAssetsCeilingBytes: number; // 10 * 1024 * 1024 (10 MB)
}

export interface MobileSizeDeltas {
  apkDeltaBytes: number;
  apkDeltaPercent: number;
  aabDeltaBytes: number;
  aabDeltaPercent: number;
  hermesDeltaBytes: number;
  hermesDeltaPercent: number;
}

export interface MobileSizeGateReport {
  timestamp: string;
  buildCommit: string;
  baselineTag: string;
  artifacts: MobileArtifactSizes;
  deltas: MobileSizeDeltas;
  regressionAllowed: boolean;
  overrideTokenPresent: boolean;
  gatePassed: boolean;
  reasons: string[];
}

// ============================================================================
// JOB 081: Security Final Audit & OWASP Top 10 Mitigation
// ============================================================================

export type SecurityVulnerabilityCategory =
  | 'BOLA_IDOR'
  | 'BROKEN_AUTHENTICATION'
  | 'BROKEN_OBJECT_PROPERTY_AUTH'
  | 'UNRESTRICTED_RESOURCE_CONSUMPTION'
  | 'BROKEN_FUNCTION_LEVEL_AUTH'
  | 'SSRF_HOST_PINNING'
  | 'SECURITY_MISCONFIGURATION'
  | 'INJECTION_SQL_NOSQL'
  | 'DPDP_PII_LEAKAGE';

export interface SecurityVulnerabilityProbe {
  category: SecurityVulnerabilityCategory;
  description: string;
  payloadTested: string;
  targetEndpoint: string;
  expectedStatus: number; // e.g. 401, 403, 400
  actualStatus: number;
  mitigationVerified: boolean;
  details: string;
}

export interface SecurityAuditReport {
  timestamp: string;
  auditorId: string;
  totalProbes: number;
  passedProbes: number;
  failedProbes: number;
  probes: SecurityVulnerabilityProbe[];
  overallPassed: boolean;
  owaspTop10Certified: boolean;
  dpdp2023Certified: boolean;
}

// ============================================================================
// JOB 082: Data Final Audit & Spatial Topology Certification
// ============================================================================

export interface SpatialTopologySummary {
  totalAssemblyConstituencies: number; // 4,123
  totalParliamentaryConstituencies: number; // 543
  totalDistricts: number;
  validGeometriesCount: number;
  invalidGeometriesCount: number; // Must be 0
  sliverPolygonsCount: number; // Must be 0 (< 100m²)
  crossBoundaryOverlapsCount: number; // Must be 0
  stateContainmentViolationsCount: number; // Must be 0
  srid4326CompliantCount: number;
  geometryTypeViolationsCount: number;
  invalidSridCount: number;
  assemblyBoundaryCoveragePercent: number;
  missingAssemblyBoundaries: number;
  pcBoundaryCoveragePercent: number;
  missingPcBoundaries: number;
  districtBoundaryCoveragePercent: number;
  missingDistrictBoundaries: number;
  statePolygonsAvailable: boolean;
  sourceProvenanceViolationsCount: number;
  stateCoverageGapCount: number;
  checksComplete: boolean;
  uncertifiedReasons: string[];
}

export interface SpatialTopologyViolation {
  entityType: 'STATE' | 'AC' | 'PC' | 'DISTRICT';
  entityId: string;
  name: string;
  violationType:
    | 'INVALID_GEOMETRY'
    | 'SLIVER'
    | 'OVERLAP'
    | 'CONTAINMENT_BREACH'
    | 'INVALID_SRID'
    | 'MISSING_GEOMETRY'
    | 'SOURCE_PROVENANCE_MISSING'
    | 'COVERAGE_GAP';
  details: string;
}

export interface SpatialTopologyAuditReport {
  auditId: string;
  timestamp: string;
  summary: SpatialTopologySummary;
  certified: boolean;
  failureLog: SpatialTopologyViolation[];
}

// Option B Provision: Targeted Bounding Box / Single-State Inspection
export interface TargetedSpatialInspectionQuery {
  scopeType: 'STATE' | 'BOUNDING_BOX' | 'CONSTITUENCY_PAIR';
  stateCode?: string;
  boundingBox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  constituencyIds?: [string, string];
}

// ============================================================================
// JOB 083: Automated Tag-to-Store Release Pipeline
// ============================================================================

export interface ReleasePipelineStageStatus {
  stageName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'SKIPPED';
  durationSeconds: number;
  details?: string;
}

export interface ReleasePipelineManifest {
  releaseTag: string; // e.g. 'v1.0.0'
  commitSha: string;
  timestamp: string;
  stages: ReleasePipelineStageStatus[];
  signing: {
    keystoreConfigured: boolean;
    signatureVerified: boolean;
    sha256Checksum: string;
  };
  fastlane: {
    metadataPath: string;
    trackTarget: 'internal' | 'alpha' | 'beta' | 'production';
    localesValidated: string[]; // 13 Indic locales
  };
  pipelinePassed: boolean;
}

// ============================================================================
// JOB 084: Production Rollback Test & Zero Data Loss
// ============================================================================

export interface RollbackExerciseReport {
  timestamp: string;
  fromVersion: string;
  targetVersion: string;
  migrationRollbackMode: 'NON_DESTRUCTIVE_EXPAND_CONTRACT' | 'SCHEMA_DOWN';
  trafficDrainDurationMs: number;
  serviceHealthStatusPostRollback: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  mutationsCreatedUnderNewVersionPreserved: number;
  zeroDataLossCertified: boolean;
  auditTrail: string[];
}

// ============================================================================
// JOB 085: Disaster Recovery Drill & Point-In-Time-Recovery (PITR)
// ============================================================================

export interface DisasterRecoveryDrillReport {
  drillId: string;
  timestamp: string;
  simulatedIncident: 'PRIMARY_REGION_TOTAL_OUTAGE' | 'CATASTROPHIC_DATA_CORRUPTION';
  backupSnapshotId: string;
  snapshotSha256: string;
  snapshotAgeSeconds: number; // Must translate to RPO < 3600s
  rpoActualMinutes: number;
  rpoTargetMinutes: number; // 60 minutes
  rpoPass: boolean;
  recoveryStartTimestamp: string;
  recoveryEndTimestamp: string;
  rtoActualMinutes: number;
  rtoTargetMinutes: number; // 30 minutes
  rtoPass: boolean;
  dataIntegrityParity: {
    entitiesPreIncident: number;
    entitiesPostRecovery: number;
    parityPercent: number; // 100.00%
  };
  overallDrillPassed: boolean;
  runbookExecutedSteps: string[];
}

// Option B Provision: Single-Region Manual Snapshot Restore Adapter
export interface SingleRegionSnapshotRestoreParams {
  snapshotPath: string;
  destinationDatabaseUrl: string;
  skipWalReplay?: boolean;
}
