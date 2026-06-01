/**
 * Goa — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface GAPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const GA_POLITICAL_LEDGER: GAPoliticalLedgerEntry[] = [
  {
    acNo: 25,
    constituencyName: 'Sanguem',
    date: '2018-05-15',
    event: 'Subhash Uttam Phal Dessai switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Subhash Uttam Phal Dessai'
  },
  {
    acNo: 4,
    constituencyName: 'Calangute',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Michael Vincent Lobo'
  },
  {
    acNo: 5,
    constituencyName: 'Canacona',
    date: '2019-07-10',
    event: '2/3 merger: 10 of 15 INC MLAs merged into BJP legislature party using anti-defection law loophole (2/3 merger provision)',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Ramesh Tawadkar'
  },
  {
    acNo: 9,
    constituencyName: 'Dabolim',
    date: '2019-07-10',
    event: '2/3 merger: 10 of 15 INC MLAs merged into BJP legislature party using anti-defection law loophole',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Mauvin Heliodoro Godinho'
  },
  {
    acNo: 11,
    constituencyName: 'Maem',
    date: '2019-07-10',
    event: '2/3 merger: 10 of 15 INC MLAs merged into BJP legislature party using anti-defection law loophole',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Premendra Vishnu Shet'
  },
  {
    acNo: 1,
    constituencyName: 'Aldona',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Carlos Alvares Ferreira',
    fromParty: 'INC',
    toParty: 'VACANT',
    legislatorName: 'Carlos Alvares Ferreira'
  },
  {
    acNo: 28,
    constituencyName: 'Siolim',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'INC',
    toParty: 'VACANT',
    legislatorName: 'Delilah Michael Lobo'
  },
  {
    acNo: 12,
    constituencyName: 'Mandrem',
    date: '2020-11-10',
    event: 'Jit Vinayak Arolkar switched party from MG to BJP',
    fromParty: 'MG',
    toParty: 'BJP',
    legislatorName: 'Jit Vinayak Arolkar'
  },
  {
    acNo: 10,
    constituencyName: 'Fatorda',
    date: '2021-02-22',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Vijai Sardesai'
  },
  {
    acNo: 29,
    constituencyName: 'Siroda',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Subhash Shirodkar',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Subhash Shirodkar'
  },
  {
    acNo: 6,
    constituencyName: 'Cortalim',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'IND',
    toParty: 'VACANT',
    legislatorName: 'Antonio Vas'
  },
  {
    acNo: 33,
    constituencyName: 'Valpoi',
    date: '2022-06-25',
    event: 'Vishwajit Pratapsingh Rane switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Vishwajit Pratapsingh Rane'
  },
  {
    acNo: 15,
    constituencyName: 'Margao',
    date: '2022-09-14',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Digambar Kamat'
  },
  {
    acNo: 22,
    constituencyName: 'Porvorim',
    date: '2023-03-12',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Rohan Khaunte'
  },
  {
    acNo: 3,
    constituencyName: 'Bicholim',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Dr. Chandrakant Shetye',
    fromParty: 'IND',
    toParty: 'VACANT',
    legislatorName: 'Dr. Chandrakant Shetye'
  },
  {
    acNo: 23,
    constituencyName: 'Priol',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Govind Shepu Gaude'
  },
  {
    acNo: 18,
    constituencyName: 'Panaji',
    date: '2024-05-24',
    event: 'Atanasio Monserrate switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Atanasio Monserrate'
  },
  {
    acNo: 2,
    constituencyName: 'Benaulim',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Venzy Viegas'
  }
];

export function computeGAPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['GFP'] = (strength['GFP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['MG'] = (strength['MG'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['MG'] = (strength['MG'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['RGP'] = (strength['RGP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  // Apply ledger entries
  for (const entry of GA_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditGALedger() { return GA_POLITICAL_LEDGER; }
export function getGAConstituencyTimeline(acNo: number) { return GA_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getGADefectionSummary() { return GA_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
