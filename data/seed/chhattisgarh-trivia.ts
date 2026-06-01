/**
 * Chhattisgarh — Political Trivia
 * Upgraded to standard TriviaItem interface and standard export functions.
 */

import type { TriviaItem, TriviaCategory, TriviaContext } from './telangana-trivia';
import { CG_POLITICAL_LEDGER } from './chhattisgarh-political-timeline';

// ─── CURATED TRIVIA ───────────────────────────────────────────────────────

export const CG_CURATED_TRIVIA: TriviaItem[] = [
    {
      "id": "CG-T-001",
      "emoji": "\ud83d\udd04",
      "headline": "Ajit Jogi's Breakaway Move",
      "body": "In 2016, Chhattisgarh's first Chief Minister Ajit Jogi broke away from the Indian National Congress to form his own party, Janata Congress Chhattisgarh (JCC), changing the state's bipolar math.",
      "category": "DEFECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Times of India (2016-06-06)",
      "derived": false
    },
    {
      "id": "CG-T-002",
      "emoji": "\ud83c\udfc6",
      "headline": "Raman Singh's 15-Year Reign",
      "body": "Dr. Raman Singh (BJP) served as Chief Minister of Chhattisgarh for three consecutive terms from 2003 to 2018, earning him the title of the longest-serving BJP Chief Minister of any state.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Wikipedia (Raman Singh)",
      "derived": false
    },
    {
      "id": "CG-T-003",
      "emoji": "\u26f0\ufe0f",
      "headline": "Bastar: The Key to Power",
      "body": "In Chhattisgarh politics, there is a famous saying: \"The road to power in Raipur goes through Bastar.\" Bastar division holds 12 crucial tribal-reserved seats that historically decide the winner.",
      "category": "GEOGRAPHY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Hindustan Times political analysis",
      "derived": false
    },
    {
      "id": "CG-T-004",
      "emoji": "\ud83c\udf3e",
      "headline": "The Rice Bowl Mandate",
      "body": "Bupesh Baghel's Congress government in 2018 swept to power with 68/90 seats, heavily driven by the promise of raising the paddy procurement price to \u20b92500 per quintal.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2018, The Hindu",
      "derived": false
    },
    {
      "id": "CG-T-005",
      "emoji": "\ud83c\udfdb\ufe0f",
      "headline": "State Formation in 2000",
      "body": "Chhattisgarh was carved out of Madhya Pradesh on November 1, 2000, under the Madhya Pradesh Reorganisation Act, making Ajit Jogi its first Chief Minister.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Indian Parliament Records, Wikipedia",
      "derived": false
    },
    {
      "id": "CG-T-006",
      "emoji": "\ud83d\udc68\u200d\ud83d\udc66",
      "headline": "Jogi Family Influence",
      "body": "Despite Ajit Jogi's passing, his wife Renu Jogi and son Amit Jogi continue to lead the Janata Congress Chhattisgarh (JCC), retaining pockets of tribal influence.",
      "category": "DYNASTY",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Deccan Herald",
      "derived": false
    },
    {
      "id": "CG-T-007",
      "emoji": "\u270a",
      "headline": "First Tribal Chief Minister",
      "body": "In 2023, Vishnu Deo Sai was selected as the Chief Minister of Chhattisgarh, becoming the first tribal leader to serve as CM from the BJP in the state.",
      "category": "RECORD",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Indian Express (2023-12-10)",
      "derived": false
    },
    {
      "id": "CG-T-008",
      "emoji": "\u2696\ufe0f",
      "headline": "Anti-Defection and Speaker Rulings",
      "body": "Chhattisgarh has maintained a stable assembly with minimal individual defections compared to neighbors, owing to strong anti-defection whip systems in both BJP and INC.",
      "category": "LEGAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "Chhattisgarh Assembly Secretariat reports",
      "derived": false
    },
    {
      "id": "CG-T-009",
      "emoji": "\ud83d\udcc8",
      "headline": "The 2023 BJP Turnaround",
      "body": "Defying exit polls that predicted an easy Congress win, the BJP made a massive comeback in 2023, winning 54 out of 90 seats to form the government under Vishnu Deo Sai.",
      "category": "ELECTION",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "ECI Results 2023",
      "derived": false
    },
    {
      "id": "CG-T-010",
      "emoji": "\ud83d\udd6f\ufe0f",
      "headline": "The Darbha Valley Tragedy 2013",
      "body": "In a devastating blow, almost the entire top-tier Congress leadership of Chhattisgarh, including Mahendra Karma and Vidyacharan Shukla, was wiped out in a Naxal attack in Darbha Valley in 2013.",
      "category": "HISTORICAL",
      "contexts": [
        {
          "type": "GLOBAL"
        }
      ],
      "source": "National Investigation Agency (NIA) report",
      "derived": false
    }
  ];

