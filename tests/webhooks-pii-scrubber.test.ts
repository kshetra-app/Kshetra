/**
 * tests/webhooks-pii-scrubber.test.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Gate W022-G3 / Gate C: Event Payload Allowlist & Zero-PII Scrutiny Suite
 *
 * Mandatory Verification Invariants:
 * 1. Allowlist enforcement: only authorized event types accepted (election.results.published, candidate.nomination.updated, boundary.delimitation.updated, test.ping).
 * 2. Unregistered event types rejected immediately with UNSUPPORTED_EVENT_TYPE.
 * 3. Strict schema validation (required fields, types, formats).
 * 4. Zero citizen PII exposure: reject phone, mobile, email, Aadhaar, voter_id, address at root level.
 * 5. Deep nested unknown-property rejection: reject PII and unvetted attributes in sub-objects (additionalProperties: false).
 */

import assert from 'node:assert';
import {
  ALLOWED_EVENT_TYPES,
  validateEventPayload,
} from '../apps/api/src/modules/webhooks/schemas.ts';

console.log('================================================================');
console.log('W022: EVENT PAYLOAD ALLOWLIST & ZERO-PII SCRUTINY SUITE');
console.log('Timestamp:', new Date().toISOString());
console.log('Authority: CTO DIRECTIVE W022-CTO-EXEC-001 (Gate C)');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function runCheck(id: string, description: string, fn: () => void) {
  try {
    fn();
    passCount++;
    console.log(`[PASS] ${id}: ${description}`);
  } catch (err: any) {
    failCount++;
    console.error(`[FAIL] ${id}: ${description}`);
    console.error(`       Error: ${err.message}`);
  }
}

// ─── 1. Supported Event Types Verification ───
runCheck('PII-01', 'Verify canonical allowlisted event types list', () => {
  assert.strictEqual(ALLOWED_EVENT_TYPES.length, 4);
  assert.ok(ALLOWED_EVENT_TYPES.includes('election.results.published'));
  assert.ok(ALLOWED_EVENT_TYPES.includes('candidate.nomination.updated'));
  assert.ok(ALLOWED_EVENT_TYPES.includes('boundary.delimitation.updated'));
  assert.ok(ALLOWED_EVENT_TYPES.includes('test.ping'));
});

runCheck('PII-02', 'Reject unregistered event type', () => {
  const result = validateEventPayload('user.registered', { event_id: '123' });
  assert.strictEqual(result.valid, false);
  assert.ok(result.error?.includes('UNSUPPORTED_EVENT_TYPE'));
});

runCheck('PII-03', 'Reject non-object payload (arrays, primitives, null)', () => {
  assert.strictEqual(validateEventPayload('test.ping', null).valid, false);
  assert.strictEqual(validateEventPayload('test.ping', [1, 2, 3]).valid, false);
  assert.strictEqual(validateEventPayload('test.ping', 'just a string').valid, false);
});

// ─── 2. test.ping Validation ───
runCheck('PII-04', 'Accept valid test.ping payload', () => {
  const validPing = {
    event_id: '11111111-1111-1111-1111-111111111111',
    timestamp: '2026-10-24T12:00:00.000Z',
    message: 'Webhook endpoint connectivity verification test.',
  };
  const result = validateEventPayload('test.ping', validPing);
  assert.strictEqual(result.valid, true);
});

runCheck('PII-05', 'Reject test.ping with missing required fields', () => {
  const missingMsg = {
    event_id: '11111111-1111-1111-1111-111111111111',
    timestamp: '2026-10-24T12:00:00.000Z',
  };
  const result = validateEventPayload('test.ping', missingMsg);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error?.includes('MISSING_REQUIRED_FIELD'));
});

runCheck('PII-06', 'Reject test.ping containing citizen PII (phone number)', () => {
  const piiPing = {
    event_id: '11111111-1111-1111-1111-111111111111',
    timestamp: '2026-10-24T12:00:00.000Z',
    message: 'Test ping',
    mobile: '+919876543210', // Prohibited PII
  };
  const result = validateEventPayload('test.ping', piiPing);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error?.includes('UNRECOGNIZED_PAYLOAD_FIELD'));
  assert.ok(result.error?.includes("'mobile'"));
});

