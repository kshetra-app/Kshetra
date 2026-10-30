import { PARTY_CONFIG, STATES } from '@kshetra/shared';
import { getUnifiedConstituenciesForState } from './stateDataAdapter';

export interface PartyLegendItem {
  party: string;
  label: string;
  seats: number;
}

/**
 * Builds party legend dynamically from state or national seed data, sorted by seat count / states ruled.
 * Never truncates with arbitrary slice caps — supports infinite vertical scrolling.
 */
export function buildPartyLegend(stateCode: string): PartyLegendItem[] {
  if (stateCode.toUpperCase() === 'IN') {
    const counts = new Map<string, number>();
    for (const state of Object.values(STATES)) {
      const p = state.rulingParty;
      if (p) {
        counts.set(p, (counts.get(p) ?? 0) + 1);
      }
    }

    // Include other major parties across India from PARTY_CONFIG
    for (const p of Object.keys(PARTY_CONFIG)) {
      if (!counts.has(p) && p !== 'OTH' && p !== 'IND') {
        counts.set(p, 0);
      }
    }
    if (PARTY_CONFIG['IND']) counts.set('IND', 0);
    if (PARTY_CONFIG['OTH']) counts.set('OTH', 0);

    return Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        if (a[0] === 'OTH') return 1;
        if (b[0] === 'OTH') return -1;
        if (a[0] === 'IND') return 1;
        if (b[0] === 'IND') return -1;
        return a[0].localeCompare(b[0]);
      })
      .map(([party, statesRuled]) => ({
        party,
        label: (PARTY_CONFIG as Record<string, { name: string }>)[party]?.name ?? party,
        seats: statesRuled,
      }));
  }

  const constituencies = getUnifiedConstituenciesForState(stateCode);
  if (constituencies.length === 0) return [];

  const counts = new Map<string, number>();
  for (const c of constituencies) {
    const p = c.currentParty || c.winnerParty;
    if (p) {
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
  }

  // Display all active parties without artificial truncation
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([party, seats]) => ({
      party,
      label: (PARTY_CONFIG as Record<string, { name: string }>)[party]?.name ?? party,
      seats,
    }));
}
