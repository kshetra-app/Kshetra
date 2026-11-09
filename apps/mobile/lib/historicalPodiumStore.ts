/**
 * historicalPodiumStore.ts — Offline-first historical election podium records from 1999 to 2024.
 * Provides Winner, 1st Runner-up (2nd Place), and 2nd Runner-up (3rd Place) with full
 * votes, vote shares, margins, affidavits, photos, and 13-language localized names.
 */

export interface CandidatePodiumDetail {
  name: string;
  party: string;
  votes?: number;
  voteShare?: number;
  marginToWinner?: number;
  marginToFirstRunnerUp?: number;
  localizedNames?: Record<string, string>;
  localizedParties?: Record<string, string>;
  photoUrl?: string | null;
  affidavitUrl?: string | null;
  age?: number | null;
  education?: string | null;
  profession?: string | null;
  criminalCases?: number | null;
  totalAssets?: number | null;
  totalLiabilities?: number | null;
}

export interface HistoricalPodiumContest {
  year: number;
  delimitationId?: string;
  totalValidVotes?: number;
  constituencyName?: string;
  localizedConstituencyNames?: Record<string, string>;
  marginWinnerToRunnerUp1?: number;
  marginWinnerToRunnerUp2?: number;
  marginRunnerUp1ToRunnerUp2?: number;
  winner: CandidatePodiumDetail | null;
  firstRunnerUp: CandidatePodiumDetail | null;
  secondRunnerUp: CandidatePodiumDetail | null;
}

import { API_BASE_URL } from './constants';
import { stripHonorifics, getCanonicalCandidateName } from './candidatePhotos';

// In-memory cache for parsed state podium files (hydrated on demand from API or local cache)
const stateCache = new Map<string, Record<string, HistoricalPodiumContest[]>>();
let lokSabhaNameIndex: Map<string, HistoricalPodiumContest[]> | null = null;
let lokSabhaNoIndex: Map<number, HistoricalPodiumContest[]> | null = null;

/**
 * Hydrates state podium data into in-memory cache
 */
export function setCachedStatePodium(stateCode: string, data: Record<string, HistoricalPodiumContest[]>): void {
  const code = (stateCode || 'TS').toUpperCase();
  stateCache.set(code, data);
  if (code === 'IN' || code === 'LOK_SABHA') {
    lokSabhaNameIndex = null;
    lokSabhaNoIndex = null;
  }
}

/**
 * Reconciles and sanitizes an election contest against authoritative local seed data.
 * Protects against stale remote API responses, old GeoJSON fallbacks, or outdated CDN caches.
 */
export function sanitizeContestWithSeed(
  stateCode: string,
  acNoOrName: number | string,
  contest: HistoricalPodiumContest,
): HistoricalPodiumContest {
  if (!contest) return contest;
  try {
    const { getUnifiedConstituenciesForState } = require('./stateDataAdapter');
    const consts = getUnifiedConstituenciesForState(stateCode);
    const acNum = typeof acNoOrName === 'number' ? acNoOrName : parseInt(String(acNoOrName), 10);
    const seed = consts?.find((c: any) => c.acNo === acNum);
    if (seed && seed.electionYear != null && contest.year === seed.electionYear) {
      const authenticWinnerVotes = seed.winnerVotes ?? seed.votes;
      const authenticMargin = seed.margin;
      const authenticRuVotes = seed.runnerUpVotes;
      const isGenericCand = (n?: string | null) => !n || /candidate|runner\s*up|winner|ind|nota/i.test(n.trim());
      const authenticRuName = (!isGenericCand(seed.runnerUpName) ? seed.runnerUpName : null) ||
                              (!isGenericCand(contest.firstRunnerUp?.name) ? contest.firstRunnerUp?.name : null) ||
                              seed.runnerUpName || contest.firstRunnerUp?.name || seed.runnerUp || '';
      const authenticWinnerName = seed.winnerName || contest.winner?.name || seed.winner || '';

      if (authenticWinnerVotes != null && authenticWinnerVotes > 0) {
        if (contest.winner) {
          contest.winner.votes = authenticWinnerVotes;
          if (authenticWinnerName) contest.winner.name = authenticWinnerName;
          if (seed.winnerParty) contest.winner.party = seed.winnerParty;
        }
        if (authenticMargin != null) {
          contest.marginWinnerToRunnerUp1 = authenticMargin;
        }
        if (contest.firstRunnerUp) {
          if (authenticRuVotes != null) contest.firstRunnerUp.votes = authenticRuVotes;
          if (authenticRuName) contest.firstRunnerUp.name = authenticRuName;
          if (seed.runnerUp || (seed as any).runnerUpParty) contest.firstRunnerUp.party = seed.runnerUp || (seed as any).runnerUpParty;
          if (authenticMargin != null) contest.firstRunnerUp.marginToWinner = authenticMargin;
        }
      }
    }
  } catch {}
  return contest;
}

/**
 * On-demand asynchronous fetch for an entire state's historical podium data.
 */
