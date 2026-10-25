/**
 * User Authentication & Authorization Resolver for API Routes
 * Enforces verified user identity, disallows production x-user-id header spoofing,
 * validates bearer tokens via Supabase Auth, and provides resource-level anti-spoofing assertions.
 * Master Execution Framework — W021.5-H-04 / CTO Directive 139
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase, isSupabaseConfigured } from './supabase';
import { sendApiError } from './replyHelper';

export interface AuthenticatedUser {
  userId: string;
  role: string;
}

export type TestTokenValidator = (
  token: string,
  request: FastifyRequest
) => Promise<{ id: string; role?: string } | null> | { id: string; role?: string } | null;

let customTestTokenValidator: TestTokenValidator | null = null;

export const VALID_ROLES = new Set([
  'citizen',
  'moderator',
  'admin',
  'contributor',
  'volunteer',
  'coordinator',
]);

/**
 * Extracts the authoritative role for a user.
 * Privileged roles must derive ONLY from server-managed app_metadata.role or server-side authoritative lookup.
 * user_metadata is caller-supplied and must NEVER be trusted for role authority.
 * Unknown or malformed roles fail closed to 'citizen'.
 */
export function extractAuthoritativeRole(user: any): string {
  const roleCandidate = typeof user?.app_metadata?.role === 'string'
    ? user.app_metadata.role.trim().toLowerCase()
    : '';
  return VALID_ROLES.has(roleCandidate) ? roleCandidate : 'citizen';
}

/**
 * Test-Only: Register an isolated token validator.
 * Strictly gated: throws immediately unless NODE_ENV === 'test' AND TEST_HARNESS_ACTIVE === 'true'.
 */
export function setTestTokenValidator(validator: TestTokenValidator | null): void {
  if (validator !== null) {
    if (process.env.NODE_ENV !== 'test' || process.env.TEST_HARNESS_ACTIVE !== 'true') {
      throw new Error('SECURITY VIOLATION: Test token validator can only be registered when NODE_ENV === "test" and TEST_HARNESS_ACTIVE === "true".');
    }
  }
  customTestTokenValidator = validator;
}

/**
 * Resolves the authenticated user from the request.
 * If authentication fails, automatically sends an appropriate error response (401/500/503) and returns null.
 */
export async function resolveAuthenticatedUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.authorization;

  // Compatibility for legacy header-based fixtures is confined to the explicit
  // Jest harness. Production/staging never trust x-user-id or x-user-role.
  const testUserHeader = request.headers['x-user-id'];
  if (
    (!authHeader || !authHeader.startsWith('Bearer ')) &&
    process.env.NODE_ENV === 'test' &&
    process.env.TEST_HARNESS_ACTIVE === 'true' &&
    typeof testUserHeader === 'string' &&
    testUserHeader.trim() !== '' &&
    customTestTokenValidator
  ) {
    try {
      const validated = await customTestTokenValidator(`test-harness:${testUserHeader.trim()}`, request);
      if (validated) {
        const rawRole = typeof validated.role === 'string' ? validated.role.trim().toLowerCase() : '';
        return {
          userId: validated.id,
          role: VALID_ROLES.has(rawRole) ? rawRole : 'citizen',
        };
      }
    } catch {
      // Test-harness identity errors fail closed through the normal 401 response.
    }
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendApiError(reply, request, 401, 'Unauthorized', 'Authentication required: missing or malformed Bearer token', {
      code: 'UNAUTHORIZED',
    });
    return null;
  }

  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  if (!token || token === 'invalid-token' || token === 'expired-token') {
    sendApiError(reply, request, 401, 'Unauthorized', 'Invalid or expired authorization token', {
      code: 'UNAUTHORIZED',
    });
    return null;
  }

  // 1. Isolated test token validator (strictly active only when registered in isolated test harness)
  if (customTestTokenValidator && process.env.NODE_ENV === 'test' && process.env.TEST_HARNESS_ACTIVE === 'true' && token.startsWith('test-harness:')) {
    try {
      const validated = await customTestTokenValidator(token, request);
      if (!validated) {
        sendApiError(reply, request, 401, 'Unauthorized', 'Invalid or expired authorization token', {
          code: 'UNAUTHORIZED',
        });
        return null;
      }
      const rawRole = typeof validated.role === 'string' ? validated.role.trim().toLowerCase() : '';
      const sanitizedRole = VALID_ROLES.has(rawRole) ? rawRole : 'citizen';
      return {
        userId: validated.id,
        role: sanitizedRole,
      };
    } catch (err: any) {
      sendApiError(reply, request, 500, 'Internal Server Error', 'Authentication validation failure', {
        code: 'AUTH_ERROR',
      });
      return null;
    }
  }

  // 2. Production-capable provider validation via Supabase Auth
  if (!isSupabaseConfigured) {
    sendApiError(reply, request, 503, 'Service Unavailable', 'Authentication provider is unconfigured or unavailable', {
      code: 'AUTH_PROVIDER_UNAVAILABLE',
    });
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    const user = data?.user;
    if (error || !user) {
      sendApiError(reply, request, 401, 'Unauthorized', 'Invalid or expired authorization token', {
        code: 'UNAUTHORIZED',
      });
      return null;
    }

    const role = extractAuthoritativeRole(user);
    return {
      userId: user.id,
      role,
    };
  } catch (err: any) {
    sendApiError(reply, request, 500, 'Internal Server Error', 'Authentication service unavailable', {
      code: 'AUTH_ERROR',
    });
    return null;
  }
}

/**
 * Asserts that the target user ID specified in payload or query matches the authenticated user ID.
 * Returns true if valid, or sends 403 Forbidden and returns false if identity spoofing is detected.
 */
export function assertActingUserMatch(
  reply: FastifyReply,
  request: FastifyRequest,
  authenticatedUserId: string,
  suppliedUserId: string | undefined,
  fieldLabel: string = 'userId'
): boolean {
  if (suppliedUserId && suppliedUserId !== authenticatedUserId) {
    sendApiError(
      reply,
      request,
      403,
      'Forbidden',
      `Identity spoofing rejected: supplied ${fieldLabel} does not match authenticated user`,
      { code: 'FORBIDDEN' }
    );
    return false;
  }
  return true;
}
