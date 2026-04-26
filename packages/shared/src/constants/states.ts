import type { StateInfo } from '../types/constituency';

export const STATES: Record<string, StateInfo> = {
  TS: {
    code: 'TS',
    name: 'Telangana',
    assemblySeats: 119,
    parliamentarySeats: 17,
    rulingParty: 'INC',
    centroid: { latitude: 17.8495, longitude: 79.1151 },
    zoom: 7,
  },
  AP: {
    code: 'AP',
    name: 'Andhra Pradesh',
    assemblySeats: 175,
    parliamentarySeats: 25,
    rulingParty: 'TDP',
    centroid: { latitude: 15.9129, longitude: 79.7400 },
    zoom: 7,
  },
  KA: {
    code: 'KA',
    name: 'Karnataka',
    assemblySeats: 224,
    parliamentarySeats: 28,
    rulingParty: 'INC',
    centroid: { latitude: 15.3173, longitude: 75.7139 },
    zoom: 6.5,
  },
  MH: {
    code: 'MH',
    name: 'Maharashtra',
    assemblySeats: 288,
    parliamentarySeats: 48,
    rulingParty: 'BJP',
    centroid: { latitude: 19.7515, longitude: 75.7139 },
    zoom: 6,
  },
};

/** States that have constituency data available */
export const SUPPORTED_STATES = ['TS'] as const;
export type SupportedStateCode = (typeof SUPPORTED_STATES)[number];

export const INDIA_CENTER = { latitude: 22.5937, longitude: 78.9629 };
export const INDIA_ZOOM = 4;
