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
  TS_MLA_PROFILES as TELANGANA_MLA_PROFILES,
  getMLAProfile,
  getDefectedMLAs,
  getAllTSMLAs,
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
  getAPDefectedMLAs,
  getAllAPMLAs,
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
  getKAFemaleMLAs,
  getAllKAMLAs,
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
  getMHFemaleMLAs,
  getAllMHMLAs,
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
  getAllTNMLAs,
} from '../../../data/seed/tamil-nadu-mla-profiles';

export {
  getTN2016Result,
} from '../../../data/seed/tamil-nadu-historical-results';

export { TN_DEMOGRAPHICS, getTNConstituencyDemographics } from '../../../data/seed/tamil-nadu-demographics';
export { TN_ELECTION_HISTORY, getTNElectionByYear, getTNPartyTrend } from '../../../data/seed/tamil-nadu-election-history';
export { TN_POLITICAL_LEDGER, computeTNPartyStrength, getTNConstituencyTimeline, getTNDefectionSummary } from '../../../data/seed/tamil-nadu-political-timeline';
export { getAllTNTrivia, getTNTriviaForConstituency, getTNTriviaForParty, getTNRandomTrivia } from '../../../data/seed/tamil-nadu-trivia';

// ── Kerala ──────────────────────────────────────────────────────────
export {
  KL_CONSTITUENCIES,
  getKLConstituency,
  type KLConstituencySeed,
} from '../../../data/seed/kerala-constituencies';

export {
  KL_MLA_PROFILES,
  getKLMLAProfile,
  getAllKLMLAs,
} from '../../../data/seed/kerala-mla-profiles';

export {
  getKL2016Result,
} from '../../../data/seed/kerala-historical-results';

export { KL_DEMOGRAPHICS, getKLConstituencyDemographics } from '../../../data/seed/kerala-demographics';
export { KL_ELECTION_HISTORY, getKLElectionByYear, getKLPartyTrend } from '../../../data/seed/kerala-election-history';
export { KL_POLITICAL_LEDGER, computeKLPartyStrength, getKLConstituencyTimeline, getKLDefectionSummary } from '../../../data/seed/kerala-political-timeline';
export { getAllKLTrivia, getKLTriviaForConstituency, getKLTriviaForParty, getKLRandomTrivia } from '../../../data/seed/kerala-trivia';

// ── West Bengal ─────────────────────────────────────────────────────
export {
  WB_CONSTITUENCIES,
  getWBConstituency,
  type WBConstituencySeed,
} from '../../../data/seed/west-bengal-constituencies';

export {
  WB_MLA_PROFILES,
  getWBMLAProfile,
  getAllWBMLAs,
} from '../../../data/seed/west-bengal-mla-profiles';

export {
  getWB2016Result,
} from '../../../data/seed/west-bengal-historical-results';

export { WB_DEMOGRAPHICS, getWBConstituencyDemographics } from '../../../data/seed/west-bengal-demographics';
export { WB_ELECTION_HISTORY, getWBElectionByYear, getWBPartyTrend } from '../../../data/seed/west-bengal-election-history';
export { WB_POLITICAL_LEDGER, computeWBPartyStrength, getWBConstituencyTimeline, getWBDefectionSummary } from '../../../data/seed/west-bengal-political-timeline';
export { getAllWBTrivia, getWBTriviaForConstituency, getWBTriviaForParty, getWBRandomTrivia } from '../../../data/seed/west-bengal-trivia';

// ── Uttar Pradesh ───────────────────────────────────────────────────
export {
  UP_CONSTITUENCIES,
  getUPConstituency,
  type UPConstituencySeed,
} from '../../../data/seed/uttar-pradesh-constituencies';

export {
  UP_MLA_PROFILES,
  getUPMLAProfile,
  getAllUPMLAs,
} from '../../../data/seed/uttar-pradesh-mla-profiles';

export {
  getUP2017Result,
} from '../../../data/seed/uttar-pradesh-historical-results';

