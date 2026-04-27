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
  TELANGANA_MLA_PROFILES,
  getMLAProfile,
} from '../../../data/seed/telangana-mla-profiles';
