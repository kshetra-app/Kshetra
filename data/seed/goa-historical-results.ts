/**
 * Goa — Previous Election Results (2017)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2017.
 *         Full per-constituency winner + party, official AC numbering 1-40.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface GAHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const GA_2017_RESULTS: GAHistoricalResult[] = [
  { acNo: 1, name: 'Mandrem', winner: 'Dayanand Raghunath Sopte', party: 'INC', year: 2017, votes: 16490, margin: 7119, runnerUp: 'Laxmikant Parsekar' },
  { acNo: 2, name: 'Pernem', winner: 'Ajgaonkar Manohar Trimbak', party: 'MAG', year: 2017, votes: 15745, margin: 6030, runnerUp: 'Rajendra Arlekar' },
  { acNo: 3, name: 'Bicholim', winner: 'Rajesh Patnekar', party: 'BJP', year: 2017, votes: 10654, margin: 666, runnerUp: 'Naresh Sawal' },
  { acNo: 4, name: 'Tivim', winner: 'Nilkanth Ramnath Halarnkar', party: 'INC', year: 2017, votes: 11099, margin: 795, runnerUp: 'Kiran Mohan Kandolkar' },
  { acNo: 5, name: 'Mapusa', winner: 'Francisco C. J. A. De Pinto E Souza', party: 'BJP', year: 2017, votes: 10957, margin: 6828, runnerUp: 'Vinod Fadke' },
  { acNo: 6, name: 'Siolim', winner: 'Vinoda Datarama Paliencar', party: 'GFP', year: 2017, votes: 10189, margin: 1441, runnerUp: 'Dayanand Rayu Mandrekar' },
  { acNo: 7, name: 'Saligao', winner: 'Jayesh Vidyadhar Salgaonkar', party: 'GFP', year: 2017, votes: 9735, margin: 2137, runnerUp: 'Dilip Parulekar' },
  { acNo: 8, name: 'Calangute', winner: 'Michael Vincent Lobo', party: 'BJP', year: 2017, votes: 11136, margin: 3825, runnerUp: 'Joseph Robert Sequeira' },
  { acNo: 9, name: 'Porvorim', winner: 'Rohan Khaunte', party: 'IND', year: 2017, votes: 11174, margin: 4213, runnerUp: 'Guruprasad R. Pawaskar' },
  { acNo: 10, name: 'Aldona', winner: 'Glenn Souza Ticlo', party: 'BJP', year: 2017, votes: 9405, margin: 4456, runnerUp: 'Amarnath Panjikar' },
  { acNo: 11, name: 'Panaji', winner: 'Sidharth Sripad Kuncalienker', party: 'BJP', year: 2017, votes: 7924, margin: 1069, runnerUp: 'Atanasio J. Monserrate' },
  { acNo: 12, name: 'Taleigao', winner: 'Jennifer Monserrate', party: 'INC', year: 2017, votes: 11534, margin: 2855, runnerUp: 'Dattaprasad Naik' },
  { acNo: 13, name: 'St. Cruz', winner: 'Antonio Caetano Fernandes', party: 'INC', year: 2017, votes: 6202, margin: 642, runnerUp: 'Hemant Dinanath Golatkar' },
  { acNo: 14, name: 'St. Andre', winner: 'Francisco Silveira', party: 'INC', year: 2017, votes: 8087, margin: 5070, runnerUp: 'Ramrao Surya Naik Wagh' },
  { acNo: 15, name: 'Cumbarjua', winner: 'Pandurang Madkaikar', party: 'BJP', year: 2017, votes: 12395, margin: 8434, runnerUp: 'Xavier Fialho' },
  { acNo: 16, name: 'Maem', winner: 'Pravin Zantye', party: 'BJP', year: 2017, votes: 12430, margin: 4974, runnerUp: 'Santosh Kumar Sawant' },
  { acNo: 17, name: 'Sanquelim', winner: 'Dr. Pramod Pandurang Sawant', party: 'BJP', year: 2017, votes: 10058, margin: 2131, runnerUp: 'Dharmesh Saglani' },
  { acNo: 18, name: 'Poriem', winner: 'Pratapsingh R Rane', party: 'INC', year: 2017, votes: 14977, margin: 4066, runnerUp: 'Vishwajit Krishnarao Rane' },
  { acNo: 19, name: 'Valpoi', winner: 'Vishwajit Pratapsingh Rane', party: 'INC', year: 2017, votes: 13493, margin: 5678, runnerUp: 'Satyavijay Subrai Naik' },
  { acNo: 20, name: 'Priol', winner: 'Govind Gaude', party: 'IND', year: 2017, votes: 15149, margin: 4686, runnerUp: 'Pandurang Alias Deepak Madhav Dhavalikar' },
  { acNo: 21, name: 'Ponda', winner: 'Ravi Sitaram Naik', party: 'INC', year: 2017, votes: 9502, margin: 3010, runnerUp: 'Sunil Desai' },
  { acNo: 22, name: 'Siroda', winner: 'Subhash Ankush Shirodkar', party: 'INC', year: 2017, votes: 11156, margin: 4870, runnerUp: 'Mahadev Narayan Naik' },
  { acNo: 23, name: 'Marcaim', winner: 'Ramkrishna Alias Sudin Dhavalikar', party: 'MAG', year: 2017, votes: 17093, margin: 13680, runnerUp: 'Pradeep Pundalik Shet' },
  { acNo: 24, name: 'Mormugao', winner: 'Milind Sagun Naik', party: 'BJP', year: 2017, votes: 8466, margin: 140, runnerUp: 'Sankalp Amonkar' },
  { acNo: 25, name: 'Vasco-Da-Gama', winner: 'Jose Luis Carlos Almeida', party: 'BJP', year: 2017, votes: 8765, margin: 1351, runnerUp: 'Krishna (Daji) V Salkar' },
  { acNo: 26, name: 'Dabolim', winner: 'Mauvin Heliodoro Godinho', party: 'BJP', year: 2017, votes: 7234, margin: 2494, runnerUp: 'Premanand Nanoskar' },
  { acNo: 27, name: 'Cortalim', winner: 'Alina Saldanha', party: 'BJP', year: 2017, votes: 5666, margin: 518, runnerUp: 'Antonio Vas' },
  { acNo: 28, name: 'Nuvem', winner: 'Wilfred D\'Sa', party: 'INC', year: 2017, votes: 9967, margin: 5660, runnerUp: 'Francisco Xavier Pacheco' },
  { acNo: 29, name: 'Curtorim', winner: 'Aleixo Reginaldo Lourenco', party: 'INC', year: 2017, votes: 12841, margin: 7697, runnerUp: 'Arthur D’Silva' },
  { acNo: 30, name: 'Fatorda', winner: 'Vijai Sardesai', party: 'GFP', year: 2017, votes: 10516, margin: 1334, runnerUp: 'Damu G. Naik' },
  { acNo: 31, name: 'Margao', winner: 'Digambar Vasant Kamat', party: 'INC', year: 2017, votes: 12105, margin: 4176, runnerUp: 'Sharmad Raiturkar' },
  { acNo: 32, name: 'Benaulim', winner: 'Churchill Alemao', party: 'NCP', year: 2017, votes: 9373, margin: 5191, runnerUp: 'Royla Clarina Fernandes' },
  { acNo: 33, name: 'Navelim', winner: 'Luizinho Faleiro', party: 'INC', year: 2017, votes: 8183, margin: 2478, runnerUp: 'Avertano Furtado' },
  { acNo: 34, name: 'Cuncolim', winner: 'Clafasio Dias', party: 'INC', year: 2017, votes: 6415, margin: 33, runnerUp: 'Joaquim Alemao' },
  { acNo: 35, name: 'Velim', winner: 'Filipe Nery Rodrigues', party: 'INC', year: 2017, votes: 10417, margin: 5253, runnerUp: 'Benjamin Silva' },
  { acNo: 36, name: 'Quepem', winner: 'Chandrakant (Babu) Kavlekar', party: 'INC', year: 2017, votes: 13525, margin: 2592, runnerUp: 'Prakash Shankar Velip' },
  { acNo: 37, name: 'Curchorem', winner: 'Nilesh Cabral', party: 'BJP', year: 2017, votes: 12830, margin: 9088, runnerUp: 'Shyam Gopinath Satardekar' },
  { acNo: 38, name: 'Sanvordem', winner: 'Deepak Prabhu Pauskar', party: 'MAG', year: 2017, votes: 14575, margin: 5221, runnerUp: 'Ganesh Chandru Gaonkar' },
  { acNo: 39, name: 'Sanguem', winner: 'Prasad S. Gaonkar', party: 'IND', year: 2017, votes: 7636, margin: 937, runnerUp: 'Subhash Phal Dessai' },
  { acNo: 40, name: 'Canacona', winner: 'Isidore Aleixinho Fernandes', party: 'INC', year: 2017, votes: 10853, margin: 2108, runnerUp: 'Vijay Pai Khot' },
];

export const ga2017Map = new Map(GA_2017_RESULTS.map((r) => [r.acNo, r]));

export function getGA2017Result(acNo: number): GAHistoricalResult | undefined {
  return ga2017Map.get(acNo);
}