// ─── 3. election.results.published Validation ───
runCheck('PII-07', 'Accept valid election.results.published payload', () => {
  const validResults = {
    event_id: '22222222-2222-2222-2222-222222222222',
    timestamp: '2026-10-24T14:30:00.000Z',
    election_id: 'telangana-assembly-2023',
    state_code: 'TG',
    constituency_code: 'TG-072',
    counting_round: 14,
    status: 'in_progress',
    summary: {
      total_votes_counted: 145230,
      margin: 8940,
      leading_candidate_id: '33333333-3333-3333-3333-333333333333',
      leading_party_code: 'INC',
    },
  };
  const result = validateEventPayload('election.results.published', validResults);
  assert.strictEqual(result.valid, true);
});

runCheck('PII-08', 'Reject election.results.published containing root voter Aadhaar or Voter ID PII', () => {
  const piiResults = {
    event_id: '22222222-2222-2222-2222-222222222222',
    timestamp: '2026-10-24T14:30:00.000Z',
    election_id: 'telangana-assembly-2023',
    state_code: 'TG',
    constituency_code: 'TG-072',
    counting_round: 14,
    status: 'in_progress',
    voter_aadhaar_hash: 'prohibited-aadhaar-data',
    summary: {
      total_votes_counted: 145230,
      margin: 8940,
      leading_candidate_id: '33333333-3333-3333-3333-333333333333',
      leading_party_code: 'INC',
    },
  };
  const result = validateEventPayload('election.results.published', piiResults);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error?.includes('UNRECOGNIZED_PAYLOAD_FIELD'));
  assert.ok(result.error?.includes("'voter_aadhaar_hash'"));
});

runCheck('PII-09', 'Reject election.results.published containing nested citizen contact PII in summary', () => {
  const nestedPiiResults = {
    event_id: '22222222-2222-2222-2222-222222222222',
    timestamp: '2026-10-24T14:30:00.000Z',
    election_id: 'telangana-assembly-2023',
    state_code: 'TG',
    constituency_code: 'TG-072',
    counting_round: 14,
    status: 'in_progress',
    summary: {
      total_votes_counted: 145230,
      margin: 8940,
      leading_candidate_id: '33333333-3333-3333-3333-333333333333',
      leading_party_code: 'INC',
      citizen_emails: ['voter1@example.com'], // Prohibited nested PII
    },
  };
  const result = validateEventPayload('election.results.published', nestedPiiResults);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error?.includes('UNRECOGNIZED_PAYLOAD_FIELD'));
  assert.ok(result.error?.includes("'summary.citizen_emails'"));
});

// ─── 4. candidate.nomination.updated Validation ───
runCheck('PII-10', 'Accept valid candidate.nomination.updated payload', () => {
  const validNomination = {
    event_id: '44444444-4444-4444-4444-444444444444',
    timestamp: '2026-10-24T11:00:00.000Z',
    candidate_id: '55555555-5555-5555-5555-555555555555',
    election_id: 'telangana-assembly-2023',
    nomination_status: 'scrutinized_valid',
    affidavit_hash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
  };
  const result = validateEventPayload('candidate.nomination.updated', validNomination);
  assert.strictEqual(result.valid, true);
});

runCheck('PII-11', 'Reject candidate.nomination.updated containing candidate private address or phone PII', () => {
  const piiNomination = {
    event_id: '44444444-4444-4444-4444-444444444444',
    timestamp: '2026-10-24T11:00:00.000Z',
    candidate_id: '55555555-5555-5555-5555-555555555555',
    election_id: 'telangana-assembly-2023',
    nomination_status: 'scrutinized_valid',
    affidavit_hash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    candidate_personal_phone: '+919999999999', // Prohibited private PII
  };
  const result = validateEventPayload('candidate.nomination.updated', piiNomination);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error?.includes('UNRECOGNIZED_PAYLOAD_FIELD'));
  assert.ok(result.error?.includes("'candidate_personal_phone'"));
});

// ─── 5. boundary.delimitation.updated Validation ───
runCheck('PII-12', 'Accept valid boundary.delimitation.updated payload', () => {
  const validDelimitation = {
    event_id: '66666666-6666-6666-6666-666666666666',
    timestamp: '2026-10-24T09:00:00.000Z',
    state_code: 'TG',
    constituency_code: 'TG-072',
    gazette_notification_number: 'ECI/NOTIFICATION/2026/042',
    boundary_geojson_sha256: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
  };
  const result = validateEventPayload('boundary.delimitation.updated', validDelimitation);
  assert.strictEqual(result.valid, true);
});

