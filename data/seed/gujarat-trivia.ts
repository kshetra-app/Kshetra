/**
 * Gujarat — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface GJTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const GJ_TRIVIA: GJTriviaItem[] = [];

export function getAllGJTrivia() { return GJ_TRIVIA; }
export function getGJTriviaForConstituency(acNo: number) { return GJ_TRIVIA.filter(t => t.acNo === acNo); }
export function getGJTriviaForParty(party: string) { return GJ_TRIVIA.filter(t => t.party === party); }
export function getGJTriviaForElection(year: number) { return GJ_TRIVIA.filter(t => t.year === year); }
export function getGJRandomTrivia() { return GJ_TRIVIA[Math.floor(Math.random() * GJ_TRIVIA.length)] || null; }
