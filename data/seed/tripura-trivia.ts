/**
 * Tripura — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface TRTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const TR_TRIVIA: TRTriviaItem[] = [];

export function getAllTRTrivia() { return TR_TRIVIA; }
export function getTRTriviaForConstituency(acNo: number) { return TR_TRIVIA.filter(t => t.acNo === acNo); }
export function getTRTriviaForParty(party: string) { return TR_TRIVIA.filter(t => t.party === party); }
export function getTRTriviaForElection(year: number) { return TR_TRIVIA.filter(t => t.year === year); }
export function getTRRandomTrivia() { return TR_TRIVIA[Math.floor(Math.random() * TR_TRIVIA.length)] || null; }
