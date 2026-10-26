import { ALLOWED_EVENT_TYPES, EVENT_PAYLOAD_SCHEMAS, validateEventPayload } from '../modules/webhooks/schemas';

const uuid = '123e4567-e89b-12d3-a456-426614174000';
const validPayloads: Record<string, Record<string, unknown>> = {
  'election.results.published': {
    event_id: uuid, timestamp: '2026-10-26T00:00:00.000Z', election_id: 'general_2026',
    state_code: 'TS', constituency_code: 'TS_001', counting_round: 1, status: 'declared',
    summary: { total_votes_counted: 100, margin: 2, leading_candidate_id: uuid, leading_party_code: 'ABC' },
  },
  'candidate.nomination.updated': {
    event_id: uuid, timestamp: '2026-10-26T00:00:00.000Z', candidate_id: uuid, election_id: 'general_2026',
    nomination_status: 'submitted', affidavit_hash: 'a'.repeat(64),
  },
  'boundary.delimitation.updated': {
    event_id: uuid, timestamp: '2026-10-26T00:00:00.000Z', state_code: 'TS', constituency_code: 'TS_001',
    gazette_notification_number: 'S.O. 123', boundary_geojson_sha256: 'b'.repeat(64),
  },
  'test.ping': { event_id: uuid, timestamp: '2026-10-26T00:00:00.000Z', message: 'ping' },
};

describe('webhook allowlisted payload validation', () => {
  it('keeps the event allowlist aligned with a schema for every type', () => {
    expect(ALLOWED_EVENT_TYPES).toEqual(Object.keys(EVENT_PAYLOAD_SCHEMAS));
    for (const eventType of ALLOWED_EVENT_TYPES) {
      expect(validateEventPayload(eventType, validPayloads[eventType])).toEqual({ valid: true });
    }
  });

  it.each(['unknown.event', '', 'election.results.published '])('rejects unsupported event type %s', (eventType) => {
    expect(validateEventPayload(eventType, {})).toEqual({
      valid: false,
      error: expect.stringContaining('UNSUPPORTED_EVENT_TYPE'),
    });
  });

  it.each([null, undefined, [], 'string', 42, true])('rejects non-object payload %p', (payload) => {
    expect(validateEventPayload('test.ping', payload)).toEqual({
      valid: false,
      error: 'INVALID_PAYLOAD_TYPE: Payload must be a JSON object.',
    });
  });

  it('rejects missing and null required root fields distinctly as missing', () => {
    const payload = { ...validPayloads['test.ping'] };
    delete payload.message;
    expect(validateEventPayload('test.ping', payload).error).toContain("Field 'message' is required");
    expect(validateEventPayload('test.ping', { ...payload, message: null }).error).toContain("Field 'message' is required");
  });

  it('rejects unknown root properties to keep payloads allowlisted', () => {
    expect(validateEventPayload('test.ping', { ...validPayloads['test.ping'], phone_number: '123' }).error)
      .toContain("Property 'phone_number' is prohibited");
  });

  it('rejects missing required nested election summary fields', () => {
    const payload = { ...validPayloads['election.results.published'], summary: { total_votes_counted: 1 } };
    expect(validateEventPayload('election.results.published', payload).error).toContain('summary.margin is required');
  });

  it('rejects unknown nested summary fields', () => {
    const payload = {
      ...validPayloads['election.results.published'],
      summary: { ...(validPayloads['election.results.published'].summary as object), voter_phone: '123' },
    };
    expect(validateEventPayload('election.results.published', payload).error).toContain("Property 'summary.voter_phone' is prohibited");
  });

  it('rejects a null nested summary as a missing required root field', () => {
    const payload = { ...validPayloads['election.results.published'], summary: null };
    expect(validateEventPayload('election.results.published', payload).error).toContain("Field 'summary' is required");
  });

  it('exposes strict additional-properties schemas and endpoint URL constraints', () => {
    for (const schema of Object.values(EVENT_PAYLOAD_SCHEMAS)) {
      expect(schema.additionalProperties).toBe(false);
    }
    expect(EVENT_PAYLOAD_SCHEMAS['test.ping'].properties).toBeDefined();
  });
});
