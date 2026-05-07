/**
 * Kerala — Previous Election Results (2016)
 *
 * Source: Election Commission of India, Kerala 2016 General Election.
 * LDF won 91/140, UDF 47, BJP 1, IND 1.
 */

export interface KLHistoricalResult {
  acNo: number;
  winner: string;
  party: string;
}

const KL_2016_RESULTS: KLHistoricalResult[] = [
  { acNo: 1, winner: 'P.B. Abdul Razak', party: 'IUML' },
  { acNo: 2, winner: 'N.A. Nellikkunnu', party: 'IUML' },
  { acNo: 3, winner: 'K. Kunhiraman', party: 'CPIM' },
  { acNo: 4, winner: 'E. Chandrasekharan', party: 'CPI' },
  { acNo: 5, winner: 'K.K. Shailaja', party: 'CPIM' },
  { acNo: 6, winner: 'T.V. Rajesh', party: 'CPIM' },
  { acNo: 7, winner: 'K.V. Sumesh', party: 'CPIM' },
  { acNo: 8, winner: 'C. Krishnan', party: 'CPIM' },
  { acNo: 9, winner: 'P. Jayarajan', party: 'CPIM' },
  { acNo: 10, winner: 'A.N. Shamseer', party: 'CPIM' },
  { acNo: 11, winner: 'K.T. Jaleel', party: 'IUML' },
  { acNo: 12, winner: 'P. Nandakumar', party: 'CPIM' },
  { acNo: 13, winner: 'U.A. Latheef', party: 'IUML' },
  { acNo: 14, winner: 'P.K. Kunhalikutty', party: 'IUML' },
  { acNo: 15, winner: 'P. Ubaidulla', party: 'IUML' },
  { acNo: 16, winner: 'E.T. Tyson Master', party: 'CPIM' },
  { acNo: 17, winner: 'T.A. Ahammad Kabeer', party: 'CPIM' },
  { acNo: 18, winner: 'M.K. Muneer', party: 'IUML' },
  { acNo: 19, winner: 'V.T. Balram', party: 'INC' },
  { acNo: 20, winner: 'A. Prabhakaran', party: 'CPIM' },
  { acNo: 21, winner: 'M.V. Govindan', party: 'CPIM' },
  { acNo: 22, winner: 'P. Mammikutty', party: 'CPIM' },
  { acNo: 23, winner: 'K.P.A. Majeed', party: 'IUML' },
  { acNo: 24, winner: 'P. Nandakumar', party: 'CPIM' },
  { acNo: 25, winner: 'M.B. Rajesh', party: 'CPIM' },
];

const kl2016Map = new Map(KL_2016_RESULTS.map((r) => [r.acNo, r]));

export function getKL2016Result(acNo: number): KLHistoricalResult | undefined {
  return kl2016Map.get(acNo);
}
