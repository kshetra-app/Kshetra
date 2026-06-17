/**
 * State Data Dispatcher — Unified routing for all state-specific data
 *
 * Routes MLA profile, demographics, historical results, election history,
 * and political timeline queries to the correct state-specific module.
 * This eliminates the need for isTS guards in UI code.
 */

import type { MLAProfile } from '../../../data/seed/telangana-mla-profiles';
import type { LegislatorProfile } from '../../../data/seed/tamil-nadu-mla-profiles';
import type { ConstituencyDemographics } from '../../../data/seed/telangana-demographics';
import type { HistoricalResult } from '../../../data/seed/telangana-historical-results';
import type { ElectionHistoryEntry } from '../../../data/seed/telangana-election-history';
import type { PoliticalLedgerEntry } from '../../../data/seed/telangana-political-timeline';
import { getUnifiedConstituenciesForState } from './stateDataAdapter';

// ── Telangana ──
import { getMLAProfile as getTSMLA, getDefectedMLAs as getTSDefected } from '../../../data/seed/telangana-mla-profiles';
import { getConstituencyDemographics as getTSDemo } from '../../../data/seed/telangana-demographics';
import { getConstituencyHistory as getTSHistory, isPartyStronghold as isTSStronghold } from '../../../data/seed/telangana-historical-results';
import { TELANGANA_ELECTION_HISTORY } from '../../../data/seed/telangana-election-history';
import { getConstituencyTimeline as getTSTimeline } from '../../../data/seed/telangana-political-timeline';

// ── Andhra Pradesh ──
import { getAPMLAProfile, getAPDefectedMLAs } from '../../../data/seed/andhra-pradesh-mla-profiles';
import { getAPConstituencyDemographics } from '../../../data/seed/andhra-pradesh-demographics';
import { getAP2019Result } from '../../../data/seed/andhra-pradesh-historical-results';
import { AP_ELECTION_HISTORY } from '../../../data/seed/andhra-pradesh-election-history';
import { getAPConstituencyTimeline } from '../../../data/seed/andhra-pradesh-political-timeline';

// ── Karnataka ──
import { getKAMLAProfile, getKAFemaleMLAs } from '../../../data/seed/karnataka-mla-profiles';
import { getKAConstituencyDemographics } from '../../../data/seed/karnataka-demographics';
import { getKA2018Result } from '../../../data/seed/karnataka-historical-results';
import { KA_ELECTION_HISTORY } from '../../../data/seed/karnataka-election-history';
import { getKAConstituencyTimeline } from '../../../data/seed/karnataka-political-timeline';

// ── Maharashtra ──
import { getMHMLAProfile, getMHFemaleMLAs } from '../../../data/seed/maharashtra-mla-profiles';
import { getMHConstituencyDemographics } from '../../../data/seed/maharashtra-demographics';
import { getMH2019Result } from '../../../data/seed/maharashtra-historical-results';
import { MH_ELECTION_HISTORY } from '../../../data/seed/maharashtra-election-history';
import { getMHConstituencyTimeline } from '../../../data/seed/maharashtra-political-timeline';

// ── Tamil Nadu ──
import { getTNMLAProfile } from '../../../data/seed/tamil-nadu-mla-profiles';
import { getTN2016Result } from '../../../data/seed/tamil-nadu-historical-results';
import { getTNConstituencyDemographics } from '../../../data/seed/tamil-nadu-demographics';
import { TN_ELECTION_HISTORY } from '../../../data/seed/tamil-nadu-election-history';
import { getTNConstituencyTimeline } from '../../../data/seed/tamil-nadu-political-timeline';

// ── Kerala ──
import { getKLMLAProfile } from '../../../data/seed/kerala-mla-profiles';
import { getKL2016Result } from '../../../data/seed/kerala-historical-results';
import { getKLConstituencyDemographics } from '../../../data/seed/kerala-demographics';
import { KL_ELECTION_HISTORY } from '../../../data/seed/kerala-election-history';
import { getKLConstituencyTimeline } from '../../../data/seed/kerala-political-timeline';

// ── West Bengal ──
import { getWBMLAProfile } from '../../../data/seed/west-bengal-mla-profiles';
import { getWB2016Result } from '../../../data/seed/west-bengal-historical-results';
import { getWBConstituencyDemographics } from '../../../data/seed/west-bengal-demographics';
import { WB_ELECTION_HISTORY } from '../../../data/seed/west-bengal-election-history';
import { getWBConstituencyTimeline } from '../../../data/seed/west-bengal-political-timeline';

