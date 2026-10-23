/**
 * scripts/lib/stagingAdminContainment.mjs
 *
 * Fail-Closed Authenticated Administrative Credential-Containment Gate
 * Authority: CTO Directive 143 Section 5 / CTO Directive 144 Workstream A / Master Execution Framework Amendment v1.6
 *
 * Requirements:
 * 1. Mode B staging execution MUST fail closed unless staging credential rotation and access-log
 *    audit have been explicitly confirmed and cryptographically authenticated by an authorized project administrator.
 * 2. An arbitrary unauthenticated JSON object with boolean fields alone is strictly rejected (Directive 144 requirement 5).
 * 3. The administrative record must authenticate that:
 *    a. Target project reference is strictly fkpigozcqnmcvofuksar.
 *    b. JWT secret and service-role key have been rotated on fkpigozcqnmcvofuksar via Supabase Dashboard.
 *    c. Access logs for fkpigozcqnmcvofuksar have been audited for the exposure interval.
 *    d. Unauthorized remote mutations during the exposure period have been investigated and ruled out.
 *    e. Exposure interval start and certification timestamp are valid ISO timestamps in the past.
 * 4. The administrative evidence must be cryptographically signed against the trusted administrator public key.
 * 5. In the operational repository, containment remains CONTAINMENT_PENDING_ADMIN_CONFIRMATION until
 *    the authorized project administrator provides and signs the authentic external closure record.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

export const CANONICAL_INCIDENT_ID = 'INC-2026-W021.5-ROTATION-VERIFIED';
export const ALLOWED_CANONICAL_INCIDENT_IDS = [
  'INC-2026-W021.5-ROTATION-VERIFIED',
  'SEC-INC-2026-10-21-001'
];
export const ALLOWED_STAGING_PROJECT_REF = 'fkpigozcqnmcvofuksar';
export const DEFAULT_ADMIN_RECORD_PATH = path.join(REPO_ROOT, 'governance', 'security', 'admin_incident_closure_record.json');
export const DEFAULT_ADMIN_PUBLIC_KEY_PATH = path.join(REPO_ROOT, 'governance', 'keys', 'cto_admin_containment_public.pem');

export const CONTAINMENT_STATUS = {
  PENDING: 'CONTAINMENT_PENDING_ADMIN_CONFIRMATION',
  CONFIRMED: 'CONTAINMENT_CONFIRMED_BY_ADMIN'
};

/**
 * Deterministically sorts object keys for canonical serialization
 */
export function canonicalizeObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeObject);
  }
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const k of keys) {
    sorted[k] = canonicalizeObject(obj[k]);
  }
  return sorted;
}

/**
 * Base64URL decode string
 */
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Resolves the trusted administrator asymmetric public key trust anchor.
 */
export function resolveAdminTrustAnchor(options = {}) {
  let keyMaterial = options.adminTrustAnchor;

  if (!keyMaterial) {
    if (process.env.KSHETRA_ADMIN_PUBLIC_KEY && process.env.KSHETRA_ADMIN_PUBLIC_KEY.trim().length > 0) {
      keyMaterial = process.env.KSHETRA_ADMIN_PUBLIC_KEY.trim();
    } else {
      const keyPath = options.adminKeyPath || DEFAULT_ADMIN_PUBLIC_KEY_PATH;
      if (fs.existsSync(keyPath)) {
        try {
          keyMaterial = fs.readFileSync(keyPath, 'utf8').trim();
        } catch (err) {
          const e = new Error(`ADMIN_KEY_READ_ERROR: Could not read admin public key file at ${keyPath}: ${err.message}`);
          e.code = 'ADMIN_KEY_READ_ERROR';
          throw e;
        }
      }
    }
  }

  if (!keyMaterial) {
    const err = new Error('ADMIN_TRUST_ANCHOR_UNCONFIGURED: Administrative containment public key trust anchor is not configured. External administrator confirmation required.');
    err.code = 'ADMIN_TRUST_ANCHOR_UNCONFIGURED';
    throw err;
  }

  try {
    if (crypto.isKeyObject && crypto.isKeyObject(keyMaterial)) {
      if (keyMaterial.type !== 'public') {
        const e = new Error(`INVALID_ADMIN_TRUST_ANCHOR: Admin trust anchor must be an asymmetric public key, received "${keyMaterial.type}".`);
        e.code = 'INVALID_ADMIN_TRUST_ANCHOR';
        throw e;
      }
      return keyMaterial;
    }
    const parsed = crypto.createPublicKey(keyMaterial);
    if (parsed.type !== 'public') {
      const e = new Error(`INVALID_ADMIN_TRUST_ANCHOR: Admin trust anchor must be an asymmetric public key, received "${parsed.type}".`);
      e.code = 'INVALID_ADMIN_TRUST_ANCHOR';
      throw e;
    }
    return parsed;
  } catch (err) {
    const e = new Error(`INVALID_ADMIN_TRUST_ANCHOR: Admin trust anchor is not a valid asymmetric public key: ${err.message}`);
    e.code = 'INVALID_ADMIN_TRUST_ANCHOR';
    throw e;
  }
}

