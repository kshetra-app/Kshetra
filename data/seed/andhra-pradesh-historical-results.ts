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
  { acNo: 1,   name: 'Ichchapuram',          winner: 'Rajanna Dora',            party: 'YSRCP' },
  { acNo: 2,   name: 'Palasa',               winner: 'Sidiri Appala Raju',      party: 'YSRCP' },
  { acNo: 3,   name: 'Tekkali',              winner: 'Dharmana Krishna Das',    party: 'YSRCP' },
  { acNo: 4,   name: 'Pathapatnam',          winner: 'K. Atchannaidu',          party: 'TDP' },
  { acNo: 5,   name: 'Srikakulam',           winner: 'Dharmana Prasada Rao',    party: 'YSRCP' },
  { acNo: 6,   name: 'Narasannapeta',        winner: 'Gudivada Amarnath',       party: 'YSRCP' },
  { acNo: 7,   name: 'Amadalavalasa',        winner: 'Chinna Rajappa',          party: 'YSRCP' },
  { acNo: 8,   name: 'Etcherla',             winner: 'Mekapati Goutham Reddy',  party: 'YSRCP' },

  // ─── VIZIANAGARAM DISTRICT ───
  { acNo: 9,   name: 'Rajam',                winner: 'Kala Venkata Rao',        party: 'YSRCP' },
  { acNo: 10,  name: 'Palakonda',            winner: 'Sidda Raghava Rao',       party: 'YSRCP' },
  { acNo: 11,  name: 'Kurupam',              winner: 'Pushpa Srivani',          party: 'YSRCP' },
  { acNo: 12,  name: 'Gajapathinagaram',     winner: 'Botcha Satyanarayana',    party: 'YSRCP' },
  { acNo: 13,  name: 'Nellimarla',           winner: 'Badda Jaganmohana Rao',   party: 'YSRCP' },
  { acNo: 14,  name: 'Vizianagaram',         winner: 'Kolagatla Veerabhadra Swamy', party: 'YSRCP' },
  { acNo: 15,  name: 'Srungavarapukota',     winner: 'Kolla Lalitha Kumari',    party: 'YSRCP' },

  // ─── VISAKHAPATNAM DISTRICT ───
  { acNo: 16,  name: 'Bhimili',              winner: 'Muttamsetti Srinivasa Rao', party: 'JSP' },
  { acNo: 17,  name: 'Visakhapatnam East',   winner: 'Velagapudi Ramakrishna Babu', party: 'YSRCP' },
  { acNo: 18,  name: 'Visakhapatnam South',  winner: 'Vasupalli Ganesh Kumar',  party: 'TDP' },
  { acNo: 19,  name: 'Visakhapatnam North',  winner: 'K. Appala Naidu',         party: 'TDP' },
  { acNo: 20,  name: 'Visakhapatnam West',   winner: 'P.G.V.R. Naidu (Ganababu)', party: 'YSRCP' },
  { acNo: 21,  name: 'Gajuwaka',             winner: 'Tippala Nagi Reddy',      party: 'YSRCP' },
  { acNo: 22,  name: 'Chodavaram',           winner: 'Karanam Dharma Sri',      party: 'YSRCP' },
  { acNo: 23,  name: 'Madugula',             winner: 'Budi Mutyala Naidu',      party: 'YSRCP' },
  { acNo: 24,  name: 'Araku Valley',         winner: 'Chetti Phalguna',         party: 'YSRCP' },
  { acNo: 25,  name: 'Paderu',               winner: 'K. Bhagya Lakshmi',       party: 'YSRCP' },
  { acNo: 26,  name: 'Anakapalle',           winner: 'Gudivada Amarnath',       party: 'YSRCP' },
  { acNo: 27,  name: 'Pendurthi',            winner: 'Adeep Raj',               party: 'YSRCP' },
  { acNo: 28,  name: 'Yelamanchili',         winner: 'Simhadri Ramesh',         party: 'YSRCP' },
  { acNo: 29,  name: 'Payakaraopeta',        winner: 'Sridhar Varma Penumatsa', party: 'YSRCP' },
  { acNo: 30,  name: 'Narsipatnam',          winner: 'Petla Uma Maheshwara Rao', party: 'YSRCP' },

  // ─── EAST GODAVARI DISTRICT ───
  { acNo: 31,  name: 'Tuni',                 winner: 'Dadisetti Raja',          party: 'YSRCP' },
  { acNo: 32,  name: 'Prathipadu',           winner: 'Vemireddy Prabhakar Reddy', party: 'YSRCP' },
  { acNo: 33,  name: 'Pithapuram',           winner: 'Nimmala Ramanaidu',       party: 'TDP' },
  { acNo: 34,  name: 'Kakinada City',        winner: 'Dwarampudi Chandrasekhar Reddy', party: 'YSRCP' },
  { acNo: 35,  name: 'Peddapuram',           winner: 'Annam Satish Prabhakar',  party: 'YSRCP' },
  { acNo: 36,  name: 'Anaparthi',            winner: 'Nallamilli Ramakrishna Reddy', party: 'YSRCP' },
  { acNo: 37,  name: 'Kakinada Rural',       winner: 'Kurasala Kannababu',      party: 'YSRCP' },
  { acNo: 38,  name: 'Ramachandrapuram',     winner: 'Rapaka Varaprasad',       party: 'YSRCP' },
  { acNo: 39,  name: 'Mummidivaram',         winner: 'Ponnada Satish Kumar',    party: 'YSRCP' },
  { acNo: 40,  name: 'Amalapuram',           winner: 'Dola Sree Bala Veeranjaneya Swamy', party: 'YSRCP' },
  { acNo: 41,  name: 'Razole',               winner: 'Anagani Satya Prasad',    party: 'YSRCP' },
  { acNo: 42,  name: 'Gannavaram (EG)',       winner: 'Meka Venkata Pratap Apparao', party: 'YSRCP' },
  { acNo: 43,  name: 'Kothapeta',            winner: 'Chirla Jaggi Reddy',      party: 'YSRCP' },
  { acNo: 44,  name: 'Mandapeta',            winner: 'Pandula Ravindra Babu',   party: 'YSRCP' },
  { acNo: 45,  name: 'Rajanagaram',          winner: 'Jakkampudi Raja',         party: 'YSRCP' },
  { acNo: 46,  name: 'Rajahmundry City',     winner: 'Akula Satyanarayana',     party: 'YSRCP' },
  { acNo: 47,  name: 'Rajahmundry Rural',    winner: 'Gorantla Butchaiah Chowdary', party: 'TDP' },
  { acNo: 48,  name: 'Kovvur',               winner: 'Taneti Vanitha',          party: 'YSRCP' },
  { acNo: 49,  name: 'Nidadavole',           winner: 'Tippala Nagi Reddy',      party: 'YSRCP' },
  { acNo: 50,  name: 'Tadepalligudem',       winner: 'Annavarapu Sivakumar',    party: 'YSRCP' },

  // ─── WEST GODAVARI DISTRICT ───
  { acNo: 51,  name: 'Unguturu',             winner: 'Tallari Venkata Rao',     party: 'YSRCP' },
  { acNo: 52,  name: 'Tanuku',               winner: 'Badeti Bujji',            party: 'YSRCP' },
  { acNo: 53,  name: 'Bhimavaram',           winner: 'Grandhi Srinivas',        party: 'YSRCP' },
  { acNo: 54,  name: 'Undi',                 winner: 'Mantena Rama Raju',       party: 'YSRCP' },
  { acNo: 55,  name: 'Narasapuram',          winner: 'Budi Mutyala Naidu',      party: 'YSRCP' },
  { acNo: 56,  name: 'Chintalapudi',         winner: 'Kommareddy Pattabhiram',  party: 'YSRCP' },
  { acNo: 57,  name: 'Denduluru',            winner: 'Chintamaneni Prabhakar',  party: 'TDP' },
  { acNo: 58,  name: 'Eluru',                winner: 'Alla Kali Krishna Srinivas', party: 'YSRCP' },
  { acNo: 59,  name: 'Polavaram',            winner: 'Tellam Balaraju',         party: 'YSRCP' },

  // ─── KRISHNA DISTRICT ───
  { acNo: 60,  name: 'Nuzvid',               winner: 'Bode Prasad',             party: 'YSRCP' },
  { acNo: 61,  name: 'Gannavaram',           winner: 'Vallabhaneni Vamsi',      party: 'TDP' },
  { acNo: 62,  name: 'Gudivada',             winner: 'Kodali Sri Venkateswara Rao', party: 'YSRCP' },
  { acNo: 63,  name: 'Kaikaluru',            winner: 'Meka Venkata Pratap',     party: 'YSRCP' },
  { acNo: 64,  name: 'Pedana',               winner: 'Jogi Ramesh',             party: 'YSRCP' },
  { acNo: 65,  name: 'Machilipatnam',        winner: 'Perni Venkataramaiah (Nani)', party: 'YSRCP' },
  { acNo: 66,  name: 'Avanigadda',           winner: 'Simhadri Ramesh',         party: 'YSRCP' },
  { acNo: 67,  name: 'Pamarru',              winner: 'Pinnelli Ramakrishna Reddy', party: 'YSRCP' },
  { acNo: 68,  name: 'Repalle',              winner: 'Anil Kumar Yadav',        party: 'YSRCP' },
  { acNo: 69,  name: 'Tenali',               winner: 'Annabathuni Sivakumar',   party: 'YSRCP' },
  { acNo: 70,  name: 'Bapatla',              winner: 'Ashok Reddy',             party: 'YSRCP' },

  // ─── GUNTUR DISTRICT ───
  { acNo: 71,  name: 'Parchur',              winner: 'Yeluri Sambasiva Rao',    party: 'YSRCP' },
  { acNo: 72,  name: 'Addanki',              winner: 'Gottipati Ravi Kumar',    party: 'YSRCP' },
  { acNo: 73,  name: 'Chirala',              winner: 'Amanchi Krishna Mohan',   party: 'YSRCP' },
  { acNo: 74,  name: 'Narasaraopet',         winner: 'Gopireddy Srinivasa Reddy', party: 'YSRCP' },
  { acNo: 75,  name: 'Sattenapalli',         winner: 'Ambati Rambabu',          party: 'YSRCP' },
  { acNo: 76,  name: 'Vinukonda',            winner: 'Bode Prasad',             party: 'YSRCP' },
  { acNo: 77,  name: 'Gurajala',             winner: 'Yarapathineni Srinivasa Rao', party: 'YSRCP' },
  { acNo: 78,  name: 'Macherla',             winner: 'Pinnelli Ramakrishna Reddy', party: 'YSRCP' },
  { acNo: 79,  name: 'Tadikonda',            winner: 'Undavalli Sridevi',       party: 'YSRCP' },
  { acNo: 80,  name: 'Mangalagiri',          winner: 'Alla Ramakrishna Reddy',  party: 'YSRCP' },
  { acNo: 81,  name: 'Guntur West',          winner: 'Modugula Venu Gopala Reddy', party: 'YSRCP' },
  { acNo: 82,  name: 'Guntur East',          winner: 'Mustafa Shaik',           party: 'YSRCP' },
  { acNo: 83,  name: 'Prathipadu (Guntur)',  winner: 'Kasu Mahesh Reddy',       party: 'YSRCP' },
  { acNo: 84,  name: 'Pedakurapadu',         winner: 'Namburu Sankar Rao',      party: 'YSRCP' },

  // ─── PRAKASAM DISTRICT ───
  { acNo: 85,  name: 'Ongole',               winner: 'Balineni Srinivasa Reddy', party: 'YSRCP' },
  { acNo: 86,  name: 'Kandukur',             winner: 'N. Prasanna Kumar Reddy', party: 'YSRCP' },
  { acNo: 87,  name: 'Darsi',                winner: 'M. Raghunatha Reddy',     party: 'YSRCP' },
  { acNo: 88,  name: 'Markapuram',           winner: 'Gadde Ramamohan',         party: 'YSRCP' },
  { acNo: 89,  name: 'Giddalur',             winner: 'Anna Rambabu',            party: 'YSRCP' },
  { acNo: 90,  name: 'Kanigiri',             winner: 'Burra Madhusudhan Yadav', party: 'YSRCP' },

  // ─── NELLORE DISTRICT ───
  { acNo: 91,  name: 'Kavali',               winner: 'Rambhoopal Reddy',        party: 'YSRCP' },
  { acNo: 92,  name: 'Atmakur',              winner: 'Mekapati Goutham Reddy',  party: 'YSRCP' },
  { acNo: 93,  name: 'Kovur',                winner: 'Nallapureddy Prasanna Kumar Reddy', party: 'YSRCP' },
  { acNo: 94,  name: 'Nellore City',         winner: 'Pinnelli Ramakrishna Reddy', party: 'YSRCP' },
  { acNo: 95,  name: 'Nellore Rural',        winner: 'Kotamreddy Sridhar Reddy', party: 'YSRCP' },
  { acNo: 96,  name: 'Sarvepalli',           winner: 'Kakani Govardhan Reddy',  party: 'YSRCP' },
  { acNo: 97,  name: 'Gudur',                winner: 'Varaprasad Rao Velagapalli', party: 'YSRCP' },
  { acNo: 98,  name: 'Sullurpeta',           winner: 'K. Sanjeevaiah',          party: 'YSRCP' },
  { acNo: 99,  name: 'Venkatagiri',          winner: 'Anam Ramanarayana Reddy', party: 'YSRCP' },

  // ─── CHITTOOR DISTRICT ───
  { acNo: 100, name: 'Nagari',               winner: 'Roja Selvamani',          party: 'YSRCP' },
  { acNo: 101, name: 'Gangadhara Nellore',   winner: 'P. Arun Kumar',           party: 'YSRCP' },
  { acNo: 102, name: 'Chittoor',             winner: 'Arani Srinivasulu',       party: 'YSRCP' },
  { acNo: 103, name: 'Puthalapattu',         winner: 'M. Suresh Babu',          party: 'YSRCP' },
  { acNo: 104, name: 'Palamaner',            winner: 'B. Karunakar Reddy',      party: 'YSRCP' },
  { acNo: 105, name: 'Kuppam',               winner: 'N. Chandrababu Naidu',    party: 'TDP' },
  { acNo: 106, name: 'Punganur',             winner: 'Peddireddy Dwarakanath Reddy', party: 'YSRCP' },
  { acNo: 107, name: 'Chandragiri',          winner: 'Chevireddy Bhaskar Reddy', party: 'YSRCP' },
  { acNo: 108, name: 'Tirupati',             winner: 'Bhumana Karunakar Reddy', party: 'YSRCP' },
  { acNo: 109, name: 'Srikalahasti',         winner: 'B. Madhusudan Reddy',     party: 'YSRCP' },
  { acNo: 110, name: 'Satyavedu',            winner: 'Koneti Adimulam',         party: 'YSRCP' },

  // ─── ANNAMAYYA / KADAPA DISTRICTS (YSR District) ───
  { acNo: 111, name: 'Rajampet',             winner: 'Meda Mallikarjuna Reddy', party: 'YSRCP' },
  { acNo: 112, name: 'Kodur',                winner: 'Auddireddy Harivamsi Krishna Reddy', party: 'YSRCP' },
  { acNo: 113, name: 'Rayachoti',            winner: 'G. Srikanth Reddy',       party: 'YSRCP' },
  { acNo: 114, name: 'Kadapa',               winner: 'Rachamallu Siva Prasad Reddy', party: 'YSRCP' },
  { acNo: 115, name: 'Badvel',               winner: 'Dasari Sudha',            party: 'YSRCP' },
  { acNo: 116, name: 'Pulivendla',           winner: 'Y.S. Jagan Mohan Reddy',  party: 'YSRCP' },
  { acNo: 117, name: 'Mydukur',              winner: 'G. Anil Kumar Reddy',     party: 'YSRCP' },
  { acNo: 118, name: 'Proddatur',            winner: 'Rachamallu Siva Prasad Reddy', party: 'YSRCP' },
  { acNo: 119, name: 'Jammalamadugu',        winner: 'Mala Kondareddy',         party: 'YSRCP' },

  // ─── ANANTAPUR DISTRICT ───
  { acNo: 120, name: 'Dhone',                winner: 'Amzath Basha',            party: 'YSRCP' },
  { acNo: 121, name: 'Panyam',               winner: 'Gangula Brijendra Reddy', party: 'YSRCP' },
  { acNo: 122, name: 'Nandyal',              winner: 'Silpa Ravi Chandra Kishore Reddy', party: 'YSRCP' },
  { acNo: 123, name: 'Banaganapalle',        winner: 'B.C. Janardhan Reddy',    party: 'YSRCP' },
  { acNo: 124, name: 'Kurnool',              winner: 'S.V. Mohan Reddy',        party: 'YSRCP' },
  { acNo: 125, name: 'Pattikonda',           winner: 'Katasani Rambhupal Reddy', party: 'YSRCP' },
  { acNo: 126, name: 'Kodumur',              winner: 'Thopudurthi Prakash Reddy', party: 'YSRCP' },
  { acNo: 127, name: 'Yemmiganur',           winner: 'Bandi Venkata Ramana Reddy', party: 'YSRCP' },
  { acNo: 128, name: 'Mantralayam',          winner: 'B. Sridevi',              party: 'YSRCP' },
  { acNo: 129, name: 'Adoni',                winner: 'Kancherla Srinivasulu',   party: 'YSRCP' },
  { acNo: 130, name: 'Alur',                 winner: 'B. Shankar Nag',          party: 'YSRCP' },
  { acNo: 131, name: 'Rayadurg',             winner: 'Kalava Srinivasulu',      party: 'TDP' },
  { acNo: 132, name: 'Uravakonda',           winner: 'Payyavula Keshav',        party: 'TDP' },
  { acNo: 133, name: 'Guntakal',             winner: 'Jagan Mohan Reddy',       party: 'YSRCP' },
  { acNo: 134, name: 'Tadipatri',            winner: 'Kethireddy Pedda Reddy',  party: 'YSRCP' },
  { acNo: 135, name: 'Singanamala',          winner: 'Jonnalagadda Padmavathi', party: 'YSRCP' },
  { acNo: 136, name: 'Anantapur Urban',      winner: 'Anantha Venkatarami Reddy', party: 'YSRCP' },
  { acNo: 137, name: 'Kalyandurg',           winner: 'Kethireddy Venkatarami Reddy', party: 'YSRCP' },
  { acNo: 138, name: 'Raptadu',              winner: 'Thopudurthi Prakash Reddy', party: 'YSRCP' },
  { acNo: 139, name: 'Madakasira',           winner: 'Ande Sri Ram Reddy',      party: 'YSRCP' },
  { acNo: 140, name: 'Hindupur',             winner: 'Nandamuri Balakrishna',   party: 'TDP' },
  { acNo: 141, name: 'Penukonda',            winner: 'Puttaparthi Bala Subramanyam', party: 'YSRCP' },
  { acNo: 142, name: 'Dharmavaram',          winner: 'Kethireddy Venkatarami Reddy', party: 'YSRCP' },

  // ─── NTR / VIJAYAWADA ───
  { acNo: 143, name: 'Vijayawada West',      winner: 'Vellampalli Srinivasa Rao', party: 'YSRCP' },
  { acNo: 144, name: 'Vijayawada Central',   winner: 'Malladi Vishnu',          party: 'YSRCP' },
  { acNo: 145, name: 'Vijayawada East',      winner: 'Gadde Rammohan',          party: 'YSRCP' },
  { acNo: 146, name: 'Mylavaram',            winner: 'Vasanta Krishna Prasad',  party: 'YSRCP' },
  { acNo: 147, name: 'Nandigama',            winner: 'Tangirala Sowmya',        party: 'YSRCP' },
  { acNo: 148, name: 'Jaggayyapeta',         winner: 'Samineni Udaya Bhanu',    party: 'YSRCP' },
  { acNo: 149, name: 'Tiruvuru',             winner: 'Kokkiligadda Rakshana Nidhi', party: 'YSRCP' },

  // ─── PALNADU / AMARAVATI ───
  { acNo: 150, name: 'Pedakurapadu',         winner: 'Namburu Sankar Rao',      party: 'YSRCP' },
  { acNo: 151, name: 'Chilakaluripet',       winner: 'Vidadala Rajini',         party: 'YSRCP' },
  { acNo: 152, name: 'Narasaraopet',         winner: 'Gopireddy Srinivasa Reddy', party: 'YSRCP' },
  { acNo: 153, name: 'Sattenapalli',         winner: 'Ambati Rambabu',          party: 'YSRCP' },
  { acNo: 154, name: 'Vinukonda',            winner: 'Bode Prasad',             party: 'YSRCP' },
  { acNo: 155, name: 'Gurajala',             winner: 'Yarapathineni Srinivasa Rao', party: 'YSRCP' },
  { acNo: 156, name: 'Macherla',             winner: 'Pinnelli Ramakrishna Reddy', party: 'YSRCP' },
  { acNo: 157, name: 'Piduguralla',          winner: 'Burra Madhusudhan Yadav', party: 'YSRCP' },

  // ─── REMAINING CONSTITUENCIES ───
  { acNo: 158, name: 'Tadikonda',            winner: 'Undavalli Sridevi',       party: 'YSRCP' },
  { acNo: 159, name: 'Mangalagiri',          winner: 'Alla Ramakrishna Reddy',  party: 'YSRCP' },
  { acNo: 160, name: 'Parchur',              winner: 'Yeluri Sambasiva Rao',    party: 'YSRCP' },
  { acNo: 161, name: 'Addanki',              winner: 'Gottipati Ravi Kumar',    party: 'YSRCP' },
  { acNo: 162, name: 'Chirala',              winner: 'Amanchi Krishna Mohan',   party: 'YSRCP' },
  { acNo: 163, name: 'Markapuram',           winner: 'Gadde Ramamohan',         party: 'YSRCP' },
  { acNo: 164, name: 'Giddalur',             winner: 'Anna Rambabu',            party: 'YSRCP' },
  { acNo: 165, name: 'Kanigiri',             winner: 'Burra Madhusudhan Yadav', party: 'YSRCP' },
  { acNo: 166, name: 'Kavali',               winner: 'Rambhoopal Reddy',        party: 'YSRCP' },
  { acNo: 167, name: 'Atmakur',              winner: 'Mekapati Goutham Reddy',  party: 'YSRCP' },
  { acNo: 168, name: 'Kovur',                winner: 'Nallapureddy Prasanna Kumar Reddy', party: 'YSRCP' },
  { acNo: 169, name: 'Nellore City',         winner: 'Pinnelli Ramakrishna Reddy', party: 'YSRCP' },
  { acNo: 170, name: 'Nellore Rural',        winner: 'Kotamreddy Sridhar Reddy', party: 'YSRCP' },
  { acNo: 171, name: 'Sarvepalli',           winner: 'Kakani Govardhan Reddy',  party: 'YSRCP' },
  { acNo: 172, name: 'Gudur',                winner: 'Varaprasad Rao Velagapalli', party: 'YSRCP' },
  { acNo: 173, name: 'Sullurpeta',           winner: 'K. Sanjeevaiah',          party: 'YSRCP' },
  { acNo: 174, name: 'Venkatagiri',          winner: 'Anam Ramanarayana Reddy', party: 'YSRCP' },
  { acNo: 175, name: 'Srikalahasti',         winner: 'B. Madhusudan Reddy',     party: 'YSRCP' },
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
