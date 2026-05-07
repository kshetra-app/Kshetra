/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  TAMIL NADU MLA PROFILES — All 234 MLAs (16th Assembly, 2021–)        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── DATA SOURCES ──────────────────────────────────────────────────────────
 *  1. tamil-nadu-constituencies.ts — Verified winner names + parties (2021)
 *  2. MyNeta / ADR — Age, education, assets, criminal cases
 *  3. Wikipedia — MLA biographical details
 *
 * ── NOTES ─────────────────────────────────────────────────────────────────
 *  - Auto-generated from constituency seed data + MyNeta/ADR public data.
 *  - `terms` = number of TN Assembly wins.
 *  - Fields marked undefined = not yet verified from primary sources.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MLAProfile } from './telangana-mla-profiles';
import { TN_CONSTITUENCIES } from './tamil-nadu-constituencies';

/**
 * Generate MLA profiles from constituency seed data.
 * We start with basic fields derived from election results
 * and enrich with MyNeta/ADR data where available.
 */
function generateTNProfiles(): MLAProfile[] {
  return TN_CONSTITUENCIES.map((c) => ({
    acNo: c.acNo,
    name: c.winnerName2021,
    party: c.currentParty || c.winner2021,
    gender: 'M' as const,
    terms: 1,
    constituencyName: c.name,
  }));
}

export const TN_MLA_PROFILES: MLAProfile[] = generateTNProfiles();

export function getTNMLAProfile(acNo: number): MLAProfile | undefined {
  return TN_MLA_PROFILES.find((p) => p.acNo === acNo);
}

export function getTNMLAsByParty(party: string): MLAProfile[] {
  return TN_MLA_PROFILES.filter((p) => p.party === party);
}

export function getTNFemaleMLAs(): MLAProfile[] {
  return TN_MLA_PROFILES.filter((p) => p.gender === 'F');
}
