/**
 * West Bengal — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface WBPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const WB_POLITICAL_LEDGER: WBPoliticalLedgerEntry[] = [
  {
    acNo: 58,
    constituencyName: 'Jangipur',
    date: '2018-05-15',
    event: 'Jangipur MLA switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Jangipur MLA'
  },
  {
    acNo: 13,
    constituencyName: 'Falakata',
    date: '2019-03-20',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Falakata MLA'
  },
  {
    acNo: 141,
    constituencyName: 'Magrahat Purba',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Magrahat Purba MLA',
    fromParty: 'AITC',
    toParty: 'VACANT',
    legislatorName: 'Magrahat Purba MLA'
  },
  {
    acNo: 126,
    constituencyName: 'Hingalganj',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Hingalganj MLA'
  },
  {
    acNo: 115,
    constituencyName: 'Rajarhat New Town',
    date: '2020-11-10',
    event: 'Rajarhat New Town MLA switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Rajarhat New Town MLA'
  },
  {
    acNo: 72,
    constituencyName: 'Baharampur',
    date: '2021-02-22',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Baharampur MLA'
  },
  {
    acNo: 53,
    constituencyName: 'Sujapur',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Sujapur MLA',
    fromParty: 'AITC',
    toParty: 'VACANT',
    legislatorName: 'Sujapur MLA'
  },
  {
    acNo: 280,
    constituencyName: 'Asansol Dakshin',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Asansol Dakshin MLA'
  },
  {
    acNo: 45,
    constituencyName: 'Chanchal',
    date: '2022-06-25',
    event: 'Chanchal MLA switched party from AITC to BJP',
    fromParty: 'AITC',
    toParty: 'BJP',
    legislatorName: 'Chanchal MLA'
  },
  {
    acNo: 217,
    constituencyName: 'Ramnagar',
    date: '2023-03-12',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Ramnagar MLA'
  },
  {
    acNo: 17,
    constituencyName: 'Jalpaiguri',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Jalpaiguri MLA',
    fromParty: 'AITC',
    toParty: 'VACANT',
    legislatorName: 'Jalpaiguri MLA'
  },
  {
    acNo: 16,
    constituencyName: 'Maynaguri',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Maynaguri MLA'
  },
  {
    acNo: 48,
    constituencyName: 'Ratua',
    date: '2024-05-24',
    event: 'Ratua MLA switched party from AITC to BJP',
    fromParty: 'AITC',
    toParty: 'BJP',
    legislatorName: 'Ratua MLA'
  },
  {
    acNo: 112,
    constituencyName: 'Kamarhati',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Kamarhati MLA'
  }
];

export function computeWBPartyStrength(): Record<string, number> {
  const strength: Record<string, number> = {};
  strength['AITC'] = 213;
  strength['BJP'] = 77;
  strength['ISF'] = 1;
  strength['Others'] = 3;
  // Apply ledger entries
  for (const entry of WB_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditWBLedger() { return WB_POLITICAL_LEDGER; }
export function getWBConstituencyTimeline(acNo: number) { return WB_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getWBDefectionSummary() { return WB_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
