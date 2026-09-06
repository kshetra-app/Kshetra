/**
 * Goa Assembly Constituencies — 2022 General Election (40 seats)
 * Official ECI Constituency numbering 1-40 from TCPD Lok Dhaba.
 */

export interface GAConstituencySeed {
  acNo: number;
  name: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2022: string;
  winnerName2022: string;
  winnerVotes2022: number;
  runnerUp2022?: string;
  runnerUpName2022?: string;
  margin2022: number;
  turnout2022: number;
  electors2022: number;
  currentParty: string;
}

export const GA_CONSTITUENCIES: GAConstituencySeed[] = [
  { acNo: 1, name: 'Mandrem', district: 'North Goa', type: 'GEN', winner2022: 'MGP', winnerName2022: 'Jit Vinayak Arolkar', winnerVotes2022: 10387, margin2022: 715, turnout2022: 87.51, electors2022: 33873, currentParty: 'MGP' },
  { acNo: 2, name: 'Pernem', district: 'North Goa', type: 'SC', winner2022: 'BJP', winnerName2022: 'Pravin Prabhakar Arlekar', winnerVotes2022: 13063, margin2022: 3418, turnout2022: 85.48, electors2022: 34163, currentParty: 'BJP' },
  { acNo: 3, name: 'Bicholim', district: 'North Goa', type: 'GEN', winner2022: 'IND', winnerName2022: 'Dr. Chandrakant Shetye', winnerVotes2022: 9608, margin2022: 318, turnout2022: 89.01, electors2022: 29082, currentParty: 'IND' },
  { acNo: 4, name: 'Tivim', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Nilkanth Ramnath Halarnkar', winnerVotes2022: 9414, margin2022: 2051, turnout2022: 80.25, electors2022: 29818, currentParty: 'BJP' },
  { acNo: 5, name: 'Mapusa', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Joshua Peter De Souza', winnerVotes2022: 10195, margin2022: 1647, turnout2022: 77.43, electors2022: 29882, currentParty: 'BJP' },
  { acNo: 6, name: 'Siolim', district: 'North Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Delilah Michael Lobo', winnerVotes2022: 9699, margin2022: 1727, turnout2022: 81.98, electors2022: 30422, currentParty: 'INC' },
  { acNo: 7, name: 'Saligao', district: 'North Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Kedar Jayprakash Naik', winnerVotes2022: 10045, margin2022: 1899, turnout2022: 79.07, electors2022: 28247, currentParty: 'INC' },
  { acNo: 8, name: 'Calangute', district: 'North Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Michael Vincent Lobo', winnerVotes2022: 9285, margin2022: 4979, turnout2022: 78.91, electors2022: 26093, currentParty: 'INC' },
  { acNo: 9, name: 'Porvorim', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Rohan Khaunte', winnerVotes2022: 11714, margin2022: 7950, turnout2022: 76.49, electors2022: 27764, currentParty: 'BJP' },
  { acNo: 10, name: 'Aldona', district: 'North Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Carlos Alvares Ferreira', winnerVotes2022: 9320, margin2022: 1823, turnout2022: 75.64, electors2022: 29740, currentParty: 'INC' },
  { acNo: 11, name: 'Panaji', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Atanasio Monserrate', winnerVotes2022: 6787, margin2022: 716, turnout2022: 74.97, electors2022: 23234, currentParty: 'BJP' },
  { acNo: 12, name: 'Taleigao', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Jennifer Monserrate', winnerVotes2022: 10167, margin2022: 2041, turnout2022: 76.38, electors2022: 30682, currentParty: 'BJP' },
  { acNo: 13, name: 'St. Cruz', district: 'North Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Rodolfo Louis Fernandes', winnerVotes2022: 8841, margin2022: 2464, turnout2022: 75.57, electors2022: 30018, currentParty: 'INC' },
  { acNo: 14, name: 'St. Andre', district: 'North Goa', type: 'GEN', winner2022: 'RGP', winnerName2022: 'Viresh Mukesh Borkar', winnerVotes2022: 5395, margin2022: 76, turnout2022: 73.85, electors2022: 22043, currentParty: 'RGP' },
  { acNo: 15, name: 'Cumbarjua', district: 'North Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Rajesh Faldessai', winnerVotes2022: 6776, margin2022: 2827, turnout2022: 79.07, electors2022: 27254, currentParty: 'INC' },
  { acNo: 16, name: 'Maem', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Premendra Vishnu Shet', winnerVotes2022: 7874, margin2022: 3136, turnout2022: 85.87, electors2022: 29682, currentParty: 'BJP' },
  { acNo: 17, name: 'Sanquelim', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Dr. Pramod Sawant', winnerVotes2022: 12250, margin2022: 666, turnout2022: 89.63, electors2022: 28635, currentParty: 'BJP' },
  { acNo: 18, name: 'Poriem', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Deviya Vishwajit Rane', winnerVotes2022: 17816, margin2022: 13943, turnout2022: 86.18, electors2022: 33934, currentParty: 'BJP' },
  { acNo: 19, name: 'Valpoi', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Vishwajit Pratapsingh Rane', winnerVotes2022: 14462, margin2022: 8085, turnout2022: 82.86, electors2022: 32548, currentParty: 'BJP' },
  { acNo: 20, name: 'Priol', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Govind Shepu Gaude', winnerVotes2022: 11019, margin2022: 213, turnout2022: 88.11, electors2022: 31852, currentParty: 'BJP' },
  { acNo: 21, name: 'Ponda', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ravi Naik', winnerVotes2022: 7514, margin2022: 77, turnout2022: 78.38, electors2022: 32917, currentParty: 'BJP' },
  { acNo: 22, name: 'Siroda', district: 'North Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Subhash Shirodkar', winnerVotes2022: 8307, margin2022: 2174, turnout2022: 82.72, electors2022: 30263, currentParty: 'BJP' },
  { acNo: 23, name: 'Marcaim', district: 'North Goa', type: 'GEN', winner2022: 'MGP', winnerName2022: 'Ramkrishna Alias Sudin Dhavalikar', winnerVotes2022: 13963, margin2022: 9963, turnout2022: 81.27, electors2022: 29189, currentParty: 'MGP' },
  { acNo: 24, name: 'Mormugao', district: 'South Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Sankalp Amonkar', winnerVotes2022: 9067, margin2022: 1941, turnout2022: 81.28, electors2022: 20782, currentParty: 'INC' },
  { acNo: 25, name: 'Vasco-Da-Gama', district: 'South Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Krishna V. Salkar', winnerVotes2022: 13118, margin2022: 3657, turnout2022: 70.54, electors2022: 36158, currentParty: 'BJP' },
  { acNo: 26, name: 'Dabolim', district: 'South Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Mauvin Heliodoro Godinho', winnerVotes2022: 7594, margin2022: 1570, turnout2022: 74.89, electors2022: 25030, currentParty: 'BJP' },
  { acNo: 27, name: 'Cortalim', district: 'South Goa', type: 'GEN', winner2022: 'IND', winnerName2022: 'Antonio Vas', winnerVotes2022: 5522, margin2022: 1178, turnout2022: 76.6, electors2022: 31232, currentParty: 'IND' },
  { acNo: 28, name: 'Nuvem', district: 'South Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Aleixo Sequeira', winnerVotes2022: 8745, margin2022: 4397, turnout2022: 75.05, electors2022: 29061, currentParty: 'INC' },
  { acNo: 29, name: 'Curtorim', district: 'South Goa', type: 'GEN', winner2022: 'IND', winnerName2022: 'Aleixo Reginaldo Lourenco', winnerVotes2022: 8960, margin2022: 5055, turnout2022: 72.93, electors2022: 30622, currentParty: 'IND' },
  { acNo: 30, name: 'Fatorda', district: 'South Goa', type: 'GEN', winner2022: 'GFP', winnerName2022: 'Vijai Sardesai', winnerVotes2022: 11063, margin2022: 1527, turnout2022: 76.73, electors2022: 31473, currentParty: 'GFP' },
  { acNo: 31, name: 'Margao', district: 'South Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Digambar Kamat', winnerVotes2022: 13674, margin2022: 7794, turnout2022: 75.09, electors2022: 30141, currentParty: 'INC' },
  { acNo: 32, name: 'Benaulim', district: 'South Goa', type: 'GEN', winner2022: 'AAP', winnerName2022: 'Venzy Viegas', winnerVotes2022: 6411, margin2022: 1271, turnout2022: 71.26, electors2022: 29629, currentParty: 'AAP' },
  { acNo: 33, name: 'Navelim', district: 'South Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ulhas Tuenkar', winnerVotes2022: 5168, margin2022: 430, turnout2022: 72.8, electors2022: 29302, currentParty: 'BJP' },
  { acNo: 34, name: 'Cuncolim', district: 'South Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Alemao Yuri', winnerVotes2022: 9866, margin2022: 3234, turnout2022: 76.15, electors2022: 30338, currentParty: 'INC' },
  { acNo: 35, name: 'Velim', district: 'South Goa', type: 'GEN', winner2022: 'AAP', winnerName2022: 'Cruz Silva', winnerVotes2022: 5390, margin2022: 169, turnout2022: 72.42, electors2022: 32297, currentParty: 'AAP' },
  { acNo: 36, name: 'Quepem', district: 'South Goa', type: 'GEN', winner2022: 'INC', winnerName2022: 'Altone D\'Costa', winnerVotes2022: 14994, margin2022: 3601, turnout2022: 83.61, electors2022: 34153, currentParty: 'INC' },
  { acNo: 37, name: 'Curchorem', district: 'South Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Nilesh Cabral', winnerVotes2022: 9973, margin2022: 672, turnout2022: 80.29, electors2022: 28380, currentParty: 'BJP' },
  { acNo: 38, name: 'Sanvordem', district: 'South Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ganesh Gaonkar', winnerVotes2022: 11877, margin2022: 5190, turnout2022: 86.54, electors2022: 30656, currentParty: 'BJP' },
  { acNo: 39, name: 'Sanguem', district: 'South Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Subhash Uttam Phal Dessai', winnerVotes2022: 8724, margin2022: 1429, turnout2022: 86.19, electors2022: 27556, currentParty: 'BJP' },
  { acNo: 40, name: 'Canacona', district: 'South Goa', type: 'GEN', winner2022: 'BJP', winnerName2022: 'Ramesh Tawadkar', winnerVotes2022: 9063, margin2022: 3051, turnout2022: 82.11, electors2022: 35479, currentParty: 'BJP' },
];

export function getGAConstituency(acNo: number): GAConstituencySeed | undefined {
  return GA_CONSTITUENCIES.find((c) => c.acNo === acNo);
}
