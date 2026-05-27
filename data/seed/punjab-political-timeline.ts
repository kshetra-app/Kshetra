/**
 * Punjab — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface PBPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const PB_POLITICAL_LEDGER: PBPoliticalLedgerEntry[] = [];

export function computePBPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['SAD'] = (strength['SAD'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['SAD'] = (strength['SAD'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BSP'] = (strength['BSP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  // Apply ledger entries
  for (const entry of PB_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditPBLedger() { return PB_POLITICAL_LEDGER; }
export function getPBConstituencyTimeline(acNo: number) { return PB_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getPBDefectionSummary() { return PB_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
