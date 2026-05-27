/**
 * Arunachal Pradesh — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface ARTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const AR_TRIVIA: ARTriviaItem[] = [];

export function getAllARTrivia() { return AR_TRIVIA; }
export function getARTriviaForConstituency(acNo: number) { return AR_TRIVIA.filter(t => t.acNo === acNo); }
export function getARTriviaForParty(party: string) { return AR_TRIVIA.filter(t => t.party === party); }
export function getARTriviaForElection(year: number) { return AR_TRIVIA.filter(t => t.year === year); }
export function getARRandomTrivia() { return AR_TRIVIA[Math.floor(Math.random() * AR_TRIVIA.length)] || null; }
