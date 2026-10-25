/**
 * apps/api/src/modules/webhooks/schemas.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Strict Allowlisted Event Payload Schemas (additionalProperties: false)
 * and Fastify Route Validation Schemas.
 */

export interface WebhookSubscriptionModel {
  id: string;
  tenantId: string;
  applicationId: string;
  endpointUrl: string;
  secretHint: string;
  secretHash: string;
  subscribedEvents: string[];
  status: 'active' | 'paused' | 'disabled' | 'failed';
  consecutiveFailureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryModel {
  id: string;
  tenantId: string;
  subscriptionId: string;
  eventId: string;
  attemptCount: number;
  status: 'queued' | 'leased' | 'delivered' | 'retrying' | 'dead_letter';
  httpStatus?: number | null;
  executionDurationMs?: number | null;
  errorMessage?: string | null;
  nextRetryAt?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface WebhookEventModel {
  id: string;
  tenantId: string;
  eventType: string;
  idempotencyKey?: string | null;
  payload: Record<string, unknown>;
  payloadRaw: string;
  payloadSha256: string;
  createdAt: string;
}

// ─── STRICT ALLOWLISTED EVENT SCHEMAS (ZERO PII & ADDITIONAL PROPERTIES: FALSE) ───

export const ALLOWED_EVENT_TYPES = [
  'election.results.published',
  'candidate.nomination.updated',
  'boundary.delimitation.updated',
  'test.ping',
] as const;

export type AllowedEventType = (typeof ALLOWED_EVENT_TYPES)[number];

export const EVENT_PAYLOAD_SCHEMAS: Record<string, Record<string, unknown>> = {
  'election.results.published': {
    type: 'object',
    additionalProperties: false,
    required: [
      'event_id',
      'timestamp',
      'election_id',
      'state_code',
      'constituency_code',
      'counting_round',
      'status',
      'summary',
    ],
    properties: {
      event_id: { type: 'string', pattern: '^[0-9a-fA-F-]{36}$' },
      timestamp: { type: 'string' },
      election_id: { type: 'string', pattern: '^[a-z0-9_-]+$' },
      state_code: { type: 'string', pattern: '^[A-Z]{2}$' },
      constituency_code: { type: 'string', pattern: '^[A-Z0-9_-]+$' },
      counting_round: { type: 'integer', minimum: 1 },
      status: { type: 'string', enum: ['in_progress', 'declared', 'recount'] },
      summary: {
        type: 'object',
        additionalProperties: false,
        required: ['total_votes_counted', 'margin', 'leading_candidate_id', 'leading_party_code'],
        properties: {
          total_votes_counted: { type: 'integer', minimum: 0 },
          margin: { type: 'integer', minimum: 0 },
          leading_candidate_id: { type: 'string', pattern: '^[0-9a-fA-F-]{36}$' },
          leading_party_code: { type: 'string', pattern: '^[A-Z0-9]+$' },
        },
      },
    },
  },

  'candidate.nomination.updated': {
    type: 'object',
    additionalProperties: false,
    required: ['event_id', 'timestamp', 'candidate_id', 'election_id', 'nomination_status', 'affidavit_hash'],
    properties: {
      event_id: { type: 'string', pattern: '^[0-9a-fA-F-]{36}$' },
      timestamp: { type: 'string' },
      candidate_id: { type: 'string', pattern: '^[0-9a-fA-F-]{36}$' },
      election_id: { type: 'string', pattern: '^[a-z0-9_-]+$' },
      nomination_status: { type: 'string', enum: ['submitted', 'scrutinized_valid', 'rejected', 'withdrawn'] },
      affidavit_hash: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    },
  },

  'boundary.delimitation.updated': {
    type: 'object',
    additionalProperties: false,
    required: ['event_id', 'timestamp', 'state_code', 'constituency_code', 'gazette_notification_number', 'boundary_geojson_sha256'],
    properties: {
      event_id: { type: 'string', pattern: '^[0-9a-fA-F-]{36}$' },
      timestamp: { type: 'string' },
      state_code: { type: 'string', pattern: '^[A-Z]{2}$' },
      constituency_code: { type: 'string', pattern: '^[A-Z0-9_-]+$' },
      gazette_notification_number: { type: 'string' },
      boundary_geojson_sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    },
  },

  'test.ping': {
    type: 'object',
    additionalProperties: false,
    required: ['event_id', 'timestamp', 'message'],
    properties: {
      event_id: { type: 'string', pattern: '^[0-9a-fA-F-]{36}$' },
      timestamp: { type: 'string' },
      message: { type: 'string', maxLength: 256 },
    },
  },
};

/**
 * Validates an event payload against the authoritative allowlisted schema.
 * Rejects unknown properties at any level (additionalProperties: false).
 */
export function validateEventPayload(
  eventType: string,
  payload: unknown
): { valid: boolean; error?: string } {
  if (!ALLOWED_EVENT_TYPES.includes(eventType as AllowedEventType)) {
    return { valid: false, error: `UNSUPPORTED_EVENT_TYPE: Event '${eventType}' is not an authorized webhook event.` };
  }

  const schema = EVENT_PAYLOAD_SCHEMAS[eventType];
  if (!schema) {
    return { valid: false, error: `SCHEMA_MISSING: No schema registered for event '${eventType}'.` };
  }

  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'INVALID_PAYLOAD_TYPE: Payload must be a JSON object.' };
  }

  const record = payload as Record<string, unknown>;

  // Check required root properties
  const required = (schema.required as string[]) || [];
  for (const field of required) {
    if (record[field] === undefined || record[field] === null) {
      return { valid: false, error: `MISSING_REQUIRED_FIELD: Field '${field}' is required.` };
    }
  }

  // Check for unknown root properties (additionalProperties: false)
  const allowedProperties = schema.properties as Record<string, any>;
  for (const key of Object.keys(record)) {
    if (!allowedProperties[key]) {
      return { valid: false, error: `UNRECOGNIZED_PAYLOAD_FIELD: Property '${key}' is prohibited by allowlisted schema.` };
    }
  }

  // Validate nested objects
  if (eventType === 'election.results.published' && record.summary) {
    const summary = record.summary as Record<string, unknown>;
    const summarySchema = allowedProperties.summary;
    const summaryRequired = (summarySchema.required as string[]) || [];
    for (const field of summaryRequired) {
      if (summary[field] === undefined || summary[field] === null) {
        return { valid: false, error: `MISSING_REQUIRED_FIELD: summary.${field} is required.` };
      }
    }
    const allowedSummaryProps = summarySchema.properties as Record<string, any>;
    for (const key of Object.keys(summary)) {
      if (!allowedSummaryProps[key]) {
        return { valid: false, error: `UNRECOGNIZED_PAYLOAD_FIELD: Property 'summary.${key}' is prohibited.` };
      }
    }
  }

  return { valid: true };
}

// ─── FASTIFY ROUTE VALIDATION SCHEMAS ───

export const createWebhookBodySchema = {
  type: 'object',
  required: ['endpointUrl'],
  additionalProperties: false,
  properties: {
    endpointUrl: { type: 'string', format: 'uri', pattern: '^https://.+' },
    subscribedEvents: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      default: ['*'],
    },
  },
};

export const updateWebhookBodySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    endpointUrl: { type: 'string', format: 'uri', pattern: '^https://.+' },
    subscribedEvents: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
    },
    status: {
      type: 'string',
      enum: ['active', 'paused', 'disabled'],
    },
  },
};

export const webhookIdParamSchema = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: '^[0-9a-fA-F-]{36}$' },
  },
};
