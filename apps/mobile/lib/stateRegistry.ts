/**
 * State Data Registry
 *
 * Central registry mapping state codes to their constituency data and GeoJSON.
 * Add new states here as they become available.
 */
import { STATES } from '@kshetra/shared';
import type { StateInfo, ConstituencyBrief } from '@kshetra/shared';
import {
  TELANGANA_CONSTITUENCIES,
  type ConstituencySeed,
} from '@/lib/data';
import { getConstituenciesForState, hasFullData as checkFullData } from './stateDataAdapter';

export interface StateData {
  info: StateInfo;
  /** Raw seed data (Telangana only — other states use adapter) */
  constituencies: ConstituencySeed[];
  hasGeoJSON: boolean;
  /** Whether this state has full data or just stubs */
  hasFullData: boolean;
  /** Total assembly seats for the state */
  totalSeats: number;
  /** Currently loaded constituency count */
  loadedCount: number;
}

const registry: Record<string, StateData> = {
  TS: {
    info: STATES.TS,
    constituencies: TELANGANA_CONSTITUENCIES,
    hasGeoJSON: true,
    hasFullData: true,
    totalSeats: 119,
    loadedCount: TELANGANA_CONSTITUENCIES.length,
  },
  AP: {
    info: STATES.AP,
    constituencies: [], // Use stateDataAdapter for AP
    hasGeoJSON: true,
    hasFullData: true,
    totalSeats: 175,
    loadedCount: 175,
  },
  KA: {
    info: STATES.KA,
    constituencies: [], // Use stateDataAdapter for KA
    hasGeoJSON: true,
    hasFullData: true,
    totalSeats: 224,
    loadedCount: 224,
  },
  MH: {
    info: STATES.MH,
    constituencies: [], // Use stateDataAdapter for MH
    hasGeoJSON: true,
    hasFullData: true,
    totalSeats: 288,
    loadedCount: 288,
  },
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
