/**
 * Puducherry — Previous Election Results (2016)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2016.
 *         Full per-constituency winner + party, official AC numbering 1-30.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface PYHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const PY_2016_RESULTS: PYHistoricalResult[] = [
  { acNo: 1, name: 'Mannadipet', winner: 'T.P.R. Selvame', party: 'AINRC', year: 2016, votes: 7679, margin: 419, runnerUp: 'A. Krishnan' },
  { acNo: 2, name: 'Thirubhuvanai', winner: 'B. Kobiga', party: 'AINRC', year: 2016, votes: 12143, margin: 1432, runnerUp: 'P. Angalane' },
  { acNo: 3, name: 'Oussudu', winner: 'E. Theeppainthan', party: 'INC', year: 2016, votes: 8675, margin: 2330, runnerUp: 'Sai J Saravanan Kumar' },
  { acNo: 4, name: 'Mangalam', winner: 'S.V. Sugumaran', party: 'AINRC', year: 2016, votes: 13955, margin: 5563, runnerUp: 'S. Kumaravel' },
  { acNo: 5, name: 'Villianur', winner: 'A. Namassivayam', party: 'INC', year: 2016, votes: 18009, margin: 8281, runnerUp: 'Jayakumar' },
  { acNo: 6, name: 'Ozhukarai', winner: 'Mnr. Balan', party: 'INC', year: 2016, votes: 14703, margin: 7107, runnerUp: 'N.G. Pannirselvam' },
  { acNo: 7, name: 'Kadirgamam', winner: 'N.S.J. Jayabal @ Ayyanar', party: 'AINRC', year: 2016, votes: 11690, margin: 3802, runnerUp: 'S. Ramesh' },
  { acNo: 8, name: 'Indira Nagar', winner: 'N. Rangasamy', party: 'AINRC', year: 2016, votes: 15463, margin: 3404, runnerUp: 'V. Aroumougam A.K.D.' },
  { acNo: 9, name: 'Thattanchavady', winner: 'Ashok Anand', party: 'AINRC', year: 2016, votes: 12754, margin: 7458, runnerUp: 'K. Sethu @ Sethuselvam' },
  { acNo: 10, name: 'Kamaraj Nagar', winner: 'Ve. Vaithilingam', party: 'INC', year: 2016, votes: 11618, margin: 5106, runnerUp: 'P. Ganesan' },
  { acNo: 11, name: 'Lawspet', winner: 'V.P. Sivakolundhu', party: 'INC', year: 2016, votes: 12144, margin: 6449, runnerUp: 'M. Vaithianathan' },
  { acNo: 12, name: 'Kalapet', winner: 'M.O.H.F. Shahjahan', party: 'INC', year: 2016, votes: 9839, margin: 634, runnerUp: 'P.M.L. Kalyanasundaram' },
  { acNo: 13, name: 'Muthialpet', winner: 'Vaiyapuri Manikandan', party: 'AIADMK', year: 2016, votes: 9257, margin: 2164, runnerUp: 'J. Pregash Kumar' },
  { acNo: 14, name: 'Raj Bhavan', winner: 'K. Lakshminarayanan', party: 'INC', year: 2016, votes: 9445, margin: 2225, runnerUp: 'P. Kannan' },
  { acNo: 15, name: 'Oupalam', winner: 'A. Anbalagan', party: 'AIADMK', year: 2016, votes: 9411, margin: 908, runnerUp: 'Annibal Kennedy' },
  { acNo: 16, name: 'Orleampeth', winner: 'R. Siva', party: 'DMK', year: 2016, votes: 11110, margin: 2980, runnerUp: 'G. Nehru @ Kuppusamy' },
  { acNo: 17, name: 'Nellithope', winner: 'A. Johnkumar', party: 'INC', year: 2016, votes: 18506, margin: 12141, runnerUp: 'Omsakthi Sekar' },
  { acNo: 18, name: 'Mudaliarpet', winner: 'A. Baskar', party: 'AIADMK', year: 2016, votes: 14321, margin: 5387, runnerUp: 'V. Balan' },
  { acNo: 19, name: 'Ariankuppam', winner: 'T. Djeamourthy', party: 'INC', year: 2016, votes: 14029, margin: 6571, runnerUp: 'Dr. M.A.S.Subramanian' },
  { acNo: 20, name: 'Manavely', winner: 'R.K.R. Anantharaman', party: 'INC', year: 2016, votes: 9326, margin: 2715, runnerUp: 'G. Suresh' },
  { acNo: 21, name: 'Embalam', winner: 'Lakshmikandhan, U.', party: 'AINRC', year: 2016, votes: 7745, margin: 6552, runnerUp: 'Govindharasu, K.' },
  { acNo: 22, name: 'Nettapakkam', winner: 'Vizeaveny, V.', party: 'INC', year: 2016, votes: 10577, margin: 1468, runnerUp: 'Rajavelu, P.' },
  { acNo: 23, name: 'Bahour', winner: 'Danavelou, N.', party: 'INC', year: 2016, votes: 11278, margin: 2807, runnerUp: 'Thiagarajan, T.' },
  { acNo: 24, name: 'Nedungadu', winner: 'Chandirapriyanga', party: 'AINRC', year: 2016, votes: 8789, margin: 1094, runnerUp: 'A. Marimottou' },
  { acNo: 25, name: 'Thirunallar', winner: 'R. Kamalakkannan', party: 'INC', year: 2016, votes: 13138, margin: 2875, runnerUp: 'P. R. Siva @ Sivasakthi' },
  { acNo: 26, name: 'Karaikal North', winner: 'P.R.N. Thirumurugan', party: 'AINRC', year: 2016, votes: 13139, margin: 3298, runnerUp: 'M.V.Omalingam' },
  { acNo: 27, name: 'Karaikal South', winner: 'K.A.U. Asana', party: 'AIADMK', year: 2016, votes: 11104, margin: 20, runnerUp: 'A.M.H. Nazeem' },
  { acNo: 28, name: 'Neravy T.R. Pattinam', winner: 'A.Geetha', party: 'DMK', year: 2016, votes: 14993, margin: 6936, runnerUp: 'Vmc. Sivakumar' },
  { acNo: 29, name: 'Mahe', winner: 'Dr. V.Ramachandran', party: 'IND', year: 2016, votes: 10797, margin: 2139, runnerUp: 'E. Valsaraj' },
  { acNo: 30, name: 'Yanam', winner: 'Malladi Krishna Rao', party: 'INC', year: 2016, votes: 20801, margin: 8754, runnerUp: 'Tirikoty Bairava Swamy' },
];

export const py2016Map = new Map(PY_2016_RESULTS.map((r) => [r.acNo, r]));

export function getPY2016Result(acNo: number): PYHistoricalResult | undefined {
  return py2016Map.get(acNo);
}
