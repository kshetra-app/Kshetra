/**
 * Goa Assembly Constituencies — 2022 General Election (40 seats)
 *
 * SOURCE: TCPD "Lok Dhaba" (Trivedi Centre for Political Data, Ashoka University),
 *         Goa_AE dataset — ECI-sourced constituency results, official AC
 *         numbering 1-40. Winner/runner-up parties+names, vote counts, margins,
 *         turnout, electors, district and reservation are the ECI 2022 results as
 *         compiled by TCPD. Curated names/local-script labels preserved where present.
 *         Rebuilt by scripts/rebuild-short-seed.mjs — do not hand-edit.
 *
 * PARTY TALLY 2022: BJP 20 | INC 11 | IND 3 | MGP 2 | AAP 2 | RGP 1 | GFP 1 = 40
 */

export interface GAConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in local script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2022: string;
  winnerName2022: string;
  winnerVotes2022: number;
  runnerUp2022: string;
  runnerUpName2022?: string;
  margin2022: number;
  turnout2022: number;
  electors2022: number;
  currentParty: string;
}

export const GA_CONSTITUENCIES: GAConstituencySeed[] = [
  { acNo: 1, name: 'Aldona', localName: 'हळदोणे', district: 'North Goa', type: 'GEN', winner2022: 'MGP', winnerName2022: 'Jit Vinayak Arolkar', winnerVotes2022: 10387, runnerUp2022: 'BJP', runnerUpName2022: 'Dayanand Raghunath Sopte', margin2022: 715, turnout2022: 87.51, electors2022: 33873, currentParty: 'MGP' },
  { acNo: 2, name: 'Benaulim', localName: 'बाणावली', district: 'North Goa', type: 'SC', winner2022: 'BJP', winnerName2022: 'Pravin Prabhakar Arlekar', winnerVotes2022: 13063, runnerUp2022: 'MGP', runnerUpName2022: 'Rajan Babuso Korgaonkar', margin2022: 3418, turnout2022: 85.48, electors2022: 34163, currentParty: 'BJP' },
  { acNo: 3, name: 'Bicholim', localName: 'डिचोली', district: 'North Goa', type: 'GEN', winner2022: 'IND', winnerName2022: 'Dr. Chandrakant Shetye', winnerVotes2022: 9608, runnerUp2022: 'MGP', runnerUpName2022: 'Naresh Rajaram Sawal', margin2022: 318, turnout2022: 89.01, electors2022: 29082, currentParty: 'IND' },
  { acNo: 4, name: 'Calangute', localName: 'कळंगूट', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Nilkanth Ramnath Halarnkar', winnerVotes2022: 9414, runnerUp2022: 'AITC', runnerUpName2022: 'Kavita Kandolkar', margin2022: 2051, turnout2022: 80.25, electors2022: 29818, currentParty: 'BJP' },
  { acNo: 5, name: 'Canacona', localName: 'काणकोण', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Joshua Peter De Souza', winnerVotes2022: 10195, runnerUp2022: 'INC', runnerUpName2022: 'Sudhir Rama Kandolkar', margin2022: 1647, turnout2022: 77.43, electors2022: 29882, currentParty: 'BJP' },
  { acNo: 6, name: 'Cortalim', localName: 'कुठ्ठाळी', district: 'North Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Delilah Michael Lobo', winnerVotes2022: 9699, runnerUp2022: 'BJP', runnerUpName2022: 'Dayanand Rayu Mandrekar', margin2022: 1727, turnout2022: 81.98, electors2022: 30422, currentParty: 'INC' },
  { acNo: 7, name: 'Cumbarjua', localName: 'कुंभारजुवे', district: 'North Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Kedar Jayprakash Naik', winnerVotes2022: 10045, runnerUp2022: 'BJP', runnerUpName2022: 'Jayesh Salgaonkar', margin2022: 1899, turnout2022: 79.07, electors2022: 28247, currentParty: 'INC' },
  { acNo: 8, name: 'Cuncolim', localName: 'कुंकळ्ळी', district: 'North Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Michael Vincent Lobo', winnerVotes2022: 9285, runnerUp2022: 'BJP', runnerUpName2022: 'Joseph Robert Sequeira', margin2022: 4979, turnout2022: 78.91, electors2022: 26093, currentParty: 'INC' },
  { acNo: 9, name: 'Dabolim', localName: 'दाबोळी', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rohan Khaunte', winnerVotes2022: 11714, runnerUp2022: 'AITC', runnerUpName2022: 'Sandeep Vazarkar', margin2022: 7950, turnout2022: 76.49, electors2022: 27764, currentParty: 'BJP' },
  { acNo: 10, name: 'Fatorda', localName: 'फातोर्डा', district: 'North Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Carlos Alvares Ferreira', winnerVotes2022: 9320, runnerUp2022: 'BJP', runnerUpName2022: 'Glenn John Vijay Ambrose E Souza Ticlo', margin2022: 1823, turnout2022: 75.64, electors2022: 29740, currentParty: 'INC' },
  { acNo: 11, name: 'Maem', localName: 'मये', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Atanasio Monserrate', winnerVotes2022: 6787, runnerUp2022: 'IND', runnerUpName2022: 'Utpal Manohar Parrikar', margin2022: 716, turnout2022: 74.97, electors2022: 23234, currentParty: 'BJP' },
  { acNo: 12, name: 'Mandrem', localName: 'मांद्रे', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Jennifer Monserrate', winnerVotes2022: 10167, runnerUp2022: 'INC', runnerUpName2022: 'Tony Alfredo Rodrigues', margin2022: 2041, turnout2022: 76.38, electors2022: 30682, currentParty: 'BJP' },
  { acNo: 13, name: 'Mapusa', localName: 'म्हापसा', district: 'North Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Rodolfo Louis Fernandes', winnerVotes2022: 8841, runnerUp2022: 'BJP', runnerUpName2022: 'Antonio Caetano Fernandes', margin2022: 2464, turnout2022: 75.57, electors2022: 30018, currentParty: 'INC' },
  { acNo: 14, name: 'Marcaim', localName: 'मडकई', district: 'North Goa', type: 'GEN', winner2022: 'RGP', winnerName2022: 'Viresh Mukesh Borkar', winnerVotes2022: 5395, runnerUp2022: 'BJP', runnerUpName2022: 'Francisco Silveira', margin2022: 76, turnout2022: 73.85, electors2022: 22043, currentParty: 'RGP' },
  { acNo: 15, name: 'Margao', localName: 'मडगाव', district: 'North Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Rajesh Faldessai', winnerVotes2022: 6776, runnerUp2022: 'BJP', runnerUpName2022: 'Janita Pandurang Madkaikar', margin2022: 2827, turnout2022: 79.07, electors2022: 27254, currentParty: 'INC' },
  { acNo: 16, name: 'Mormugao', localName: 'मुरगाव', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Premendra Vishnu Shet', winnerVotes2022: 7874, runnerUp2022: 'GFP', runnerUpName2022: 'Santosh Kumar Sawant', margin2022: 3136, turnout2022: 85.87, electors2022: 29682, currentParty: 'BJP' },
  { acNo: 17, name: 'Nuvem', localName: 'नुवे', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Dr. Pramod Sawant', winnerVotes2022: 12250, runnerUp2022: 'INC', runnerUpName2022: 'Dharmesh Saglani', margin2022: 666, turnout2022: 89.63, electors2022: 28635, currentParty: 'BJP' },
  { acNo: 18, name: 'Panaji', localName: 'पणजी', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Deviya Vishwajit Rane', winnerVotes2022: 17816, runnerUp2022: 'AAP', runnerUpName2022: 'Vishwajit Rane', margin2022: 13943, turnout2022: 86.18, electors2022: 33934, currentParty: 'BJP' },
  { acNo: 19, name: 'Pernem', localName: 'पेडणे', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Vishwajit Pratapsingh Rane', winnerVotes2022: 14462, runnerUp2022: 'RGP', runnerUpName2022: 'Tukaram Bharat Parab', margin2022: 8085, turnout2022: 82.86, electors2022: 32548, currentParty: 'BJP' },
  { acNo: 20, name: 'Ponda', localName: 'फोंडा', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Govind Shepu Gaude', winnerVotes2022: 11019, runnerUp2022: 'MGP', runnerUpName2022: 'Pandurang Alias Deepak Dhavalikar', margin2022: 213, turnout2022: 88.11, electors2022: 31852, currentParty: 'BJP' },
  { acNo: 21, name: 'Poriem', localName: 'पर्ये', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ravi Naik', winnerVotes2022: 7514, runnerUp2022: 'MGP', runnerUpName2022: 'Ketan Prabhu Bhatikar', margin2022: 77, turnout2022: 78.38, electors2022: 32917, currentParty: 'BJP' },
  { acNo: 22, name: 'Porvorim', localName: 'पर्वरी', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Subhash Shirodkar', winnerVotes2022: 8307, runnerUp2022: 'AAP', runnerUpName2022: 'Mahadev Naik', margin2022: 2174, turnout2022: 82.72, electors2022: 30263, currentParty: 'BJP' },
  { acNo: 23, name: 'Priol', localName: 'प्रियोळ', district: 'North Goa', type: 'GEN', winner2022: 'MGP', winnerName2022: 'Ramkrishna Alias Sudin Dhavalikar', winnerVotes2022: 13963, runnerUp2022: 'BJP', runnerUpName2022: 'Sudesh Bhingi', margin2022: 9963, turnout2022: 81.27, electors2022: 29189, currentParty: 'MGP' },
  { acNo: 24, name: 'Quepem', localName: 'केपे', district: 'South Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Sankalp Amonkar', winnerVotes2022: 9067, runnerUp2022: 'BJP', runnerUpName2022: 'Milind Sagun Naik', margin2022: 1941, turnout2022: 81.28, electors2022: 20782, currentParty: 'INC' },
  { acNo: 25, name: 'Sanguem', localName: 'सांगे', district: 'South Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Krishna V. Salkar', winnerVotes2022: 13118, runnerUp2022: 'INC', runnerUpName2022: 'Jose Luis Carlos Almeida', margin2022: 3657, turnout2022: 70.54, electors2022: 36158, currentParty: 'BJP' },
  { acNo: 26, name: 'Sanquelim', localName: 'साखळी', district: 'South Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Mauvin Heliodoro Godinho', winnerVotes2022: 7594, runnerUp2022: 'INC', runnerUpName2022: 'Captain Viriato Hipolito Mendonca Fernandes', margin2022: 1570, turnout2022: 74.89, electors2022: 25030, currentParty: 'BJP' },
  { acNo: 27, name: 'Sanvordem', localName: 'सावर्डे', district: 'South Goa', type: 'GEN', winner2022: 'IND', winnerName2022: 'Antonio Vas', winnerVotes2022: 5522, runnerUp2022: 'INC', runnerUpName2022: 'Olencio Simoes', margin2022: 1178, turnout2022: 76.6, electors2022: 31232, currentParty: 'IND' },
  { acNo: 28, name: 'Siolim', localName: 'शिवोली', district: 'South Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Aleixo Sequeira', winnerVotes2022: 8745, runnerUp2022: 'RGP', runnerUpName2022: 'Arvind D\'Costa', margin2022: 4397, turnout2022: 75.05, electors2022: 29061, currentParty: 'INC' },
  { acNo: 29, name: 'Siroda', localName: 'शिरोडा', district: 'South Goa', type: 'GEN', winner2022: 'IND', winnerName2022: 'Aleixo Reginaldo Lourenco', winnerVotes2022: 8960, runnerUp2022: 'INC', runnerUpName2022: 'Moreno Rebelo', margin2022: 5055, turnout2022: 72.93, electors2022: 30622, currentParty: 'IND' },
  { acNo: 30, name: 'St. Andre', localName: 'सेंट आंद्रे', district: 'South Goa', type: 'GEN', winner2022: 'GFP', winnerName2022: 'Vijai Sardesai', winnerVotes2022: 11063, runnerUp2022: 'BJP', runnerUpName2022: 'Damu G. Naik', margin2022: 1527, turnout2022: 76.73, electors2022: 31473, currentParty: 'GFP' },
  { acNo: 31, name: 'St. Cruz', localName: 'सांताक्रुझ', district: 'South Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Digambar Kamat', winnerVotes2022: 13674, runnerUp2022: 'BJP', runnerUpName2022: 'Ajgaonkar Manohar (Babu)', margin2022: 7794, turnout2022: 75.09, electors2022: 30141, currentParty: 'INC' },
  { acNo: 32, name: 'Taleigao', localName: 'ताळगाव', district: 'South Goa', type: 'GEN', winner2022: 'AAP', winnerName2022: 'Venzy Viegas', winnerVotes2022: 6411, runnerUp2022: 'AITC', runnerUpName2022: 'Churchill Alemao', margin2022: 1271, turnout2022: 71.26, electors2022: 29629, currentParty: 'AAP' },
  { acNo: 33, name: 'Valpoi', localName: 'वाळपई', district: 'South Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ulhas Tuenkar', winnerVotes2022: 5168, runnerUp2022: 'AITC', runnerUpName2022: 'Valanka Natasha Alemao', margin2022: 430, turnout2022: 72.8, electors2022: 29302, currentParty: 'BJP' },
  { acNo: 34, name: 'Velim', localName: 'वेलीम', district: 'South Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Alemao Yuri', winnerVotes2022: 9866, runnerUp2022: 'BJP', runnerUpName2022: 'Clafasio Dias', margin2022: 3234, turnout2022: 76.15, electors2022: 30338, currentParty: 'INC' },
  { acNo: 35, name: 'Velim', district: 'South Goa', type: 'GEN', winner2022: 'AAP', winnerName2022: 'Cruz Silva', winnerVotes2022: 5390, runnerUp2022: 'INC', runnerUpName2022: 'D\'Silva Savio', margin2022: 169, turnout2022: 72.42, electors2022: 32297, currentParty: 'AAP' },
  { acNo: 36, name: 'Quepem', district: 'South Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Altone D\'Costa', winnerVotes2022: 14994, runnerUp2022: 'BJP', runnerUpName2022: 'Chandrakant Kavlekar', margin2022: 3601, turnout2022: 83.61, electors2022: 34153, currentParty: 'INC' },
  { acNo: 37, name: 'Curchorem', district: 'South Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Nilesh Cabral', winnerVotes2022: 9973, runnerUp2022: 'INC', runnerUpName2022: 'Amit Patkar', margin2022: 672, turnout2022: 80.29, electors2022: 28380, currentParty: 'BJP' },
  { acNo: 38, name: 'Sanvordem', district: 'South Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ganesh Gaonkar', winnerVotes2022: 11877, runnerUp2022: 'IND', runnerUpName2022: 'Deepak Prabhu Pauskar', margin2022: 5190, turnout2022: 86.54, electors2022: 30656, currentParty: 'BJP' },
  { acNo: 39, name: 'Sanguem', district: 'South Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Subhash Uttam Phal Dessai', winnerVotes2022: 8724, runnerUp2022: 'IND', runnerUpName2022: 'Savitri Chandrakant Kavlekar', margin2022: 1429, turnout2022: 86.19, electors2022: 27556, currentParty: 'BJP' },
  { acNo: 40, name: 'Canacona', district: 'South Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ramesh Tawadkar', winnerVotes2022: 9063, runnerUp2022: 'IND', runnerUpName2022: 'Isidore Aleixinho Fernandes', margin2022: 3051, turnout2022: 82.11, electors2022: 35479, currentParty: 'BJP' },
];

export function getGAConstituency(acNo: number): GAConstituencySeed | undefined {
  return GA_CONSTITUENCIES.find((c) => c.acNo === acNo);
}
