/**
 * Meghalaya — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface MLTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const ML_TRIVIA: MLTriviaItem[] = [];

export function getAllMLTrivia() { return ML_TRIVIA; }
export function getMLTriviaForConstituency(acNo: number) { return ML_TRIVIA.filter(t => t.acNo === acNo); }
export function getMLTriviaForParty(party: string) { return ML_TRIVIA.filter(t => t.party === party); }
export function getMLTriviaForElection(year: number) { return ML_TRIVIA.filter(t => t.year === year); }
export function getMLRandomTrivia() { return ML_TRIVIA[Math.floor(Math.random() * ML_TRIVIA.length)] || null; }
