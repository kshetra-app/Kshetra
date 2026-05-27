/**
 * Nagaland — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface NLTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const NL_TRIVIA: NLTriviaItem[] = [];

export function getAllNLTrivia() { return NL_TRIVIA; }
export function getNLTriviaForConstituency(acNo: number) { return NL_TRIVIA.filter(t => t.acNo === acNo); }
export function getNLTriviaForParty(party: string) { return NL_TRIVIA.filter(t => t.party === party); }
export function getNLTriviaForElection(year: number) { return NL_TRIVIA.filter(t => t.year === year); }
export function getNLRandomTrivia() { return NL_TRIVIA[Math.floor(Math.random() * NL_TRIVIA.length)] || null; }
