/**
 * Jammu Kashmir — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface JKTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const JK_TRIVIA: JKTriviaItem[] = [];

export function getAllJKTrivia() { return JK_TRIVIA; }
export function getJKTriviaForConstituency(acNo: number) { return JK_TRIVIA.filter(t => t.acNo === acNo); }
export function getJKTriviaForParty(party: string) { return JK_TRIVIA.filter(t => t.party === party); }
export function getJKTriviaForElection(year: number) { return JK_TRIVIA.filter(t => t.year === year); }
export function getJKRandomTrivia() { return JK_TRIVIA[Math.floor(Math.random() * JK_TRIVIA.length)] || null; }
