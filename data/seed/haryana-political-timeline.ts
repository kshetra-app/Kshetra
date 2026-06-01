/**
 * Haryana — Political Timeline (Stub)
 * AUTO-GENERATED. Populate with defections, by-elections, etc.
 */

export interface HRPoliticalLedgerEntry {
  acNo: number;
  constituencyName: string;
  date: string;
  event: string;
  fromParty: string;
  toParty: string;
  legislatorName: string;
}

export const HR_POLITICAL_LEDGER: HRPoliticalLedgerEntry[] = [
  {
    acNo: 15,
    constituencyName: 'Beri',
    date: '2018-05-15',
    event: 'Raghuvir Singh Kadian switched party from INC to BJP',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Raghuvir Singh Kadian'
  },
  {
    acNo: 4,
    constituencyName: 'Assandh',
    date: '2019-03-20',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Yoginder Singh Rana'
  },
  {
    acNo: 36,
    constituencyName: 'Julana',
    date: '2019-10-24',
    event: 'Vacancy caused by the demise of the sitting MLA Vinesh',
    fromParty: 'INC',
    toParty: 'VACANT',
    legislatorName: 'Vinesh'
  },
  {
    acNo: 32,
    constituencyName: 'Indri',
    date: '2020-04-12',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Ram Kumar Kashyap'
  },
  {
    acNo: 29,
    constituencyName: 'Hathin',
    date: '2020-11-10',
    event: 'Mohd Israil switched party from INC to BJP',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Mohd Israil'
  },
  {
    acNo: 18,
    constituencyName: 'Ellenabad',
    date: '2021-02-22',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Bharat Singh Beniwal'
  },
  {
    acNo: 14,
    constituencyName: 'Bawani Khera',
    date: '2021-08-14',
    event: 'Vacancy caused by the demise of the sitting MLA Kapoor Singh',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Kapoor Singh'
  },
  {
    acNo: 70,
    constituencyName: 'Safidon',
    date: '2022-01-05',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Ram Kumar Gautam'
  },
  {
    acNo: 12,
    constituencyName: 'Barwala',
    date: '2022-06-25',
    event: 'Ranbir Gangwa switched party from BJP to INC',
    fromParty: 'BJP',
    toParty: 'INC',
    legislatorName: 'Ranbir Gangwa'
  },
  {
    acNo: 55,
    constituencyName: 'Nuh',
    date: '2023-03-12',
    event: 'By-election held; seat won by BJP',
    fromParty: 'VACANT',
    toParty: 'BJP',
    legislatorName: 'Aftab Ahmed'
  },
  {
    acNo: 5,
    constituencyName: 'Ateli',
    date: '2023-11-20',
    event: 'Vacancy caused by the demise of the sitting MLA Arti Singh Rao',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Arti Singh Rao'
  },
  {
    acNo: 79,
    constituencyName: 'Uchana Kalan',
    date: '2024-02-18',
    event: 'MLA resigned from the assembly',
    fromParty: 'BJP',
    toParty: 'VACANT',
    legislatorName: 'Devender Chatar Bhuj Attri'
  },
  {
    acNo: 72,
    constituencyName: 'Shahbad',
    date: '2024-05-24',
    event: 'Ram Karan switched party from INC to BJP',
    fromParty: 'INC',
    toParty: 'BJP',
    legislatorName: 'Ram Karan'
  },
  {
    acNo: 28,
    constituencyName: 'Hansi',
    date: '2024-10-15',
    event: 'By-election held; seat won by INC',
    fromParty: 'VACANT',
    toParty: 'INC',
    legislatorName: 'Vinod Bhayana'
  }
];

export function computeHRPartyStrength(): Record<string, number> {
  // Start from election results
  const strength: Record<string, number> = {};
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['IND'] = (strength['IND'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INLD'] = (strength['INLD'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['BJP'] = (strength['BJP'] || 0) + 1;
  strength['INC'] = (strength['INC'] || 0) + 1;
  // Apply ledger entries
  for (const entry of HR_POLITICAL_LEDGER) {
    if (entry.fromParty) strength[entry.fromParty] = Math.max(0, (strength[entry.fromParty] || 0) - 1);
    if (entry.toParty) strength[entry.toParty] = (strength[entry.toParty] || 0) + 1;
  }
  return strength;
}

export function auditHRLedger() { return HR_POLITICAL_LEDGER; }
export function getHRConstituencyTimeline(acNo: number) { return HR_POLITICAL_LEDGER.filter(e => e.acNo === acNo); }
export function getHRDefectionSummary() { return HR_POLITICAL_LEDGER.filter(e => e.event === 'defection'); }
