/**
 * Bihar — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface BRPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const BR_POLITICAL_LEDGER: BRPoliticalLedgerEntry[] = [
  {
    acNo: 164,
    constituencyName: 'Pirpainti',
    date: '2018-05-15',
    event: 'Lalan Kumar switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Lalan Kumar'
  },
  {
    acNo: 29,
    constituencyName: 'Barbigha',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Sudarshan Kumar'
  },
  {
    acNo: 7,
    constituencyName: 'Amour',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Akhtarul Iman',
    fromParty: 'AIMM',
    toParty: 'VACANT',
    legislatorName: 'Akhtarul Iman'
  },
  {
    acNo: 190,
    constituencyName: 'Sheohar',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'RJD',
    toParty: 'VACANT',
    legislatorName: 'Chetan Anand'
  },
  {
    acNo: 71,
    constituencyName: 'Ekma',
    date: '2020-11-10',
    event: 'Srikant Yadav switched party from RJD to BJP',
    fromParty: 'RJD',
    toParty: 'BJP',
    legislatorName: 'Srikant Yadav'
  },
  {
    acNo: 63,
    constituencyName: 'Darbhanga',
    date: '2021-02-22',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Sanjay Saraogi'
  },
  {
    acNo: 58,
    constituencyName: 'Chhatapur',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Neeraj Kumar Singh',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Neeraj Kumar Singh'
  },
  {
    acNo: 36,
    constituencyName: 'Beldaur',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'JD(U)',
    toParty: 'VACANT',
    legislatorName: 'Panna Lal Singh Patel'
  },
  {
    acNo: 189,
    constituencyName: 'Sheikhpura',
    date: '2022-06-25',
    event: 'Vijay Kumar switched party from RJD to BJP',
    fromParty: 'RJD',
    toParty: 'BJP',
    legislatorName: 'Vijay Kumar'
  },
  {
    acNo: 27,
    constituencyName: 'Barari',
    date: '2023-03-12',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Bijay Singh'
  },
  {
    acNo: 174,
    constituencyName: 'Ramgarh',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Sudhakar Singh',
    fromParty: 'RJD',
    toParty: 'VACANT',
    legislatorName: 'Sudhakar Singh'
  },
  {
    acNo: 140,
    constituencyName: 'Mokama',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'RJD',
    toParty: 'VACANT',
    legislatorName: 'Anant Kumar Singh'
  },
  {
    acNo: 23,
    constituencyName: 'Baniapur',
    date: '2024-05-24',
    event: 'Kedar Nath Singh switched party from RJD to BJP',
    fromParty: 'RJD',
    toParty: 'BJP',
    legislatorName: 'Kedar Nath Singh'
  },
  {
    acNo: 152,
    constituencyName: 'Nirmali',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Aniruddha Prasad Yadav'
  }
];

export function computeBRPartyStrength(): Record<string, number> {
  const strength: Record<string, number> = {};
  strength['RJD'] = 75;
  strength['BJP'] = 74;
  strength['JDU'] = 43;
  strength['INC'] = 19;
  strength['HAM'] = 4;
  strength['VIP'] = 4;
  strength['CPI'] = 2;
  strength['CPIM'] = 2;
  strength['Others'] = 20;
  // Apply ledger entries
  for (const entry of BR_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditBRLedger() { return BR_POLITICAL_LEDGER; }
export function getBRConstituencyTimeline(acNo: number) { return BR_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getBRDefectionSummary() { return BR_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
