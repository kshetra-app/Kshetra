/**
 * West Bengal — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface WBPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const WB_POLITICAL_LEDGER: WBPoliticalLedgerEntry[] = [];

export function computeWBPartyStrength(): Record<string, number> {
  const strength: Record<string, number> = {};
  strength['AITC'] = 213;
  strength['BJP'] = 77;
  strength['ISF'] = 1;
  strength['Others'] = 3;
  // Apply ledger entries
  for (const entry of WB_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditWBLedger() { return WB_POLITICAL_LEDGER; }
export function getWBConstituencyTimeline(acNo: number) { return WB_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getWBDefectionSummary() { return WB_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
