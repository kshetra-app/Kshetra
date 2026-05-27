/**
 * Kerala — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface KLTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const KL_TRIVIA: KLTriviaItem[] = [];

export function getAllKLTrivia() { return KL_TRIVIA; }
export function getKLTriviaForConstituency(acNo: number) { return KL_TRIVIA.filter(t => t.acNo === acNo); }
export function getKLTriviaForParty(party: string) { return KL_TRIVIA.filter(t => t.party === party); }
export function getKLTriviaForElection(year: number) { return KL_TRIVIA.filter(t => t.year === year); }
export function getKLRandomTrivia() { return KL_TRIVIA[Math.floor(Math.random() * KL_TRIVIA.length)] || null; }
