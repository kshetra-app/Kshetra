/**
 * Odisha — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface ODTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const OD_TRIVIA: ODTriviaItem[] = [];

export function getAllODTrivia() { return OD_TRIVIA; }
export function getODTriviaForConstituency(acNo: number) { return OD_TRIVIA.filter(t => t.acNo === acNo); }
export function getODTriviaForParty(party: string) { return OD_TRIVIA.filter(t => t.party === party); }
export function getODTriviaForElection(year: number) { return OD_TRIVIA.filter(t => t.year === year); }
export function getODRandomTrivia() { return OD_TRIVIA[Math.floor(Math.random() * OD_TRIVIA.length)] || null; }
