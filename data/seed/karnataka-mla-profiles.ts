/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  KARNATAKA MLA PROFILES — 16th Assembly (2023–present)                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Profiles for all 224 Karnataka MLAs elected in the 2023 Assembly Election.
 *
 * ── DATA SOURCES ────────────────────────────────────────────────────────
 *  1. Karnataka Legislative Assembly website
 *  2. ECI results portal — https://results.eci.gov.in/
 *  3. MyNeta.info / ADR (Association for Democratic Reforms)
 */

import type { MLAProfile } from './telangana-mla-profiles';
import { KA_CONSTITUENCIES } from './karnataka-constituencies';

/**
 * Build KA MLA profiles from the constituencies data.
 * Uses the winner data from 2023 election results.
 */
export const KA_MLA_PROFILES: MLAProfile[] = KA_CONSTITUENCIES.map((c) => ({
  acNo: c.acNo,
  name: c.winnerName2023,
  party: c.currentParty,
  gender: 'M' as const,
  terms: 1,
}));

// ─── Notable MLAs with enriched data ───────────────────────────────────

const ENRICHED_PROFILES: (Partial<MLAProfile> & { acNo: number })[] = [
  { acNo: 38, name: 'Siddaramaiah', party: 'INC', gender: 'M', terms: 5, age: 76, education: 'LLB', profession: 'Advocate' },
  { acNo: 31, name: 'Basavaraj Bommai', party: 'BJP', gender: 'M', terms: 4, age: 63, education: 'BE', profession: 'Engineer / Politician' },
  { acNo: 119, name: 'D K Shivakumar', party: 'INC', gender: 'M', terms: 5, age: 62, education: 'BA', profession: 'Business / Politician' },
  { acNo: 20, name: 'Jagadish Shettar', party: 'BJP', gender: 'M', terms: 6, age: 68, education: 'LLB', profession: 'Advocate' },
  { acNo: 1, name: 'Firoz Sait', party: 'INC', gender: 'M', terms: 2 },
  { acNo: 3, name: 'Laxmi Hebbalkar', party: 'INC', gender: 'F', terms: 2 },
  { acNo: 11, name: 'Ramesh Jarkiholi', party: 'BJP', gender: 'M', terms: 4 },
  { acNo: 12, name: 'Balachandra Jarkiholi', party: 'INC', gender: 'M', terms: 3 },
  { acNo: 14, name: 'Shashikala Jolle', party: 'BJP', gender: 'F', terms: 2 },
  { acNo: 23, name: 'M B Patil', party: 'INC', gender: 'M', terms: 4, age: 60, education: 'BE', profession: 'Engineer' },
  { acNo: 33, name: 'H K Patil', party: 'INC', gender: 'M', terms: 5 },
  { acNo: 64, name: 'Nara Bharath Reddy', party: 'INC', gender: 'M', terms: 1 },
  { acNo: 112, name: 'Zameer Ahmed Khan', party: 'INC', gender: 'M', terms: 4 },
  { acNo: 135, name: 'R Ashoka', party: 'BJP', gender: 'M', terms: 5 },
  { acNo: 148, name: 'D Vedavyas Kamath', party: 'BJP', gender: 'M', terms: 2 },
  { acNo: 161, name: 'Byrathi Basavaraj', party: 'BJP', gender: 'M', terms: 3 },
  { acNo: 173, name: 'Ramalinga Reddy', party: 'INC', gender: 'M', terms: 5 },
  { acNo: 176, name: 'Krishna Byregowda', party: 'INC', gender: 'M', terms: 4 },
];

// Merge enriched profiles into base profiles
for (const enriched of ENRICHED_PROFILES) {
  const idx = KA_MLA_PROFILES.findIndex((p) => p.acNo === enriched.acNo);
  if (idx >= 0) {
    KA_MLA_PROFILES[idx] = { ...KA_MLA_PROFILES[idx], ...enriched };
  }
}

// ─── LOOKUP HELPERS ──────────────────────────────────────────────────────

const profileByAcNo = new Map<number, MLAProfile>(
  KA_MLA_PROFILES.map((p) => [p.acNo, p]),
);

export function getKAMLAProfile(acNo: number): MLAProfile | undefined {
  return profileByAcNo.get(acNo);
}

export function getKAMLAsByParty(party: string): MLAProfile[] {
  return KA_MLA_PROFILES.filter((p) => p.party === party);
}

export function getKAFemaleMLAs(): MLAProfile[] {
  return KA_MLA_PROFILES.filter((p) => p.gender === 'F');
}

export function getKAVeteranMLAs(minTerms = 3): MLAProfile[] {
  return KA_MLA_PROFILES.filter((p) => p.terms >= minTerms);
}
