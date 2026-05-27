/**
 * Uttar Pradesh — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface UPTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const UP_TRIVIA: UPTriviaItem[] = [];

export function getAllUPTrivia() { return UP_TRIVIA; }
export function getUPTriviaForConstituency(acNo: number) { return UP_TRIVIA.filter(t => t.acNo === acNo); }
export function getUPTriviaForParty(party: string) { return UP_TRIVIA.filter(t => t.party === party); }
export function getUPTriviaForElection(year: number) { return UP_TRIVIA.filter(t => t.year === year); }
export function getUPRandomTrivia() { return UP_TRIVIA[Math.floor(Math.random() * UP_TRIVIA.length)] || null; }
