/**
 * Chhattisgarh — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface CGTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const CG_TRIVIA: CGTriviaItem[] = [];

export function getAllCGTrivia() { return CG_TRIVIA; }
export function getCGTriviaForConstituency(acNo: number) { return CG_TRIVIA.filter(t => t.acNo === acNo); }
export function getCGTriviaForParty(party: string) { return CG_TRIVIA.filter(t => t.party === party); }
export function getCGTriviaForElection(year: number) { return CG_TRIVIA.filter(t => t.year === year); }
export function getCGRandomTrivia() { return CG_TRIVIA[Math.floor(Math.random() * CG_TRIVIA.length)] || null; }