runCheck('PII-13', 'Reject boundary.delimitation.updated containing unvetted demographic survey records', () => {
  const piiDelimitation = {
    event_id: '66666666-6666-6666-6666-666666666666',
    timestamp: '2026-10-24T09:00:00.000Z',
    state_code: 'TG',
    constituency_code: 'TG-072',
    gazette_notification_number: 'ECI/NOTIFICATION/2026/042',
    boundary_geojson_sha256: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    survey_respondent_names: ['Citizen A', 'Citizen B'], // Prohibited PII
  };
  const result = validateEventPayload('boundary.delimitation.updated', piiDelimitation);
  assert.strictEqual(result.valid, false);
  assert.ok(result.error?.includes('UNRECOGNIZED_PAYLOAD_FIELD'));
  assert.ok(result.error?.includes("'survey_respondent_names'"));
});


runCheck('PII-14', 'Reject wrong integer type in election summary', () => {
  const bad = { event_id: '22222222-2222-2222-2222-222222222222', timestamp: '2026-10-24T14:30:00.000Z',
    election_id: 'telangana-assembly-2023', state_code: 'TG', constituency_code: 'TG-072',
    counting_round: '14', status: 'in_progress',
    summary: { total_votes_counted: 10, margin: 2, leading_candidate_id: '33333333-3333-3333-3333-333333333333', leading_party_code: 'INC' } };
  assert.strictEqual(validateEventPayload('election.results.published', bad).valid, false);
});
runCheck('PII-15', 'Reject malformed ISO date-time timestamp', () => {
  assert.strictEqual(validateEventPayload('test.ping', { event_id: '11111111-1111-1111-1111-111111111111', timestamp: 'tomorrow', message: 'test' }).valid, false);
});
runCheck('PII-16', 'Reject enum outside the event allowlist', () => {
  const bad = { event_id: '22222222-2222-2222-2222-222222222222', timestamp: '2026-10-24T14:30:00.000Z',
    election_id: 'telangana-assembly-2023', state_code: 'TG', constituency_code: 'TG-072',
    counting_round: 1, status: 'maybe', summary: { total_votes_counted: 10, margin: 2, leading_candidate_id: '33333333-3333-3333-3333-333333333333', leading_party_code: 'INC' } };
  assert.strictEqual(validateEventPayload('election.results.published', bad).valid, false);
});
runCheck('PII-17', 'Reject malformed state-code pattern', () => {
  const bad = { event_id: '66666666-6666-6666-6666-666666666666', timestamp: '2026-10-24T09:00:00.000Z',
    state_code: 'Telangana', constituency_code: 'TG-072', gazette_notification_number: 'ECI/042', boundary_geojson_sha256: 'a'.repeat(64) };
  assert.strictEqual(validateEventPayload('boundary.delimitation.updated', bad).valid, false);
});
runCheck('PII-18', 'Reject negative election summary margin', () => {
  const bad = { event_id: '22222222-2222-2222-2222-222222222222', timestamp: '2026-10-24T14:30:00.000Z',
    election_id: 'telangana-assembly-2023', state_code: 'TG', constituency_code: 'TG-072',
    counting_round: 1, status: 'declared', summary: { total_votes_counted: 10, margin: -1, leading_candidate_id: '33333333-3333-3333-3333-333333333333', leading_party_code: 'INC' } };
  assert.strictEqual(validateEventPayload('election.results.published', bad).valid, false);
});
runCheck('PII-19', 'Reject oversized test-ping message', () => {
  assert.strictEqual(validateEventPayload('test.ping', { event_id: '11111111-1111-1111-1111-111111111111', timestamp: '2026-10-24T12:00:00.000Z', message: 'x'.repeat(257) }).valid, false);
});

runCheck('PII-20', 'Reject unallowlisted nested properties', () => {
  const bad = {
    event_id: '22222222-2222-2222-2222-222222222222', timestamp: '2026-10-24T14:30:00.000Z',
    election_id: 'telangana-assembly-2023', state_code: 'TG', constituency_code: 'TG-072',
    counting_round: 1, status: 'declared',
    summary: { total_votes_counted: 10, margin: 2, leading_candidate_id: '33333333-3333-3333-3333-333333333333', leading_party_code: 'INC', personal_phone_number: '9999999999' }
  };
  assert.strictEqual(validateEventPayload('election.results.published', bad).valid, false);
});

// ─── Summary ───
console.log('\n----------------------------------------------------------------');
console.log(`Results: ${passCount} passed, ${failCount} failed.`);
console.log('----------------------------------------------------------------\n');
if (failCount > 0) {
  process.exit(1);
}
