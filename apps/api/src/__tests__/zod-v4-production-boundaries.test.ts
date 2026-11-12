import {
  breachIncidentReportSchema,
  dataErasureRequestSchema,
} from '../modules/compliance/schemas';
import { createApiKeyBodySchema } from '../modules/saasOnboarding/schemas';

describe('API production validation boundaries', () => {
  it('retains the explicit personal-data erasure confirmation message', () => {
    const parsed = dataErasureRequestSchema.safeParse({ confirmation: 'DELETE' });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(
        "Must explicitly provide confirmation phrase 'DELETE_MY_PERSONAL_DATA'",
      );
    }
  });

  it('rejects oversized API key scope lists and scope names', () => {
    const base = { name: 'Partner key', environment: 'live' as const };
    expect(
      createApiKeyBodySchema.safeParse({
        ...base,
        scopes: Array.from({ length: 51 }, () => 'geo:read'),
      }).success,
    ).toBe(false);
    expect(createApiKeyBodySchema.safeParse({ ...base, scopes: ['x'.repeat(81)] }).success).toBe(
      false,
    );
  });

  it('rejects incident reports with unbounded category lists', () => {
    const parsed = breachIncidentReportSchema.safeParse({
      severity: 'high',
      affectedCategories: Array.from({ length: 51 }, (_, index) => `category-${index}`),
      estimatedPrincipalsAffected: 1,
      summary: 'A valid incident summary.',
    });

    expect(parsed.success).toBe(false);
  });
});