export async function fetchStatePodium(stateCode: string): Promise<Record<string, HistoricalPodiumContest[]>> {
  const code = (stateCode || 'TS').toUpperCase();
  if (stateCache.has(code)) {
    return stateCache.get(code)!;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/states/${code}/podium`);
    if (res.ok) {
      const data = await res.json();
      for (const acKey of Object.keys(data)) {
        if (Array.isArray(data[acKey])) {
          data[acKey] = data[acKey].map((c: HistoricalPodiumContest) => sanitizeContestWithSeed(code, acKey, c));
        }
      }
      stateCache.set(code, data);
      return data;
    }
  } catch (err) {
    console.warn(`[historicalPodiumStore] Failed to fetch state podium for ${code}:`, err);
  }
  return {};
}

/**
 * On-demand asynchronous fetch for a single constituency's historical podium data (~4 KB).
 */
export async function fetchHistoricalPodiumForConstituency(
  stateCode: string,
  acNoOrName: number | string,
): Promise<HistoricalPodiumContest[]> {
  const code = (stateCode || 'TS').toUpperCase();
  const cached = getHistoricalPodiumForConstituency(code, acNoOrName);
  if (cached && cached.length > 0) {
    return cached;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/states/${code}/constituencies/${acNoOrName}/podium`);
    if (res.ok) {
      let contests = await res.json();
      if (Array.isArray(contests) && contests.length > 0) {
        contests = contests.map((c: HistoricalPodiumContest) => sanitizeContestWithSeed(code, acNoOrName, c));
        let stateMap = stateCache.get(code);
        if (!stateMap) {
          stateMap = {};
          stateCache.set(code, stateMap);
        }
        stateMap[String(acNoOrName)] = contests;
        return contests;
      }
    }
  } catch (err) {
    console.warn(`[historicalPodiumStore] Failed to fetch AC podium for ${code} ${acNoOrName}:`, err);
  }

  // Offline / fallback from SQLite prebuilt database
  try {
    const { loadHistoricalResultsForState, getHistoricalResults } = require('./seedDataLoader');
    await loadHistoricalResultsForState(code);
    const acNum = typeof acNoOrName === 'number' ? acNoOrName : parseInt(String(acNoOrName), 10);
    if (!isNaN(acNum)) {
      const rows = getHistoricalResults(code, acNum);
      if (rows && rows.length > 0) {
        const converted: HistoricalPodiumContest[] = rows.map((r: any) => sanitizeContestWithSeed(code, acNum, {
          year: r.year,
          ...(r.delimitation_id != null && String(r.delimitation_id).trim() !== '' ? { delimitationId: String(r.delimitation_id) } : {}),
          totalValidVotes: r.total_valid_votes ?? undefined,
          constituencyName: r.constituency_name,
          marginWinnerToRunnerUp1: r.margin_winner_to_runner_up_1,
          marginWinnerToRunnerUp2: r.margin_winner_to_runner_up_2,
          marginRunnerUp1ToRunnerUp2: r.margin_runner_up_1_to_runner_up_2,
          winner: {
            name: r.winner_name || r.winner,
            party: r.winner_party || r.party,
            votes: r.winner_votes,
            voteShare: r.winner_vote_share,
            education: r.winner_education,
            profession: r.winner_profession,
            criminalCases: r.winner_criminal_cases,
            totalAssets: r.winner_total_assets,
            totalLiabilities: r.winner_total_liabilities,
          },
          firstRunnerUp: r.first_runner_up_name ? {
            name: r.first_runner_up_name,
            party: r.first_runner_up_party,
            votes: r.first_runner_up_votes,
            voteShare: r.first_runner_up_vote_share,
            marginToWinner: r.margin_winner_to_runner_up_1,
          } : null,
          secondRunnerUp: r.second_runner_up_name ? {
            name: r.second_runner_up_name,
            party: r.second_runner_up_party,
            votes: r.second_runner_up_votes,
            voteShare: r.second_runner_up_vote_share,
            marginToWinner: r.margin_winner_to_runner_up_2,
            marginToFirstRunnerUp: r.margin_runner_up_1_to_runner_up_2,
          } : null,
        })).sort((a: any, b: any) => (b.year ?? 0) - (a.year ?? 0));

        let stateMap = stateCache.get(code);
        if (!stateMap) {
          stateMap = {};
          stateCache.set(code, stateMap);
        }
        stateMap[String(acNoOrName)] = converted;
        return converted;
      }
    }
  } catch {}

  const fallback = getLatestPodiumForConstituency(code, acNoOrName);
  return fallback ? [fallback] : (cached || []);
}

// Ultra-thin online architecture: Full historical multi-election datasets (~118 MB)
// are fetched on-demand over API/CDN and cached in-memory, avoiding 48 MB bundle bloat.
function getStateData(stateCode: string): Record<string, HistoricalPodiumContest[]> {
  const code = (stateCode || 'TS').toUpperCase();
  if (stateCache.has(code)) {
    return stateCache.get(code)!;
  }
  return {};
}

