/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  TELANGANA POLITICAL TRIVIA ENGINE                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * "Did You Know?" facts surfaced contextually throughout the app.
 * Two types:
 *   1. CURATED — Hand-written, verified facts (with source citations)
 *   2. DERIVED — Auto-generated from the political ledger data at runtime
 *
 * ── WHERE TRIVIA APPEARS ──────────────────────────────────────────────────
 *  • Constituency detail screen — facts about that specific AC
 *  • Party profile screen — facts about that party's journey in TS
 *  • MLA profile screen — facts about the MLA's political journey
 *  • Map idle state — random rotating trivia on the interactive map
 *  • Loading screens — keep users engaged during data fetches
 *  • Timeline view — contextual trivia alongside ledger events
 *  • Push notifications — "Today in Telangana Politics" daily digest
 *
 * ── DATA SOURCES ──────────────────────────────────────────────────────────
 *  Same as telangana-political-timeline.ts — Wikipedia, The Hindu, TOI, ECI
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  TELANGANA_POLITICAL_LEDGER,
  TOTAL_SEATS,
  computePartyStrength,
  getDefectionSummary,
  getMLAPartyTrail,
  type PoliticalLedgerEntry,
} from './telangana-political-timeline';

// ─── TYPES ────────────────────────────────────────────────────────────────

export type TriviaCategory =
  | 'DEFECTION'        // Party-switching facts
  | 'RECORD'           // Superlatives (first, longest, most, etc.)
  | 'COINCIDENCE'      // Interesting numerical/pattern coincidences
  | 'HISTORICAL'       // Historical context and milestones
  | 'DYNASTY'          // Political family connections
  | 'GEOGRAPHY'        // Constituency/district-level facts
  | 'LEGAL'            // Anti-defection law, court cases
  | 'ELECTION';        // Election-specific statistics

export type TriviaContext =
  | { type: 'CONSTITUENCY'; acNo: number }
  | { type: 'PARTY'; party: string }
  | { type: 'MLA'; name: string }
  | { type: 'ELECTION'; year: number }
  | { type: 'GLOBAL' };

export interface TriviaItem {
  id: string;
  emoji: string;
  headline: string;
  body: string;
  category: TriviaCategory;
  /** Which screens/contexts should this trivia appear on? */
  contexts: TriviaContext[];
  /** Source citation (URL or publication) */
  source: string;
  /** Is this fact derived from ledger data at build time? */
  derived: boolean;
}

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────
// Verified, hand-written facts with source citations

