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
} from './data';
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
  TN: {
    info: STATES.TN,
    constituencies: [], // Use stateDataAdapter for TN
    hasGeoJSON: false,
    hasFullData: true,
    totalSeats: 234,
    loadedCount: 234,
  },
  KL: {
    info: STATES.KL,
    constituencies: [], // Use stateDataAdapter for KL
    hasGeoJSON: false,
    hasFullData: true,
    totalSeats: 140,
    loadedCount: 140,
  },
  WB: {
    info: STATES.WB,
    constituencies: [], // Use stateDataAdapter for WB
    hasGeoJSON: false,
    hasFullData: true,
    totalSeats: 294,
    loadedCount: 293,
  },
  UP: {
    info: STATES.UP,
    constituencies: [], // Use stateDataAdapter for UP
    hasGeoJSON: false,
    hasFullData: true,
    totalSeats: 403,
    loadedCount: 401,
  },
  RJ: { info: STATES.RJ, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 200, loadedCount: 200 },
  GJ: { info: STATES.GJ, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 182, loadedCount: 182 },
  DL: { info: STATES.DL, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 70, loadedCount: 70 },
  OD: { info: STATES.OD, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 147, loadedCount: 147 },
  JH: { info: STATES.JH, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 81, loadedCount: 81 },
  BR: { info: STATES.BR, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 243, loadedCount: 243 },
  PB: { info: STATES.PB, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 117, loadedCount: 117 },
  HR: { info: STATES.HR, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 90, loadedCount: 90 },
  UK: { info: STATES.UK, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 70, loadedCount: 70 },
  CG: { info: STATES.CG, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 90, loadedCount: 90 },
  MP: { info: STATES.MP, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 230, loadedCount: 230 },
  AS: { info: STATES.AS, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 126, loadedCount: 126 },
  GA: { info: STATES.GA, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 40, loadedCount: 40 },
  HP: { info: STATES.HP, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 68, loadedCount: 68 },
  JK: { info: STATES.JK, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 90, loadedCount: 90 },
  MN: { info: STATES.MN, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 60, loadedCount: 60 },
  ML: { info: STATES.ML, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 60, loadedCount: 60 },
  MZ: { info: STATES.MZ, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 40, loadedCount: 40 },
  NL: { info: STATES.NL, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 60, loadedCount: 60 },
  TR: { info: STATES.TR, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 60, loadedCount: 60 },
  SK: { info: STATES.SK, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 32, loadedCount: 32 },
  AR: { info: STATES.AR, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 60, loadedCount: 60 },
  PY: { info: STATES.PY, constituencies: [], hasGeoJSON: true, hasFullData: true, totalSeats: 30, loadedCount: 30 },
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