function buildLokSabhaIndexes() {
  if (lokSabhaNameIndex && lokSabhaNoIndex) return;
  lokSabhaNameIndex = new Map();
  lokSabhaNoIndex = new Map();

  const data = getStateData('IN');
  let pcCounter = 1;
  const seenConsts = new Map<string, number>();

  for (const clusterKey of Object.keys(data)) {
    const list = data[clusterKey];
    if (Array.isArray(list)) {
      for (const contest of list) {
        const rawName = contest.constituencyName?.trim() || '';
        const normName = rawName.toLowerCase();
        if (!normName) continue;

        if (!lokSabhaNameIndex.has(normName)) {
          lokSabhaNameIndex.set(normName, []);
        }
        lokSabhaNameIndex.get(normName)!.push(contest);

        // Assign continuous 1-543 PC number
        if (!seenConsts.has(normName)) {
          seenConsts.set(normName, pcCounter++);
        }
        const pcNo = seenConsts.get(normName)!;
        if (!lokSabhaNoIndex.has(pcNo)) {
          lokSabhaNoIndex.set(pcNo, []);
        }
        lokSabhaNoIndex.get(pcNo)!.push(contest);
      }
    }
  }

  // Sort each list descending by year
  for (const list of lokSabhaNameIndex.values()) {
    list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  }
  for (const list of lokSabhaNoIndex.values()) {
    list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  }
}

/**
 * Returns full election history for a constituency from 1999 to 2024 sorted descending by year
 */
export function getHistoricalPodiumForConstituency(
  stateCode: string,
  acNoOrName: number | string,
): HistoricalPodiumContest[] {
  const code = (stateCode || 'TS').toUpperCase();
  if (code === 'IN' || code === 'LOK_SABHA') {
    buildLokSabhaIndexes();
    if (typeof acNoOrName === 'number') {
      return lokSabhaNoIndex?.get(acNoOrName) || [];
    }
    const norm = String(acNoOrName).trim().toLowerCase();
    return lokSabhaNameIndex?.get(norm) || [];
  }

  const data = getStateData(code);
  const contests = data[String(acNoOrName)] || data[Number(acNoOrName) as any] || [];
  if (Array.isArray(contests) && contests.length > 0) {
    return [...contests]
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
      .map((c) => sanitizeContestWithSeed(code, acNoOrName, c));
  }

  try {
    const { getHistoricalResults } = require('./seedDataLoader');
    const acNum = typeof acNoOrName === 'number' ? acNoOrName : parseInt(String(acNoOrName), 10);
    if (!isNaN(acNum)) {
      const rows = getHistoricalResults(code, acNum);
      if (rows && rows.length > 0) {
        return rows.map((r: any) => sanitizeContestWithSeed(code, acNum, {
          year: r.year,
          ...(r.delimitation_id != null && String(r.delimitation_id).trim() !== '' ? { delimitationId: String(r.delimitation_id) } : {}),
          totalValidVotes: r.total_valid_votes ?? undefined,
          constituencyName: r.constituency_name,
          marginWinnerToRunnerUp1: r.margin_winner_to_runner_up_1,
          marginWinnerToRunnerUp2: r.margin_winner_to_runner_up_2,
          marginRunnerUp1ToRunnerUp2: r.margin_runner_up_1_to_runner_up_2,
          winner: {
            name: r.winner_name || r.winner,
            party: r.winner_party || r.party,
            votes: r.winner_votes,
            voteShare: r.winner_vote_share,
            education: r.winner_education,
            profession: r.winner_profession,
            criminalCases: r.winner_criminal_cases,
            totalAssets: r.winner_total_assets,
            totalLiabilities: r.winner_total_liabilities,
          },
          firstRunnerUp: r.first_runner_up_name ? {
            name: r.first_runner_up_name,
            party: r.first_runner_up_party,
            votes: r.first_runner_up_votes,
            voteShare: r.first_runner_up_vote_share,
            marginToWinner: r.margin_winner_to_runner_up_1,
          } : null,
          secondRunnerUp: r.second_runner_up_name ? {
            name: r.second_runner_up_name,
            party: r.second_runner_up_party,
            votes: r.second_runner_up_votes,
            voteShare: r.second_runner_up_vote_share,
            marginToWinner: r.margin_winner_to_runner_up_2,
            marginToFirstRunnerUp: r.margin_runner_up_1_to_runner_up_2,
          } : null,
        })).sort((a: any, b: any) => (b.year ?? 0) - (a.year ?? 0));
      }
    }
  } catch {}

  return [];
}

/**
 * Returns latest election contest podium for a constituency (e.g. 2023 or 2024)
 */
