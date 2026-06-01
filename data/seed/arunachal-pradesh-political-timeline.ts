/**
 * Arunachal Pradesh — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface ARPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const AR_POLITICAL_LEDGER: ARPoliticalLedgerEntry[] = [
  {
    acNo: 1,
    constituencyName: 'Along East',
    date: '2016-09-16',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Kento Jini'
  },
  {
    acNo: 2,
    constituencyName: 'Along West',
    date: '2016-09-16',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Topin Ete'
  },
  {
    acNo: 3,
    constituencyName: 'Anini',
    date: '2016-09-16',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Mopi Mihu'
  },
  {
    acNo: 5,
    constituencyName: 'Basar',
    date: '2016-09-16',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Nyabi Jini Dirchi'
  },
  {
    acNo: 6,
    constituencyName: 'Bomdila',
    date: '2016-09-16',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Dongru Siongju'
  },
  {
    acNo: 8,
    constituencyName: 'Borduria-Bogapani',
    date: '2016-09-16',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Wanglin Lowangdong'
  },
  {
    acNo: 9,
    constituencyName: 'Changlang South',
    date: '2016-09-16',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Hamjong Tangha'
  },
  {
    acNo: 10,
    constituencyName: 'Chowkham',
    date: '2016-09-16',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Chowna Mein'
  },
  {
    acNo: 49,
    constituencyName: 'Tezu',
    date: '2018-05-15',
    event: 'Dr. Mohesh Chai switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Dr. Mohesh Chai'
  },
  {
    acNo: 16,
    constituencyName: 'Dumporijo',
    date: '2019-03-20',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Rode Bui'
  },
  {
    acNo: 7,
    constituencyName: 'Bordumsa-Diyum',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Nikh Kamin',
    fromParty: 'NCP',
    toParty: 'VACANT',
    legislatorName: 'Nikh Kamin'
  },
  {
    acNo: 26,
    constituencyName: 'Lumla',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Tsering Lhamu'
  },
  {
    acNo: 24,
    constituencyName: 'Likabali',
    date: '2020-11-10',
    event: 'Kardo Nyigyor switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Kardo Nyigyor'
  },
  {
    acNo: 23,
    constituencyName: 'Lekang',
    date: '2021-02-22',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Likha Soni'
  },
  {
    acNo: 17,
    constituencyName: 'Itanagar',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Techi Kaso',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Techi Kaso'
  },
  {
    acNo: 15,
    constituencyName: 'Doimukh',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'PPA',
    toParty: 'VACANT',
    legislatorName: 'Nabam Vivek'
  },
  {
    acNo: 43,
    constituencyName: 'Roing',
    date: '2022-06-25',
    event: 'Mutchu Mithi switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Mutchu Mithi'
  },
  {
    acNo: 14,
    constituencyName: 'Dirang',
    date: '2023-03-12',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Phurpa Tsering'
  }
];

export function computeARPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NCP'] = (strength['NCP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['PPA'] = (strength['PPA'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NCP'] = (strength['NCP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['PPA'] = (strength['PPA'] || 0) + 1;
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
  strength['NPP'] = (strength['NPP'] || 0) + 1;
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
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NCP'] = (strength['NCP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  // Apply ledger entries
  for (const entry of AR_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditARLedger() { return AR_POLITICAL_LEDGER; }
export function getARConstituencyTimeline(acNo: number) { return AR_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getARDefectionSummary() { return AR_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
