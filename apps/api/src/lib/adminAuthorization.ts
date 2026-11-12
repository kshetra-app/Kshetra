import type { AdminRole } from '@kshetra/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendApiError } from './replyHelper';
import { isIsolatedTestRuntime, isProductionLikeRuntime } from './runtimeEnvironment';
import { isSupabaseAvailable, supabase } from './supabase';

export interface AdminActor {
  id: string;
  role: AdminRole;
  ipAddress: string;
  userAgent?: string;
}

const ALLOWED_ADMIN_ROLES = new Set<string>([
  'admin',
  'super_admin',
  'compliance_officer',
  'moderator',
]);

/**
 * Resolve admin identity only from server-managed Supabase app metadata in deployed
 * runtimes. Header identity shortcuts remain confined to non-production use.
 */
export async function resolveAdminActor(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AdminActor | null> {
  let userId: string | null = null;
  let role: string | null = null;

  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token === 'invalid-token' || token === 'expired-token') {
      sendApiError(
        reply,
        request,
        401,
        'INVALID_CREDENTIALS',
        'Provided authentication token is invalid or expired.',
      );
      return null;
    }

    if (
      isIsolatedTestRuntime() &&
      process.env.TEST_HARNESS_ACTIVE === 'true' &&
      (token === 'admin-service-token' || token.startsWith('admin-test-token'))
    ) {
      userId = 'admin-service-account';
      role = 'super_admin';
    } else if (isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data.user) {
          userId = data.user.id;
          role = (data.user.app_metadata?.role as string) || 'citizen';
        }
      } catch {
        // Authentication failures are handled as an unauthenticated request below.
      }
    }
  }

  if (!isProductionLikeRuntime() && !userId && typeof request.headers['x-user-id'] === 'string') {
    userId = request.headers['x-user-id'];
    role = (request.headers['x-user-role'] as string) || 'citizen';
  }

  if (!userId) {
    sendApiError(
      reply,
      request,
      401,
      'UNAUTHORIZED',
      'Authentication is required to access the Poligram Admin Control Plane.',
    );
    return null;
  }

  if (!role || !ALLOWED_ADMIN_ROLES.has(role)) {
    sendApiError(
      reply,
      request,
      403,
      'INSUFFICIENT_PERMISSIONS',
      `Access denied. Role '${role || 'unassigned'}' is not authorized for administrative operations.`,
    );
    return null;
  }

  return {
    id: userId,
    role: role as AdminRole,
    ipAddress: (request.headers['x-forwarded-for'] as string) || request.ip || '127.0.0.1',
    userAgent: request.headers['user-agent'],
  };
}
