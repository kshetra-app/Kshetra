/**
 * Odisha — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface ODPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const OD_POLITICAL_LEDGER: ODPoliticalLedgerEntry[] = [
  {
    acNo: 29,
    constituencyName: 'Bijepur',
    date: '2018-05-15',
    event: 'Sanat Kumar Gartia switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Sanat Kumar Gartia'
  },
  {
    acNo: 7,
    constituencyName: 'Aul',
    date: '2019-03-20',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Pratap Keshari Deb'
  },
  {
    acNo: 71,
    constituencyName: 'Kantabanji',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Laxman Bag',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Laxman Bag'
  },
  {
    acNo: 63,
    constituencyName: 'Jatani',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJD',
    toParty: 'VACANT',
    legislatorName: 'Bibhuti Bhusan Balabantaray'
  },
  {
    acNo: 58,
    constituencyName: 'Hinjili',
    date: '2020-11-10',
    event: 'Naveen Patnaik switched party from BJD to BJP',
    fromParty: 'BJD',
    toParty: 'BJP',
    legislatorName: 'Naveen Patnaik'
  },
  {
    acNo: 36,
    constituencyName: 'Brahmagiri',
    date: '2021-02-22',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Upasna Mohapatra'
  },
  {
    acNo: 27,
    constituencyName: 'Bhubaneswar Central',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Ananta Narayan Jena',
    fromParty: 'BJD',
    toParty: 'VACANT',
    legislatorName: 'Ananta Narayan Jena'
  },
  {
    acNo: 23,
    constituencyName: 'Bhandaripokhari',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJD',
    toParty: 'VACANT',
    legislatorName: 'Sanjib Kumar Mallick'
  },
  {
    acNo: 109,
    constituencyName: 'Rairangpur',
    date: '2022-06-25',
    event: 'Jalen Naik switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Jalen Naik'
  },
  {
    acNo: 9,
    constituencyName: 'Baliguda',
    date: '2023-03-12',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Chakramani Kanhar'
  },
  {
    acNo: 8,
    constituencyName: 'Badasahi',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Sanatan Bijuli',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Sanatan Bijuli'
  },
  {
    acNo: 24,
    constituencyName: 'Bhanjanagar',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Pradyumna Kumar Nayak'
  },
  {
    acNo: 56,
    constituencyName: 'Gopalpur',
    date: '2024-05-24',
    event: 'Bibhuti Bhushan Jena switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Bibhuti Bhushan Jena'
  },
  {
    acNo: 60,
    constituencyName: 'Jajpur',
    date: '2024-10-15',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Sujata Sahu'
  }
];

export function computeODPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['CPIM'] = (strength['CPIM'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJD'] = (strength['BJD'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  // Apply ledger entries
  for (const entry of OD_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditODLedger() { return OD_POLITICAL_LEDGER; }
export function getODConstituencyTimeline(acNo: number) { return OD_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getODDefectionSummary() { return OD_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
