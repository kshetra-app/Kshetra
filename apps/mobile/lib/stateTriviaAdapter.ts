/**
 * State Trivia Adapter
 *
 * Routes trivia queries to the correct state-specific trivia module
 * based on the active state code.
 */
import type { TriviaItem } from '../../../data/seed/telangana-trivia';
import {
  getAllTrivia,
  getTriviaForConstituency,
  getRandomTriviaSet,
} from '../../../data/seed/telangana-trivia';
import {
  getAPAllTrivia,
  getAPTriviaForConstituency,
  getAPRandomTriviaSet,
} from '../../../data/seed/andhra-pradesh-trivia';
import {
  getKAAllTrivia,
  getKATriviaForConstituency,
} from '../../../data/seed/karnataka-trivia';
import {
  getMHAllTrivia,
  getMHTriviaForConstituency,
} from '../../../data/seed/maharashtra-trivia';

/** Get a random set of trivia items for the given state */
export function getRandomTriviaSetForState(
  stateCode: string,
  count: number,
): TriviaItem[] {
  let all: TriviaItem[];
  switch (stateCode.toUpperCase()) {
    case 'TS':
      return getRandomTriviaSet(count);
    case 'AP':
      return getAPRandomTriviaSet(count);
    case 'KA':
      all = [...getKAAllTrivia()];
      break;
    case 'MH':
      all = [...getMHAllTrivia()];
      break;
    default:
      return getRandomTriviaSet(count); // fallback to TS
  }
  // Shuffle and pick `count` items (for states without a dedicated set fn)
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

/** Get trivia items relevant to a specific constituency in the given state */
export function getTriviaForConstituencyInState(
  stateCode: string,
  acNo: number,
): TriviaItem[] {
  switch (stateCode.toUpperCase()) {
    case 'TS':
      return getTriviaForConstituency(acNo);
    case 'AP':
      return getAPTriviaForConstituency(acNo);
    case 'KA':
      return getKATriviaForConstituency(acNo);
    case 'MH':
      return getMHTriviaForConstituency(acNo);
    default:
      return [];
  }
}

/** Get all trivia for a state */
export function getAllTriviaForState(stateCode: string): TriviaItem[] {
  switch (stateCode.toUpperCase()) {
    case 'TS':
      return getAllTrivia();
    case 'AP':
      return getAPAllTrivia();
    case 'KA':
      return getKAAllTrivia();
    case 'MH':
      return getMHAllTrivia();
    default:
      return [];
  }
}