const CURATED_TRIVIA: TriviaItem[] = [
  // ── DEFECTION TRIVIA ──
  {
    id: 'TRV-DEF-001',
    emoji: '🔄',
    headline: 'The 4-Party Man',
    body: 'T. Prakash Goud (Rajendranagar) has been in 4 parties in just 10 years: TDP (2014) → TRS via merger (2016) → BRS by rename (2022) → INC by defection (2024). He is the most party-hopped MLA in Telangana history.',
    category: 'DEFECTION',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 51 },
      { type: 'MLA', name: 'T. Prakash Goud' },
      { type: 'GLOBAL' },
    ],
    source: 'The Hindu, Wikipedia (Telangana Legislative Assembly)',
    derived: false,
  },
  {
    id: 'TRV-DEF-002',
    emoji: '🪞',
    headline: 'The Mirror Mergers',
    body: 'History repeated itself exactly: 12 TDP MLAs merged with TRS in 2016, and then 12 INC MLAs merged with TRS in 2019. Both used the same 2/3 threshold loophole in the anti-defection law. The number 12 was not coincidental — it was the minimum needed.',
    category: 'COINCIDENCE',
    contexts: [
      { type: 'PARTY', party: 'TDP' },
      { type: 'PARTY', party: 'INC' },
      { type: 'PARTY', party: 'BRS' },
      { type: 'GLOBAL' },
    ],
    source: 'The Hindu (2016-03-11), Times of India (2019-06-06)',
    derived: false,
  },
  {
    id: 'TRV-DEF-003',
    emoji: '🎭',
    headline: 'Operation Akarsh: The Sequel',
    body: 'In 2016, TRS pulled 12 TDP MLAs ("Operation Akarsh"). In 2024, INC pulled 10 BRS MLAs — the media called it "Operation Akarsh 2.0." The hunter became the hunted.',
    category: 'DEFECTION',
    contexts: [
      { type: 'PARTY', party: 'BRS' },
      { type: 'PARTY', party: 'INC' },
      { type: 'GLOBAL' },
    ],
    source: 'New Indian Express (2024-07-14)',
    derived: false,
  },
  {
    id: 'TRV-DEF-004',
    emoji: '👨‍👦',
    headline: 'Like Father, Like Son',
    body: 'When Nagarjuna Sagar MLA Nomula Narsimhaiah (TRS) died in 2021, his son Nomula Bhagath won the by-election on the same TRS ticket — keeping the seat in the family.',
    category: 'DYNASTY',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 88 },
      { type: 'GLOBAL' },
    ],
    source: 'Wikipedia (Nagarjuna Sagar Assembly constituency)',
    derived: false,
  },
  {
    id: 'TRV-DEF-005',
    emoji: '⚖️',
    headline: 'The Defection Boomerang',
    body: 'Arekapudi Gandhi won Serilingampally as TDP (2014), merged into TRS (2016), won again as TRS (2018), contested as BRS (2023), then defected to INC (2024). His constituency has technically been "represented" by 4 parties without a single by-election.',
    category: 'DEFECTION',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 52 },
      { type: 'MLA', name: 'Arekapudi Gandhi' },
      { type: 'GLOBAL' },
    ],
    source: 'The Hindu, Wikipedia',
    derived: false,
  },

  // ── RECORD TRIVIA ──
  {
    id: 'TRV-REC-001',
    emoji: '🏰',
    headline: 'The Unbreakable Fortress',
    body: 'AIMIM has held all 7 Old City Hyderabad seats (Malakpet, Nampally, Karwan, Charminar, Chandrayangutta, Yakutpura, Bahadurpura) for 3 consecutive elections (2014, 2018, 2023) — a perfect 21/21 record. This dominance dates back to the 1980s.',
    category: 'RECORD',
    contexts: [
      { type: 'PARTY', party: 'AIMIM' },
      { type: 'CONSTITUENCY', acNo: 58 },
      { type: 'CONSTITUENCY', acNo: 63 },
      { type: 'CONSTITUENCY', acNo: 64 },
      { type: 'CONSTITUENCY', acNo: 66 },
      { type: 'CONSTITUENCY', acNo: 67 },
      { type: 'CONSTITUENCY', acNo: 68 },
      { type: 'CONSTITUENCY', acNo: 69 },
      { type: 'GLOBAL' },
    ],
    source: 'ECI results, Wikipedia',
    derived: false,
  },
  {
    id: 'TRV-REC-002',
    emoji: '📈',
    headline: 'The Greatest Comeback',
    body: 'INC went from 6 seats (after 12 MLAs merged with TRS in 2019) to 64 seats in the 2023 election — a 967% increase. This is the largest single-election swing in Telangana history.',
    category: 'RECORD',
    contexts: [
      { type: 'PARTY', party: 'INC' },
      { type: 'ELECTION', year: 2023 },
      { type: 'GLOBAL' },
    ],
    source: 'ECI results 2023, TOI (2019 merger)',
    derived: false,
  },
  {
    id: 'TRV-REC-003',
    emoji: '🗳️',
    headline: 'From MLA to CM in 9 Years',
    body: 'Revanth Reddy was a TDP MLA from Kodangal in 2014, joined INC in 2017, lost Kodangal in 2018, became TPCC president, won Kodangal again in 2023, and became Chief Minister — all in under a decade.',
    category: 'RECORD',
    contexts: [
      { type: 'MLA', name: 'Revanth Reddy' },
      { type: 'CONSTITUENCY', acNo: 72 },
      { type: 'PARTY', party: 'INC' },
      { type: 'GLOBAL' },
    ],
    source: 'Wikipedia (Revanth Reddy)',
    derived: false,
  },
  {
    id: 'TRV-REC-004',
    emoji: '👑',
    headline: 'The Sircilla King',
    body: 'K. T. Rama Rao (KTR) has won Sircilla (AC 29) in all 3 Telangana elections — 2014, 2018, and 2023. He served as IT Minister and was widely seen as KCR\'s heir apparent in BRS.',
    category: 'RECORD',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 29 },
      { type: 'MLA', name: 'K. T. Rama Rao' },
      { type: 'PARTY', party: 'BRS' },
    ],
    source: 'ECI results 2014, 2018, 2023',
    derived: false,
  },
  {
    id: 'TRV-REC-005',
    emoji: '🏆',
    headline: 'Harish Rao\'s Siddipet Streak',
    body: 'T. Harish Rao has represented Siddipet (AC 33) since 2004 — winning 5 consecutive elections across undivided AP and Telangana. He is KCR\'s nephew and one of the longest-serving MLAs in the region.',
    category: 'RECORD',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 33 },
      { type: 'MLA', name: 'Harish Rao' },
    ],
    source: 'Wikipedia (T. Harish Rao)',
    derived: false,
  },

  // ── ELECTION TRIVIA ──
  {
    id: 'TRV-ELE-001',
    emoji: '⏰',
    headline: 'The Early Dissolution Gamble',
    body: 'KCR dissolved the 1st Assembly 9 months early in Sep 2018, betting on his popularity. It paid off — TRS won 88/119 seats (74%) in the 2018 snap election. In 2023, the full term brought the opposite result: just 39 seats.',
    category: 'ELECTION',
    contexts: [
      { type: 'ELECTION', year: 2018 },
      { type: 'PARTY', party: 'BRS' },
      { type: 'GLOBAL' },
    ],
    source: 'Wikipedia (2018 Telangana election)',
    derived: false,
  },
  {
    id: 'TRV-ELE-002',
    emoji: '📊',
    headline: 'Similar Votes, Wildly Different Seats',
    body: 'In 2023, INC got 39.4% votes → 64 seats, while BRS got 37.4% votes → 39 seats. Just 2% vote share difference translated to 25 seats — a vivid illustration of the first-past-the-post system\'s amplification effect.',
    category: 'ELECTION',
    contexts: [
      { type: 'ELECTION', year: 2023 },
      { type: 'PARTY', party: 'INC' },
      { type: 'PARTY', party: 'BRS' },
      { type: 'GLOBAL' },
    ],
    source: 'ECI results 2023',
    derived: false,
  },
  {
    id: 'TRV-ELE-003',
    emoji: '🔴',
    headline: 'The Red Bastion',
    body: 'Ramagundam (AC 23) is Telangana\'s sole left-party constituency. AIFB won it in 2018, CPI won it in 2023. The Singareni Collieries coal belt keeps leftist politics alive here even as the left is wiped out across most of India.',
    category: 'GEOGRAPHY',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 23 },
      { type: 'PARTY', party: 'CPI' },
      { type: 'GLOBAL' },
    ],
    source: 'Wikipedia (Ramagundam constituency)',
    derived: false,
  },

  // ── HISTORICAL TRIVIA ──
  {
    id: 'TRV-HIS-001',
    emoji: '🗓️',
    headline: 'The Youngest State\'s First Vote',
    body: 'The 2014 election was the first-ever Telangana Assembly election after the state was carved from Andhra Pradesh on June 2, 2014. TRS, which spearheaded the statehood movement, won 63 seats and formed the first government.',
    category: 'HISTORICAL',
    contexts: [
      { type: 'ELECTION', year: 2014 },
      { type: 'PARTY', party: 'BRS' },
      { type: 'GLOBAL' },
    ],
    source: 'Wikipedia (Telangana formation)',
    derived: false,
  },
  {
    id: 'TRV-HIS-002',
    emoji: '✍️',
    headline: 'What\'s in a Name?',
    body: 'TRS (Telangana Rashtra Samithi) became BRS (Bharat Rashtra Samithi) in October 2022 — signalling KCR\'s national ambitions. The "Telangana" was replaced with "Bharat." The national play flopped: BRS won zero seats outside Telangana.',
    category: 'HISTORICAL',
    contexts: [
      { type: 'PARTY', party: 'BRS' },
      { type: 'GLOBAL' },
    ],
    source: 'Wikipedia (Bharat Rashtra Samithi)',
    derived: false,
  },

  // ── LEGAL TRIVIA ──
  {
    id: 'TRV-LEG-001',
    emoji: '⚖️',
    headline: 'The 2/3 Loophole',
    body: 'India\'s anti-defection law (Tenth Schedule) has a crucial exception: if 2/3 of a party\'s MLAs "merge" with another party, it\'s legal. Telangana has seen this exploited twice — TDP in 2016 (12/15 = 80%) and INC in 2019 (12/18 = 67%). The 2024 BRS defections (10/39 = 26%) do NOT meet this threshold and face legal challenge.',
    category: 'LEGAL',
    contexts: [
      { type: 'GLOBAL' },
      { type: 'PARTY', party: 'BRS' },
    ],
    source: 'Constitution of India, Tenth Schedule; The Hindu (multiple)',
    derived: false,
  },
  {
    id: 'TRV-LEG-002',
    emoji: '🏛️',
    headline: 'Supreme Court Challenge',
    body: 'BRS filed a Special Leave Petition in the Supreme Court against the 10 defected MLAs. The Telangana High Court served notices to the Speaker and all 10 MLAs. This case could set a precedent for anti-defection enforcement in India.',
    category: 'LEGAL',
    contexts: [
      { type: 'PARTY', party: 'BRS' },
      { type: 'GLOBAL' },
    ],
    source: 'The Hindu (2024)',
    derived: false,
  },

  // ── GEOGRAPHY / CONSTITUENCY TRIVIA ──
  {
    id: 'TRV-GEO-001',
    emoji: '🗺️',
    headline: 'The Goshamahal Constant',
    body: 'T. Raja Singh (BJP) has won Goshamahal (AC 65) in both 2018 and 2023 — making it the only Hyderabad constituency held by BJP. The rest of Hyderabad is split between AIMIM (Old City) and BRS (rest).',
    category: 'GEOGRAPHY',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 65 },
      { type: 'MLA', name: 'T. Raja Singh' },
      { type: 'PARTY', party: 'BJP' },
    ],
    source: 'ECI results 2018, 2023',
    derived: false,
  },
  {
    id: 'TRV-GEO-002',
    emoji: '🔄',
    headline: 'The Deputy CM Who Switched',
    body: 'Kadiyam Srihari was Deputy Chief Minister under KCR in the TRS government (2018). In 2024, he defected from BRS to INC — making him possibly the highest-ranked defector in Telangana\'s short history.',
    category: 'DEFECTION',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 99 },
      { type: 'MLA', name: 'Kadiyam Srihari' },
      { type: 'GLOBAL' },
    ],
    source: 'The Hindu (2024)',
    derived: false,
  },
  {
    id: 'TRV-GEO-003',
    emoji: '⚔️',
    headline: 'The Huzurabad Revolt',
    body: 'Etela Rajender was a powerful TRS minister until he was sacked over land-grab allegations in 2021. He joined BJP, resigned, and won the Huzurabad by-election by 24,000+ votes — proving the "rebel wins" storyline. In 2023, he lost to BRS.',
    category: 'DEFECTION',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 31 },
      { type: 'MLA', name: 'Etela Rajender' },
      { type: 'PARTY', party: 'BJP' },
    ],
    source: 'Wikipedia (Etela Rajender), ECI',
    derived: false,
  },
  {
    id: 'TRV-GEO-004',
    emoji: '🏠',
    headline: 'The Komatireddy Brothers',
    body: 'Komatireddy Venkat Reddy won Nalgonda (AC 92) for INC in 2014, 2023. His brother Komatireddy Rajagopal Reddy won Munugode (AC 93) for INC in 2018, then defected to BJP in 2022 and lost the by-election. In 2023, Rajagopal Reddy won Munugode back — this time for INC again.',
    category: 'DYNASTY',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 92 },
      { type: 'CONSTITUENCY', acNo: 93 },
      { type: 'MLA', name: 'Komatireddy' },
    ],
    source: 'Wikipedia, ECI results',
    derived: false,
  },
  {
    id: 'TRV-GEO-005',
    emoji: '💪',
    headline: 'Vikramarka\'s Steady Hand',
    body: 'Mallu Bhatti Vikramarka has won Madhira (AC 114) for INC in both 2014 and 2023, holding the seat even through the TRS/BRS wave. He became Deputy Chief Minister in the Revanth Reddy government.',
    category: 'RECORD',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 114 },
      { type: 'MLA', name: 'Mallu Bhatti Vikramarka' },
      { type: 'PARTY', party: 'INC' },
    ],
    source: 'Wikipedia (Mallu Bhatti Vikramarka)',
    derived: false,
  },
  {
    id: 'TRV-GEO-006',
    emoji: '🌲',
    headline: 'Seethakka the Tribal Champion',
    body: 'Dansari Anasuya "Seethakka" won Mulug (AC 109, ST reserved) for INC in both 2018 and 2023. A tribal leader and social activist, she is known for her grassroots connect and became a minister in the Revanth Reddy cabinet.',
    category: 'RECORD',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 109 },
      { type: 'MLA', name: 'Seethakka' },
    ],
    source: 'Wikipedia (Seethakka)',
    derived: false,
  },
  {
    id: 'TRV-GEO-007',
    emoji: '🏛️',
    headline: 'The Former Speaker Who Defected',
    body: 'Pocharam Srinivas Reddy served as Speaker of the Telangana Assembly under TRS/BRS. After winning Banswada (AC 14) on BRS ticket in 2023, he defected to INC in 2024 — making him the highest constitutional office-holder to switch sides.',
    category: 'DEFECTION',
    contexts: [
      { type: 'CONSTITUENCY', acNo: 14 },
      { type: 'MLA', name: 'Pocharam Srinivas Reddy' },
      { type: 'GLOBAL' },
    ],
    source: 'The Hindu (2024)',
    derived: false,
  },
];

