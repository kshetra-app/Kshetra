/**
 * Assam — Political Trivia (Stub)
 * AUTO-GENERATED. Add compelling facts about constituencies.
 */

export interface ASTriviaItem {
  id: string;
  type: 'constituency' | 'party' | 'election' | 'mla';
  acNo?: number;
  party?: string;
  year?: number;
  headline: string;
  body: string;
  source?: string;
}

export const AS_TRIVIA: ASTriviaItem[] = [];

export function getAllASTrivia() { return AS_TRIVIA; }
export function getASTriviaForConstituency(acNo: number) { return AS_TRIVIA.filter(t => t.acNo === acNo); }
export function getASTriviaForParty(party: string) { return AS_TRIVIA.filter(t => t.party === party); }
export function getASTriviaForElection(year: number) { return AS_TRIVIA.filter(t => t.year === year); }
export function getASRandomTrivia() { return AS_TRIVIA[Math.floor(Math.random() * AS_TRIVIA.length)] || null; }
