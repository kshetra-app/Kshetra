/**
 * Haryana — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface HRTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const HR_TRIVIA: HRTriviaItem[] = [];

export function getAllHRTrivia() { return HR_TRIVIA; }
export function getHRTriviaForConstituency(acNo: number) { return HR_TRIVIA.filter(t => t.acNo === acNo); }
export function getHRTriviaForParty(party: string) { return HR_TRIVIA.filter(t => t.party === party); }
export function getHRTriviaForElection(year: number) { return HR_TRIVIA.filter(t => t.year === year); }
export function getHRRandomTrivia() { return HR_TRIVIA[Math.floor(Math.random() * HR_TRIVIA.length)] || null; }