export { UP_DEMOGRAPHICS, getUPConstituencyDemographics } from '../../../data/seed/uttar-pradesh-demographics';
export { UP_ELECTION_HISTORY, getUPElectionByYear, getUPPartyTrend } from '../../../data/seed/uttar-pradesh-election-history';
export { UP_POLITICAL_LEDGER, computeUPPartyStrength, getUPConstituencyTimeline, getUPDefectionSummary } from '../../../data/seed/uttar-pradesh-political-timeline';
export { getAllUPTrivia, getUPTriviaForConstituency, getUPTriviaForParty, getUPRandomTrivia } from '../../../data/seed/uttar-pradesh-trivia';

// ── Bihar ───────────────────────────────────────────────────────────
export { BR_CONSTITUENCIES, getBRConstituency } from '../../../data/seed/bihar-constituencies';
export { BR_MLA_PROFILES, getBRMLAProfile, getBRMLAsByParty, getBRFemaleMLAs } from '../../../data/seed/bihar-mla-profiles';
export { BR_DEMOGRAPHICS, getBRConstituencyDemographics } from '../../../data/seed/bihar-demographics';
export { BR_ELECTION_HISTORY, getBRElectionByYear, getBRPartyTrend } from '../../../data/seed/bihar-election-history';
export { BR_POLITICAL_LEDGER, computeBRPartyStrength, getBRConstituencyTimeline, getBRDefectionSummary } from '../../../data/seed/bihar-political-timeline';
export { getAllBRTrivia, getBRTriviaForConstituency, getBRTriviaForParty, getBRRandomTrivia } from '../../../data/seed/bihar-trivia';

// ── Jammu & Kashmir ─────────────────────────────────────────────────
export { JK_CONSTITUENCIES, getJKConstituency } from '../../../data/seed/jammu-kashmir-constituencies';
export { JK_MLA_PROFILES, getJKMLAProfile, getJKMLAsByParty } from '../../../data/seed/jammu-kashmir-mla-profiles';
export { JK_DEMOGRAPHICS, getJKConstituencyDemographics } from '../../../data/seed/jammu-kashmir-demographics';
export { JK_ELECTION_HISTORY, getJKElectionByYear, getJKPartyTrend } from '../../../data/seed/jammu-kashmir-election-history';
export { JK_POLITICAL_LEDGER, computeJKPartyStrength, getJKConstituencyTimeline, getJKDefectionSummary } from '../../../data/seed/jammu-kashmir-political-timeline';
export { getAllJKTrivia, getJKTriviaForConstituency, getJKTriviaForParty, getJKRandomTrivia } from '../../../data/seed/jammu-kashmir-trivia';

// ── Rajasthan ───────────────────────────────────────────────────────
export { RJ_CONSTITUENCIES, getRJConstituency } from '../../../data/seed/rajasthan-constituencies';
export { RJ_MLA_PROFILES, getRJMLAProfile, getRJMLAsByParty, getRJFemaleMLAs } from '../../../data/seed/rajasthan-mla-profiles';
export { RJ_DEMOGRAPHICS, getRJConstituencyDemographics } from '../../../data/seed/rajasthan-demographics';
export { RJ_ELECTION_HISTORY, getRJElectionByYear, getRJPartyTrend } from '../../../data/seed/rajasthan-election-history';
export { RJ_POLITICAL_LEDGER, computeRJPartyStrength, getRJConstituencyTimeline, getRJDefectionSummary } from '../../../data/seed/rajasthan-political-timeline';
export { getAllRJTrivia, getRJTriviaForConstituency, getRJTriviaForParty, getRJRandomTrivia } from '../../../data/seed/rajasthan-trivia';

