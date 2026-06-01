/**
 * Delhi — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface DLPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const DL_POLITICAL_LEDGER: DLPoliticalLedgerEntry[] = [
  {
    acNo: 164,
    constituencyName: '40-Nithari',
    date: '2018-05-15',
    event: 'Mamta Gupta switched party from AAP to BJP',
    fromParty: 'AAP',
    toParty: 'BJP',
    legislatorName: 'Mamta Gupta'
  },
  {
    acNo: 29,
    constituencyName: '127-Najafgarh',
    date: '2019-03-20',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Amit'
  },
  {
    acNo: 7,
    constituencyName: '104-Janak Puri South',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Dimple Ahuja',
    fromParty: 'AAP',
    toParty: 'VACANT',
    legislatorName: 'Dimple Ahuja'
  },
  {
    acNo: 190,
    constituencyName: '67-Sangam Park',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Sushil'
  },
  {
    acNo: 71,
    constituencyName: '170-Tughlakabad Extension',
    date: '2020-11-10',
    event: 'Bhagbir switched party from AAP to BJP',
    fromParty: 'AAP',
    toParty: 'BJP',
    legislatorName: 'Bhagbir'
  },
  {
    acNo: 63,
    constituencyName: '161-Deoli',
    date: '2021-02-22',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Anita'
  },
  {
    acNo: 58,
    constituencyName: '157-Aya Nagar',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Ved Pal Sheetal Chaudhary',
    fromParty: 'INC',
    toParty: 'VACANT',
    legislatorName: 'Ved Pal Sheetal Chaudhary'
  },
  {
    acNo: 36,
    constituencyName: '134-Raj Nagar',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'AAP',
    toParty: 'VACANT',
    legislatorName: 'Poonam Bhardwaj'
  },
  {
    acNo: 189,
    constituencyName: '66-Wazir Pur',
    date: '2022-06-25',
    event: 'Chitra Vidyarthi switched party from AAP to BJP',
    fromParty: 'AAP',
    toParty: 'BJP',
    legislatorName: 'Chitra Vidyarthi'
  },
  {
    acNo: 27,
    constituencyName: '125-Chhawaia',
    date: '2023-03-12',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Shashi Yadav'
  },
  {
    acNo: 174,
    constituencyName: '50-Mangolpuri-B',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Suman',
    fromParty: 'AAP',
    toParty: 'VACANT',
    legislatorName: 'Suman'
  },
  {
    acNo: 140,
    constituencyName: '241-Karawal Nagar-East',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Shimla Devi'
  },
  {
    acNo: 23,
    constituencyName: '120-Dwarka-B',
    date: '2024-05-24',
    event: 'Kamaljeet Sehrawat switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Kamaljeet Sehrawat'
  },
  {
    acNo: 152,
    constituencyName: '28-Shahbaad Dairy',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Ram Chander'
  }
];

export function computeDLPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
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
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  // Apply ledger entries
  for (const entry of DL_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditDLLedger() { return DL_POLITICAL_LEDGER; }
export function getDLConstituencyTimeline(acNo: number) { return DL_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getDLDefectionSummary() { return DL_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
