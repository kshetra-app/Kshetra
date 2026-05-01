/**
 * Tamil Nadu Assembly Constituencies — Full Data (234 seats)
 *
 * ── SOURCE ──────────────────────────────────────────────────────────────────
 *  Election Commission of India, Tamil Nadu 2021 General Election results.
 *  Data sourced from ECI via MyNeta/ADR and cross-verified.
 *
 * ── PARTY TALLY ────────────────────────────────────────────────────────────
 *  DMK: 133 | AIADMK: 66 | INC: 18 | PMK: 5 | VCK: 4 | BJP: 4 | CPI: 2 | CPIM: 2 | Total: 234
 */

export interface TNConstituencySeed {
  acNo: number;
  name: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2021: string;
  winnerName2021: string;
  winnerVotes2021: number;
  runnerUp2021: string;
  margin2021: number;
  currentParty: string;
}

export const TN_CONSTITUENCIES: TNConstituencySeed[] = [
  // ── Thiruvallur District ──
  { acNo: 1, name: 'Gummidipoondi', district: 'Thiruvallur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'GOVINDARAJAN T.J', winnerVotes2021: 126452, runnerUp2021: 'PMK', margin2021: 50938, currentParty: 'DMK' },
  { acNo: 2, name: 'Ponneri', district: 'Thiruvallur', type: 'SC', winner2021: 'INC', winnerName2021: 'DURAI. CHANDRASEKAR', winnerVotes2021: 94528, runnerUp2021: 'AIADMK', margin2021: 9689, currentParty: 'INC' },
  { acNo: 3, name: 'Tiruttani', district: 'Thiruvallur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'S.Chandran', winnerVotes2021: 120314, runnerUp2021: 'AIADMK', margin2021: 29253, currentParty: 'DMK' },
  { acNo: 4, name: 'Thiruvallur', district: 'Thiruvallur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'RAAJENDRAN, V.G.', winnerVotes2021: 107709, runnerUp2021: 'AIADMK', margin2021: 22701, currentParty: 'DMK' },
  { acNo: 5, name: 'Poonamallee', district: 'Thiruvallur', type: 'SC', winner2021: 'DMK', winnerName2021: 'Krishnaswamy A', winnerVotes2021: 149578, runnerUp2021: 'PMK', margin2021: 94110, currentParty: 'DMK' },
  { acNo: 6, name: 'Avadi', district: 'Thiruvallur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'Nasar S M', winnerVotes2021: 150287, runnerUp2021: 'AIADMK', margin2021: 55275, currentParty: 'DMK' },
  { acNo: 7, name: 'Maduravoyal', district: 'Thiruvallur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'GANAPATHY.K', winnerVotes2021: 121298, runnerUp2021: 'AIADMK', margin2021: 31721, currentParty: 'DMK' },
  { acNo: 8, name: 'Ambattur', district: 'Thiruvallur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'JOSEPH SAMUEL', winnerVotes2021: 114554, runnerUp2021: 'AIADMK', margin2021: 42146, currentParty: 'DMK' },
  { acNo: 9, name: 'Madavaram', district: 'Thiruvallur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'SUDHARSANAM. S', winnerVotes2021: 151485, runnerUp2021: 'AIADMK', margin2021: 57071, currentParty: 'DMK' },
  { acNo: 10, name: 'Thiruvottiyur', district: 'Thiruvallur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'K.P.SHANKAR', winnerVotes2021: 88185, runnerUp2021: 'AIADMK', margin2021: 37661, currentParty: 'DMK' },
  // ── Chennai District ──
  { acNo: 11, name: 'Dr.Radhakrishnan Nagar', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'EBENEZER. J.J. (@)  JOHN EBENEZER.J', winnerVotes2021: 95763, runnerUp2021: 'AIADMK', margin2021: 42479, currentParty: 'DMK' },
  { acNo: 12, name: 'Perambur', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'SHEKAR. R.D', winnerVotes2021: 105267, runnerUp2021: 'AIADMK', margin2021: 54976, currentParty: 'DMK' },
  { acNo: 13, name: 'Kolathur', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'M.K. STALIN', winnerVotes2021: 105522, runnerUp2021: 'AIADMK', margin2021: 70384, currentParty: 'DMK' },
  { acNo: 14, name: 'Villivakkam', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'A . Vetriazhagan', winnerVotes2021: 76127, runnerUp2021: 'AIADMK', margin2021: 37237, currentParty: 'DMK' },
  { acNo: 15, name: 'Thiru-Vi-Ka-Nagar', district: 'Chennai', type: 'SC', winner2021: 'DMK', winnerName2021: 'SIVAKUMAR.P', winnerVotes2021: 81727, runnerUp2021: 'AIADMK', margin2021: 55013, currentParty: 'DMK' },
  { acNo: 16, name: 'Egmore', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'I.PARANTHAMEN', winnerVotes2021: 68832, runnerUp2021: 'AIADMK', margin2021: 38768, currentParty: 'DMK' },
  { acNo: 17, name: 'Royapuram', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'MURTHY.R.IDREAM', winnerVotes2021: 64424, runnerUp2021: 'AIADMK', margin2021: 27779, currentParty: 'DMK' },
  { acNo: 18, name: 'Harbour', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'SEKARBABU. P.K', winnerVotes2021: 59317, runnerUp2021: 'BJP', margin2021: 27274, currentParty: 'DMK' },
  { acNo: 19, name: 'Chepauk-Thiruvallikeni', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'UDHAYANIDHI STALIN', winnerVotes2021: 93285, runnerUp2021: 'PMK', margin2021: 69355, currentParty: 'DMK' },
  { acNo: 20, name: 'Thousand Lights', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'EZHILAN N', winnerVotes2021: 71867, runnerUp2021: 'BJP', margin2021: 32462, currentParty: 'DMK' },
  { acNo: 21, name: 'Anna Nagar', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'M.K. Mohan', winnerVotes2021: 80054, runnerUp2021: 'AIADMK', margin2021: 27445, currentParty: 'DMK' },
  { acNo: 22, name: 'Virugampakkam', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'AMV.PRABHAKARA RAJA', winnerVotes2021: 74351, runnerUp2021: 'AIADMK', margin2021: 18367, currentParty: 'DMK' },
  { acNo: 23, name: 'Saidapet', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'SUBRAMANIAN. MA', winnerVotes2021: 80194, runnerUp2021: 'AIADMK', margin2021: 29408, currentParty: 'DMK' },
  { acNo: 24, name: 'Thiyagarayanagar', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'KARUNANITHI J', winnerVotes2021: 56035, runnerUp2021: 'AIADMK', margin2021: 137, currentParty: 'DMK' },
  { acNo: 25, name: 'Mylapore', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'VELU.DHA', winnerVotes2021: 68392, runnerUp2021: 'AIADMK', margin2021: 12633, currentParty: 'DMK' },
  { acNo: 26, name: 'Velachery', district: 'Chennai', type: 'GEN', winner2021: 'INC', winnerName2021: 'JMH.AASSAN MAULAANA', winnerVotes2021: 68493, runnerUp2021: 'AIADMK', margin2021: 4352, currentParty: 'INC' },
  { acNo: 27, name: 'Shozhinganallur', district: 'Chennai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'S.ARAVINDRAMESH', winnerVotes2021: 171558, runnerUp2021: 'AIADMK', margin2021: 35405, currentParty: 'DMK' },
  // ── Kancheepuram District ──
  { acNo: 28, name: 'Alandur', district: 'Kancheepuram', type: 'GEN', winner2021: 'DMK', winnerName2021: 'T.M.Anbarasan', winnerVotes2021: 116785, runnerUp2021: 'AIADMK', margin2021: 40571, currentParty: 'DMK' },
  { acNo: 29, name: 'Sriperumbudur', district: 'Kancheepuram', type: 'SC', winner2021: 'INC', winnerName2021: 'SELVAPERUNTHAGAI', winnerVotes2021: 115353, runnerUp2021: 'AIADMK', margin2021: 10879, currentParty: 'INC' },
  // ── Chengalpattu District ──
  { acNo: 30, name: 'Pallavaram', district: 'Chengalpattu', type: 'GEN', winner2021: 'DMK', winnerName2021: 'KARUNANITHI', winnerVotes2021: 126427, runnerUp2021: 'AIADMK', margin2021: 37781, currentParty: 'DMK' },
  { acNo: 31, name: 'Tambaram', district: 'Chengalpattu', type: 'GEN', winner2021: 'DMK', winnerName2021: 'Raja.S.R', winnerVotes2021: 116840, runnerUp2021: 'AIADMK', margin2021: 36824, currentParty: 'DMK' },
  { acNo: 32, name: 'Chengalpattu', district: 'Chengalpattu', type: 'GEN', winner2021: 'DMK', winnerName2021: 'VARALAKSHMI.M', winnerVotes2021: 130573, runnerUp2021: 'AIADMK', margin2021: 26665, currentParty: 'DMK' },
  { acNo: 33, name: 'Thiruporur', district: 'Chengalpattu', type: 'GEN', winner2021: 'VCK', winnerName2021: 'S.S.Balaji', winnerVotes2021: 93954, runnerUp2021: 'PMK', margin2021: 1947, currentParty: 'VCK' },
  { acNo: 34, name: 'Cheyyur', district: 'Chengalpattu', type: 'SC', winner2021: 'VCK', winnerName2021: 'Babu M', winnerVotes2021: 82750, runnerUp2021: 'AIADMK', margin2021: 4042, currentParty: 'VCK' },
  { acNo: 35, name: 'Madurantakam', district: 'Chengalpattu', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'Maragatham. K', winnerVotes2021: 86646, runnerUp2021: 'DMK', margin2021: 3570, currentParty: 'AIADMK' },
  // ── Kancheepuram District ──
  { acNo: 36, name: 'Uthiramerur', district: 'Kancheepuram', type: 'GEN', winner2021: 'DMK', winnerName2021: 'SUNDAR K', winnerVotes2021: 93427, runnerUp2021: 'AIADMK', margin2021: 1622, currentParty: 'DMK' },
  { acNo: 37, name: 'Kancheepuram', district: 'Kancheepuram', type: 'GEN', winner2021: 'DMK', winnerName2021: 'C.V.M.P. Ezhailzrasan', winnerVotes2021: 102712, runnerUp2021: 'PMK', margin2021: 11595, currentParty: 'DMK' },
  // ── Ranipet District ──
  { acNo: 38, name: 'Arakkonam', district: 'Ranipet', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'S.RAVI', winnerVotes2021: 85399, runnerUp2021: 'VCK', margin2021: 27169, currentParty: 'AIADMK' },
  { acNo: 39, name: 'Sholinghur', district: 'Ranipet', type: 'GEN', winner2021: 'INC', winnerName2021: 'A.M.MUNIRATHINAM', winnerVotes2021: 110228, runnerUp2021: 'PMK', margin2021: 26698, currentParty: 'INC' },
  // ── Vellore District ──
  { acNo: 40, name: 'Katpadi', district: 'Vellore', type: 'GEN', winner2021: 'DMK', winnerName2021: 'DURAIMURUGAN', winnerVotes2021: 85140, runnerUp2021: 'AIADMK', margin2021: 746, currentParty: 'DMK' },
  // ── Ranipet District ──
  { acNo: 41, name: 'Ranipet', district: 'Ranipet', type: 'GEN', winner2021: 'DMK', winnerName2021: 'R.GANDHI', winnerVotes2021: 103291, runnerUp2021: 'AIADMK', margin2021: 16498, currentParty: 'DMK' },
  { acNo: 42, name: 'Arcot', district: 'Ranipet', type: 'GEN', winner2021: 'DMK', winnerName2021: 'J.L.Eswarappan', winnerVotes2021: 103885, runnerUp2021: 'PMK', margin2021: 19958, currentParty: 'DMK' },
  // ── Vellore District ──
  { acNo: 43, name: 'Vellore', district: 'Vellore', type: 'GEN', winner2021: 'DMK', winnerName2021: 'Karthikeyan .P', winnerVotes2021: 84299, runnerUp2021: 'AIADMK', margin2021: 9181, currentParty: 'DMK' },
  { acNo: 44, name: 'Anaikattu', district: 'Vellore', type: 'GEN', winner2021: 'DMK', winnerName2021: 'A.P.Nandakumar', winnerVotes2021: 95159, runnerUp2021: 'AIADMK', margin2021: 6360, currentParty: 'DMK' },
  { acNo: 45, name: 'Kilvaithinankuppam', district: 'Vellore', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'M.JAGAN MOORTHY', winnerVotes2021: 84579, runnerUp2021: 'DMK', margin2021: 10582, currentParty: 'AIADMK' },
  { acNo: 46, name: 'Gudiyattam', district: 'Vellore', type: 'SC', winner2021: 'DMK', winnerName2021: 'Amulu.V', winnerVotes2021: 100412, runnerUp2021: 'AIADMK', margin2021: 6901, currentParty: 'DMK' },
  // ── Tirupathur District ──
  { acNo: 47, name: 'Vaniyambadi', district: 'Tirupathur', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'G.SENDHIL KUMAR', winnerVotes2021: 88018, runnerUp2021: 'IUML', margin2021: 4904, currentParty: 'AIADMK' },
  { acNo: 48, name: 'Ambur', district: 'Tirupathur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'VILWANATHAN.A.C', winnerVotes2021: 90476, runnerUp2021: 'AIADMK', margin2021: 20232, currentParty: 'DMK' },
  { acNo: 49, name: 'Jolarpet', district: 'Tirupathur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'DEVARAJI.K.', winnerVotes2021: 89490, runnerUp2021: 'AIADMK', margin2021: 1091, currentParty: 'DMK' },
  { acNo: 50, name: 'Tirupattur', district: 'Tirupathur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'A. NALLATHAMBI', winnerVotes2021: 96522, runnerUp2021: 'PMK', margin2021: 28240, currentParty: 'DMK' },
  // ── Krishnagiri District ──
  { acNo: 51, name: 'Uthangarai', district: 'Krishnagiri', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'T.M.TAMILSELVAM', winnerVotes2021: 99675, runnerUp2021: 'INC', margin2021: 28387, currentParty: 'AIADMK' },
  { acNo: 52, name: 'Bargur', district: 'Krishnagiri', type: 'GEN', winner2021: 'DMK', winnerName2021: 'MATHIAZHAGAN D', winnerVotes2021: 97256, runnerUp2021: 'AIADMK', margin2021: 12614, currentParty: 'DMK' },
  { acNo: 53, name: 'Krishnagiri', district: 'Krishnagiri', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'Ashokkumar.K', winnerVotes2021: 96050, runnerUp2021: 'DMK', margin2021: 794, currentParty: 'AIADMK' },
  { acNo: 54, name: 'Veppanahalli', district: 'Krishnagiri', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'K.P.Munusamy', winnerVotes2021: 94104, runnerUp2021: 'DMK', margin2021: 3054, currentParty: 'AIADMK' },
  { acNo: 55, name: 'Hosur', district: 'Krishnagiri', type: 'GEN', winner2021: 'DMK', winnerName2021: 'PRAKAASH Y', winnerVotes2021: 118231, runnerUp2021: 'AIADMK', margin2021: 12367, currentParty: 'DMK' },
  { acNo: 56, name: 'Thalli', district: 'Krishnagiri', type: 'GEN', winner2021: 'CPI', winnerName2021: 'RAMACHANDRAN.T', winnerVotes2021: 120641, runnerUp2021: 'BJP', margin2021: 56226, currentParty: 'CPI' },
  // ── Dharmapuri District ──
  { acNo: 57, name: 'Palacode', district: 'Dharmapuri', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'ANBALAGAN.K.P.', winnerVotes2021: 110070, runnerUp2021: 'DMK', margin2021: 28100, currentParty: 'AIADMK' },
  { acNo: 58, name: 'Pennagaram', district: 'Dharmapuri', type: 'GEN', winner2021: 'PMK', winnerName2021: 'MANI. G.K', winnerVotes2021: 106123, runnerUp2021: 'DMK', margin2021: 21186, currentParty: 'PMK' },
  { acNo: 59, name: 'Dharmapuri', district: 'Dharmapuri', type: 'GEN', winner2021: 'PMK', winnerName2021: 'VENKATESHWARAN.S.P.', winnerVotes2021: 105630, runnerUp2021: 'DMK', margin2021: 26860, currentParty: 'PMK' },
  { acNo: 60, name: 'Pappireddipatti', district: 'Dharmapuri', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'GOVINDASAMY.A', winnerVotes2021: 114507, runnerUp2021: 'DMK', margin2021: 36943, currentParty: 'AIADMK' },
  { acNo: 61, name: 'Harur', district: 'Dharmapuri', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'SAMPATHKUMAR.V', winnerVotes2021: 99061, runnerUp2021: 'CPIM', margin2021: 30362, currentParty: 'AIADMK' },
  // ── Tiruvannamalai District ──
  { acNo: 62, name: 'Chengam', district: 'Tiruvannamalai', type: 'SC', winner2021: 'DMK', winnerName2021: 'GIRI.M.P', winnerVotes2021: 108081, runnerUp2021: 'AIADMK', margin2021: 11570, currentParty: 'DMK' },
  { acNo: 63, name: 'Tiruvannamalai', district: 'Tiruvannamalai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'E V VELU', winnerVotes2021: 137876, runnerUp2021: 'BJP', margin2021: 94673, currentParty: 'DMK' },
  { acNo: 64, name: 'Kilpennathur', district: 'Tiruvannamalai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'K.Pitchandi', winnerVotes2021: 104675, runnerUp2021: 'PMK', margin2021: 26787, currentParty: 'DMK' },
  { acNo: 65, name: 'Kalasapakkam', district: 'Tiruvannamalai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'Saravanan.P.S.T', winnerVotes2021: 94134, runnerUp2021: 'AIADMK', margin2021: 9222, currentParty: 'DMK' },
  { acNo: 66, name: 'Polur', district: 'Tiruvannamalai', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'Agri KRISHNAMURTHY. S S', winnerVotes2021: 97732, runnerUp2021: 'DMK', margin2021: 9725, currentParty: 'AIADMK' },
  { acNo: 67, name: 'Arani', district: 'Tiruvannamalai', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'S.RAMACHANDRAN', winnerVotes2021: 102961, runnerUp2021: 'DMK', margin2021: 3128, currentParty: 'AIADMK' },
  { acNo: 68, name: 'Cheyyar', district: 'Tiruvannamalai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'JOTHI. O', winnerVotes2021: 102460, runnerUp2021: 'AIADMK', margin2021: 12271, currentParty: 'DMK' },
  { acNo: 69, name: 'Vandavasi', district: 'Tiruvannamalai', type: 'SC', winner2021: 'DMK', winnerName2021: 'Ambethkumar S', winnerVotes2021: 102064, runnerUp2021: 'PMK', margin2021: 35953, currentParty: 'DMK' },
  // ── Villuppuram District ──
  { acNo: 70, name: 'Gingee', district: 'Villuppuram', type: 'GEN', winner2021: 'DMK', winnerName2021: 'MASTHAN K S', winnerVotes2021: 109625, runnerUp2021: 'PMK', margin2021: 35803, currentParty: 'DMK' },
  { acNo: 71, name: 'Mailam', district: 'Villuppuram', type: 'GEN', winner2021: 'PMK', winnerName2021: 'SIVAKUMAR C', winnerVotes2021: 81044, runnerUp2021: 'DMK', margin2021: 2230, currentParty: 'PMK' },
  { acNo: 72, name: 'Tindivanam', district: 'Villuppuram', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'ARJUNAN P', winnerVotes2021: 87152, runnerUp2021: 'DMK', margin2021: 9753, currentParty: 'AIADMK' },
  { acNo: 73, name: 'Vanur', district: 'Villuppuram', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'CHAKRAPANI M', winnerVotes2021: 92219, runnerUp2021: 'VCK', margin2021: 21727, currentParty: 'AIADMK' },
  { acNo: 74, name: 'Villupuram', district: 'Villuppuram', type: 'GEN', winner2021: 'DMK', winnerName2021: 'LAKSHMANAN R', winnerVotes2021: 102271, runnerUp2021: 'AIADMK', margin2021: 14868, currentParty: 'DMK' },
  { acNo: 75, name: 'Vikravandi', district: 'Villuppuram', type: 'GEN', winner2021: 'DMK', winnerName2021: 'PUGAZHENTHI N', winnerVotes2021: 93730, runnerUp2021: 'AIADMK', margin2021: 9573, currentParty: 'DMK' },
  { acNo: 76, name: 'Tirukkoyilur', district: 'Villuppuram', type: 'GEN', winner2021: 'DMK', winnerName2021: 'K.PONMUDY', winnerVotes2021: 110980, runnerUp2021: 'BJP', margin2021: 59680, currentParty: 'DMK' },
  // ── Kallakurichi District ──
  { acNo: 77, name: 'Ulundurpettai', district: 'Kallakurichi', type: 'GEN', winner2021: 'DMK', winnerName2021: 'MANIKANNAN A J', winnerVotes2021: 115451, runnerUp2021: 'AIADMK', margin2021: 5256, currentParty: 'DMK' },
  { acNo: 78, name: 'Rishivandiyam', district: 'Kallakurichi', type: 'GEN', winner2021: 'DMK', winnerName2021: 'KARTHIKEYAN K', winnerVotes2021: 113912, runnerUp2021: 'AIADMK', margin2021: 41728, currentParty: 'DMK' },
  { acNo: 79, name: 'Sankarapuram', district: 'Kallakurichi', type: 'GEN', winner2021: 'DMK', winnerName2021: 'UDHAYASURIYAN T', winnerVotes2021: 121186, runnerUp2021: 'PMK', margin2021: 45963, currentParty: 'DMK' },
  { acNo: 80, name: 'Kallakurichi', district: 'Kallakurichi', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'Senthilkumar.M', winnerVotes2021: 110643, runnerUp2021: 'INC', margin2021: 25891, currentParty: 'AIADMK' },
  // ── Salem District ──
  { acNo: 81, name: 'Gangavalli', district: 'Salem', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'NALLATHAMBI,A.', winnerVotes2021: 89568, runnerUp2021: 'DMK', margin2021: 7361, currentParty: 'AIADMK' },
  { acNo: 82, name: 'Attur', district: 'Salem', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'JAYASANKARAN, A.P.', winnerVotes2021: 95308, runnerUp2021: 'DMK', margin2021: 8257, currentParty: 'AIADMK' },
  { acNo: 83, name: 'Yercaud', district: 'Salem', type: 'ST', winner2021: 'AIADMK', winnerName2021: 'G. Chitra', winnerVotes2021: 121561, runnerUp2021: 'DMK', margin2021: 25955, currentParty: 'AIADMK' },
  { acNo: 84, name: 'Omalur', district: 'Salem', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'R.MANI', winnerVotes2021: 142488, runnerUp2021: 'INC', margin2021: 55294, currentParty: 'AIADMK' },
  { acNo: 85, name: 'Mettur', district: 'Salem', type: 'GEN', winner2021: 'PMK', winnerName2021: 'SADHASIVAM.S', winnerVotes2021: 97055, runnerUp2021: 'DMK', margin2021: 656, currentParty: 'PMK' },
  { acNo: 86, name: 'Edappadi', district: 'Salem', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'EDAPPADI PALANISWAMI. K', winnerVotes2021: 163154, runnerUp2021: 'DMK', margin2021: 93802, currentParty: 'AIADMK' },
  { acNo: 87, name: 'Sankari', district: 'Salem', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'SUNDARARAJAN, S.', winnerVotes2021: 115472, runnerUp2021: 'DMK', margin2021: 20045, currentParty: 'AIADMK' },
  { acNo: 88, name: 'Salem (West)', district: 'Salem', type: 'GEN', winner2021: 'PMK', winnerName2021: 'ARUL. R', winnerVotes2021: 105483, runnerUp2021: 'DMK', margin2021: 21499, currentParty: 'PMK' },
  { acNo: 89, name: 'Salem (North)', district: 'Salem', type: 'GEN', winner2021: 'DMK', winnerName2021: 'R. RAJENDRAN', winnerVotes2021: 93432, runnerUp2021: 'AIADMK', margin2021: 7588, currentParty: 'DMK' },
  { acNo: 90, name: 'Salem (South)', district: 'Salem', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'E.BALASUBRAMANIAN', winnerVotes2021: 97506, runnerUp2021: 'DMK', margin2021: 22609, currentParty: 'AIADMK' },
  { acNo: 91, name: 'Veerapandi', district: 'Salem', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'RAJAMUTHU, M.', winnerVotes2021: 111682, runnerUp2021: 'DMK', margin2021: 19895, currentParty: 'AIADMK' },
  // ── Namakkal District ──
  { acNo: 92, name: 'Rasipuram', district: 'Namakkal', type: 'SC', winner2021: 'DMK', winnerName2021: 'MATHIVENTHAN M', winnerVotes2021: 90727, runnerUp2021: 'AIADMK', margin2021: 1952, currentParty: 'DMK' },
  { acNo: 93, name: 'Senthamangalam', district: 'Namakkal', type: 'ST', winner2021: 'DMK', winnerName2021: 'PONNUSAMY K', winnerVotes2021: 90681, runnerUp2021: 'AIADMK', margin2021: 10493, currentParty: 'DMK' },
  { acNo: 94, name: 'Namakkal', district: 'Namakkal', type: 'GEN', winner2021: 'DMK', winnerName2021: 'RAMALINGAM P', winnerVotes2021: 106494, runnerUp2021: 'AIADMK', margin2021: 27861, currentParty: 'DMK' },
  { acNo: 95, name: 'Paramathi-Velur', district: 'Namakkal', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'SEKAR S', winnerVotes2021: 86034, runnerUp2021: 'DMK', margin2021: 7662, currentParty: 'AIADMK' },
  { acNo: 96, name: 'Tiruchengodu', district: 'Namakkal', type: 'GEN', winner2021: 'DMK', winnerName2021: 'ESWARAN E R', winnerVotes2021: 81688, runnerUp2021: 'AIADMK', margin2021: 2862, currentParty: 'DMK' },
  { acNo: 97, name: 'Kumarapalayam', district: 'Namakkal', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'THANGAMANI.P', winnerVotes2021: 100800, runnerUp2021: 'DMK', margin2021: 31646, currentParty: 'AIADMK' },
  // ── Erode District ──
  { acNo: 98, name: 'Erode (East)', district: 'Erode', type: 'GEN', winner2021: 'INC', winnerName2021: 'THIRUMAHAN EVERAA,E.', winnerVotes2021: 67300, runnerUp2021: 'AIADMK', margin2021: 8904, currentParty: 'INC' },
  { acNo: 99, name: 'Erode (West)', district: 'Erode', type: 'GEN', winner2021: 'DMK', winnerName2021: 'Muthusamy S', winnerVotes2021: 100757, runnerUp2021: 'AIADMK', margin2021: 22089, currentParty: 'DMK' },
  { acNo: 100, name: 'Modakkurichi', district: 'Erode', type: 'GEN', winner2021: 'BJP', winnerName2021: 'SARASWATHI.C', winnerVotes2021: 78125, runnerUp2021: 'DMK', margin2021: 281, currentParty: 'BJP' },
  // ── Tiruppur District ──
  { acNo: 101, name: 'Dharapuram', district: 'Tiruppur', type: 'SC', winner2021: 'DMK', winnerName2021: 'KAYALVIZHI N', winnerVotes2021: 89986, runnerUp2021: 'BJP', margin2021: 1393, currentParty: 'DMK' },
  { acNo: 102, name: 'Kangayam', district: 'Tiruppur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'SAMINATHAN.M.P', winnerVotes2021: 94197, runnerUp2021: 'AIADMK', margin2021: 7331, currentParty: 'DMK' },
  // ── Erode District ──
  { acNo: 103, name: 'Perundurai', district: 'Erode', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'JAYAKUMAR, S.', winnerVotes2021: 85125, runnerUp2021: 'DMK', margin2021: 14507, currentParty: 'AIADMK' },
  { acNo: 104, name: 'Bhavani', district: 'Erode', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'KARUPPANAN.K.C', winnerVotes2021: 100915, runnerUp2021: 'DMK', margin2021: 22523, currentParty: 'AIADMK' },
  { acNo: 105, name: 'Anthiyur', district: 'Erode', type: 'GEN', winner2021: 'DMK', winnerName2021: 'VENKATACHALAM.A.G', winnerVotes2021: 79096, runnerUp2021: 'AIADMK', margin2021: 1275, currentParty: 'DMK' },
  { acNo: 106, name: 'Gobichettipalayam', district: 'Erode', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'SENGOTTAIYAN K.A', winnerVotes2021: 108608, runnerUp2021: 'DMK', margin2021: 28563, currentParty: 'AIADMK' },
  { acNo: 107, name: 'Bhavanisagar', district: 'Erode', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'A.Bannari', winnerVotes2021: 99181, runnerUp2021: 'CPI', margin2021: 16008, currentParty: 'AIADMK' },
  // ── The Nilgiris District ──
  { acNo: 108, name: 'Udhagamandalam', district: 'The Nilgiris', type: 'GEN', winner2021: 'INC', winnerName2021: 'GANESH, R.', winnerVotes2021: 65530, runnerUp2021: 'BJP', margin2021: 5348, currentParty: 'INC' },
  { acNo: 109, name: 'Gudalur', district: 'The Nilgiris', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'PON.JAYASEELAN', winnerVotes2021: 64496, runnerUp2021: 'DMK', margin2021: 1945, currentParty: 'AIADMK' },
  { acNo: 110, name: 'Coonoor', district: 'The Nilgiris', type: 'GEN', winner2021: 'DMK', winnerName2021: 'Ramachandran, K.', winnerVotes2021: 61820, runnerUp2021: 'AIADMK', margin2021: 4105, currentParty: 'DMK' },
  // ── Coimbatore District ──
  { acNo: 111, name: 'Mettuppalayam', district: 'Coimbatore', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'SELVARAJ A K', winnerVotes2021: 105231, runnerUp2021: 'DMK', margin2021: 2456, currentParty: 'AIADMK' },
  // ── Tiruppur District ──
  { acNo: 112, name: 'Avanashi', district: 'Tiruppur', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'DHANAPAL, P', winnerVotes2021: 117284, runnerUp2021: 'DMK', margin2021: 50902, currentParty: 'AIADMK' },
  { acNo: 113, name: 'Tiruppur (North)', district: 'Tiruppur', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'VIJEYAKUMAR.K.N', winnerVotes2021: 113384, runnerUp2021: 'CPI', margin2021: 40102, currentParty: 'AIADMK' },
  { acNo: 114, name: 'Tiruppur (South)', district: 'Tiruppur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'SELVARAJ. K.', winnerVotes2021: 75535, runnerUp2021: 'AIADMK', margin2021: 4709, currentParty: 'DMK' },
  { acNo: 115, name: 'Palladam', district: 'Tiruppur', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'ANANDAN M S M', winnerVotes2021: 126903, runnerUp2021: 'DMK', margin2021: 32691, currentParty: 'AIADMK' },
  // ── Coimbatore District ──
  { acNo: 116, name: 'Sulur', district: 'Coimbatore', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'KANDASAMY V.P.', winnerVotes2021: 118968, runnerUp2021: 'DMK', margin2021: 31932, currentParty: 'AIADMK' },
  { acNo: 117, name: 'Kavundampalayam', district: 'Coimbatore', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'G.Arunkumar', winnerVotes2021: 135669, runnerUp2021: 'DMK', margin2021: 9776, currentParty: 'AIADMK' },
  { acNo: 118, name: 'Coimbatore (North)', district: 'Coimbatore', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'AMMAN K.ARJUNAN', winnerVotes2021: 81454, runnerUp2021: 'DMK', margin2021: 4001, currentParty: 'AIADMK' },
  { acNo: 119, name: 'Thondamuthur', district: 'Coimbatore', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'S.P. VELUMANI', winnerVotes2021: 124225, runnerUp2021: 'DMK', margin2021: 41630, currentParty: 'AIADMK' },
  { acNo: 120, name: 'Coimbatore (South)', district: 'Coimbatore', type: 'GEN', winner2021: 'BJP', winnerName2021: 'VANATHI SRINIVASAN', winnerVotes2021: 53209, runnerUp2021: 'MNM', margin2021: 1728, currentParty: 'BJP' },
  { acNo: 121, name: 'Singanallur', district: 'Coimbatore', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'Jayaram, K.R', winnerVotes2021: 81244, runnerUp2021: 'DMK', margin2021: 10854, currentParty: 'AIADMK' },
  { acNo: 122, name: 'Kinathukadavu', district: 'Coimbatore', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'Damodaran.S', winnerVotes2021: 101537, runnerUp2021: 'DMK', margin2021: 1095, currentParty: 'AIADMK' },
  { acNo: 123, name: 'Pollachi', district: 'Coimbatore', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'Pollachi V. Jayaraman', winnerVotes2021: 80567, runnerUp2021: 'DMK', margin2021: 1725, currentParty: 'AIADMK' },
  { acNo: 124, name: 'Valparai', district: 'Coimbatore', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'AMULKANDASAMI T K', winnerVotes2021: 71672, runnerUp2021: 'CPI', margin2021: 12223, currentParty: 'AIADMK' },
  // ── Tiruppur District ──
  { acNo: 125, name: 'Udumalaipettai', district: 'Tiruppur', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'Radhakrishnan,K.', winnerVotes2021: 96893, runnerUp2021: 'INC', margin2021: 21895, currentParty: 'AIADMK' },
  { acNo: 126, name: 'Madathukulam', district: 'Tiruppur', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'C MAHENDRAN', winnerVotes2021: 84313, runnerUp2021: 'DMK', margin2021: 6438, currentParty: 'AIADMK' },
  // ── Dindigul District ──
  { acNo: 127, name: 'Palani', district: 'Dindigul', type: 'GEN', winner2021: 'DMK', winnerName2021: 'SENTHIL KUMAR I.P', winnerVotes2021: 108566, runnerUp2021: 'AIADMK', margin2021: 30056, currentParty: 'DMK' },
  { acNo: 128, name: 'Oddanchatram', district: 'Dindigul', type: 'GEN', winner2021: 'DMK', winnerName2021: 'SAKKARAPANI R', winnerVotes2021: 109970, runnerUp2021: 'AIADMK', margin2021: 28742, currentParty: 'DMK' },
  { acNo: 129, name: 'Athoor', district: 'Dindigul', type: 'GEN', winner2021: 'DMK', winnerName2021: 'PERIYASAMY I', winnerVotes2021: 165809, runnerUp2021: 'PMK', margin2021: 135571, currentParty: 'DMK' },
  { acNo: 130, name: 'Nilakkottai', district: 'Dindigul', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'S.Thenmozhi', winnerVotes2021: 91461, runnerUp2021: 'DMK', margin2021: 27618, currentParty: 'AIADMK' },
  { acNo: 131, name: 'Natham', district: 'Dindigul', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'NATHAM.R.VISWANATHAN', winnerVotes2021: 107762, runnerUp2021: 'DMK', margin2021: 11932, currentParty: 'AIADMK' },
  { acNo: 132, name: 'Dindigul', district: 'Dindigul', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'SREENIVASAN.C', winnerVotes2021: 90595, runnerUp2021: 'CPIM', margin2021: 17747, currentParty: 'AIADMK' },
  { acNo: 133, name: 'Vedasandur', district: 'Dindigul', type: 'GEN', winner2021: 'DMK', winnerName2021: 'GANDHIRAJAN S', winnerVotes2021: 106481, runnerUp2021: 'AIADMK', margin2021: 17553, currentParty: 'DMK' },
  // ── Karur District ──
  { acNo: 134, name: 'Aravakurichi', district: 'Karur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'ELANGO. R', winnerVotes2021: 93369, runnerUp2021: 'BJP', margin2021: 24816, currentParty: 'DMK' },
  { acNo: 135, name: 'Karur', district: 'Karur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'SENTHILBALAJI V', winnerVotes2021: 101757, runnerUp2021: 'AIADMK', margin2021: 12448, currentParty: 'DMK' },
  { acNo: 136, name: 'Krishnarayapuram', district: 'Karur', type: 'SC', winner2021: 'DMK', winnerName2021: 'SIVAGAMA SUNDARI.K', winnerVotes2021: 96540, runnerUp2021: 'AIADMK', margin2021: 31625, currentParty: 'DMK' },
  { acNo: 137, name: 'Kulithalai', district: 'Karur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'R.Manickam', winnerVotes2021: 100829, runnerUp2021: 'AIADMK', margin2021: 23540, currentParty: 'DMK' },
  // ── Tiruchirappalli District ──
  { acNo: 138, name: 'Manapparai', district: 'Tiruchirappalli', type: 'GEN', winner2021: 'DMK', winnerName2021: 'ABDUL SAMAD P', winnerVotes2021: 98077, runnerUp2021: 'AIADMK', margin2021: 12243, currentParty: 'DMK' },
  { acNo: 139, name: 'Srirangam', district: 'Tiruchirappalli', type: 'GEN', winner2021: 'DMK', winnerName2021: 'Palaniyandi.M', winnerVotes2021: 113904, runnerUp2021: 'AIADMK', margin2021: 19915, currentParty: 'DMK' },
  { acNo: 140, name: 'Tiruchirappalli (West)', district: 'Tiruchirappalli', type: 'GEN', winner2021: 'DMK', winnerName2021: 'Nehru, K.N.', winnerVotes2021: 118133, runnerUp2021: 'AIADMK', margin2021: 85109, currentParty: 'DMK' },
  { acNo: 141, name: 'Tiruchirappalli (East)', district: 'Tiruchirappalli', type: 'GEN', winner2021: 'DMK', winnerName2021: 'INIGO IRUDAYARAJ,S.', winnerVotes2021: 94302, runnerUp2021: 'AIADMK', margin2021: 53797, currentParty: 'DMK' },
  { acNo: 142, name: 'Thiruverumbur', district: 'Tiruchirappalli', type: 'GEN', winner2021: 'DMK', winnerName2021: 'ANBIL MAHESH POYYAMOZHI', winnerVotes2021: 105424, runnerUp2021: 'AIADMK', margin2021: 49697, currentParty: 'DMK' },
  { acNo: 143, name: 'Lalgudi', district: 'Tiruchirappalli', type: 'GEN', winner2021: 'DMK', winnerName2021: 'A.SOUNDARAPANDIAN', winnerVotes2021: 84914, runnerUp2021: 'AIADMK', margin2021: 16949, currentParty: 'DMK' },
  { acNo: 144, name: 'Manachanallur', district: 'Tiruchirappalli', type: 'GEN', winner2021: 'DMK', winnerName2021: 'S. KATHIRAVAN', winnerVotes2021: 116334, runnerUp2021: 'AIADMK', margin2021: 59618, currentParty: 'DMK' },
  { acNo: 145, name: 'Musiri', district: 'Tiruchirappalli', type: 'GEN', winner2021: 'DMK', winnerName2021: 'N. Thiyagarajan', winnerVotes2021: 90624, runnerUp2021: 'AIADMK', margin2021: 26836, currentParty: 'DMK' },
  { acNo: 146, name: 'Thuraiyur', district: 'Tiruchirappalli', type: 'SC', winner2021: 'DMK', winnerName2021: 'S.STALINKUMAR', winnerVotes2021: 87786, runnerUp2021: 'AIADMK', margin2021: 22071, currentParty: 'DMK' },
  // ── Perambalur District ──
  { acNo: 147, name: 'Perambalur', district: 'Perambalur', type: 'SC', winner2021: 'DMK', winnerName2021: 'PRABHAHARAN, M.', winnerVotes2021: 122090, runnerUp2021: 'AIADMK', margin2021: 31034, currentParty: 'DMK' },
  { acNo: 148, name: 'Kunnam', district: 'Perambalur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'SIVASANKAR, S.S.', winnerVotes2021: 103922, runnerUp2021: 'AIADMK', margin2021: 6329, currentParty: 'DMK' },
  // ── Ariyalur District ──
  { acNo: 149, name: 'Ariyalur', district: 'Ariyalur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'CHINNAPPA K', winnerVotes2021: 103975, runnerUp2021: 'AIADMK', margin2021: 3234, currentParty: 'DMK' },
  { acNo: 150, name: 'Jayankondam', district: 'Ariyalur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'KANNAN KA SO KA', winnerVotes2021: 99529, runnerUp2021: 'PMK', margin2021: 5452, currentParty: 'DMK' },
  // ── Cuddalore District ──
  { acNo: 151, name: 'Tittakudi', district: 'Cuddalore', type: 'SC', winner2021: 'DMK', winnerName2021: 'GANESAN,  C.V.', winnerVotes2021: 83726, runnerUp2021: 'BJP', margin2021: 21563, currentParty: 'DMK' },
  { acNo: 152, name: 'Vriddhachalam', district: 'Cuddalore', type: 'GEN', winner2021: 'INC', winnerName2021: 'Radhakrishnan', winnerVotes2021: 77064, runnerUp2021: 'PMK', margin2021: 862, currentParty: 'INC' },
  { acNo: 153, name: 'Neyveli', district: 'Cuddalore', type: 'GEN', winner2021: 'DMK', winnerName2021: 'SABA.RAJENDRAN', winnerVotes2021: 75177, runnerUp2021: 'PMK', margin2021: 977, currentParty: 'DMK' },
  { acNo: 154, name: 'Panruti', district: 'Cuddalore', type: 'GEN', winner2021: 'DMK', winnerName2021: 'VELMURUGAN.T', winnerVotes2021: 93801, runnerUp2021: 'AIADMK', margin2021: 4697, currentParty: 'DMK' },
  { acNo: 155, name: 'Cuddalore', district: 'Cuddalore', type: 'GEN', winner2021: 'DMK', winnerName2021: 'G.IYAPPAN', winnerVotes2021: 84563, runnerUp2021: 'AIADMK', margin2021: 5151, currentParty: 'DMK' },
  { acNo: 156, name: 'Kurinjipadi', district: 'Cuddalore', type: 'GEN', winner2021: 'DMK', winnerName2021: 'M.R.K.PANNEERSELVAM', winnerVotes2021: 101456, runnerUp2021: 'AIADMK', margin2021: 17527, currentParty: 'DMK' },
  { acNo: 157, name: 'Bhuvanagiri', district: 'Cuddalore', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'Arunmozhithevan. A', winnerVotes2021: 96453, runnerUp2021: 'DMK', margin2021: 8259, currentParty: 'AIADMK' },
  { acNo: 158, name: 'Chidambaram', district: 'Cuddalore', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'K.A. PANDIAN', winnerVotes2021: 91961, runnerUp2021: 'IUML', margin2021: 16937, currentParty: 'AIADMK' },
  { acNo: 159, name: 'Kattumannarkoil', district: 'Cuddalore', type: 'SC', winner2021: 'VCK', winnerName2021: 'SINTHANAI SELVAN', winnerVotes2021: 86056, runnerUp2021: 'AIADMK', margin2021: 10565, currentParty: 'VCK' },
  // ── Nagapattinam District ──
  { acNo: 160, name: 'Sirkazhi', district: 'Nagapattinam', type: 'SC', winner2021: 'DMK', winnerName2021: 'PANNEERSELVAM', winnerVotes2021: 94057, runnerUp2021: 'AIADMK', margin2021: 12148, currentParty: 'DMK' },
  { acNo: 161, name: 'Mayiladuthurai', district: 'Nagapattinam', type: 'GEN', winner2021: 'INC', winnerName2021: 'Rajakumar.S', winnerVotes2021: 73642, runnerUp2021: 'PMK', margin2021: 2742, currentParty: 'INC' },
  { acNo: 162, name: 'Poompuhar', district: 'Nagapattinam', type: 'GEN', winner2021: 'DMK', winnerName2021: 'Nivedha M. Murugan', winnerVotes2021: 96102, runnerUp2021: 'AIADMK', margin2021: 3299, currentParty: 'DMK' },
  { acNo: 163, name: 'Nagapattinam', district: 'Nagapattinam', type: 'GEN', winner2021: 'VCK', winnerName2021: 'J. Mohamed Shanavas', winnerVotes2021: 66281, runnerUp2021: 'AIADMK', margin2021: 7238, currentParty: 'VCK' },
  { acNo: 164, name: 'Kilvelur', district: 'Nagapattinam', type: 'GEN', winner2021: 'CPIM', winnerName2021: 'NAGAIMAALI V P', winnerVotes2021: 67988, runnerUp2021: 'PMK', margin2021: 16985, currentParty: 'CPIM' },
  { acNo: 165, name: 'Vedaranyam', district: 'Nagapattinam', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'O.S.MANIAN', winnerVotes2021: 78719, runnerUp2021: 'DMK', margin2021: 12329, currentParty: 'AIADMK' },
  // ── Thiruvarur District ──
  { acNo: 166, name: 'Thiruthuraipoondi', district: 'Thiruvarur', type: 'SC', winner2021: 'CPI', winnerName2021: 'MARIMUTHU K', winnerVotes2021: 97092, runnerUp2021: 'AIADMK', margin2021: 30068, currentParty: 'CPI' },
  { acNo: 167, name: 'Mannargudi', district: 'Thiruvarur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'RAJAA T R B', winnerVotes2021: 87172, runnerUp2021: 'AIADMK', margin2021: 37393, currentParty: 'DMK' },
  { acNo: 168, name: 'Thiruvarur', district: 'Thiruvarur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'KALAIVANAN  POONDI  K.', winnerVotes2021: 108906, runnerUp2021: 'AIADMK', margin2021: 51174, currentParty: 'DMK' },
  { acNo: 169, name: 'Nannilam', district: 'Thiruvarur', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'KAMARAJ R', winnerVotes2021: 103637, runnerUp2021: 'DMK', margin2021: 4424, currentParty: 'AIADMK' },
  // ── Thanjavur District ──
  { acNo: 170, name: 'Thiruvidaimarudur', district: 'Thanjavur', type: 'SC', winner2021: 'DMK', winnerName2021: 'CHEZHIAAN,  GOVI.', winnerVotes2021: 95763, runnerUp2021: 'AIADMK', margin2021: 10680, currentParty: 'DMK' },
  { acNo: 171, name: 'Kumbakonam', district: 'Thanjavur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'ANBALAGAN, G.', winnerVotes2021: 96057, runnerUp2021: 'AIADMK', margin2021: 21383, currentParty: 'DMK' },
  { acNo: 172, name: 'Papanasam', district: 'Thanjavur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'Dr.JAWAHIRULLAH, M.H.', winnerVotes2021: 86567, runnerUp2021: 'AIADMK', margin2021: 16273, currentParty: 'DMK' },
  { acNo: 173, name: 'Thiruvaiyaru', district: 'Thanjavur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'DURAI.CHANDRASEKARAN', winnerVotes2021: 103210, runnerUp2021: 'BJP', margin2021: 53650, currentParty: 'DMK' },
  { acNo: 174, name: 'Thanjavur', district: 'Thanjavur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'NEELAMEGAM, T.K.G.', winnerVotes2021: 103772, runnerUp2021: 'AIADMK', margin2021: 47149, currentParty: 'DMK' },
  { acNo: 175, name: 'Orathanadu', district: 'Thanjavur', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'VAITHILINGAM, R.', winnerVotes2021: 90063, runnerUp2021: 'DMK', margin2021: 28835, currentParty: 'AIADMK' },
  { acNo: 176, name: 'Pattukkottai', district: 'Thanjavur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'ANNADURAI, K.', winnerVotes2021: 79065, runnerUp2021: 'AIADMK', margin2021: 25269, currentParty: 'DMK' },
  { acNo: 177, name: 'Peravurani', district: 'Thanjavur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'ASHOKKUMAR, N.', winnerVotes2021: 89130, runnerUp2021: 'AIADMK', margin2021: 23503, currentParty: 'DMK' },
  // ── Pudukkottai District ──
  { acNo: 178, name: 'Gandarvakkottai', district: 'Pudukkottai', type: 'SC', winner2021: 'CPIM', winnerName2021: 'M.Chinnadurai', winnerVotes2021: 69710, runnerUp2021: 'AIADMK', margin2021: 12721, currentParty: 'CPIM' },
  { acNo: 179, name: 'Viralimalai', district: 'Pudukkottai', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'VIJAYA BASKER C', winnerVotes2021: 102179, runnerUp2021: 'DMK', margin2021: 23598, currentParty: 'AIADMK' },
  { acNo: 180, name: 'Pudukkottai', district: 'Pudukkottai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'V . MUTHURAJA', winnerVotes2021: 85802, runnerUp2021: 'AIADMK', margin2021: 13001, currentParty: 'DMK' },
  { acNo: 181, name: 'Thirumayam', district: 'Pudukkottai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'S.REGUPATHY', winnerVotes2021: 71349, runnerUp2021: 'AIADMK', margin2021: 1382, currentParty: 'DMK' },
  { acNo: 182, name: 'Alangudi', district: 'Pudukkottai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'SIVA.V.MEYYANATHAN', winnerVotes2021: 87935, runnerUp2021: 'AIADMK', margin2021: 25847, currentParty: 'DMK' },
  { acNo: 183, name: 'Aranthangi', district: 'Pudukkottai', type: 'GEN', winner2021: 'INC', winnerName2021: 'RAMACHANDRAN T', winnerVotes2021: 81835, runnerUp2021: 'AIADMK', margin2021: 30893, currentParty: 'INC' },
  // ── Sivaganga District ──
  { acNo: 184, name: 'Karaikudi', district: 'Sivaganga', type: 'GEN', winner2021: 'INC', winnerName2021: 'S.Mangudi', winnerVotes2021: 75954, runnerUp2021: 'BJP', margin2021: 21589, currentParty: 'INC' },
  // ── Tiruppattur District ──
  { acNo: 185, name: 'Tiruppattur', district: 'Tiruppattur', type: 'GEN', winner2021: 'DMK', winnerName2021: 'KR.PERIYAKARUPPAN', winnerVotes2021: 103682, runnerUp2021: 'AIADMK', margin2021: 37374, currentParty: 'DMK' },
  // ── Sivaganga District ──
  { acNo: 186, name: 'Sivaganga', district: 'Sivaganga', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'PR. Senthilnathan', winnerVotes2021: 82153, runnerUp2021: 'CPI', margin2021: 11253, currentParty: 'AIADMK' },
  { acNo: 187, name: 'Manamadurai', district: 'Sivaganga', type: 'SC', winner2021: 'DMK', winnerName2021: 'Tamilarasi A.', winnerVotes2021: 89364, runnerUp2021: 'AIADMK', margin2021: 14091, currentParty: 'DMK' },
  // ── Madurai District ──
  { acNo: 188, name: 'Melur', district: 'Madurai', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'PERIYAPULLAN @ SELVAM  P.', winnerVotes2021: 83344, runnerUp2021: 'INC', margin2021: 35162, currentParty: 'AIADMK' },
  { acNo: 189, name: 'Madurai East', district: 'Madurai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'MOORTHY P', winnerVotes2021: 122729, runnerUp2021: 'AIADMK', margin2021: 49604, currentParty: 'DMK' },
  { acNo: 190, name: 'Sholavandan', district: 'Madurai', type: 'SC', winner2021: 'DMK', winnerName2021: 'VENKATESAN A', winnerVotes2021: 84240, runnerUp2021: 'AIADMK', margin2021: 17045, currentParty: 'DMK' },
  { acNo: 191, name: 'Madurai North', district: 'Madurai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'THALAPATHI G', winnerVotes2021: 73010, runnerUp2021: 'BJP', margin2021: 22916, currentParty: 'DMK' },
  { acNo: 192, name: 'Madurai South', district: 'Madurai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'BOOMINATHAN.M', winnerVotes2021: 62812, runnerUp2021: 'AIADMK', margin2021: 6515, currentParty: 'DMK' },
  { acNo: 193, name: 'Madurai Central', district: 'Madurai', type: 'GEN', winner2021: 'DMK', winnerName2021: 'PALANIVEL THIAGA RAJAN', winnerVotes2021: 73205, runnerUp2021: 'AIADMK', margin2021: 34176, currentParty: 'DMK' },
  { acNo: 194, name: 'Madurai West', district: 'Madurai', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'RAJU. K', winnerVotes2021: 83883, runnerUp2021: 'DMK', margin2021: 9121, currentParty: 'AIADMK' },
  { acNo: 195, name: 'Thiruparankundram', district: 'Madurai', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'RAJANCHELLAPPA, V.V.', winnerVotes2021: 103683, runnerUp2021: 'CPIM', margin2021: 29489, currentParty: 'AIADMK' },
  { acNo: 196, name: 'Thirumangalam', district: 'Madurai', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'UDHAYAKUMAR R B', winnerVotes2021: 100338, runnerUp2021: 'DMK', margin2021: 14087, currentParty: 'AIADMK' },
  { acNo: 197, name: 'Usilampatti', district: 'Madurai', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'AYYAPPAN P', winnerVotes2021: 71255, runnerUp2021: 'DMK', margin2021: 7477, currentParty: 'AIADMK' },
  // ── Theni District ──
  { acNo: 198, name: 'Andipatti', district: 'Theni', type: 'GEN', winner2021: 'DMK', winnerName2021: 'A.MAHARAJAN', winnerVotes2021: 93541, runnerUp2021: 'AIADMK', margin2021: 8538, currentParty: 'DMK' },
  { acNo: 199, name: 'Periyakulam', district: 'Theni', type: 'SC', winner2021: 'DMK', winnerName2021: 'K.S.SARAVANAKUMAAR', winnerVotes2021: 92251, runnerUp2021: 'AIADMK', margin2021: 21321, currentParty: 'DMK' },
  { acNo: 200, name: 'Bodinayakanur', district: 'Theni', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'O.PANNEERSELVAM', winnerVotes2021: 100050, runnerUp2021: 'DMK', margin2021: 11021, currentParty: 'AIADMK' },
  { acNo: 201, name: 'Cumbum', district: 'Theni', type: 'GEN', winner2021: 'DMK', winnerName2021: 'N.Ramakrishnan', winnerVotes2021: 104800, runnerUp2021: 'AIADMK', margin2021: 42413, currentParty: 'DMK' },
  // ── Virudhunagar District ──
  { acNo: 202, name: 'Rajapalayam', district: 'Virudhunagar', type: 'GEN', winner2021: 'DMK', winnerName2021: 'THANGAPANDIAN S.', winnerVotes2021: 74158, runnerUp2021: 'AIADMK', margin2021: 3898, currentParty: 'DMK' },
  { acNo: 203, name: 'Srivilliputhur', district: 'Virudhunagar', type: 'SC', winner2021: 'AIADMK', winnerName2021: 'MANRAJ, E.M.', winnerVotes2021: 70475, runnerUp2021: 'INC', margin2021: 12738, currentParty: 'AIADMK' },
  { acNo: 204, name: 'Sattur', district: 'Virudhunagar', type: 'GEN', winner2021: 'DMK', winnerName2021: 'RAGHURAMAN,  A.R.R.', winnerVotes2021: 74174, runnerUp2021: 'AIADMK', margin2021: 11179, currentParty: 'DMK' },
  { acNo: 205, name: 'Sivakasi', district: 'Virudhunagar', type: 'GEN', winner2021: 'INC', winnerName2021: 'Ashokan.G', winnerVotes2021: 78947, runnerUp2021: 'AIADMK', margin2021: 17319, currentParty: 'INC' },
  { acNo: 206, name: 'Virudhunagar', district: 'Virudhunagar', type: 'GEN', winner2021: 'DMK', winnerName2021: 'SEENIVASAN A.R.R', winnerVotes2021: 73297, runnerUp2021: 'BJP', margin2021: 21339, currentParty: 'DMK' },
  { acNo: 207, name: 'Aruppukkottai', district: 'Virudhunagar', type: 'GEN', winner2021: 'DMK', winnerName2021: 'K.K.S.S.R.RAMACHANDRAN', winnerVotes2021: 91040, runnerUp2021: 'AIADMK', margin2021: 39034, currentParty: 'DMK' },
  { acNo: 208, name: 'Tiruchuli', district: 'Virudhunagar', type: 'GEN', winner2021: 'DMK', winnerName2021: 'THANGAM THENARASU', winnerVotes2021: 102225, runnerUp2021: 'AIADMK', margin2021: 60992, currentParty: 'DMK' },
  // ── Ramanathapuram District ──
  { acNo: 209, name: 'Paramakudi', district: 'Ramanathapuram', type: 'SC', winner2021: 'DMK', winnerName2021: 'MURUGESAN S', winnerVotes2021: 84864, runnerUp2021: 'AIADMK', margin2021: 13285, currentParty: 'DMK' },
  { acNo: 210, name: 'Tiruvadanai', district: 'Ramanathapuram', type: 'GEN', winner2021: 'INC', winnerName2021: 'KARUMANICKAM', winnerVotes2021: 79364, runnerUp2021: 'AIADMK', margin2021: 13852, currentParty: 'INC' },
  { acNo: 211, name: 'Ramanathapuram', district: 'Ramanathapuram', type: 'GEN', winner2021: 'DMK', winnerName2021: 'KATHARBATCHA MUTHURAMALINGAM', winnerVotes2021: 111082, runnerUp2021: 'BJP', margin2021: 50479, currentParty: 'DMK' },
  { acNo: 212, name: 'Mudhukulathur', district: 'Ramanathapuram', type: 'GEN', winner2021: 'DMK', winnerName2021: 'R.S.RAJAKANNAPPAN', winnerVotes2021: 101901, runnerUp2021: 'AIADMK', margin2021: 20721, currentParty: 'DMK' },
  // ── Thoothukudi District ──
  { acNo: 213, name: 'Vilathikulam', district: 'Thoothukudi', type: 'GEN', winner2021: 'DMK', winnerName2021: 'MARKANDAYAN V', winnerVotes2021: 90348, runnerUp2021: 'AIADMK', margin2021: 38549, currentParty: 'DMK' },
  { acNo: 214, name: 'Thoothukkudi', district: 'Thoothukudi', type: 'GEN', winner2021: 'DMK', winnerName2021: 'P.Geetha Jeevan', winnerVotes2021: 92314, runnerUp2021: 'AIADMK', margin2021: 50310, currentParty: 'DMK' },
  { acNo: 215, name: 'Tiruchendur', district: 'Thoothukudi', type: 'GEN', winner2021: 'DMK', winnerName2021: 'Anitha R. Radhakrishnan', winnerVotes2021: 88274, runnerUp2021: 'AIADMK', margin2021: 25263, currentParty: 'DMK' },
  { acNo: 216, name: 'Srivaikuntam', district: 'Thoothukudi', type: 'GEN', winner2021: 'INC', winnerName2021: 'Amirtharaj .S', winnerVotes2021: 76843, runnerUp2021: 'AIADMK', margin2021: 17372, currentParty: 'INC' },
  { acNo: 217, name: 'Ottapidaram', district: 'Thoothukudi', type: 'SC', winner2021: 'DMK', winnerName2021: 'SHUNMUGAIAH C', winnerVotes2021: 73110, runnerUp2021: 'AIADMK', margin2021: 8510, currentParty: 'DMK' },
  { acNo: 218, name: 'Kovilpatti', district: 'Thoothukudi', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'KADAMBUR RAJU', winnerVotes2021: 68556, runnerUp2021: 'AMMK', margin2021: 12403, currentParty: 'AIADMK' },
  // ── Tenkasi District ──
  { acNo: 219, name: 'Sankarankovil', district: 'Tenkasi', type: 'SC', winner2021: 'DMK', winnerName2021: 'RAJA E', winnerVotes2021: 71347, runnerUp2021: 'AIADMK', margin2021: 5297, currentParty: 'DMK' },
  { acNo: 220, name: 'Vasudevanallur', district: 'Tenkasi', type: 'SC', winner2021: 'DMK', winnerName2021: 'SADHAN THIRUMALAIKUMAR, DOCTOR.T', winnerVotes2021: 68730, runnerUp2021: 'AIADMK', margin2021: 2367, currentParty: 'DMK' },
  { acNo: 221, name: 'Kadayanallur', district: 'Tenkasi', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'C.KRISHNAMURALI', winnerVotes2021: 88474, runnerUp2021: 'IUML', margin2021: 24349, currentParty: 'AIADMK' },
  { acNo: 222, name: 'Tenkasi', district: 'Tenkasi', type: 'GEN', winner2021: 'INC', winnerName2021: 'PALANI NADAR.S', winnerVotes2021: 89315, runnerUp2021: 'AIADMK', margin2021: 370, currentParty: 'INC' },
  { acNo: 223, name: 'Alangulam', district: 'Tenkasi', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'PAUL MANOJ PANDIAN', winnerVotes2021: 74153, runnerUp2021: 'DMK', margin2021: 3539, currentParty: 'AIADMK' },
  // ── Tirunelveli District ──
  { acNo: 224, name: 'Tirunelveli', district: 'Tirunelveli', type: 'GEN', winner2021: 'BJP', winnerName2021: 'Nainar Nagenthran', winnerVotes2021: 92282, runnerUp2021: 'DMK', margin2021: 23107, currentParty: 'BJP' },
  { acNo: 225, name: 'Ambasamudram', district: 'Tirunelveli', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'E.SUBAYA', winnerVotes2021: 85211, runnerUp2021: 'DMK', margin2021: 16915, currentParty: 'AIADMK' },
  { acNo: 226, name: 'Palayamkottai', district: 'Tirunelveli', type: 'GEN', winner2021: 'DMK', winnerName2021: 'ABDUL WAHAB .M', winnerVotes2021: 89117, runnerUp2021: 'AIADMK', margin2021: 52141, currentParty: 'DMK' },
  { acNo: 227, name: 'Nanguneri', district: 'Tirunelveli', type: 'GEN', winner2021: 'INC', winnerName2021: 'RUBY R MANOHARAN', winnerVotes2021: 75902, runnerUp2021: 'AIADMK', margin2021: 16486, currentParty: 'INC' },
  { acNo: 228, name: 'Radhapuram', district: 'Tirunelveli', type: 'GEN', winner2021: 'DMK', winnerName2021: 'M.Appavu', winnerVotes2021: 82331, runnerUp2021: 'AIADMK', margin2021: 5925, currentParty: 'DMK' },
  // ── Kanniyakumari District ──
  { acNo: 229, name: 'Kanniyakumari', district: 'Kanniyakumari', type: 'GEN', winner2021: 'AIADMK', winnerName2021: 'THALAVAI SUNDARAM N.', winnerVotes2021: 109745, runnerUp2021: 'DMK', margin2021: 16213, currentParty: 'AIADMK' },
  { acNo: 230, name: 'Nagercoil', district: 'Kanniyakumari', type: 'GEN', winner2021: 'BJP', winnerName2021: 'Gandhi M.R.', winnerVotes2021: 88804, runnerUp2021: 'DMK', margin2021: 11669, currentParty: 'BJP' },
  { acNo: 231, name: 'Colachal', district: 'Kanniyakumari', type: 'GEN', winner2021: 'INC', winnerName2021: 'Prince J.G.', winnerVotes2021: 90681, runnerUp2021: 'BJP', margin2021: 24832, currentParty: 'INC' },
  { acNo: 232, name: 'Padmanabhapuram', district: 'Kanniyakumari', type: 'GEN', winner2021: 'DMK', winnerName2021: 'Mano Thangaraj, T.', winnerVotes2021: 87744, runnerUp2021: 'AIADMK', margin2021: 26885, currentParty: 'DMK' },
  { acNo: 233, name: 'Vilavancode', district: 'Kanniyakumari', type: 'GEN', winner2021: 'INC', winnerName2021: 'VIJAYADHARANI S', winnerVotes2021: 87473, runnerUp2021: 'BJP', margin2021: 28669, currentParty: 'INC' },
  { acNo: 234, name: 'Killiyoor', district: 'Kanniyakumari', type: 'GEN', winner2021: 'INC', winnerName2021: 'RAJESH KUMAR  S', winnerVotes2021: 101541, runnerUp2021: 'AIADMK', margin2021: 55400, currentParty: 'INC' },
];

export function getTNConstituency(acNo: number): TNConstituencySeed | undefined {
  return TN_CONSTITUENCIES.find((c) => c.acNo === acNo);
}
