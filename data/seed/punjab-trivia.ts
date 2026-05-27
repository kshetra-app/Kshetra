/**
 * Punjab — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface PBTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const PB_TRIVIA: PBTriviaItem[] = [];

export function getAllPBTrivia() { return PB_TRIVIA; }
export function getPBTriviaForConstituency(acNo: number) { return PB_TRIVIA.filter(t => t.acNo === acNo); }
export function getPBTriviaForParty(party: string) { return PB_TRIVIA.filter(t => t.party === party); }
export function getPBTriviaForElection(year: number) { return PB_TRIVIA.filter(t => t.year === year); }
export function getPBRandomTrivia() { return PB_TRIVIA[Math.floor(Math.random() * PB_TRIVIA.length)] || null; }
