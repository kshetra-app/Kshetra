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
      timestamp: { type: 'string', format: 'date-time' },
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
      timestamp: { type: 'string', format: 'date-time' },
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
      timestamp: { type: 'string', format: 'date-time' },
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
      timestamp: { type: 'string', format: 'date-time' },
      message: { type: 'string', maxLength: 256 },
    },
  },
};

/**
 * Recursively enforces the event allowlist schema (types, formats, patterns,
 * enums, numeric bounds, required keys and unknown-property rejection).
 */
function validateSchemaValue(path: string, value: unknown, schemaValue: unknown): string | undefined {
  if (!schemaValue || typeof schemaValue !== 'object' || Array.isArray(schemaValue)) {
    return `SCHEMA_INVALID: Schema definition for '${path}' is invalid.`;
  }
  const schema = schemaValue as Record<string, unknown>;
  const displayPath = path || 'payload';
  if (schema.type === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return `INVALID_FIELD_VALUE: '${displayPath}' must be an object.`;
    }
    const record = value as Record<string, unknown>;
    const required = Array.isArray(schema.required) ? schema.required as string[] : [];
    const properties = schema.properties && typeof schema.properties === 'object'
      ? schema.properties as Record<string, unknown> : {};
    for (const field of required) {
      if (record[field] === undefined || record[field] === null) {
        return `MISSING_REQUIRED_FIELD: ${path ? `${path}.` : ''}${field} is required.`;
      }
    }
    for (const key of Object.keys(record)) {
      if (!Object.prototype.hasOwnProperty.call(properties, key)) {
        if (schema.additionalProperties === false) {
          return `UNRECOGNIZED_PAYLOAD_FIELD: Property '${path ? `${path}.` : ''}${key}' is prohibited by allowlisted schema.`;
        }
        continue;
      }
      const nestedError = validateSchemaValue(path ? `${path}.${key}` : key, record[key], properties[key]);
      if (nestedError) return nestedError;
    }
    return undefined;
  }
  if (schema.type === 'string') {
    if (typeof value !== 'string') return `INVALID_FIELD_VALUE: '${displayPath}' must be a string.`;
    if (typeof schema.pattern === 'string' && !(new RegExp(schema.pattern)).test(value)) {
      return `INVALID_FIELD_VALUE: '${displayPath}' does not match the required format.`;
    }
    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
      return `INVALID_FIELD_VALUE: '${displayPath}' is not an allowed value.`;
    }
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
      return `INVALID_FIELD_VALUE: '${displayPath}' exceeds the maximum length.`;
    }
    if (schema.format === 'date-time') {
      const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
      if (!iso.test(value) || !Number.isFinite(Date.parse(value))) {
        return `INVALID_FIELD_VALUE: '${displayPath}' must be an ISO-8601 date-time with timezone.`;
      }
    }
    return undefined;
  }
  if (schema.type === 'integer') {
    if (typeof value !== 'number' || !Number.isInteger(value)) return `INVALID_FIELD_VALUE: '${displayPath}' must be an integer.`;
    if (typeof schema.minimum === 'number' && value < schema.minimum) return `INVALID_FIELD_VALUE: '${displayPath}' is below its minimum.`;
    if (typeof schema.maximum === 'number' && value > schema.maximum) return `INVALID_FIELD_VALUE: '${displayPath}' exceeds its maximum.`;
    return undefined;
  }
  return `SCHEMA_INVALID: Unsupported schema type for '${displayPath}'.`;
}

export function validateEventPayload(eventType: string, payload: unknown): { valid: boolean; error?: string } {
  if (!ALLOWED_EVENT_TYPES.includes(eventType as AllowedEventType)) {
    return { valid: false, error: `UNSUPPORTED_EVENT_TYPE: Event '${eventType}' is not an authorized webhook event.` };
  }
  const schema = EVENT_PAYLOAD_SCHEMAS[eventType];
  if (!schema) return { valid: false, error: `SCHEMA_MISSING: No schema registered for event '${eventType}'.` };
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valid: false, error: 'INVALID_PAYLOAD_TYPE: Payload must be a JSON object.' };
  }
  const error = validateSchemaValue('', payload, schema);
  return error ? { valid: false, error } : { valid: true };
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
