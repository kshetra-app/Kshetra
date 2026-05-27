/**
 * Meghalaya — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface MLPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const ML_POLITICAL_LEDGER: MLPoliticalLedgerEntry[] = [];

export function computeMLPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['PDF'] = (strength['PDF'] || 0) + 1;
  strength['VTPP'] = (strength['VTPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['VTPP'] = (strength['VTPP'] || 0) + 1;
  strength['HSPDP'] = (strength['HSPDP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['HSPDP'] = (strength['HSPDP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['VTPP'] = (strength['VTPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['VTPP'] = (strength['VTPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['PDF'] = (strength['PDF'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  // Apply ledger entries
  for (const entry of ML_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditMLLedger() { return ML_POLITICAL_LEDGER; }
export function getMLConstituencyTimeline(acNo: number) { return ML_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getMLDefectionSummary() { return ML_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
