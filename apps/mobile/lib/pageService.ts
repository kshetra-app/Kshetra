/**
 * Page Entitlement Service (Ticket 0.4)
 *
 * Checks Page subscription status via backend API.
 * Mobile app never renders in-app pricing or purchase buttons (App Store guideline compliant).
 * Subscriptions are managed strictly on the web console (kshetra.app/manage).
 */

export interface PageEntitlement {
  pageId: string;
  isPro: boolean;
  plan: 'free' | 'pro';
  expiresAt: string | null;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://kshetra-api-production-9f06.up.railway.app';

/**
 * Query whether a Page has Page Pro unlocked.
 */
export async function fetchPageEntitlement(pageId: string): Promise<PageEntitlement> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/pages/${pageId}/entitlement`);
    if (!res.ok) {
      return { pageId, isPro: false, plan: 'free', expiresAt: null };
    }
    const data = await res.json();
    return {
      pageId: data.pageId ?? pageId,
      isPro: !!data.isPro,
      plan: data.plan ?? (data.isPro ? 'pro' : 'free'),
      expiresAt: data.expiresAt ?? null,
    };
  } catch (_) {
    // Offline / fallback default
    return { pageId, isPro: false, plan: 'free', expiresAt: null };
  }
}
