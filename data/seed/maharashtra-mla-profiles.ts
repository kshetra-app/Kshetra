/**
 * Maharashtra MLA Profiles — 14th Assembly (2024–present)
 *
 * Profiles for all 288 Maharashtra MLAs elected in 2024.
 * Built from MH_CONSTITUENCIES data + enriched for notable MLAs.
 */

import type { MLAProfile } from './telangana-mla-profiles';
import { MH_CONSTITUENCIES } from './maharashtra-constituencies';

export const MH_MLA_PROFILES: MLAProfile[] = MH_CONSTITUENCIES.map((c) => ({
  acNo: c.acNo,
  name: c.winnerName2024,
  party: c.currentParty,
  gender: 'M' as const,
  terms: 1,
}));

// ─── Enriched Notable MLAs ──────────────────────────────────────────────

const ENRICHED: (Partial<MLAProfile> & { acNo: number })[] = [
  { acNo: 170, name: 'Devendra Fadnavis', party: 'BJP', gender: 'M', terms: 5, age: 54, education: 'LLB', profession: 'Advocate / Politician' },
  { acNo: 121, name: 'Ajit Pawar', party: 'NCP', gender: 'M', terms: 7, age: 65, education: 'BCom', profession: 'Politician / Business' },
  { acNo: 67, name: 'Eknath Shinde', party: 'SHS', gender: 'M', terms: 4, age: 60, education: 'Commerce', profession: 'Politician' },
  { acNo: 102, name: 'Aaditya Thackeray', party: 'SHSUBT', gender: 'M', terms: 2, age: 34, education: 'LLB', profession: 'Politician' },
  { acNo: 98, name: 'Varsha Gaikwad', party: 'INC', gender: 'F', terms: 3, education: 'MBA' },
  { acNo: 37, name: 'Balasaheb Thorat', party: 'INC', gender: 'M', terms: 6, age: 68 },
  { acNo: 130, name: 'Chandrakant Patil', party: 'BJP', gender: 'M', terms: 3, age: 64 },
  { acNo: 107, name: 'Rahul Narwekar', party: 'BJP', gender: 'M', terms: 2, age: 45, profession: 'Advocate (Speaker)' },
  { acNo: 105, name: 'Mangal Prabhat Lodha', party: 'BJP', gender: 'M', terms: 4, age: 62, profession: 'Business' },
  { acNo: 69, name: 'Jitendra Awhad', party: 'NCP', gender: 'M', terms: 3, age: 63 },
  { acNo: 82, name: 'Aslam Shaikh', party: 'INC', gender: 'M', terms: 3 },
  { acNo: 27, name: 'Chhagan Bhujbal', party: 'NCP', gender: 'M', terms: 5, age: 77 },
  { acNo: 153, name: 'Prithviraj Chavan', party: 'INC', gender: 'M', terms: 4, age: 78, profession: 'ex-CM' },
  { acNo: 113, name: 'Aditi Tatkare', party: 'NCP', gender: 'F', terms: 2, age: 38 },
];

for (const enriched of ENRICHED) {
  const idx = MH_MLA_PROFILES.findIndex((p) => p.acNo === enriched.acNo);
  if (idx >= 0) {
    MH_MLA_PROFILES[idx] = { ...MH_MLA_PROFILES[idx], ...enriched };
  }
}

// ─── LOOKUP HELPERS ──────────────────────────────────────────────────────

const profileByAcNo = new Map<number, MLAProfile>(
  MH_MLA_PROFILES.map((p) => [p.acNo, p]),
);

export function getMHMLAProfile(acNo: number): MLAProfile | undefined {
  return profileByAcNo.get(acNo);
}

export function getMHMLAsByParty(party: string): MLAProfile[] {
  return MH_MLA_PROFILES.filter((p) => p.party === party);
}

export function getMHFemaleMLAs(): MLAProfile[] {
  return MH_MLA_PROFILES.filter((p) => p.gender === 'F');
}
