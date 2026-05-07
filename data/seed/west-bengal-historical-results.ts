/**
 * West Bengal — Previous Election Results (2016)
 *
 * Source: Election Commission of India, West Bengal 2016 General Election.
 * AITC won 211/294, Left Front 32, INC 44, BJP 3, Others 4.
 */

export interface WBHistoricalResult {
  acNo: number;
  winner: string;
  party: string;
}

const WB_2016_RESULTS: WBHistoricalResult[] = [
  { acNo: 1, winner: 'Paresh Chandra Adhikary', party: 'AITC' },
  { acNo: 2, winner: 'Rabindranath Ghosh', party: 'CPIM' },
  { acNo: 3, winner: 'Niamat Sheikh', party: 'AITC' },
  { acNo: 4, winner: 'Udayan Guha', party: 'AITC' },
  { acNo: 5, winner: 'Mihir Goswami', party: 'AITC' },
  { acNo: 6, winner: 'Gouri Sankar Ghosh', party: 'AITC' },
  { acNo: 7, winner: 'Manoj Tigga', party: 'BJP' },
  { acNo: 8, winner: 'Dipak Kumar Barman', party: 'INC' },
  { acNo: 9, winner: 'Amal Acharya', party: 'AITC' },
  { acNo: 10, winner: 'Gokul Chandra Bhattacharya', party: 'AITC' },
  { acNo: 11, winner: 'Alexander Haque', party: 'AITC' },
  { acNo: 12, winner: 'Ratan Bauri', party: 'AITC' },
  { acNo: 13, winner: 'Hamidur Rahaman', party: 'AITC' },
  { acNo: 14, winner: 'Dipali Biswas', party: 'AITC' },
  { acNo: 15, winner: 'Joyprakash Majumdar', party: 'INC' },
  { acNo: 16, winner: 'Nirmal Maji', party: 'AITC' },
  { acNo: 17, winner: 'Prabhakar Giri', party: 'CPIM' },
  { acNo: 18, winner: 'Braja Kishor Goswami', party: 'AITC' },
  { acNo: 19, winner: 'Firhad Hakim', party: 'AITC' },
  { acNo: 20, winner: 'Subrata Mukherjee', party: 'AITC' },
  { acNo: 21, winner: 'Aroop Biswas', party: 'AITC' },
  { acNo: 22, winner: 'Madan Mitra', party: 'AITC' },
  { acNo: 23, winner: 'Sashi Panja', party: 'AITC' },
  { acNo: 24, winner: 'Partha Chatterjee', party: 'AITC' },
  { acNo: 25, winner: 'Sudip Bandyopadhyay', party: 'AITC' },
];

const wb2016Map = new Map(WB_2016_RESULTS.map((r) => [r.acNo, r]));

export function getWB2016Result(acNo: number): WBHistoricalResult | undefined {
  return wb2016Map.get(acNo);
}
