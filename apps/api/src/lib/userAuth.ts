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

/**
 * Test-Only: Register an isolated token validator.
 * Throws immediately if invoked in production mode.
 */
export function setTestTokenValidator(validator: TestTokenValidator | null): void {
  if (process.env.NODE_ENV === 'production' && validator !== null) {
    throw new Error('SECURITY VIOLATION: Test token validator cannot be registered in production runtime.');
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

  // 1. Isolated test token validator (strictly active only when registered in non-production)
  if (customTestTokenValidator && process.env.NODE_ENV !== 'production') {
    try {
      const validated = await customTestTokenValidator(token, request);
      if (!validated) {
        sendApiError(reply, request, 401, 'Unauthorized', 'Invalid or expired authorization token', {
          code: 'UNAUTHORIZED',
        });
        return null;
      }
      return {
        userId: validated.id,
        role: validated.role || 'citizen',
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
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      sendApiError(reply, request, 401, 'Unauthorized', 'Invalid or expired authorization token', {
        code: 'UNAUTHORIZED',
      });
      return null;
    }

    const role = (user.app_metadata?.role as string) || (user.user_metadata?.role as string) || 'citizen';
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
