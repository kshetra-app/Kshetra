/**
 * Bihar — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface BRTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const BR_TRIVIA: BRTriviaItem[] = [];

export function getAllBRTrivia() { return BR_TRIVIA; }
export function getBRTriviaForConstituency(acNo: number) { return BR_TRIVIA.filter(t => t.acNo === acNo); }
export function getBRTriviaForParty(party: string) { return BR_TRIVIA.filter(t => t.party === party); }
export function getBRTriviaForElection(year: number) { return BR_TRIVIA.filter(t => t.year === year); }
export function getBRRandomTrivia() { return BR_TRIVIA[Math.floor(Math.random() * BR_TRIVIA.length)] || null; }
