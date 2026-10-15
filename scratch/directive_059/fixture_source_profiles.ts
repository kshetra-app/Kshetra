export interface MockCandidateProfile {
  candidateName: string;
  acNo: number;
  constituencyName: string;
  party?: string;
  totalAssets?: number;
  totalLiabilities?: number;
  selfMovableAssets?: number;
  selfImmovableAssets?: number;
  remarks?: string;
}

export const FIXTURE_PROFILES: MockCandidateProfile[] = [
  {
    candidateName: "Candidate One",
    acNo: 1,
    constituencyName: "Constituency 1",
    party: "PARTY_A",
    totalAssets: 1000000,
    totalLiabilities: 200000,
    selfMovableAssets: 0,
    selfImmovableAssets: 0,
  },
  {
    candidateName: "Candidate Two",
    acNo: 2,
    constituencyName: "Constituency 2",
    party: "PARTY_B",
    totalAssets: 500000,
    totalLiabilities: 0,
  },
  {
    candidateName: "Candidate Three",
    acNo: 3,
    constituencyName: "Constituency 3",
    party: "PARTY_C",
    totalAssets: 750000,
    // totalLiabilities is intentionally omitted in source disclosure
  },
  {
    candidateName: "Candidate Four",
    acNo: 4,
    constituencyName: "Constituency 4",
    party: "PARTY_D",
    // totalAssets and totalLiabilities are omitted in source disclosure
  },
  {
    candidateName: "Candidate Five",
    acNo: 5,
    constituencyName: "Constituency 5",
    party: "PARTY_E",
    totalAssets: 0,
    totalLiabilities: 0,
  },
  {
    candidateName: "Candidate CommentTest",
    acNo: 6,
    constituencyName: "Constituency 6",
    // totalAssets: 999999,
    /* totalAssets: 888888, */
    totalLiabilities: 12345,
  },
  {
    candidateName: 'O\'Connor \'Test\'',
    acNo: 7,
    constituencyName: "Constituency 7",
    totalAssets: 450000,
    remarks: "Escaped \\'single\\' and \\\"double\\\" quotes with backslashes \\\\",
  },
  {
    candidateName: "Candidate NeighborA",
    acNo: 8,
    constituencyName: "Constituency 8",
    totalAssets: 111111,
  },
  {
    candidateName: "Candidate NeighborB",
    acNo: 9,
    constituencyName: "Constituency 9",
    totalAssets: 222222,
  },
  // Directive 066 Specific Test Fixture Profiles:
  // Same-line block comment containing fabricated candidate profile
  /* { candidateName: "Candidate BlockCommentTrap", acNo: 10, constituencyName: "Constituency 10", totalAssets: 888888, totalLiabilities: 999999 } */
  {
    candidateName: "Candidate RealAfterBlockComment",
    acNo: 10,
    constituencyName: "Constituency 10",
    totalAssets: 300000,
    totalLiabilities: 100000,
  },
  {
    candidateName: "Candidate StringBraceTrap",
    acNo: 11,
    constituencyName: "Constituency 11",
    remarks: "{ candidateName: 'FabricatedInString', totalAssets: 7777777 }",
    totalAssets: 400000,
    totalLiabilities: 50000,
  },
  {
    candidateName: "Candidate MissingAcNo",
    constituencyName: "Constituency 12",
    totalAssets: 500000,
  },
  {
    acNo: 13,
    constituencyName: "Constituency 13",
    totalAssets: 600000,
  },
];

