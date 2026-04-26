export type ConstituencyType = 'ASSEMBLY' | 'PARLIAMENTARY';

export type PartyCode =
  | 'BJP'
  | 'INC'
  | 'BRS'
  | 'TDP'
  | 'AIMIM'
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

export type ReservationStatus = 'GEN' | 'SC' | 'ST';

export interface ConstituencyBrief {
  id: string;
  name: string;
  acNo: number;
  stateCode: string;
  district: string;
  reservationStatus: ReservationStatus;
  currentParty: string;
  currentMLA: string;
}

export interface ConstituencyDetail extends ConstituencyBrief {
  demographics?: ConstituencyDemographics;
  elections: ElectionResult[];
  neighbours?: string[];
  centroid?: GeoCoordinate;
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
