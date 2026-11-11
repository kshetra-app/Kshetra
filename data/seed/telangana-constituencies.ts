/**
 * Telangana Assembly Constituency seed data.
 *
 * 2023 election results (winner, runner-up, parties, votes and margin) are taken
 * from the Election Commission of India, Telangana Legislative Election 2023
 * Statistical Report, "2 - List of Successful Candidates":
 * https://www.eci.gov.in/telangana-legislative-election-2023-statistical-report
 * ECI's "BHRS" party code is normalized to "BRS" to match the app's existing
 * party code. The ECI source reports 64 INC, 39 BHRS, 8 BJP, 7 AIMIM and 1 CPI.
 *
 * Constituency labels, districts, Telugu names and the post-election party
 * snapshot are retained from the existing seed and are separate from the ECI
 * election-result fields. `currentPartyChangeType` distinguishes recorded
 * party defections from a later by-election result.
 * Secunderabad Cantonment's June 2024 by-election officeholder is verified by
 * the Telangana Gazette Form 21-D published by the Chief Electoral Officer:
 * https://ceotelangana.nic.in/BYE_ELECTION%2871-SEC_CANTT%29/2090-82-Bye%20Elecs%20to%20TSLA%2071-Sec%27bad%20cant%20Declaration%20of%20Result-Reg.pdf
 */

export interface ConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in local script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  /** Party that won the seat in 2023 (as elected) */
  winner2023: string;
  /** Winner candidate name */
  winnerName2023: string;
  /** Winner vote count (0 = pending ECI verification) */
  winnerVotes2023: number;
  /** Runner-up party */
  runnerUp2023: string;
  /** Runner-up candidate name */
  runnerUpName2023?: string;
  /** Winning margin (0 = pending ECI verification) */
  margin2023: number;
  /** Party recorded for the seat after the 2023 election. */
  currentParty?: string;
  /** Current officeholder when a later by-election replaced the 2023 winner. */
  currentMLA?: string;
  /** Verified later by-election information, kept separate from 2023 results. */
  byElection?: {
    year: number;
    month: string;
    winnerName: string;
    winnerParty: string;
  };
  /** Why the recorded post-election party differs from the 2023 winner, if applicable. */
  currentPartyChangeType?: 'defection' | 'by-election';
}

/**
 * All 119 Telangana Assembly Constituencies with 2023 election results.
 */
