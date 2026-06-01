/**
 * Jammu Kashmir — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface JKPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const JK_POLITICAL_LEDGER: JKPoliticalLedgerEntry[] = [
  {
    acNo: 82,
    constituencyName: 'Nagrota : Bye Election On 11-11-2025',
    date: '2018-05-15',
    event: 'Devyani Rana switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Devyani Rana'
  },
  {
    acNo: 15,
    constituencyName: 'Central Shalteng',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Tariq Hameed Karra'
  },
  {
    acNo: 4,
    constituencyName: 'Bahu',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Vikram Randhawa',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Vikram Randhawa'
  },
  {
    acNo: 36,
    constituencyName: 'Jasrota',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Rajiv Jasrotia'
  },
  {
    acNo: 32,
    constituencyName: 'Hiranagar',
    date: '2020-11-10',
    event: 'Vijay Kumar switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Vijay Kumar'
  },
  {
    acNo: 29,
    constituencyName: 'Habbakadal',
    date: '2021-02-22',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Shamim Firdous'
  },
  {
    acNo: 18,
    constituencyName: 'Chenani',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Balwant Singh Mankotia',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Balwant Singh Mankotia'
  },
  {
    acNo: 14,
    constituencyName: 'Budhal',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'JKNC',
    toParty: 'VACANT',
    legislatorName: 'Javaid Iqbal'
  },
  {
    acNo: 70,
    constituencyName: 'Srigufwara- Bijbehara',
    date: '2022-06-25',
    event: 'Bashir Ahmad Shah Veeri switched party from JKNC to BJP',
    fromParty: 'JKNC',
    toParty: 'BJP',
    legislatorName: 'Bashir Ahmad Shah Veeri'
  },
  {
    acNo: 12,
    constituencyName: 'Bishnah',
    date: '2023-03-12',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Rajeev Kumar'
  },
  {
    acNo: 55,
    constituencyName: 'Pattan',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Javaid Riyaz',
    fromParty: 'JKNC',
    toParty: 'VACANT',
    legislatorName: 'Javaid Riyaz'
  },
  {
    acNo: 5,
    constituencyName: 'Bandipora',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'INC',
    toParty: 'VACANT',
    legislatorName: 'Nizam Uddin Bhat'
  },
  {
    acNo: 80,
    constituencyName: 'Zadibal',
    date: '2024-05-24',
    event: 'Tanvir Sadiq switched party from JKNC to BJP',
    fromParty: 'JKNC',
    toParty: 'BJP',
    legislatorName: 'Tanvir Sadiq'
  },
  {
    acNo: 73,
    constituencyName: 'Tral',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Rafiq Ahmad Naik'
  }
];

export function computeJKPartyStrength(): Record<string, number> {
  const strength: Record<string, number> = {};
  strength['JKNC'] = 42;
  strength['BJP'] = 29;
  strength['INC'] = 6;
  strength['PDP'] = 3;
  strength['AAP'] = 1;
  strength['Others'] = 9;
  // Apply ledger entries
  for (const entry of JK_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditJKLedger() { return JK_POLITICAL_LEDGER; }
export function getJKConstituencyTimeline(acNo: number) { return JK_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getJKDefectionSummary() { return JK_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
