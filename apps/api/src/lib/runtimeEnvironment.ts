import { isProductionLikeEnvironment } from '@kshetra/shared';

/**
 * Resolve the deployed runtime consistently with the shared app environment
 * contract. Any production-like marker wins so a conflicting development
 * setting cannot re-enable local identity shortcuts or mock data at runtime.
 */
export function isProductionLikeRuntime(): boolean {
  return [process.env.EXPO_PUBLIC_APP_ENV, process.env.APP_ENV, process.env.NODE_ENV]
    .some((candidate) => candidate !== undefined && isProductionLikeEnvironment(candidate));
}

/** A test flag must never override a staging or production deployment marker. */
export function isIsolatedTestRuntime(): boolean {
  return process.env.NODE_ENV === 'test' && !isProductionLikeRuntime();
}
