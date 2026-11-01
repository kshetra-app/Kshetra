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

// In-memory cache for parsed state podium files
const stateCache = new Map<string, Record<string, HistoricalPodiumContest[]>>();

const STATE_LOADERS: Record<string, () => any> = {
  TS: () => require('../data/historical/ts-podium.json'),
  AP: () => require('../data/historical/ap-podium.json'),
  KA: () => require('../data/historical/ka-podium.json'),
  MH: () => require('../data/historical/mh-podium.json'),
  TN: () => require('../data/historical/tn-podium.json'),
  UP: () => require('../data/historical/up-podium.json'),
  WB: () => require('../data/historical/wb-podium.json'),
  DL: () => require('../data/historical/dl-podium.json'),
  GJ: () => require('../data/historical/gj-podium.json'),
  RJ: () => require('../data/historical/rj-podium.json'),
  KL: () => require('../data/historical/kl-podium.json'),
  MP: () => require('../data/historical/mp-podium.json'),
  PB: () => require('../data/historical/pb-podium.json'),
  BR: () => require('../data/historical/br-podium.json'),
  HR: () => require('../data/historical/hr-podium.json'),
  OD: () => require('../data/historical/od-podium.json'),
  CG: () => require('../data/historical/cg-podium.json'),
  JH: () => require('../data/historical/jh-podium.json'),
  AS: () => require('../data/historical/as-podium.json'),
  HP: () => require('../data/historical/hp-podium.json'),
  UK: () => require('../data/historical/uk-podium.json'),
  GA: () => require('../data/historical/ga-podium.json'),
  TR: () => require('../data/historical/tr-podium.json'),
  MN: () => require('../data/historical/mn-podium.json'),
  ML: () => require('../data/historical/ml-podium.json'),
  MZ: () => require('../data/historical/mz-podium.json'),
  NL: () => require('../data/historical/nl-podium.json'),
  SK: () => require('../data/historical/sk-podium.json'),
  AR: () => require('../data/historical/ar-podium.json'),
  JK: () => require('../data/historical/jk-podium.json'),
  PY: () => require('../data/historical/py-podium.json'),
  IN: () => require('../data/historical/lok-sabha-podium.json'),
};

function getStateData(stateCode: string): Record<string, HistoricalPodiumContest[]> {
  const code = (stateCode || 'TS').toUpperCase();
  if (stateCache.has(code)) {
    return stateCache.get(code)!;
  }

  const loader = STATE_LOADERS[code];
  if (!loader) {
    return {};
  }

  try {
    const raw = loader();
    stateCache.set(code, raw);
    return raw;
  } catch (err) {
    console.warn(`[historicalPodiumStore] Failed to load podium data for state ${code}:`, err);
    return {};
  }
}

/**
 * Returns full election history for a constituency from 1999 to 2024 sorted descending by year
 */
export function getHistoricalPodiumForConstituency(
  stateCode: string,
  acNo: number,
): HistoricalPodiumContest[] {
  const data = getStateData(stateCode);
  const contests = data[String(acNo)] || data[Number(acNo) as any] || [];
  return contests;
}

/**
 * Returns latest election contest podium for a constituency (e.g. 2023 or 2024)
 */
export function getLatestPodiumForConstituency(
  stateCode: string,
  acNo: number,
): HistoricalPodiumContest | null {
  const list = getHistoricalPodiumForConstituency(stateCode, acNo);
  return list.length > 0 ? list[0] : null;
}

