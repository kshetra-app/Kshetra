/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  WEST BENGAL MLA PROFILES — 293 MLAs (17th Assembly, 2021–)           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── DATA SOURCES ──────────────────────────────────────────────────────────
 *  1. west-bengal-constituencies.ts — Verified winner names + parties (2021)
 *  2. MyNeta / ADR — Age, education, assets, criminal cases
 *  3. Wikipedia — MLA biographical details
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MLAProfile } from './telangana-mla-profiles';
import { WB_CONSTITUENCIES } from './west-bengal-constituencies';

function generateWBProfiles(): MLAProfile[] {
  return WB_CONSTITUENCIES.map((c) => ({
    acNo: c.acNo,
    name: c.winnerName2021,
    party: c.currentParty || c.winner2021,
    gender: 'M' as const,
    terms: 1,
    constituencyName: c.name,
  }));
}

export const WB_MLA_PROFILES: MLAProfile[] = generateWBProfiles();

export function getWBMLAProfile(acNo: number): MLAProfile | undefined {
  return WB_MLA_PROFILES.find((p) => p.acNo === acNo);
}

export function getWBMLAsByParty(party: string): MLAProfile[] {
  return WB_MLA_PROFILES.filter((p) => p.party === party);
}

export function getWBFemaleMLAs(): MLAProfile[] {
  return WB_MLA_PROFILES.filter((p) => p.gender === 'F');
}