// ── Gujarat ─────────────────────────────────────────────────────────
export { GJ_CONSTITUENCIES, getGJConstituency } from '../../../data/seed/gujarat-constituencies';
export { GJ_MLA_PROFILES, getGJMLAProfile, getGJMLAsByParty, getGJFemaleMLAs } from '../../../data/seed/gujarat-mla-profiles';
export { GJ_DEMOGRAPHICS, getGJConstituencyDemographics } from '../../../data/seed/gujarat-demographics';
export { GJ_ELECTION_HISTORY, getGJElectionByYear, getGJPartyTrend } from '../../../data/seed/gujarat-election-history';
export { GJ_POLITICAL_LEDGER, computeGJPartyStrength, getGJConstituencyTimeline, getGJDefectionSummary } from '../../../data/seed/gujarat-political-timeline';
export { getAllGJTrivia, getGJTriviaForConstituency, getGJTriviaForParty, getGJRandomTrivia } from '../../../data/seed/gujarat-trivia';

// ── Delhi ───────────────────────────────────────────────────────────
export { DL_CONSTITUENCIES, getDLConstituency } from '../../../data/seed/delhi-constituencies';
export { DL_MLA_PROFILES, getDLMLAProfile, getDLMLAsByParty, getDLFemaleMLAs } from '../../../data/seed/delhi-mla-profiles';
export { DL_DEMOGRAPHICS, getDLConstituencyDemographics } from '../../../data/seed/delhi-demographics';
export { DL_ELECTION_HISTORY, getDLElectionByYear, getDLPartyTrend } from '../../../data/seed/delhi-election-history';
export { DL_POLITICAL_LEDGER, computeDLPartyStrength, getDLConstituencyTimeline, getDLDefectionSummary } from '../../../data/seed/delhi-political-timeline';
export { getAllDLTrivia, getDLTriviaForConstituency, getDLTriviaForParty, getDLRandomTrivia } from '../../../data/seed/delhi-trivia';

// ── Punjab ──────────────────────────────────────────────────────────
export { PB_CONSTITUENCIES, getPBConstituency } from '../../../data/seed/punjab-constituencies';
export { PB_MLA_PROFILES, getPBMLAProfile, getPBMLAsByParty, getPBFemaleMLAs } from '../../../data/seed/punjab-mla-profiles';
export { PB_DEMOGRAPHICS, getPBConstituencyDemographics } from '../../../data/seed/punjab-demographics';
export { PB_ELECTION_HISTORY, getPBElectionByYear, getPBPartyTrend } from '../../../data/seed/punjab-election-history';
export { PB_POLITICAL_LEDGER, computePBPartyStrength, getPBConstituencyTimeline, getPBDefectionSummary } from '../../../data/seed/punjab-political-timeline';
export { getAllPBTrivia, getPBTriviaForConstituency, getPBTriviaForParty, getPBRandomTrivia } from '../../../data/seed/punjab-trivia';

// ── Haryana ─────────────────────────────────────────────────────────
export { HR_CONSTITUENCIES, getHRConstituency } from '../../../data/seed/haryana-constituencies';
export { HR_MLA_PROFILES, getHRMLAProfile, getHRMLAsByParty, getHRFemaleMLAs } from '../../../data/seed/haryana-mla-profiles';
export { HR_DEMOGRAPHICS, getHRConstituencyDemographics } from '../../../data/seed/haryana-demographics';
export { HR_ELECTION_HISTORY, getHRElectionByYear, getHRPartyTrend } from '../../../data/seed/haryana-election-history';
export { HR_POLITICAL_LEDGER, computeHRPartyStrength, getHRConstituencyTimeline, getHRDefectionSummary } from '../../../data/seed/haryana-political-timeline';
export { getAllHRTrivia, getHRTriviaForConstituency, getHRTriviaForParty, getHRRandomTrivia } from '../../../data/seed/haryana-trivia';

