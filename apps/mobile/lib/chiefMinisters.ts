/**
 * Chief Minister data for all Indian states and UTs.
 *
 * Used by ChiefMinisterBadge to display the CM's photo, name,
 * and designation alongside the active state on the Map and Explore screens.
 *
 * Photo resolution is handled by the existing CandidateAvatar component
 * (Wikipedia + candidate-photo-map.json fallback).
 */

export interface ChiefMinisterInfo {
  name: string;
  designation: string;
  party: string;
  stateCode: string;
}

/**
 * Maps state code → current Chief Minister info.
 * Names must match the candidate-photo-map keys for automatic photo resolution.
 */
export const CHIEF_MINISTERS: Record<string, ChiefMinisterInfo> = {
  TS: {
    name: 'Anumula Revanth Reddy',
    designation: 'Chief Minister of Telangana',
    party: 'INC',
    stateCode: 'TS',
  },
  AP: {
    name: 'N Chandrababu Naidu',
    designation: 'Chief Minister of Andhra Pradesh',
    party: 'TDP',
    stateCode: 'AP',
  },
  KA: {
    name: 'D. K. Shivakumar',
    designation: 'Chief Minister of Karnataka',
    party: 'INC',
    stateCode: 'KA',
  },
  MH: {
    name: 'Devendra Fadnavis',
    designation: 'Chief Minister of Maharashtra',
    party: 'BJP',
    stateCode: 'MH',
  },
  TN: {
    name: 'C. Joseph Vijay',
    designation: 'Chief Minister of Tamil Nadu',
    party: 'TVK',
    stateCode: 'TN',
  },
  KL: {
    name: 'V. D. Satheesan',
    designation: 'Chief Minister of Kerala',
    party: 'INC',
    stateCode: 'KL',
  },
  WB: {
    name: 'Suvendu Adhikari',
    designation: 'Chief Minister of West Bengal',
    party: 'BJP',
    stateCode: 'WB',
  },
  UP: {
    name: 'Yogi Adityanath',
    designation: 'Chief Minister of Uttar Pradesh',
    party: 'BJP',
    stateCode: 'UP',
  },
  RJ: {
    name: 'Bhajan Lal Sharma',
    designation: 'Chief Minister of Rajasthan',
    party: 'BJP',
    stateCode: 'RJ',
  },
  GJ: {
    name: 'Bhupendra Patel',
    designation: 'Chief Minister of Gujarat',
    party: 'BJP',
    stateCode: 'GJ',
  },
  DL: {
    name: 'Rekha Gupta',
    designation: 'Chief Minister of Delhi',
    party: 'BJP',
    stateCode: 'DL',
  },
  OD: {
    name: 'Mohan Charan Majhi',
    designation: 'Chief Minister of Odisha',
    party: 'BJP',
    stateCode: 'OD',
  },
  JH: {
    name: 'Hemant Soren',
    designation: 'Chief Minister of Jharkhand',
    party: 'JMM',
    stateCode: 'JH',
  },
  BR: {
    name: 'Nitish Kumar',
    designation: 'Chief Minister of Bihar',
    party: 'JDU',
    stateCode: 'BR',
  },
  PB: {
    name: 'Bhagwant Mann',
    designation: 'Chief Minister of Punjab',
    party: 'AAP',
    stateCode: 'PB',
  },
  HR: {
    name: 'Nayab Singh Saini',
    designation: 'Chief Minister of Haryana',
    party: 'BJP',
    stateCode: 'HR',
  },
  UK: {
    name: 'Pushkar Singh Dhami',
    designation: 'Chief Minister of Uttarakhand',
    party: 'BJP',
    stateCode: 'UK',
  },
  CG: {
    name: 'Vishnu Deo Sai',
    designation: 'Chief Minister of Chhattisgarh',
    party: 'BJP',
    stateCode: 'CG',
  },
  MP: {
    name: 'Mohan Yadav',
    designation: 'Chief Minister of Madhya Pradesh',
    party: 'BJP',
    stateCode: 'MP',
  },
  AS: {
    name: 'Himanta Biswa Sarma',
    designation: 'Chief Minister of Assam',
    party: 'BJP',
    stateCode: 'AS',
  },
  GA: {
    name: 'Pramod Sawant',
    designation: 'Chief Minister of Goa',
    party: 'BJP',
    stateCode: 'GA',
  },
  HP: {
    name: 'Sukhvinder Singh Sukhu',
    designation: 'Chief Minister of Himachal Pradesh',
    party: 'INC',
    stateCode: 'HP',
  },
  JK: {
    name: 'Omar Abdullah',
    designation: 'Chief Minister of Jammu & Kashmir',
    party: 'JKNC',
    stateCode: 'JK',
  },
  MN: {
    name: 'N. Biren Singh',
    designation: 'Chief Minister of Manipur',
    party: 'BJP',
    stateCode: 'MN',
  },
  ML: {
    name: 'Conrad Sangma',
    designation: 'Chief Minister of Meghalaya',
    party: 'NPP',
    stateCode: 'ML',
  },
  MZ: {
    name: 'Lalduhoma',
    designation: 'Chief Minister of Mizoram',
    party: 'ZPM',
    stateCode: 'MZ',
  },
  NL: {
    name: 'Neiphiu Rio',
    designation: 'Chief Minister of Nagaland',
    party: 'NDPP',
    stateCode: 'NL',
  },
  TR: {
    name: 'Manik Saha',
    designation: 'Chief Minister of Tripura',
    party: 'BJP',
    stateCode: 'TR',
  },
  SK: {
    name: 'Prem Singh Tamang',
    designation: 'Chief Minister of Sikkim',
    party: 'SKM',
    stateCode: 'SK',
  },
  AR: {
    name: 'Pema Khandu',
    designation: 'Chief Minister of Arunachal Pradesh',
    party: 'BJP',
    stateCode: 'AR',
  },
  PY: {
    name: 'N. Rangaswamy',
    designation: 'Chief Minister of Puducherry',
    party: 'AINRC',
    stateCode: 'PY',
  },
};

export interface PrimeMinisterInfo {
  name: string;
  designation: string;
  party: string;
  countryCode: string;
}

export const PRIME_MINISTER: PrimeMinisterInfo = {
  name: 'Narendra Modi',
  designation: 'Prime Minister of India',
  party: 'BJP',
  countryCode: 'IN',
};

/** Get CM info for a state code, or null if not found */
export function getChiefMinister(stateCode: string): ChiefMinisterInfo | null {
  return CHIEF_MINISTERS[stateCode] ?? null;
}

/** Get PM info for India */
export function getPrimeMinister(): PrimeMinisterInfo {
  return PRIME_MINISTER;
}