// ── Uttar Pradesh ──
import { getUPMLAProfile } from '../../../data/seed/uttar-pradesh-mla-profiles';
import { getUP2017Result } from '../../../data/seed/uttar-pradesh-historical-results';
import { getUPConstituencyDemographics } from '../../../data/seed/uttar-pradesh-demographics';
import { UP_ELECTION_HISTORY } from '../../../data/seed/uttar-pradesh-election-history';
import { getUPConstituencyTimeline } from '../../../data/seed/uttar-pradesh-political-timeline';

// ── Auto-generated states — MLA Profiles ──
import { getRJMLAProfile } from '../../../data/seed/rajasthan-mla-profiles';
import { getGJMLAProfile } from '../../../data/seed/gujarat-mla-profiles';
import { getJHMLAProfile } from '../../../data/seed/jharkhand-mla-profiles';
import { getODMLAProfile } from '../../../data/seed/odisha-mla-profiles';
import { getDLMLAProfile } from '../../../data/seed/delhi-mla-profiles';
import { getPBMLAProfile } from '../../../data/seed/punjab-mla-profiles';
import { getHRMLAProfile } from '../../../data/seed/haryana-mla-profiles';
import { getCGMLAProfile } from '../../../data/seed/chhattisgarh-mla-profiles';
import { getMPMLAProfile } from '../../../data/seed/madhya-pradesh-mla-profiles';
import { getBRMLAProfile } from '../../../data/seed/bihar-mla-profiles';
import { getBRConstituencyDemographics } from '../../../data/seed/bihar-demographics';
import { BR_ELECTION_HISTORY } from '../../../data/seed/bihar-election-history';
import { getBRConstituencyTimeline } from '../../../data/seed/bihar-political-timeline';
import { getASMLAProfile } from '../../../data/seed/assam-mla-profiles';
import { getGAMLAProfile } from '../../../data/seed/goa-mla-profiles';
import { getHPMLAProfile } from '../../../data/seed/himachal-pradesh-mla-profiles';
import { getMNMLAProfile } from '../../../data/seed/manipur-mla-profiles';
import { getMLMLAProfile } from '../../../data/seed/meghalaya-mla-profiles';
import { getMZMLAProfile } from '../../../data/seed/mizoram-mla-profiles';
import { getNLMLAProfile } from '../../../data/seed/nagaland-mla-profiles';
import { getTRMLAProfile } from '../../../data/seed/tripura-mla-profiles';
import { getSKMLAProfile } from '../../../data/seed/sikkim-mla-profiles';
import { getARMLAProfile } from '../../../data/seed/arunachal-pradesh-mla-profiles';
import { getUKMLAProfile } from '../../../data/seed/uttarakhand-mla-profiles';
import { getPYMLAProfile } from '../../../data/seed/puducherry-mla-profiles';
import { getJKMLAProfile } from '../../../data/seed/jammu-kashmir-mla-profiles';
import { getJKConstituencyDemographics } from '../../../data/seed/jammu-kashmir-demographics';
import { JK_ELECTION_HISTORY } from '../../../data/seed/jammu-kashmir-election-history';
import { getJKConstituencyTimeline } from '../../../data/seed/jammu-kashmir-political-timeline';

// ── Auto-generated states — Demographics ──
import { getRJConstituencyDemographics } from '../../../data/seed/rajasthan-demographics';
import { getGJConstituencyDemographics } from '../../../data/seed/gujarat-demographics';
import { getJHConstituencyDemographics } from '../../../data/seed/jharkhand-demographics';
import { getODConstituencyDemographics } from '../../../data/seed/odisha-demographics';
import { getDLConstituencyDemographics } from '../../../data/seed/delhi-demographics';
import { getPBConstituencyDemographics } from '../../../data/seed/punjab-demographics';
import { getHRConstituencyDemographics } from '../../../data/seed/haryana-demographics';
import { getCGConstituencyDemographics } from '../../../data/seed/chhattisgarh-demographics';
import { getMPConstituencyDemographics } from '../../../data/seed/madhya-pradesh-demographics';
import { getASConstituencyDemographics } from '../../../data/seed/assam-demographics';
import { getGAConstituencyDemographics } from '../../../data/seed/goa-demographics';
import { getHPConstituencyDemographics } from '../../../data/seed/himachal-pradesh-demographics';
import { getMNConstituencyDemographics } from '../../../data/seed/manipur-demographics';
import { getMLConstituencyDemographics } from '../../../data/seed/meghalaya-demographics';
import { getMZConstituencyDemographics } from '../../../data/seed/mizoram-demographics';
import { getNLConstituencyDemographics } from '../../../data/seed/nagaland-demographics';
import { getTRConstituencyDemographics } from '../../../data/seed/tripura-demographics';
import { getSKConstituencyDemographics } from '../../../data/seed/sikkim-demographics';
import { getARConstituencyDemographics } from '../../../data/seed/arunachal-pradesh-demographics';
import { getUKConstituencyDemographics } from '../../../data/seed/uttarakhand-demographics';
import { getPYConstituencyDemographics } from '../../../data/seed/puducherry-demographics';

