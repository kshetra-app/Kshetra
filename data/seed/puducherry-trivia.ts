/**
 * Puducherry — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface PYTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const PY_TRIVIA: PYTriviaItem[] = [];

export function getAllPYTrivia() { return PY_TRIVIA; }
export function getPYTriviaForConstituency(acNo: number) { return PY_TRIVIA.filter(t => t.acNo === acNo); }
export function getPYTriviaForParty(party: string) { return PY_TRIVIA.filter(t => t.party === party); }
export function getPYTriviaForElection(year: number) { return PY_TRIVIA.filter(t => t.year === year); }
export function getPYRandomTrivia() { return PY_TRIVIA[Math.floor(Math.random() * PY_TRIVIA.length)] || null; }
