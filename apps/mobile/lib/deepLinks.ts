/**
 * Deep Link Configuration
 *
 * Supports both custom scheme (kshetra://) and universal links.
 * Routes:
 *   kshetra://constituency/{stateCode}-AC-{acNo}
 *   kshetra://issue/{id}
 *   kshetra://analytics
 *   kshetra://delimitation
 *   kshetra://search?q={query}
 *   kshetra://feed
 *   kshetra://dashboard
 */

import * as Linking from 'expo-linking';

/** Generate a shareable deep link for a constituency */
export function constituencyLink(stateCode: string, acNo: number): string {
  return Linking.createURL(`constituency/${stateCode}-AC-${acNo}`);
}

/** Generate a shareable deep link for an issue */
export function issueLink(issueId: string): string {
  return Linking.createURL(`issue/${issueId}`);
}

/** Generate a shareable deep link for analytics */
export function analyticsLink(): string {
  return Linking.createURL('analytics');
}

/** Generate a shareable deep link for delimitation */
export function delimitationLink(): string {
  return Linking.createURL('delimitation');
}

/** Generate a shareable deep link for search */
export function searchLink(query?: string): string {
  return Linking.createURL(`search${query ? `?q=${encodeURIComponent(query)}` : ''}`);
}

/**
 * Parse a deep link URL into route and params.
 */
export function parseDeepLink(url: string): { route: string; params: Record<string, string> } | null {
  try {
    const parsed = Linking.parse(url);
    if (!parsed.path) return null;

    const params: Record<string, string> = {};
    if (parsed.queryParams) {
      for (const [k, v] of Object.entries(parsed.queryParams)) {
        if (typeof v === 'string') params[k] = v;
      }
    }

    return { route: `/${parsed.path}`, params };
  } catch {
    return null;
  }
}

/**
 * Linking configuration for Expo Router.
 * This is referenced in app.json scheme.
 */
export const LINKING_PREFIX = Linking.createURL('/');

/**
 * Generate a share message with deep link.
 */
export function shareableConstituencyText(
  name: string,
  stateCode: string,
  acNo: number,
  party: string,
  mla: string,
): string {
  return [
    `📍 ${name} (AC ${acNo}), ${stateCode}`,
    `🏛️ MLA: ${mla} (${party})`,
    ``,
    `View on Kshetra: ${constituencyLink(stateCode, acNo)}`,
  ].join('\n');
}
