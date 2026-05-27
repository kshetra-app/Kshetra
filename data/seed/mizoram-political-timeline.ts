/**
 * Mizoram — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface MZPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const MZ_POLITICAL_LEDGER: MZPoliticalLedgerEntry[] = [];

export function computeMZPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  // Apply ledger entries
  for (const entry of MZ_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditMZLedger() { return MZ_POLITICAL_LEDGER; }
export function getMZConstituencyTimeline(acNo: number) { return MZ_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getMZDefectionSummary() { return MZ_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