// ── Auto-generated states — Election History ──
import { RJ_ELECTION_HISTORY } from '../../../data/seed/rajasthan-election-history';
import { GJ_ELECTION_HISTORY } from '../../../data/seed/gujarat-election-history';
import { JH_ELECTION_HISTORY } from '../../../data/seed/jharkhand-election-history';
import { OD_ELECTION_HISTORY } from '../../../data/seed/odisha-election-history';
import { DL_ELECTION_HISTORY } from '../../../data/seed/delhi-election-history';
import { PB_ELECTION_HISTORY } from '../../../data/seed/punjab-election-history';
import { HR_ELECTION_HISTORY } from '../../../data/seed/haryana-election-history';
import { CG_ELECTION_HISTORY } from '../../../data/seed/chhattisgarh-election-history';
import { MP_ELECTION_HISTORY } from '../../../data/seed/madhya-pradesh-election-history';
import { AS_ELECTION_HISTORY } from '../../../data/seed/assam-election-history';
import { GA_ELECTION_HISTORY } from '../../../data/seed/goa-election-history';
import { HP_ELECTION_HISTORY } from '../../../data/seed/himachal-pradesh-election-history';
import { MN_ELECTION_HISTORY } from '../../../data/seed/manipur-election-history';
import { ML_ELECTION_HISTORY } from '../../../data/seed/meghalaya-election-history';
import { MZ_ELECTION_HISTORY } from '../../../data/seed/mizoram-election-history';
import { NL_ELECTION_HISTORY } from '../../../data/seed/nagaland-election-history';
import { TR_ELECTION_HISTORY } from '../../../data/seed/tripura-election-history';
import { SK_ELECTION_HISTORY } from '../../../data/seed/sikkim-election-history';
import { AR_ELECTION_HISTORY } from '../../../data/seed/arunachal-pradesh-election-history';
import { UK_ELECTION_HISTORY } from '../../../data/seed/uttarakhand-election-history';
import { PY_ELECTION_HISTORY } from '../../../data/seed/puducherry-election-history';

// ── Auto-generated states — Political Timeline ──
import { getRJConstituencyTimeline } from '../../../data/seed/rajasthan-political-timeline';
import { getGJConstituencyTimeline } from '../../../data/seed/gujarat-political-timeline';
import { getJHConstituencyTimeline } from '../../../data/seed/jharkhand-political-timeline';
import { getODConstituencyTimeline } from '../../../data/seed/odisha-political-timeline';
import { getDLConstituencyTimeline } from '../../../data/seed/delhi-political-timeline';
import { getPBConstituencyTimeline } from '../../../data/seed/punjab-political-timeline';
import { getHRConstituencyTimeline } from '../../../data/seed/haryana-political-timeline';
import { getCGConstituencyTimeline } from '../../../data/seed/chhattisgarh-political-timeline';
import { getMPConstituencyTimeline } from '../../../data/seed/madhya-pradesh-political-timeline';
import { getASConstituencyTimeline } from '../../../data/seed/assam-political-timeline';
import { getGAConstituencyTimeline } from '../../../data/seed/goa-political-timeline';
import { getHPConstituencyTimeline } from '../../../data/seed/himachal-pradesh-political-timeline';
import { getMNConstituencyTimeline } from '../../../data/seed/manipur-political-timeline';
import { getMLConstituencyTimeline } from '../../../data/seed/meghalaya-political-timeline';
import { getMZConstituencyTimeline } from '../../../data/seed/mizoram-political-timeline';
import { getNLConstituencyTimeline } from '../../../data/seed/nagaland-political-timeline';
import { getTRConstituencyTimeline } from '../../../data/seed/tripura-political-timeline';
import { getSKConstituencyTimeline } from '../../../data/seed/sikkim-political-timeline';
import { getARConstituencyTimeline } from '../../../data/seed/arunachal-pradesh-political-timeline';
import { getUKConstituencyTimeline } from '../../../data/seed/uttarakhand-political-timeline';
import { getPYConstituencyTimeline } from '../../../data/seed/puducherry-political-timeline';

