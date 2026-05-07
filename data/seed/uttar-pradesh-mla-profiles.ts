/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  UTTAR PRADESH MLA PROFILES — 401 MLAs (18th Assembly, 2022–)         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── DATA SOURCES ──────────────────────────────────────────────────────────
 *  1. uttar-pradesh-constituencies.ts — Verified winner names + parties (2022)
 *  2. MyNeta / ADR — Age, education, assets, criminal cases
 *  3. Wikipedia — MLA biographical details
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MLAProfile } from './telangana-mla-profiles';
import { UP_CONSTITUENCIES } from './uttar-pradesh-constituencies';

function generateUPProfiles(): MLAProfile[] {
  return UP_CONSTITUENCIES.map((c) => ({
    acNo: c.acNo,
    name: c.winnerName2022,
    party: c.currentParty || c.winner2022,
    gender: 'M' as const,
    terms: 1,
    constituencyName: c.name,
  }));
}

export const UP_MLA_PROFILES: MLAProfile[] = generateUPProfiles();

export function getUPMLAProfile(acNo: number): MLAProfile | undefined {
  return UP_MLA_PROFILES.find((p) => p.acNo === acNo);
}

export function getUPMLAsByParty(party: string): MLAProfile[] {
  return UP_MLA_PROFILES.filter((p) => p.party === party);
}

export function getUPFemaleMLAs(): MLAProfile[] {
  return UP_MLA_PROFILES.filter((p) => p.gender === 'F');
}
