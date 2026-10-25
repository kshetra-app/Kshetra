/**
 * Canonical Delimitation Watch Contracts & Pipeline Types (Job 023)
 *
 * Ordered 8-Stage Lifecycle:
 * SOURCE -> CAPTURE -> NORMALIZE -> VALIDATE -> COMPARE -> VERSION -> NOTIFY -> PUBLISH
 */

import type { W012DataStatus } from './delimitation';

export type LegalInstrumentType =
  | 'DELIMITATION_ORDER'
  | 'PARLIAMENT_ACT'
  | 'PRESIDENTIAL_ORDER'
  | 'REORGANISATION_ACT'
  | 'GAZETTE_NOTIFICATION'
  | 'ELECTION_COMMISSION_NOTIFICATION'
  | 'PROPOSAL_NOTICE'
  | 'SECONDARY_REPORT'
  | 'SYNTHETIC_TEST_FIXTURE'
  | 'UNKNOWN';

export type LegalEnactmentStatus =
  | 'ENACTED_COMMENCED'
  | 'ENACTED_FUTURE_EFFECTIVE'
  | 'PROPOSED_DRAFT'
  | 'SUPERSEDED'
  | 'UNVERIFIED';

export interface LegalEvidenceDecisionRecord {
  ruleApplied: string;
  isOfficialEligible: boolean;
  rationale: string;
}

export interface LegalEvidencePackage {
  instrumentType: LegalInstrumentType;
  instrumentIdentifier: string;
  publisher: string;
  gazetteNotificationNumber?: string;
  publicationDate?: string;
  effectiveDate?: string;
  enactmentStatus: LegalEnactmentStatus;
  isStatutoryOrConstitutional: boolean;
  sourceVerificationDigest?: string;
  decisionRecord: LegalEvidenceDecisionRecord;
}

export type DelimitationSourceType =
  | 'gazette_extraordinary'
  | 'gazette_ordinary'
  | 'election_commission'
  | 'parliament_record'
  | 'census_bulletin'
  | 'statutory_archive'
  | 'synthetic_fixture';

export type DelimitationAuthorityClassification =
  | 'constitutional'
  | 'statutory'
  | 'academic'
  | 'media_ngo'
  | 'crowdsourced'
  | 'synthetic_model';

export type RetrievalMethod = 'http_get' | 'file_fixture' | 'mock_api';

