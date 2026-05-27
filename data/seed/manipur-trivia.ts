/**
 * Manipur — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface MNTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const MN_TRIVIA: MNTriviaItem[] = [];

export function getAllMNTrivia() { return MN_TRIVIA; }
export function getMNTriviaForConstituency(acNo: number) { return MN_TRIVIA.filter(t => t.acNo === acNo); }
export function getMNTriviaForParty(party: string) { return MN_TRIVIA.filter(t => t.party === party); }
export function getMNTriviaForElection(year: number) { return MN_TRIVIA.filter(t => t.year === year); }
export function getMNRandomTrivia() { return MN_TRIVIA[Math.floor(Math.random() * MN_TRIVIA.length)] || null; }