export function getLatestPodiumForConstituency(
  stateCode: string,
  acNoOrName: number | string,
): HistoricalPodiumContest | null {
  const list = getHistoricalPodiumForConstituency(stateCode, acNoOrName);
  if (list && list.length > 0) {
    const contest = sanitizeContestWithSeed(stateCode, acNoOrName, { ...list[0] });
    if (contest.firstRunnerUp && (!contest.firstRunnerUp.name || /candidate|runner\s*up/i.test(contest.firstRunnerUp.name))) {
      try {
        const { getUnifiedConstituenciesForState } = require('./stateDataAdapter');
        const consts = getUnifiedConstituenciesForState(stateCode);
        const acNo = typeof acNoOrName === 'number' ? acNoOrName : parseInt(String(acNoOrName), 10);
        const match = consts?.find((c: any) => c.acNo === acNo);
        if (match?.runnerUpName && !/candidate/i.test(match.runnerUpName)) {
          contest.firstRunnerUp = {
            ...contest.firstRunnerUp,
            name: match.runnerUpName,
            photoUrl: contest.firstRunnerUp.photoUrl || (match.runnerUpName ? require('./candidatePhotos').getStaticPhoto(match.runnerUpName) : undefined),
          };
        }
      } catch {}
    }
    return contest;
  }
  // Use fields that the adapter actually carries. Do not infer runner-up votes,
  // totals, shares, or an election year from partial records.
  try {
    const { getUnifiedConstituenciesForState } = require('./stateDataAdapter');
    const consts = getUnifiedConstituenciesForState(stateCode);
    const acNo = typeof acNoOrName === 'number' ? acNoOrName : parseInt(String(acNoOrName), 10);
    const match = consts?.find((c: any) => c.acNo === acNo);
    if (match) {
      const year = Number(match.electionYear);
      const winnerName = typeof match.winnerName === 'string' ? match.winnerName.trim() : '';
      const winnerParty = typeof match.winnerParty === 'string' ? match.winnerParty.trim() : '';
      if (!Number.isInteger(year) || year <= 0 || !winnerName || !winnerParty) return null;

      const readCount = (value: unknown): number | undefined =>
        typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
      const winnerVotes = readCount(match.winnerVotes);
      const runnerUpVotes = readCount(match.runnerUpVotes);
      const totalValidVotes = readCount(match.totalValidVotes);
      const margin = readCount(match.margin);
      const runnerUpName = typeof match.runnerUpName === 'string' ? match.runnerUpName.trim() : '';
      const runnerUpParty = typeof match.runnerUp === 'string' ? match.runnerUp.trim() : '';

      return {
        year,
        constituencyName: match.name,
        ...(totalValidVotes != null ? { totalValidVotes } : {}),
        ...(margin != null ? { marginWinnerToRunnerUp1: margin } : {}),
        winner: {
          name: winnerName,
          party: winnerParty,
          ...(winnerVotes != null ? { votes: winnerVotes } : {}),
          ...(typeof match.winnerVoteShare === 'number' ? { voteShare: match.winnerVoteShare } : {}),
          photoUrl: require('./candidatePhotos').getStaticPhoto(winnerName) || undefined,
        },
        firstRunnerUp: runnerUpName && runnerUpParty ? {
          name: runnerUpName,
          party: runnerUpParty,
          ...(runnerUpVotes != null ? { votes: runnerUpVotes } : {}),
          ...(typeof match.runnerUpVoteShare === 'number' ? { voteShare: match.runnerUpVoteShare } : {}),
          photoUrl: require('./candidatePhotos').getStaticPhoto(runnerUpName) || undefined,
        } : null,
        secondRunnerUp: null,
      };
    }
  } catch {}
  return null;
}

/**
 * Retrieves candidate detail by election year and podium rank
 */
export function getCandidatePodiumDetail(
  stateCode: string,
  acNoOrName: number | string,
  year: number,
  rank: 'winner' | 'ru1' | 'ru2',
): { candidate: CandidatePodiumDetail | null; contest: HistoricalPodiumContest | null } {
  const contests = getHistoricalPodiumForConstituency(stateCode, acNoOrName);
  const match = contests.find(c => c.year === year) || null;
  if (!match) return { candidate: null, contest: null };

  let candidate: CandidatePodiumDetail | null = null;
  if (rank === 'winner') candidate = match.winner;
  else if (rank === 'ru1') candidate = match.firstRunnerUp;
  else if (rank === 'ru2') candidate = match.secondRunnerUp;

  // Sanitize candidate name if generic
  if (candidate && (!candidate.name || /candidate|runner\s*up/i.test(candidate.name))) {
    try {
      const { getUnifiedConstituenciesForState } = require('./stateDataAdapter');
      const consts = getUnifiedConstituenciesForState(stateCode);
      const acNo = typeof acNoOrName === 'number' ? acNoOrName : parseInt(String(acNoOrName), 10);
      const m = consts?.find((c: any) => c.acNo === acNo);
      if (rank === 'ru1' && m?.runnerUpName && !/candidate/i.test(m.runnerUpName)) {
        candidate = {
          ...candidate,
          name: m.runnerUpName,
          photoUrl: candidate.photoUrl || require('./candidatePhotos').getStaticPhoto(m.runnerUpName) || undefined,
        };
      }
    } catch {}
  }

  return { candidate, contest: match };
}

/**
 * Verified canonical Indian regional translations for high profile leaders & sitting MLAs
 */
