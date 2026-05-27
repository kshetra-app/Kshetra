/**
 * Madhya Pradesh — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface MPTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const MP_TRIVIA: MPTriviaItem[] = [];

export function getAllMPTrivia() { return MP_TRIVIA; }
export function getMPTriviaForConstituency(acNo: number) { return MP_TRIVIA.filter(t => t.acNo === acNo); }
export function getMPTriviaForParty(party: string) { return MP_TRIVIA.filter(t => t.party === party); }
export function getMPTriviaForElection(year: number) { return MP_TRIVIA.filter(t => t.year === year); }
export function getMPRandomTrivia() { return MP_TRIVIA[Math.floor(Math.random() * MP_TRIVIA.length)] || null; }
