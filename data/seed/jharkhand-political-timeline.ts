/**
 * Jharkhand — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface JHPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const JH_POLITICAL_LEDGER: JHPoliticalLedgerEntry[] = [
  {
    acNo: 15,
    constituencyName: 'Chatra',
    date: '2018-05-15',
    event: 'Janardhan Paswan switched party from LJPV to BJP',
    fromParty: 'LJPV',
    toParty: 'BJP',
    legislatorName: 'Janardhan Paswan'
  },
  {
    acNo: 4,
    constituencyName: 'Barhait',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Hemant Soren'
  },
  {
    acNo: 36,
    constituencyName: 'Jamua',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Manju Kumari',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Manju Kumari'
  },
  {
    acNo: 32,
    constituencyName: 'Jaganathpur',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'INC',
    toParty: 'VACANT',
    legislatorName: 'Sona Ram Sinku'
  },
  {
    acNo: 29,
    constituencyName: 'Hazaribagh',
    date: '2020-11-10',
    event: 'Pradip Prasad switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Pradip Prasad'
  },
  {
    acNo: 18,
    constituencyName: 'Dhanbad',
    date: '2021-02-22',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Raj Sinha'
  },
  {
    acNo: 14,
    constituencyName: 'Chandankiyari',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Uma Kant Rajak',
    fromParty: 'JMM',
    toParty: 'VACANT',
    legislatorName: 'Uma Kant Rajak'
  },
  {
    acNo: 12,
    constituencyName: 'Chaibasa',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'JMM',
    toParty: 'VACANT',
    legislatorName: 'Deepak Birua'
  },
  {
    acNo: 55,
    constituencyName: 'Nala',
    date: '2022-06-25',
    event: 'Rabindra Nath Mahato switched party from JMM to BJP',
    fromParty: 'JMM',
    toParty: 'BJP',
    legislatorName: 'Rabindra Nath Mahato'
  },
  {
    acNo: 5,
    constituencyName: 'Barhi',
    date: '2023-03-12',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Manoj Kumar Yadav'
  },
  {
    acNo: 2,
    constituencyName: 'Bagodar',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Nagendra Mahto',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Nagendra Mahto'
  },
  {
    acNo: 6,
    constituencyName: 'Barkagaon',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Roshan Lal Choudhary'
  },
  {
    acNo: 67,
    constituencyName: 'Simdega',
    date: '2024-05-24',
    event: 'Bhushan Bara switched party from INC to BJP',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Bhushan Bara'
  },
  {
    acNo: 73,
    constituencyName: 'Ghatsila',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Somesh Chandra Soren'
  }
];

export function computeJHPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['LJPV'] = (strength['LJPV'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['RJD'] = (strength['RJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['RJD'] = (strength['RJD'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['RJD'] = (strength['RJD'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JD(U)'] = (strength['JD(U)'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AP'] = (strength['AP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['CPI(ML'] = (strength['CPI(ML'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['CPI(ML'] = (strength['CPI(ML'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  strength['JMM'] = (strength['JMM'] || 0) + 1;
  // Apply ledger entries
  for (const entry of JH_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditJHLedger() { return JH_POLITICAL_LEDGER; }
export function getJHConstituencyTimeline(acNo: number) { return JH_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getJHDefectionSummary() { return JH_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
