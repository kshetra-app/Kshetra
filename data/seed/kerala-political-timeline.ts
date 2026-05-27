/**
 * Kerala — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface KLPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const KL_POLITICAL_LEDGER: KLPoliticalLedgerEntry[] = [];

export function computeKLPartyStrength(): Record<string, number> {
  const strength: Record<string, number> = {};
  strength['CPIM'] = 62;
  strength['INC'] = 21;
  strength['IUML'] = 15;
  strength['KEC'] = 4;
  strength['CPI'] = 2;
  strength['RSP'] = 1;
  strength['NCP'] = 1;
  strength['Others'] = 34;
  // Apply ledger entries
  for (const entry of KL_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditKLLedger() { return KL_POLITICAL_LEDGER; }
export function getKLConstituencyTimeline(acNo: number) { return KL_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getKLDefectionSummary() { return KL_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