// ── Chhattisgarh ────────────────────────────────────────────────────
export { CG_CONSTITUENCIES, getCGConstituency } from '../../../data/seed/chhattisgarh-constituencies';
export { CG_MLA_PROFILES, getCGMLAProfile, getCGMLAsByParty, getCGFemaleMLAs } from '../../../data/seed/chhattisgarh-mla-profiles';
export { CG_DEMOGRAPHICS, getCGConstituencyDemographics } from '../../../data/seed/chhattisgarh-demographics';
export { CG_ELECTION_HISTORY, getCGElectionByYear, getCGPartyTrend } from '../../../data/seed/chhattisgarh-election-history';
export { CG_POLITICAL_LEDGER, computeCGPartyStrength, getCGConstituencyTimeline, getCGDefectionSummary } from '../../../data/seed/chhattisgarh-political-timeline';
export { getAllCGTrivia, getCGTriviaForConstituency, getCGTriviaForParty, getCGRandomTrivia } from '../../../data/seed/chhattisgarh-trivia';

// ── Madhya Pradesh ──────────────────────────────────────────────────
export { MP_CONSTITUENCIES, getMPConstituency } from '../../../data/seed/madhya-pradesh-constituencies';
export { MP_MLA_PROFILES, getMPMLAProfile, getMPMLAsByParty, getMPFemaleMLAs } from '../../../data/seed/madhya-pradesh-mla-profiles';
export { MP_DEMOGRAPHICS, getMPConstituencyDemographics } from '../../../data/seed/madhya-pradesh-demographics';
export { MP_ELECTION_HISTORY, getMPElectionByYear, getMPPartyTrend } from '../../../data/seed/madhya-pradesh-election-history';
export { MP_POLITICAL_LEDGER, computeMPPartyStrength, getMPConstituencyTimeline, getMPDefectionSummary } from '../../../data/seed/madhya-pradesh-political-timeline';
export { getAllMPTrivia, getMPTriviaForConstituency, getMPTriviaForParty, getMPRandomTrivia } from '../../../data/seed/madhya-pradesh-trivia';

// ── Jharkhand ───────────────────────────────────────────────────────
export { JH_CONSTITUENCIES, getJHConstituency } from '../../../data/seed/jharkhand-constituencies';
export { JH_MLA_PROFILES, getJHMLAProfile, getJHMLAsByParty, getJHFemaleMLAs } from '../../../data/seed/jharkhand-mla-profiles';
export { JH_DEMOGRAPHICS, getJHConstituencyDemographics } from '../../../data/seed/jharkhand-demographics';
export { JH_ELECTION_HISTORY, getJHElectionByYear, getJHPartyTrend } from '../../../data/seed/jharkhand-election-history';
export { JH_POLITICAL_LEDGER, computeJHPartyStrength, getJHConstituencyTimeline, getJHDefectionSummary } from '../../../data/seed/jharkhand-political-timeline';
export { getAllJHTrivia, getJHTriviaForConstituency, getJHTriviaForParty, getJHRandomTrivia } from '../../../data/seed/jharkhand-trivia';

// ── Odisha ──────────────────────────────────────────────────────────
export { OD_CONSTITUENCIES, getODConstituency } from '../../../data/seed/odisha-constituencies';
export { OD_MLA_PROFILES, getODMLAProfile, getODMLAsByParty, getODFemaleMLAs } from '../../../data/seed/odisha-mla-profiles';
export { OD_DEMOGRAPHICS, getODConstituencyDemographics } from '../../../data/seed/odisha-demographics';
export { OD_ELECTION_HISTORY, getODElectionByYear, getODPartyTrend } from '../../../data/seed/odisha-election-history';
export { OD_POLITICAL_LEDGER, computeODPartyStrength, getODConstituencyTimeline, getODDefectionSummary } from '../../../data/seed/odisha-political-timeline';
export { getAllODTrivia, getODTriviaForConstituency, getODTriviaForParty, getODRandomTrivia } from '../../../data/seed/odisha-trivia';