export const TELANGANA_CONSTITUENCIES: ConstituencySeed[] = [
  // ─── KUMURAM BHEEM ASIFABAD / MANCHERIAL / ADILABAD / NIRMAL ───
  { acNo: 1, name: 'Sirpur', localName: 'సిర్పూర్', district: 'Kumuram Bheem Asifabad', type: 'ST', winner2023: 'BJP', winnerName2023: 'Dr.Palvai Harish Babu', winnerVotes2023: 63702, runnerUp2023: 'BRS', runnerUpName2023: 'Koneru Konappa', margin2023: 3088 },
  { acNo: 2, name: 'Chennur', localName: 'చెన్నూరు', district: 'Mancherial', type: 'SC', winner2023: 'INC', winnerName2023: 'Vivek Venkat Swamy', winnerVotes2023: 87541, runnerUp2023: 'BRS', runnerUpName2023: 'Balka Suman', margin2023: 37515 },
  { acNo: 3, name: 'Bellampalli', localName: 'బెల్లంపల్లి', district: 'Mancherial', type: 'SC', winner2023: 'INC', winnerName2023: 'Gaddam Vinod', winnerVotes2023: 82217, runnerUp2023: 'BRS', runnerUpName2023: 'Durgam Chinnaiah', margin2023: 36878 },
  { acNo: 4, name: 'Mancherial', localName: 'మంచిర్యాల', district: 'Mancherial', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kokkirala Premsagar Rao', winnerVotes2023: 105945, runnerUp2023: 'BJP', runnerUpName2023: 'Raghunath Verabelli', margin2023: 66116 },
  { acNo: 5, name: 'Asifabad', localName: 'ఆసిఫాబాద్', district: 'Kumuram Bheem Asifabad', type: 'ST', winner2023: 'BRS', winnerName2023: 'Kova Laxmi', winnerVotes2023: 83052, runnerUp2023: 'INC', runnerUpName2023: 'Ajmera Shyam', margin2023: 22810 },
  { acNo: 6, name: 'Khanapur', localName: 'ఖానాపూర్', district: 'Adilabad', type: 'ST', winner2023: 'INC', winnerName2023: 'Vedma. Bhojju', winnerVotes2023: 58870, runnerUp2023: 'BRS', runnerUpName2023: 'Johnson Naik Bhukya', margin2023: 4702 },
  { acNo: 7, name: 'Adilabad', localName: 'ఆదిలాబాద్', district: 'Adilabad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Payal Shanker', winnerVotes2023: 67608, runnerUp2023: 'BRS', runnerUpName2023: 'Jogu Ramanna', margin2023: 6692 },
  { acNo: 8, name: 'Boath', localName: 'బోథ్', district: 'Adilabad', type: 'ST', winner2023: 'BRS', winnerName2023: 'Anil Jadhav', winnerVotes2023: 76792, runnerUp2023: 'BJP', runnerUpName2023: 'Soyam Bapurao', margin2023: 22800 },
  { acNo: 9, name: 'Nirmal', localName: 'నిర్మల్', district: 'Nirmal', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Alleti Maheshwar Reddy', winnerVotes2023: 106400, runnerUp2023: 'BRS', runnerUpName2023: 'Allola Indrakaran Reddy', margin2023: 50703 },
  { acNo: 10, name: 'Mudhole', localName: 'ముధోల్', district: 'Nirmal', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Ram Rao Pawar', winnerVotes2023: 98252, runnerUp2023: 'BRS', runnerUpName2023: 'Gaddigari Vittal Reddy', margin2023: 23999 },

  // ─── NIZAMABAD / KAMAREDDY ───
  { acNo: 11, name: 'Armur', localName: 'ఆర్మూర్', district: 'Nizamabad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Paidi Rakesh Reddy', winnerVotes2023: 72658, runnerUp2023: 'INC', runnerUpName2023: 'Prodduturi Vinay Kumar Reddy', margin2023: 29669 },
  { acNo: 12, name: 'Bodhan', localName: 'బోధన్', district: 'Nizamabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'P. Sudarshan Reddy', winnerVotes2023: 66963, runnerUp2023: 'BRS', runnerUpName2023: 'Mohammed Shakil Aamir', margin2023: 3062 },
  { acNo: 13, name: 'Jukkal', localName: 'జుక్కల్', district: 'Kamareddy', type: 'SC', winner2023: 'INC', winnerName2023: 'Laxmi Kantha Rao Thota', winnerVotes2023: 64489, runnerUp2023: 'BRS', runnerUpName2023: 'Hanmant Shinde', margin2023: 1152 },
  { acNo: 14, name: 'Banswada', localName: 'బాన్సువాడ', district: 'Kamareddy', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Srinivas Reddy Parige (pocharam)', winnerVotes2023: 76278, runnerUp2023: 'INC', runnerUpName2023: 'Eanugu Ravinder Reddy', margin2023: 23464, currentParty: 'INC', currentPartyChangeType: 'defection' },
  { acNo: 15, name: 'Yellareddy', localName: 'ఎల్లారెడ్డి', district: 'Nizamabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Madan Mohan Rao. K', winnerVotes2023: 86989, runnerUp2023: 'BRS', runnerUpName2023: 'Surendar Jajala', margin2023: 24001 },
  { acNo: 16, name: 'Kamareddy', localName: 'కామారెడ్డి', district: 'Kamareddy', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Katipally Venkata Ramana Reddy', winnerVotes2023: 66652, runnerUp2023: 'BRS', runnerUpName2023: 'Kalvakuntla Chandrashekar Rao', margin2023: 6741 },
  { acNo: 17, name: 'Nizamabad Urban', localName: 'నిజామాబాద్ అర్బన్', district: 'Nizamabad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Dhanpal Suryanarayana', winnerVotes2023: 75240, runnerUp2023: 'INC', runnerUpName2023: 'Mohammed Ali Shabbir', margin2023: 15387 },
  { acNo: 18, name: 'Nizamabad Rural', localName: 'నిజామాబాద్ రూరల్', district: 'Nizamabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Bhoopathi Reddy Rekulapally', winnerVotes2023: 78378, runnerUp2023: 'BRS', runnerUpName2023: 'Goverdhan Bajireddy', margin2023: 21963 },
  { acNo: 19, name: 'Balkonda', localName: 'బాల్కొండ', district: 'Nizamabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Prashanth Reddy Vemula', winnerVotes2023: 70417, runnerUp2023: 'INC', runnerUpName2023: 'Sunil Kumar Muthyala', margin2023: 4533 },

  // ─── JAGTIAL / PEDDAPALLI / KARIMNAGAR / RAJANNA SIRCILLA ───
  { acNo: 20, name: 'Koratla', localName: 'కోరుట్ల', district: 'Jagtial', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Kalvakuntla Sanjay', winnerVotes2023: 72115, runnerUp2023: 'BJP', runnerUpName2023: 'Arvind Dharmapuri', margin2023: 10305 },
  { acNo: 21, name: 'Jagtial', localName: 'జగిత్యాల', district: 'Jagtial', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Dr. Sanjay', winnerVotes2023: 70243, runnerUp2023: 'INC', runnerUpName2023: 'Jeevan Reddy. T', margin2023: 15822, currentParty: 'INC', currentPartyChangeType: 'defection' },
  { acNo: 22, name: 'Dharmapuri', localName: 'ధర్మపురి', district: 'Jagtial', type: 'SC', winner2023: 'INC', winnerName2023: 'Adluri Laxman Kumar', winnerVotes2023: 91393, runnerUp2023: 'BRS', runnerUpName2023: 'Koppula Eshwar', margin2023: 22039 },
  { acNo: 23, name: 'Ramagundam', localName: 'రామగుండం', district: 'Peddapalli', type: 'GEN', winner2023: 'INC', winnerName2023: 'Makkan Singh Raj Thakur', winnerVotes2023: 92227, runnerUp2023: 'BRS', runnerUpName2023: 'Korukanti Chander', margin2023: 56794 },
  { acNo: 24, name: 'Manthani', localName: 'మంథని', district: 'Peddapalli', type: 'GEN', winner2023: 'INC', winnerName2023: 'Duddilla Sridhar Babu', winnerVotes2023: 103822, runnerUp2023: 'BRS', runnerUpName2023: 'Putta Madhukar', margin2023: 31380 },
  { acNo: 25, name: 'Peddapalle', localName: 'పెద్దపల్లి', district: 'Peddapalli', type: 'GEN', winner2023: 'INC', winnerName2023: 'Chinthakunta Vijaya Ramana Rao', winnerVotes2023: 118888, runnerUp2023: 'BRS', runnerUpName2023: 'Dasari Manohar Reddy', margin2023: 55108 },
  { acNo: 26, name: 'Karimnagar', localName: 'కరీంనగర్', district: 'Karimnagar', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Gangula Kamalakar', winnerVotes2023: 92179, runnerUp2023: 'BJP', runnerUpName2023: 'Bandi Sanjay Kumar', margin2023: 3163 },
  { acNo: 27, name: 'Choppadandi', localName: 'చొప్పదండి', district: 'Karimnagar', type: 'SC', winner2023: 'INC', winnerName2023: 'Medipally Sathyam', winnerVotes2023: 90395, runnerUp2023: 'BRS', runnerUpName2023: 'Ravi Shankar Sunke', margin2023: 37439 },
  { acNo: 28, name: 'Vemulawada', localName: 'వేములవాడ', district: 'Rajanna Sircilla', type: 'GEN', winner2023: 'INC', winnerName2023: 'Aadi Srinivas', winnerVotes2023: 71451, runnerUp2023: 'BRS', runnerUpName2023: 'Chalimeda Lakshmi Narasimha Rao', margin2023: 14581 },
  { acNo: 29, name: 'Sircilla', localName: 'సిరిసిల్ల', district: 'Rajanna Sircilla', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Kalvakuntla Taraka Rama Rao (k.T.R)', winnerVotes2023: 89244, runnerUp2023: 'INC', runnerUpName2023: 'K.K. Mahender Reddy', margin2023: 29687 },
  { acNo: 30, name: 'Manakondur', localName: 'మానకొండూరు', district: 'Karimnagar', type: 'SC', winner2023: 'INC', winnerName2023: 'Dr. Kavvampally Satyanarayana', winnerVotes2023: 96773, runnerUp2023: 'BRS', runnerUpName2023: 'Erupula Balakishan Rasamayi', margin2023: 32365 },
  { acNo: 31, name: 'Huzurabad', localName: 'హుజూరాబాద్', district: 'Karimnagar', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Kaushik Reddy Padi', winnerVotes2023: 80333, runnerUp2023: 'BJP', runnerUpName2023: 'Eatala Rajendar', margin2023: 16873 },

  // ─── SIDDIPET / MEDAK / SANGAREDDY ───
  { acNo: 32, name: 'Husnabad', localName: 'హుస్నాబాద్', district: 'Siddipet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ponnam Prabhakar', winnerVotes2023: 100955, runnerUp2023: 'BRS', runnerUpName2023: 'Satish Kumar Voditela', margin2023: 19344 },
  { acNo: 33, name: 'Siddipet', localName: 'సిద్దిపేట', district: 'Siddipet', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Thanneeru Harish Rao', winnerVotes2023: 105514, runnerUp2023: 'INC', runnerUpName2023: 'Pujala Hari Krishna', margin2023: 82308 },
  { acNo: 34, name: 'Medak', localName: 'మెదక్', district: 'Medak', type: 'GEN', winner2023: 'INC', winnerName2023: 'Mynampally Rohith', winnerVotes2023: 87126, runnerUp2023: 'BRS', runnerUpName2023: 'Padma Devender Reddy.M', margin2023: 10157 },
  { acNo: 35, name: 'Narayankhed', localName: 'నారాయణ్ఖేడ్', district: 'Sangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Patlolla Sanjeeva Reddy', winnerVotes2023: 91373, runnerUp2023: 'BRS', runnerUpName2023: 'Mahareddy Bhupal Reddy', margin2023: 6547 },
  { acNo: 36, name: 'Andole', localName: 'ఆందోల్', district: 'Sangareddy', type: 'SC', winner2023: 'INC', winnerName2023: 'C. Damodar Rajanarsimha', winnerVotes2023: 114147, runnerUp2023: 'BRS', runnerUpName2023: 'Chanti Kranthi Kiran', margin2023: 28193 },
  { acNo: 37, name: 'Narsapur', localName: 'నర్సాపూర్', district: 'Medak', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Vakiti Sunitha Laxma Reddy', winnerVotes2023: 88410, runnerUp2023: 'INC', runnerUpName2023: 'Aavula Raji Reddy', margin2023: 8855 },
  { acNo: 38, name: 'Zahirabad', localName: 'జహీరాబాద్', district: 'Sangareddy', type: 'SC', winner2023: 'BRS', winnerName2023: 'Koninty Manik Rao', winnerVotes2023: 97205, runnerUp2023: 'INC', runnerUpName2023: 'A.Chandrasekhar', margin2023: 12790 },
  { acNo: 39, name: 'Sangareddy', localName: 'సంగారెడ్డి', district: 'Sangareddy', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Chinta Prabhakar', winnerVotes2023: 83112, runnerUp2023: 'INC', runnerUpName2023: 'T. Jayaprakash Reddy', margin2023: 8217 },
  { acNo: 40, name: 'Patancheru', localName: 'పటాన్చెరు', district: 'Sangareddy', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Gudem Mahipal Reddy', winnerVotes2023: 105387, runnerUp2023: 'INC', runnerUpName2023: 'Kata Srinivas Goud', margin2023: 7091, currentParty: 'INC', currentPartyChangeType: 'defection' },
  { acNo: 41, name: 'Dubbak', localName: 'దుబ్బాక', district: 'Siddipet', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Kotta Prabhakar Reddy', winnerVotes2023: 97879, runnerUp2023: 'BJP', runnerUpName2023: 'Madhavaneni Raghunandan Rao', margin2023: 53513 },
  { acNo: 42, name: 'Gajwel', localName: 'గజ్వేల్', district: 'Siddipet', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Kalvakuntla Chandrashekar Rao', winnerVotes2023: 111684, runnerUp2023: 'BJP', runnerUpName2023: 'Eatala Rajender', margin2023: 45031 },

  // ─── MEDCHAL-MALKAJGIRI / RANGAREDDY ───
  { acNo: 43, name: 'Medchal', localName: 'మేడ్చల్', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Chamakura Malla Reddy', winnerVotes2023: 186017, runnerUp2023: 'INC', runnerUpName2023: 'Thotakura Vajresh Yadav (jangaiah Yadav)', margin2023: 33419 },
  { acNo: 44, name: 'Malkajgiri', localName: 'మల్కాజ్గిరి', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Marri Rajashekar Reddy', winnerVotes2023: 125049, runnerUp2023: 'INC', runnerUpName2023: 'Mynampally Hanumanth Rao', margin2023: 49530 },
  { acNo: 45, name: 'Quthbullapur', localName: 'కుత్బుల్లాపూర్', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'BRS', winnerName2023: 'K.P. Vivekanand', winnerVotes2023: 187999, runnerUp2023: 'BJP', runnerUpName2023: 'Kuna Srisailam Goud', margin2023: 85576 },
  { acNo: 46, name: 'Kukatpally', localName: 'కూకట్పల్లి', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Madhavaram Krishna Rao', winnerVotes2023: 135635, runnerUp2023: 'INC', runnerUpName2023: 'Bandi Ramesh', margin2023: 70387 },
  { acNo: 47, name: 'Uppal', localName: 'ఉప్పల్', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Bandari Lakshma Reddy', winnerVotes2023: 132929, runnerUp2023: 'INC', runnerUpName2023: 'Parameshwar Reddy Mandumula', margin2023: 49029 },
  { acNo: 48, name: 'Ibrahimpatnam', localName: 'ఇబ్రహీంపట్నం', district: 'Rangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Malreddy Ranga Reddy', winnerVotes2023: 126506, runnerUp2023: 'BRS', runnerUpName2023: 'Manchireddy Kishan Reddy', margin2023: 36700 },
  { acNo: 49, name: 'L. B. Nagar', localName: 'ఎల్బీ నగర్', district: 'Rangareddy', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Devireddy Sudhir Reddy', winnerVotes2023: 111380, runnerUp2023: 'BJP', runnerUpName2023: 'Sama Ranga Reddy', margin2023: 22305 },
  { acNo: 50, name: 'Maheshwaram', localName: 'మహేశ్వరం', district: 'Rangareddy', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Patlolla Sabitha Indra Reddy', winnerVotes2023: 125578, runnerUp2023: 'BJP', runnerUpName2023: 'Andela Sriramulu Yadav', margin2023: 26187 },
  { acNo: 51, name: 'Rajendranagar', localName: 'రాజేంద్రనగర్', district: 'Rangareddy', type: 'GEN', winner2023: 'BRS', winnerName2023: 'T. Prakash Goud', winnerVotes2023: 121734, runnerUp2023: 'BJP', runnerUpName2023: 'Thokala Srinivas Reddy', margin2023: 32096, currentParty: 'INC', currentPartyChangeType: 'defection' },
  { acNo: 52, name: 'Serilingampally', localName: 'శేరిలింగంపల్లి', district: 'Rangareddy', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Arekapudi Gandhi', winnerVotes2023: 157332, runnerUp2023: 'INC', runnerUpName2023: 'Jagadeeswar Goud', margin2023: 46552, currentParty: 'INC', currentPartyChangeType: 'defection' },
  { acNo: 53, name: 'Chevella', localName: 'చేవెళ్ల', district: 'Rangareddy', type: 'SC', winner2023: 'BRS', winnerName2023: 'Kale Yadaiah', winnerVotes2023: 76218, runnerUp2023: 'INC', runnerUpName2023: 'Beem Bharath Pamena', margin2023: 268, currentParty: 'INC', currentPartyChangeType: 'defection' },

  // ─── VIKARABAD ───
  { acNo: 54, name: 'Pargi', localName: 'పరిగి', district: 'Vikarabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Dr. T. Ram Mohan Reddy', winnerVotes2023: 98570, runnerUp2023: 'BRS', runnerUpName2023: 'K. Mahesh Reddy', margin2023: 24033 },
  { acNo: 55, name: 'Vicarabad', localName: 'వికారాబాద్', district: 'Vikarabad', type: 'SC', winner2023: 'INC', winnerName2023: 'Gaddam Prasad Kumar', winnerVotes2023: 86885, runnerUp2023: 'BRS', runnerUpName2023: 'Dr. Anand Methuku', margin2023: 12893 },
  { acNo: 56, name: 'Tandur', localName: 'తాండూరు', district: 'Vikarabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'B. Manohar Reddy', winnerVotes2023: 84662, runnerUp2023: 'BRS', runnerUpName2023: 'Pilot Rohith Reddy', margin2023: 6583 },

  // ─── HYDERABAD ───
  { acNo: 57, name: 'Musheerabad', localName: 'ముషీరాబాద్', district: 'Hyderabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Muta Gopal', winnerVotes2023: 75207, runnerUp2023: 'INC', runnerUpName2023: 'Anjan Kumar Yadav', margin2023: 37797 },
  { acNo: 58, name: 'Malakpet', localName: 'మలక్పేట', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Ahmed Bin Abdullah Balala', winnerVotes2023: 55805, runnerUp2023: 'INC', runnerUpName2023: 'Shaik Akbar', margin2023: 26106 },
  { acNo: 59, name: 'Amberpet', localName: 'అంబర్పేట', district: 'Hyderabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Kaleru Venkatesh', winnerVotes2023: 74416, runnerUp2023: 'BJP', runnerUpName2023: 'Chenaboyanna Krishna Yadav', margin2023: 24537 },
  { acNo: 60, name: 'Khairatabad', localName: 'ఖైరతాబాద్', district: 'Hyderabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Danam Nagender', winnerVotes2023: 67368, runnerUp2023: 'INC', runnerUpName2023: 'P Vijaya Reddy', margin2023: 22010, currentParty: 'INC', currentPartyChangeType: 'defection' },
  { acNo: 61, name: 'Jubilee Hills', localName: 'జూబ్లీహిల్స్', district: 'Hyderabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Maganti Gopinath', winnerVotes2023: 80549, runnerUp2023: 'INC', runnerUpName2023: 'Mohammed Azharuddin', margin2023: 16337 },
  { acNo: 62, name: 'Sanathnagar', localName: 'సనత్నగర్', district: 'Hyderabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Talasani Srinivas Yadav', winnerVotes2023: 72557, runnerUp2023: 'BJP', runnerUpName2023: 'Marri Shashidhar Reddy', margin2023: 41827 },
  { acNo: 63, name: 'Nampally', localName: 'నాంపల్లి', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Mohammed Majid Hussain', winnerVotes2023: 62185, runnerUp2023: 'INC', runnerUpName2023: 'Feroz Khan', margin2023: 2037 },
  { acNo: 64, name: 'Karwan', localName: 'కార్వాన్', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Kausar Mohiuddin', winnerVotes2023: 83388, runnerUp2023: 'BJP', runnerUpName2023: 'Amar Singh', margin2023: 41986 },
  { acNo: 65, name: 'Goshamahal', localName: 'గోషామహల్', district: 'Hyderabad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'T. Raja Singh', winnerVotes2023: 80182, runnerUp2023: 'BRS', runnerUpName2023: 'Nandu Bilal', margin2023: 21457 },
  { acNo: 66, name: 'Charminar', localName: 'చార్మినార్', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Mir Zulfeqar Ali', winnerVotes2023: 49103, runnerUp2023: 'BJP', runnerUpName2023: 'Megha Rani Agarwal', margin2023: 22853 },
  { acNo: 67, name: 'Chandrayangutta', localName: 'చంద్రాయణగుట్ట', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Akbar Uddin Owaisi', winnerVotes2023: 99776, runnerUp2023: 'BRS', runnerUpName2023: 'Sitharam Reddy Muppi', margin2023: 81660 },
  { acNo: 68, name: 'Yakutpura', localName: 'యాకుత్పురా', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Jaffar Hussain', winnerVotes2023: 46153, runnerUp2023: 'MBT', runnerUpName2023: 'Amjed Ullah Khan', margin2023: 878 },
  { acNo: 69, name: 'Bahadurpura', localName: 'బహదూర్పురా', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Mohammed Mubeen', winnerVotes2023: 89451, runnerUp2023: 'BRS', runnerUpName2023: 'Mir Inayath Ali Baqri', margin2023: 67025 },
  { acNo: 70, name: 'Secunderabad', localName: 'సికింద్రాబాద్', district: 'Hyderabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Padma Rao.T', winnerVotes2023: 78223, runnerUp2023: 'INC', runnerUpName2023: 'Adam Santhosh Kumar', margin2023: 45240 },
  { acNo: 71, name: 'Secunderabad Cantonment', localName: 'సికింద్రాబాద్ కంటోన్మెంట్', district: 'Hyderabad', type: 'SC', winner2023: 'BRS', winnerName2023: 'Lasya Nanditha Sayanna', winnerVotes2023: 59057, runnerUp2023: 'BJP', runnerUpName2023: 'Sriganesh. N', margin2023: 17169, currentParty: 'INC', currentMLA: 'Sri Ganesh Narayanan', currentPartyChangeType: 'by-election', byElection: { year: 2024, month: 'June', winnerName: 'Sri Ganesh Narayanan', winnerParty: 'INC' } },

  // ─── VIKARABAD (KODANGAL) / NARAYANPET / MAHABUBNAGAR / WANAPARTHY / JOGULAMBA GADWAL ───
  { acNo: 72, name: 'Kodangal', localName: 'కొడంగల్', district: 'Vikarabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Anumula Revanth Reddy', winnerVotes2023: 107429, runnerUp2023: 'BRS', runnerUpName2023: 'Patnam Narender Reddy', margin2023: 32532 },
  { acNo: 73, name: 'Narayanpet', localName: 'నారాయణపేట', district: 'Narayanpet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Chittem Parnika Reddy', winnerVotes2023: 84708, runnerUp2023: 'BRS', runnerUpName2023: 'S.Rajender Reddy', margin2023: 7951 },
  { acNo: 74, name: 'Mahbubnagar', localName: 'మహబూబ్నగర్', district: 'Mahabubnagar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Yennam Srinivas Reddy', winnerVotes2023: 87227, runnerUp2023: 'BRS', runnerUpName2023: 'V. Srinivas Goud', margin2023: 18738 },
  { acNo: 75, name: 'Jadcherla', localName: 'జడ్చర్ల', district: 'Mahabubnagar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Anirudh Reddy Janampalli', winnerVotes2023: 90865, runnerUp2023: 'BRS', runnerUpName2023: 'Charlakola Laxma Rreddy', margin2023: 15171 },
  { acNo: 76, name: 'Devarkadra', localName: 'దేవరకద్ర', district: 'Mahabubnagar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Gavinolla Madhusudan Reddy (gmr)', winnerVotes2023: 88551, runnerUp2023: 'BRS', runnerUpName2023: 'Alla Venkateswar Reddy', margin2023: 1392 },
  { acNo: 77, name: 'Makthal', localName: 'మక్తల్', district: 'Narayanpet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Vakiti Srihari', winnerVotes2023: 74917, runnerUp2023: 'BRS', runnerUpName2023: 'Chittem Ram Mohan Reddy', margin2023: 17525 },
  { acNo: 78, name: 'Wanaparthy', localName: 'వనపర్తి', district: 'Wanaparthy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Megha Reddy Tudi', winnerVotes2023: 107115, runnerUp2023: 'BRS', runnerUpName2023: 'Singireddy Niranjan Reddy', margin2023: 25320 },
  { acNo: 79, name: 'Gadwal', localName: 'గద్వాల్', district: 'Jogulamba Gadwal', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Bandla Krishna Mohan Reddy', winnerVotes2023: 94097, runnerUp2023: 'INC', runnerUpName2023: 'Saritha W/O Thirupataiah', margin2023: 7036, currentParty: 'INC', currentPartyChangeType: 'defection' },
  { acNo: 80, name: 'Alampur', localName: 'ఆలంపూర్', district: 'Jogulamba Gadwal', type: 'SC', winner2023: 'BRS', winnerName2023: 'Vijayudu', winnerVotes2023: 104060, runnerUp2023: 'INC', runnerUpName2023: 'S.A.Sampath Kumar', margin2023: 30573 },

  // ─── NAGARKURNOOL / RANGAREDDY / NALGONDA / SURYAPET / YADADRI BHUVANAGIRI ───
  { acNo: 81, name: 'Nagarkurnool', localName: 'నాగర్కర్నూల్', district: 'Nagarkurnool', type: 'GEN', winner2023: 'INC', winnerName2023: 'Dr. Kuchkulla Rajesh Reddy', winnerVotes2023: 87161, runnerUp2023: 'BRS', runnerUpName2023: 'Marri Janardhan Reddy', margin2023: 5248 },
  { acNo: 82, name: 'Achampet', localName: 'అచ్చంపేట్', district: 'Nagarkurnool', type: 'SC', winner2023: 'INC', winnerName2023: 'Chikkudu Vamshi Krishna', winnerVotes2023: 115337, runnerUp2023: 'BRS', runnerUpName2023: 'Guvvala Balaraju', margin2023: 49326 },
  { acNo: 83, name: 'Kalwakurthy', localName: 'కల్వకుర్తి', district: 'Rangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kasireddy Narayan Reddy', winnerVotes2023: 75858, runnerUp2023: 'BJP', runnerUpName2023: 'Achari Thalloju', margin2023: 5410 },
  { acNo: 84, name: 'Shadnagar', localName: 'షాద్నగర్', district: 'Rangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'K Shankaraiah', winnerVotes2023: 77817, runnerUp2023: 'BRS', runnerUpName2023: 'Anjaiah Yelganamoni', margin2023: 7128 },
  { acNo: 85, name: 'Kollapur', localName: 'కొల్లాపూర్', district: 'Nagarkurnool', type: 'GEN', winner2023: 'INC', winnerName2023: 'Jupally Krishna Rao', winnerVotes2023: 93609, runnerUp2023: 'BRS', runnerUpName2023: 'Beeram Harshavardhan Reddy', margin2023: 29931 },
  { acNo: 86, name: 'Devarakonda', localName: 'దేవరకొండ', district: 'Nalgonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Balu Naik Nenavath', winnerVotes2023: 111344, runnerUp2023: 'BRS', runnerUpName2023: 'Ravindra Kumar Ramavath', margin2023: 30021 },
  { acNo: 87, name: 'Nagarjuna Sagar', localName: 'నాగార్జున సాగర్', district: 'Nalgonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kunduru Jayaveer', winnerVotes2023: 119831, runnerUp2023: 'BRS', runnerUpName2023: 'Nomula Bhagath Kumar', margin2023: 55849 },
  { acNo: 88, name: 'Miryalaguda', localName: 'మిర్యాలగూడ', district: 'Nalgonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Bathula Laxma Reddy', winnerVotes2023: 114462, runnerUp2023: 'BRS', runnerUpName2023: 'Nallamothu Bhaskar Rao', margin2023: 48782 },
  { acNo: 89, name: 'Huzurnagar', localName: 'హుజూర్నగర్', district: 'Suryapet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Uttam Kumar Reddy Nalamada', winnerVotes2023: 116707, runnerUp2023: 'BRS', runnerUpName2023: 'Saidi Reddy Shanampudi', margin2023: 44888 },
  { acNo: 90, name: 'Kodad', localName: 'కోదాడ', district: 'Suryapet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Nalamada Padmavathi Reddy', winnerVotes2023: 125783, runnerUp2023: 'BRS', runnerUpName2023: 'Bollam. Mallaiah Yadav', margin2023: 58172 },
  { acNo: 91, name: 'Suryapet', localName: 'సూర్యాపేట', district: 'Suryapet', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Guntakandla Jagadish Reddy', winnerVotes2023: 75143, runnerUp2023: 'INC', runnerUpName2023: 'Damodar Reddy Ramreddy', margin2023: 4606 },
  { acNo: 92, name: 'Nalgonda', localName: 'నల్గొండ', district: 'Nalgonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Komati Reddy Venkat Reddy', winnerVotes2023: 107405, runnerUp2023: 'BRS', runnerUpName2023: 'Kancharla. Bhupal Reddy', margin2023: 54332 },
  { acNo: 93, name: 'Munugode', localName: 'మునుగోడు', district: 'Nalgonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Komatireddy Raj Gopal Reddy', winnerVotes2023: 119624, runnerUp2023: 'BRS', runnerUpName2023: 'Koosukuntla Prabhakar Reddy', margin2023: 40590 },
  { acNo: 94, name: 'Bhongir', localName: 'భోంగీర్', district: 'Yadadri Bhuvanagiri', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kumbam Anil Kumar Reddy', winnerVotes2023: 102742, runnerUp2023: 'BRS', runnerUpName2023: 'Pailla Shekar Reddy', margin2023: 26201 },
  { acNo: 95, name: 'Nakrekal', localName: 'నకిరేకల్', district: 'Nalgonda', type: 'SC', winner2023: 'INC', winnerName2023: 'Vemula Veeresham', winnerVotes2023: 133540, runnerUp2023: 'BRS', runnerUpName2023: 'Chirumarthy Lingaiah', margin2023: 68839 },
  { acNo: 96, name: 'Thungathurthi', localName: 'తుంగతుర్తి', district: 'Suryapet', type: 'SC', winner2023: 'INC', winnerName2023: 'Mandula Samel', winnerVotes2023: 129535, runnerUp2023: 'BRS', runnerUpName2023: 'Gadari Kishore Kumar', margin2023: 51094 },
  { acNo: 97, name: 'Alair', localName: 'ఆలేరు', district: 'Yadadri Bhuvanagiri', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ilaiah Beerla', winnerVotes2023: 122140, runnerUp2023: 'BRS', runnerUpName2023: 'Gongidi Sunitha', margin2023: 49636 },

  // ─── JANGAON / MAHABUBABAD / WARANGAL / HANAMKONDA ───
  { acNo: 98, name: 'Jangaon', localName: 'జనగామ', district: 'Jangaon', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Palla Rajeshwar Reddy', winnerVotes2023: 98975, runnerUp2023: 'INC', runnerUpName2023: 'Kommuri Pratap Reddy', margin2023: 15783 },
  { acNo: 99, name: 'Ghanpur Station', localName: 'స్టేషన్ ఘన్పూర్', district: 'Jangaon', type: 'SC', winner2023: 'BRS', winnerName2023: 'Kadiyam Srihari', winnerVotes2023: 101696, runnerUp2023: 'INC', runnerUpName2023: 'Indira Singapuram', margin2023: 7779, currentParty: 'INC', currentPartyChangeType: 'defection' },
  { acNo: 100, name: 'Palakurthi', localName: 'పాలకుర్తి', district: 'Jangaon', type: 'GEN', winner2023: 'INC', winnerName2023: 'Yashaswini Mamidala', winnerVotes2023: 126848, runnerUp2023: 'BRS', runnerUpName2023: 'Dayakar Rao Errabelli', margin2023: 47634 },
  { acNo: 101, name: 'Dornakal', localName: 'డోర్నకల్', district: 'Mahabubabad', type: 'ST', winner2023: 'INC', winnerName2023: 'Jatoth Ram Chander Naik', winnerVotes2023: 115587, runnerUp2023: 'BRS', runnerUpName2023: 'Dharamsoth Redya Naik', margin2023: 53131 },
  { acNo: 102, name: 'Mahabubabad', localName: 'మహబూబాబాద్', district: 'Mahabubabad', type: 'ST', winner2023: 'INC', winnerName2023: 'Dr. Murali Naik Bhukya', winnerVotes2023: 116644, runnerUp2023: 'BRS', runnerUpName2023: 'Banoth Shankar Naik', margin2023: 50171 },
  { acNo: 103, name: 'Narsampet', localName: 'నర్సంపేట', district: 'Warangal', type: 'GEN', winner2023: 'INC', winnerName2023: 'Donthi Madhava Reddy', winnerVotes2023: 104185, runnerUp2023: 'BRS', runnerUpName2023: 'Peddi Sudarshan Reddy', margin2023: 18889 },
  { acNo: 104, name: 'Parkal', localName: 'పరకాల', district: 'Warangal', type: 'GEN', winner2023: 'INC', winnerName2023: 'Revuri Prakash Reddy', winnerVotes2023: 72573, runnerUp2023: 'BRS', runnerUpName2023: 'Challa. Dharma Reddy.', margin2023: 7941 },
  { acNo: 105, name: 'Warangal West', localName: 'వరంగల్ పశ్చిమ', district: 'Hanamkonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Naini Rajender Reddy', winnerVotes2023: 72649, runnerUp2023: 'BRS', runnerUpName2023: 'Dasyam Vinay Bhasker', margin2023: 15331 },
  { acNo: 106, name: 'Warangal East', localName: 'వరంగల్ తూర్పు', district: 'Hanamkonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Konda Surekha', winnerVotes2023: 67757, runnerUp2023: 'BJP', runnerUpName2023: 'Errabelli Pradeep Kumar Rao', margin2023: 15652 },
  { acNo: 107, name: 'Wardhannapet', localName: 'వర్ధన్నపేట', district: 'Hanamkonda', type: 'SC', winner2023: 'INC', winnerName2023: 'K.R.Nagaraj.K', winnerVotes2023: 106696, runnerUp2023: 'BRS', runnerUpName2023: 'Aroori Ramesh', margin2023: 19458 },
  { acNo: 108, name: 'Bhupalpalle', localName: 'భూపాలపల్లి', district: 'Jayashankar Bhupalpally', type: 'GEN', winner2023: 'INC', winnerName2023: 'Gandra Satyanarayana Rao', winnerVotes2023: 123116, runnerUp2023: 'BRS', runnerUpName2023: 'Gandra Venkata Ramana Reddy', margin2023: 52699 },

  // ─── MULUGU / BHADRADRI KOTHAGUDEM / KHAMMAM ───
  { acNo: 109, name: 'Mulug', localName: 'ములుగు', district: 'Mulugu', type: 'ST', winner2023: 'INC', winnerName2023: 'Anasuya Seethakka Danasari', winnerVotes2023: 102267, runnerUp2023: 'BRS', runnerUpName2023: 'Bade Nagajyothi', margin2023: 33700 },
  { acNo: 110, name: 'Pinapaka', localName: 'పినపాక', district: 'Bhadradri Kothagudem', type: 'ST', winner2023: 'INC', winnerName2023: 'Payam Venkateswarlu', winnerVotes2023: 90510, runnerUp2023: 'BRS', runnerUpName2023: 'Kantha Rao Rega', margin2023: 34506 },
  { acNo: 111, name: 'Yellandu', localName: 'ఇల్లందు', district: 'Bhadradri Kothagudem', type: 'ST', winner2023: 'INC', winnerName2023: 'Koram Kanakaiah', winnerVotes2023: 109171, runnerUp2023: 'BRS', runnerUpName2023: 'Banoth Hari Priya', margin2023: 57309 },
  { acNo: 112, name: 'Khammam', localName: 'ఖమ్మం', district: 'Khammam', type: 'GEN', winner2023: 'INC', winnerName2023: 'Tummala Nageswara Rao', winnerVotes2023: 136016, runnerUp2023: 'BRS', runnerUpName2023: 'Ajay Kumar Puvvada', margin2023: 49381 },
  { acNo: 113, name: 'Palair', localName: 'పాలేరు', district: 'Khammam', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ponguleti Srinivasa Reddy', winnerVotes2023: 127820, runnerUp2023: 'BRS', runnerUpName2023: 'Kandala Upender Reddy', margin2023: 56650 },
  { acNo: 114, name: 'Madhira', localName: 'మధిర', district: 'Khammam', type: 'SC', winner2023: 'INC', winnerName2023: 'Bhatti Vikramarka Mallu', winnerVotes2023: 108970, runnerUp2023: 'BRS', runnerUpName2023: 'Kamal Raju Lingala', margin2023: 35452 },
  { acNo: 115, name: 'Wyra', localName: 'వైరా', district: 'Khammam', type: 'ST', winner2023: 'INC', winnerName2023: 'Ramdas Maloth', winnerVotes2023: 93913, runnerUp2023: 'BRS', runnerUpName2023: 'Madanlal Banoth', margin2023: 33045 },
  { acNo: 116, name: 'Sathupalli', localName: 'సత్తుపల్లి', district: 'Khammam', type: 'SC', winner2023: 'INC', winnerName2023: 'Matta Ragamayee', winnerVotes2023: 111245, runnerUp2023: 'BRS', runnerUpName2023: 'Sandra Venkata Veeraiah', margin2023: 19440 },
  { acNo: 117, name: 'Kothagudem', localName: 'కొత్తగూడెం', district: 'Bhadradri Kothagudem', type: 'GEN', winner2023: 'CPI', winnerName2023: 'Kunamneni Sambasiva Rao', winnerVotes2023: 80336, runnerUp2023: 'AIFB', runnerUpName2023: 'Jalagam Venkat Rao', margin2023: 26547 },
  { acNo: 118, name: 'Aswaraopeta', localName: 'అశ్వారావుపేట', district: 'Bhadradri Kothagudem', type: 'ST', winner2023: 'INC', winnerName2023: 'Adinarayana. Jare', winnerVotes2023: 74993, runnerUp2023: 'BRS', runnerUpName2023: 'Mecha Nageswara Rao', margin2023: 28905 },
  { acNo: 119, name: 'Bhadrachalam', localName: 'భద్రాచలం', district: 'Bhadradri Kothagudem', type: 'ST', winner2023: 'BRS', winnerName2023: 'Dr. Tellam Venkata Rao', winnerVotes2023: 53252, runnerUp2023: 'INC', runnerUpName2023: 'Podem Veeraiah', margin2023: 5719, currentParty: 'INC', currentPartyChangeType: 'defection' },
];
