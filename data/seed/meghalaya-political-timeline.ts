/**
 * Meghalaya — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface MLPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const ML_POLITICAL_LEDGER: MLPoliticalLedgerEntry[] = [
  {
    acNo: 47,
    constituencyName: 'South Shillong',
    date: '2018-05-15',
    event: 'Sanbor Shullai switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Sanbor Shullai'
  },
  {
    acNo: 14,
    constituencyName: 'Mairang',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Metbah Lyngdoh'
  },
  {
    acNo: 8,
    constituencyName: 'East Shillong',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Dr. Mazel Ampareen Lyngdoh',
    fromParty: 'NPP',
    toParty: 'VACANT',
    legislatorName: 'Dr. Mazel Ampareen Lyngdoh'
  },
  {
    acNo: 24,
    constituencyName: 'Mowkaiaw',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'UDP',
    toParty: 'VACANT',
    legislatorName: 'Nujorki Sungoh'
  },
  {
    acNo: 22,
    constituencyName: 'Mawthadraishan',
    date: '2020-11-10',
    event: 'Shakliar Warjri switched party from HSPDP to BJP',
    fromParty: 'HSPDP',
    toParty: 'BJP',
    legislatorName: 'Shakliar Warjri'
  },
  {
    acNo: 21,
    constituencyName: 'Mawsynram',
    date: '2021-02-22',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Ollan Singh Suin'
  },
  {
    acNo: 15,
    constituencyName: 'Mawhati',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Charles Marngar',
    fromParty: 'INC',
    toParty: 'VACANT',
    legislatorName: 'Charles Marngar'
  },
  {
    acNo: 1,
    constituencyName: 'Amlarem',
    date: '2021-11-25',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'TMC',
    legislatorName: 'Lahkmen Rymbui'
  },
  {
    acNo: 2,
    constituencyName: 'Ampati',
    date: '2021-11-25',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'TMC',
    legislatorName: 'Miani D. Shira'
  },
  {
    acNo: 3,
    constituencyName: 'Baghmara',
    date: '2021-11-25',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'TMC',
    legislatorName: 'Kartush R. Marak'
  },
  {
    acNo: 4,
    constituencyName: 'Bajengdoba',
    date: '2021-11-25',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'TMC',
    legislatorName: 'Pongseng Marak'
  },
  {
    acNo: 5,
    constituencyName: 'Chokpot',
    date: '2021-11-25',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'TMC',
    legislatorName: 'Sengchim N. Sangma'
  },
  {
    acNo: 6,
    constituencyName: 'Dadenggre',
    date: '2021-11-25',
    event: 'defection',
    fromParty: 'INC',
    toParty: 'TMC',
    legislatorName: 'Rupa M. Marak'
  },
  {
    acNo: 13,
    constituencyName: 'Mahendraganj',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'NPP',
    toParty: 'VACANT',
    legislatorName: 'Sanjay A. Sangma'
  },
  {
    acNo: 41,
    constituencyName: 'Rongjeng',
    date: '2022-06-25',
    event: 'Jim M Sangma switched party from NPP to BJP',
    fromParty: 'NPP',
    toParty: 'BJP',
    legislatorName: 'Jim M Sangma'
  },
  {
    acNo: 12,
    constituencyName: 'Khliehriat',
    date: '2023-03-12',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Kyrmen Shylla'
  },
  {
    acNo: 44,
    constituencyName: 'Shella',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Balajied Kupar Synrem',
    fromParty: 'UDP',
    toParty: 'VACANT',
    legislatorName: 'Balajied Kupar Synrem'
  },
  {
    acNo: 34,
    constituencyName: 'Rajabala',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'AITC',
    toParty: 'VACANT',
    legislatorName: 'Dr. Mizanur Rahman Kazi'
  }
];

export function computeMLPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['PDF'] = (strength['PDF'] || 0) + 1;
  strength['VTPP'] = (strength['VTPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['VTPP'] = (strength['VTPP'] || 0) + 1;
  strength['HSPDP'] = (strength['HSPDP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['HSPDP'] = (strength['HSPDP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['VTPP'] = (strength['VTPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['VTPP'] = (strength['VTPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['PDF'] = (strength['PDF'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['UDP'] = (strength['UDP'] || 0) + 1;
  // Apply ledger entries
  for (const entry of ML_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditMLLedger() { return ML_POLITICAL_LEDGER; }
export function getMLConstituencyTimeline(acNo: number) { return ML_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getMLDefectionSummary() { return ML_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