// ── Assam ───────────────────────────────────────────────────────────
export { AS_CONSTITUENCIES, getASConstituency } from '../../../data/seed/assam-constituencies';
export { AS_MLA_PROFILES, getASMLAProfile, getASMLAsByParty, getASFemaleMLAs } from '../../../data/seed/assam-mla-profiles';
export { AS_DEMOGRAPHICS, getASConstituencyDemographics } from '../../../data/seed/assam-demographics';
export { AS_ELECTION_HISTORY, getASElectionByYear, getASPartyTrend } from '../../../data/seed/assam-election-history';
export { AS_POLITICAL_LEDGER, computeASPartyStrength, getASConstituencyTimeline, getASDefectionSummary } from '../../../data/seed/assam-political-timeline';
export { getAllASTrivia, getASTriviaForConstituency, getASTriviaForParty, getASRandomTrivia } from '../../../data/seed/assam-trivia';

// ── Goa ─────────────────────────────────────────────────────────────
export { GA_CONSTITUENCIES, getGAConstituency } from '../../../data/seed/goa-constituencies';
export { GA_MLA_PROFILES, getGAMLAProfile, getGAMLAsByParty, getGAFemaleMLAs } from '../../../data/seed/goa-mla-profiles';
export { GA_DEMOGRAPHICS, getGAConstituencyDemographics } from '../../../data/seed/goa-demographics';
export { GA_ELECTION_HISTORY, getGAElectionByYear, getGAPartyTrend } from '../../../data/seed/goa-election-history';
export { GA_POLITICAL_LEDGER, computeGAPartyStrength, getGAConstituencyTimeline, getGADefectionSummary } from '../../../data/seed/goa-political-timeline';
export { getAllGATrivia, getGATriviaForConstituency, getGATriviaForParty, getGARandomTrivia } from '../../../data/seed/goa-trivia';

// ── Himachal Pradesh ────────────────────────────────────────────────
export { HP_CONSTITUENCIES, getHPConstituency } from '../../../data/seed/himachal-pradesh-constituencies';
export { HP_MLA_PROFILES, getHPMLAProfile, getHPMLAsByParty, getHPFemaleMLAs } from '../../../data/seed/himachal-pradesh-mla-profiles';
export { HP_DEMOGRAPHICS, getHPConstituencyDemographics } from '../../../data/seed/himachal-pradesh-demographics';
export { HP_ELECTION_HISTORY, getHPElectionByYear, getHPPartyTrend } from '../../../data/seed/himachal-pradesh-election-history';
export { HP_POLITICAL_LEDGER, computeHPPartyStrength, getHPConstituencyTimeline, getHPDefectionSummary } from '../../../data/seed/himachal-pradesh-political-timeline';
export { getAllHPTrivia, getHPTriviaForConstituency, getHPTriviaForParty, getHPRandomTrivia } from '../../../data/seed/himachal-pradesh-trivia';

// ── Manipur ─────────────────────────────────────────────────────────
export { MN_CONSTITUENCIES, getMNConstituency } from '../../../data/seed/manipur-constituencies';
export { MN_MLA_PROFILES, getMNMLAProfile, getMNMLAsByParty, getMNFemaleMLAs } from '../../../data/seed/manipur-mla-profiles';
export { MN_DEMOGRAPHICS, getMNConstituencyDemographics } from '../../../data/seed/manipur-demographics';
export { MN_ELECTION_HISTORY, getMNElectionByYear, getMNPartyTrend } from '../../../data/seed/manipur-election-history';
export { MN_POLITICAL_LEDGER, computeMNPartyStrength, getMNConstituencyTimeline, getMNDefectionSummary } from '../../../data/seed/manipur-political-timeline';
export { getAllMNTrivia, getMNTriviaForConstituency, getMNTriviaForParty, getMNRandomTrivia } from '../../../data/seed/manipur-trivia';