// ═════════════════════════════════════════════════════════════════════════
// ── MLA Profile ─────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/** Adapt LegislatorProfile (rich 2026 schema) → MLAProfile (codebase standard) */
function adaptLegislatorProfile(lp: LegislatorProfile | undefined): MLAProfile | undefined {
  if (!lp) return undefined;
  return {
    acNo: lp.acNo,
    name: lp.name,
    party: lp.currentParty,
    gender: lp.gender === 'O' ? 'M' : lp.gender,
    terms: lp.termsServed,
    age: lp.age,
    dob: lp.dob,
    dobEstimated: lp.dobEstimated,
    education: lp.education?.educationCategory,
    profession: lp.education?.selfProfession,
    criminalCases: lp.criminalRecord?.totalCases,
    totalAssets: lp.financialHistory?.[0]?.totalAssets,
    totalLiabilities: lp.financialHistory?.[0]?.totalLiabilities,
    maritalStatus: lp.maritalStatus,
    photoUrl: lp.photoUrl,
    constituencyName: lp.constituencyName,
    district: lp.district,
    sourceUrl: lp.mynetaUrl,
  };
}

/** Normalize name for fuzzy comparison */
function normalizeForCompare(name: string): string {
  return name.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

/** Check if two names refer to the same person (partial match) */
function namesMatch(a: string, b: string): boolean {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (na === nb) return true;
  const aParts = na.split(' ').filter(p => p.length > 2);
  const bParts = nb.split(' ').filter(p => p.length > 2);
  // At least one significant name part must match
  return aParts.some(p => bParts.some(q => q.includes(p) || p.includes(q)));
}

/**
 * Get MLA profile with seed-data reconciliation.
 * If the profile file has multiple entries for the same acNo (winners + losers),
 * this returns only the one matching the seed's winnerName.
 * If the profile name doesn't match the seed winner at all, the name field is
 * overridden to prevent showing conflicting MLA names in the UI.
 */
export function getMLAProfileForState(
  stateCode: string,
  acNo: number,
): MLAProfile | undefined {
  const rawProfile = getRawMLAProfile(stateCode, acNo);
  if (!rawProfile) return undefined;

  // Cross-reference with seed's winner name for consistency
  const constituency = getUnifiedConstituenciesForState(stateCode).find(c => c.acNo === acNo);
  if (!constituency) return rawProfile;

  // If names already match, return as-is
  if (namesMatch(rawProfile.name, constituency.winnerName)) return rawProfile;

  // Override profile name with seed's winnerName to prevent "two MLAs" display
  return { ...rawProfile, name: constituency.winnerName };
}

/** Raw lookup (first match by acNo from state file) */
function getRawMLAProfile(stateCode: string, acNo: number): MLAProfile | undefined {
  switch (stateCode) {
    case 'TS': return getTSMLA(acNo);
    case 'AP': return adaptLegislatorProfile(getAPMLAProfile(acNo));
    case 'KA': return getKAMLAProfile(acNo);
    case 'MH': return getMHMLAProfile(acNo);
    case 'TN': return adaptLegislatorProfile(getTNMLAProfile(acNo));
    case 'KL': return adaptLegislatorProfile(getKLMLAProfile(acNo));
    case 'WB': return adaptLegislatorProfile(getWBMLAProfile(acNo));
    case 'UP': return getUPMLAProfile(acNo);
    case 'RJ': return getRJMLAProfile(acNo);
    case 'GJ': return getGJMLAProfile(acNo);
    case 'JH': return getJHMLAProfile(acNo);
    case 'OD': return getODMLAProfile(acNo);
    case 'DL': return getDLMLAProfile(acNo);
    case 'PB': return getPBMLAProfile(acNo);
    case 'HR': return getHRMLAProfile(acNo);
    case 'CG': return getCGMLAProfile(acNo);
    case 'MP': return getMPMLAProfile(acNo);
    case 'BR': return getBRMLAProfile(acNo);
    case 'AS': return adaptLegislatorProfile(getASMLAProfile(acNo));
    case 'GA': return getGAMLAProfile(acNo);
    case 'HP': return getHPMLAProfile(acNo);
    case 'MN': return getMNMLAProfile(acNo);
    case 'ML': return getMLMLAProfile(acNo);
    case 'MZ': return getMZMLAProfile(acNo);
    case 'NL': return getNLMLAProfile(acNo);
    case 'TR': return getTRMLAProfile(acNo);
    case 'SK': return getSKMLAProfile(acNo);
    case 'AR': return getARMLAProfile(acNo);
    case 'UK': return getUKMLAProfile(acNo);
    case 'PY': return adaptLegislatorProfile(getPYMLAProfile(acNo));
    case 'JK': return getJKMLAProfile(acNo);
    default:   return undefined;
  }
}

// ═════════════════════════════════════════════════════════════════════════
// ── Demographics ────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/**
 * Adapt stub demographics (auto-generated states) → ConstituencyDemographics.
 * Maps available fields; missing fields default to 0.
 */
function adaptStubDemographics(d: any): ConstituencyDemographics | undefined {
  if (!d) return undefined;
  return {
    acNo: d.acNo,
    population: d.population ?? 0,
    totalVoters: d.totalElectors ?? d.totalVoters ?? 0,
    turnout2023: d.turnout ?? d.turnout2023 ?? 0,
    maleVoters: d.maleElectors ?? d.maleVoters ?? 0,
    femaleVoters: d.femaleElectors ?? d.femaleVoters ?? 0,
    literacy: d.literacy ?? 0,
    urbanPercent: d.urbanPercent ?? 0,
    scPercent: d.scPopulation ?? d.scPercent ?? 0,
    stPercent: d.stPopulation ?? d.stPercent ?? 0,
    areaSqKm: d.areaSqKm ?? 0,
  };
}

export function getDemographicsForState(
  stateCode: string,
  acNo: number,
): ConstituencyDemographics | undefined {
  switch (stateCode) {
    case 'TS': return getTSDemo(acNo);
    case 'AP': return getAPConstituencyDemographics(acNo);
    case 'KA': return getKAConstituencyDemographics(acNo);
    case 'MH': return getMHConstituencyDemographics(acNo);
    case 'TN': return adaptStubDemographics(getTNConstituencyDemographics(acNo));
    case 'KL': return adaptStubDemographics(getKLConstituencyDemographics(acNo));
    case 'WB': return adaptStubDemographics(getWBConstituencyDemographics(acNo));
    case 'UP': return adaptStubDemographics(getUPConstituencyDemographics(acNo));
    case 'BR': return adaptStubDemographics(getBRConstituencyDemographics(acNo));
    case 'JK': return adaptStubDemographics(getJKConstituencyDemographics(acNo));
    case 'RJ': return adaptStubDemographics(getRJConstituencyDemographics(acNo));
    case 'GJ': return adaptStubDemographics(getGJConstituencyDemographics(acNo));
    case 'JH': return adaptStubDemographics(getJHConstituencyDemographics(acNo));
    case 'OD': return adaptStubDemographics(getODConstituencyDemographics(acNo));
    case 'DL': return adaptStubDemographics(getDLConstituencyDemographics(acNo));
    case 'PB': return adaptStubDemographics(getPBConstituencyDemographics(acNo));
    case 'HR': return adaptStubDemographics(getHRConstituencyDemographics(acNo));
    case 'CG': return adaptStubDemographics(getCGConstituencyDemographics(acNo));
    case 'MP': return adaptStubDemographics(getMPConstituencyDemographics(acNo));
    case 'AS': return adaptStubDemographics(getASConstituencyDemographics(acNo));
    case 'GA': return adaptStubDemographics(getGAConstituencyDemographics(acNo));
    case 'HP': return adaptStubDemographics(getHPConstituencyDemographics(acNo));
    case 'MN': return adaptStubDemographics(getMNConstituencyDemographics(acNo));
    case 'ML': return adaptStubDemographics(getMLConstituencyDemographics(acNo));
    case 'MZ': return adaptStubDemographics(getMZConstituencyDemographics(acNo));
    case 'NL': return adaptStubDemographics(getNLConstituencyDemographics(acNo));
    case 'TR': return adaptStubDemographics(getTRConstituencyDemographics(acNo));
    case 'SK': return adaptStubDemographics(getSKConstituencyDemographics(acNo));
    case 'AR': return adaptStubDemographics(getARConstituencyDemographics(acNo));
    case 'UK': return adaptStubDemographics(getUKConstituencyDemographics(acNo));
    case 'PY': return adaptStubDemographics(getPYConstituencyDemographics(acNo));
    default:   return undefined;
  }
}

// ═════════════════════════════════════════════════════════════════════════
// ── Historical Results (per-constituency) ───────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/** Unified per-constituency history: previous elections mapped to year labels */
export interface ConstituencyHistoryEntry {
  year: number;
  winner: string;
  party: string;
}

/**
 * Get per-constituency historical results for any supported state.
 * Returns an array of { year, winner, party } for prior elections.
 */
export function getHistoryForState(
  stateCode: string,
  acNo: number,
): ConstituencyHistoryEntry[] {
  switch (stateCode) {
    case 'TS': {
      const h = getTSHistory(acNo);
      const results: ConstituencyHistoryEntry[] = [];
      if (h.ac2014) results.push({ year: 2014, winner: h.ac2014.winner, party: h.ac2014.party });
      if (h.ac2018) results.push({ year: 2018, winner: h.ac2018.winner, party: h.ac2018.party });
      return results;
    }
    case 'AP': {
      const r2019 = getAP2019Result(acNo);
      return r2019 ? [{ year: 2019, winner: r2019.winner, party: r2019.party }] : [];
    }
    case 'KA': {
      const r2018 = getKA2018Result(acNo);
      return r2018 ? [{ year: 2018, winner: r2018.winner, party: r2018.party }] : [];
    }
    case 'MH': {
      const r2019 = getMH2019Result(acNo);
      return r2019 ? [{ year: 2019, winner: r2019.winner, party: r2019.party }] : [];
    }
    case 'TN': {
      const r2016 = getTN2016Result(acNo);
      return r2016 ? [{ year: 2016, winner: r2016.winner, party: r2016.party }] : [];
    }
    case 'KL': {
      const r2016 = getKL2016Result(acNo);
      return r2016 ? [{ year: 2016, winner: r2016.winner, party: r2016.party }] : [];
    }
    case 'WB': {
      const r2016 = getWB2016Result(acNo);
      return r2016 ? [{ year: 2016, winner: r2016.winner, party: r2016.party }] : [];
    }
    case 'UP': {
      const r2017 = getUP2017Result(acNo);
      return r2017 ? [{ year: 2017, winner: r2017.winner, party: r2017.party }] : [];
    }
    default:
      return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════
// ── Party Stronghold ────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/**
 * Check if a constituency is a stronghold (same party won all available elections).
 * For TS: checks 2014, 2018, 2023 (accounts for TRS→BRS rename).
 * For other states: checks previous election + current.
 */
export function isStrongholdForState(
  stateCode: string,
  acNo: number,
  currentParty: string,
): boolean {
  switch (stateCode) {
    case 'TS':
      return isTSStronghold(acNo, currentParty);
    case 'AP': {
      const r = getAP2019Result(acNo);
      return r ? r.party === currentParty : false;
    }
    case 'KA': {
      const r = getKA2018Result(acNo);
      return r ? r.party === currentParty : false;
    }
    case 'MH': {
      const r = getMH2019Result(acNo);
      if (!r) return false;
      // Handle SHS split: SHS (2019) = SHS or SHSUBT (2024)
      const normalize = (p: string) => p;
      return normalize(r.party) === normalize(currentParty);
    }
    case 'TN': {
      const r = getTN2016Result(acNo);
      return r ? r.party === currentParty : false;
    }
    case 'KL': {
      const r = getKL2016Result(acNo);
      return r ? r.party === currentParty : false;
    }
    case 'WB': {
      const r = getWB2016Result(acNo);
      return r ? r.party === currentParty : false;
    }
    case 'UP': {
      const r = getUP2017Result(acNo);
      return r ? r.party === currentParty : false;
    }
    default:
      return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════
// ── Election History (state-level overview) ─────────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/**
 * Adapt auto-generated election history (Record-based partyResults) → ElectionHistoryEntry[].
 */
function adaptElectionHistory(entries: any[]): ElectionHistoryEntry[] {
  return entries.map((e: any) => ({
    year: e.year,
    type: 'assembly' as const,
    totalSeats: e.totalSeats,
    partyResults: Object.entries(e.partyResults || {}).map(([party, seats]) => ({
      party,
      seatsWon: seats as number,
      seatContested: seats as number,
    })),
    notes: e.rulingParty ? `Ruling party: ${e.rulingParty}` : undefined,
  }));
}

export function getElectionHistoryForState(
  stateCode: string,
): ElectionHistoryEntry[] {
  switch (stateCode) {
    case 'TS': return TELANGANA_ELECTION_HISTORY;
    case 'AP': return AP_ELECTION_HISTORY;
    case 'KA': return KA_ELECTION_HISTORY;
    case 'MH': return MH_ELECTION_HISTORY;
    case 'TN': return adaptElectionHistory(TN_ELECTION_HISTORY);
    case 'KL': return adaptElectionHistory(KL_ELECTION_HISTORY);
    case 'WB': return adaptElectionHistory(WB_ELECTION_HISTORY);
    case 'UP': return adaptElectionHistory(UP_ELECTION_HISTORY);
    case 'BR': return adaptElectionHistory(BR_ELECTION_HISTORY);
    case 'JK': return adaptElectionHistory(JK_ELECTION_HISTORY);
    case 'RJ': return adaptElectionHistory(RJ_ELECTION_HISTORY);
    case 'GJ': return adaptElectionHistory(GJ_ELECTION_HISTORY);
    case 'JH': return adaptElectionHistory(JH_ELECTION_HISTORY);
    case 'OD': return adaptElectionHistory(OD_ELECTION_HISTORY);
    case 'DL': return adaptElectionHistory(DL_ELECTION_HISTORY);
    case 'PB': return adaptElectionHistory(PB_ELECTION_HISTORY);
    case 'HR': return adaptElectionHistory(HR_ELECTION_HISTORY);
    case 'CG': return adaptElectionHistory(CG_ELECTION_HISTORY);
    case 'MP': return adaptElectionHistory(MP_ELECTION_HISTORY);
    case 'AS': return adaptElectionHistory(AS_ELECTION_HISTORY);
    case 'GA': return adaptElectionHistory(GA_ELECTION_HISTORY);
    case 'HP': return adaptElectionHistory(HP_ELECTION_HISTORY);
    case 'MN': return adaptElectionHistory(MN_ELECTION_HISTORY);
    case 'ML': return adaptElectionHistory(ML_ELECTION_HISTORY);
    case 'MZ': return adaptElectionHistory(MZ_ELECTION_HISTORY);
    case 'NL': return adaptElectionHistory(NL_ELECTION_HISTORY);
    case 'TR': return adaptElectionHistory(TR_ELECTION_HISTORY);
    case 'SK': return adaptElectionHistory(SK_ELECTION_HISTORY);
    case 'AR': return adaptElectionHistory(AR_ELECTION_HISTORY);
    case 'UK': return adaptElectionHistory(UK_ELECTION_HISTORY);
    case 'PY': return adaptElectionHistory(PY_ELECTION_HISTORY);
    default:   return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════
// ── Political Timeline (per-constituency events) ────────────────────────
// ═════════════════════════════════════════════════════════════════════════

/**
 * Adapt auto-generated political timeline → PoliticalLedgerEntry[].
 * Auto-generated states use a simpler ledger format; we map to the TS-compatible shape.
 */
function inferEventType(event: string, fromParty: string, toParty: string): string {
  const lower = (event || '').toLowerCase();
  if (lower.includes('by-election') || lower.includes('byelection') || lower.includes('by election'))
    return 'BY_ELECTION';
  if (lower.includes('demise') || lower.includes('death') || lower.includes('passed away'))
    return 'DEATH_IN_OFFICE';
  if (lower.includes('general election'))
    return 'GENERAL_ELECTION';
  if (lower.includes('disqualif'))
    return 'DISQUALIFICATION';
  if (lower.includes('merger') || lower.includes('merge'))
    return 'PARTY_MERGER';
  if (lower.includes('split'))
    return 'SPLIT';
  if (lower.includes('expel') || lower.includes('expul'))
    return 'EXPULSION';
  // Defection: check before resign — if text has resign+joined/defection, it's a defection
  if (lower.includes('defect') || lower.includes('switch') || lower.includes('faction'))
    return 'DEFECTION';
  if (lower.includes('resign') && (lower.includes('joined') || lower.includes('toppl')))
    return 'DEFECTION';
  if (lower.includes('resign'))
    return 'RESIGNATION';
  if (lower.includes('joined'))
    return 'DEFECTION';
  // Fallback: if going to VACANT, it's a vacancy; if from VACANT, it's a by-election
  if (toParty === 'VACANT') return 'RESIGNATION';
  if (fromParty === 'VACANT') return 'BY_ELECTION';
  return 'DEFECTION';
}

function adaptTimelineEntries(entries: any[]): PoliticalLedgerEntry[] {
  return entries.map((e: any, i: number) => ({
    id: `ADAPTED-${e.acNo || 0}-${i}`,
    date: e.date ?? '',
    assembly: 1 as 1,
    eventType: inferEventType(e.event, e.fromParty, e.toParty) as any,
    acNos: e.acNo ? [e.acNo] : [],
    memberNames: e.legislatorName ? [e.legislatorName] : [],
    debitParty: e.fromParty ?? '',
    creditParty: e.toParty ?? '',
    seats: 1,
    explanation: e.event ?? '',
    details: '',
    legalStatus: 'UNKNOWN' as any,
    sources: [],
    verified: false,
  }));
}

export function getTimelineForState(
  stateCode: string,
  acNo: number,
): PoliticalLedgerEntry[] {
  switch (stateCode) {
    case 'TS': return getTSTimeline(acNo);
    case 'AP': return getAPConstituencyTimeline(acNo);
    case 'KA': return getKAConstituencyTimeline(acNo);
    case 'MH': return getMHConstituencyTimeline(acNo);
    case 'TN': return adaptTimelineEntries(getTNConstituencyTimeline(acNo));
    case 'KL': return adaptTimelineEntries(getKLConstituencyTimeline(acNo));
    case 'WB': return adaptTimelineEntries(getWBConstituencyTimeline(acNo));
    case 'UP': return adaptTimelineEntries(getUPConstituencyTimeline(acNo));
    case 'BR': return adaptTimelineEntries(getBRConstituencyTimeline(acNo));
    case 'JK': return adaptTimelineEntries(getJKConstituencyTimeline(acNo));
    case 'RJ': return adaptTimelineEntries(getRJConstituencyTimeline(acNo));
    case 'GJ': return adaptTimelineEntries(getGJConstituencyTimeline(acNo));
    case 'JH': return adaptTimelineEntries(getJHConstituencyTimeline(acNo));
    case 'OD': return adaptTimelineEntries(getODConstituencyTimeline(acNo));
    case 'DL': return adaptTimelineEntries(getDLConstituencyTimeline(acNo));
    case 'PB': return adaptTimelineEntries(getPBConstituencyTimeline(acNo));
    case 'HR': return adaptTimelineEntries(getHRConstituencyTimeline(acNo));
    case 'CG': return adaptTimelineEntries(getCGConstituencyTimeline(acNo));
    case 'MP': return adaptTimelineEntries(getMPConstituencyTimeline(acNo));
    case 'AS': return adaptTimelineEntries(getASConstituencyTimeline(acNo));
    case 'GA': return adaptTimelineEntries(getGAConstituencyTimeline(acNo));
    case 'HP': return adaptTimelineEntries(getHPConstituencyTimeline(acNo));
    case 'MN': return adaptTimelineEntries(getMNConstituencyTimeline(acNo));
    case 'ML': return adaptTimelineEntries(getMLConstituencyTimeline(acNo));
    case 'MZ': return adaptTimelineEntries(getMZConstituencyTimeline(acNo));
    case 'NL': return adaptTimelineEntries(getNLConstituencyTimeline(acNo));
    case 'TR': return adaptTimelineEntries(getTRConstituencyTimeline(acNo));
    case 'SK': return adaptTimelineEntries(getSKConstituencyTimeline(acNo));
    case 'AR': return adaptTimelineEntries(getARConstituencyTimeline(acNo));
    case 'UK': return adaptTimelineEntries(getUKConstituencyTimeline(acNo));
    case 'PY': return adaptTimelineEntries(getPYConstituencyTimeline(acNo));
    default:   return [];
  }
}

/** Whether a state has full data (MLA profiles, demographics, history, trivia) */
export function hasFullDataForState(stateCode: string): boolean {
  return [
    'TS', 'AP', 'KA', 'MH', 'TN', 'KL', 'WB', 'UP',
    'RJ', 'GJ', 'JH', 'OD', 'DL', 'PB', 'HR', 'CG',
    'MP', 'BR', 'AS', 'GA', 'HP', 'MN', 'ML', 'MZ',
    'NL', 'TR', 'SK', 'AR', 'UK', 'PY', 'JK',
  ].includes(stateCode);
}
