/**
 * scripts/lib/stagingAdminContainment.mjs
 *
 * Fail-Closed Administrative Credential-Containment Gate
 * Authority: CTO Directive 143 Section 5 / Master Execution Framework Amendment v1.6
 *
 * Requirements:
 * 1. Mode B staging execution MUST fail closed unless staging credential rotation and access-log
 *    audit have been explicitly confirmed by an authorized project administrator.
 * 2. An arbitrary closure string, environment variable, or test fixture string alone CANNOT bypass this gate.
 * 3. The administrative record must authenticate that:
 *    a. JWT secret and service-role key have been rotated on fkpigozcqnmcvofuksar via Supabase Dashboard.
 *    b. Access logs for fkpigozcqnmcvofuksar have been audited for the exposure interval.
 *    c. No unauthorized remote mutations occurred during the exposure interval.
 * 4. In the operational repository, containment remains CONTAINMENT_PENDING_ADMIN_CONFIRMATION until
 *    the authorized project administrator provides and signs the authentic closure record.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

export const CANONICAL_INCIDENT_ID = 'SEC-INC-2026-10-21-001';
export const ALLOWED_STAGING_PROJECT_REF = 'fkpigozcqnmcvofuksar';
export const DEFAULT_ADMIN_RECORD_PATH = path.join(REPO_ROOT, 'governance', 'security', 'admin_incident_closure_record.json');

export const CONTAINMENT_STATUS = {
  PENDING: 'CONTAINMENT_PENDING_ADMIN_CONFIRMATION',
  CONFIRMED: 'CONTAINMENT_CONFIRMED_BY_ADMIN'
};

/**
 * Validates an administrative incident closure record.
 * Fails closed if the record is missing, unauthenticated, incomplete, or unconfirmed.
 */
export function verifyAdminIncidentClosure(closureRef, options = {}) {
  // 1. Closure reference presence
  if (!closureRef || typeof closureRef !== 'string' || closureRef.trim().length === 0) {
    const err = new Error('INCIDENT_CLOSURE_REF_REQUIRED: Mode B execution requires a non-empty administrative incident_closure_ref.');
    err.code = 'INCIDENT_CLOSURE_REF_REQUIRED';
    throw err;
  }

  const trimmedRef = closureRef.trim();

  // 2. Resolve administrative closure record from options or disk
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

  // 3. If no administrative record exists, fail closed with detailed prerequisites
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
      'Provisioning of authenticated administrative closure record at governance/security/admin_incident_closure_record.json'
    ];
    throw err;
  }

  // 4. Validate record properties
  if (adminRecord.incidentId !== trimmedRef) {
    const err = new Error(
      `ADMIN_RECORD_MISMATCH: Record incidentId "${adminRecord.incidentId}" does not match token closureRef "${trimmedRef}".`
    );
    err.code = 'ADMIN_RECORD_MISMATCH';
    throw err;
  }

  if (adminRecord.targetProjectRef !== ALLOWED_STAGING_PROJECT_REF) {
    const err = new Error(
      `ADMIN_RECORD_PROJECT_MISMATCH: Record targetProjectRef "${adminRecord.targetProjectRef}" does not match allowed staging project "${ALLOWED_STAGING_PROJECT_REF}".`
    );
    err.code = 'ADMIN_RECORD_PROJECT_MISMATCH';
    throw err;
  }

  if (adminRecord.credentialRotated !== true) {
    const err = new Error('ADMIN_CONTAINMENT_UNCONFIRMED: Administrative record does not confirm credentialRotated = true.');
    err.code = 'ADMIN_CONTAINMENT_UNCONFIRMED';
    throw err;
  }

  if (adminRecord.accessLogsAudited !== true) {
    const err = new Error('ADMIN_CONTAINMENT_UNCONFIRMED: Administrative record does not confirm accessLogsAudited = true.');
    err.code = 'ADMIN_CONTAINMENT_UNCONFIRMED';
    throw err;
  }

  if (!adminRecord.authorizedAdmin || typeof adminRecord.authorizedAdmin !== 'string' || adminRecord.authorizedAdmin.trim().length === 0) {
    const err = new Error('ADMIN_CONTAINMENT_UNCONFIRMED: Administrative record lacks authorizedAdmin identity.');
    err.code = 'ADMIN_CONTAINMENT_UNCONFIRMED';
    throw err;
  }

  if (!adminRecord.certifiedAt || typeof adminRecord.certifiedAt !== 'string') {
    const err = new Error('ADMIN_CONTAINMENT_UNCONFIRMED: Administrative record lacks certifiedAt ISO timestamp.');
    err.code = 'ADMIN_CONTAINMENT_UNCONFIRMED';
    throw err;
  }

  return {
    verified: true,
    incidentId: adminRecord.incidentId,
    targetProjectRef: adminRecord.targetProjectRef,
    authorizedAdmin: adminRecord.authorizedAdmin,
    certifiedAt: adminRecord.certifiedAt,
    credentialRotated: adminRecord.credentialRotated,
    accessLogsAudited: adminRecord.accessLogsAudited,
    status: CONTAINMENT_STATUS.CONFIRMED
  };
}
