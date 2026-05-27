/**
 * Jharkhand — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface JHTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const JH_TRIVIA: JHTriviaItem[] = [];

export function getAllJHTrivia() { return JH_TRIVIA; }
export function getJHTriviaForConstituency(acNo: number) { return JH_TRIVIA.filter(t => t.acNo === acNo); }
export function getJHTriviaForParty(party: string) { return JH_TRIVIA.filter(t => t.party === party); }
export function getJHTriviaForElection(year: number) { return JH_TRIVIA.filter(t => t.year === year); }
export function getJHRandomTrivia() { return JH_TRIVIA[Math.floor(Math.random() * JH_TRIVIA.length)] || null; }
