/**
 * Mizoram — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface MZPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const MZ_POLITICAL_LEDGER: MZPoliticalLedgerEntry[] = [
  {
    acNo: 8,
    constituencyName: 'Aizawl South-Iii',
    date: '2018-05-15',
    event: 'Baryl Vanneihsangi switched party from ZPM to BJP',
    fromParty: 'ZPM',
    toParty: 'BJP',
    legislatorName: 'Baryl Vanneihsangi'
  },
  {
    acNo: 2,
    constituencyName: 'Aizawl East-Ii',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'B. Lalchhanzova'
  },
  {
    acNo: 18,
    constituencyName: 'Lawngtlai East',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Dr. Lorrain Lalpekliana Chinzah',
    fromParty: 'ZPM',
    toParty: 'VACANT',
    legislatorName: 'Dr. Lorrain Lalpekliana Chinzah'
  },
  {
    acNo: 16,
    constituencyName: 'Hachhek',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'MNF',
    toParty: 'VACANT',
    legislatorName: 'Robert Romawia Royte'
  },
  {
    acNo: 35,
    constituencyName: 'West Tuipui',
    date: '2020-11-10',
    event: 'Prova Chakma switched party from MNF to BJP',
    fromParty: 'MNF',
    toParty: 'BJP',
    legislatorName: 'Prova Chakma'
  },
  {
    acNo: 5,
    constituencyName: 'Aizawl North-Iii',
    date: '2021-02-22',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'K. Sapdanga'
  },
  {
    acNo: 24,
    constituencyName: 'Mamit',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA H. Lalzirliana',
    fromParty: 'MNF',
    toParty: 'VACANT',
    legislatorName: 'H. Lalzirliana'
  },
  {
    acNo: 4,
    constituencyName: 'Aizawl North-Ii',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'ZPM',
    toParty: 'VACANT',
    legislatorName: 'Dr. Vanlalthlana'
  },
  {
    acNo: 22,
    constituencyName: 'Lunglei South',
    date: '2022-06-25',
    event: 'Lalramliana Papuia switched party from ZPM to BJP',
    fromParty: 'ZPM',
    toParty: 'BJP',
    legislatorName: 'Lalramliana Papuia'
  },
  {
    acNo: 29,
    constituencyName: 'Tawi',
    date: '2023-03-12',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Prof. Lalnilawma'
  },
  {
    acNo: 33,
    constituencyName: 'Tuirial',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA K. Laldawngliana',
    fromParty: 'MNF',
    toParty: 'VACANT',
    legislatorName: 'K. Laldawngliana'
  },
  {
    acNo: 3,
    constituencyName: 'Aizawl North-I',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'ZPM',
    toParty: 'VACANT',
    legislatorName: 'Vanlalhlana'
  },
  {
    acNo: 19,
    constituencyName: 'Lawngtlai West',
    date: '2024-05-24',
    event: 'C. Ngunlianchunga switched party from INC to BJP',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'C. Ngunlianchunga'
  },
  {
    acNo: 14,
    constituencyName: 'Dampa',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Lalrintluanga Sailo'
  }
];

export function computeMZPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['ZPM'] = (strength['ZPM'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  strength['MNF'] = (strength['MNF'] || 0) + 1;
  // Apply ledger entries
  for (const entry of MZ_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditMZLedger() { return MZ_POLITICAL_LEDGER; }
export function getMZConstituencyTimeline(acNo: number) { return MZ_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getMZDefectionSummary() { return MZ_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
