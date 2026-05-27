/**
 * Tamil Nadu — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface TNPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const TN_POLITICAL_LEDGER: TNPoliticalLedgerEntry[] = [];

export function computeTNPartyStrength(): Record<string, number> {
  const strength: Record<string, number> = {};
  strength['DMK'] = 133;
  strength['AIADMK'] = 66;
  strength['INC'] = 18;
  strength['PMK'] = 5;
  strength['BJP'] = 4;
  strength['CPIM'] = 2;
  strength['CPI'] = 2;
  strength['VCK'] = 4;
  // Apply ledger entries
  for (const entry of TN_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditTNLedger() { return TN_POLITICAL_LEDGER; }
export function getTNConstituencyTimeline(acNo: number) { return TN_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getTNDefectionSummary() { return TN_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