// ─── DERIVED TRIVIA GENERATORS ────────────────────────────────────────────
// These compute trivia at runtime from the political ledger

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Total defections stat
  const summary = getDefectionSummary();
  const totalDefections = Object.values(summary).reduce((a, b) => a + b, 0);
  derived.push({
    id: 'TRV-DRV-TOTAL-DEF',
    emoji: '🔢',
    headline: `${totalDefections} MLAs Have Switched Parties`,
    body: `Since Telangana's formation in 2014, ${totalDefections} MLAs have switched parties across 3 assemblies. ` +
      Object.entries(summary)
        .sort(([, a], [, b]) => b - a)
        .map(([dir, count]) => `${dir}: ${count}`)
        .join(', ') + '.',
    category: 'DEFECTION',
    contexts: [{ type: 'GLOBAL' }],
    source: 'Computed from Kshetra Political Ledger',
    derived: true,
  });

  // 2. Current party strength after all events
  const current = computePartyStrength(undefined, 3);
  const ruling = Object.entries(current.parties).sort(([, a], [, b]) => b - a)[0];
  if (ruling) {
    derived.push({
      id: 'TRV-DRV-CURRENT-STRENGTH',
      emoji: '📊',
      headline: `${ruling[0]} Holds ${ruling[1]} of 119 Seats`,
      body: `Current floor strength (after all defections): ` +
        Object.entries(current.parties)
          .sort(([, a], [, b]) => b - a)
          .map(([p, s]) => `${p}: ${s}`)
          .join(' | ') +
        `. The majority mark is 60.`,
      category: 'ELECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 3. By-election stats
  const byElections = TELANGANA_POLITICAL_LEDGER.filter(
    (e) => e.eventType === 'BY_ELECTION',
  );
  if (byElections.length > 0) {
    const bjpByWins = byElections.filter((e) => e.creditParty === 'BJP').length;
    derived.push({
      id: 'TRV-DRV-BYELECTIONS',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections in Telangana's History`,
      body: `Telangana has seen ${byElections.length} by-elections across 2 assemblies. ` +
        `BJP won ${bjpByWins} of them (Dubbak 2020, Huzurabad 2021) — their first assembly-level wins in the state.`,
      category: 'ELECTION',
      contexts: [{ type: 'PARTY', party: 'BJP' }, { type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 4. Deaths in office
  const deaths = TELANGANA_POLITICAL_LEDGER.filter(
    (e) => e.eventType === 'DEATH_IN_OFFICE',
  );
  if (deaths.length > 0) {
    derived.push({
      id: 'TRV-DRV-DEATHS',
      emoji: '🕯️',
      headline: `${deaths.length} MLAs Died in Office`,
      body: deaths
        .map((d) => `${d.memberNames[0]} (${d.date})`)
        .join('; ') +
        '. Each triggered a by-election to fill the vacant seat.',
      category: 'HISTORICAL',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  return derived;
}

// ─── COMBINED TRIVIA ──────────────────────────────────────────────────────

let _cachedTrivia: TriviaItem[] | null = null;

export function getAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── CONTEXT-AWARE QUERY FUNCTIONS ────────────────────────────────────────

/**
 * Get trivia relevant to a specific constituency.
 */
export function getTriviaForConstituency(acNo: number): TriviaItem[] {
  return getAllTrivia().filter((t) =>
    t.contexts.some(
      (c) =>
        (c.type === 'CONSTITUENCY' && c.acNo === acNo) ||
        c.type === 'GLOBAL',
    ),
  );
}

/**
 * Get trivia relevant to a specific party.
 */
export function getTriviaForParty(party: string): TriviaItem[] {
  return getAllTrivia().filter((t) =>
    t.contexts.some(
      (c) =>
        (c.type === 'PARTY' && c.party === party) ||
        c.type === 'GLOBAL',
    ),
  );
}

/**
 * Get trivia relevant to a specific MLA.
 */
export function getTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getAllTrivia().filter((t) =>
    t.contexts.some(
      (c) =>
        (c.type === 'MLA' && c.name.toLowerCase().includes(lower)) ||
        c.type === 'GLOBAL',
    ),
  );
}

/**
 * Get trivia for an election year.
 */
export function getTriviaForElection(year: number): TriviaItem[] {
  return getAllTrivia().filter((t) =>
    t.contexts.some(
      (c) =>
        (c.type === 'ELECTION' && c.year === year) ||
        c.type === 'GLOBAL',
    ),
  );
}

/**
 * Get a random trivia item (for loading screens, map idle, etc.)
 */
export function getRandomTrivia(): TriviaItem {
  const all = getAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

/**
 * Get N random trivia items, non-repeating.
 */
export function getRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

/**
 * Get trivia by category.
 */
export function getTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getAllTrivia().filter((t) => t.category === category);
}
