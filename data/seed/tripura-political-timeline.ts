/**
 * Tripura — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface TRPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const TR_POLITICAL_LEDGER: TRPoliticalLedgerEntry[] = [];

export function computeTRPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['IPFT'] = (strength['IPFT'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  // Apply ledger entries
  for (const entry of TR_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditTRLedger() { return TR_POLITICAL_LEDGER; }
export function getTRConstituencyTimeline(acNo: number) { return TR_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getTRDefectionSummary() { return TR_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
