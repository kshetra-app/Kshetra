import type { ZodSchema } from 'zod';

/**
 * Result of a boundary validation: either parsed, typed data or a
 * human-readable error message suitable for a 400 response.
 */
export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Validate untrusted input at a service boundary using a Zod schema.
 * Returns the first issue as `field: message` so clients get actionable,
 * non-leaky feedback (Gold Standard Ch. 6 — defensive code at boundaries).
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const issue = result.error.issues[0];
  const path = issue.path.join('.');
  return { ok: false, error: path ? `${path}: ${issue.message}` : issue.message };
}
