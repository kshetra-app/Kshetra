/**
 * Canonical Geography Contracts & DTOs
 *
 * Covers 6-Tier Sub-Constituency Hierarchy and PostGIS Spatial Point-in-Polygon & PIN resolution.
 */
import type { ConstituencyBrief, ReservationStatus } from '../types/constituency';

export interface SubConstituencyHierarchyDTO {
  constituency: {
    id: string;
    internalId: string;
    acNo: number;
    name: string;
    stateCode: string;
    district: string;
    reservationStatus: ReservationStatus;
  };
  urbanLocalBodies: Array<{
    id: string;
    internalId: string;
    name: string;
    localName?: string;
    type: string;
    lgdCode: number | null;
    totalWards: number | null;
    wards: Array<{
      id: string;
      internalId: string;
      wardNo: number;
      name: string | null;
      reservation: string;
    }>;
  }>;
  gramPanchayats: Array<{
    id: string;
    internalId: string;
    name: string;
    localName?: string;
    mandalId: string;
    lgdCode: number | null;
    wards: Array<{
      id: string;
      internalId: string;
      wardNo: number;
      name: string | null;
      reservation: string;
    }>;
  }>;
  pollingBooths: Array<{
    id: string;
    internalId: string;
    boothNumber: number;
    boothName: string;
    pollingStationName: string | null;
    totalVoters: number | null;
    localBodyType: 'ulb' | 'gram_panchayat' | 'unassigned';
    panchayatId?: string | null;
    ulbWardId?: string | null;
    gpWardId?: string | null;
  }>;
}

export interface LocatePointRequest {
  lat: number;
  lng: number;
}

export interface LocatePointResponse {
  latitude: number;
  longitude: number;
  constituency: ConstituencyBrief | null;
  message: string;
  source: 'postgis_spatial' | 'canonical_database' | 'unavailable';
}

export interface PinCodeCandidate {
  constituency: ConstituencyBrief;
  /** Null when the source does not provide a defensible spatial share or probability. */
  overlapWeight: number | null;
  verificationStatus?:
    | 'AUTHORITATIVE_RELATIONSHIP_ESTABLISHED'
    | 'DOCUMENTED_MULTI_AC_AMBIGUITY'
    | 'PROVISIONAL_APPROXIMATION'
    | 'INSUFFICIENT_EVIDENCE'
    | 'CONFLICTING_EVIDENCE';
  localityNote?: string;
}

export interface LocatePinCodeResponse {
  pinCode: string;
  /** True only when the source establishes a verified, one-to-one linkage. */
  singleMatch: boolean;
  primaryConstituency: ConstituencyBrief | null;
  candidates: PinCodeCandidate[];
  message: string;
  verificationStatus?: PinCodeCandidate['verificationStatus'];
  source: 'curated_provisional_directory';
}
