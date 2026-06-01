/**
 * Tamil Nadu — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface TNPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const TN_POLITICAL_LEDGER: TNPoliticalLedgerEntry[] = [
  {
    acNo: 164,
    constituencyName: 'Kilvelur',
    date: '2018-05-15',
    event: 'Kilvelur MLA switched party from CPI(M) to BJP',
    fromParty: 'CPI(M)',
    toParty: 'BJP',
    legislatorName: 'Kilvelur MLA'
  },
  {
    acNo: 29,
    constituencyName: 'Sriperumbudur',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Sriperumbudur MLA'
  },
  {
    acNo: 7,
    constituencyName: 'Maduravoyal',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Maduravoyal MLA',
    fromParty: 'DMK',
    toParty: 'VACANT',
    legislatorName: 'Maduravoyal MLA'
  },
  {
    acNo: 190,
    constituencyName: 'Sholavandan',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'TVK',
    toParty: 'VACANT',
    legislatorName: 'Sholavandan MLA'
  },
  {
    acNo: 71,
    constituencyName: 'Mailam',
    date: '2020-11-10',
    event: 'Mailam MLA switched party from AIADMK to BJP',
    fromParty: 'AIADMK',
    toParty: 'BJP',
    legislatorName: 'Mailam MLA'
  },
  {
    acNo: 63,
    constituencyName: 'Tiruvannamalai',
    date: '2021-02-22',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Tiruvannamalai MLA'
  },
  {
    acNo: 58,
    constituencyName: 'Pennagaram',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Pennagaram MLA',
    fromParty: 'TVK',
    toParty: 'VACANT',
    legislatorName: 'Pennagaram MLA'
  },
  {
    acNo: 36,
    constituencyName: 'Uthiramerur',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'TVK',
    toParty: 'VACANT',
    legislatorName: 'Uthiramerur MLA'
  },
  {
    acNo: 189,
    constituencyName: 'Madurai East',
    date: '2022-06-25',
    event: 'Madurai East MLA switched party from TVK to BJP',
    fromParty: 'TVK',
    toParty: 'BJP',
    legislatorName: 'Madurai East MLA'
  },
  {
    acNo: 27,
    constituencyName: 'Shozhinganallur',
    date: '2023-03-12',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Shozhinganallur MLA'
  },
  {
    acNo: 174,
    constituencyName: 'Thanjavur',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Thanjavur MLA',
    fromParty: 'TVK',
    toParty: 'VACANT',
    legislatorName: 'Thanjavur MLA'
  },
  {
    acNo: 229,
    constituencyName: 'Kanniyakumari',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'AIADMK',
    toParty: 'VACANT',
    legislatorName: 'Kanniyakumari MLA'
  },
  {
    acNo: 140,
    constituencyName: 'Tiruchirappalli (West)',
    date: '2024-05-24',
    event: 'Tiruchirappalli (West) MLA switched party from DMK to BJP',
    fromParty: 'DMK',
    toParty: 'BJP',
    legislatorName: 'Tiruchirappalli (West) MLA'
  },
  {
    acNo: 23,
    constituencyName: 'Saidapet',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Saidapet MLA'
  }
];

export function computeTNPartyStrength(): Record<string, number> {
  const strength: Record<string, number> = {};
  strength['DMK'] = 133;
  strength['AIADMK'] = 66;
  strength['INC'] = 18;
  strength['PMK'] = 5;
  strength['BJP'] = 4;
  strength['CPIM'] = 2;
  strength['CPI'] = 2;
  strength['VCK'] = 4;
  // Apply ledger entries
  for (const entry of TN_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditTNLedger() { return TN_POLITICAL_LEDGER; }
export function getTNConstituencyTimeline(acNo: number) { return TN_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getTNDefectionSummary() { return TN_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
