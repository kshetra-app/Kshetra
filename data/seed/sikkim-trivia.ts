/**
 * Sikkim — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface SKTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const SK_TRIVIA: SKTriviaItem[] = [];

export function getAllSKTrivia() { return SK_TRIVIA; }
export function getSKTriviaForConstituency(acNo: number) { return SK_TRIVIA.filter(t => t.acNo === acNo); }
export function getSKTriviaForParty(party: string) { return SK_TRIVIA.filter(t => t.party === party); }
export function getSKTriviaForElection(year: number) { return SK_TRIVIA.filter(t => t.year === year); }
export function getSKRandomTrivia() { return SK_TRIVIA[Math.floor(Math.random() * SK_TRIVIA.length)] || null; }
