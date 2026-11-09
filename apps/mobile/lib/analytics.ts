import Constants from 'expo-constants';
import type { UniversalAnalyticsEventDTO } from '@kshetra/shared';
import type { ApiClient } from './api/client';
import { authManager } from './api/authManager';
import { mmkvStorage } from './storage';

const ANONYMOUS_ID_KEY = 'poligram.analytics.anonymous-id';
let sessionId = createOpaqueId('session');

export interface ProductEventContext {
  screen: string;
  constituencyId?: string | null;
  entityType?: string;
  entityId?: string;
}

function createOpaqueId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

/** Start a fresh analytics session when the authenticated app session changes. */
export function startProductAnalyticsSession(): void {
  sessionId = createOpaqueId('session');
}

async function getAnonymousId(): Promise<string> {
  try {
    const stored = await mmkvStorage.getItem(ANONYMOUS_ID_KEY);
    if (stored) return stored;
    const created = createOpaqueId('anon');
    await mmkvStorage.setItem(ANONYMOUS_ID_KEY, created);
    return created;
  } catch {
    return createOpaqueId('anon');
  }
}

/**
 * Best-effort product telemetry. It runs after a successful product action and
 * never blocks or changes the result of that action. User identity is omitted
 * from the payload; the API binds it only when it validates the bearer token.
 */
export async function trackProductEvent(
  client: ApiClient,
  eventName: string,
  context: ProductEventContext,
): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;

  try {
    const accessToken = await authManager.getAccessToken().catch(() => null);
    const event: UniversalAnalyticsEventDTO = {
      eventName,
      anonymousId: await getAnonymousId(),
      sessionId,
      timestamp: new Date().toISOString(),
      screen: context.screen,
      geography: context.constituencyId ? { acId: context.constituencyId } : {},
      entity:
        context.entityType || context.entityId
          ? { entityType: context.entityType, entityId: context.entityId }
          : {},
      metadata: {},
      appVersion: Constants.expoConfig?.version || 'unknown',
    };
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    await client.request('/api/v1/analytics/events', {
      method: 'POST',
      authPolicy: 'public',
      headers,
      body: { events: [event] },
      timeoutMs: 2000,
      totalBudgetMs: 2500,
      retries: 0,
    });
  } catch {
    // Product analytics is observational and must never break user actions.
  }
}
