/**
 * Uttar Pradesh — Previous Election Results (2017)
 *
 * Source: Election Commission of India, Uttar Pradesh 2017 General Election.
 * BJP won 312/403, SP 47, BSP 19, INC 7, Others 18.
 */

export interface UPHistoricalResult {
  acNo: number;
  winner: string;
  party: string;
}

const UP_2017_RESULTS: UPHistoricalResult[] = [
  { acNo: 1, winner: 'Dara Singh Chauhan', party: 'BJP' },
  { acNo: 2, winner: 'Dharam Singh Saini', party: 'BJP' },
  { acNo: 3, winner: 'Rajeev Gumber', party: 'BJP' },
  { acNo: 4, winner: 'Masood Akhtar', party: 'BSP' },
  { acNo: 5, winner: 'Suresh Kumar Rana', party: 'BJP' },
  { acNo: 6, winner: 'Sangeet Som', party: 'BJP' },
  { acNo: 7, winner: 'Laxmi Narayan Chaudhary', party: 'BJP' },
  { acNo: 8, winner: 'Raghav Sharma', party: 'BJP' },
  { acNo: 9, winner: 'Prashant Sen', party: 'BJP' },
  { acNo: 10, winner: 'Mriganka Singh', party: 'BJP' },
  { acNo: 11, winner: 'Kapil Dev Agarwal', party: 'BJP' },
  { acNo: 12, winner: 'Atul Garg', party: 'BJP' },
  { acNo: 13, winner: 'Sunil Sharma', party: 'BJP' },
  { acNo: 14, winner: 'Pankaj Singh', party: 'BJP' },
  { acNo: 15, winner: 'Nand Kishore Gurjar', party: 'BJP' },
  { acNo: 16, winner: 'Dalveer Singh', party: 'BJP' },
  { acNo: 17, winner: 'Ajit Pal Tyagi', party: 'BJP' },
  { acNo: 18, winner: 'Rajkumar Sahyogi', party: 'BJP' },
  { acNo: 19, winner: 'Satya Dev Pachauri', party: 'BJP' },
  { acNo: 20, winner: 'Alka Rai', party: 'BJP' },
  { acNo: 21, winner: 'Ravindra Kushwaha', party: 'BJP' },
  { acNo: 22, winner: 'Avtar Singh Bhadana', party: 'BJP' },
  { acNo: 23, winner: 'Kunwar Sarvesh Kumar', party: 'BJP' },
  { acNo: 24, winner: 'Satyapal Singh', party: 'BJP' },
  { acNo: 25, winner: 'Lakhan Singh', party: 'BJP' },
];

const up2017Map = new Map(UP_2017_RESULTS.map((r) => [r.acNo, r]));

export function getUP2017Result(acNo: number): UPHistoricalResult | undefined {
  return up2017Map.get(acNo);
}
