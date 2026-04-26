export type ConstituencyType = 'ASSEMBLY' | 'PARLIAMENTARY';

export type PartyCode =
  | 'BJP'
  | 'INC'
  | 'BRS'
  | 'TDP'
  | 'YSRCP'
  | 'AAP'
  | 'DMK'
  | 'AITC'
  | 'CPI'
  | 'CPIM'
  | 'NCP'
  | 'SHS'
  | 'JDU'
  | 'RJD'
  | 'BSP'
  | 'SP'
  | 'NOTA'
  | 'IND'
  | 'OTH';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface ConstituencyBrief {
  id: string;
  name: string;
  stateCode: string;
  type: ConstituencyType;
  number: number;
  currentParty: PartyCode;
  currentRepresentative: string;
  totalVoters: number;
  lastMargin: number;
  lastTurnout: number;
}

export interface ConstituencyDetail extends ConstituencyBrief {
  district: string;
  reservationStatus: 'GENERAL' | 'SC' | 'ST';
  demographics: ConstituencyDemographics;
  elections: ElectionResult[];
  neighbours: string[];
  centroid: GeoCoordinate;
}

export interface ConstituencyDemographics {
  population: number;
  literacyRate: number;
  urbanRural: { urban: number; rural: number };
  genderRatio: number;
  scPercentage: number;
  stPercentage: number;
}

export interface ElectionResult {
  year: number;
  electionType: 'GENERAL' | 'BYPOLL';
  winner: CandidateResult;
  runnerUp: CandidateResult;
  totalVoters: number;
  votesPolled: number;
  turnout: number;
  margin: number;
  candidates: CandidateResult[];
}

export interface CandidateResult {
  name: string;
  party: PartyCode;
  votes: number;
  voteShare: number;
}

export interface StateInfo {
  code: string;
  name: string;
  assemblySeats: number;
  parliamentarySeats: number;
  rulingParty: PartyCode;
  centroid: GeoCoordinate;
  zoom: number;
}
