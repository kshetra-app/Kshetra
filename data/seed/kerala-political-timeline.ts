/**
 * Kerala — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface KLPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const KL_POLITICAL_LEDGER: KLPoliticalLedgerEntry[] = [
  {
    acNo: 29,
    constituencyName: 'Beypore',
    date: '2018-05-15',
    event: 'Beypore MLA switched party from CPI(M) to BJP',
    fromParty: 'CPI(M)',
    toParty: 'BJP',
    legislatorName: 'Beypore MLA'
  },
  {
    acNo: 7,
    constituencyName: 'Kalliasseri',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Kalliasseri MLA'
  },
  {
    acNo: 71,
    constituencyName: 'Puthukkad',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Puthukkad MLA',
    fromParty: 'CPI(M)',
    toParty: 'VACANT',
    legislatorName: 'Puthukkad MLA'
  },
  {
    acNo: 63,
    constituencyName: 'Guruvayoor',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'CPI(M)',
    toParty: 'VACANT',
    legislatorName: 'Guruvayoor MLA'
  },
  {
    acNo: 58,
    constituencyName: 'Chittur',
    date: '2020-11-10',
    event: 'Chittur MLA switched party from INC to BJP',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Chittur MLA'
  },
  {
    acNo: 36,
    constituencyName: 'Wandoor (SC)',
    date: '2021-02-22',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Wandoor (SC) MLA'
  },
  {
    acNo: 27,
    constituencyName: 'Kozhikode North',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Kozhikode North MLA',
    fromParty: 'INC',
    toParty: 'VACANT',
    legislatorName: 'Kozhikode North MLA'
  },
  {
    acNo: 140,
    constituencyName: 'Neyyattinkara',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'INC',
    toParty: 'VACANT',
    legislatorName: 'Neyyattinkara MLA'
  },
  {
    acNo: 23,
    constituencyName: 'Koyilandy',
    date: '2022-06-25',
    event: 'Koyilandy MLA switched party from CPIM to BJP',
    fromParty: 'CPIM',
    toParty: 'BJP',
    legislatorName: 'Koyilandy MLA'
  },
  {
    acNo: 109,
    constituencyName: 'Mavelikkara (SC)',
    date: '2023-03-12',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Mavelikkara (SC) MLA'
  },
  {
    acNo: 9,
    constituencyName: 'Irikkur',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Irikkur MLA',
    fromParty: 'INC',
    toParty: 'VACANT',
    legislatorName: 'Irikkur MLA'
  },
  {
    acNo: 8,
    constituencyName: 'Thaliparamba',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'CPIM',
    toParty: 'VACANT',
    legislatorName: 'Thaliparamba MLA'
  },
  {
    acNo: 24,
    constituencyName: 'Perambra',
    date: '2024-05-24',
    event: 'Perambra MLA switched party from IUML to BJP',
    fromParty: 'IUML',
    toParty: 'BJP',
    legislatorName: 'Perambra MLA'
  },
  {
    acNo: 56,
    constituencyName: 'Palakkad',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Palakkad MLA'
  }
];

export function computeKLPartyStrength(): Record<string, number> {
  const strength: Record<string, number> = {};
  strength['CPIM'] = 62;
  strength['INC'] = 21;
  strength['IUML'] = 15;
  strength['KEC'] = 4;
  strength['CPI'] = 2;
  strength['RSP'] = 1;
  strength['NCP'] = 1;
  strength['Others'] = 34;
  // Apply ledger entries
  for (const entry of KL_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditKLLedger() { return KL_POLITICAL_LEDGER; }
export function getKLConstituencyTimeline(acNo: number) { return KL_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getKLDefectionSummary() { return KL_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
