/**
 * Uttarakhand — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface UKPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const UK_POLITICAL_LEDGER: UKPoliticalLedgerEntry[] = [
  {
    acNo: 43,
    constituencyName: 'Didihat',
    date: '2018-05-15',
    event: 'Vishan Singh switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Vishan Singh'
  },
  {
    acNo: 47,
    constituencyName: 'Bageshwar',
    date: '2019-03-20',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Chandan Ram Dass'
  },
  {
    acNo: 56,
    constituencyName: 'Lalkuan',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Dr. Mohan Singh Bisht',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Dr. Mohan Singh Bisht'
  },
  {
    acNo: 32,
    constituencyName: 'Khanpur',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'IND',
    toParty: 'VACANT',
    legislatorName: 'Umesh Kumar'
  },
  {
    acNo: 6,
    constituencyName: 'Karanprayag',
    date: '2020-11-10',
    event: 'Anil Nautiyal switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Anil Nautiyal'
  },
  {
    acNo: 39,
    constituencyName: 'Chaubattakhal',
    date: '2021-02-22',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Satpal Maharaj'
  },
  {
    acNo: 19,
    constituencyName: 'Raipur',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Umesh Sharma Kau',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Umesh Sharma Kau'
  },
  {
    acNo: 57,
    constituencyName: 'Bhimtal',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Ram Singh Kaira'
  },
  {
    acNo: 30,
    constituencyName: 'Pirankaliyar',
    date: '2022-06-25',
    event: 'Furkan Ahmad switched party from INC to BJP',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Furkan Ahmad'
  },
  {
    acNo: 36,
    constituencyName: 'Yamkeshwar',
    date: '2023-03-12',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Renu Bisht'
  },
  {
    acNo: 38,
    constituencyName: 'Srinagar',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Dr. Dhan Singh Rawat',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Dr. Dhan Singh Rawat'
  },
  {
    acNo: 34,
    constituencyName: 'Laksar',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'BSP',
    toParty: 'VACANT',
    legislatorName: 'Shahzad'
  },
  {
    acNo: 28,
    constituencyName: 'Bhagwanpur',
    date: '2024-05-24',
    event: 'Mamta Rakesh switched party from INC to BJP',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Mamta Rakesh'
  },
  {
    acNo: 54,
    constituencyName: 'Lohaghat',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Khushal Singh Adhikari'
  }
];

export function computeUKPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BSP'] = (strength['BSP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BSP'] = (strength['BSP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  // Apply ledger entries
  for (const entry of UK_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditUKLedger() { return UK_POLITICAL_LEDGER; }
export function getUKConstituencyTimeline(acNo: number) { return UK_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getUKDefectionSummary() { return UK_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
