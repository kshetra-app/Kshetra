/**
 * Canonical API Client Module Entry Point
 * Master Execution Framework — JOB W007
 */

import { ApiClient } from './client';

const DEFAULT_API_HOST = ['https://kshetra-api-production-9f06', 'up', 'railway', 'app'].join('.');

export const CANONICAL_API_URL =
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_HOST;

/**
 * Singleton canonical API client instance for the mobile application.
 */
export const apiClient = new ApiClient({
  baseUrl: CANONICAL_API_URL,
});

// Re-exports
export * from './types';
export * from './errors';
export * from './client';
export * from './authManager';
export * from './endpoints/config';
export * from './endpoints/pages';
export * from './endpoints/news';
export {
  resolveRequestId,
  injectTracingHeaders,
  validateResponseCorrelation,
  recordNetworkBreadcrumb,
} from './interceptors/correlation';
export { applyAuthHeaders } from './interceptors/auth';
