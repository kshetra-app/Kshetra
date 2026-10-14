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
];
