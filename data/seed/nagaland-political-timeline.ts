/**
 * Nagaland — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface NLPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const NL_POLITICAL_LEDGER: NLPoliticalLedgerEntry[] = [
  {
    acNo: 41,
    constituencyName: 'Tapi',
    date: '2018-05-15',
    event: 'Noke Wangnao switched party from NDPP to BJP',
    fromParty: 'NDPP',
    toParty: 'BJP',
    legislatorName: 'Noke Wangnao'
  },
  {
    acNo: 8,
    constituencyName: 'Atoizu',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Picto'
  },
  {
    acNo: 2,
    constituencyName: 'Aghunato',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA G Ikuto Zhimomi',
    fromParty: 'NDPP',
    toParty: 'VACANT',
    legislatorName: 'G Ikuto Zhimomi'
  },
  {
    acNo: 48,
    constituencyName: 'Tuensang Sadar-Ii',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'RPI(',
    toParty: 'VACANT',
    legislatorName: 'Imtichoba'
  },
  {
    acNo: 18,
    constituencyName: 'Koridang',
    date: '2020-11-10',
    event: 'Imkong L. Imchen switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Imkong L. Imchen'
  },
  {
    acNo: 16,
    constituencyName: 'Impur',
    date: '2021-02-22',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'T N Mannen'
  },
  {
    acNo: 15,
    constituencyName: 'Ghaspani-Ii',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Zhaleo Rio',
    fromParty: 'NDPP',
    toParty: 'VACANT',
    legislatorName: 'Zhaleo Rio'
  },
  {
    acNo: 9,
    constituencyName: 'Chazouba',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'NDPP',
    toParty: 'VACANT',
    legislatorName: 'Kudecho Khamo'
  },
  {
    acNo: 7,
    constituencyName: 'Arkakong',
    date: '2022-06-25',
    event: 'Nuklutoshi switched party from NPP to BJP',
    fromParty: 'NPP',
    toParty: 'BJP',
    legislatorName: 'Nuklutoshi'
  },
  {
    acNo: 44,
    constituencyName: 'Thonoknyu',
    date: '2023-03-12',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Benei M Lamthiu'
  },
  {
    acNo: 35,
    constituencyName: 'Satakha',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA G. Kaito Aye',
    fromParty: 'NDPP',
    toParty: 'VACANT',
    legislatorName: 'G. Kaito Aye'
  },
  {
    acNo: 6,
    constituencyName: 'Aonglenden',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'NDPP',
    toParty: 'VACANT',
    legislatorName: 'Sharingain Longkumer'
  },
  {
    acNo: 38,
    constituencyName: 'Southern Angami-I',
    date: '2024-05-24',
    event: 'Kevipodi Sophie switched party from IND to BJP',
    fromParty: 'IND',
    toParty: 'BJP',
    legislatorName: 'Kevipodi Sophie'
  },
  {
    acNo: 28,
    constituencyName: 'Northern Angami-Ii',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Neiphiu Rio'
  }
];

export function computeNLPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NCP'] = (strength['NCP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NCP'] = (strength['NCP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NCP'] = (strength['NCP'] || 0) + 1;
  strength['RPI('] = (strength['RPI('] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['NPF'] = (strength['NPF'] || 0) + 1;
  strength['LJPV'] = (strength['LJPV'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NCP'] = (strength['NCP'] || 0) + 1;
  strength['NPP'] = (strength['NPP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['LJPV'] = (strength['LJPV'] || 0) + 1;
  strength['JD(U)'] = (strength['JD(U)'] || 0) + 1;
  strength['RPI('] = (strength['RPI('] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NCP'] = (strength['NCP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  strength['NDPP'] = (strength['NDPP'] || 0) + 1;
  // Apply ledger entries
  for (const entry of NL_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditNLLedger() { return NL_POLITICAL_LEDGER; }
export function getNLConstituencyTimeline(acNo: number) { return NL_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getNLDefectionSummary() { return NL_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
