/**
 * apps/api/src/modules/compliance/inventory.ts
 *
 * Milestone W051.5 — Compliance, DPDP & Data Governance Readiness
 * Authoritative Personal Data Inventory across all application entities and subsystems.
 */

import type { PersonalDataInventoryItem } from '@kshetra/shared';

export const COMPLIANCE_PERSONAL_DATA_INVENTORY: PersonalDataInventoryItem[] = [
  // ─── 1. AUTHENTICATION & CORE IDENTITY ───
  {
    id: 'PDI-001',
    entity: 'auth.users',
    field: 'phone',
    category: 'contact',
    isSensitive: true,
    purpose: 'User authentication, OTP delivery, account recovery, and two-factor verification',
    collectionPoint: 'Mobile / Web Sign-in & Registration Screen',
    storageLocation: 'Supabase PostgreSQL (auth.users)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['service_role', 'user_self'],
    thirdPartySharing: ['Twilio / Exotel (OTP delivery)'],
    retentionPeriod: 'session_30_days',
    deletionMechanism: 'Hard delete via auth admin API upon account erasure',
    securityControls: ['AES-256 rest encryption', 'TLS 1.3 in transit', 'Strict RLS'],
    isStatutoryPublicRecord: false,
  },
  {
    id: 'PDI-002',
    entity: 'auth.users',
    field: 'email',
    category: 'contact',
    isSensitive: false,
    purpose: 'Notification alerts, passwordless sign-in, billing receipts, and legal notices',
    collectionPoint: 'Registration & Profile Settings',
    storageLocation: 'Supabase PostgreSQL (auth.users)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['service_role', 'user_self'],
    thirdPartySharing: ['Resend / SendGrid (Transactional email)'],
    retentionPeriod: 'session_30_days',
    deletionMechanism: 'Hard delete via auth admin API upon account erasure',
    securityControls: ['AES-256 rest encryption', 'TLS 1.3 in transit', 'Strict RLS'],
    isStatutoryPublicRecord: false,
  },
  {
    id: 'PDI-003',
    entity: 'auth.users',
    field: 'encrypted_password',
    category: 'identity',
    isSensitive: true,
    purpose: 'Secure credential verification',
    collectionPoint: 'Registration & Password Change Screens',
    storageLocation: 'Supabase PostgreSQL (auth.users)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['service_role'],
    thirdPartySharing: [],
    retentionPeriod: 'session_30_days',
    deletionMechanism: 'Hard delete upon account erasure',
    securityControls: ['Argon2id / bcrypt hashing with unique salt', 'Never logged'],
    isStatutoryPublicRecord: false,
  },

  // ─── 2. CITIZEN PROFILES & PREFERENCES ───
  {
    id: 'PDI-004',
    entity: 'public.user_profiles',
    field: 'display_name',
    category: 'identity',
    isSensitive: false,
    purpose: 'Public identifier in community discussions, comment threads, and civic questions',
    collectionPoint: 'Onboarding & Profile Edit Screen',
    storageLocation: 'Supabase PostgreSQL (public.user_profiles)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['public_read', 'user_self_write'],
    thirdPartySharing: [],
    retentionPeriod: 'session_30_days',
    deletionMechanism: 'Cascading hard delete via foreign key ON DELETE CASCADE',
    securityControls: ['RLS enforced', 'Input sanitization against XSS'],
    isStatutoryPublicRecord: false,
  },
  {
    id: 'PDI-005',
    entity: 'public.user_profiles',
    field: 'bio',
    category: 'user_content',
    isSensitive: false,
    purpose: 'User self-description and civic interests',
    collectionPoint: 'Profile Edit Screen',
    storageLocation: 'Supabase PostgreSQL (public.user_profiles)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['public_read', 'user_self_write'],
    thirdPartySharing: [],
    retentionPeriod: 'session_30_days',
    deletionMechanism: 'Cascading hard delete via foreign key ON DELETE CASCADE',
    securityControls: ['RLS enforced', 'Max length 300 chars limit'],
    isStatutoryPublicRecord: false,
  },
  {
    id: 'PDI-006',
    entity: 'public.user_profiles',
    field: 'avatar_url',
    category: 'biometric',
    isSensitive: false,
    purpose: 'Visual user profile representation',
    collectionPoint: 'Profile Photo Upload',
    storageLocation: 'Supabase Storage (avatars bucket) & PostgreSQL URL',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['public_read', 'user_self_write'],
    thirdPartySharing: ['CDN / Cloudflare'],
    retentionPeriod: 'session_30_days',
    deletionMechanism: 'Object deletion from S3/Storage bucket and DB URL nullification',
    securityControls: ['MIME-type validation', 'Magic number verification', 'Signed URLs'],
    isStatutoryPublicRecord: false,
  },
  {
    id: 'PDI-007',
    entity: 'public.user_profiles',
    field: 'constituency_id',
    category: 'location',
    isSensitive: false,
    purpose: 'Civic feed localization and relevant assembly constituency representation',
    collectionPoint: 'Constituency Picker / Coarse Geolocation',
    storageLocation: 'Supabase PostgreSQL (public.user_profiles)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['public_read', 'user_self_write'],
    thirdPartySharing: [],
    retentionPeriod: 'session_30_days',
    deletionMechanism: 'Nullification / deletion on account removal',
    securityControls: ['Coarse granularity only (Constituency ID, zero precise GPS coordinates)'],
    isStatutoryPublicRecord: false,
  },
  {
    id: 'PDI-008',
    entity: 'public.user_favourites',
    field: 'constituency_id',
    category: 'civic_activity',
    isSensitive: false,
    purpose: 'User-bookmarked constituencies for election monitoring and news alerts',
    collectionPoint: 'Constituency Star / Bookmark Action',
    storageLocation: 'Supabase PostgreSQL (public.user_favourites)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['user_self_read_write'],
    thirdPartySharing: [],
    retentionPeriod: 'session_30_days',
    deletionMechanism: 'Cascading hard delete via user_id foreign key',
    securityControls: ['RLS strictly restricts to auth.uid() = user_id'],
    isStatutoryPublicRecord: false,
  },

  // ─── 3. VERIFICATION & KYC INFORMATION ───
  {
    id: 'PDI-009',
    entity: 'public.user_verification',
    field: 'document_url',
    category: 'kyc_verification',
    isSensitive: true,
    purpose: 'Accreditation proof for journalists, politicians, and government officials',
    collectionPoint: 'Verification Request Submission',
    storageLocation: 'Supabase Private Storage (kyc-documents bucket)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['compliance_admin', 'user_self'],
    thirdPartySharing: [],
    retentionPeriod: 'verification_90_days',
    deletionMechanism: 'Automated cryptographic purge 90 days after review decision',
    securityControls: ['Private S3 bucket', 'Time-limited signed URLs (15m)', 'Access logged in audit_log'],
    isStatutoryPublicRecord: false,
  },

  // ─── 4. ASPIRING LEADERS & CIVIC CANDIDATES ───
  {
    id: 'PDI-010',
    entity: 'public.aspirant_profiles',
    field: 'target_constituency_ac_no',
    category: 'civic_activity',
    isSensitive: false,
    purpose: 'Aspiring leader public declaration of intended electoral contestation',
    collectionPoint: 'Aspirant Registration Form',
    storageLocation: 'Supabase PostgreSQL (public.aspirant_profiles)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['public_read', 'aspirant_self_write'],
    thirdPartySharing: [],
    retentionPeriod: 'operational_180_days',
    deletionMechanism: 'Soft-delete on withdrawal, hard delete on account erasure',
    securityControls: ['RLS enforced', 'Audit trail of status changes'],
    isStatutoryPublicRecord: false,
  },
  {
    id: 'PDI-011',
    entity: 'public.aspirant_profiles',
    field: 'party_affiliation',
    category: 'civic_activity',
    isSensitive: false,
    purpose: 'Aspirant self-declared political affiliation or independent candidacy',
    collectionPoint: 'Aspirant Registration Form',
    storageLocation: 'Supabase PostgreSQL (public.aspirant_profiles)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['public_read', 'aspirant_self_write'],
    thirdPartySharing: [],
    retentionPeriod: 'operational_180_days',
    deletionMechanism: 'Soft-delete on withdrawal, hard delete on account erasure',
    securityControls: ['User voluntarily made public; verified by manual review'],
    isStatutoryPublicRecord: false,
  },

  // ─── 5. JOURNALIST & MEDIA PROFILES ───
  {
    id: 'PDI-012',
    entity: 'public.journalist_profiles',
    field: 'press_accreditation_number',
    category: 'identity',
    isSensitive: true,
    purpose: 'Verification of legitimate press credentials under Press Information Bureau / State DIPR rules',
    collectionPoint: 'Journalist Accreditation Application',
    storageLocation: 'Supabase PostgreSQL (public.journalist_profiles)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['compliance_admin', 'journalist_self'],
    thirdPartySharing: [],
    retentionPeriod: 'verification_90_days',
    deletionMechanism: 'Purged upon role revocation or account deletion',
    securityControls: ['Restricted column-level RLS', 'Encrypted at rest'],
    isStatutoryPublicRecord: false,
  },

  // ─── 6. MONETIZATION & CAMPAIGN WALLETS ───
  {
    id: 'PDI-013',
    entity: 'public.campaign_wallets',
    field: 'balance_inr',
    category: 'financial',
    isSensitive: true,
    purpose: 'Prepaid wallet balance for campaign SMS, Voice OBD, and sponsored outreach',
    collectionPoint: 'Payment Top-up / Recharge',
    storageLocation: 'Supabase PostgreSQL (public.campaign_wallets)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['politician_owner', 'billing_admin'],
    thirdPartySharing: ['Razorpay (Payment processor)'],
    retentionPeriod: 'statutory_7_years',
    deletionMechanism: 'Retained for 7 years per Companies Act 2013 and IT Act audit standards',
    securityControls: ['Check constraint balance >= 0', 'Immutable transaction ledger references'],
    isStatutoryPublicRecord: false,
  },
  {
    id: 'PDI-014',
    entity: 'public.wallet_transactions',
    field: 'reference_id',
    category: 'financial',
    isSensitive: true,
    purpose: 'Payment provider transaction tracking and dispute reconciliation',
    collectionPoint: 'Payment Gateway Webhook & Verification',
    storageLocation: 'Supabase PostgreSQL (public.wallet_transactions)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['politician_owner', 'billing_admin'],
    thirdPartySharing: ['Razorpay (Reconciliation API)'],
    retentionPeriod: 'statutory_7_years',
    deletionMechanism: 'Immutable financial ledger; zero destructive deletion permitted',
    securityControls: ['Cryptographic HMAC signature verification', 'Audit log correlation'],
    isStatutoryPublicRecord: false,
  },

  // ─── 7. VOICE OBD BROADCASTS ───
  {
    id: 'PDI-015',
    entity: 'public.voice_obd_broadcasts',
    field: 'audio_url',
    category: 'user_content',
    isSensitive: false,
    purpose: 'Campaign audio broadcast for delivery to constituency electors',
    collectionPoint: 'Campaign Audio Upload',
    storageLocation: 'Supabase Storage & Telecom Provider (Exotel)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['politician_owner', 'campaign_manager'],
    thirdPartySharing: ['Exotel (Voice OBD gateway)'],
    retentionPeriod: 'operational_180_days',
    deletionMechanism: 'Deleted after 180-day TRAI regulatory audit requirement',
    securityControls: ['TRAI time window enforcement (09:00 - 21:00)', 'DND registry filter'],
    isStatutoryPublicRecord: false,
  },

  // ─── 8. B2B SAAS PARTNERS & API CLIENTS ───
  {
    id: 'PDI-016',
    entity: 'public.saas_tenants',
    field: 'contact_email',
    category: 'b2b_partner',
    isSensitive: false,
    purpose: 'SaaS partner organization administration, quota notifications, and billing invoices',
    collectionPoint: 'Partner Signup Screen (/api/vsaas/v1/auth/signup)',
    storageLocation: 'Supabase PostgreSQL (public.saas_tenants)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['saas_admin', 'tenant_owner'],
    thirdPartySharing: ['Razorpay (SaaS invoices)'],
    retentionPeriod: 'usage_36_months',
    deletionMechanism: 'Hard delete on tenant offboarding after contractual close',
    securityControls: ['RLS isolation by tenant_id', 'Strict email regex validation'],
    isStatutoryPublicRecord: false,
  },
  {
    id: 'PDI-017',
    entity: 'public.saas_api_keys',
    field: 'key_hash',
    category: 'b2b_partner',
    isSensitive: true,
    purpose: 'Cryptographic API authentication matching',
    collectionPoint: 'Key Generation Endpoint (/api/vsaas/v1/auth/keys)',
    storageLocation: 'Supabase PostgreSQL (public.saas_api_keys)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['saas_auth_engine'],
    thirdPartySharing: [],
    retentionPeriod: 'usage_36_months',
    deletionMechanism: 'Revoked status immediately; hard deleted on tenant purge',
    securityControls: ['SHA-256 one-way hashing', 'Constant-time verification', 'Raw key never stored'],
    isStatutoryPublicRecord: false,
  },

  // ─── 9. STATUTORY PUBLIC POLITICAL RECORDS (EXEMPT FROM CITIZEN ERASURE) ───
  {
    id: 'PDI-018',
    entity: 'public.canonical_persons',
    field: 'canonical_name',
    category: 'identity',
    isSensitive: false,
    purpose: 'Statutory public electoral facts: recognized contesting candidates & sitting legislators',
    collectionPoint: 'ECI Official Gazette & Form 20 Results',
    storageLocation: 'Supabase PostgreSQL (public.canonical_persons)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['public_read', 'statutory_data_pipeline'],
    thirdPartySharing: ['Public API / Open Data'],
    retentionPeriod: 'permanent_statutory_public',
    deletionMechanism: 'EXEMPT from citizen erasure; public electoral historical record',
    securityControls: ['Row Level Security read-only', 'Cryptographic provenance anchors'],
    isStatutoryPublicRecord: true,
  },
  {
    id: 'PDI-019',
    entity: 'public.candidate_affidavits',
    field: 'affidavit_url',
    category: 'civic_activity',
    isSensitive: false,
    purpose: 'Statutory Form 26 candidate disclosures under Supreme Court ADR guidelines & RP Act 1951',
    collectionPoint: 'ECI Official Affidavit Portal',
    storageLocation: 'Supabase PostgreSQL (public.candidate_affidavits)',
    processingLocation: 'AWS ap-south-1 (Mumbai)',
    accessRoles: ['public_read'],
    thirdPartySharing: ['Public Domain'],
    retentionPeriod: 'permanent_statutory_public',
    deletionMechanism: 'EXEMPT from citizen erasure; non-derogable public record',
    securityControls: ['DEC-134 mathematical balance check constraints', 'RLS read-only'],
    isStatutoryPublicRecord: true,
  },
];

export class InventoryService {
  /**
   * Retrieves the full personal data inventory.
   */
  getInventory(): PersonalDataInventoryItem[] {
    return COMPLIANCE_PERSONAL_DATA_INVENTORY;
  }

  /**
   * Returns all inventory items matching a specific personal data category.
   */
  getItemsByCategory(category: string): PersonalDataInventoryItem[] {
    return COMPLIANCE_PERSONAL_DATA_INVENTORY.filter((item) => item.category === category);
  }

  /**
   * Identifies all fields subject to citizen erasure vs statutory public records.
   */
  getErasureEligibilitySummary(): {
    citizenDataErasableCount: number;
    statutoryPublicExemptCount: number;
    totalFieldsCount: number;
  } {
    const erasable = COMPLIANCE_PERSONAL_DATA_INVENTORY.filter((item) => !item.isStatutoryPublicRecord);
    const exempt = COMPLIANCE_PERSONAL_DATA_INVENTORY.filter((item) => item.isStatutoryPublicRecord);
    return {
      citizenDataErasableCount: erasable.length,
      statutoryPublicExemptCount: exempt.length,
      totalFieldsCount: COMPLIANCE_PERSONAL_DATA_INVENTORY.length,
    };
  }
}

export const inventoryService = new InventoryService();
