/**
 * Tamil Nadu — Previous Election Results (2016)
 *
 * Source: Election Commission of India, Tamil Nadu 2016 General Election.
 * Simplified: only winner name and party for each AC.
 * AIADMK won 134/234, DMK 89, INC 8, IUML 1, CPI 1, PMK 1.
 */

export interface TNHistoricalResult {
  acNo: number;
  winner: string;
  party: string;
}

const TN_2016_RESULTS: TNHistoricalResult[] = [
  { acNo: 1, winner: 'B. Valarmathi', party: 'AIADMK' },
  { acNo: 2, winner: 'K. Palani', party: 'AIADMK' },
  { acNo: 3, winner: 'K.T. Rajenthra Bhalaji', party: 'AIADMK' },
  { acNo: 4, winner: 'Kadambur C. Raju', party: 'AIADMK' },
  { acNo: 5, winner: 'N. Ramasamy', party: 'AIADMK' },
  { acNo: 6, winner: 'K.A. Sengottaiyan', party: 'AIADMK' },
  { acNo: 7, winner: 'S.P. Velumani', party: 'AIADMK' },
  { acNo: 8, winner: 'C.Ve. Shanmugam', party: 'AIADMK' },
  { acNo: 9, winner: 'M. Appavu', party: 'DMK' },
  { acNo: 10, winner: 'P. Thangamani', party: 'AIADMK' },
  { acNo: 11, winner: 'R.B. Udayakumar', party: 'AIADMK' },
  { acNo: 12, winner: 'M.R. Vijayabhaskar', party: 'AIADMK' },
  { acNo: 13, winner: 'M.K. Stalin', party: 'DMK' },
  { acNo: 14, winner: 'J. Anbazhagan', party: 'DMK' },
  { acNo: 15, winner: 'M. Subramanian', party: 'DMK' },
  { acNo: 16, winner: 'N. Jayaraman', party: 'AIADMK' },
  { acNo: 17, winner: 'P.T.R. Palanivel Thiagarajan', party: 'DMK' },
  { acNo: 18, winner: 'D. Jayakumar', party: 'AIADMK' },
  { acNo: 19, winner: 'J. Jayalalithaa', party: 'AIADMK' },
  { acNo: 20, winner: 'Durai Murugan', party: 'DMK' },
  { acNo: 21, winner: 'P.K. Sekar Babu', party: 'DMK' },
  { acNo: 22, winner: 'I. Periyasamy', party: 'DMK' },
  { acNo: 23, winner: 'K. Ponmudi', party: 'DMK' },
  { acNo: 24, winner: 'S. Regupathy', party: 'DMK' },
  { acNo: 25, winner: 'Ma. Subramanian', party: 'DMK' },
];

const tn2016Map = new Map(TN_2016_RESULTS.map((r) => [r.acNo, r]));

export function getTN2016Result(acNo: number): TNHistoricalResult | undefined {
  return tn2016Map.get(acNo);
}
