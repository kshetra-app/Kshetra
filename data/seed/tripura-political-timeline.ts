/**
 * Tripura — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface TRPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const TR_POLITICAL_LEDGER: TRPoliticalLedgerEntry[] = [
  {
    acNo: 41,
    constituencyName: 'Pratapgarh',
    date: '2018-05-15',
    event: 'Ramu Das switched party from CPIM to BJP',
    fromParty: 'CPIM',
    toParty: 'BJP',
    legislatorName: 'Ramu Das'
  },
  {
    acNo: 8,
    constituencyName: 'Bagma',
    date: '2019-03-20',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Ram Pada Jamatia'
  },
  {
    acNo: 2,
    constituencyName: 'Amarpur',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Ranjit Das',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Ranjit Das'
  },
  {
    acNo: 48,
    constituencyName: 'Simna',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'TMP',
    toParty: 'VACANT',
    legislatorName: 'Brishaketu Debbarma'
  },
  {
    acNo: 18,
    constituencyName: 'Fatikroy',
    date: '2020-11-10',
    event: 'Sudhangshu Das switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Sudhangshu Das'
  },
  {
    acNo: 16,
    constituencyName: 'Chawmanu',
    date: '2021-02-22',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Sambhu Lal Chakma'
  },
  {
    acNo: 15,
    constituencyName: 'Charilam',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Subodh Deb Barma',
    fromParty: 'TMP',
    toParty: 'VACANT',
    legislatorName: 'Subodh Deb Barma'
  },
  {
    acNo: 9,
    constituencyName: 'Banamalipur',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'INC',
    toParty: 'VACANT',
    legislatorName: 'Gopal Chandra Roy'
  },
  {
    acNo: 54,
    constituencyName: 'Town Bardowali',
    date: '2022-06-25',
    event: 'Manik Saha switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Manik Saha'
  },
  {
    acNo: 7,
    constituencyName: 'Bagbassa',
    date: '2023-03-12',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Jadab Lal Debnath'
  },
  {
    acNo: 44,
    constituencyName: 'Rajnagar',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Swapna Majumder',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Swapna Majumder'
  },
  {
    acNo: 35,
    constituencyName: 'Manu',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Mailafru Mog'
  },
  {
    acNo: 6,
    constituencyName: 'Badharghat',
    date: '2024-05-24',
    event: 'Mina Rani Sarkar switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Mina Rani Sarkar'
  },
  {
    acNo: 38,
    constituencyName: 'Nalchar',
    date: '2024-10-15',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Kishor Barman'
  }
];

export function computeTRPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['IPFT'] = (strength['IPFT'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['TMP'] = (strength['TMP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  // Apply ledger entries
  for (const entry of TR_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditTRLedger() { return TR_POLITICAL_LEDGER; }
export function getTRConstituencyTimeline(acNo: number) { return TR_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getTRDefectionSummary() { return TR_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
