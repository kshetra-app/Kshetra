/**
 * Re-exports seed data for use within the mobile app.
 * Avoids fragile deep relative imports to ../../../../data/seed/
 */
export {
  TELANGANA_CONSTITUENCIES,
  type ConstituencySeed,
} from '../../../data/seed/telangana-constituencies';

export {
  TELANGANA_ELECTION_HISTORY,
} from '../../../data/seed/telangana-election-history';

export {
  getConstituencyHistory,
  isPartyStronghold,
  getPartyTally,
  getSwingConstituencies,
  TRS_BRS_ALIAS,
  type HistoricalResult,
} from '../../../data/seed/telangana-historical-results';

export {
  TELANGANA_MLA_PROFILES,
  getMLAProfile,
  getMLAsByParty,
  getDefectedMLAs,
  getFemaleMLAs,
  getVeteranMLAs,
  type MLAProfile,
} from '../../../data/seed/telangana-mla-profiles';

export {
  getAllTrivia,
  getTriviaForConstituency,
  getTriviaForParty,
  getTriviaForMLA,
  getRandomTrivia,
  getRandomTriviaSet,
  type TriviaItem,
} from '../../../data/seed/telangana-trivia';

export {
  getConstituencyTimeline,
  computePartyStrength,
  getDefectionSummary,
  type PoliticalLedgerEntry,
} from '../../../data/seed/telangana-political-timeline';

export {
  TELANGANA_DEMOGRAPHICS,
  getConstituencyDemographics,
  type ConstituencyDemographics,
} from '../../../data/seed/telangana-demographics';

// ── Andhra Pradesh ───────────────────────────────────────────────────
export {
  AP_CONSTITUENCIES,
  getAPConstituency,
  type APConstituencySeed,
} from '../../../data/seed/andhra-pradesh-constituencies';

export {
  AP_ELECTION_HISTORY,
} from '../../../data/seed/andhra-pradesh-election-history';

export {
  AP_2019_RESULTS,
  getAP2019Result,
  getAP2019PartyWins,
} from '../../../data/seed/andhra-pradesh-historical-results';

export {
  AP_MLA_PROFILES,
  getAPMLAProfile,
  getAPMLAsByParty,
  getAPFemaleMLAs,
} from '../../../data/seed/andhra-pradesh-mla-profiles';

export {
  AP_DEMOGRAPHICS,
  getAPConstituencyDemographics,
} from '../../../data/seed/andhra-pradesh-demographics';

export {
  AP_POLITICAL_LEDGER,
  computeAPPartyStrength,
  auditAPLedger,
  getAPConstituencyTimeline,
  getAPDefectionSummary,
} from '../../../data/seed/andhra-pradesh-political-timeline';

export {
  getAPAllTrivia,
  getAPTriviaForConstituency,
  getAPTriviaForParty,
  getAPTriviaForElection,
  getAPRandomTrivia,
} from '../../../data/seed/andhra-pradesh-trivia';

// ── Karnataka ────────────────────────────────────────────────────────
export {
  KA_CONSTITUENCIES,
  getKAConstituency,
  type KAConstituencySeed,
} from '../../../data/seed/karnataka-constituencies';

export {
  KA_ELECTION_HISTORY,
  getKAElectionByYear,
  getKAPartyTrend,
} from '../../../data/seed/karnataka-election-history';

export {
  KARNATAKA_2018_RESULTS,
  getKA2018Result,
  getKA2018ResultsByParty,
} from '../../../data/seed/karnataka-historical-results';

export {
  KA_MLA_PROFILES,
  getKAMLAProfile,
  getKAMLAsByParty,
  getKAFemaleMLAs,
} from '../../../data/seed/karnataka-mla-profiles';

export {
  KA_DEMOGRAPHICS,
  getKAConstituencyDemographics,
} from '../../../data/seed/karnataka-demographics';

