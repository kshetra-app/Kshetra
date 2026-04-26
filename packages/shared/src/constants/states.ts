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
};

export const INDIA_CENTER = { latitude: 22.5937, longitude: 78.9629 };
export const INDIA_ZOOM = 4;