const COMMON_CANDIDATE_NAMES: Record<string, Record<string, string>> = {
  'Anumula Revanth Reddy': {
    te: 'అనుముల రేవంత్ రెడ్డి',
    hi: 'अनुमुल रेवंत रेड्डी',
    ta: 'அனுமுல ரேவந்த் ரெட்டி',
    kn: 'ಅನುಮುಲ ರೇವಂತ್ ರೆಡ್ಡಿ',
    ml: 'അനുമുല രേവന്ത് റെഡ്ഡി',
    mr: 'अनुमुल रेवंत रेड्डी',
  },
  'Revanth Reddy': {
    te: 'రేవంత్ రెడ్డి',
    hi: 'रेवंत रेड्डी',
    ta: 'ரேவந்த் ரெட்டி',
    kn: 'ರೇವಂತ್ ರೆಡ್ಡಿ',
    ml: 'രേവന്ത് റെഡ്ഡി',
    mr: 'रेवंत रेड्डी',
  },
  'Sri Ganesh Narayanan': {
    te: 'శ్రీ గణేష్ నారాయణన్',
    hi: 'श्री गणेश नारायणन',
    ta: 'ஸ்ரீ கணேஷ் நாராயணன்',
    kn: 'ಶ್ರೀ ಗಣೇಶ್ ನಾರಾಯಣನ್',
    mr: 'श्री गणेश नारायणन',
  },
  'Sri Ganesh': {
    te: 'శ్రీ గణేష్',
    hi: 'श्री गणेश',
    ta: 'ஸ்ரீ கணேஷ்',
    kn: 'ಶ್ರೀ ಗಣೇಶ್',
    mr: 'श्री गणेश',
  },
  'K. Chandrashekar Rao': {
    te: 'కె. చంద్రశేఖర్ రావు',
    hi: 'के. चंद्रशेखर राव',
    ta: 'கே. சந்திரசேகர் ராவ்',
    kn: 'ಕೆ. ಚಂದ್ರಶೇಖರ್ ರಾವ್',
    mr: 'के. चंद्रशेखर राव',
  },
  'K. T. Rama Rao': {
    te: 'కె. టి. రామారావు',
    hi: 'के. टी. रामा राव',
    ta: 'கே. டி. ராம ராவ்',
    kn: 'ಕೆ. ಟಿ. ರಾಮ ರಾವ್',
    mr: 'के. टी. रामा राव',
  },
  'Thanneeru Harish Rao': {
    te: 'తన్నీరు హరీష్ రావు',
    hi: 'तन्नीरु हरीश राव',
    ta: 'தன்னீரு ஹரீஷ் ராவ்',
    kn: 'ತನ್ನೀರು ಹರೀಶ್ ರಾವ್',
    mr: 'तन्नीरु हरीश राव',
  },
  'Akbaruddin Owaisi': {
    te: 'అక్బరుద్దీన్ ఒవైసీ',
    hi: 'अकबरुद्दीन ओवैसी',
    ta: 'அக்பருத்தீன் ஒவைசி',
    kn: 'ಅಕ್ಬರುದ್ದೀನ್ ಒವೈಸಿ',
    mr: 'अकबरुद्दीन ओवैसी',
  },
  'T. Raja Singh': {
    te: 'టి. రాజా సింగ్',
    hi: 'टी. राजा सिंह',
    ta: 'டி. ராஜா சிங்',
    kn: 'ಟಿ. ರಾಜಾ ಸಿಂಗ್',
    mr: 'टी. राजा सिंह',
  },
  'Mallu Bhatti Vikramarka': {
    te: 'మల్లు భట్టి విక్రమార్క',
    hi: 'मल्लु भट्टी विक्रमार्क',
    ta: 'மல்லு பட்டி விக்ரமார்கா',
    kn: 'ಮಲ್ಲು ಭಟ್ಟಿ ವಿಕ್ರಮಾರ್ಕ',
    mr: 'मल्लु भट्टी विक्रमार्क',
  },
  'Nara Chandrababu Naidu': {
    te: 'నారా చంద్రబాబు నాయుడు',
    hi: 'नारा चंद्रबाबू नायडू',
    ta: 'நாரா சந்திரபாபு நாயுடு',
    kn: 'ನಾರಾ ಚಂದ್ರಬಾಬು ನಾಯ್ಡು',
    mr: 'नारा चंद्रबाबू नायडू',
  },
  'Nara Lokesh': {
    te: 'నారా లోకేష్',
    hi: 'नारा लोकेश',
    ta: 'நாரா லோகேஷ்',
    kn: 'ನಾರಾ ಲೋಕೇಶ್',
    mr: 'नारा लोकेश',
  },
  'Pawan Kalyan': {
    te: 'పవన్ కళ్యాణ్',
    hi: 'पवन कल्याण',
    ta: 'பவன் கல்யாண்',
    kn: 'ಪವನ್ ಕಲ್ಯಾಣ್',
    mr: 'पवन कल्याण',
  },
  'Y. S. Jagan Mohan Reddy': {
    te: 'వై. ఎస్. జగన్ మోహన్ రెడ్డి',
    hi: 'वाई. एस. जगन मोहन रेड्डी',
    ta: 'ஒய். எஸ். ஜெகன் மோகன் ரெட்டி',
    kn: 'ವೈ. ಎಸ್. ಜಗನ್ ಮೋಹನ್ ರೆಡ್ಡಿ',
    mr: 'वाई. एस. जगन मोहन रेड्डी',
  },
  'Narendra Modi': {
    te: 'నరేంద్ర మోదీ',
    hi: 'नरेन्द्र मोदी',
    ta: 'நரேந்திர மோதி',
    kn: 'ನರೇಂದ್ರ ಮೋದಿ',
    mr: 'नरेंद्र मोदी',
    gu: 'નરેન્દ્ર મોદી',
    bn: 'নরেন্দ্র মোদী',
    pa: 'ਨਰਿੰਦਰ ਮੋਦੀ',
  },
  'Amit Shah': {
    te: 'అమిత్ షా',
    hi: 'अमित शाह',
    ta: 'அமித் ஷா',
    kn: 'ಅಮಿತ್ ಶಾ',
    mr: 'अमित शाह',
    gu: 'અમિત શાહ',
  },
  'Rahul Gandhi': {
    te: 'రాహుల్ గాంధీ',
    hi: 'राहुल गांधी',
    ta: 'ராகுல் காந்தி',
    kn: 'ರಾಹುಲ್ ಗಾಂಧಿ',
    mr: 'राहुल गांधी',
    ml: 'രാഹുൽ ഗാന്ധി',
  },
};

