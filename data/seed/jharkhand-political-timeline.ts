/**
 * Jharkhand — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface JHPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const JH_POLITICAL_LEDGER: JHPoliticalLedgerEntry[] = [];

export function computeJHPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['LJPV'] = (strength['LJPV'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['RJD'] = (strength['RJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['RJD'] = (strength['RJD'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['RJD'] = (strength['RJD'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JD(U)'] = (strength['JD(U)'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AP'] = (strength['AP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['CPI(ML'] = (strength['CPI(ML'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['CPI(ML'] = (strength['CPI(ML'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  // Apply ledger entries
  for (const entry of JH_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditJHLedger() { return JH_POLITICAL_LEDGER; }
export function getJHConstituencyTimeline(acNo: number) { return JH_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getJHDefectionSummary() { return JH_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