export {
  KA_POLITICAL_LEDGER,
  computeKAPartyStrength,
  auditKALedger,
  getKAConstituencyTimeline,
  getKADefectionSummary,
} from '../../../data/seed/karnataka-political-timeline';

export {
  getKAAllTrivia,
  getKATriviaForConstituency,
  getKATriviaForParty,
  getKATriviaForElection,
  getKARandomTrivia,
} from '../../../data/seed/karnataka-trivia';

// ── Maharashtra ──────────────────────────────────────────────────────
export {
  MH_CONSTITUENCIES,
  getMHConstituency,
  type MHConstituencySeed,
} from '../../../data/seed/maharashtra-constituencies';

export {
  MH_ELECTION_HISTORY,
  getMHElectionByYear,
  getMHPartyTrend,
} from '../../../data/seed/maharashtra-election-history';

export {
  MAHARASHTRA_2019_RESULTS,
  getMH2019Result,
  getMH2019ResultsByParty,
} from '../../../data/seed/maharashtra-historical-results';

export {
  MH_MLA_PROFILES,
  getMHMLAProfile,
  getMHMLAsByParty,
  getMHFemaleMLAs,
} from '../../../data/seed/maharashtra-mla-profiles';

export {
  MH_DEMOGRAPHICS,
  getMHConstituencyDemographics,
} from '../../../data/seed/maharashtra-demographics';

export {
  MH_POLITICAL_LEDGER,
  computeMHPartyStrength,
  auditMHLedger,
  getMHConstituencyTimeline,
  getMHDefectionSummary,
} from '../../../data/seed/maharashtra-political-timeline';

export {
  getMHAllTrivia,
  getMHTriviaForConstituency,
  getMHTriviaForParty,
  getMHTriviaForElection,
  getMHRandomTrivia,
} from '../../../data/seed/maharashtra-trivia';

// ── Tamil Nadu ──────────────────────────────────────────────────────
export {
  TN_CONSTITUENCIES,
  getTNConstituency,
  type TNConstituencySeed,
} from '../../../data/seed/tamil-nadu-constituencies';

export {
  TN_MLA_PROFILES,
  getTNMLAProfile,
  getTNMLAsByParty,
  getTNFemaleMLAs,
} from '../../../data/seed/tamil-nadu-mla-profiles';

// ── Kerala ──────────────────────────────────────────────────────────
export {
  KL_CONSTITUENCIES,
  getKLConstituency,
  type KLConstituencySeed,
} from '../../../data/seed/kerala-constituencies';

export {
  KL_MLA_PROFILES,
  getKLMLAProfile,
  getKLMLAsByParty,
  getKLFemaleMLAs,
} from '../../../data/seed/kerala-mla-profiles';

// ── West Bengal ─────────────────────────────────────────────────────
export {
  WB_CONSTITUENCIES,
  getWBConstituency,
  type WBConstituencySeed,
} from '../../../data/seed/west-bengal-constituencies';

export {
  WB_MLA_PROFILES,
  getWBMLAProfile,
  getWBMLAsByParty,
  getWBFemaleMLAs,
} from '../../../data/seed/west-bengal-mla-profiles';

// ── Uttar Pradesh ───────────────────────────────────────────────────
export {
  UP_CONSTITUENCIES,
  getUPConstituency,
  type UPConstituencySeed,
} from '../../../data/seed/uttar-pradesh-constituencies';

export {
  UP_MLA_PROFILES,
  getUPMLAProfile,
  getUPMLAsByParty,
  getUPFemaleMLAs,
} from '../../../data/seed/uttar-pradesh-mla-profiles';

// ── MP Profiles (Parliament) ────────────────────────────────────────
export {
  ALL_MP_PROFILES,
  NATIONAL_PARTY_STRENGTH,
  STATE_PARLIAMENTARY_SUMMARIES,
  getMPsByState,
  getMPsByParty,
  getLokSabhaMPs,
  getRajyaSabhaMPs,
  getMinisters,
  getPartyStrengthForState,
  getAllianceStrength,
} from '../../../data/seed/mp-profiles';
