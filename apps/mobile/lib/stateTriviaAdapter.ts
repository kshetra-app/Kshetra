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
import {
  getARAllTrivia,
  getARTriviaForConstituency,
} from '../../../data/seed/arunachal-pradesh-trivia';
import {
  getASAllTrivia,
  getASTriviaForConstituency,
} from '../../../data/seed/assam-trivia';
import {
  getBRAllTrivia,
  getBRTriviaForConstituency,
} from '../../../data/seed/bihar-trivia';
import {
  getCGAllTrivia,
  getCGTriviaForConstituency,
} from '../../../data/seed/chhattisgarh-trivia';
import {
  getDLAllTrivia,
  getDLTriviaForConstituency,
} from '../../../data/seed/delhi-trivia';
import {
  getGAAllTrivia,
  getGATriviaForConstituency,
} from '../../../data/seed/goa-trivia';
import {
  getGJAllTrivia,
  getGJTriviaForConstituency,
} from '../../../data/seed/gujarat-trivia';
import {
  getHRAllTrivia,
  getHRTriviaForConstituency,
} from '../../../data/seed/haryana-trivia';
import {
  getHPAllTrivia,
  getHPTriviaForConstituency,
} from '../../../data/seed/himachal-pradesh-trivia';
import {
  getJKAllTrivia,
  getJKTriviaForConstituency,
} from '../../../data/seed/jammu-kashmir-trivia';
import {
  getJHAllTrivia,
  getJHTriviaForConstituency,
} from '../../../data/seed/jharkhand-trivia';
import {
  getKLAllTrivia,
  getKLTriviaForConstituency,
} from '../../../data/seed/kerala-trivia';
import {
  getMPAllTrivia,
  getMPTriviaForConstituency,
} from '../../../data/seed/madhya-pradesh-trivia';
import {
  getMNAllTrivia,
  getMNTriviaForConstituency,
} from '../../../data/seed/manipur-trivia';
import {
  getMLAllTrivia,
  getMLTriviaForConstituency,
} from '../../../data/seed/meghalaya-trivia';
import {
  getMZAllTrivia,
  getMZTriviaForConstituency,
} from '../../../data/seed/mizoram-trivia';
import {
  getNLAllTrivia,
  getNLTriviaForConstituency,
} from '../../../data/seed/nagaland-trivia';
import {
  getODAllTrivia,
  getODTriviaForConstituency,
} from '../../../data/seed/odisha-trivia';
import {
  getPYAllTrivia,
  getPYTriviaForConstituency,
} from '../../../data/seed/puducherry-trivia';
import {
  getPBAllTrivia,
  getPBTriviaForConstituency,
} from '../../../data/seed/punjab-trivia';
import {
  getRJAllTrivia,
  getRJTriviaForConstituency,
} from '../../../data/seed/rajasthan-trivia';
import {
  getSKAllTrivia,
  getSKTriviaForConstituency,
} from '../../../data/seed/sikkim-trivia';
import {
  getTNAllTrivia,
  getTNTriviaForConstituency,
} from '../../../data/seed/tamil-nadu-trivia';
import {
  getTRAllTrivia,
  getTRTriviaForConstituency,
} from '../../../data/seed/tripura-trivia';
import {
  getUPAllTrivia,
  getUPTriviaForConstituency,
} from '../../../data/seed/uttar-pradesh-trivia';
import {
  getUKAllTrivia,
  getUKTriviaForConstituency,
} from '../../../data/seed/uttarakhand-trivia';
import {
  getWBAllTrivia,
  getWBTriviaForConstituency,
} from '../../../data/seed/west-bengal-trivia';

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
    case 'AR':
      all = [...getARAllTrivia()];
      break;
    case 'AS':
      all = [...getASAllTrivia()];
      break;
    case 'BR':
      all = [...getBRAllTrivia()];
      break;
    case 'CG':
      all = [...getCGAllTrivia()];
      break;
    case 'DL':
      all = [...getDLAllTrivia()];
      break;
    case 'GA':
      all = [...getGAAllTrivia()];
      break;
    case 'GJ':
      all = [...getGJAllTrivia()];
      break;
    case 'HR':
      all = [...getHRAllTrivia()];
      break;
    case 'HP':
      all = [...getHPAllTrivia()];
      break;
    case 'JK':
      all = [...getJKAllTrivia()];
      break;
    case 'JH':
      all = [...getJHAllTrivia()];
      break;
    case 'KL':
      all = [...getKLAllTrivia()];
      break;
    case 'MP':
      all = [...getMPAllTrivia()];
      break;
    case 'MN':
      all = [...getMNAllTrivia()];
      break;
    case 'ML':
      all = [...getMLAllTrivia()];
      break;
    case 'MZ':
      all = [...getMZAllTrivia()];
      break;
    case 'NL':
      all = [...getNLAllTrivia()];
      break;
    case 'OD':
      all = [...getODAllTrivia()];
      break;
    case 'PY':
      all = [...getPYAllTrivia()];
      break;
    case 'PB':
      all = [...getPBAllTrivia()];
      break;
    case 'RJ':
      all = [...getRJAllTrivia()];
      break;
    case 'SK':
      all = [...getSKAllTrivia()];
      break;
    case 'TN':
      all = [...getTNAllTrivia()];
      break;
    case 'TR':
      all = [...getTRAllTrivia()];
      break;
    case 'UP':
      all = [...getUPAllTrivia()];
      break;
    case 'UK':
      all = [...getUKAllTrivia()];
      break;
    case 'WB':
      all = [...getWBAllTrivia()];
      break;
    default:
      return [];
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
    case 'AR':
      return getARTriviaForConstituency(acNo);
    case 'AS':
      return getASTriviaForConstituency(acNo);
    case 'BR':
      return getBRTriviaForConstituency(acNo);
    case 'CG':
      return getCGTriviaForConstituency(acNo);
    case 'DL':
      return getDLTriviaForConstituency(acNo);
    case 'GA':
      return getGATriviaForConstituency(acNo);
    case 'GJ':
      return getGJTriviaForConstituency(acNo);
    case 'HR':
      return getHRTriviaForConstituency(acNo);
    case 'HP':
      return getHPTriviaForConstituency(acNo);
    case 'JK':
      return getJKTriviaForConstituency(acNo);
    case 'JH':
      return getJHTriviaForConstituency(acNo);
    case 'KL':
      return getKLTriviaForConstituency(acNo);
    case 'MP':
      return getMPTriviaForConstituency(acNo);
    case 'MN':
      return getMNTriviaForConstituency(acNo);
    case 'ML':
      return getMLTriviaForConstituency(acNo);
    case 'MZ':
      return getMZTriviaForConstituency(acNo);
    case 'NL':
      return getNLTriviaForConstituency(acNo);
    case 'OD':
      return getODTriviaForConstituency(acNo);
    case 'PY':
      return getPYTriviaForConstituency(acNo);
    case 'PB':
      return getPBTriviaForConstituency(acNo);
    case 'RJ':
      return getRJTriviaForConstituency(acNo);
    case 'SK':
      return getSKTriviaForConstituency(acNo);
    case 'TN':
      return getTNTriviaForConstituency(acNo);
    case 'TR':
      return getTRTriviaForConstituency(acNo);
    case 'UP':
      return getUPTriviaForConstituency(acNo);
    case 'UK':
      return getUKTriviaForConstituency(acNo);
    case 'WB':
      return getWBTriviaForConstituency(acNo);
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
    case 'AR':
      return getARAllTrivia();
    case 'AS':
      return getASAllTrivia();
    case 'BR':
      return getBRAllTrivia();
    case 'CG':
      return getCGAllTrivia();
    case 'DL':
      return getDLAllTrivia();
    case 'GA':
      return getGAAllTrivia();
    case 'GJ':
      return getGJAllTrivia();
    case 'HR':
      return getHRAllTrivia();
    case 'HP':
      return getHPAllTrivia();
    case 'JK':
      return getJKAllTrivia();
    case 'JH':
      return getJHAllTrivia();
    case 'KL':
      return getKLAllTrivia();
    case 'MP':
      return getMPAllTrivia();
    case 'MN':
      return getMNAllTrivia();
    case 'ML':
      return getMLAllTrivia();
    case 'MZ':
      return getMZAllTrivia();
    case 'NL':
      return getNLAllTrivia();
    case 'OD':
      return getODAllTrivia();
    case 'PY':
      return getPYAllTrivia();
    case 'PB':
      return getPBAllTrivia();
    case 'RJ':
      return getRJAllTrivia();
    case 'SK':
      return getSKAllTrivia();
    case 'TN':
      return getTNAllTrivia();
    case 'TR':
      return getTRAllTrivia();
    case 'UP':
      return getUPAllTrivia();
    case 'UK':
      return getUKAllTrivia();
    case 'WB':
      return getWBAllTrivia();
    default:
      return [];
  }
}
