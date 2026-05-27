/**
 * Rajasthan — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface RJTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const RJ_TRIVIA: RJTriviaItem[] = [];

export function getAllRJTrivia() { return RJ_TRIVIA; }
export function getRJTriviaForConstituency(acNo: number) { return RJ_TRIVIA.filter(t => t.acNo === acNo); }
export function getRJTriviaForParty(party: string) { return RJ_TRIVIA.filter(t => t.party === party); }
export function getRJTriviaForElection(year: number) { return RJ_TRIVIA.filter(t => t.year === year); }
export function getRJRandomTrivia() { return RJ_TRIVIA[Math.floor(Math.random() * RJ_TRIVIA.length)] || null; }
