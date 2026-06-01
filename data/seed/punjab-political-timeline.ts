/**
 * Punjab — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface PBPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const PB_POLITICAL_LEDGER: PBPoliticalLedgerEntry[] = [
  {
    acNo: 82,
    constituencyName: 'Phagwara',
    date: '2018-05-15',
    event: 'Balwinder Singh Dhaliwal switched party from INC to BJP',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Balwinder Singh Dhaliwal'
  },
  {
    acNo: 15,
    constituencyName: 'Balachaur',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Santosh Kumari Katariaa'
  },
  {
    acNo: 4,
    constituencyName: 'Amargarh',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Prof. Jaswant Singh Gajjan Majra',
    fromParty: 'AAP',
    toParty: 'VACANT',
    legislatorName: 'Prof. Jaswant Singh Gajjan Majra'
  },
  {
    acNo: 95,
    constituencyName: 'Sardulgarh',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'AAP',
    toParty: 'VACANT',
    legislatorName: 'Gurpreet Singh Banawali'
  },
  {
    acNo: 36,
    constituencyName: 'Fatehgarh Churian',
    date: '2020-11-10',
    event: 'Tripat Rajinder Singh switched party from INC to BJP',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Tripat Rajinder Singh'
  },
  {
    acNo: 32,
    constituencyName: 'Dharamkot',
    date: '2021-02-22',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Devinderjeet Singh'
  },
  {
    acNo: 29,
    constituencyName: 'Dasuya',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Karambir Singh',
    fromParty: 'AAP',
    toParty: 'VACANT',
    legislatorName: 'Karambir Singh'
  },
  {
    acNo: 18,
    constituencyName: 'Bassi Pathana',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'AAP',
    toParty: 'VACANT',
    legislatorName: 'Rupinder Singh'
  },
  {
    acNo: 14,
    constituencyName: 'Bagha Purana',
    date: '2022-06-25',
    event: 'Amritpal Singh Sukhanand switched party from AAP to BJP',
    fromParty: 'AAP',
    toParty: 'BJP',
    legislatorName: 'Amritpal Singh Sukhanand'
  },
  {
    acNo: 87,
    constituencyName: 'Rajpura',
    date: '2023-03-12',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Neena Mittal'
  },
  {
    acNo: 70,
    constituencyName: 'Maur',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Sukhveer Singh Maiserkhana',
    fromParty: 'AAP',
    toParty: 'VACANT',
    legislatorName: 'Sukhveer Singh Maiserkhana'
  },
  {
    acNo: 12,
    constituencyName: 'Attari',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'AAP',
    toParty: 'VACANT',
    legislatorName: 'Jaswinder Singh'
  },
  {
    acNo: 76,
    constituencyName: 'Nawan Shahr',
    date: '2024-05-24',
    event: 'Nachhatar Pal switched party from BSP to BJP',
    fromParty: 'BSP',
    toParty: 'BJP',
    legislatorName: 'Nachhatar Pal'
  },
  {
    acNo: 55,
    constituencyName: 'Kartarpur',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Balkar Singh'
  }
];

export function computePBPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
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
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['SAD'] = (strength['SAD'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
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
  strength['SAD'] = (strength['SAD'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BSP'] = (strength['BSP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  strength['AAP'] = (strength['AAP'] || 0) + 1;
  // Apply ledger entries
  for (const entry of PB_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditPBLedger() { return PB_POLITICAL_LEDGER; }
export function getPBConstituencyTimeline(acNo: number) { return PB_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getPBDefectionSummary() { return PB_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
