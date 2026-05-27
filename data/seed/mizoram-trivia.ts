/**
 * Mizoram — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface MZTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const MZ_TRIVIA: MZTriviaItem[] = [];

export function getAllMZTrivia() { return MZ_TRIVIA; }
export function getMZTriviaForConstituency(acNo: number) { return MZ_TRIVIA.filter(t => t.acNo === acNo); }
export function getMZTriviaForParty(party: string) { return MZ_TRIVIA.filter(t => t.party === party); }
export function getMZTriviaForElection(year: number) { return MZ_TRIVIA.filter(t => t.year === year); }
export function getMZRandomTrivia() { return MZ_TRIVIA[Math.floor(Math.random() * MZ_TRIVIA.length)] || null; }