/**
 * Validates an authenticated administrative incident closure record.
 * Fails closed if the record is missing, unauthenticated, unsigned, forged, incomplete, or unconfirmed.
 */
export function verifyAdminIncidentClosure(closureRef, options = {}) {
  // 1. Closure reference presence
  if (!closureRef || typeof closureRef !== 'string' || closureRef.trim().length === 0) {
    const err = new Error('INCIDENT_CLOSURE_REF_REQUIRED: Mode B execution requires a non-empty administrative incident_closure_ref.');
    err.code = 'INCIDENT_CLOSURE_REF_REQUIRED';
    throw err;
  }

  const trimmedRef = closureRef.trim();

  // 2. Canonical Incident ID check (Directive 144 requirement 5)
  if (!ALLOWED_CANONICAL_INCIDENT_IDS.includes(trimmedRef)) {
    const err = new Error(
      `INVALID_INCIDENT_ID: Incident reference "${trimmedRef}" is not an authorized canonical incident reference (${ALLOWED_CANONICAL_INCIDENT_IDS.join(', ')}).`
    );
    err.code = 'INVALID_INCIDENT_ID';
    throw err;
  }

  // 3. Resolve administrative closure record from options or disk
  let adminRecord = options.adminClosureRecord;
  if (!adminRecord) {
    const recordPath = options.adminRecordPath || DEFAULT_ADMIN_RECORD_PATH;
    if (fs.existsSync(recordPath)) {
      try {
        adminRecord = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
      } catch (e) {
        const err = new Error(`ADMIN_RECORD_MALFORMED: Could not parse administrative closure record at ${recordPath}: ${e.message}`);
        err.code = 'ADMIN_RECORD_MALFORMED';
        throw err;
      }
    }
  }

  // 4. If no administrative record exists, fail closed with detailed prerequisites
  if (!adminRecord) {
    const err = new Error(
      `ADMIN_CONTAINMENT_UNCONFIRMED: Administrative incident closure record for "${trimmedRef}" is not provisioned. ` +
      'Staging credential rotation and access-log audit remain pending confirmation by the authorized project administrator.'
    );
    err.code = 'ADMIN_CONTAINMENT_UNCONFIRMED';
    err.incidentId = trimmedRef;
    err.status = CONTAINMENT_STATUS.PENDING;
    err.unresolvedPrerequisites = [
      'Project Administrator confirmation of JWT secret rotation via Supabase dashboard on fkpigozcqnmcvofuksar',
      'Project Administrator confirmation of service-role key rotation on fkpigozcqnmcvofuksar',
      'Administrative access-log review of fkpigozcqnmcvofuksar for the exposure interval (2026-10-21 onwards)',
      'Administrative investigation of unauthorized mutations during the exposure period',
      'Cryptographically signed administrative closure record provisioned at governance/security/admin_incident_closure_record.json'
    ];
    throw err;
  }

  // 5. Authenticated Administrative Evidence Requirement (Directive 144 requirement 5)
  // An arbitrary JSON object with boolean fields alone is strictly rejected.
  let payload;
  let signature;
  let algorithm = 'Ed25519';

  if (typeof adminRecord === 'string' && adminRecord.trim().startsWith('{')) {
    try {
      adminRecord = JSON.parse(adminRecord);
    } catch (e) {
      const err = new Error(`ADMIN_RECORD_MALFORMED: Could not parse JSON administrative closure record: ${e.message}`);
      err.code = 'ADMIN_RECORD_MALFORMED';
      throw err;
    }
  }

  if (typeof adminRecord === 'string' && adminRecord.split('.').length === 3) {
    // JWS compact string format
    const [hB64, pB64, sB64] = adminRecord.split('.');
    let header;
    try {
      header = JSON.parse(base64UrlDecode(hB64));
      payload = JSON.parse(base64UrlDecode(pB64));
    } catch (e) {
      const err = new Error('ADMIN_RECORD_MALFORMED: Could not decode JWS administrative closure record.');
      err.code = 'ADMIN_RECORD_MALFORMED';
      throw err;
    }
    algorithm = header.alg || 'Ed25519';
    let base64 = sB64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    signature = Buffer.from(base64, 'base64');
  } else if (typeof adminRecord === 'object' && adminRecord !== null) {
    if (!adminRecord.signature) {
      const err = new Error(
        'ADMIN_RECORD_UNAUTHENTICATED: Administrative closure record lacks a cryptographic signature. ' +
        'Arbitrary JSON objects with boolean fields alone are strictly prohibited under Directive 144.'
      );
      err.code = 'ADMIN_RECORD_UNAUTHENTICATED';
      throw err;
    }
    payload = adminRecord.payload;
    if (!payload || typeof payload !== 'object') {
      const err = new Error('ADMIN_RECORD_MALFORMED: Signed administrative record must contain a valid "payload" object.');
      err.code = 'ADMIN_RECORD_MALFORMED';
      throw err;
    }
    algorithm = adminRecord.algorithm || 'Ed25519';
    const sigStr = adminRecord.signature;
    try {
      let base64 = sigStr.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) base64 += '=';
      signature = Buffer.from(base64, 'base64');
    } catch (_) {
      signature = Buffer.from(sigStr, 'hex');
    }
  } else {
    const err = new Error('ADMIN_RECORD_MALFORMED: Administrative closure record must be a signed object or JWS string.');
    err.code = 'ADMIN_RECORD_MALFORMED';
    throw err;
  }

  // 6. Asymmetric signature verification of administrative evidence
  const adminPublicKey = resolveAdminTrustAnchor(options);
  const canonicalPayloadString = JSON.stringify(canonicalizeObject(payload));
  const signingInput = Buffer.from(canonicalPayloadString, 'utf8');

  let signatureValid = false;
  try {
    if (algorithm === 'Ed25519') {
      signatureValid = crypto.verify(null, signingInput, adminPublicKey, signature);
    } else if (algorithm === 'RS256') {
      signatureValid = crypto.verify('SHA256', signingInput, adminPublicKey, signature);
    } else {
      const err = new Error(`UNSUPPORTED_ADMIN_ALGORITHM: Unsupported administrative signing algorithm "${algorithm}".`);
      err.code = 'UNSUPPORTED_ADMIN_ALGORITHM';
      throw err;
    }
  } catch (err) {
    const e = new Error(`INVALID_ADMIN_SIGNATURE: Administrative cryptographic signature verification error: ${err.message}`);
    e.code = 'INVALID_ADMIN_SIGNATURE';
    throw e;
  }

  if (!signatureValid) {
    const err = new Error('INVALID_ADMIN_SIGNATURE: Administrative cryptographic signature mismatch against trusted administrator key.');
    err.code = 'INVALID_ADMIN_SIGNATURE';
    throw err;
  }

  // 7. Validate Required Evidence Claims (Directive 144 requirement 5)
  if (payload.incidentId !== trimmedRef) {
    const err = new Error(
      `ADMIN_RECORD_MISMATCH: Record incidentId "${payload.incidentId}" does not match token closureRef "${trimmedRef}".`
    );
    err.code = 'ADMIN_RECORD_MISMATCH';
    throw err;
  }

  if (payload.targetProjectRef !== ALLOWED_STAGING_PROJECT_REF) {
    const err = new Error(
      `ADMIN_RECORD_PROJECT_MISMATCH: Record targetProjectRef "${payload.targetProjectRef}" does not match allowed staging project "${ALLOWED_STAGING_PROJECT_REF}".`
    );
    err.code = 'ADMIN_RECORD_PROJECT_MISMATCH';
    throw err;
  }

  // Credential rotation evidence
  const isCredentialRotated = (payload.jwtSecretRotated === true && payload.serviceRoleKeyRotated === true) ||
    (payload.credentialRotated === true && payload.jwtSecretRotated === true && payload.serviceRoleKeyRotated === true);
  if (!isCredentialRotated) {
    const err = new Error('ADMIN_CONTAINMENT_UNCONFIRMED: Administrative record does not confirm both jwtSecretRotated = true and serviceRoleKeyRotated = true.');
    err.code = 'ADMIN_CONTAINMENT_UNCONFIRMED';
    throw err;
  }

  // Access log audit evidence
  if (payload.accessLogsAudited !== true) {
    const err = new Error('ADMIN_CONTAINMENT_UNCONFIRMED: Administrative record does not confirm accessLogsAudited = true.');
    err.code = 'ADMIN_CONTAINMENT_UNCONFIRMED';
    throw err;
  }

  // Unauthorized mutations investigation evidence
  if (payload.unauthorizedMutationsInvestigated !== true) {
    const err = new Error('ADMIN_CONTAINMENT_UNCONFIRMED: Administrative record does not confirm unauthorizedMutationsInvestigated = true.');
    err.code = 'ADMIN_CONTAINMENT_UNCONFIRMED';
    throw err;
  }

  // Exposure interval validation
  if (!payload.exposureIntervalStart || typeof payload.exposureIntervalStart !== 'string') {
    const err = new Error('ADMIN_CONTAINMENT_UNCONFIRMED: Administrative record lacks exposureIntervalStart timestamp.');
    err.code = 'ADMIN_CONTAINMENT_UNCONFIRMED';
    throw err;
  }
  const exposureStart = new Date(payload.exposureIntervalStart);
  if (isNaN(exposureStart.getTime())) {
    const err = new Error('INVALID_EXPOSURE_INTERVAL: Administrative exposureIntervalStart is not a valid date.');
    err.code = 'INVALID_EXPOSURE_INTERVAL';
    throw err;
  }

  // Authorized administrator identity
  if (!payload.authorizedAdmin || typeof payload.authorizedAdmin !== 'string' || payload.authorizedAdmin.trim().length === 0) {
    const err = new Error('ADMIN_CONTAINMENT_UNCONFIRMED: Administrative record lacks authorizedAdmin identity.');
    err.code = 'ADMIN_CONTAINMENT_UNCONFIRMED';
    throw err;
  }

  // Certification timestamp format and temporal validity (must not be in the future)
  if (!payload.certifiedAt || typeof payload.certifiedAt !== 'string') {
    const err = new Error('ADMIN_CONTAINMENT_UNCONFIRMED: Administrative record lacks certifiedAt ISO timestamp.');
    err.code = 'ADMIN_CONTAINMENT_UNCONFIRMED';
    throw err;
  }
  const certDate = new Date(payload.certifiedAt);
  if (isNaN(certDate.getTime())) {
    const err = new Error('INVALID_CERTIFICATION_TIMESTAMP: Administrative certifiedAt is not a valid ISO timestamp.');
    err.code = 'INVALID_CERTIFICATION_TIMESTAMP';
    throw err;
  }
  const now = options.now || Date.now();
  if (certDate.getTime() > now + 60000) { // 60s allowable clock skew
    const err = new Error(`INVALID_CERTIFICATION_TIMESTAMP: Administrative certifiedAt (${payload.certifiedAt}) is in the future.`);
    err.code = 'INVALID_CERTIFICATION_TIMESTAMP';
    throw err;
  }

  return {
    verified: true,
    authenticated: true,
    incidentId: payload.incidentId,
    targetProjectRef: payload.targetProjectRef,
    authorizedAdmin: payload.authorizedAdmin,
    certifiedAt: payload.certifiedAt,
    jwtSecretRotated: true,
    serviceRoleKeyRotated: true,
    credentialRotated: true,
    accessLogsAudited: true,
    unauthorizedMutationsInvestigated: true,
    exposureIntervalStart: payload.exposureIntervalStart,
    status: CONTAINMENT_STATUS.CONFIRMED
  };
}
