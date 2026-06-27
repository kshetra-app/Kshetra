/**
 * useSeedDataWithLoading — React hook for loading seed data with loading/error states
 *
 * Wraps seedDataLoader to provide loading and error states for UI components.
 * Used in Phase 4 to show skeletons while seed data loads.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  loadAllSeedDataForState,
  isSeedDataLoadedForState,
  getMLAProfile,
  getDemographics,
  getHistoricalResults,
  getPoliticalTimeline,
  getElectionHistory,
} from './seedDataLoader';

export interface SeedDataLoadingState {
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

/**
 * Load all seed data for a state with loading/error states.
 * Returns loading and error flags for UI feedback.
 */
export function useSeedDataWithLoading(stateCode: string): SeedDataLoadingState {
  const [loading, setLoading] = useState(!isSeedDataLoadedForState(stateCode));
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (isSeedDataLoadedForState(stateCode)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await loadAllSeedDataForState(stateCode);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [stateCode]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    loading,
    error,
    retry: load,
  };
}

/**
 * Get MLA profile with fallback for loading state.
 * Returns null if data not yet loaded.
 */
export function useMLAProfile(stateCode: string, acNo: number) {
  const { loading } = useSeedDataWithLoading(stateCode);
  
  if (loading) return null;
  return getMLAProfile(stateCode, acNo);
}

/**
 * Get demographics with fallback for loading state.
 * Returns null if data not yet loaded.
 */
export function useDemographics(stateCode: string, acNo: number) {
  const { loading } = useSeedDataWithLoading(stateCode);
  
  if (loading) return null;
  return getDemographics(stateCode, acNo);
}

/**
 * Get historical results with fallback for loading state.
 * Returns empty array if data not yet loaded.
 */
export function useHistoricalResults(stateCode: string, acNo: number) {
  const { loading } = useSeedDataWithLoading(stateCode);
  
  if (loading) return [];
  return getHistoricalResults(stateCode, acNo);
}

/**
 * Get political timeline with fallback for loading state.
 * Returns empty array if data not yet loaded.
 */
export function usePoliticalTimeline(stateCode: string, acNo?: number) {
  const { loading } = useSeedDataWithLoading(stateCode);
  
  if (loading) return [];
  return getPoliticalTimeline(stateCode, acNo);
}

/**
 * Get election history with fallback for loading state.
 * Returns empty array if data not yet loaded.
 */
export function useElectionHistory(stateCode: string) {
  const { loading } = useSeedDataWithLoading(stateCode);
  
  if (loading) return [];
  return getElectionHistory(stateCode);
}