// ─── DERIVED TRIVIA GENERATOR ────────────────────────────────────────────

function deriveTriviaFromLedger(): TriviaItem[] {
  const derived: TriviaItem[] = [];

  // 1. Count defections
  const defections = CG_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('defect') || 
    e.event?.toLowerCase().includes('switch') ||
    e.event?.toLowerCase().includes('joined')
  );
  if (defections.length > 0) {
    derived.push({
      id: 'CG-DRV-DEF-COUNT',
      emoji: '🔢',
      headline: `${defections.length} MLAs Have Switched Parties`,
      body: `In Chhattisgarh, ${defections.length} MLAs have switched parties in recent assembly terms.`,
      category: 'DEFECTION',
      contexts: [{ type: 'GLOBAL' }],
      source: 'Computed from Kshetra Political Ledger',
      derived: true,
    });
  }

  // 2. Count by-elections
  const byElections = CG_POLITICAL_LEDGER.filter(e => 
    e.event?.toLowerCase().includes('by-election')
  );
  if (byElections.length > 0) {
    derived.push({
      id: 'CG-DRV-BYE-COUNT',
      emoji: '🗳️',
      headline: `${byElections.length} By-Elections Held`,
      body: `Chhattisgarh has seen ${byElections.length} by-elections in recent terms.`,
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
export function getCGAllTrivia(): TriviaItem[] {
  if (!_cachedTrivia) {
    _cachedTrivia = [...CG_CURATED_TRIVIA, ...deriveTriviaFromLedger()];
  }
  return _cachedTrivia;
}

// ─── API ──────────────────────────────────────────────────────────────────

export function getCGTriviaForConstituency(acNo: number): TriviaItem[] {
  return getCGAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'CONSTITUENCY' && 'acNo' in c && c.acNo === acNo)
  );
}

export function getCGTriviaForParty(party: string): TriviaItem[] {
  return getCGAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'PARTY' && 'party' in c && c.party === party)
  );
}

export function getCGTriviaForMLA(name: string): TriviaItem[] {
  const lower = name.toLowerCase();
  return getCGAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'MLA' && 'name' in c && c.name.toLowerCase().includes(lower))
  );
}

export function getCGTriviaForElection(year: number): TriviaItem[] {
  return getCGAllTrivia().filter((t) =>
    t.contexts.some((c) => c.type === 'ELECTION' && 'year' in c && c.year === year)
  );
}

export function getCGRandomTrivia(): TriviaItem {
  const all = getCGAllTrivia();
  return all[Math.floor(Math.random() * all.length)];
}

export function getCGRandomTriviaSet(count: number): TriviaItem[] {
  const all = [...getCGAllTrivia()];
  const result: TriviaItem[] = [];
  const limit = Math.min(count, all.length);
  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(Math.random() * all.length);
    result.push(all.splice(idx, 1)[0]);
  }
  return result;
}

export function getCGTriviaByCategory(category: TriviaCategory): TriviaItem[] {
  return getCGAllTrivia().filter((t) => t.category === category);
}
