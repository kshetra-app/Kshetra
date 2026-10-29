/**
 * packages/shared/src/contracts/compliance.ts
 *
 * Milestone W051.5 — Compliance, DPDP & Data Governance Readiness
 * Canonical types for DPDP Act 2023 / DPDPR 2025 compliance-by-design,
 * personal data classification, retention lifecycle, rights workflows,
 * and 13-language privacy localization.
 */

export type PersonalDataCategory =
  | 'identity'
  | 'contact'
  | 'biometric'
  | 'location'
  | 'device_session'
  | 'financial'
  | 'user_content'
  | 'civic_activity'
  | 'kyc_verification'
  | 'b2b_partner';

export type LegalBasisGround =
  | 'explicit_consent'
  | 'legitimate_uses_section_7'
  | 'legal_obligation'
  | 'statutory_public_record';

export type RetentionPeriodClass =
  | 'ephemeral'
  | 'session_30_days'
  | 'verification_90_days'
  | 'operational_180_days'
  | 'usage_36_months'
  | 'statutory_7_years'
  | 'permanent_statutory_public';

export type DataPrincipalRightType =
  | 'access'
  | 'correction'
  | 'erasure'
  | 'grievance'
  | 'consent_withdrawal';

export type RightsWorkflowStatus =
  | 'received'
  | 'authenticated'
  | 'processing'
  | 'completed'
  | 'rejected'
  | 'appealed';

export type SupportedPrivacyLocale =
  | 'en' // English
  | 'hi' // Hindi
  | 'te' // Telugu
  | 'ta' // Tamil
  | 'kn' // Kannada
  | 'ml' // Malayalam
  | 'mr' // Marathi
  | 'bn' // Bengali
  | 'gu' // Gujarati
  | 'or' // Odia
  | 'pa' // Punjabi
  | 'as' // Assamese
  | 'ne'; // Nepali

export interface PersonalDataInventoryItem {
  id: string;
  entity: string;
  field: string;
  category: PersonalDataCategory;
  isSensitive: boolean;
  purpose: string;
  collectionPoint: string;
  storageLocation: string;
  processingLocation: string;
  accessRoles: string[];
  thirdPartySharing: string[];
  retentionPeriod: RetentionPeriodClass;
  deletionMechanism: string;
  securityControls: string[];
  isStatutoryPublicRecord: boolean;
}

export interface DataFlowBoundary {
  sourceSystem: string;
  targetSystem: string;
  dataTransferred: string[];
  purpose: string;
  recipientCategory: string;
  transportSecurity: string;
  storageEncryption: string;
  retentionConstraint: string;
  crossBorderTransfer: boolean;
  transferDestinationCountry?: string;
  legalSafeguard: string;
}

export interface RetentionPolicyRule {
  dataClass: string;
  applicableTables: string[];
  retentionClass: RetentionPeriodClass;
  retentionDurationDays: number | null;
  statutoryReference: string;
  deletionTrigger: string;
  deletionMethod: 'hard_delete' | 'anonymize' | 'crypto_shred' | 'immutable_archive';
  auditRequirements: string;
}

export interface DataPrincipalRightRequest {
  id: string;
  userId: string;
  rightType: DataPrincipalRightType;
  status: RightsWorkflowStatus;
  requestedAt: string;
  processedAt?: string;
  details?: Record<string, any>;
  verificationMethod: 'jwt_session' | 'mfa_otp' | 'aadhaar_offline_xml' | 'manual_id_review';
  resolutionNotes?: string;
}

export interface DataPrincipalExportArchive {
  exportId: string;
  userId: string;
  generatedAt: string;
  expiresAt: string;
  archiveChecksumSha256: string;
  summary: {
    profileRecordsCount: number;
    activityRecordsCount: number;
    walletTransactionsCount: number;
    sessionsCount: number;
    publicStatutoryRecordsNotice: string;
  };
  dataPayload: {
    account: Record<string, any>;
    profile: Record<string, any>;
    civicBadges: any[];
    userFavourites: any[];
    verificationHistory: any[];
    walletHistory: any[];
  };
}

export interface GrievanceRedressalTicket {
  ticketId: string;
  userId: string;
  dpoName: string;
  dpoEmail: string;
  grievanceSubject: string;
  grievanceDescription: string;
  status: 'open' | 'investigating' | 'resolved' | 'escalated_to_dpbi';
  slaDays: number;
  createdAt: string;
  resolutionDueBy: string;
  resolvedAt?: string;
  resolutionSummary?: string;
}

export interface SignificantDataFiduciaryAssessment {
  assessmentDate: string;
  assessmentFramework: 'DPDP_Act_2023_Section_10';
  statutoryFactors: {
    volumeAndSensitivityOfPersonalData: {
      status: 'MONITORED';
      score: number;
      rationale: string;
    };
    riskToHarmDataPrincipals: {
      status: 'LOW_TO_MEDIUM';
      score: number;
      rationale: string;
    };
    potentialImpactOnElectoralSovereignty: {
      status: 'HIGH_GOVERNANCE_CONTROLLED';
      score: number;
      rationale: string;
    };
    publicOrderAndNationalSecurityImplications: {
      status: 'LOW';
      score: number;
      rationale: string;
    };
  };
  overallClassification: 'DATA_FIDUCIARY' | 'SIGNIFICANT_DATA_FIDUCIARY_PENDING_NOTIFICATION';
  appointedDpo: boolean;
  independentDataAuditorReady: boolean;
  dataProtectionImpactAssessmentConducted: boolean;
  reassessmentTriggers: string[];
}

export interface PrivacyNoticePack {
  locale: SupportedPrivacyLocale;
  languageName: string;
  privacyPolicyTitle: string;
  purposeSummary: string;
  dataCollectedSummary: string;
  rightsSummary: string;
  consentWithdrawalInstructions: string;
  dpoContact: {
    name: string;
    email: string;
    address: string;
  };
  dpbiAppealNotice: string;
}

export interface ThirdPartyProviderRegisterEntry {
  providerName: string;
  serviceCategory: 'cloud_hosting' | 'database_auth' | 'payments' | 'telecom_obd' | 'analytics' | 'cdn_storage';
  dataShared: string[];
  purpose: string;
  region: string;
  dpaInPlace: boolean;
  subprocessorAuditDate: string;
  securityCertifications: string[];
  exitStrategy: string;
}

export interface BreachIncidentRecord {
  incidentId: string;
  discoveredAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedCategories: PersonalDataCategory[];
  estimatedPrincipalsAffected: number;
  containmentStatus: 'contained' | 'mitigating' | 'under_investigation';
  dpbiNotificationRequired: boolean;
  dpbiNotificationDueBy: string; // 72h SLA
  dpbiNotifiedAt?: string;
  principalsNotifiedAt?: string;
  rootCauseAnalysis?: string;
}
