/**
 * Auth Interceptor
 * Master Execution Framework — JOB W007
 * 
 * Enforces fail-safe authentication policy:
 * - Defaults to 'authenticated'.
 * - Rejects unauthenticated calls on protected endpoints before network dispatch.
 * - Allows 'public' ONLY when explicitly declared by caller/endpoint wrapper.
 */

import type { AuthPolicy } from '../types';
import { ApiAuthError } from '../errors';
import { authManager } from '../authManager';

export async function applyAuthHeaders(
  headers: Record<string, string>,
  policy: AuthPolicy = 'authenticated',
): Promise<Record<string, string>> {
  const result = { ...headers };

  if (policy === 'public') {
    // Public endpoint: do not inject Authorization unless caller explicitly provided one
    return result;
  }

  // Authenticated endpoint: acquire token
  const token = await authManager.getAccessToken();
  if (!token) {
    throw new ApiAuthError('Authentication required: no active session', 401);
  }

  result['Authorization'] = `Bearer ${token}`;
  return result;
}
