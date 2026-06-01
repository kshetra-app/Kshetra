/**
 * Uttar Pradesh — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface UPPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const UP_POLITICAL_LEDGER: UPPoliticalLedgerEntry[] = [
  {
    acNo: 330,
    constituencyName: 'Padrauna',
    date: '2018-05-15',
    event: 'Manish Kumar Alias Mantu switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Manish Kumar Alias Mantu'
  },
  {
    acNo: 58,
    constituencyName: 'Dhaulana',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Sitting MLA'
  },
  {
    acNo: 13,
    constituencyName: 'Purqazi',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Sitting MLA',
    fromParty: 'INC',
    toParty: 'VACANT',
    legislatorName: 'Sitting MLA'
  },
  {
    acNo: 382,
    constituencyName: 'Saiyadraja',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Sushil Singh'
  },
  {
    acNo: 141,
    constituencyName: 'Dhaurahra',
    date: '2020-11-10',
    event: 'Vinod Shankar Awasthi switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Vinod Shankar Awasthi'
  },
  {
    acNo: 126,
    constituencyName: 'Aonla',
    date: '2021-02-22',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Dharmpal Singh'
  },
  {
    acNo: 115,
    constituencyName: 'Badaun',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Mahesh Chandra Gupta',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Mahesh Chandra Gupta'
  },
  {
    acNo: 72,
    constituencyName: 'Barauli',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Jaiveer Singh'
  },
  {
    acNo: 380,
    constituencyName: 'Mughalsarai',
    date: '2022-06-25',
    event: 'Ramesh Jaiswal switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Ramesh Jaiswal'
  },
  {
    acNo: 53,
    constituencyName: 'Loni',
    date: '2023-03-12',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Nandkishor'
  },
  {
    acNo: 349,
    constituencyName: 'Phoolpur Pawai',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Sitting MLA',
    fromParty: 'INC',
    toParty: 'VACANT',
    legislatorName: 'Sitting MLA'
  },
  {
    acNo: 282,
    constituencyName: 'Balha',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Saroj Sonkar'
  },
  {
    acNo: 45,
    constituencyName: 'Hastinapur',
    date: '2024-05-24',
    event: 'Dinesh Khatik switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Dinesh Khatik'
  },
  {
    acNo: 305,
    constituencyName: 'Itwa',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Mata Prasad Pandey'
  }
];

export function computeUPPartyStrength(): Record<string, number> {
  const strength: Record<string, number> = {};
  strength['BJP'] = 255;
  strength['SP'] = 111;
  strength['RLD'] = 8;
  strength['INC'] = 2;
  strength['BSP'] = 1;
  strength['AIMIM'] = 1;
  strength['Others'] = 25;
  // Apply ledger entries
  for (const entry of UP_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditUPLedger() { return UP_POLITICAL_LEDGER; }
export function getUPConstituencyTimeline(acNo: number) { return UP_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getUPDefectionSummary() { return UP_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
