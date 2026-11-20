import { apiClient } from './api';
import {
  OFFICE_TYPE_CONFIG,
  type DataStatus,
  type OfficeType,
  type Representative,
  type RepresentativeProfile,
} from '@kshetra/shared';

export interface GpNode {
  key: string;
  district: string;
  mandal: string | null;
  gramPanchayat: string;
  sarpanch: Representative | null;
  wards: Representative[];
}

export interface DistrictSummary {
  name: string;
  districtKey: string;
  gpCount: number;
  sarpanchCount: number;
  wardCount: number;
}

export interface MandalSummary {
  name: string;
  mandalKey: string;
  gpCount: number;
}

export interface LocalBodyCoverage {
  electionYear: number;
  total: number;
}

export function hasRepresentativeData(state: string) {
  return state === 'AP' || state === 'TS';
}

async function readDirectory<T>(view: string, query: Record<string, string>): Promise<T> {
  const response = await apiClient.get<{ data: T }>('/api/v1/local-bodies', {
    authPolicy: 'public',
    query: { ...query, view },
  });
  return response.data.data;
}

export const getLocalBodyCoverage = (state: string) =>
  readDirectory<LocalBodyCoverage>('coverage', { state });

export const getLocalBodyDistricts = (state: string) =>
  readDirectory<DistrictSummary[]>('districts', { state });

export const getLocalBodyMandals = (state: string, district: string) =>
  readDirectory<MandalSummary[]>('mandals', { state, district });

export const getLocalBodyGPs = (state: string, district: string, mandal: string) =>
  readDirectory<GpNode[]>('panchayats', { state, district, mandal });

export const getLocalBodyMptcs = (state: string, district: string, mandal: string) =>
  readDirectory<Representative[]>('mptc', { state, district, mandal });

export const getLocalBodyZptcs = (state: string, district: string) =>
  readDirectory<Representative[]>('zptc', { state, district });

export const getRepresentativeById = (id: string) =>
  readDirectory<Representative | null>('representative', { id });

export function getPendingProfile(
  officeType: OfficeType,
  jurisdictionName: string,
  stateCode: string,
  opts?: { district?: string; dataStatus?: DataStatus },
): RepresentativeProfile {
  return {
    id: `pending-${officeType}-${jurisdictionName}`,
    officeCategory: 'local_body',
    officeLabel: OFFICE_TYPE_CONFIG[officeType]?.label ?? officeType,
    officeType,
    name: '',
    partyOfficial: true,
    jurisdictionName,
    district: opts?.district,
    stateCode,
    isCurrent: false,
    dataStatus: opts?.dataStatus ?? 'data_pending',
  };
}
