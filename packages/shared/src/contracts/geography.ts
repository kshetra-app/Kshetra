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
    totalVoters: number;
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
  source: 'postgis_spatial' | 'canonical_database';
}

export interface PinCodeCandidate {
  constituency: ConstituencyBrief;
  overlapWeight: number; // 0.0 - 1.0 (relative weight / probability of being in this AC)
  localityNote?: string;
}

export interface LocatePinCodeResponse {
  pinCode: string;
  singleMatch: boolean;
  primaryConstituency: ConstituencyBrief | null;
  candidates: PinCodeCandidate[];
  message: string;
  source: 'authoritative_pincode_directory';
}
