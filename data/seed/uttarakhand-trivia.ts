/**
 * Uttarakhand — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface UKTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const UK_TRIVIA: UKTriviaItem[] = [];

export function getAllUKTrivia() { return UK_TRIVIA; }
export function getUKTriviaForConstituency(acNo: number) { return UK_TRIVIA.filter(t => t.acNo === acNo); }
export function getUKTriviaForParty(party: string) { return UK_TRIVIA.filter(t => t.party === party); }
export function getUKTriviaForElection(year: number) { return UK_TRIVIA.filter(t => t.year === year); }
export function getUKRandomTrivia() { return UK_TRIVIA[Math.floor(Math.random() * UK_TRIVIA.length)] || null; }
