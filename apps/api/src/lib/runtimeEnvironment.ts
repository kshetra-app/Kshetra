import { isProductionLikeEnvironment } from '@kshetra/shared';

/** Deployed runtimes fail closed; development and isolated tests remain local. */
export function isProductionLikeRuntime(): boolean {
  return [process.env.EXPO_PUBLIC_APP_ENV, process.env.APP_ENV, process.env.NODE_ENV]
    .some((candidate) => candidate !== undefined && isProductionLikeEnvironment(candidate));
}

export function isIsolatedTestRuntime(): boolean {
  return process.env.NODE_ENV === 'test' && !isProductionLikeRuntime();
}