// ── Meghalaya ───────────────────────────────────────────────────────
export { ML_CONSTITUENCIES, getMLConstituency } from '../../../data/seed/meghalaya-constituencies';
export { ML_MLA_PROFILES, getMLMLAProfile, getMLMLAsByParty, getMLFemaleMLAs } from '../../../data/seed/meghalaya-mla-profiles';
export { ML_DEMOGRAPHICS, getMLConstituencyDemographics } from '../../../data/seed/meghalaya-demographics';
export { ML_ELECTION_HISTORY, getMLElectionByYear, getMLPartyTrend } from '../../../data/seed/meghalaya-election-history';
export { ML_POLITICAL_LEDGER, computeMLPartyStrength, getMLConstituencyTimeline, getMLDefectionSummary } from '../../../data/seed/meghalaya-political-timeline';
export { getAllMLTrivia, getMLTriviaForConstituency, getMLTriviaForParty, getMLRandomTrivia } from '../../../data/seed/meghalaya-trivia';

// ── Mizoram ─────────────────────────────────────────────────────────
export { MZ_CONSTITUENCIES, getMZConstituency } from '../../../data/seed/mizoram-constituencies';
export { MZ_MLA_PROFILES, getMZMLAProfile, getMZMLAsByParty, getMZFemaleMLAs } from '../../../data/seed/mizoram-mla-profiles';
export { MZ_DEMOGRAPHICS, getMZConstituencyDemographics } from '../../../data/seed/mizoram-demographics';
export { MZ_ELECTION_HISTORY, getMZElectionByYear, getMZPartyTrend } from '../../../data/seed/mizoram-election-history';
export { MZ_POLITICAL_LEDGER, computeMZPartyStrength, getMZConstituencyTimeline, getMZDefectionSummary } from '../../../data/seed/mizoram-political-timeline';
export { getAllMZTrivia, getMZTriviaForConstituency, getMZTriviaForParty, getMZRandomTrivia } from '../../../data/seed/mizoram-trivia';

// ── Nagaland ────────────────────────────────────────────────────────
export { NL_CONSTITUENCIES, getNLConstituency } from '../../../data/seed/nagaland-constituencies';
export { NL_MLA_PROFILES, getNLMLAProfile, getNLMLAsByParty, getNLFemaleMLAs } from '../../../data/seed/nagaland-mla-profiles';
export { NL_DEMOGRAPHICS, getNLConstituencyDemographics } from '../../../data/seed/nagaland-demographics';
export { NL_ELECTION_HISTORY, getNLElectionByYear, getNLPartyTrend } from '../../../data/seed/nagaland-election-history';
export { NL_POLITICAL_LEDGER, computeNLPartyStrength, getNLConstituencyTimeline, getNLDefectionSummary } from '../../../data/seed/nagaland-political-timeline';
export { getAllNLTrivia, getNLTriviaForConstituency, getNLTriviaForParty, getNLRandomTrivia } from '../../../data/seed/nagaland-trivia';

// ── Tripura ─────────────────────────────────────────────────────────
export { TR_CONSTITUENCIES, getTRConstituency } from '../../../data/seed/tripura-constituencies';
export { TR_MLA_PROFILES, getTRMLAProfile, getTRMLAsByParty, getTRFemaleMLAs } from '../../../data/seed/tripura-mla-profiles';
export { TR_DEMOGRAPHICS, getTRConstituencyDemographics } from '../../../data/seed/tripura-demographics';
export { TR_ELECTION_HISTORY, getTRElectionByYear, getTRPartyTrend } from '../../../data/seed/tripura-election-history';
export { TR_POLITICAL_LEDGER, computeTRPartyStrength, getTRConstituencyTimeline, getTRDefectionSummary } from '../../../data/seed/tripura-political-timeline';
export { getAllTRTrivia, getTRTriviaForConstituency, getTRTriviaForParty, getTRRandomTrivia } from '../../../data/seed/tripura-trivia';

