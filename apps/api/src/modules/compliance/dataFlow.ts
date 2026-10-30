/**
 * apps/api/src/modules/compliance/dataFlow.ts
 *
 * Milestone W051.5 — Compliance, DPDP & Data Governance Readiness
 * Technical Data Flow Map & Third-Party Subprocessor Register.
 */

import type { DataFlowBoundary, ThirdPartyProviderRegisterEntry } from '@kshetra/shared';

export const COMPLIANCE_DATA_FLOW_MAP: DataFlowBoundary[] = [
  {
    sourceSystem: 'Mobile Client (Android / iOS) & Web App',
    targetSystem: 'Poligram API Gateway (Fastify on Railway)',
    dataTransferred: ['Auth credentials', 'Profile inputs', 'Constituency preferences', 'Device headers'],
    purpose: 'API request dispatch, session negotiation, and civic interaction submission',
    recipientCategory: 'First-party application layer',
    transportSecurity: 'TLS 1.3 with HSTS (Strict-Transport-Security: max-age=63072000)',
    storageEncryption: 'Ephemeral in-memory buffers; zero raw disk logging',
    retentionConstraint: 'Request execution lifecycle only (< 500ms)',
    crossBorderTransfer: false,
    transferDestinationCountry: 'India',
    legalSafeguard: 'First-party data fiduciary direct processing',
  },
  {
    sourceSystem: 'Poligram API Gateway',
    targetSystem: 'Supabase PostgreSQL & PostGIS (AWS ap-south-1 Mumbai)',
    dataTransferred: ['User profiles', 'Authentication records', 'Ledger balances', 'Audit logs'],
    purpose: 'Canonical transactional persistence, spatial queries, and access control enforcement',
    recipientCategory: 'Dedicated Database Subprocessor',
    transportSecurity: 'mTLS / SSL enforced connection strings with certificate validation',
    storageEncryption: 'AES-256 transparent data encryption (TDE) at rest',
    retentionConstraint: 'Per Authoritative Retention Matrix (30d to 7yr)',
    crossBorderTransfer: false,
    transferDestinationCountry: 'India (Mumbai AWS ap-south-1)',
    legalSafeguard: 'Data Processing Agreement (DPA) with standard contractual clauses',
  },
  {
    sourceSystem: 'Poligram API Gateway',
    targetSystem: 'Supabase S3 Storage (AWS ap-south-1 Mumbai)',
    dataTransferred: ['User avatars', 'Aspirant documents', 'Verification KYC proofs', 'Broadcast audio'],
    purpose: 'Unstructured binary asset storage with time-limited signed URLs',
    recipientCategory: 'Object Storage Subprocessor',
    transportSecurity: 'HTTPS TLS 1.3 with 15-minute expiring presigned upload/download URLs',
    storageEncryption: 'SSE-S3 / AES-256 server-side encryption',
    retentionConstraint: 'KYC proofs purged within 90 days; media per user lifecycle',
    crossBorderTransfer: false,
    transferDestinationCountry: 'India (Mumbai AWS ap-south-1)',
    legalSafeguard: 'DPA with ISO/IEC 27001 & SOC 2 Type II certified infrastructure',
  },
  {
    sourceSystem: 'Poligram API Gateway & Web Checkout',
    targetSystem: 'Razorpay Payment Gateway (India)',
    dataTransferred: ['Order amounts (paise)', 'Currency', 'Customer phone/email', 'Tenant slug'],
    purpose: 'Processing credit card, UPI, and NetBanking transactions for subscriptions and wallet top-ups',
    recipientCategory: 'PCI-DSS Level 1 Payment Aggregator',
    transportSecurity: 'TLS 1.3 with HMAC SHA-256 webhook signature verification',
    storageEncryption: 'PCI-DSS Level 1 compliant tokenized card storage',
    retentionConstraint: 'Statutory 7-year transaction retention per RBI / Companies Act standards',
    crossBorderTransfer: false,
    transferDestinationCountry: 'India',
    legalSafeguard: 'RBI Authorized Payment Aggregator Agreement & DPA',
  },
  {
    sourceSystem: 'Poligram API Gateway',
    targetSystem: 'Exotel Telecom Gateway (India)',
    dataTransferred: ['Recipient phone numbers', 'Audio asset URLs', 'Campaign IDs'],
    purpose: 'Dispatching TRAI-compliant Outbound Dialer (OBD) voice broadcasts to electors',
    recipientCategory: 'Telecom Service Provider',
    transportSecurity: 'HTTPS TLS 1.3 with API Token Authentication',
    storageEncryption: 'Encrypted in transit; telecom call detail records (CDR) per DOT rules',
    retentionConstraint: '180-day regulatory retention per TRAI / DOT mandate',
    crossBorderTransfer: false,
    transferDestinationCountry: 'India',
    legalSafeguard: 'TRAI TCCCPR 2018 Commercial Communications Agreement',
  },
];

