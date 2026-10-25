/**
 * Canonical API Envelopes & Response Contracts
 * Master Execution Framework — JOB W008
 */

export interface ApiSuccessEnvelope<T = unknown> {
  success: true;
  data: T;
  requestId: string;
  timestamp: string;
}

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export type DataTruthStatus = 'OFFICIAL' | 'DERIVED' | 'VERIFIED' | 'ESTIMATE' | 'SCENARIO' | 'INFERRED' | 'UNVERIFIED' | 'UNKNOWN';

export interface ApiErrorEnvelope {
  error: string;
  message: string;
  statusCode: number;
  code?: string;
  dataStatus?: DataTruthStatus;
  requestId: string;
  timestamp: string;
  details?: ApiErrorDetail[];
}

export type ApiResponseEnvelope<T = unknown> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;
