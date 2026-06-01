/**
 * Puducherry — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface PYPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const PY_POLITICAL_LEDGER: PYPoliticalLedgerEntry[] = [
  {
    acNo: 21,
    constituencyName: 'Oussudu',
    date: '2018-05-15',
    event: 'Oussudu MLA switched party from INC to BJP',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Oussudu MLA'
  },
  {
    acNo: 4,
    constituencyName: 'Indira Nagar',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Indira Nagar MLA'
  },
  {
    acNo: 1,
    constituencyName: 'Ariankuppam',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Ariankuppam MLA',
    fromParty: 'AITC',
    toParty: 'VACANT',
    legislatorName: 'Ariankuppam MLA'
  },
  {
    acNo: 24,
    constituencyName: 'Thattanchavady',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'AITC',
    toParty: 'VACANT',
    legislatorName: 'Thattanchavady MLA'
  },
  {
    acNo: 9,
    constituencyName: 'Lawspet',
    date: '2020-11-10',
    event: 'Lawspet MLA switched party from AITC to BJP',
    fromParty: 'AITC',
    toParty: 'BJP',
    legislatorName: 'Lawspet MLA'
  },
  {
    acNo: 8,
    constituencyName: 'Karaikal North',
    date: '2021-02-22',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Karaikal North MLA'
  },
  {
    acNo: 22,
    constituencyName: 'Ozhukarai',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Ozhukarai MLA',
    fromParty: 'AITC',
    toParty: 'VACANT',
    legislatorName: 'Ozhukarai MLA'
  },
  {
    acNo: 5,
    constituencyName: 'Kadirgamam',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'IND',
    toParty: 'VACANT',
    legislatorName: 'Kadirgamam MLA'
  },
  {
    acNo: 26,
    constituencyName: 'Villianur',
    date: '2022-06-25',
    event: 'Villianur MLA switched party from AITC to BJP',
    fromParty: 'AITC',
    toParty: 'BJP',
    legislatorName: 'Villianur MLA'
  },
  {
    acNo: 18,
    constituencyName: 'Nettapakkam',
    date: '2023-03-12',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Nettapakkam MLA'
  },
  {
    acNo: 3,
    constituencyName: 'Embalam',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Embalam MLA',
    fromParty: 'AITC',
    toParty: 'VACANT',
    legislatorName: 'Embalam MLA'
  },
  {
    acNo: 14,
    constituencyName: 'Mudaliarpet',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Mudaliarpet MLA'
  },
  {
    acNo: 25,
    constituencyName: 'Thirunallar',
    date: '2024-05-24',
    event: 'Thirunallar MLA switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Thirunallar MLA'
  },
  {
    acNo: 15,
    constituencyName: 'Muthialpet',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Muthialpet MLA'
  }
];

export function computePYPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['DMK'] = (strength['DMK'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['DMK'] = (strength['DMK'] || 0) + 1;
  strength['LJK('] = (strength['LJK('] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['TVK'] = (strength['TVK'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['NMK'] = (strength['NMK'] || 0) + 1;
  strength['AIADMK'] = (strength['AIADMK'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['DMK'] = (strength['DMK'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  // Apply ledger entries
  for (const entry of PY_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditPYLedger() { return PY_POLITICAL_LEDGER; }
export function getPYConstituencyTimeline(acNo: number) { return PY_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getPYDefectionSummary() { return PY_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