/**
 * Resolve candidate name in regional script based on candidate object or string name
 */
export function getLocalizedCandidateName(
  candidateOrName: CandidatePodiumDetail | string | null | undefined,
  lang: string,
): string {
  if (!candidateOrName) return '';
  if (lang === 'en') {
    return typeof candidateOrName === 'string' ? candidateOrName : candidateOrName.name || '';
  }

  if (typeof candidateOrName === 'object' && candidateOrName.localizedNames) {
    const loc = candidateOrName.localizedNames[lang];
    if (loc && !/^[\x00-\x7F]*$/.test(loc)) {
      return loc;
    }
  }

  const nameStr = typeof candidateOrName === 'string' ? candidateOrName : candidateOrName.name;
  if (!nameStr) return '';

  if (COMMON_CANDIDATE_NAMES[nameStr]?.[lang]) {
    return COMMON_CANDIDATE_NAMES[nameStr][lang];
  }

  // Automatic high-fidelity phonetic transliteration fallback for Indian languages
  try {
    const { transliterateToIndic } = require('./indicTransliteration');
    const res = transliterateToIndic(nameStr, lang);
    if (res && res !== nameStr) {
      return res;
    }
  } catch {}

  return nameStr;
}

/**
 * Resolve party name in regional language
 */
export function getLocalizedPartyName(
  partyOrDetail: CandidatePodiumDetail | string | null | undefined,
  lang: string,
): string {
  if (!partyOrDetail) return '';
  if (lang === 'en') {
    return typeof partyOrDetail === 'string' ? partyOrDetail : partyOrDetail.party || '';
  }

  if (typeof partyOrDetail === 'object' && partyOrDetail.localizedParties) {
    if (partyOrDetail.localizedParties[lang]) {
      return partyOrDetail.localizedParties[lang];
    }
  }

  const partyCode = typeof partyOrDetail === 'string' ? partyOrDetail : partyOrDetail.party;
  if (!partyCode) return '';

  const PARTY_NAMES: Record<string, Record<string, string>> = {
    INC: {
      te: 'భారత జాతీయ కాంగ్రెస్ (INC)',
      hi: 'भारतीय राष्ट्रीय कांग्रेस (INC)',
      ta: 'இந்திய தேசிய காங்கிரஸ் (INC)',
      kn: 'ಭಾರತೀಯ ರಾಷ್ಟ್ರೀಯ ಕಾಂಗ್ರೆಸ್ (INC)',
      mr: 'भारतीय राष्ट्रीय काँग्रेस (INC)',
      ml: 'ഇന്ത്യൻ നാഷണൽ കോൺഗ്രസ് (INC)',
      gu: 'ભારતીય રાષ્ટ્રીય કોંગ્રેસ (INC)',
      bn: 'ভারতীয় জাতীয় কংগ্রেস (INC)',
    },
    BRS: {
      te: 'భారత్ రాష్ట్ర సమితి (BRS)',
      hi: 'भारत राष्ट्र समिति (BRS)',
      ta: 'பாரத் ராஷ்டிர சமிதி (BRS)',
      kn: 'ಭಾರತ್ ರಾಷ್ಟ್ರ ಸಮಿತಿ (BRS)',
      mr: 'भारत राष्ट्र समिती (BRS)',
    },
    TRS: {
      te: 'తెలంగాణ రాష్ట్ర సమితి (TRS/BRS)',
      hi: 'तेलंगाना राष्ट्र समिति (TRS/BRS)',
      ta: 'தெலுங்கானா ராஷ்டிர சமிதி (TRS/BRS)',
      kn: 'ತೆಲಂಗಾಣ ರಾಷ್ಟ್ರ ಸಮಿತಿ (TRS/BRS)',
      mr: 'तेलंगणा राष्ट्र समिती (TRS/BRS)',
    },
    BJP: {
      te: 'భారతీయ జనతా పార్టీ (BJP)',
      hi: 'भारतीय जनता पार्टी (BJP)',
      ta: 'பாரதிய ஜனதா கட்சி (BJP)',
      kn: 'ಭಾರತೀಯ ಜನತಾ ಪಕ್ಷ (BJP)',
      mr: 'भारतीय जनता पार्टी (BJP)',
      ml: 'ഭാരതീയ ജനതാ പാർട്ടി (BJP)',
      gu: 'ભારતીય જનતા પાર્ટી (BJP)',
      bn: 'ভারতীয় জনতা পার্টি (BJP)',
    },
    TDP: {
      te: 'తెలుగు దేశం పార్టీ (TDP)',
      hi: 'तेलुगु देशम पार्टी (TDP)',
      ta: 'தெலுங்கு தேசம் கட்சி (TDP)',
      kn: 'ತೆಲುಗು ದೇಶಂ ಪಕ್ಷ (TDP)',
      mr: 'तेलगू देशम पार्टी (TDP)',
    },
    AIMIM: {
      te: 'ఆల్ ఇండియా మజ్లిస్-ఎ-ఇత్తెహాదుల్ ముస్లిమీన్ (AIMIM)',
      hi: 'ऑल इंडिया मजलिस-ए-इत्तेहादुल मुस्लिमीन (AIMIM)',
      ta: 'அகில இந்திய மஜ்லிஸ்-இ-இத்தேஹாதுல் முஸ்லிமீன் (AIMIM)',
      kn: 'ಆಲ್ ಇಂಡಿಯಾ ಮಜ್ಲಿಸ್-ಎ-ಇತ್ತೆಹಾದುಲ್ ಮುಸ್ಲಿಮೀನ್ (AIMIM)',
      mr: 'ऑल इंडिया मजलिस-ए-इत्तेहादुल मुस्लिमीन (AIMIM)',
    },
    YSRCP: {
      te: 'యువజన శ్రామిక రైతు కాంగ్రెస్ పార్టీ (YSRCP)',
      hi: 'युवजन श्रमिक रायथू कांग्रेस पार्टी (YSRCP)',
      ta: 'ஒய். எஸ். ஆர். காங்கிரஸ் கட்சி (YSRCP)',
      kn: 'ಯುವಜನ ಶ್ರಮಿಕ ರೈತ ಕಾಂಗ್ರೆಸ್ ಪಕ್ಷ (YSRCP)',
      mr: 'युवाजन श्रमिक रयथू काँग्रेस पार्टी (YSRCP)',
    },
    JSP: {
      te: 'జనసేన పార్టీ (JSP)',
      hi: 'जन सेना पार्टी (JSP)',
      ta: 'ஜனசேனா கட்சி (JSP)',
      kn: 'ಜನಸೇನಾ ಪಕ್ಷ (JSP)',
      mr: 'जन सेना पार्टी (JSP)',
    },
    AAP: {
      te: 'ఆమ్ ఆద్మీ పార్టీ (AAP)',
      hi: 'आम आदमी पार्टी (AAP)',
      ta: 'ஆம் ஆத்மி கட்சி (AAP)',
      kn: 'ಆಮ್ ಆದ್ಮಿ ಪಕ್ಷ (AAP)',
      mr: 'आम आदमी पार्टी (AAP)',
      pa: 'ਆਮ ਆਦਮੀ ਪਾਰਟੀ (AAP)',
    },
    CPI: {
      te: 'కమ్యూనిస్ట్ పార్టీ ఆఫ్ ఇండియా (CPI)',
      hi: 'भारतीय कम्युनिस्ट पार्टी (CPI)',
      ta: 'இந்திய கம்யூனிஸ்ட் கட்சி (CPI)',
      kn: 'ಭಾರತೀಯ ಕಮ್ಯುನಿಸ್ಟ್ ಪಕ್ಷ (CPI)',
      mr: 'भारतीय कम्युनिस्ट पक्ष (CPI)',
    },
    'CPI(M)': {
      te: 'కమ్యూనిస్ట్ పార్టీ ఆఫ్ ఇండియా - మార్క్సిస్ట్ (CPI-M)',
      hi: 'भारतीय कम्युनिस्ट पार्टी - मार्क्सवादी (CPI-M)',
      ta: 'இந்திய கம்யூனிஸ்ட் கட்சி - மார்க்சிஸ்ட் (CPI-M)',
      kn: 'ಭಾರತೀಯ ಕಮ್ಯುನಿಸ್ಟ್ ಪಕ್ಷ - ಮಾರ್ಕ್ಸ್‌ವಾದಿ (CPI-M)',
      mr: 'भारतीय कम्युनिस्ट पक्ष - मार्क्सवादी (CPI-M)',
    },
    SP: {
      te: 'సమాజ్ వాదీ పార్టీ (SP)',
      hi: 'समाजवादी पार्टी (SP)',
      ta: 'சமாஜ்வாதி கட்சி (SP)',
      kn: 'ಸಮಾಜವಾದಿ ಪಕ್ಷ (SP)',
      mr: 'समाजवादी पक्ष (SP)',
    },
    BSP: {
      te: 'బహుజన్ సమాజ్ పార్టీ (BSP)',
      hi: 'बहुजन समाज पार्टी (BSP)',
      ta: 'பகுஜன் சமாஜ் கட்சி (BSP)',
      kn: 'ಬಹುಜನ ಸಮಾಜ ಪಕ್ಷ (BSP)',
      mr: 'बहुजन समाज पक्ष (BSP)',
    },
    AITC: {
      te: 'ఆల్ ఇండియా తృణమూల్ కాంగ్రెస్ (TMC)',
      hi: 'अखिल भारतीय तृणमूल कांग्रेस (TMC)',
      ta: 'அகில இந்திய திரிணாமுல் காங்கிரஸ் (TMC)',
      kn: 'ಅಖಿಲ ಭಾರತ ತೃಣಮೂಲ ಕಾಂಗ್ರೆಸ್ (TMC)',
      mr: 'अखिल भारतीय तृणमूल काँग्रेस (TMC)',
      bn: 'সর্বভারতীয় তৃণমূল কংগ্রেস (TMC)',
    },
    DMK: {
      te: 'ద్రవిడ మున్నేట్ర కజగం (DMK)',
      hi: 'द्रविड़ मुन्नेत्र कड़गम (DMK)',
      ta: 'திராவிட முன்னேற்றக் கழகம் (DMK)',
      kn: 'ದ್ರಾವಿಡ ಮುನ್ನೇಟ್ರ ಕಳಗಂ (DMK)',
      mr: 'द्रविड मुन्नेत्र कझगम (DMK)',
    },
    AIADMK: {
      te: 'ఆల్ ఇండియా అన్నా ద్రవిడ మున్నేట్ర కజగం (AIADMK)',
      hi: 'अखिल भारतीय अन्ना द्रविड़ मुन्नेत्र कड़गम (AIADMK)',
      ta: 'அனைத்திந்திய அண்ணா திராவிட முன்னேற்றக் கழகம் (AIADMK)',
      kn: 'ಅಖಿಲ ಭಾರತ ಅಣ್ಣಾ ದ್ರಾವಿಡ ಮುನ್ನೇಟ್ರ ಕಳಗಂ (AIADMK)',
      mr: 'अखिल भारतीय अण्णा द्रविड मुन्नेत्र कझगम (AIADMK)',
    },
  };

  return PARTY_NAMES[partyCode]?.[lang] || partyCode;
}

