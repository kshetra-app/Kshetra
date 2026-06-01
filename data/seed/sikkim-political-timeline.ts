/**
 * Sikkim — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface SKPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const SK_POLITICAL_LEDGER: SKPoliticalLedgerEntry[] = [
  {
    acNo: 21,
    constituencyName: 'Sangha',
    date: '2018-05-15',
    event: 'Sonam Lama switched party from SKM to BJP',
    fromParty: 'SKM',
    toParty: 'BJP',
    legislatorName: 'Sonam Lama'
  },
  {
    acNo: 4,
    constituencyName: 'Daramdin',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Mingma Norbu Sherpa'
  },
  {
    acNo: 1,
    constituencyName: 'Arithang',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Arun Kumar Upreti',
    fromParty: 'SKM',
    toParty: 'VACANT',
    legislatorName: 'Arun Kumar Upreti'
  },
  {
    acNo: 24,
    constituencyName: 'Temi-Namphing',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'SKM',
    toParty: 'VACANT',
    legislatorName: 'Bedu Singh Panth'
  },
  {
    acNo: 9,
    constituencyName: 'Khamdong-Singtam',
    date: '2020-11-10',
    event: 'Nar Bahadur Dahal switched party from SKM to BJP',
    fromParty: 'SKM',
    toParty: 'BJP',
    legislatorName: 'Nar Bahadur Dahal'
  },
  {
    acNo: 8,
    constituencyName: 'Gyalshing-Barnyak',
    date: '2021-02-22',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Lok Nath Sharma'
  },
  {
    acNo: 26,
    constituencyName: 'Upper Tadong',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA G.T. Dhungel',
    fromParty: 'SKM',
    toParty: 'VACANT',
    legislatorName: 'G.T. Dhungel'
  },
  {
    acNo: 5,
    constituencyName: 'Djongu',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'SKM',
    toParty: 'VACANT',
    legislatorName: 'Pintso Namgyal Lepcha'
  },
  {
    acNo: 30,
    constituencyName: 'Namchi-Singhithang : Bye Election On 13-11-2024',
    date: '2022-06-25',
    event: 'Satish Chandra Rai switched party from SKM to BJP',
    fromParty: 'SKM',
    toParty: 'BJP',
    legislatorName: 'Satish Chandra Rai'
  },
  {
    acNo: 22,
    constituencyName: 'Shyari',
    date: '2023-03-12',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Tenzing Norbu Lamtha'
  },
  {
    acNo: 18,
    constituencyName: 'Rhenock',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA P S Tamang',
    fromParty: 'SKM',
    toParty: 'VACANT',
    legislatorName: 'P S Tamang'
  },
  {
    acNo: 3,
    constituencyName: 'Chujachen',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'SKM',
    toParty: 'VACANT',
    legislatorName: 'Puran Kr. Gurung'
  },
  {
    acNo: 19,
    constituencyName: 'Rinchenpong',
    date: '2024-05-24',
    event: 'Erung Tenzing Lepcha switched party from SKM to BJP',
    fromParty: 'SKM',
    toParty: 'BJP',
    legislatorName: 'Erung Tenzing Lepcha'
  },
  {
    acNo: 14,
    constituencyName: 'Namcheybung',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Raju Basnet'
  }
];

export function computeSKPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SDF'] = (strength['SDF'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  strength['SKM'] = (strength['SKM'] || 0) + 1;
  // Apply ledger entries
  for (const entry of SK_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditSKLedger() { return SK_POLITICAL_LEDGER; }
export function getSKConstituencyTimeline(acNo: number) { return SK_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getSKDefectionSummary() { return SK_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
