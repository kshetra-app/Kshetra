/**
 * Kerala — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { KL_POLITICAL_LEDGER } from './kerala-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const KL_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "KL-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Pinarayi Vijayan's 2021 History-Maker",
      "body": "In 2021, Chief Minister Pinarayi Vijayan led the LDF to a second consecutive term, breaking Kerala's 40-year-old tradition of alternating between LDF and UDF every election.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "The Hindu (2021-05-02)",
      "derived": false
    },
    {
      "id": "KL-T-002",
      "emoji": "\ud83d\uddf3\ufe0f",
      "headline": "First Democratically Elected Communist Govt",
      "body": "In 1957, Kerala created global history by electing the world's first democratically elected Communist government, led by veteran leader E. M. S. Namboodiripad.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Guinness World Records, Wikipedia (1957 Kerala Legislative Assembly election)",
      "derived": false
    },
    {
      "id": "KL-T-003",
      "emoji": "\ud83d\udc51",
      "headline": "Karunakaran Dynasty of Kerala",
      "body": "Four-time Chief Minister K. Karunakaran led the Congress party for decades. His son K. Muraleedharan and daughter Padmaja Venugopal both entered state politics.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (K. Karunakaran)",
      "derived": false
    },
    {
      "id": "KL-T-004",
      "emoji": "\ud83c\udfd4\ufe0f",
      "headline": "Sabarimala Political Impact",
      "body": "The 2018 Supreme Court ruling on Sabarimala temple entry became a major political flashpoint, heavily impacting the vote share in central Kerala in subsequent elections.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Supreme Court Sabarimala Verdict 2018, Wikipedia",
      "derived": false
    },
    {
      "id": "KL-T-005",
      "emoji": "\u23f3",
      "headline": "Oommen Chandy's Mass Contact Record",
      "body": "Former CM Oommen Chandy won Puthuppally constituency in 12 consecutive elections from 1970 to 2021. He won the UN Public Service Award for his Mass Contact Programme.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 98
        }
      ],
      "source": "United Nations Public Service Awards, Wikipedia",
      "derived": false
    },
    {
      "id": "KL-T-006",
      "emoji": "\u2696\ufe0f",
      "headline": "The Liberation Struggle 1959",
      "body": "The first Communist government was dismissed in 1959 by the central government using Article 356, following a massive agitation known as the \"Vimochana Samaram\" (Liberation Struggle).",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Vimochana Samaram)",
      "derived": false
    },
    {
      "id": "KL-T-007",
      "emoji": "\u270a",
      "headline": "The Coalition Science of LDF & UDF",
      "body": "Kerala politics is highly institutionalized around two major coalitions: the CPI(M)-led Left Democratic Front (LDF) and the Congress-led United Democratic Front (UDF).",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Politics of Kerala)",
      "derived": false
    },
    {
      "id": "KL-T-008",
      "emoji": "\ud83d\udcca",
      "headline": "First BJP MLA O. Rajagopal",
      "body": "BJP opened its account in the Kerala Assembly for the first time in 2016 when veteran leader O. Rajagopal won the Nemom seat in Thiruvananthapuram.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2016",
      "derived": false
    },
    {
      "id": "KL-T-009",
      "emoji": "\ud83d\uddfa\ufe0f",
      "headline": "Dharmadam: The CM's Fortress",
      "body": "Dharmadam assembly constituency in Kannur (AC 12) is the fortress of CM Pinarayi Vijayan, which he won in 2016 and retained in 2021 with a margin of over 50,000 votes.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "CONSTITUENCY",
          "acNo": 12
        }
      ],
      "source": "ECI Results, Wikipedia",
      "derived": false
    },
    {
      "id": "KL-T-010",
      "emoji": "\ud83c\udf3e",
      "headline": "K. R. Gouri Amma: The Iron Lady",
      "body": "K. R. Gouri Amma, the first female minister of Kerala in 1957, drafted the historic Kerala Land Reforms Bill, which fundamentally reshaped the state's socio-economic structure.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (K. R. Gouri Amma)",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = KL_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'KL-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Kerala, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = KL_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'KL-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Kerala has seen ${byElections.length} by-elections in recent terms.`,
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
export function getKLAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...KL_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getKLTriviaForConstituency(acNo: number): TriviaItem[] {
  return getKLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getKLTriviaForParty(party: string): TriviaItem[] {
  return getKLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getKLTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getKLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getKLTriviaForElection(year: number): TriviaItem[] {
  return getKLAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getKLRandomTrivia(): TriviaItem {
  const all = getKLAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getKLRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getKLAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getKLTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getKLAllTrivia().filter((t) => t.category === category);
}
