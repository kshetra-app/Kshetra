/**
 * Haryana — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { HR_POLITICAL_LEDGER } from './haryana-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const HR_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "HR-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "The Origin of \"Aaya Ram, Gaya Ram\"",
      "body": "Haryana is the birthplace of the phrase \"Aaya Ram, Gaya Ram.\" In 1967, MLA Gaya Lal changed parties thrice in a single day, cementing the state's reputation for defection politics.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (Origin of Aaya Ram Gaya Ram)",
      "derived": false
    },
    {
      "id": "HR-T-002",
      "emoji": "\ud83d\udc51",
      "headline": "The Three Lals of Haryana",
      "body": "Haryana politics was historically dominated by the \"Three Lals\": Devi Lal, Bansi Lal, and Bhajan Lal, who took turns ruling the state for nearly four decades.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Lals of Haryana)",
      "derived": false
    },
    {
      "id": "HR-T-003",
      "emoji": "\ud83c\udfc6",
      "headline": "Devi Lal's Deputy PM Ascent",
      "body": "Tau Devi Lal twice served as Chief Minister of Haryana and rose to become the Deputy Prime Minister of India from 1989 to 1991, representing the farmers' lobby.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Chaudhary Devi Lal)",
      "derived": false
    },
    {
      "id": "HR-T-004",
      "emoji": "\ud83c\udf3e",
      "headline": "The Jat vs Non-Jat Coalition Math",
      "body": "Haryana's electoral chessboard is divided on Jat vs non-Jat lines. BJP's rise in 2014 was driven by consolidating non-Jat voters behind Manohar Lal Khattar.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Hindustan Times political analysis",
      "derived": false
    },
    {
      "id": "HR-T-005",
      "emoji": "\ud83c\udfdb\ufe0f",
      "headline": "Nayab Saini Emergency Swap",
      "body": "In March 2024, just before the general elections, the BJP swapped Chief Minister Manohar Lal Khattar with Nayab Singh Saini to beat anti-incumbency.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India (2024-03-12)",
      "derived": false
    },
    {
      "id": "HR-T-006",
      "emoji": "\u2696\ufe0f",
      "headline": "The Chautala Conviction",
      "body": "Former CM Om Prakash Chautala and his son Ajay Chautala were convicted in the JBT teachers' recruitment scam in 2013, impacting INLD's fortunes for a decade.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "CBI Court Verdict, Delhi High Court 2013",
      "derived": false
    },
    {
      "id": "HR-T-007",
      "emoji": "\u270a",
      "headline": "The JJP Breakaway Rise",
      "body": "In 2018, Dushyant Chautala split from INLD to form the Jannayak Janta Party (JJP), winning 10 seats in 2019 and becoming Deputy CM at age 31.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Indian Express",
      "derived": false
    },
    {
      "id": "HR-T-008",
      "emoji": "\ud83d\udcc8",
      "headline": "BJP's First Full Majority 2014",
      "body": "In 2014, the BJP went from a minor player with 4 seats in 2009 to a full majority government with 47 out of 90 seats in Haryana, a 1075% increase.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2014",
      "derived": false
    },
    {
      "id": "HR-T-009",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Adampur: The Bhajan Lal Bastion",
      "body": "Adampur assembly constituency (AC 47) has been held by Bhajan Lal's family uninterrupted since 1968, across multiple generations and party switches.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 47
        }
      ],
      "source": "ECI Results, Wikipedia",
      "derived": false
    },
    {
      "id": "HR-T-010",
      "emoji": "\ud83e\udd3c",
      "headline": "Wrestler Protests Influence",
      "body": "Haryana's politically dominant districts like Rohtas and Jhajjar became major centers of political mobilization following the wrestlers' protests in 2023.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Mainstream Media reports 2023",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = HR_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'HR-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Haryana, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = HR_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'HR-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Haryana has seen ${byElections.length} by-elections in recent terms.`,
      category: 'ELECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  return derived;
}

// ─── Combined Trivia (Cached) ────────────────────────────────────────────

let _cachedTrivia: TriviaItem[] | null = null;
export function getHRAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...HR_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getHRTriviaForConstituency(acNo: number): TriviaItem[] {
  return getHRAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getHRTriviaForParty(party: string): TriviaItem[] {
  return getHRAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getHRTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getHRAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getHRTriviaForElection(year: number): TriviaItem[] {
  return getHRAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getHRRandomTrivia(): TriviaItem {
  const all = getHRAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getHRRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getHRAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getHRTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getHRAllTrivia().filter((t) => t.category === category);
}