export const COMPLIANCE_SUBPROCESSOR_REGISTER: ThirdPartyProviderRegisterEntry[] = [
  {
    providerName: 'Supabase (AWS Infrastructure)',
    serviceCategory: 'database_auth',
    dataShared: ['auth.users', 'user_profiles', 'wallet_transactions', 'saas_tenants'],
    purpose: 'Managed PostgreSQL, authentication, and encrypted object storage',
    region: 'AWS ap-south-1 (Mumbai, India)',
    dpaInPlace: true,
    subprocessorAuditDate: '2026-09-15',
    securityCertifications: ['SOC 2 Type II', 'ISO/IEC 27001', 'HIPAA compliant'],
    exitStrategy: 'Standard pg_dump and daily automated S3 cryptographic backups for multi-cloud export',
  },
  {
    providerName: 'Railway Cloud',
    serviceCategory: 'cloud_hosting',
    dataShared: ['Runtime application memory buffers', 'Stateless API execution logs'],
    purpose: 'Containerized Fastify Node.js execution runtime',
    region: 'ap-south-1 / Singapore (fallback)',
    dpaInPlace: true,
    subprocessorAuditDate: '2026-08-20',
    securityCertifications: ['SOC 2 Type II'],
    exitStrategy: 'Containerized Docker image portable to AWS ECS / GCP Cloud Run within 2 hours',
  },
  {
    providerName: 'Razorpay Software Private Limited',
    serviceCategory: 'payments',
    dataShared: ['Order IDs', 'Transaction amounts', 'Customer email/phone', 'GSTIN if provided'],
    purpose: 'Payment gateway collection, UPI intent, and invoice generation',
    region: 'India',
    dpaInPlace: true,
    subprocessorAuditDate: '2026-09-01',
    securityCertifications: ['PCI-DSS Level 1', 'ISO/IEC 27001'],
    exitStrategy: 'Dual-adapter PaymentProvider pattern allowing instant switch to Cashfree or Stripe',
  },
  {
    providerName: 'Exotel Techcom Private Limited',
    serviceCategory: 'telecom_obd',
    dataShared: ['Elector phone numbers', 'Audio broadcast URLs', 'Call duration metadata'],
    purpose: 'Automated voice calls and campaign outreach under TRAI regulations',
    region: 'India',
    dpaInPlace: true,
    subprocessorAuditDate: '2026-07-10',
    securityCertifications: ['ISO/IEC 27001', 'DOT/TRAI Licensed TSP'],
    exitStrategy: 'Pluggable OBD provider interface supporting Karix / Route Mobile fallback',
  },
];

export class DataFlowService {
  /**
   * Retrieves all verified data flow boundaries.
   */
  getDataFlowMap(): DataFlowBoundary[] {
    return COMPLIANCE_DATA_FLOW_MAP;
  }

  /**
   * Retrieves the third-party subprocessor register.
   */
  getSubprocessorRegister(): ThirdPartyProviderRegisterEntry[] {
    return COMPLIANCE_SUBPROCESSOR_REGISTER;
  }

  /**
   * Validates whether all primary database and storage processing is anchored in India.
   */
  verifySovereigntyAndLocationAnchor(): {
    sovereignIndiaHosted: boolean;
    violatingProviders: string[];
  } {
    const primaryStorage = COMPLIANCE_DATA_FLOW_MAP.filter(
      (b) => b.targetSystem.includes('Supabase') || b.targetSystem.includes('Razorpay') || b.targetSystem.includes('Exotel'),
    );
    const nonIndia = primaryStorage.filter((b) => b.crossBorderTransfer || b.transferDestinationCountry !== 'India' && !b.transferDestinationCountry?.includes('India'));
    return {
      sovereignIndiaHosted: nonIndia.length === 0,
      violatingProviders: nonIndia.map((b) => b.targetSystem),
    };
  }
}

export const dataFlowService = new DataFlowService();
