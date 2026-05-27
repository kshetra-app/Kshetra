/**
 * Tamil Nadu — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface TNTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const TN_TRIVIA: TNTriviaItem[] = [];

export function getAllTNTrivia() { return TN_TRIVIA; }
export function getTNTriviaForConstituency(acNo: number) { return TN_TRIVIA.filter(t => t.acNo === acNo); }
export function getTNTriviaForParty(party: string) { return TN_TRIVIA.filter(t => t.party === party); }
export function getTNTriviaForElection(year: number) { return TN_TRIVIA.filter(t => t.year === year); }
export function getTNRandomTrivia() { return TN_TRIVIA[Math.floor(Math.random() * TN_TRIVIA.length)] || null; }
