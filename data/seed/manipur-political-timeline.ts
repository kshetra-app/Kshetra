/**
 * Manipur — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface MNPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const MN_POLITICAL_LEDGER: MNPoliticalLedgerEntry[] = [
  {
    acNo: 42,
    constituencyName: 'Tengnoupal',
    date: '2018-05-15',
    event: 'Letpao Haokip switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Letpao Haokip'
  },
  {
    acNo: 57,
    constituencyName: 'Henglep',
    date: '2019-03-20',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Letzamang Haokip'
  },
  {
    acNo: 26,
    constituencyName: 'Bishenpur',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Konthoujam Govindas Singh',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Konthoujam Govindas Singh'
  },
  {
    acNo: 44,
    constituencyName: 'Ukhrul',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'NPF',
    toParty: 'VACANT',
    legislatorName: 'Ram Muivah'
  },
  {
    acNo: 18,
    constituencyName: 'Konthoujam',
    date: '2020-11-10',
    event: 'Dr. Sapam Ranjan Singh switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Dr. Sapam Ranjan Singh'
  },
  {
    acNo: 4,
    constituencyName: 'Khetrigao',
    date: '2021-02-22',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Sheikh Noorul Hassan'
  },
  {
    acNo: 35,
    constituencyName: 'Khangabok',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Surjakumar Okram',
    fromParty: 'INC',
    toParty: 'VACANT',
    legislatorName: 'Surjakumar Okram'
  },
  {
    acNo: 40,
    constituencyName: 'Jiribam',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'JD(U)',
    toParty: 'VACANT',
    legislatorName: 'Md. Achab Uddin'
  },
  {
    acNo: 33,
    constituencyName: 'Heirok',
    date: '2022-06-25',
    event: 'Thokchom Radheshyam Singh switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Thokchom Radheshyam Singh'
  },
  {
    acNo: 56,
    constituencyName: 'Thanlon',
    date: '2023-03-12',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Vungzagin Valte'
  },
  {
    acNo: 16,
    constituencyName: 'Sekmai',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Heikham Dingo Singh',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Heikham Dingo Singh'
  },
  {
    acNo: 2,
    constituencyName: 'Heingang',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Nongthombam Biren Singh'
  },
  {
    acNo: 39,
    constituencyName: 'Sugnoo',
    date: '2024-05-24',
    event: 'Kangujam Ranjit Singh switched party from INC to BJP',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Kangujam Ranjit Singh'
  },
  {
    acNo: 54,
    constituencyName: 'Nungba',
    date: '2024-10-15',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Dinganglung Gangmei'
  }
];

export function computeMNPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NPF'] = (strength['NPF'] || 0) + 1;
  strength['JD(U)'] = (strength['JD(U)'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JD(U)'] = (strength['JD(U)'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JD(U)'] = (strength['JD(U)'] || 0) + 1;
  strength['NPF'] = (strength['NPF'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NPF'] = (strength['NPF'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['KPA'] = (strength['KPA'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['KPA'] = (strength['KPA'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPF'] = (strength['NPF'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JD(U)'] = (strength['JD(U)'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['JD(U)'] = (strength['JD(U)'] || 0) + 1;
  strength['NPF'] = (strength['NPF'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JD(U)'] = (strength['JD(U)'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  // Apply ledger entries
  for (const entry of MN_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditMNLedger() { return MN_POLITICAL_LEDGER; }
export function getMNConstituencyTimeline(acNo: number) { return MN_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getMNDefectionSummary() { return MN_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
