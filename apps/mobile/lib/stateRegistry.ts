/**
 * State Data Registry
 *
 * Central registry mapping state codes to their constituency data and GeoJSON.
 * Add new states here as they become available.
 */
import { STATES } from '@kshetra/shared';
import type { StateInfo } from '@kshetra/shared';
import {
  TELANGANA_CONSTITUENCIES,
  type ConstituencySeed,
} from '../../../data/seed/telangana-constituencies';

export interface StateData {
  info: StateInfo;
  constituencies: ConstituencySeed[];
  hasGeoJSON: boolean;
}

const registry: Record<string, StateData> = {
  TS: {
    info: STATES.TS,
    constituencies: TELANGANA_CONSTITUENCIES,
    hasGeoJSON: true,
  },
  // AP, KA, MH — add here when seed data is available
};

/** Get state data by code. Returns null if not yet supported. */
export function getStateData(stateCode: string): StateData | null {
  return registry[stateCode] ?? null;
}

/** Get all state codes that have full data (constituencies + GeoJSON). */
export function getSupportedStateCodes(): string[] {
  return Object.keys(registry);
}

/** Get all state codes (including those without data yet). */
export function getAllStateCodes(): string[] {
  return Object.keys(STATES);
}

/** Check if a state has constituency data loaded. */
export function isStateSupported(stateCode: string): boolean {
  return stateCode in registry;
}