/**
 * Calculates true historical terms served by a candidate across election years.
 * Dynamically counts every recorded election where the candidate emerged as winner.
 */
export function calculateTermsServed(
  candidateName: string,
  stateCode: string,
  acNo?: number,
  asOfYear?: number,
): number {
  if (!candidateName) return 1;
  const canonicalTarget = getCanonicalCandidateName(candidateName);
  const targetNorm = stripHonorifics(canonicalTarget).toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
  if (!targetNorm) return 1;

  const code = (stateCode || 'TS').toUpperCase();
  const wonYears = new Set<number>();

  // 1. If acNo is provided, query full historical contests for the constituency
  if (acNo != null) {
    const constContests = getHistoricalPodiumForConstituency(code, acNo);
    for (const c of constContests) {
      if (asOfYear != null && c.year > asOfYear) continue;
      if (c.winner && c.winner.name) {
        const wCanonical = getCanonicalCandidateName(c.winner.name);
        const wNorm = stripHonorifics(wCanonical).toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
        if (wNorm === targetNorm || (targetNorm.length > 5 && wNorm.includes(targetNorm)) || (wNorm.length > 5 && targetNorm.includes(wNorm))) {
          wonYears.add(c.year);
        }
      }
    }
  }

  // 2. Query stateCache if loaded
  const podiumData = stateCache.get(code);
  if (podiumData) {
    for (const [_, contests] of Object.entries(podiumData)) {
      for (const c of contests) {
        if (asOfYear != null && c.year > asOfYear) continue;
        if (c.winner && c.winner.name) {
          const wCanonical = getCanonicalCandidateName(c.winner.name);
          const wNorm = stripHonorifics(wCanonical).toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
          if (wNorm === targetNorm || (targetNorm.length > 5 && wNorm.includes(targetNorm)) || (wNorm.length > 5 && targetNorm.includes(wNorm))) {
            wonYears.add(c.year);
          }
        }
      }
    }
  }

  return Math.max(wonYears.size, 1);
}
