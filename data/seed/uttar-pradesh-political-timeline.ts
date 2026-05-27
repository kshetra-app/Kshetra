/**
 * Uttar Pradesh — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface UPPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const UP_POLITICAL_LEDGER: UPPoliticalLedgerEntry[] = [];

export function computeUPPartyStrength(): Record<string, number> {
  const strength: Record<string, number> = {};
  strength['BJP'] = 255;
  strength['SP'] = 111;
  strength['RLD'] = 8;
  strength['INC'] = 2;
  strength['BSP'] = 1;
  strength['AIMIM'] = 1;
  strength['Others'] = 25;
  // Apply ledger entries
  for (const entry of UP_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditUPLedger() { return UP_POLITICAL_LEDGER; }
export function getUPConstituencyTimeline(acNo: number) { return UP_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getUPDefectionSummary() { return UP_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
