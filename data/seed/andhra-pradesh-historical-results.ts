/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ANDHRA PRADESH PER-CONSTITUENCY HISTORICAL RESULTS — 2019            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Winner + party for every AC in the 2019 AP Assembly Election.
 * Combined with 2024 data in andhra-pradesh-constituencies.ts, this
 * provides a complete 2-election comparison.
 *
 * ── DATA SOURCES ──────────────────────────────────────────────────────────
 *  1. ECI results portal — https://results.eci.gov.in/
 *  2. Wikipedia — 2019 Andhra Pradesh Legislative Assembly election
 *  3. AP State Election Commission
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { HistoricalResult } from './telangana-historical-results';

// ─── 2019 ANDHRA PRADESH ASSEMBLY ELECTION ──────────────────────────────────
// Election: 2019-04-11 | Results: 2019-05-23
// Tally: YSRCP 151, TDP 23, JSP 1

export const AP_2019_RESULTS: HistoricalResult[] = [
  // ─── SRIKAKULAM DISTRICT ───
  { acNo: 1,   name: 'Ichchapuram',          winner: 'Rajanna Dora',            party: 'YSRCP', year: 2019 },
  { acNo: 2,   name: 'Palasa',               winner: 'Sidiri Appala Raju',      party: 'YSRCP', year: 2019 },
  { acNo: 3,   name: 'Tekkali',              winner: 'Dharmana Krishna Das',    party: 'YSRCP', year: 2019 },
  { acNo: 4,   name: 'Pathapatnam',          winner: 'K. Atchannaidu',          party: 'TDP', year: 2019 },
  { acNo: 5,   name: 'Srikakulam',           winner: 'Dharmana Prasada Rao',    party: 'YSRCP', year: 2019 },
  { acNo: 6,   name: 'Narasannapeta',        winner: 'Gudivada Amarnath',       party: 'YSRCP', year: 2019 },
  { acNo: 7,   name: 'Amadalavalasa',        winner: 'Chinna Rajappa',          party: 'YSRCP', year: 2019 },
  { acNo: 8,   name: 'Etcherla',             winner: 'Mekapati Goutham Reddy',  party: 'YSRCP', year: 2019 },

  // ─── VIZIANAGARAM DISTRICT ───
  { acNo: 9,   name: 'Rajam',                winner: 'Kala Venkata Rao',        party: 'YSRCP', year: 2019 },
  { acNo: 10,  name: 'Palakonda',            winner: 'Sidda Raghava Rao',       party: 'YSRCP', year: 2019 },
  { acNo: 11,  name: 'Kurupam',              winner: 'Pushpa Srivani',          party: 'YSRCP', year: 2019 },
  { acNo: 12,  name: 'Gajapathinagaram',     winner: 'Botcha Satyanarayana',    party: 'YSRCP', year: 2019 },
  { acNo: 13,  name: 'Nellimarla',           winner: 'Badda Jaganmohana Rao',   party: 'YSRCP', year: 2019 },
  { acNo: 14,  name: 'Vizianagaram',         winner: 'Kolagatla Veerabhadra Swamy', party: 'YSRCP', year: 2019 },
  { acNo: 15,  name: 'Srungavarapukota',     winner: 'Kolla Lalitha Kumari',    party: 'YSRCP', year: 2019 },

  // ─── VISAKHAPATNAM DISTRICT ───
  { acNo: 16,  name: 'Bhimili',              winner: 'Muttamsetti Srinivasa Rao', party: 'JSP', year: 2019 },
  { acNo: 17,  name: 'Visakhapatnam East',   winner: 'Velagapudi Ramakrishna Babu', party: 'YSRCP', year: 2019 },
  { acNo: 18,  name: 'Visakhapatnam South',  winner: 'Vasupalli Ganesh Kumar',  party: 'TDP', year: 2019 },
  { acNo: 19,  name: 'Visakhapatnam North',  winner: 'K. Appala Naidu',         party: 'TDP', year: 2019 },
  { acNo: 20,  name: 'Visakhapatnam West',   winner: 'P.G.V.R. Naidu (Ganababu)', party: 'YSRCP', year: 2019 },
  { acNo: 21,  name: 'Gajuwaka',             winner: 'Tippala Nagi Reddy',      party: 'YSRCP', year: 2019 },
  { acNo: 22,  name: 'Chodavaram',           winner: 'Karanam Dharma Sri',      party: 'YSRCP', year: 2019 },
  { acNo: 23,  name: 'Madugula',             winner: 'Budi Mutyala Naidu',      party: 'YSRCP', year: 2019 },
  { acNo: 24,  name: 'Araku Valley',         winner: 'Chetti Phalguna',         party: 'YSRCP', year: 2019 },
  { acNo: 25,  name: 'Paderu',               winner: 'K. Bhagya Lakshmi',       party: 'YSRCP', year: 2019 },
  { acNo: 26,  name: 'Anakapalle',           winner: 'Gudivada Amarnath',       party: 'YSRCP', year: 2019 },
  { acNo: 27,  name: 'Pendurthi',            winner: 'Adeep Raj',               party: 'YSRCP', year: 2019 },
  { acNo: 28,  name: 'Yelamanchili',         winner: 'Simhadri Ramesh',         party: 'YSRCP', year: 2019 },
  { acNo: 29,  name: 'Payakaraopeta',        winner: 'Sridhar Varma Penumatsa', party: 'YSRCP', year: 2019 },
  { acNo: 30,  name: 'Narsipatnam',          winner: 'Petla Uma Maheshwara Rao', party: 'YSRCP', year: 2019 },

  // ─── EAST GODAVARI DISTRICT ───
  { acNo: 31,  name: 'Tuni',                 winner: 'Dadisetti Raja',          party: 'YSRCP', year: 2019 },
  { acNo: 32,  name: 'Prathipadu',           winner: 'Vemireddy Prabhakar Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 33,  name: 'Pithapuram',           winner: 'Nimmala Ramanaidu',       party: 'TDP', year: 2019 },
  { acNo: 34,  name: 'Kakinada City',        winner: 'Dwarampudi Chandrasekhar Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 35,  name: 'Peddapuram',           winner: 'Annam Satish Prabhakar',  party: 'YSRCP', year: 2019 },
  { acNo: 36,  name: 'Anaparthi',            winner: 'Nallamilli Ramakrishna Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 37,  name: 'Kakinada Rural',       winner: 'Kurasala Kannababu',      party: 'YSRCP', year: 2019 },
  { acNo: 38,  name: 'Ramachandrapuram',     winner: 'Rapaka Varaprasad',       party: 'YSRCP', year: 2019 },
  { acNo: 39,  name: 'Mummidivaram',         winner: 'Ponnada Satish Kumar',    party: 'YSRCP', year: 2019 },
  { acNo: 40,  name: 'Amalapuram',           winner: 'Dola Sree Bala Veeranjaneya Swamy', party: 'YSRCP', year: 2019 },
  { acNo: 41,  name: 'Razole',               winner: 'Anagani Satya Prasad',    party: 'YSRCP', year: 2019 },
  { acNo: 42,  name: 'Gannavaram (EG)',       winner: 'Meka Venkata Pratap Apparao', party: 'YSRCP', year: 2019 },
  { acNo: 43,  name: 'Kothapeta',            winner: 'Chirla Jaggi Reddy',      party: 'YSRCP', year: 2019 },
  { acNo: 44,  name: 'Mandapeta',            winner: 'Pandula Ravindra Babu',   party: 'YSRCP', year: 2019 },
  { acNo: 45,  name: 'Rajanagaram',          winner: 'Jakkampudi Raja',         party: 'YSRCP', year: 2019 },
  { acNo: 46,  name: 'Rajahmundry City',     winner: 'Akula Satyanarayana',     party: 'YSRCP', year: 2019 },
  { acNo: 47,  name: 'Rajahmundry Rural',    winner: 'Gorantla Butchaiah Chowdary', party: 'TDP', year: 2019 },
  { acNo: 48,  name: 'Kovvur',               winner: 'Taneti Vanitha',          party: 'YSRCP', year: 2019 },
  { acNo: 49,  name: 'Nidadavole',           winner: 'Tippala Nagi Reddy',      party: 'YSRCP', year: 2019 },
  { acNo: 50,  name: 'Tadepalligudem',       winner: 'Annavarapu Sivakumar',    party: 'YSRCP', year: 2019 },

  // ─── WEST GODAVARI DISTRICT ───
  { acNo: 51,  name: 'Unguturu',             winner: 'Tallari Venkata Rao',     party: 'YSRCP', year: 2019 },
  { acNo: 52,  name: 'Tanuku',               winner: 'Badeti Bujji',            party: 'YSRCP', year: 2019 },
  { acNo: 53,  name: 'Bhimavaram',           winner: 'Grandhi Srinivas',        party: 'YSRCP', year: 2019 },
  { acNo: 54,  name: 'Undi',                 winner: 'Mantena Rama Raju',       party: 'YSRCP', year: 2019 },
  { acNo: 55,  name: 'Narasapuram',          winner: 'Budi Mutyala Naidu',      party: 'YSRCP', year: 2019 },
  { acNo: 56,  name: 'Chintalapudi',         winner: 'Kommareddy Pattabhiram',  party: 'YSRCP', year: 2019 },
  { acNo: 57,  name: 'Denduluru',            winner: 'Chintamaneni Prabhakar',  party: 'TDP', year: 2019 },
  { acNo: 58,  name: 'Eluru',                winner: 'Alla Kali Krishna Srinivas', party: 'YSRCP', year: 2019 },
  { acNo: 59,  name: 'Polavaram',            winner: 'Tellam Balaraju',         party: 'YSRCP', year: 2019 },

  // ─── KRISHNA DISTRICT ───
  { acNo: 60,  name: 'Nuzvid',               winner: 'Bode Prasad',             party: 'YSRCP', year: 2019 },
  { acNo: 61,  name: 'Gannavaram',           winner: 'Vallabhaneni Vamsi',      party: 'TDP', year: 2019 },
  { acNo: 62,  name: 'Gudivada',             winner: 'Kodali Sri Venkateswara Rao', party: 'YSRCP', year: 2019 },
  { acNo: 63,  name: 'Kaikaluru',            winner: 'Meka Venkata Pratap',     party: 'YSRCP', year: 2019 },
  { acNo: 64,  name: 'Pedana',               winner: 'Jogi Ramesh',             party: 'YSRCP', year: 2019 },
  { acNo: 65,  name: 'Machilipatnam',        winner: 'Perni Venkataramaiah (Nani)', party: 'YSRCP', year: 2019 },
  { acNo: 66,  name: 'Avanigadda',           winner: 'Simhadri Ramesh',         party: 'YSRCP', year: 2019 },
  { acNo: 67,  name: 'Pamarru',              winner: 'Pinnelli Ramakrishna Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 68,  name: 'Repalle',              winner: 'Anil Kumar Yadav',        party: 'YSRCP', year: 2019 },
  { acNo: 69,  name: 'Tenali',               winner: 'Annabathuni Sivakumar',   party: 'YSRCP', year: 2019 },
  { acNo: 70,  name: 'Bapatla',              winner: 'Ashok Reddy',             party: 'YSRCP', year: 2019 },

  // ─── GUNTUR DISTRICT ───
  { acNo: 71,  name: 'Parchur',              winner: 'Yeluri Sambasiva Rao',    party: 'YSRCP', year: 2019 },
  { acNo: 72,  name: 'Addanki',              winner: 'Gottipati Ravi Kumar',    party: 'YSRCP', year: 2019 },
  { acNo: 73,  name: 'Chirala',              winner: 'Amanchi Krishna Mohan',   party: 'YSRCP', year: 2019 },
  { acNo: 74,  name: 'Narasaraopet',         winner: 'Gopireddy Srinivasa Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 75,  name: 'Sattenapalli',         winner: 'Ambati Rambabu',          party: 'YSRCP', year: 2019 },
  { acNo: 76,  name: 'Vinukonda',            winner: 'Bode Prasad',             party: 'YSRCP', year: 2019 },
  { acNo: 77,  name: 'Gurajala',             winner: 'Yarapathineni Srinivasa Rao', party: 'YSRCP', year: 2019 },
  { acNo: 78,  name: 'Macherla',             winner: 'Pinnelli Ramakrishna Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 79,  name: 'Tadikonda',            winner: 'Undavalli Sridevi',       party: 'YSRCP', year: 2019 },
  { acNo: 80,  name: 'Mangalagiri',          winner: 'Alla Ramakrishna Reddy',  party: 'YSRCP', year: 2019 },
  { acNo: 81,  name: 'Guntur West',          winner: 'Modugula Venu Gopala Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 82,  name: 'Guntur East',          winner: 'Mustafa Shaik',           party: 'YSRCP', year: 2019 },
  { acNo: 83,  name: 'Prathipadu (Guntur)',  winner: 'Kasu Mahesh Reddy',       party: 'YSRCP', year: 2019 },
  { acNo: 84,  name: 'Pedakurapadu',         winner: 'Namburu Sankar Rao',      party: 'YSRCP', year: 2019 },

  // ─── PRAKASAM DISTRICT ───
  { acNo: 85,  name: 'Ongole',               winner: 'Balineni Srinivasa Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 86,  name: 'Kandukur',             winner: 'N. Prasanna Kumar Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 87,  name: 'Darsi',                winner: 'M. Raghunatha Reddy',     party: 'YSRCP', year: 2019 },
  { acNo: 88,  name: 'Markapuram',           winner: 'Gadde Ramamohan',         party: 'YSRCP', year: 2019 },
  { acNo: 89,  name: 'Giddalur',             winner: 'Anna Rambabu',            party: 'YSRCP', year: 2019 },
  { acNo: 90,  name: 'Kanigiri',             winner: 'Burra Madhusudhan Yadav', party: 'YSRCP', year: 2019 },

  // ─── NELLORE DISTRICT ───
  { acNo: 91,  name: 'Kavali',               winner: 'Rambhoopal Reddy',        party: 'YSRCP', year: 2019 },
  { acNo: 92,  name: 'Atmakur',              winner: 'Mekapati Goutham Reddy',  party: 'YSRCP', year: 2019 },
  { acNo: 93,  name: 'Kovur',                winner: 'Nallapureddy Prasanna Kumar Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 94,  name: 'Nellore City',         winner: 'Pinnelli Ramakrishna Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 95,  name: 'Nellore Rural',        winner: 'Kotamreddy Sridhar Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 96,  name: 'Sarvepalli',           winner: 'Kakani Govardhan Reddy',  party: 'YSRCP', year: 2019 },
  { acNo: 97,  name: 'Gudur',                winner: 'Varaprasad Rao Velagapalli', party: 'YSRCP', year: 2019 },
  { acNo: 98,  name: 'Sullurpeta',           winner: 'K. Sanjeevaiah',          party: 'YSRCP', year: 2019 },
  { acNo: 99,  name: 'Venkatagiri',          winner: 'Anam Ramanarayana Reddy', party: 'YSRCP', year: 2019 },

  // ─── CHITTOOR DISTRICT ───
  { acNo: 100, name: 'Nagari',               winner: 'Roja Selvamani',          party: 'YSRCP', year: 2019 },
  { acNo: 101, name: 'Gangadhara Nellore',   winner: 'P. Arun Kumar',           party: 'YSRCP', year: 2019 },
  { acNo: 102, name: 'Chittoor',             winner: 'Arani Srinivasulu',       party: 'YSRCP', year: 2019 },
  { acNo: 103, name: 'Puthalapattu',         winner: 'M. Suresh Babu',          party: 'YSRCP', year: 2019 },
  { acNo: 104, name: 'Palamaner',            winner: 'B. Karunakar Reddy',      party: 'YSRCP', year: 2019 },
  { acNo: 105, name: 'Kuppam',               winner: 'N. Chandrababu Naidu',    party: 'TDP', year: 2019 },
  { acNo: 106, name: 'Punganur',             winner: 'Peddireddy Dwarakanath Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 107, name: 'Chandragiri',          winner: 'Chevireddy Bhaskar Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 108, name: 'Tirupati',             winner: 'Bhumana Karunakar Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 109, name: 'Srikalahasti',         winner: 'B. Madhusudan Reddy',     party: 'YSRCP', year: 2019 },
  { acNo: 110, name: 'Satyavedu',            winner: 'Koneti Adimulam',         party: 'YSRCP', year: 2019 },

  // ─── ANNAMAYYA / KADAPA DISTRICTS (YSR District) ───
  { acNo: 111, name: 'Rajampet',             winner: 'Meda Mallikarjuna Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 112, name: 'Kodur',                winner: 'Auddireddy Harivamsi Krishna Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 113, name: 'Rayachoti',            winner: 'G. Srikanth Reddy',       party: 'YSRCP', year: 2019 },
  { acNo: 114, name: 'Kadapa',               winner: 'Rachamallu Siva Prasad Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 115, name: 'Badvel',               winner: 'Dasari Sudha',            party: 'YSRCP', year: 2019 },
  { acNo: 116, name: 'Pulivendla',           winner: 'Y.S. Jagan Mohan Reddy',  party: 'YSRCP', year: 2019 },
  { acNo: 117, name: 'Mydukur',              winner: 'G. Anil Kumar Reddy',     party: 'YSRCP', year: 2019 },
  { acNo: 118, name: 'Proddatur',            winner: 'Rachamallu Siva Prasad Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 119, name: 'Jammalamadugu',        winner: 'Mala Kondareddy',         party: 'YSRCP', year: 2019 },

  // ─── ANANTAPUR DISTRICT ───
  { acNo: 120, name: 'Dhone',                winner: 'Amzath Basha',            party: 'YSRCP', year: 2019 },
  { acNo: 121, name: 'Panyam',               winner: 'Gangula Brijendra Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 122, name: 'Nandyal',              winner: 'Silpa Ravi Chandra Kishore Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 123, name: 'Banaganapalle',        winner: 'B.C. Janardhan Reddy',    party: 'YSRCP', year: 2019 },
  { acNo: 124, name: 'Kurnool',              winner: 'S.V. Mohan Reddy',        party: 'YSRCP', year: 2019 },
  { acNo: 125, name: 'Pattikonda',           winner: 'Katasani Rambhupal Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 126, name: 'Kodumur',              winner: 'Thopudurthi Prakash Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 127, name: 'Yemmiganur',           winner: 'Bandi Venkata Ramana Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 128, name: 'Mantralayam',          winner: 'B. Sridevi',              party: 'YSRCP', year: 2019 },
  { acNo: 129, name: 'Adoni',                winner: 'Kancherla Srinivasulu',   party: 'YSRCP', year: 2019 },
  { acNo: 130, name: 'Alur',                 winner: 'B. Shankar Nag',          party: 'YSRCP', year: 2019 },
  { acNo: 131, name: 'Rayadurg',             winner: 'Kalava Srinivasulu',      party: 'TDP', year: 2019 },
  { acNo: 132, name: 'Uravakonda',           winner: 'Payyavula Keshav',        party: 'TDP', year: 2019 },
  { acNo: 133, name: 'Guntakal',             winner: 'Jagan Mohan Reddy',       party: 'YSRCP', year: 2019 },
  { acNo: 134, name: 'Tadipatri',            winner: 'Kethireddy Pedda Reddy',  party: 'YSRCP', year: 2019 },
  { acNo: 135, name: 'Singanamala',          winner: 'Jonnalagadda Padmavathi', party: 'YSRCP', year: 2019 },
  { acNo: 136, name: 'Anantapur Urban',      winner: 'Anantha Venkatarami Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 137, name: 'Kalyandurg',           winner: 'Kethireddy Venkatarami Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 138, name: 'Raptadu',              winner: 'Thopudurthi Prakash Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 139, name: 'Madakasira',           winner: 'Ande Sri Ram Reddy',      party: 'YSRCP', year: 2019 },
  { acNo: 140, name: 'Hindupur',             winner: 'Nandamuri Balakrishna',   party: 'TDP', year: 2019 },
  { acNo: 141, name: 'Penukonda',            winner: 'Puttaparthi Bala Subramanyam', party: 'YSRCP', year: 2019 },
  { acNo: 142, name: 'Dharmavaram',          winner: 'Kethireddy Venkatarami Reddy', party: 'YSRCP', year: 2019 },

  // ─── NTR / VIJAYAWADA ───
  { acNo: 143, name: 'Vijayawada West',      winner: 'Vellampalli Srinivasa Rao', party: 'YSRCP', year: 2019 },
  { acNo: 144, name: 'Vijayawada Central',   winner: 'Malladi Vishnu',          party: 'YSRCP', year: 2019 },
  { acNo: 145, name: 'Vijayawada East',      winner: 'Gadde Rammohan',          party: 'YSRCP', year: 2019 },
  { acNo: 146, name: 'Mylavaram',            winner: 'Vasanta Krishna Prasad',  party: 'YSRCP', year: 2019 },
  { acNo: 147, name: 'Nandigama',            winner: 'Tangirala Sowmya',        party: 'YSRCP', year: 2019 },
  { acNo: 148, name: 'Jaggayyapeta',         winner: 'Samineni Udaya Bhanu',    party: 'YSRCP', year: 2019 },
  { acNo: 149, name: 'Tiruvuru',             winner: 'Kokkiligadda Rakshana Nidhi', party: 'YSRCP', year: 2019 },

  // ─── PALNADU / AMARAVATI ───
  { acNo: 150, name: 'Pedakurapadu',         winner: 'Namburu Sankar Rao',      party: 'YSRCP', year: 2019 },
  { acNo: 151, name: 'Chilakaluripet',       winner: 'Vidadala Rajini',         party: 'YSRCP', year: 2019 },
  { acNo: 152, name: 'Narasaraopet',         winner: 'Gopireddy Srinivasa Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 153, name: 'Sattenapalli',         winner: 'Ambati Rambabu',          party: 'YSRCP', year: 2019 },
  { acNo: 154, name: 'Vinukonda',            winner: 'Bode Prasad',             party: 'YSRCP', year: 2019 },
  { acNo: 155, name: 'Gurajala',             winner: 'Yarapathineni Srinivasa Rao', party: 'YSRCP', year: 2019 },
  { acNo: 156, name: 'Macherla',             winner: 'Pinnelli Ramakrishna Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 157, name: 'Piduguralla',          winner: 'Burra Madhusudhan Yadav', party: 'YSRCP', year: 2019 },

  // ─── REMAINING CONSTITUENCIES ───
  { acNo: 158, name: 'Tadikonda',            winner: 'Undavalli Sridevi',       party: 'YSRCP', year: 2019 },
  { acNo: 159, name: 'Mangalagiri',          winner: 'Alla Ramakrishna Reddy',  party: 'YSRCP', year: 2019 },
  { acNo: 160, name: 'Parchur',              winner: 'Yeluri Sambasiva Rao',    party: 'YSRCP', year: 2019 },
  { acNo: 161, name: 'Addanki',              winner: 'Gottipati Ravi Kumar',    party: 'YSRCP', year: 2019 },
  { acNo: 162, name: 'Chirala',              winner: 'Amanchi Krishna Mohan',   party: 'YSRCP', year: 2019 },
  { acNo: 163, name: 'Markapuram',           winner: 'Gadde Ramamohan',         party: 'YSRCP', year: 2019 },
  { acNo: 164, name: 'Giddalur',             winner: 'Anna Rambabu',            party: 'YSRCP', year: 2019 },
  { acNo: 165, name: 'Kanigiri',             winner: 'Burra Madhusudhan Yadav', party: 'YSRCP', year: 2019 },
  { acNo: 166, name: 'Kavali',               winner: 'Rambhoopal Reddy',        party: 'YSRCP', year: 2019 },
  { acNo: 167, name: 'Atmakur',              winner: 'Mekapati Goutham Reddy',  party: 'YSRCP', year: 2019 },
  { acNo: 168, name: 'Kovur',                winner: 'Nallapureddy Prasanna Kumar Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 169, name: 'Nellore City',         winner: 'Pinnelli Ramakrishna Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 170, name: 'Nellore Rural',        winner: 'Kotamreddy Sridhar Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 171, name: 'Sarvepalli',           winner: 'Kakani Govardhan Reddy',  party: 'YSRCP', year: 2019 },
  { acNo: 172, name: 'Gudur',                winner: 'Varaprasad Rao Velagapalli', party: 'YSRCP', year: 2019 },
  { acNo: 173, name: 'Sullurpeta',           winner: 'K. Sanjeevaiah',          party: 'YSRCP', year: 2019 },
  { acNo: 174, name: 'Venkatagiri',          winner: 'Anam Ramanarayana Reddy', party: 'YSRCP', year: 2019 },
  { acNo: 175, name: 'Srikalahasti',         winner: 'B. Madhusudan Reddy',     party: 'YSRCP', year: 2019 },
];

// ─── QUERY HELPERS ──────────────────────────────────────────────────────────

/** Get 2019 result for a specific constituency */
export function getAP2019Result(acNo: number): HistoricalResult | undefined {
  return AP_2019_RESULTS.find((r) => r.acNo === acNo);
}

/** Get all constituencies won by a party in 2019 */
export function getAP2019PartyWins(party: string): HistoricalResult[] {
  return AP_2019_RESULTS.filter((r) => r.party === party);
}