// ── Sikkim ──────────────────────────────────────────────────────────
export { SK_CONSTITUENCIES, getSKConstituency } from '../../../data/seed/sikkim-constituencies';
export { SK_MLA_PROFILES, getSKMLAProfile, getSKMLAsByParty, getSKFemaleMLAs } from '../../../data/seed/sikkim-mla-profiles';
export { SK_DEMOGRAPHICS, getSKConstituencyDemographics } from '../../../data/seed/sikkim-demographics';
export { SK_ELECTION_HISTORY, getSKElectionByYear, getSKPartyTrend } from '../../../data/seed/sikkim-election-history';
export { SK_POLITICAL_LEDGER, computeSKPartyStrength, getSKConstituencyTimeline, getSKDefectionSummary } from '../../../data/seed/sikkim-political-timeline';
export { getAllSKTrivia, getSKTriviaForConstituency, getSKTriviaForParty, getSKRandomTrivia } from '../../../data/seed/sikkim-trivia';

// ── Arunachal Pradesh ───────────────────────────────────────────────
export { AR_CONSTITUENCIES, getARConstituency } from '../../../data/seed/arunachal-pradesh-constituencies';
export { AR_MLA_PROFILES, getARMLAProfile, getARMLAsByParty, getARFemaleMLAs } from '../../../data/seed/arunachal-pradesh-mla-profiles';
export { AR_DEMOGRAPHICS, getARConstituencyDemographics } from '../../../data/seed/arunachal-pradesh-demographics';
export { AR_ELECTION_HISTORY, getARElectionByYear, getARPartyTrend } from '../../../data/seed/arunachal-pradesh-election-history';
export { AR_POLITICAL_LEDGER, computeARPartyStrength, getARConstituencyTimeline, getARDefectionSummary } from '../../../data/seed/arunachal-pradesh-political-timeline';
export { getAllARTrivia, getARTriviaForConstituency, getARTriviaForParty, getARRandomTrivia } from '../../../data/seed/arunachal-pradesh-trivia';

// ── Uttarakhand ─────────────────────────────────────────────────────
export { UK_CONSTITUENCIES, getUKConstituency } from '../../../data/seed/uttarakhand-constituencies';
export { UK_MLA_PROFILES, getUKMLAProfile, getUKMLAsByParty, getUKFemaleMLAs } from '../../../data/seed/uttarakhand-mla-profiles';
export { UK_DEMOGRAPHICS, getUKConstituencyDemographics } from '../../../data/seed/uttarakhand-demographics';
export { UK_ELECTION_HISTORY, getUKElectionByYear, getUKPartyTrend } from '../../../data/seed/uttarakhand-election-history';
export { UK_POLITICAL_LEDGER, computeUKPartyStrength, getUKConstituencyTimeline, getUKDefectionSummary } from '../../../data/seed/uttarakhand-political-timeline';
export { getAllUKTrivia, getUKTriviaForConstituency, getUKTriviaForParty, getUKRandomTrivia } from '../../../data/seed/uttarakhand-trivia';

// ── Puducherry ──────────────────────────────────────────────────────
export { PY_CONSTITUENCIES, getPYConstituency } from '../../../data/seed/puducherry-constituencies';
export { PY_MLA_PROFILES, getPYMLAProfile, getPYMLAsByParty, getPYFemaleMLAs } from '../../../data/seed/puducherry-mla-profiles';
export { PY_DEMOGRAPHICS, getPYConstituencyDemographics } from '../../../data/seed/puducherry-demographics';
export { PY_ELECTION_HISTORY, getPYElectionByYear, getPYPartyTrend } from '../../../data/seed/puducherry-election-history';
export { PY_POLITICAL_LEDGER, computePYPartyStrength, getPYConstituencyTimeline, getPYDefectionSummary } from '../../../data/seed/puducherry-political-timeline';
export { getAllPYTrivia, getPYTriviaForConstituency, getPYTriviaForParty, getPYRandomTrivia } from '../../../data/seed/puducherry-trivia';

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
  getMPById,
  searchMPs,
  type MPProfile,
} from '../../../data/seed/mp-profiles';
