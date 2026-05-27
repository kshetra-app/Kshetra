/**
 * Delhi — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface DLTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const DL_TRIVIA: DLTriviaItem[] = [];

export function getAllDLTrivia() { return DL_TRIVIA; }
export function getDLTriviaForConstituency(acNo: number) { return DL_TRIVIA.filter(t => t.acNo === acNo); }
export function getDLTriviaForParty(party: string) { return DL_TRIVIA.filter(t => t.party === party); }
export function getDLTriviaForElection(year: number) { return DL_TRIVIA.filter(t => t.year === year); }
export function getDLRandomTrivia() { return DL_TRIVIA[Math.floor(Math.random() * DL_TRIVIA.length)] || null; }
