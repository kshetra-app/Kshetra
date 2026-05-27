/**
 * Nagaland — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface NLPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const NL_POLITICAL_LEDGER: NLPoliticalLedgerEntry[] = [];

export function computeNLPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NCP'] = (strength['NCP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NCP'] = (strength['NCP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NCP'] = (strength['NCP'] || 0) + 1;
  strength['RPI('] = (strength['RPI('] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['NPF'] = (strength['NPF'] || 0) + 1;
  strength['LJPV'] = (strength['LJPV'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NCP'] = (strength['NCP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['LJPV'] = (strength['LJPV'] || 0) + 1;
  strength['JD(U)'] = (strength['JD(U)'] || 0) + 1;
  strength['RPI('] = (strength['RPI('] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NCP'] = (strength['NCP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  // Apply ledger entries
  for (const entry of NL_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditNLLedger() { return NL_POLITICAL_LEDGER; }
export function getNLConstituencyTimeline(acNo: number) { return NL_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getNLDefectionSummary() { return NL_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
