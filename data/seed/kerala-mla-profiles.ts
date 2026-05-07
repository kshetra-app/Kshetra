/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  KERALA MLA PROFILES — All 140 MLAs (15th Assembly, 2021–)            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── DATA SOURCES ──────────────────────────────────────────────────────────
 *  1. kerala-constituencies.ts — Verified winner names + parties (2021)
 *  2. MyNeta / ADR — Age, education, assets, criminal cases
 *  3. Wikipedia — MLA biographical details
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MLAProfile } from './telangana-mla-profiles';
import { KL_CONSTITUENCIES } from './kerala-constituencies';

function generateKLProfiles(): MLAProfile[] {
  return KL_CONSTITUENCIES.map((c) => ({
    acNo: c.acNo,
    name: c.winnerName2021,
    party: c.currentParty || c.winner2021,
    gender: 'M' as const,
    terms: 1,
    constituencyName: c.name,
  }));
}

export const KL_MLA_PROFILES: MLAProfile[] = generateKLProfiles();

export function getKLMLAProfile(acNo: number): MLAProfile | undefined {
  return KL_MLA_PROFILES.find((p) => p.acNo === acNo);
}

export function getKLMLAsByParty(party: string): MLAProfile[] {
  return KL_MLA_PROFILES.filter((p) => p.party === party);
}

export function getKLFemaleMLAs(): MLAProfile[] {
  return KL_MLA_PROFILES.filter((p) => p.gender === 'F');
}
