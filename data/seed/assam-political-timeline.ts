/**
 * Assam — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface ASPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const AS_POLITICAL_LEDGER: ASPoliticalLedgerEntry[] = [
  {
    acNo: 82,
    constituencyName: 'Nazira',
    date: '2018-05-15',
    event: 'Nazira MLA switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Nazira MLA'
  },
  {
    acNo: 15,
    constituencyName: 'Bilasipara',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Bilasipara MLA'
  },
  {
    acNo: 4,
    constituencyName: 'Bajali',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Bajali MLA',
    fromParty: 'AGP',
    toParty: 'VACANT',
    legislatorName: 'Bajali MLA'
  },
  {
    acNo: 95,
    constituencyName: 'Sadiya',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Sadiya MLA'
  },
  {
    acNo: 36,
    constituencyName: 'Diphu',
    date: '2020-11-10',
    event: 'Diphu MLA switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Diphu MLA'
  },
  {
    acNo: 32,
    constituencyName: 'Dholai',
    date: '2021-02-22',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Dholai MLA'
  },
  {
    acNo: 29,
    constituencyName: 'Dhekiajuli',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Dhekiajuli MLA',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Dhekiajuli MLA'
  },
  {
    acNo: 18,
    constituencyName: 'Bokajan',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Bokajan MLA'
  },
  {
    acNo: 14,
    constituencyName: 'Bijni',
    date: '2022-06-25',
    event: 'Bijni MLA switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Bijni MLA'
  },
  {
    acNo: 87,
    constituencyName: 'Parbatjhora',
    date: '2023-03-12',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Parbatjhora MLA'
  },
  {
    acNo: 70,
    constituencyName: 'Majuli',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Majuli MLA',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Majuli MLA'
  },
  {
    acNo: 12,
    constituencyName: 'Bhergaon',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'BPF',
    toParty: 'VACANT',
    legislatorName: 'Bhergaon MLA'
  },
  {
    acNo: 76,
    constituencyName: 'Mariani',
    date: '2024-05-24',
    event: 'Mariani MLA switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Mariani MLA'
  },
  {
    acNo: 55,
    constituencyName: 'Jaleswar',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Jaleswar MLA'
  }
];

export function computeASPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AGP'] = (strength['AGP'] || 0) + 1;
  strength['BPF'] = (strength['BPF'] || 0) + 1;
  strength['BPF'] = (strength['BPF'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AGP'] = (strength['AGP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BPF'] = (strength['BPF'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AGP'] = (strength['AGP'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AGP'] = (strength['AGP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AGP'] = (strength['AGP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['AITC'] = (strength['AITC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['RD'] = (strength['RD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AGP'] = (strength['AGP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BPF'] = (strength['BPF'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BPF'] = (strength['BPF'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AGP'] = (strength['AGP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AGP'] = (strength['AGP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BPF'] = (strength['BPF'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BPF'] = (strength['BPF'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['RD'] = (strength['RD'] || 0) + 1;
  strength['BPF'] = (strength['BPF'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['AGP'] = (strength['AGP'] || 0) + 1;
  strength['AGP'] = (strength['AGP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BPF'] = (strength['BPF'] || 0) + 1;
  // Apply ledger entries
  for (const entry of AS_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditASLedger() { return AS_POLITICAL_LEDGER; }
export function getASConstituencyTimeline(acNo: number) { return AS_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getASDefectionSummary() { return AS_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
