/**
 * Sikkim — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface SKPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const SK_POLITICAL_LEDGER: SKPoliticalLedgerEntry[] = [];

export function computeSKPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SDF'] = (strength['SDF'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  // Apply ledger entries
  for (const entry of SK_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditSKLedger() { return SK_POLITICAL_LEDGER; }
export function getSKConstituencyTimeline(acNo: number) { return SK_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getSKDefectionSummary() { return SK_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
