/**
 * Puducherry — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface PYPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const PY_POLITICAL_LEDGER: PYPoliticalLedgerEntry[] = [];

export function computePYPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['DMK'] = (strength['DMK'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['DMK'] = (strength['DMK'] || 0) + 1;
  strength['LJK('] = (strength['LJK('] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['TVK'] = (strength['TVK'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['NMK'] = (strength['NMK'] || 0) + 1;
  strength['AIADMK'] = (strength['AIADMK'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['DMK'] = (strength['DMK'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  // Apply ledger entries
  for (const entry of PY_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditPYLedger() { return PY_POLITICAL_LEDGER; }
export function getPYConstituencyTimeline(acNo: number) { return PY_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getPYDefectionSummary() { return PY_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