export interface DelimitationWatchSource {
  id: string;
  name: string;
  publisher: string;
  sourceType: DelimitationSourceType;
  canonicalUrl: string;
  geographicScope: string; // e.g. 'NATIONAL', 'IN-TG', 'IN-AS'
  subjectScope: string;    // e.g. 'delimitation_order', 'draft_proposal'
  authorityClassification: DelimitationAuthorityClassification;
  retrievalMethod: RetrievalMethod;
  pollingSchedule?: string;
  isActive: boolean;
  lastAttemptedAt?: string;
  lastSuccessfulAt?: string;
  lastHttpStatus?: number;
  lastEtag?: string;
  lastModifiedHeader?: string;
  lastContentHash?: string;
  consecutiveFailures: number;
  lastError?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type CaptureOutcome = 'SUCCESS' | 'UNCHANGED' | 'FETCH_ERROR' | 'TIMEOUT' | 'NOT_FOUND';

export interface DelimitationSnapshot {
  id: string;
  sourceId: string;
  retrievedAt: string;
  httpStatus: number;
  etag?: string;
  lastModified?: string;
  contentType: string;
  contentSizeBytes: number;
  contentSha256: string;
  rawContent: string;
  declaredPublicationDate?: string;
  declaredEffectiveDate?: string;
  captureOutcome: CaptureOutcome;
  diagnostics?: Record<string, unknown>;
  createdAt: string;
}

export interface ConstituencyMappingCandidate {
  stateCode: string;
  oldAcNo: number;
  oldName: string;
  newAcNo: number;
  newName: string;
  overlapPercentage: number;
  populationTransferred?: number;
  votersTransferred?: number;
  notes?: string;
}

export interface DelimitationProposalCandidate {
  stateCode: string;
  proposalNumber?: string;
  title: string;
  description?: string;
  status: 'draft' | 'final' | 'superseded' | 'rejected';
  commissionId?: string;
  currentSeats: number;
  proposedSeats: number;
  currentScSeats: number;
  currentStSeats: number;
  proposedScSeats: number;
  proposedStSeats: number;
  gazetteUrl?: string;
  sourceUrl?: string;
  publishedAt?: string;
  objectionsDeadline?: string;
  delimitationRegimeId?: string;
  provenanceId?: string;
  instrumentType?: LegalInstrumentType;
  instrumentIdentifier?: string;
  legalEnactmentStatus?: LegalEnactmentStatus;
  effectiveDate?: string;
  metadata?: Record<string, unknown>;
}

export interface DelimitationCandidate {
  id: string;
  snapshotId: string;
  sourceId: string;
  parserVersion: string;
  proposalData: DelimitationProposalCandidate;
  constituencyMappings: ConstituencyMappingCandidate[];
  normalizedDataStatus: W012DataStatus;
  isProposed: boolean;
  hasLegalEvidence?: boolean;
  legalEvidenceDecision?: string;
  legalEvidenceRecord?: LegalEvidenceDecisionRecord;
  legalEvidencePackage?: LegalEvidencePackage;
  provenanceId?: string;
  metadata?: Record<string, unknown>;
  normalizedAt: string;
}

export type ValidationStatus = 'PASSED' | 'REJECTED' | 'REVIEW_REQUIRED';

export interface ValidationCheckResult {
  checkName: string;
  passed: boolean;
  details?: string;
}

export interface DelimitationValidation {
  id: string;
  candidateId: string;
  validationStatus: ValidationStatus;
  checksRun: ValidationCheckResult[];
  errors: string[];
  warnings: string[];
  evidenceReferences: string[];
  validatedAt: string;
}

export type ComparisonClassification =
  | 'NO_CHANGE'
  | 'MATERIAL_CHANGE'
  | 'INVALID_CANDIDATE'
  | 'SOURCE_RETRIEVAL_FAILURE'
  | 'REVIEW_REQUIRED';

export interface RecordDiff<T = unknown> {
  key: string;
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
  oldValue?: T;
  newValue?: T;
}

export interface DelimitationComparison {
  id: string;
  candidateId: string;
  baselineVersionId?: string;
  isMaterialChange: boolean;
  classification: ComparisonClassification;
  addedRecords: RecordDiff[];
  removedRecords: RecordDiff[];
  changedRecords: RecordDiff[];
  unchangedRecords: RecordDiff[];
  metadataDiff: Record<string, unknown>;
  comparisonSummary: string;
  comparedAt: string;
}

export interface DelimitationAcceptedVersion {
  id: string;
  sourceId: string;
  versionTag: string;
  snapshotId: string;
  candidateId: string;
  validationId: string;
  comparisonId: string;
  previousVersionId?: string;
  contentSha256: string;
  parserVersion: string;
  dataStatus: W012DataStatus;
  effectiveDate?: string;
  instrumentType?: LegalInstrumentType;
  instrumentIdentifier?: string;
  legalEnactmentStatus?: LegalEnactmentStatus;
  hasLegalEvidence?: boolean;
  legalInstrumentType?: LegalInstrumentType;
  legalEvidenceRecord?: LegalEvidenceDecisionRecord;
  legalEvidencePackage?: LegalEvidencePackage;
  proposalId?: string;
  acceptedAt: string;
  acceptedBy: string;
  metadata?: Record<string, unknown>;
}

export type DelimitationNotificationCategory =
  | 'OFFICIAL_ENACTMENT'
  | 'OFFICIAL_PUBLICATION'
  | 'PROPOSAL_NOTICE'
  | 'DRAFT_PROPOSAL'
  | 'MATERIAL_UPDATE'
  | 'SCENARIO_UPDATE'
  | 'SOURCE_CORRECTION';

export type NotificationDispatchStatus = 'PENDING' | 'SENT' | 'FAILED' | 'RETRY_PENDING';

export interface DelimitationNotificationEvent {
  id: string;
  versionId: string;
  eventCategory: DelimitationNotificationCategory;
  deduplicationKey: string;
  stateCode: string;
  affectedGeographyIds: string[];
  title: string;
  body: string;
  deepLink: string;
  dataStatus: W012DataStatus;
  dispatchStatus: NotificationDispatchStatus;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  lastAttemptAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export type PublicationStatus = 'PUBLISHED' | 'FAILED' | 'RETRY_PENDING';
export type DelimitationPublicationType = 'ENACTED_OFFICIAL' | 'PROPOSAL' | 'SCENARIO_ESTIMATE' | 'UNVERIFIED_NOTICE';

export interface DelimitationPublication {
  id: string;
  versionId: string;
  publicationType: DelimitationPublicationType;
  publicationStatus: PublicationStatus;
  publishedAt?: string;
  publishedBy: string;
  publishedProposalId?: string;
  canonicalViewUpdated: boolean;
  errorMessage?: string;
  createdAt: string;
}

export type RunOutcome =
  | 'SUCCESS'
  | 'NO_CHANGE'
  | 'REJECTED'
  | 'REVIEW_REQUIRED'
  | 'RETRY_PENDING'
  | 'FAILED';

export interface DelimitationWatchRun {
  id: string;
  correlationId: string;
  sourceId: string;
  runType: 'SCHEDULED' | 'MANUAL_TRIGGER' | 'REPLAY';
  snapshotId?: string;
  candidateId?: string;
  validationId?: string;
  comparisonId?: string;
  versionId?: string;
  eventId?: string;
  publicationId?: string;
  outcome: RunOutcome;
  stageDurationsMs: Record<string, number>;
  totalDurationMs: number;
  errorDetails?: string;
  createdAt: string;
}

export interface DelimitationWatchPipelineResult {
  runId: string;
  correlationId: string;
  sourceId: string;
  outcome: RunOutcome;
  snapshot?: DelimitationSnapshot;
  candidate?: DelimitationCandidate;
  validation?: DelimitationValidation;
  comparison?: DelimitationComparison;
  acceptedVersion?: DelimitationAcceptedVersion;
  notificationEvent?: DelimitationNotificationEvent;
  publication?: DelimitationPublication;
  stageDurationsMs: Record<string, number>;
  totalDurationMs: number;
  errorMessage?: string;
}

export interface DelimitationWatchOptions {
  correlationId?: string;
  forceReplaySnapshotId?: string;
  timeoutMs?: number;
  allowScenarioPublication?: boolean;
}
