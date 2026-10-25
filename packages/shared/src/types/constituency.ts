import type { FactProvenance } from '../dataProvenance';
import type { ConstituencyHierarchy } from './hierarchy';

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
  | 'JSP'
  | 'JDS'
  | 'JMM'
  | 'JKNC'
  | 'SHSUBT'
  | 'NCPSP'
  | 'NPP'
  | 'ZPM'
  | 'NDPP'
  | 'SKM'
  | 'TVK'
  | 'AGP'
  | 'BPF'
  | 'BJD'
  | 'SAD'
  | 'AJSU'
  | 'ADSL'
  | 'AIADMK'
  | 'AIFB'
  | 'AIMM'
  | 'AINRC'
  | 'AJU'
  | 'AMMK'
  | 'AP'
  | 'BAP'
  | 'CMP(J)'
  | 'CONS'
  | 'CPI(M)'
  | 'CPI(ML'
  | 'GFP'
  | 'GGP'
  | 'GNC'
  | 'HAMS'
  | 'HSPDP'
  | 'INL'
  | 'INLD'
  | 'IPFT'
  | 'ISF'
  | 'IUML'
  | 'JD(U)'
  | 'JKC'
  | 'JKNPP'
  | 'JKPC'
  | 'JKPDP'
  | 'KC'
  | 'KC(B)'
  | 'KC(M)'
  | 'KCJ'
  | 'KCM'
  | 'KPA'
  | 'LJD'
  | 'LJK'
  | 'LJPRV'
  | 'LJPV'
  | 'MG'
  | 'MNF'
  | 'MNM'
  | 'NISHAD'
  | 'NMK'
  | 'NPF'
  | 'NSC'
  | 'PDF'
  | 'PMK'
  | 'PPA'
  | 'RD'
  | 'RGP'
  | 'RLD'
  | 'RMPI'
  | 'RPIA'
  | 'RSP'
  | 'SBSP'
  | 'SDF'
  | 'TMP'
  | 'UDP'
  | 'UJP'
  | 'UKD'
  | 'VCK'
  | 'VIP'
  | 'VPP'
  | 'NDA'
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
  currentMLA: string | null;
  /** Source truth for fields carried by this DTO. Field-level provenance remains authoritative. */
  provenance?: Record<string, FactProvenance>;
}

export interface ConstituencyDetail extends ConstituencyBrief {
  demographics?: ConstituencyDemographics;
  elections: ElectionResult[];
  neighbours?: string[];
  centroid?: GeoCoordinate;
  /**
   * Full hierarchy breakdown (booths, panchayats, mandals, villages)
   * beneath this constituency. Populated on detail fetch when
   * hierarchy data is available.
   */
  hierarchy?: ConstituencyHierarchy;
}

export interface ConstituencyDemographics {
  population: number | null;
  literacyRate: number | null;
  urbanRural: { urban: number | null; rural: number | null };
  genderRatio: number | null;
  scPercentage: number | null;
  stPercentage: number | null;
  /** Provenance is per metric; missing metrics must remain null. */
  provenance?: Record<string, FactProvenance>;
}

export interface ElectionResult {
  year: number;
  electionType: 'GENERAL' | 'BYPOLL';
  winner: CandidateResult | null;
  runnerUp: CandidateResult | null;
  totalVoters: number | null;
  votesPolled: number | null;
  turnout: number | null;
  margin: number | null;
  candidates: CandidateResult[];
  /** Provenance by fact key; no status is inferred from numeric values. */
  provenance?: Record<string, FactProvenance>;
}

export interface CandidateResult {
  name: string | null;
  party: PartyCode | null;
  votes: number | null;
  voteShare: number | null;
  provenance?: Record<string, FactProvenance>;
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
