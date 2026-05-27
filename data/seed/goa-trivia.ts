/**
 * Goa — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface GATriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const GA_TRIVIA: GATriviaItem[] = [];

export function getAllGATrivia() { return GA_TRIVIA; }
export function getGATriviaForConstituency(acNo: number) { return GA_TRIVIA.filter(t => t.acNo === acNo); }
export function getGATriviaForParty(party: string) { return GA_TRIVIA.filter(t => t.party === party); }
export function getGATriviaForElection(year: number) { return GA_TRIVIA.filter(t => t.year === year); }
export function getGARandomTrivia() { return GA_TRIVIA[Math.floor(Math.random() * GA_TRIVIA.length)] || null; }