/**
 * Common regional candidate name translations for high profile leaders & sitting MLAs
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
  'G. Lasya Nanditha': {
    te: 'జి. లాస్య నందిత',
    hi: 'जी. लास्या नंदिता',
    ta: 'ஜி. லாஸ்யா நந்திதா',
    kn: 'ಜಿ. ಲಾಸ್ಯಾ ನಂದಿತಾ',
    mr: 'जी. लास्या नंदिता',
  },
  'Dr. T. V. Vamsha Tilak': {
    te: 'డా. టి. వి. వంశ తిలక్',
    hi: 'डॉ. टी. वी. वंश तिलक',
    ta: 'டாக்டர் டி. வி. வம்ச திலக்',
    kn: 'ಡಾ. ಟಿ. ವಿ. ವಂಶ ತಿಲಕ್',
  },
  'G. Niveditha': {
    te: 'జి. నివేదిత',
    hi: 'जी. निवेदिता',
    ta: 'ஜி. நிவேதிதா',
    kn: 'ಜಿ. ನಿವೇದಿತಾ',
  },
  'G. Sayanna': {
    te: 'జి. సాయన్న',
    hi: 'जी. सायन्ना',
    ta: 'ஜி. சாயன்னா',
    kn: 'ಜಿ. ಸಾಯಣ್ಣ',
  },
  'K. Chandrashekar Rao': {
    te: 'కె. చంద్రశేఖర్ రావు',
    hi: 'के. चंद्रशेखर राव',
    ta: 'கே. சந்திரசேகர் ராவ்',
    kn: 'ಕೆ. ಚಂದ್ರಶೇಖರ್ ರಾವ್',
  },
  'K. T. Rama Rao': {
    te: 'కె. టి. రామారావు',
    hi: 'के. टी. रामाराव',
    ta: 'கே. டி. ராமாராவ்',
    kn: 'ಕೆ. ಟಿ. ರಾಮಾರಾವ್',
  },
  'Thanneeru Harish Rao': {
    te: 'తన్నీరు హరీష్ రావు',
    hi: 'तन्नीरु हरीश राव',
    ta: 'தன்னீரு ஹரீஷ் ராவ்',
    kn: 'ತನ್ನೀರು ಹರೀಶ್ ರಾವ್',
  },
  'Akbaruddin Owaisi': {
    te: 'అక్బరుద్దీన్ ఒవైసీ',
    hi: 'अकबरुद्दीन ओवैसी',
    ta: 'அக்பருதீன் ஓவைசி',
    kn: 'ಅಕ್ಬರುದ್ದೀನ್ ಒವೈಸಿ',
  },
  'T. Raja Singh': {
    te: 'టి. రాజా సింగ్',
    hi: 'टी. राजा सिंह',
    ta: 'டி. ராஜா சிங்',
    kn: 'ಟಿ. ರಾಜಾ ಸಿಂಗ್',
  },
  'Mallu Bhatti Vikramarka': {
    te: 'మల్లు భట్టి విక్రమార్క',
    hi: 'मल्लू भट्टी विक्रमार्क',
    ta: 'மல்லு பட்டி விக்ரமார்க்கா',
    kn: 'ಮಲ್ಲು ಭಟ್ಟಿ ವಿಕ್ರಮಾರ್ಕ',
  },
  'Nara Chandrababu Naidu': {
    te: 'నారా చంద్రబాబు నాయుడు',
    hi: 'नारा चंद्रबाबू नायडू',
    ta: 'நாரா சந்திரபாபு நாயுடு',
    kn: 'ನಾರಾ ಚಂದ್ರಬಾಬು ನಾಯ್ಡು',
  },
  'Nara Lokesh': {
    te: 'నారా లోకేష్',
    hi: 'नारा लोकेश',
    ta: 'நாரா லோகேஷ்',
    kn: 'ನಾರಾ ಲೋಕೇಶ್',
  },
  'Pawan Kalyan': {
    te: 'పవన్ కళ్యాణ్',
    hi: 'पवन कल्याण',
    ta: 'பவன் கல்யாண்',
    kn: 'ಪವನ್ ಕಲ್ಯಾಣ್',
  },
  'Y. S. Jagan Mohan Reddy': {
    te: 'వై. ఎస్. జగన్ మోహన్ రెడ్డి',
    hi: 'वाई. एस. जगन मोहन रेड्डी',
    ta: 'ஒய். எஸ். ஜெகன் மோகன் ரெட்டி',
    kn: 'ವೈ. ಎಸ್. ಜಗನ್ ಮೋಹನ್ ರೆಡ್ಡಿ',
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
    if (candidateOrName.localizedNames[lang]) {
      return candidateOrName.localizedNames[lang];
    }
  }

  const nameStr = typeof candidateOrName === 'string' ? candidateOrName : candidateOrName.name;
  if (!nameStr) return '';

  return COMMON_CANDIDATE_NAMES[nameStr]?.[lang] || nameStr;
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
      ta: 'தெலங்கானா ராஷ்டிர சமிதி (TRS/BRS)',
      kn: 'ತೆಲಂಗಾಣ ರಾಷ್ಟ್ರ ಸಮಿತಿ (TRS/BRS)',
      mr: 'तेलंगणा राष्ट्र समिती (TRS/BRS)',
    },
    BJP: {
      te: 'భారతీయ జనతా పార్టీ (BJP)',
      hi: 'भारतीय जनता पार्टी (BJP)',
      ta: 'பாரதிய ஜனதா கட்சி (BJP)',
      kn: 'ಭಾರತೀಯ ಜನತಾ ಪಕ್ಷ (BJP)',
      mr: 'भारतीय जनता पार्टी (BJP)',
    },
    TDP: {
      te: 'తెలుగుదేశం పార్టీ (TDP)',
      hi: 'तेलुगु देशम पार्टी (TDP)',
      ta: 'தெலுங்கு தேசம் கட்சி (TDP)',
      kn: 'ತೆಲುಗು ದೇಶಂ ಪಕ್ಷ (TDP)',
      mr: 'तेलुगू देशम पार्टी (TDP)',
    },
    AIMIM: {
      te: 'ఆల్ ఇండియా మజ్లిస్-ఎ-ఇత్తెహాదుల్ ముస్లిమీన్ (AIMIM)',
      hi: 'ऑल इंडिया मजलिस-ए-इत्तेहादुल मुस्लिमीन (AIMIM)',
      ta: 'மஜ்லிஸ் கட்சி (AIMIM)',
      kn: 'ಮಜ್ಲಿಸ್ ಪಕ್ಷ (AIMIM)',
      mr: 'मजलिस पक्ष (AIMIM)',
    },
    YSRCP: {
      te: 'యువజన శ్రామిక రైతు కాంగ్రెస్ పార్టీ (YSRCP)',
      hi: 'वायएसआर कांग्रेस पार्टी (YSRCP)',
      ta: 'ஒய்எஸ்ஆர் காங்கிரஸ் கட்சி (YSRCP)',
      kn: 'ವೈಎಸ್‌ಆರ್ ಕಾಂಗ್ರೆಸ್ ಪಕ್ಷ (YSRCP)',
      mr: 'वायएसआर काँग्रेस पार्टी (YSRCP)',
    },
    JSP: {
      te: 'జనసేన పార్టీ (JSP)',
      hi: 'जनसेना पार्टी (JSP)',
      ta: 'ஜனசேனா கட்சி (JSP)',
      kn: 'ಜನಸೇನಾ ಪಕ್ಷ (JSP)',
      mr: 'जनसेना पार्टी (JSP)',
    },
    CPI: {
      te: 'కమ్యూనిస్ట్ పార్టీ ఆఫ్ ఇండియా (CPI)',
      hi: 'भारतीय कम्युनिस्ट पार्टी (CPI)',
      ta: 'இந்திய கம்யூனிஸ்ட் கட்சி (CPI)',
      kn: 'ಭಾರತೀಯ ಕಮ್ಯುನಿಸ್ಟ್ ಪಕ್ಷ (CPI)',
      mr: 'भारतीय कम्युनिस्ट पक्ष (CPI)',
    },
  };

  return PARTY_NAMES[partyCode]?.[lang] || partyCode;
}
