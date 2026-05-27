/**
 * Bihar — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface BRPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const BR_POLITICAL_LEDGER: BRPoliticalLedgerEntry[] = [];

export function computeBRPartyStrength(): Record<string, number> {
  const strength: Record<string, number> = {};
  strength['RJD'] = 75;
  strength['BJP'] = 74;
  strength['JDU'] = 43;
  strength['INC'] = 19;
  strength['HAM'] = 4;
  strength['VIP'] = 4;
  strength['CPI'] = 2;
  strength['CPIM'] = 2;
  strength['Others'] = 20;
  // Apply ledger entries
  for (const entry of BR_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditBRLedger() { return BR_POLITICAL_LEDGER; }
export function getBRConstituencyTimeline(acNo: number) { return BR_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getBRDefectionSummary() { return BR_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
