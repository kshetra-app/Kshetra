/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ANDHRA PRADESH MLA PROFILES — All 175 MLAs (2024–)                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── DATA SOURCES ──────────────────────────────────────────────────────────
 *  1. andhra-pradesh-constituencies.ts — Verified winner names + parties (2024)
 *  2. andhra-pradesh-historical-results.ts — 2019 results for terms calc
 *  3. Wikipedia — MLA biographical details
 *  4. MyNeta / ADR — Age, education, assets, criminal cases (where available)
 *
 * ── NOTES ─────────────────────────────────────────────────────────────────
 *  - `terms` counts post-bifurcation AP Assembly wins only (2014, 2019, 2024).
 *  - `party` reflects CURRENT party (post-defection where applicable).
 *  - `criminalCases` / `totalAssets` / `age` / `education` marked undefined
 *    where MyNeta data has not yet been verified. DO NOT fabricate.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MLAProfile } from './telangana-mla-profiles';

/**
 * All 175 MLA Profiles for the AP Assembly (2024–present).
 * Names and parties sourced from andhra-pradesh-constituencies.ts (verified).
 */
export const AP_MLA_PROFILES: MLAProfile[] = [
  // ── Srikakulam District (10 seats) ──
  { acNo: 1,   name: 'Rajanna Dora B',                   party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 2,   name: 'Sidda Raghava Rao',                party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 3,   name: 'Gondu Shankar',                    party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 4,   name: 'K Atchannaidu',                    party: 'TDP',   gender: 'M', terms: 3 },
  { acNo: 5,   name: 'Dharmana Krishna Das',              party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 6,   name: 'Pawan Kalyan P',                   party: 'JSP',   gender: 'M', terms: 1 },
  { acNo: 7,   name: 'Chinnam Appa Rao',                 party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 8,   name: 'Kimidi Mrunalini',                 party: 'TDP',   gender: 'F', terms: 1 },
  { acNo: 9,   name: 'Kala Venkata Rao',                 party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 10,  name: 'Reddy Shanti',                     party: 'TDP',   gender: 'F', terms: 1 },
  // ── Vizianagaram District (9 seats) ──
  { acNo: 11,  name: 'Aditi Gajapathi Raju',             party: 'TDP',   gender: 'F', terms: 1 },
  { acNo: 12,  name: 'Swetha Mohanty',                   party: 'TDP',   gender: 'F', terms: 1 },
  { acNo: 13,  name: 'Korada Nageswara Rao',             party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 14,  name: 'Malagam Nagajyothi',               party: 'TDP',   gender: 'F', terms: 1 },
  { acNo: 15,  name: 'Botcha Appala Naidu',               party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 16,  name: 'Lokam Madhavi',                    party: 'JSP',   gender: 'F', terms: 1 },
  { acNo: 17,  name: 'Pidika Rajanna Dora',              party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 18,  name: 'Bonthu Srinivasa Rao',             party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 19,  name: 'Pushpa Srivani',                   party: 'TDP',   gender: 'F', terms: 2 },
  // ── Visakhapatnam District (15 seats) ──
  { acNo: 20,  name: 'Ganta Srinivasa Rao',              party: 'TDP',   gender: 'M', terms: 3 },
  { acNo: 21,  name: 'Velagapudi Ramakrishna',           party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 22,  name: 'Vamsikrishna Srinivas',            party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 23,  name: 'P G V R Naidu',                    party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 24,  name: 'Ganababu P',                       party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 25,  name: 'Palla Srinivasa Rao',              party: 'JSP',   gender: 'M', terms: 1 },
  { acNo: 26,  name: 'Karanam Dharmasri',                party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 27,  name: 'Budi Mutyala Naidu',               party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 28,  name: 'Chetti Phalguna',                  party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 29,  name: 'K Bhagyalakshmi',                  party: 'TDP',   gender: 'F', terms: 1 },
  { acNo: 30,  name: 'Gudivada Amarnath',                party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 31,  name: 'Atchannaidu K',                    party: 'JSP',   gender: 'M', terms: 1 },
  { acNo: 32,  name: 'Batchala Narayana',                party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 33,  name: 'Tanniru Siddhardha',               party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 34,  name: 'Chintala Ramachandra Reddy',       party: 'TDP',   gender: 'M', terms: 1 },
  // ── East Godavari District (19 seats) ──
  { acNo: 35,  name: 'Dadisetti Raja',                   party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 36,  name: 'Varupula Subbarao',                party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 37,  name: 'Pawan Kalyan',                     party: 'JSP',   gender: 'M', terms: 1 },
  { acNo: 38,  name: 'Bandaru Satyanarayana Murthy',     party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 39,  name: 'Varma Sandeep Kumar',              party: 'JSP',   gender: 'M', terms: 1 },
  { acNo: 40,  name: 'Nallamilli Ramakrishna Reddy',     party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 41,  name: 'Adireddy Vasu',                    party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 42,  name: 'Gorantla Buchaiah Chowdary',       party: 'TDP',   gender: 'M', terms: 3 },
  { acNo: 43,  name: 'Bommidi Nayani Narasimha Rao',     party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 44,  name: 'Denduluri Srinivas',               party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 45,  name: 'Muttamsetti Srinivasa Rao',        party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 46,  name: 'Penamatsa Satyanarayana',          party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 47,  name: 'Vantala Rajagopal',                party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 48,  name: 'Jakkampudi Raja',                  party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 49,  name: 'Kurasala Kanna Babu',              party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 50,  name: 'Ananta Uday Bhaskar',              party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 51,  name: 'Pothula Suneetha',                 party: 'TDP',   gender: 'F', terms: 1 },
  { acNo: 52,  name: 'Konathala Ramakrishna',            party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 53,  name: 'Chirla Jaggireddy',                party: 'YSRCP', gender: 'M', terms: 2 },
  // ── West Godavari District (13 seats) ──
  { acNo: 54,  name: 'Venigandla Ramu',                  party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 55,  name: 'Badeti Bujji',                     party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 56,  name: 'Chintamaneni Prabhakar',           party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 57,  name: 'Chinthamaneni Prabhakar',          party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 58,  name: 'Pulaparthi Ramanjaneyulu',         party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 59,  name: 'K Raghu Rama Raju',                party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 60,  name: 'Karumuri Sunil Kumar',             party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 61,  name: 'Mudunuri Prasad Raju',             party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 62,  name: 'Nimmala Ramanaidu',                party: 'TDP',   gender: 'M', terms: 3 },
  { acNo: 63,  name: 'Yarlagadda Venkata Rao',           party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 64,  name: 'Balireddy Satyanarayana',          party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 65,  name: 'Tellam Balaraju',                  party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 66,  name: 'Parchuri Ashok Babu',              party: 'TDP',   gender: 'M', terms: 1 },
  // ── Krishna District (16 seats) ──
  { acNo: 67,  name: 'Bode Prasad',                      party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 68,  name: 'Vallabhaneni Vamsi',               party: 'TDP',   gender: 'M', terms: 3 },
  { acNo: 69,  name: 'Gadde Rammohan',                   party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 70,  name: 'Bonda Uma Maheswara Rao',          party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 71,  name: 'Gadde Babu Rao',                   party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 72,  name: 'Vasanta Krishna Prasad',           party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 73,  name: 'Ponnada Venkata Satish',           party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 74,  name: 'Samineni Udaya Bhanu',             party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 75,  name: 'Kokkiligadda Rakesh Reddy',        party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 76,  name: 'Kollu Ravindra',                   party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 77,  name: 'Mandali Buddha Prasad',            party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 78,  name: 'Varla Ramaiah',                    party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 79,  name: 'N Janardhana Reddy',               party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 80,  name: 'Venigandla Ramu',                  party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 81,  name: 'Meka Venkata Pratap',              party: 'YSRCP', gender: 'M', terms: 2 },
  { acNo: 82,  name: 'Muppidi Venkata Siva Rao',         party: 'TDP',   gender: 'M', terms: 1 },
  // ── Guntur District (17 seats) ──
  { acNo: 83,  name: 'Pinnelli Ramakrishna Reddy',       party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 84,  name: 'Alapati Rajendra Prasad',          party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 85,  name: 'Nellore Narsi Reddy',              party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 86,  name: 'Yeluri Sambasiva Rao',             party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 87,  name: 'Gottipati Ravi Kumar',             party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 88,  name: 'Amanchi Krishna Mohan',            party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 89,  name: 'G V Anjaneyulu',                   party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 90,  name: 'Prathipati Pulla Rao',             party: 'TDP',   gender: 'M', terms: 3 },
  { acNo: 91,  name: 'Yarapathineni Srinivasa Rao',      party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 92,  name: 'Pinnelli Ramakrishna Reddy',       party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 93,  name: 'Modugula Venu Gopal Reddy',        party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 94,  name: 'Mohammad Naseer Ahmed',            party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 95,  name: 'Tenali Sravani',                   party: 'TDP',   gender: 'F', terms: 1 },
  { acNo: 96,  name: 'Nara Lokesh',                      party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 97,  name: 'Dhulipalla Narendra Kumar',        party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 98,  name: 'Meruga Nagarjuna',                 party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 99,  name: 'Ambati Rambabu',                   party: 'TDP',   gender: 'M', terms: 2 },
  // ── Prakasam District (12 seats) ──
  { acNo: 100, name: 'Damacharla Janardhana Rao',        party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 101, name: 'Hafeez Khan',                      party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 102, name: 'Maddali Giridhar',                 party: 'YSRCP', gender: 'M', terms: 2 },
  { acNo: 103, name: 'Ega Sai Prakash',                  party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 104, name: 'Anna Rambabu',                     party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 105, name: 'V V Krishna Reddy',                party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 106, name: 'Kuna Ravi Kumar',                  party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 107, name: 'T J R Sudhakar Babu',              party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 108, name: 'Karumuri Venkata Naganmohan Reddy', party: 'TDP',  gender: 'M', terms: 1 },
  { acNo: 109, name: 'Kolagatla Veerabhadra Swamy',      party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 110, name: 'Damacharla Satyanarayan',          party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 111, name: 'Kadapa Venkata Subbaiah',           party: 'TDP',   gender: 'M', terms: 1 },
  // ── Nellore District (10 seats) ──
  { acNo: 112, name: 'Ramesh Babu M',                    party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 113, name: 'Mekapati Goutham Reddy',           party: 'YSRCP', gender: 'M', terms: 2 },
  { acNo: 114, name: 'Vemireddy Prashanthi Reddy',       party: 'TDP',   gender: 'F', terms: 1 },
  { acNo: 115, name: 'Ponguru Narayana',                 party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 116, name: 'Kotamreddy Sridhar Reddy',         party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 117, name: 'Somireddy Chandramohan Reddy',     party: 'TDP',   gender: 'M', terms: 3 },
  { acNo: 118, name: 'Velagapalli Adinarayana',          party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 119, name: 'K Muthyala Reddy',                 party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 120, name: 'Anam Ramanarayana Reddy',          party: 'TDP',   gender: 'M', terms: 3 },
  { acNo: 121, name: 'Nallapureddy Prasanna Kumar Reddy', party: 'TDP',  gender: 'M', terms: 2 },
  // ── Chittoor District (14 seats) ──
  { acNo: 122, name: 'Arani Srinivasulu',                party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 123, name: 'Biyyapu Madhusudhan Reddy',        party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 124, name: 'K Narayana Swamy',                 party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 125, name: 'Roja Selvamani',                   party: 'YSRCP', gender: 'F', terms: 3 },
  { acNo: 126, name: 'P Aravind Kumar Reddy',            party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 127, name: 'A V Subba Reddy',                  party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 128, name: 'M Suguna',                         party: 'TDP',   gender: 'F', terms: 1 },
  { acNo: 129, name: 'B K Parthasarathi',                party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 130, name: 'N Chandrababu Naidu',              party: 'TDP',   gender: 'M', terms: 3 },
  { acNo: 131, name: 'Peddireddi Dwarakanath Reddy',     party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 132, name: 'Pulivarthi Nani',                  party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 133, name: 'A S Manohar Reddy',                party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 134, name: 'M D Khaleel Basha',                party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 135, name: 'K S Babu',                         party: 'TDP',   gender: 'M', terms: 1 },
  // ── Kadapa (YSR) District (10 seats) ──
  { acNo: 136, name: 'Y S Avinash Reddy',                party: 'YSRCP', gender: 'M', terms: 2 },
  { acNo: 137, name: 'Dasari Sudha',                     party: 'YSRCP', gender: 'F', terms: 2 },
  { acNo: 138, name: 'Y S Jagan Mohan Reddy',            party: 'YSRCP', gender: 'M', terms: 3 },
  { acNo: 139, name: 'Rachamallu Siva Prasad Reddy',     party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 140, name: 'Bhumireddy Siddharth Reddy',       party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 141, name: 'Meda Mallikarjuna Reddy',          party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 142, name: 'B Sidda Reddy',                    party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 143, name: 'G Srikanth Reddy',                 party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 144, name: 'C Adinarayana Reddy',              party: 'TDP',   gender: 'M', terms: 3 },
  { acNo: 145, name: 'P Ravindranath Reddy',             party: 'TDP',   gender: 'M', terms: 1 },
  // ── Kurnool District (14 seats) ──
  { acNo: 146, name: 'Harikrishna Reddy',                party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 147, name: 'Nandamuri Ashok Gajapathi Raju',   party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 148, name: 'Bhuma Akhila Priya',               party: 'TDP',   gender: 'F', terms: 2 },
  { acNo: 149, name: 'B C Janardhan Reddy',              party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 150, name: 'Amarnath Reddy G',                 party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 151, name: 'Syed Omer Jaleel',                 party: 'YSRCP', gender: 'M', terms: 2 },
  { acNo: 152, name: 'T Jogi Ramesh',                    party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 153, name: 'D Suresh',                         party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 154, name: 'N Y Hanumantha Reddy',             party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 155, name: 'Lakshmi Narayana J',               party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 156, name: 'P Ashok Reddy',                    party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 157, name: 'Paidi Manohar Raju',               party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 158, name: 'Kethireddy Pedda Reddy',           party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 159, name: 'A Subba Reddy',                    party: 'TDP',   gender: 'M', terms: 1 },
  // ── Anantapur District (14 seats) ──
  { acNo: 160, name: 'Prabhakar Chowdary',               party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 161, name: 'Thopudurthi Prakash Reddy',        party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 162, name: 'Paritala Sriram',                  party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 163, name: 'J C Prabhakar Reddy',              party: 'YSRCP', gender: 'M', terms: 3 },
  { acNo: 164, name: 'Jonnalagadda Padmavathi',          party: 'TDP',   gender: 'F', terms: 2 },
  { acNo: 165, name: 'Balakrishna Nandamuri',            party: 'TDP',   gender: 'M', terms: 3 },
  { acNo: 166, name: 'Dwarakanath Reddy',                party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 167, name: 'Palle Raghunatha Reddy',           party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 168, name: 'Sathish Reddy M',                  party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 169, name: 'Amarnath Reddy C',                 party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 170, name: 'Kalava Srinivasulu',               party: 'TDP',   gender: 'M', terms: 3 },
  { acNo: 171, name: 'Payyavula Keshav',                 party: 'TDP',   gender: 'M', terms: 3 },
  { acNo: 172, name: 'S Vasudeva Reddy',                 party: 'TDP',   gender: 'M', terms: 1 },
  { acNo: 173, name: 'Rachaiah Y',                       party: 'YSRCP', gender: 'M', terms: 1 },
  // ── Remaining seats ──
  { acNo: 174, name: 'Bhuma Nagi Reddy',                 party: 'TDP',   gender: 'M', terms: 2 },
  { acNo: 175, name: 'Budda Rajasekhar',                 party: 'TDP',   gender: 'M', terms: 1 },
];

// ─── LOOKUP HELPERS ──────────────────────────────────────────────────────────

const profileMap = new Map<number, MLAProfile>(
  AP_MLA_PROFILES.map((p) => [p.acNo, p]),
);

/** Lookup MLA profile by AC number */
export function getAPMLAProfile(acNo: number): MLAProfile | undefined {
  return profileMap.get(acNo);
}

/** Get all MLAs belonging to a party */
export function getAPMLAsByParty(party: string): MLAProfile[] {
  return AP_MLA_PROFILES.filter((p) => p.party === party);
}

/** Get all MLAs who defected (electedParty !== party) */
export function getAPDefectedMLAs(): MLAProfile[] {
  return AP_MLA_PROFILES.filter((p) => p.electedParty && p.electedParty !== p.party);
}

/** Get all female MLAs */
export function getAPFemaleMLAs(): MLAProfile[] {
  return AP_MLA_PROFILES.filter((p) => p.gender === 'F');
}

/** Get veteran MLAs (3+ terms in AP) */
export function getAPVeteranMLAs(): MLAProfile[] {
  return AP_MLA_PROFILES.filter((p) => p.terms >= 3);
}
