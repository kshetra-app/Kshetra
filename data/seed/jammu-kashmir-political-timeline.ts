/**
 * Jammu Kashmir — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface JKPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const JK_POLITICAL_LEDGER: JKPoliticalLedgerEntry[] = [];

export function computeJKPartyStrength(): Record<string, number> {
  const strength: Record<string, number> = {};
  strength['JKNC'] = 42;
  strength['BJP'] = 29;
  strength['INC'] = 6;
  strength['PDP'] = 3;
  strength['AAP'] = 1;
  strength['Others'] = 9;
  // Apply ledger entries
  for (const entry of JK_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditJKLedger() { return JK_POLITICAL_LEDGER; }
export function getJKConstituencyTimeline(acNo: number) { return JK_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getJKDefectionSummary() { return JK_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
