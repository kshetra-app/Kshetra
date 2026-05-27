/**
 * Himachal Pradesh — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface HPTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const HP_TRIVIA: HPTriviaItem[] = [];

export function getAllHPTrivia() { return HP_TRIVIA; }
export function getHPTriviaForConstituency(acNo: number) { return HP_TRIVIA.filter(t => t.acNo === acNo); }
export function getHPTriviaForParty(party: string) { return HP_TRIVIA.filter(t => t.party === party); }
export function getHPTriviaForElection(year: number) { return HP_TRIVIA.filter(t => t.year === year); }
export function getHPRandomTrivia() { return HP_TRIVIA[Math.floor(Math.random() * HP_TRIVIA.length)] || null; }
