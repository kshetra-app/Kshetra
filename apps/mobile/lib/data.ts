/**
 * data.ts — Core Data Contracts and Parliamentary Data
 * Decoupled from static state political seed datasets for thin-client architecture.
 */

// ── Constituencies for State Data Adapter ──────────────────────────
export {
  TELANGANA_CONSTITUENCIES,
  type ConstituencySeed,
} from '../../../data/seed/telangana-constituencies';

export {
  AP_CONSTITUENCIES,
  type APConstituencySeed,
} from '../../../data/seed/andhra-pradesh-constituencies';

export {
  KA_CONSTITUENCIES,
  type KAConstituencySeed,
} from '../../../data/seed/karnataka-constituencies';

export {
  MH_CONSTITUENCIES,
  type MHConstituencySeed,
} from '../../../data/seed/maharashtra-constituencies';

export {
  TN_CONSTITUENCIES,
  type TNConstituencySeed,
} from '../../../data/seed/tamil-nadu-constituencies';

export {
  KL_CONSTITUENCIES,
  type KLConstituencySeed,
} from '../../../data/seed/kerala-constituencies';

export {
  WB_CONSTITUENCIES,
  type WBConstituencySeed,
} from '../../../data/seed/west-bengal-constituencies';

export {
  UP_CONSTITUENCIES,
  type UPConstituencySeed,
} from '../../../data/seed/uttar-pradesh-constituencies';

// ── Core Type Exports ──────────────────────────────────────────────
export { TELANGANA_DEMOGRAPHICS } from '../../../data/seed/telangana-demographics';
export type { MLAProfile } from '../../../data/seed/telangana-mla-profiles';
export type { TriviaItem } from '../../../data/seed/telangana-trivia';
export type { PoliticalLedgerEntry } from '../../../data/seed/telangana-political-timeline';
export type { ConstituencyDemographics } from '../../../data/seed/telangana-demographics';
export type { HistoricalResult } from '../../../data/seed/telangana-historical-results';

// ── MP Profiles (Parliament) ───────────────────────────────────────
export {
  ALL_MP_PROFILES,
  MP_PROFILES_SNAPSHOT,
  NATIONAL_PARTY_STRENGTH,
  STATE_PARLIAMENTARY_SUMMARIES,
  getMPsByState,
  getMPsByParty,
  getLokSabhaMPs,
  getRajyaSabhaMPs,
  getMinisters,
  getPartyStrengthForState,
  getAllianceStrength,
  getMPById,
  searchMPs,
  type MPProfile,
} from '../../../data/seed/mp-profiles';
