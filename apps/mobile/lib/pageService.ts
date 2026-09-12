/**
 * Page Entitlement Service (Ticket 0.4)
 *
 * Checks Page subscription status via backend API.
 * Mobile app never renders in-app pricing or purchase buttons (App Store guideline compliant).
 * Subscriptions are managed strictly on the web console (kshetra.app/manage).
 */

import { apiClient } from './api';
// Migrated from legacy ad-hoc API_BASE_URL endpoint to canonical apiClient

export interface PageEntitlement {
  pageId: string;
  isPro: boolean;
  plan: 'free' | 'pro';
  expiresAt: string | null;
}

/**
 * Query whether a Page has Page Pro unlocked.
 * Uses canonical apiClient with fail-closed fallback to free plan on any error/offline condition.
 */
export async function fetchPageEntitlement(pageId: string): Promise<PageEntitlement> {
  try {
    const data = await apiClient.pages.getEntitlement(pageId);
    return {
      pageId: data.pageId ?? pageId,
      isPro: !!data.isPro,
      plan: data.plan ?? (data.isPro ? 'pro' : 'free'),
      expiresAt: data.expiresAt ?? null,
    };
  } catch (_) {
    // Offline / fallback default — strictly preserves fallback semantics
    return { pageId, isPro: false, plan: 'free', expiresAt: null };
  }
}
