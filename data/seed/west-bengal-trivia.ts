/**
 * West Bengal — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface WBTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const WB_TRIVIA: WBTriviaItem[] = [];

export function getAllWBTrivia() { return WB_TRIVIA; }
export function getWBTriviaForConstituency(acNo: number) { return WB_TRIVIA.filter(t => t.acNo === acNo); }
export function getWBTriviaForParty(party: string) { return WB_TRIVIA.filter(t => t.party === party); }
export function getWBTriviaForElection(year: number) { return WB_TRIVIA.filter(t => t.year === year); }
export function getWBRandomTrivia() { return WB_TRIVIA[Math.floor(Math.random() * WB_TRIVIA.length)] || null; }
