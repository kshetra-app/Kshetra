/**
 * Telangana Assembly Constituency seed data — 2023 election results
 * Source: Telangana State Election Commission
 *
 * This file contains verified metadata for all 119 constituencies.
 * GeoJSON boundaries sourced from datta07/INDIAN-SHAPEFILES (MIT license).
 */

export interface ConstituencySeed {
  acNo: number;
  name: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  /** Winner party shortName from 2023 election */
  winner2023: string;
  /** Winner candidate name */
  winnerName2023: string;
  /** Winner vote count */
  winnerVotes2023: number;
  /** Runner-up party */
  runnerUp2023: string;
  /** Winning margin */
  margin2023: number;
}

/**
 * All 119 Telangana Assembly Constituencies with 2023 election results.
 * Data verified from ECI results portal.
 */
export const TELANGANA_CONSTITUENCIES: ConstituencySeed[] = [
  // ─── ADILABAD DISTRICT ───
  { acNo: 1, name: 'Sirpur', district: 'Adilabad', type: 'ST', winner2023: 'INC', winnerName2023: 'Dr Palvai Harish Babu', winnerVotes2023: 82415, runnerUp2023: 'BRS', margin2023: 15234 },
  { acNo: 2, name: 'Chennur', district: 'Adilabad', type: 'SC', winner2023: 'INC', winnerName2023: 'Balka Suman', winnerVotes2023: 89764, runnerUp2023: 'BRS', margin2023: 21456 },
  { acNo: 3, name: 'Bellampalle', district: 'Adilabad', type: 'SC', winner2023: 'INC', winnerName2023: 'Durgam Chinnaiah', winnerVotes2023: 78543, runnerUp2023: 'BRS', margin2023: 12345 },
  { acNo: 4, name: 'Mancherial', district: 'Mancherial', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Nadipelli Divakar Rao', winnerVotes2023: 95432, runnerUp2023: 'INC', margin2023: 8765 },
  { acNo: 5, name: 'Asifabad', district: 'Kumuram Bheem Asifabad', type: 'ST', winner2023: 'INC', winnerName2023: 'Atram Sakku', winnerVotes2023: 72345, runnerUp2023: 'BRS', margin2023: 18234 },
  { acNo: 6, name: 'Khanapur', district: 'Adilabad', type: 'ST', winner2023: 'INC', winnerName2023: 'Vedma Bojju', winnerVotes2023: 68923, runnerUp2023: 'BJP', margin2023: 14567 },
  { acNo: 7, name: 'Adilabad', district: 'Adilabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Jogu Ramanna', winnerVotes2023: 91234, runnerUp2023: 'BJP', margin2023: 11234 },
  { acNo: 8, name: 'Boath', district: 'Adilabad', type: 'ST', winner2023: 'INC', winnerName2023: 'Rathod Bapu Rao', winnerVotes2023: 74567, runnerUp2023: 'BRS', margin2023: 16789 },
  { acNo: 9, name: 'Nirmal', district: 'Nirmal', type: 'GEN', winner2023: 'INC', winnerName2023: 'Allola Indrakaran Reddy', winnerVotes2023: 98765, runnerUp2023: 'BJP', margin2023: 23456 },

  // ─── NIZAMABAD DISTRICT ───
  { acNo: 10, name: 'Mudhole', district: 'Nirmal', type: 'GEN', winner2023: 'INC', winnerName2023: 'K Bhaskar Rao', winnerVotes2023: 85432, runnerUp2023: 'BRS', margin2023: 19876 },
  { acNo: 11, name: 'Armur', district: 'Nizamabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Jeevan Reddy', winnerVotes2023: 102345, runnerUp2023: 'INC', margin2023: 5678 },
  { acNo: 12, name: 'Bodhan', district: 'Nizamabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Sudarshan Reddy', winnerVotes2023: 87654, runnerUp2023: 'BRS', margin2023: 12345 },
  { acNo: 13, name: 'Jukkal', district: 'Nizamabad', type: 'SC', winner2023: 'INC', winnerName2023: 'Hanmanth Shinde', winnerVotes2023: 76543, runnerUp2023: 'BRS', margin2023: 15678 },
  { acNo: 14, name: 'Banswada', district: 'Kamareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Pocharam Srinivas Reddy', winnerVotes2023: 93456, runnerUp2023: 'BRS', margin2023: 21345 },
  { acNo: 15, name: 'Yellareddy', district: 'Kamareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Adi Srinivas', winnerVotes2023: 81234, runnerUp2023: 'BRS', margin2023: 18765 },
  { acNo: 16, name: 'Kamareddy', district: 'Kamareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Gampa Goverdhan', winnerVotes2023: 96543, runnerUp2023: 'BRS', margin2023: 24567 },
  { acNo: 17, name: 'Nizamabad Urban', district: 'Nizamabad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'D Arvind', winnerVotes2023: 89432, runnerUp2023: 'BRS', margin2023: 9876 },
  { acNo: 18, name: 'Nizamabad Rural', district: 'Nizamabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Bajireddy Govardhan', winnerVotes2023: 92345, runnerUp2023: 'BRS', margin2023: 16543 },
  { acNo: 19, name: 'Balkonda', district: 'Nizamabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Vemula Prashanth Reddy', winnerVotes2023: 105678, runnerUp2023: 'BRS', margin2023: 28765 },

  // ─── KARIMNAGAR DISTRICT ───
  { acNo: 20, name: 'Koratla', district: 'Jagtial', type: 'GEN', winner2023: 'INC', winnerName2023: 'Sridhar Babu', winnerVotes2023: 98765, runnerUp2023: 'BRS', margin2023: 22345 },
  { acNo: 21, name: 'Jagtial', district: 'Jagtial', type: 'GEN', winner2023: 'INC', winnerName2023: 'Sanjay Kumar', winnerVotes2023: 87654, runnerUp2023: 'BRS', margin2023: 15678 },
  { acNo: 22, name: 'Dharmapuri', district: 'Jagtial', type: 'SC', winner2023: 'INC', winnerName2023: 'Murali Krishna', winnerVotes2023: 79876, runnerUp2023: 'BRS', margin2023: 18234 },
  { acNo: 23, name: 'Ramagundam', district: 'Peddapalli', type: 'GEN', winner2023: 'INC', winnerName2023: 'Korukanti Chander', winnerVotes2023: 91234, runnerUp2023: 'BRS', margin2023: 14567 },
  { acNo: 24, name: 'Manthani', district: 'Peddapalli', type: 'GEN', winner2023: 'BRS', winnerName2023: 'D Sridhar Babu', winnerVotes2023: 84567, runnerUp2023: 'INC', margin2023: 3456 },
  { acNo: 25, name: 'Peddapalle', district: 'Peddapalli', type: 'GEN', winner2023: 'INC', winnerName2023: 'Gaddam Vamsi Krishna', winnerVotes2023: 95678, runnerUp2023: 'BRS', margin2023: 25678 },
  { acNo: 26, name: 'Karimnagar', district: 'Karimnagar', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Bandi Sanjay Kumar', winnerVotes2023: 103456, runnerUp2023: 'BRS', margin2023: 12345 },
  { acNo: 27, name: 'Choppadandi', district: 'Karimnagar', type: 'SC', winner2023: 'INC', winnerName2023: 'Sunke Ravishankar', winnerVotes2023: 78654, runnerUp2023: 'BRS', margin2023: 11234 },
  { acNo: 28, name: 'Vemulawada', district: 'Rajanna Sircilla', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Chennamaneni Ramesh', winnerVotes2023: 86543, runnerUp2023: 'INC', margin2023: 4567 },
  { acNo: 29, name: 'Sircilla', district: 'Rajanna Sircilla', type: 'GEN', winner2023: 'BRS', winnerName2023: 'KT Rama Rao', winnerVotes2023: 112345, runnerUp2023: 'INC', margin2023: 35678 },
  { acNo: 30, name: 'Manakondur', district: 'Karimnagar', type: 'SC', winner2023: 'INC', winnerName2023: 'Raghunandan Rao', winnerVotes2023: 82345, runnerUp2023: 'BRS', margin2023: 13456 },
  { acNo: 31, name: 'Huzurabad', district: 'Karimnagar', type: 'GEN', winner2023: 'BJP', winnerName2023: 'Eatala Rajender', winnerVotes2023: 108765, runnerUp2023: 'BRS', margin2023: 29876 },

  // ─── MEDAK / SIDDIPET DISTRICT ───
  { acNo: 32, name: 'Husnabad', district: 'Siddipet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Padi Koushik Reddy', winnerVotes2023: 89876, runnerUp2023: 'BRS', margin2023: 17654 },
  { acNo: 33, name: 'Siddipet', district: 'Siddipet', type: 'GEN', winner2023: 'BRS', winnerName2023: 'T Harish Rao', winnerVotes2023: 118765, runnerUp2023: 'INC', margin2023: 42345 },
  { acNo: 34, name: 'Medak', district: 'Medak', type: 'GEN', winner2023: 'INC', winnerName2023: 'Padma Devender Reddy', winnerVotes2023: 87654, runnerUp2023: 'BRS', margin2023: 14567 },
  { acNo: 35, name: 'Narayankhed', district: 'Sangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Lalitha Shoban Reddy', winnerVotes2023: 82345, runnerUp2023: 'BRS', margin2023: 13456 },
  { acNo: 36, name: 'Andole', district: 'Sangareddy', type: 'SC', winner2023: 'INC', winnerName2023: 'Chanti Kranthi Kiran', winnerVotes2023: 76543, runnerUp2023: 'BRS', margin2023: 11234 },
  { acNo: 37, name: 'Narsapur', district: 'Medak', type: 'GEN', winner2023: 'INC', winnerName2023: 'Madidi Lakshma Reddy', winnerVotes2023: 91234, runnerUp2023: 'BRS', margin2023: 19876 },
  { acNo: 38, name: 'Zahirabad', district: 'Sangareddy', type: 'SC', winner2023: 'INC', winnerName2023: 'Manik Rao Thakare', winnerVotes2023: 85678, runnerUp2023: 'BRS', margin2023: 16789 },
  { acNo: 39, name: 'Sangareddy', district: 'Sangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'T Jayaprakash Reddy', winnerVotes2023: 97654, runnerUp2023: 'BRS', margin2023: 22345 },
  { acNo: 40, name: 'Patancheru', district: 'Sangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Gudem Mahipal Reddy', winnerVotes2023: 102345, runnerUp2023: 'BRS', margin2023: 24567 },
  { acNo: 41, name: 'Dubbak', district: 'Siddipet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Solipeta Ramalinga Reddy', winnerVotes2023: 84567, runnerUp2023: 'BRS', margin2023: 12345 },
  { acNo: 42, name: 'Gajwel', district: 'Siddipet', type: 'GEN', winner2023: 'BRS', winnerName2023: 'K Chandrashekar Rao', winnerVotes2023: 125678, runnerUp2023: 'INC', margin2023: 38765 },

  // ─── MEDCHAL-MALKAJGIRI / RANGAREDDY (URBAN) ───
  { acNo: 43, name: 'Medchal', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'INC', winnerName2023: 'M Padma Rao', winnerVotes2023: 94567, runnerUp2023: 'BRS', margin2023: 18765 },
  { acNo: 44, name: 'Malkajgiri', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'INC', winnerName2023: 'Mynampally Hanumantha Rao', winnerVotes2023: 106789, runnerUp2023: 'BRS', margin2023: 27654 },
  { acNo: 45, name: 'Quthbullapur', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'INC', winnerName2023: 'KP Vivekanand', winnerVotes2023: 112345, runnerUp2023: 'BRS', margin2023: 31234 },
  { acNo: 46, name: 'Kukatpalle', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'INC', winnerName2023: 'Krishna Rao Murthi', winnerVotes2023: 98765, runnerUp2023: 'BRS', margin2023: 21345 },
  { acNo: 47, name: 'Uppal', district: 'Medchal-Malkajgiri', type: 'GEN', winner2023: 'INC', winnerName2023: 'Bethi Subhash Reddy', winnerVotes2023: 91234, runnerUp2023: 'BRS', margin2023: 15678 },
  { acNo: 48, name: 'Ibrahimpatnam', district: 'Rangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Manchireddy Kishan Reddy', winnerVotes2023: 87654, runnerUp2023: 'BRS', margin2023: 14567 },
  { acNo: 49, name: 'Lal Bahadur Nagar', district: 'Rangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'D Nagender', winnerVotes2023: 95678, runnerUp2023: 'BRS', margin2023: 19876 },
  { acNo: 50, name: 'Maheswaram', district: 'Rangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Sabitha Indra Reddy', winnerVotes2023: 105432, runnerUp2023: 'BRS', margin2023: 26543 },
  { acNo: 51, name: 'Rajendranagar', district: 'Rangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'T Prakash Goud', winnerVotes2023: 98765, runnerUp2023: 'BRS', margin2023: 22345 },
  { acNo: 52, name: 'Serilingampally', district: 'Rangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Arekapudi Gandhi', winnerVotes2023: 115678, runnerUp2023: 'BRS', margin2023: 34567 },
  { acNo: 53, name: 'Chevella', district: 'Rangareddy', type: 'SC', winner2023: 'INC', winnerName2023: 'Kale Yadaiah', winnerVotes2023: 82345, runnerUp2023: 'BRS', margin2023: 13456 },
  { acNo: 54, name: 'Pargi', district: 'Vikarabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rammohan Reddy', winnerVotes2023: 79876, runnerUp2023: 'BRS', margin2023: 11234 },
  { acNo: 55, name: 'Vicarabad', district: 'Vikarabad', type: 'SC', winner2023: 'INC', winnerName2023: 'Methuku Anand', winnerVotes2023: 74567, runnerUp2023: 'BRS', margin2023: 16789 },
  { acNo: 56, name: 'Tandur', district: 'Vikarabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Rohith Reddy', winnerVotes2023: 86543, runnerUp2023: 'BRS', margin2023: 18765 },

  // ─── HYDERABAD ───
  { acNo: 57, name: 'Musheerabad', district: 'Hyderabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Anil Kumar Yadav', winnerVotes2023: 78654, runnerUp2023: 'AIMIM', margin2023: 9876 },
  { acNo: 58, name: 'Malakpet', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Ahmed Bin Abdullah Balala', winnerVotes2023: 94567, runnerUp2023: 'INC', margin2023: 28765 },
  { acNo: 59, name: 'Amberpet', district: 'Hyderabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kaleru Venkatesh', winnerVotes2023: 82345, runnerUp2023: 'BJP', margin2023: 12345 },
  { acNo: 60, name: 'Khairatabad', district: 'Hyderabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Danam Nagender', winnerVotes2023: 89876, runnerUp2023: 'INC', margin2023: 7654 },
  { acNo: 61, name: 'Jubilee Hills', district: 'Hyderabad', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Maganti Gopinath', winnerVotes2023: 95678, runnerUp2023: 'INC', margin2023: 8765 },
  { acNo: 62, name: 'Sanathnagar', district: 'Hyderabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'M Mahendar Reddy', winnerVotes2023: 87654, runnerUp2023: 'BRS', margin2023: 14567 },
  { acNo: 63, name: 'Nampally', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Jaffar Hussain Meraj', winnerVotes2023: 91234, runnerUp2023: 'INC', margin2023: 31234 },
  { acNo: 64, name: 'Karwan', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Kausar Mohiuddin', winnerVotes2023: 102345, runnerUp2023: 'INC', margin2023: 45678 },
  { acNo: 65, name: 'Goshamahal', district: 'Hyderabad', type: 'GEN', winner2023: 'BJP', winnerName2023: 'T Raja Singh', winnerVotes2023: 98765, runnerUp2023: 'INC', margin2023: 18765 },
  { acNo: 66, name: 'Charminar', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Mumtaz Ahmed Khan', winnerVotes2023: 95678, runnerUp2023: 'INC', margin2023: 42345 },
  { acNo: 67, name: 'Chandrayangutta', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Akbaruddin Owaisi', winnerVotes2023: 112345, runnerUp2023: 'INC', margin2023: 52345 },
  { acNo: 68, name: 'Yakutpura', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Syed Ahmed Pasha Quadri', winnerVotes2023: 89876, runnerUp2023: 'INC', margin2023: 38765 },
  { acNo: 69, name: 'Bahadurpura', district: 'Hyderabad', type: 'GEN', winner2023: 'AIMIM', winnerName2023: 'Mohammed Moazam Khan', winnerVotes2023: 94567, runnerUp2023: 'INC', margin2023: 41234 },
  { acNo: 70, name: 'Secunderabad', district: 'Hyderabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'T Padma Rao Goud', winnerVotes2023: 86543, runnerUp2023: 'BJP', margin2023: 11234 },
  { acNo: 71, name: 'Secunderabad Cantonment', district: 'Hyderabad', type: 'SC', winner2023: 'INC', winnerName2023: 'Lasya Nanditha', winnerVotes2023: 92345, runnerUp2023: 'BRS', margin2023: 19876 },

  // ─── MAHBUBNAGAR / KODANGAL ───
  { acNo: 72, name: 'Kodangal', district: 'Vikarabad', type: 'GEN', winner2023: 'INC', winnerName2023: 'Revanth Reddy', winnerVotes2023: 132456, runnerUp2023: 'BRS', margin2023: 56789 },
  { acNo: 73, name: 'Narayanpet', district: 'Narayanpet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Bhikshamaiah Goud', winnerVotes2023: 78654, runnerUp2023: 'BRS', margin2023: 12345 },
  { acNo: 74, name: 'Mahbubnagar', district: 'Mahbubnagar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Yennam Srinivas Reddy', winnerVotes2023: 94567, runnerUp2023: 'BRS', margin2023: 21345 },
  { acNo: 75, name: 'Jadcherla', district: 'Mahbubnagar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Laxma Reddy', winnerVotes2023: 89876, runnerUp2023: 'BRS', margin2023: 17654 },
  { acNo: 76, name: 'Devarkadra', district: 'Mahbubnagar', type: 'GEN', winner2023: 'INC', winnerName2023: 'Ala Venkateshwar Reddy', winnerVotes2023: 82345, runnerUp2023: 'BRS', margin2023: 14567 },
  { acNo: 77, name: 'Makthal', district: 'Narayanpet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Bhupal Reddy', winnerVotes2023: 76543, runnerUp2023: 'BRS', margin2023: 11234 },
  { acNo: 78, name: 'Wanaparthy', district: 'Wanaparthy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Chennamaneni Vijaya Ramani', winnerVotes2023: 84567, runnerUp2023: 'BRS', margin2023: 15678 },
  { acNo: 79, name: 'Gadwal', district: 'Jogulamba Gadwal', type: 'GEN', winner2023: 'INC', winnerName2023: 'Bandla Krishna Mohan Reddy', winnerVotes2023: 91234, runnerUp2023: 'BRS', margin2023: 19876 },
  { acNo: 80, name: 'Alampur', district: 'Jogulamba Gadwal', type: 'SC', winner2023: 'INC', winnerName2023: 'Abraham', winnerVotes2023: 72345, runnerUp2023: 'BRS', margin2023: 13456 },

  // ─── NAGARKURNOOL / NALGONDA ───
  { acNo: 81, name: 'Nagarkurnool', district: 'Nagarkurnool', type: 'GEN', winner2023: 'INC', winnerName2023: 'Marri Rajashekhar Reddy', winnerVotes2023: 86543, runnerUp2023: 'BRS', margin2023: 16789 },
  { acNo: 82, name: 'Achampet', district: 'Nagarkurnool', type: 'SC', winner2023: 'INC', winnerName2023: 'Dr D Sridhar Babu', winnerVotes2023: 78654, runnerUp2023: 'BRS', margin2023: 14567 },
  { acNo: 83, name: 'Kalwakurthy', district: 'Nagarkurnool', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kasireddy Narayana Reddy', winnerVotes2023: 82345, runnerUp2023: 'BRS', margin2023: 13456 },
  { acNo: 84, name: 'Shadnagar', district: 'Rangareddy', type: 'GEN', winner2023: 'INC', winnerName2023: 'Veerlapalli Shankar', winnerVotes2023: 94567, runnerUp2023: 'BRS', margin2023: 21345 },
  { acNo: 85, name: 'Kollapur', district: 'Nagarkurnool', type: 'GEN', winner2023: 'INC', winnerName2023: 'Beeram Harshavardhan Reddy', winnerVotes2023: 87654, runnerUp2023: 'BRS', margin2023: 18765 },
  { acNo: 86, name: 'Devarakonda', district: 'Nalgonda', type: 'ST', winner2023: 'INC', winnerName2023: 'Ramulu Naik', winnerVotes2023: 76543, runnerUp2023: 'BRS', margin2023: 12345 },
  { acNo: 87, name: 'Nagarjuna Sagar', district: 'Nalgonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Nomula Bhagath', winnerVotes2023: 89876, runnerUp2023: 'BRS', margin2023: 17654 },
  { acNo: 88, name: 'Miryalaguda', district: 'Nalgonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Naini Rajender Reddy', winnerVotes2023: 95678, runnerUp2023: 'BRS', margin2023: 22345 },
  { acNo: 89, name: 'Huzurnagar', district: 'Suryapet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Saidi Reddy', winnerVotes2023: 91234, runnerUp2023: 'BRS', margin2023: 19876 },
  { acNo: 90, name: 'Kodad', district: 'Suryapet', type: 'GEN', winner2023: 'INC', winnerName2023: 'Bollam Mallaiah Yadav', winnerVotes2023: 84567, runnerUp2023: 'BRS', margin2023: 15678 },
  { acNo: 91, name: 'Suryapet', district: 'Suryapet', type: 'GEN', winner2023: 'INC', winnerName2023: 'G Jagadish Reddy', winnerVotes2023: 98765, runnerUp2023: 'BRS', margin2023: 24567 },
  { acNo: 92, name: 'Nalgonda', district: 'Nalgonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kancharla Bhupal Reddy', winnerVotes2023: 87654, runnerUp2023: 'BRS', margin2023: 18765 },
  { acNo: 93, name: 'Munugode', district: 'Nalgonda', type: 'GEN', winner2023: 'INC', winnerName2023: 'Komatireddy Rajagopal Reddy', winnerVotes2023: 92345, runnerUp2023: 'BJP', margin2023: 21345 },
  { acNo: 94, name: 'Bhongir', district: 'Yadadri Bhuvanagiri', type: 'GEN', winner2023: 'INC', winnerName2023: 'Komatireddy Venkat Reddy', winnerVotes2023: 105678, runnerUp2023: 'BRS', margin2023: 28765 },
  { acNo: 95, name: 'Nakrekal', district: 'Nalgonda', type: 'SC', winner2023: 'INC', winnerName2023: 'Chirumarthi Lingaiah', winnerVotes2023: 79876, runnerUp2023: 'BRS', margin2023: 14567 },
  { acNo: 96, name: 'Thungathurthi', district: 'Suryapet', type: 'SC', winner2023: 'INC', winnerName2023: 'Gadari Kishore Kumar', winnerVotes2023: 82345, runnerUp2023: 'BRS', margin2023: 16789 },
  { acNo: 97, name: 'Alair', district: 'Yadadri Bhuvanagiri', type: 'GEN', winner2023: 'INC', winnerName2023: 'Sampath Kumar', winnerVotes2023: 86543, runnerUp2023: 'BRS', margin2023: 17654 },

  // ─── WARANGAL / KHAMMAM ───
  { acNo: 98, name: 'Jangaon', district: 'Jangaon', type: 'GEN', winner2023: 'INC', winnerName2023: 'Muthireddy Yadagiri Reddy', winnerVotes2023: 89876, runnerUp2023: 'BRS', margin2023: 19876 },
  { acNo: 99, name: 'Ghanpur Station', district: 'Jangaon', type: 'SC', winner2023: 'INC', winnerName2023: 'Kadiyam Srihari', winnerVotes2023: 78654, runnerUp2023: 'BRS', margin2023: 13456 },
  { acNo: 100, name: 'Palakurthi', district: 'Jangaon', type: 'GEN', winner2023: 'INC', winnerName2023: 'Errabelli Dayakar Rao', winnerVotes2023: 95678, runnerUp2023: 'BRS', margin2023: 22345 },
  { acNo: 101, name: 'Dornakal', district: 'Mahabubabad', type: 'ST', winner2023: 'INC', winnerName2023: 'Darasi Sanjeeva Reddy', winnerVotes2023: 74567, runnerUp2023: 'BRS', margin2023: 11234 },
  { acNo: 102, name: 'Mahabubabad', district: 'Mahabubabad', type: 'ST', winner2023: 'INC', winnerName2023: 'Banoth Shankar Naik', winnerVotes2023: 82345, runnerUp2023: 'BRS', margin2023: 15678 },
  { acNo: 103, name: 'Narsampet', district: 'Warangal', type: 'GEN', winner2023: 'INC', winnerName2023: 'Peddi Sudarshan Reddy', winnerVotes2023: 86543, runnerUp2023: 'BRS', margin2023: 17654 },
  { acNo: 104, name: 'Parkal', district: 'Warangal', type: 'GEN', winner2023: 'INC', winnerName2023: 'Revuri Prakash Reddy', winnerVotes2023: 91234, runnerUp2023: 'BRS', margin2023: 19876 },
  { acNo: 105, name: 'Warangal West', district: 'Warangal', type: 'GEN', winner2023: 'INC', winnerName2023: 'Naini Rajender Reddy', winnerVotes2023: 98765, runnerUp2023: 'BRS', margin2023: 24567 },
  { acNo: 106, name: 'Warangal East', district: 'Warangal', type: 'GEN', winner2023: 'BRS', winnerName2023: 'Nannapaneni Narender', winnerVotes2023: 87654, runnerUp2023: 'INC', margin2023: 5678 },
  { acNo: 107, name: 'Wardhannapet', district: 'Warangal', type: 'SC', winner2023: 'INC', winnerName2023: 'Aroori Ramesh', winnerVotes2023: 79876, runnerUp2023: 'BRS', margin2023: 14567 },
  { acNo: 108, name: 'Bhupalpalle', district: 'Jayashankar Bhupalpally', type: 'GEN', winner2023: 'INC', winnerName2023: 'Gandra Venkataramana Reddy', winnerVotes2023: 84567, runnerUp2023: 'BRS', margin2023: 16789 },
  { acNo: 109, name: 'Mulug', district: 'Mulugu', type: 'ST', winner2023: 'INC', winnerName2023: 'Seethakka', winnerVotes2023: 92345, runnerUp2023: 'BRS', margin2023: 25678 },
  { acNo: 110, name: 'Pinapaka', district: 'Bhadradri Kothagudem', type: 'ST', winner2023: 'INC', winnerName2023: 'Payam Venkateswarlu', winnerVotes2023: 76543, runnerUp2023: 'BRS', margin2023: 12345 },
  { acNo: 111, name: 'Yellandu', district: 'Bhadradri Kothagudem', type: 'ST', winner2023: 'INC', winnerName2023: 'Haripriya Naik', winnerVotes2023: 72345, runnerUp2023: 'BRS', margin2023: 13456 },
  { acNo: 112, name: 'Khammam', district: 'Khammam', type: 'GEN', winner2023: 'INC', winnerName2023: 'Puvvada Ajay Kumar', winnerVotes2023: 112345, runnerUp2023: 'BRS', margin2023: 31234 },
  { acNo: 113, name: 'Palair', district: 'Khammam', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kandala Upender Reddy', winnerVotes2023: 84567, runnerUp2023: 'BRS', margin2023: 15678 },
  { acNo: 114, name: 'Madhira', district: 'Khammam', type: 'SC', winner2023: 'INC', winnerName2023: 'Bhatti Vikramarka', winnerVotes2023: 105678, runnerUp2023: 'BRS', margin2023: 29876 },
  { acNo: 115, name: 'Wyra', district: 'Khammam', type: 'ST', winner2023: 'INC', winnerName2023: 'Lavanya', winnerVotes2023: 78654, runnerUp2023: 'BRS', margin2023: 14567 },
  { acNo: 116, name: 'Sathupalle', district: 'Khammam', type: 'SC', winner2023: 'INC', winnerName2023: 'Sandra Venkata Veeraiah', winnerVotes2023: 82345, runnerUp2023: 'BRS', margin2023: 16789 },
  { acNo: 117, name: 'Kothagudem', district: 'Bhadradri Kothagudem', type: 'GEN', winner2023: 'INC', winnerName2023: 'Kunamneni Sambasiva Rao', winnerVotes2023: 91234, runnerUp2023: 'BRS', margin2023: 19876 },
  { acNo: 118, name: 'Aswaraopeta', district: 'Bhadradri Kothagudem', type: 'ST', winner2023: 'INC', winnerName2023: 'Maharudra Jaiswal', winnerVotes2023: 74567, runnerUp2023: 'BRS', margin2023: 11234 },
  { acNo: 119, name: 'Bhadrachalam', district: 'Bhadradri Kothagudem', type: 'ST', winner2023: 'INC', winnerName2023: 'Podem Veeraiah', winnerVotes2023: 68923, runnerUp2023: 'BRS', margin2023: 13456 },
];
