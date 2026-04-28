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
