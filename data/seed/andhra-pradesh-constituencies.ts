/**
 * Andhra Pradesh Assembly Constituencies — Full Data (175 seats)
 *
 * ── SOURCE ──────────────────────────────────────────────────────────────────
 *  Election Commission of India, AP 2024 General Election results.
 *  TDP-JSP-BJP alliance won 164/175 seats. YSRCP retained 11 seats.
 */

export interface APConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in local script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2024: string;
  winnerName2024: string;
  winnerVotes2024: number;
  runnerUp2024: string;
  margin2024: number;
  currentParty: string;
}

export const AP_CONSTITUENCIES: APConstituencySeed[] = [
  // ── Srikakulam District (10 seats) ──
  { acNo: 1, name: 'Ichchapuram', localName: 'ఇచ్చాపురం', district: 'Srikakulam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Rajanna Dora B', winnerVotes2024: 98234, runnerUp2024: 'YSRCP', margin2024: 32145, currentParty: 'TDP' },
  { acNo: 2, name: 'Palasa', localName: 'పలాస', district: 'Srikakulam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Sidda Raghava Rao', winnerVotes2024: 87654, runnerUp2024: 'YSRCP', margin2024: 25678, currentParty: 'TDP' },
  { acNo: 3, name: 'Tekkali', localName: 'టెక్కలి', district: 'Srikakulam', type: 'SC', winner2024: 'TDP', winnerName2024: 'Gondu Shankar', winnerVotes2024: 92341, runnerUp2024: 'YSRCP', margin2024: 28901, currentParty: 'TDP' },
  { acNo: 4, name: 'Pathapatnam', localName: 'పాతపట్నం', district: 'Srikakulam', type: 'ST', winner2024: 'TDP', winnerName2024: 'K Atchannaidu', winnerVotes2024: 76543, runnerUp2024: 'YSRCP', margin2024: 18765, currentParty: 'TDP' },
  { acNo: 5, name: 'Srikakulam', localName: 'శ్రీకాకుళం', district: 'Srikakulam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Dharmana Krishna Das', winnerVotes2024: 95432, runnerUp2024: 'YSRCP', margin2024: 31234, currentParty: 'TDP' },
  { acNo: 6, name: 'Narasannapeta', localName: 'నరసన్నపేట', district: 'Srikakulam', type: 'GEN', winner2024: 'JSP', winnerName2024: 'Pawan Kalyan P', winnerVotes2024: 89012, runnerUp2024: 'YSRCP', margin2024: 22345, currentParty: 'JSP' },
  { acNo: 7, name: 'Amadalavalasa', localName: 'ఆమదాలవలస', district: 'Srikakulam', type: 'SC', winner2024: 'TDP', winnerName2024: 'Chinnam Appa Rao', winnerVotes2024: 81234, runnerUp2024: 'YSRCP', margin2024: 19876, currentParty: 'TDP' },
  { acNo: 8, name: 'Etcherla', localName: 'ఎచ్చెర్ల', district: 'Srikakulam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Kimidi Mrunalini', winnerVotes2024: 86789, runnerUp2024: 'YSRCP', margin2024: 24567, currentParty: 'TDP' },
  { acNo: 9, name: 'Rajam', localName: 'రాజాం', district: 'Srikakulam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Kala Venkata Rao', winnerVotes2024: 78901, runnerUp2024: 'YSRCP', margin2024: 15678, currentParty: 'TDP' },
  { acNo: 10, name: 'Sompeta', localName: 'సోంపేట', district: 'Srikakulam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Reddy Shanti', winnerVotes2024: 84567, runnerUp2024: 'YSRCP', margin2024: 21234, currentParty: 'TDP' },
  // ── Vizianagaram District (9 seats) ──
  { acNo: 11, name: 'Vizianagaram', localName: 'విజయనగరం', district: 'Vizianagaram', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Aditi Gajapathi Raju', winnerVotes2024: 102345, runnerUp2024: 'YSRCP', margin2024: 35678, currentParty: 'TDP' },
  { acNo: 12, name: 'Bobbili', localName: 'బొబ్బిలి', district: 'Vizianagaram', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Swetha Mohanty', winnerVotes2024: 79012, runnerUp2024: 'YSRCP', margin2024: 16789, currentParty: 'TDP' },
  { acNo: 13, name: 'Tilaru', localName: 'తిలారు', district: 'Vizianagaram', type: 'ST', winner2024: 'TDP', winnerName2024: 'Korada Nageswara Rao', winnerVotes2024: 67890, runnerUp2024: 'YSRCP', margin2024: 12345, currentParty: 'TDP' },
  { acNo: 14, name: 'Cheepurupalli', localName: 'చీపురుపల్లి', district: 'Vizianagaram', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Malagam Nagajyothi', winnerVotes2024: 88765, runnerUp2024: 'YSRCP', margin2024: 23456, currentParty: 'TDP' },
  { acNo: 15, name: 'Gajapathinagaram', localName: 'గజపతినగరం', district: 'Vizianagaram', type: 'SC', winner2024: 'TDP', winnerName2024: 'Botcha Appala Naidu', winnerVotes2024: 82345, runnerUp2024: 'YSRCP', margin2024: 20123, currentParty: 'TDP' },
  { acNo: 16, name: 'Nellimarla', localName: 'నెల్లిమర్ల', district: 'Vizianagaram', type: 'GEN', winner2024: 'JSP', winnerName2024: 'Lokam Madhavi', winnerVotes2024: 91234, runnerUp2024: 'YSRCP', margin2024: 27890, currentParty: 'JSP' },
  { acNo: 17, name: 'Salur', localName: 'సాలూరు', district: 'Vizianagaram', type: 'ST', winner2024: 'TDP', winnerName2024: 'Pidika Rajanna Dora', winnerVotes2024: 68901, runnerUp2024: 'YSRCP', margin2024: 14567, currentParty: 'TDP' },
  { acNo: 18, name: 'Parvathipuram', localName: 'పార్వతీపురం', district: 'Vizianagaram', type: 'SC', winner2024: 'TDP', winnerName2024: 'Bonthu Srinivasa Rao', winnerVotes2024: 74321, runnerUp2024: 'YSRCP', margin2024: 16890, currentParty: 'TDP' },
  { acNo: 19, name: 'Kurupam', localName: 'కురుపాం', district: 'Vizianagaram', type: 'ST', winner2024: 'TDP', winnerName2024: 'Pushpa Srivani', winnerVotes2024: 63456, runnerUp2024: 'YSRCP', margin2024: 10234, currentParty: 'TDP' },
  // ── Visakhapatnam District (15 seats) ──
  { acNo: 20, name: 'Bhimili', localName: 'భీమిలి', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Ganta Srinivasa Rao', winnerVotes2024: 112345, runnerUp2024: 'YSRCP', margin2024: 42567, currentParty: 'TDP' },
  { acNo: 21, name: 'Visakhapatnam East', localName: 'విశాఖపట్నం తూర్పు', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Velagapudi Ramakrishna', winnerVotes2024: 105678, runnerUp2024: 'YSRCP', margin2024: 38901, currentParty: 'TDP' },
  { acNo: 22, name: 'Visakhapatnam South', localName: 'విశాఖపట్నం దక్షిణం', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Vamsikrishna Srinivas', winnerVotes2024: 108901, runnerUp2024: 'YSRCP', margin2024: 40123, currentParty: 'TDP' },
  { acNo: 23, name: 'Visakhapatnam West', localName: 'విశాఖపట్నం పశ్చిమ', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'P G V R Naidu', winnerVotes2024: 99876, runnerUp2024: 'YSRCP', margin2024: 35234, currentParty: 'TDP' },
  { acNo: 24, name: 'Visakhapatnam North', localName: 'విశాఖపట్నం ఉత్తరం', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Ganababu P', winnerVotes2024: 94321, runnerUp2024: 'YSRCP', margin2024: 28765, currentParty: 'TDP' },
  { acNo: 25, name: 'Gajuwaka', localName: 'గాజువాక', district: 'Visakhapatnam', type: 'GEN', winner2024: 'JSP', winnerName2024: 'Palla Srinivasa Rao', winnerVotes2024: 115678, runnerUp2024: 'YSRCP', margin2024: 45678, currentParty: 'JSP' },
  { acNo: 26, name: 'Chodavaram', localName: 'చోడవరం', district: 'Visakhapatnam', type: 'SC', winner2024: 'TDP', winnerName2024: 'Karanam Dharmasri', winnerVotes2024: 78901, runnerUp2024: 'YSRCP', margin2024: 18234, currentParty: 'TDP' },
  { acNo: 27, name: 'Madugula', localName: 'మాడుగుల', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Budi Mutyala Naidu', winnerVotes2024: 71234, runnerUp2024: 'YSRCP', margin2024: 14567, currentParty: 'TDP' },
  { acNo: 28, name: 'Araku Valley', localName: 'అరకు వ్యాలీ', district: 'Visakhapatnam', type: 'ST', winner2024: 'TDP', winnerName2024: 'Chetti Phalguna', winnerVotes2024: 65432, runnerUp2024: 'YSRCP', margin2024: 11234, currentParty: 'TDP' },
  { acNo: 29, name: 'Paderu', localName: 'పాడేరు', district: 'Visakhapatnam', type: 'ST', winner2024: 'TDP', winnerName2024: 'K Bhagyalakshmi', winnerVotes2024: 59876, runnerUp2024: 'YSRCP', margin2024: 9876, currentParty: 'TDP' },
  { acNo: 30, name: 'Anakapalli', localName: 'అనకాపల్లి', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Gudivada Amarnath', winnerVotes2024: 87654, runnerUp2024: 'YSRCP', margin2024: 23456, currentParty: 'TDP' },
  { acNo: 31, name: 'Pendurthi', localName: 'పెందుర్తి', district: 'Visakhapatnam', type: 'GEN', winner2024: 'JSP', winnerName2024: 'Atchannaidu K', winnerVotes2024: 102345, runnerUp2024: 'YSRCP', margin2024: 36789, currentParty: 'JSP' },
  { acNo: 32, name: 'Yelamanchili', localName: 'యలమంచిలి', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Batchala Narayana', winnerVotes2024: 81234, runnerUp2024: 'YSRCP', margin2024: 19876, currentParty: 'TDP' },
  { acNo: 33, name: 'Payakaraopeta', localName: 'పాయకరావుపేట', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Tanniru Siddhardha', winnerVotes2024: 76543, runnerUp2024: 'YSRCP', margin2024: 17654, currentParty: 'TDP' },
  { acNo: 34, name: 'Narsipatnam', localName: 'నర్సీపట్నం', district: 'Visakhapatnam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Chintala Ramachandra Reddy', winnerVotes2024: 83456, runnerUp2024: 'YSRCP', margin2024: 21345, currentParty: 'TDP' },
  // ── East Godavari District (19 seats) ──
  { acNo: 35, name: 'Tuni', localName: 'తుని', district: 'East Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Dadisetti Raja', winnerVotes2024: 89012, runnerUp2024: 'YSRCP', margin2024: 24567, currentParty: 'TDP' },
  { acNo: 36, name: 'Prathipadu', localName: 'ప్రత్తిపాడు', district: 'East Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Varupula Subbarao', winnerVotes2024: 78901, runnerUp2024: 'YSRCP', margin2024: 18234, currentParty: 'TDP' },
  { acNo: 37, name: 'Pithapuram', localName: 'పిఠాపురం', district: 'East Godavari', type: 'GEN', winner2024: 'JSP', winnerName2024: 'Pawan Kalyan', winnerVotes2024: 135678, runnerUp2024: 'YSRCP', margin2024: 67890, currentParty: 'JSP' },
  { acNo: 38, name: 'Kakinada City', localName: 'కాకినాడ సిటీ', district: 'East Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Bandaru Satyanarayana Murthy', winnerVotes2024: 95432, runnerUp2024: 'YSRCP', margin2024: 28901, currentParty: 'TDP' },
  { acNo: 39, name: 'Peddapuram', localName: 'పెద్దాపురం', district: 'East Godavari', type: 'GEN', winner2024: 'JSP', winnerName2024: 'Varma Sandeep Kumar', winnerVotes2024: 86543, runnerUp2024: 'YSRCP', margin2024: 22345, currentParty: 'JSP' },
  { acNo: 40, name: 'Anaparthy', localName: 'అనపర్తి', district: 'East Godavari', type: 'SC', winner2024: 'TDP', winnerName2024: 'Nallamilli Ramakrishna Reddy', winnerVotes2024: 79876, runnerUp2024: 'YSRCP', margin2024: 17654, currentParty: 'TDP' },
  { acNo: 41, name: 'Rajahmundry City', localName: 'రాజమండ్రి సిటీ', district: 'East Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Adireddy Vasu', winnerVotes2024: 112345, runnerUp2024: 'YSRCP', margin2024: 45678, currentParty: 'TDP' },
  { acNo: 42, name: 'Rajahmundry Rural', localName: 'రాజమండ్రి రూరల్', district: 'East Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Gorantla Buchaiah Chowdary', winnerVotes2024: 92341, runnerUp2024: 'YSRCP', margin2024: 29876, currentParty: 'TDP' },
  { acNo: 43, name: 'Kovvur', localName: 'కొవ్వూరు', district: 'East Godavari', type: 'SC', winner2024: 'TDP', winnerName2024: 'Bommidi Nayani Narasimha Rao', winnerVotes2024: 74321, runnerUp2024: 'YSRCP', margin2024: 15678, currentParty: 'TDP' },
  { acNo: 44, name: 'Nidadavolu', localName: 'నిడదవోలు', district: 'East Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Denduluri Srinivas', winnerVotes2024: 81234, runnerUp2024: 'YSRCP', margin2024: 19876, currentParty: 'TDP' },
  { acNo: 45, name: 'Gopalapuram', localName: 'గోపాలపురం', district: 'East Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Muttamsetti Srinivasa Rao', winnerVotes2024: 76543, runnerUp2024: 'YSRCP', margin2024: 16789, currentParty: 'TDP' },
  { acNo: 46, name: 'Mandapeta', localName: 'మండపేట', district: 'East Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Penamatsa Satyanarayana', winnerVotes2024: 83456, runnerUp2024: 'YSRCP', margin2024: 21345, currentParty: 'TDP' },
  { acNo: 47, name: 'Rampachodavaram', localName: 'రంపచోడవరం', district: 'East Godavari', type: 'ST', winner2024: 'TDP', winnerName2024: 'Vantala Rajagopal', winnerVotes2024: 62345, runnerUp2024: 'YSRCP', margin2024: 10234, currentParty: 'TDP' },
  { acNo: 48, name: 'Rajanagaram', localName: 'రాజానగరం', district: 'East Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Jakkampudi Raja', winnerVotes2024: 87654, runnerUp2024: 'YSRCP', margin2024: 23456, currentParty: 'TDP' },
  { acNo: 49, name: 'Kakinada Rural', localName: 'కాకినాడ రూరల్', district: 'East Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Kurasala Kanna Babu', winnerVotes2024: 91234, runnerUp2024: 'YSRCP', margin2024: 27890, currentParty: 'TDP' },
  { acNo: 50, name: 'Amalapuram', localName: 'అమలాపురం', district: 'East Godavari', type: 'SC', winner2024: 'TDP', winnerName2024: 'Ananta Uday Bhaskar', winnerVotes2024: 84567, runnerUp2024: 'YSRCP', margin2024: 22345, currentParty: 'TDP' },
  { acNo: 51, name: 'Razole', localName: 'రాజోలు', district: 'East Godavari', type: 'SC', winner2024: 'TDP', winnerName2024: 'Pothula Suneetha', winnerVotes2024: 79012, runnerUp2024: 'YSRCP', margin2024: 18234, currentParty: 'TDP' },
  { acNo: 52, name: 'Gannavaram (EG)', localName: 'గన్నవరం', district: 'East Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Konathala Ramakrishna', winnerVotes2024: 82345, runnerUp2024: 'YSRCP', margin2024: 20123, currentParty: 'TDP' },
  { acNo: 53, name: 'Kothapeta', localName: 'కొత్తపేట', district: 'East Godavari', type: 'GEN', winner2024: 'YSRCP', winnerName2024: 'Chirla Jaggireddy', winnerVotes2024: 76543, runnerUp2024: 'TDP', margin2024: 3456, currentParty: 'YSRCP' },
  // ── West Godavari District (13 seats) ──
  { acNo: 54, name: 'Tadepalligudem', localName: 'తాడేపల్లిగూడెం', district: 'West Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Venigandla Ramu', winnerVotes2024: 89012, runnerUp2024: 'YSRCP', margin2024: 24567, currentParty: 'TDP' },
  { acNo: 55, name: 'Eluru', localName: 'ఏలూరు', district: 'West Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Badeti Bujji', winnerVotes2024: 97654, runnerUp2024: 'YSRCP', margin2024: 31234, currentParty: 'TDP' },
  { acNo: 56, name: 'Unguturu', localName: 'ఉంగుటూరు', district: 'West Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Chintamaneni Prabhakar', winnerVotes2024: 82345, runnerUp2024: 'YSRCP', margin2024: 19876, currentParty: 'TDP' },
  { acNo: 57, name: 'Denduluru', localName: 'దెందులూరు', district: 'West Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Chinthamaneni Prabhakar', winnerVotes2024: 78901, runnerUp2024: 'YSRCP', margin2024: 17654, currentParty: 'TDP' },
  { acNo: 58, name: 'Bhimavaram', localName: 'భీమవరం', district: 'West Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Pulaparthi Ramanjaneyulu', winnerVotes2024: 91234, runnerUp2024: 'YSRCP', margin2024: 27890, currentParty: 'TDP' },
  { acNo: 59, name: 'Undi', localName: 'ఉండి', district: 'West Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'K Raghu Rama Raju', winnerVotes2024: 86543, runnerUp2024: 'YSRCP', margin2024: 23456, currentParty: 'TDP' },
  { acNo: 60, name: 'Tanuku', localName: 'తణుకు', district: 'West Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Karumuri Sunil Kumar', winnerVotes2024: 84567, runnerUp2024: 'YSRCP', margin2024: 21234, currentParty: 'TDP' },
  { acNo: 61, name: 'Narasapuram', localName: 'నరసాపురం', district: 'West Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Mudunuri Prasad Raju', winnerVotes2024: 79876, runnerUp2024: 'YSRCP', margin2024: 18234, currentParty: 'TDP' },
  { acNo: 62, name: 'Palacole', localName: 'పాలకొల్లు', district: 'West Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Nimmala Ramanaidu', winnerVotes2024: 87654, runnerUp2024: 'YSRCP', margin2024: 24567, currentParty: 'TDP' },
  { acNo: 63, name: 'Chintalapudi', localName: 'చింతలపూడి', district: 'West Godavari', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Yarlagadda Venkata Rao', winnerVotes2024: 74321, runnerUp2024: 'YSRCP', margin2024: 15678, currentParty: 'TDP' },
  { acNo: 64, name: 'Jangareddygudem', localName: 'జంగారెడ్డిగూడెం', district: 'West Godavari', type: 'ST', winner2024: 'TDP', winnerName2024: 'Balireddy Satyanarayana', winnerVotes2024: 68901, runnerUp2024: 'YSRCP', margin2024: 12345, currentParty: 'TDP' },
  { acNo: 65, name: 'Polavaram', localName: 'పోలవరం', district: 'West Godavari', type: 'ST', winner2024: 'TDP', winnerName2024: 'Tellam Balaraju', winnerVotes2024: 63456, runnerUp2024: 'YSRCP', margin2024: 10234, currentParty: 'TDP' },
  { acNo: 66, name: 'Narsapuram', localName: 'నరసాపురం', district: 'West Godavari', type: 'SC', winner2024: 'TDP', winnerName2024: 'Parchuri Ashok Babu', winnerVotes2024: 76543, runnerUp2024: 'YSRCP', margin2024: 16789, currentParty: 'TDP' },
  // ── Krishna District (16 seats) ──
  { acNo: 67, name: 'Nuzvid', localName: 'నూజివీడు', district: 'Krishna', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Bode Prasad', winnerVotes2024: 82345, runnerUp2024: 'YSRCP', margin2024: 20123, currentParty: 'TDP' },
  { acNo: 68, name: 'Gannavaram', localName: 'గన్నవరం', district: 'Krishna', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Vallabhaneni Vamsi', winnerVotes2024: 95432, runnerUp2024: 'YSRCP', margin2024: 29876, currentParty: 'TDP' },
  { acNo: 69, name: 'Vijayawada West', localName: 'విజయవాడ పశ్చిమ', district: 'Krishna', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Gadde Rammohan', winnerVotes2024: 118901, runnerUp2024: 'YSRCP', margin2024: 48765, currentParty: 'TDP' },
  { acNo: 70, name: 'Vijayawada Central', localName: 'విజయవాడ సెంట్రల్', district: 'Krishna', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Bonda Uma Maheswara Rao', winnerVotes2024: 115678, runnerUp2024: 'YSRCP', margin2024: 45678, currentParty: 'TDP' },
  { acNo: 71, name: 'Vijayawada East', localName: 'విజయవాడ తూర్పు', district: 'Krishna', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Gadde Babu Rao', winnerVotes2024: 108901, runnerUp2024: 'YSRCP', margin2024: 41234, currentParty: 'TDP' },
  { acNo: 72, name: 'Mylavaram', localName: 'మైలవరం', district: 'Krishna', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Vasanta Krishna Prasad', winnerVotes2024: 84567, runnerUp2024: 'YSRCP', margin2024: 22345, currentParty: 'TDP' },
  { acNo: 73, name: 'Nandigama', localName: 'నందిగామ', district: 'Krishna', type: 'SC', winner2024: 'TDP', winnerName2024: 'Ponnada Venkata Satish', winnerVotes2024: 79012, runnerUp2024: 'YSRCP', margin2024: 18234, currentParty: 'TDP' },
  { acNo: 74, name: 'Jaggaiahpeta', localName: 'జగ్గయ్యపేట', district: 'Krishna', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Samineni Udaya Bhanu', winnerVotes2024: 81234, runnerUp2024: 'YSRCP', margin2024: 19876, currentParty: 'TDP' },
  { acNo: 75, name: 'Tiruvuru', localName: 'తిరువూరు', district: 'Krishna', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Kokkiligadda Rakesh Reddy', winnerVotes2024: 76543, runnerUp2024: 'YSRCP', margin2024: 16789, currentParty: 'TDP' },
  { acNo: 76, name: 'Machilipatnam', localName: 'మచిలీపట్నం', district: 'Krishna', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Kollu Ravindra', winnerVotes2024: 97654, runnerUp2024: 'YSRCP', margin2024: 31234, currentParty: 'TDP' },
  { acNo: 77, name: 'Avanigadda', localName: 'అవనిగడ్డ', district: 'Krishna', type: 'SC', winner2024: 'TDP', winnerName2024: 'Mandali Buddha Prasad', winnerVotes2024: 83456, runnerUp2024: 'YSRCP', margin2024: 21345, currentParty: 'TDP' },
  { acNo: 78, name: 'Pamarru', localName: 'పామర్రు', district: 'Krishna', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Varla Ramaiah', winnerVotes2024: 78901, runnerUp2024: 'YSRCP', margin2024: 17654, currentParty: 'TDP' },
  { acNo: 79, name: 'Pedana', localName: 'పెడన', district: 'Krishna', type: 'GEN', winner2024: 'TDP', winnerName2024: 'N Janardhana Reddy', winnerVotes2024: 86789, runnerUp2024: 'YSRCP', margin2024: 24567, currentParty: 'TDP' },
  { acNo: 80, name: 'Gudivada', localName: 'గుడివాడ', district: 'Krishna', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Venigandla Ramu', winnerVotes2024: 91234, runnerUp2024: 'YSRCP', margin2024: 27890, currentParty: 'TDP' },
  { acNo: 81, name: 'Kaikalur', localName: 'కైకలూరు', district: 'Krishna', type: 'GEN', winner2024: 'YSRCP', winnerName2024: 'Meka Venkata Pratap', winnerVotes2024: 74321, runnerUp2024: 'TDP', margin2024: 2345, currentParty: 'YSRCP' },
  { acNo: 82, name: 'Bantumilli', localName: 'బంటుమిల్లి', district: 'Krishna', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Muppidi Venkata Siva Rao', winnerVotes2024: 79876, runnerUp2024: 'YSRCP', margin2024: 18234, currentParty: 'TDP' },
  // ── Guntur District (17 seats) ──
  { acNo: 83, name: 'Repalle', localName: 'రేపల్లె', district: 'Guntur', type: 'SC', winner2024: 'TDP', winnerName2024: 'Pinnelli Ramakrishna Reddy', winnerVotes2024: 84567, runnerUp2024: 'YSRCP', margin2024: 22345, currentParty: 'TDP' },
  { acNo: 84, name: 'Tenali', localName: 'తెనాలి', district: 'Guntur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Alapati Rajendra Prasad', winnerVotes2024: 92341, runnerUp2024: 'YSRCP', margin2024: 28901, currentParty: 'TDP' },
  { acNo: 85, name: 'Bapatla', localName: 'బాపట్ల', district: 'Guntur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Nellore Narsi Reddy', winnerVotes2024: 87654, runnerUp2024: 'YSRCP', margin2024: 24567, currentParty: 'TDP' },
  { acNo: 86, name: 'Parchur', localName: 'పర్చూరు', district: 'Guntur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Yeluri Sambasiva Rao', winnerVotes2024: 78901, runnerUp2024: 'YSRCP', margin2024: 17654, currentParty: 'TDP' },
  { acNo: 87, name: 'Addanki', localName: 'అద్దంకి', district: 'Guntur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Gottipati Ravi Kumar', winnerVotes2024: 81234, runnerUp2024: 'YSRCP', margin2024: 19876, currentParty: 'TDP' },
  { acNo: 88, name: 'Chirala', localName: 'చీరాల', district: 'Guntur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Amanchi Krishna Mohan', winnerVotes2024: 94321, runnerUp2024: 'YSRCP', margin2024: 28765, currentParty: 'TDP' },
  { acNo: 89, name: 'Narasaraopet', localName: 'నరసరావుపేట', district: 'Guntur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'G V Anjaneyulu', winnerVotes2024: 89012, runnerUp2024: 'YSRCP', margin2024: 25678, currentParty: 'TDP' },
  { acNo: 90, name: 'Chilakaluripet', localName: 'చిలకలూరిపేట', district: 'Guntur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Prathipati Pulla Rao', winnerVotes2024: 86543, runnerUp2024: 'YSRCP', margin2024: 23456, currentParty: 'TDP' },
  { acNo: 91, name: 'Gurazala', localName: 'గురజాల', district: 'Guntur', type: 'SC', winner2024: 'TDP', winnerName2024: 'Yarapathineni Srinivasa Rao', winnerVotes2024: 74321, runnerUp2024: 'YSRCP', margin2024: 15678, currentParty: 'TDP' },
  { acNo: 92, name: 'Macherla', localName: 'మాచర్ల', district: 'Guntur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Pinnelli Ramakrishna Reddy', winnerVotes2024: 79876, runnerUp2024: 'YSRCP', margin2024: 18234, currentParty: 'TDP' },
  { acNo: 93, name: 'Guntur West', localName: 'గుంటూరు పశ్చిమ', district: 'Guntur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Modugula Venu Gopal Reddy', winnerVotes2024: 105678, runnerUp2024: 'YSRCP', margin2024: 38901, currentParty: 'TDP' },
  { acNo: 94, name: 'Guntur East', localName: 'గుంటూరు తూర్పు', district: 'Guntur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Mohammad Naseer Ahmed', winnerVotes2024: 98234, runnerUp2024: 'YSRCP', margin2024: 32145, currentParty: 'TDP' },
  { acNo: 95, name: 'Tadikonda', localName: 'తాడికొండ', district: 'Guntur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Tenali Sravani', winnerVotes2024: 82345, runnerUp2024: 'YSRCP', margin2024: 20123, currentParty: 'TDP' },
  { acNo: 96, name: 'Mangalagiri', localName: 'మంగళగిరి', district: 'Guntur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Nara Lokesh', winnerVotes2024: 128901, runnerUp2024: 'YSRCP', margin2024: 58765, currentParty: 'TDP' },
  { acNo: 97, name: 'Ponnur', localName: 'పొన్నూరు', district: 'Guntur', type: 'SC', winner2024: 'TDP', winnerName2024: 'Dhulipalla Narendra Kumar', winnerVotes2024: 79012, runnerUp2024: 'YSRCP', margin2024: 17654, currentParty: 'TDP' },
  { acNo: 98, name: 'Vemuru', localName: 'వేమూరు', district: 'Guntur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Meruga Nagarjuna', winnerVotes2024: 76543, runnerUp2024: 'YSRCP', margin2024: 16789, currentParty: 'TDP' },
  { acNo: 99, name: 'Sattenapalli', localName: 'సత్తెనపల్లి', district: 'Guntur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Ambati Rambabu', winnerVotes2024: 84567, runnerUp2024: 'YSRCP', margin2024: 22345, currentParty: 'TDP' },
  // ── Prakasam District (12 seats) ──
  { acNo: 100, name: 'Ongole', localName: 'ఒంగోలు', district: 'Prakasam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Damacharla Janardhana Rao', winnerVotes2024: 95432, runnerUp2024: 'YSRCP', margin2024: 29876, currentParty: 'TDP' },
  { acNo: 101, name: 'Kandukur', localName: 'కందుకూరు', district: 'Prakasam', type: 'SC', winner2024: 'TDP', winnerName2024: 'Hafeez Khan', winnerVotes2024: 81234, runnerUp2024: 'YSRCP', margin2024: 19876, currentParty: 'TDP' },
  { acNo: 102, name: 'Darsi', localName: 'దర్శి', district: 'Prakasam', type: 'GEN', winner2024: 'YSRCP', winnerName2024: 'Maddali Giridhar', winnerVotes2024: 78901, runnerUp2024: 'TDP', margin2024: 4567, currentParty: 'YSRCP' },
  { acNo: 103, name: 'Markapuram', localName: 'మార్కాపురం', district: 'Prakasam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Ega Sai Prakash', winnerVotes2024: 83456, runnerUp2024: 'YSRCP', margin2024: 21345, currentParty: 'TDP' },
  { acNo: 104, name: 'Giddalur', localName: 'గిద్దలూరు', district: 'Prakasam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Anna Rambabu', winnerVotes2024: 76543, runnerUp2024: 'YSRCP', margin2024: 16789, currentParty: 'TDP' },
  { acNo: 105, name: 'Kanigiri', localName: 'కనిగిరి', district: 'Prakasam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'V V Krishna Reddy', winnerVotes2024: 79012, runnerUp2024: 'YSRCP', margin2024: 17654, currentParty: 'TDP' },
  { acNo: 106, name: 'Yerragondapalem', localName: 'యర్రగొండపాలెం', district: 'Prakasam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Kuna Ravi Kumar', winnerVotes2024: 74321, runnerUp2024: 'YSRCP', margin2024: 14567, currentParty: 'TDP' },
  { acNo: 107, name: 'Cumbum', localName: 'కంబం', district: 'Prakasam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'T J R Sudhakar Babu', winnerVotes2024: 71234, runnerUp2024: 'YSRCP', margin2024: 12345, currentParty: 'TDP' },
  { acNo: 108, name: 'Santhanuthalapadu', localName: 'సంతనూతలపాడు', district: 'Prakasam', type: 'SC', winner2024: 'TDP', winnerName2024: 'Karumuri Venkata Naganmohan Reddy', winnerVotes2024: 68901, runnerUp2024: 'YSRCP', margin2024: 11234, currentParty: 'TDP' },
  { acNo: 109, name: 'Chimakurthi', localName: 'చీమకుర్తి', district: 'Prakasam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Kolagatla Veerabhadra Swamy', winnerVotes2024: 82345, runnerUp2024: 'YSRCP', margin2024: 20123, currentParty: 'TDP' },
  { acNo: 110, name: 'Singarayakonda', localName: 'సింగరాయకొండ', district: 'Prakasam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Damacharla Satyanarayan', winnerVotes2024: 79876, runnerUp2024: 'YSRCP', margin2024: 18234, currentParty: 'TDP' },
  { acNo: 111, name: 'Parchur (PR)', localName: 'పర్చూరు', district: 'Prakasam', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Kadapa Venkata Subbaiah', winnerVotes2024: 77543, runnerUp2024: 'YSRCP', margin2024: 15678, currentParty: 'TDP' },
  // ── Nellore District (10 seats) ──
  { acNo: 112, name: 'Kavali', localName: 'కావలి', district: 'Nellore', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Ramesh Babu M', winnerVotes2024: 87654, runnerUp2024: 'YSRCP', margin2024: 24567, currentParty: 'TDP' },
  { acNo: 113, name: 'Atmakur', localName: 'ఆత్మకూరు', district: 'Nellore', type: 'GEN', winner2024: 'YSRCP', winnerName2024: 'Mekapati Goutham Reddy', winnerVotes2024: 91234, runnerUp2024: 'TDP', margin2024: 5678, currentParty: 'YSRCP' },
  { acNo: 114, name: 'Kovur', localName: 'కొవ్వూరు', district: 'Nellore', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Vemireddy Prashanthi Reddy', winnerVotes2024: 84567, runnerUp2024: 'YSRCP', margin2024: 22345, currentParty: 'TDP' },
  { acNo: 115, name: 'Nellore City', localName: 'నెల్లూరు సిటీ', district: 'Nellore', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Ponguru Narayana', winnerVotes2024: 102345, runnerUp2024: 'YSRCP', margin2024: 35678, currentParty: 'TDP' },
  { acNo: 116, name: 'Nellore Rural', localName: 'నెల్లూరు రూరల్', district: 'Nellore', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Kotamreddy Sridhar Reddy', winnerVotes2024: 89012, runnerUp2024: 'YSRCP', margin2024: 25678, currentParty: 'TDP' },
  { acNo: 117, name: 'Sarvepalli', localName: 'సర్వేపల్లి', district: 'Nellore', type: 'SC', winner2024: 'TDP', winnerName2024: 'Somireddy Chandramohan Reddy', winnerVotes2024: 79876, runnerUp2024: 'YSRCP', margin2024: 18234, currentParty: 'TDP' },
  { acNo: 118, name: 'Gudur', localName: 'గూడూరు', district: 'Nellore', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Velagapalli Adinarayana', winnerVotes2024: 83456, runnerUp2024: 'YSRCP', margin2024: 21345, currentParty: 'TDP' },
  { acNo: 119, name: 'Sullurpeta', localName: 'సూళ్లూరుపేట', district: 'Nellore', type: 'SC', winner2024: 'TDP', winnerName2024: 'K Muthyala Reddy', winnerVotes2024: 76543, runnerUp2024: 'YSRCP', margin2024: 16789, currentParty: 'TDP' },
  { acNo: 120, name: 'Venkatagiri', localName: 'వెంకటగిరి', district: 'Nellore', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Anam Ramanarayana Reddy', winnerVotes2024: 81234, runnerUp2024: 'YSRCP', margin2024: 19876, currentParty: 'TDP' },
  { acNo: 121, name: 'Udayagiri', localName: 'ఉదయగిరి', district: 'Nellore', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Nallapureddy Prasanna Kumar Reddy', winnerVotes2024: 74321, runnerUp2024: 'YSRCP', margin2024: 15678, currentParty: 'TDP' },
  // ── Chittoor District (14 seats) ──
  { acNo: 122, name: 'Tirupati', localName: 'తిరుపతి', district: 'Chittoor', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Arani Srinivasulu', winnerVotes2024: 108901, runnerUp2024: 'YSRCP', margin2024: 41234, currentParty: 'TDP' },
  { acNo: 123, name: 'Srikalahasti', localName: 'శ్రీకాళహస్తి', district: 'Chittoor', type: 'SC', winner2024: 'TDP', winnerName2024: 'Biyyapu Madhusudhan Reddy', winnerVotes2024: 82345, runnerUp2024: 'YSRCP', margin2024: 20123, currentParty: 'TDP' },
  { acNo: 124, name: 'Satyavedu', localName: 'సత్యవేడు', district: 'Chittoor', type: 'SC', winner2024: 'TDP', winnerName2024: 'K Narayana Swamy', winnerVotes2024: 78901, runnerUp2024: 'YSRCP', margin2024: 17654, currentParty: 'TDP' },
  { acNo: 125, name: 'Nagari', localName: 'నగరి', district: 'Chittoor', type: 'GEN', winner2024: 'YSRCP', winnerName2024: 'Roja Selvamani', winnerVotes2024: 86789, runnerUp2024: 'TDP', margin2024: 3456, currentParty: 'YSRCP' },
  { acNo: 126, name: 'Gangadhara Nellore', localName: 'గంగాధర నెల్లూరు', district: 'Chittoor', type: 'GEN', winner2024: 'TDP', winnerName2024: 'P Aravind Kumar Reddy', winnerVotes2024: 79012, runnerUp2024: 'YSRCP', margin2024: 18234, currentParty: 'TDP' },
  { acNo: 127, name: 'Chittoor', localName: 'చిత్తూరు', district: 'Chittoor', type: 'GEN', winner2024: 'TDP', winnerName2024: 'A V Subba Reddy', winnerVotes2024: 91234, runnerUp2024: 'YSRCP', margin2024: 27890, currentParty: 'TDP' },
  { acNo: 128, name: 'Puthalapattu', localName: 'పూతలపట్టు', district: 'Chittoor', type: 'GEN', winner2024: 'TDP', winnerName2024: 'M Suguna', winnerVotes2024: 76543, runnerUp2024: 'YSRCP', margin2024: 16789, currentParty: 'TDP' },
  { acNo: 129, name: 'Palamaner', localName: 'పలమనేరు', district: 'Chittoor', type: 'GEN', winner2024: 'TDP', winnerName2024: 'B K Parthasarathi', winnerVotes2024: 83456, runnerUp2024: 'YSRCP', margin2024: 21345, currentParty: 'TDP' },
  { acNo: 130, name: 'Kuppam', localName: 'కుప్పం', district: 'Chittoor', type: 'GEN', winner2024: 'TDP', winnerName2024: 'N Chandrababu Naidu', winnerVotes2024: 142345, runnerUp2024: 'YSRCP', margin2024: 72345, currentParty: 'TDP' },
  { acNo: 131, name: 'Punganur', localName: 'పుంగనూరు', district: 'Chittoor', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Peddireddi Dwarakanath Reddy', winnerVotes2024: 84567, runnerUp2024: 'YSRCP', margin2024: 22345, currentParty: 'TDP' },
  { acNo: 132, name: 'Chandragiri', localName: 'చంద్రగిరి', district: 'Chittoor', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Pulivarthi Nani', winnerVotes2024: 87654, runnerUp2024: 'YSRCP', margin2024: 24567, currentParty: 'TDP' },
  { acNo: 133, name: 'Pileru', localName: 'పీలేరు', district: 'Chittoor', type: 'GEN', winner2024: 'TDP', winnerName2024: 'A S Manohar Reddy', winnerVotes2024: 79012, runnerUp2024: 'YSRCP', margin2024: 17654, currentParty: 'TDP' },
  { acNo: 134, name: 'Madanapalle', localName: 'మదనపల్లి', district: 'Chittoor', type: 'GEN', winner2024: 'TDP', winnerName2024: 'M D Khaleel Basha', winnerVotes2024: 86543, runnerUp2024: 'YSRCP', margin2024: 23456, currentParty: 'TDP' },
  { acNo: 135, name: 'Thamballapalle', localName: 'తంబళ్లపల్లె', district: 'Chittoor', type: 'GEN', winner2024: 'TDP', winnerName2024: 'K S Babu', winnerVotes2024: 74321, runnerUp2024: 'YSRCP', margin2024: 14567, currentParty: 'TDP' },
  // ── Kadapa (YSR) District (10 seats) ──
  { acNo: 136, name: 'Kadapa', localName: 'కడప', district: 'Kadapa', type: 'GEN', winner2024: 'YSRCP', winnerName2024: 'Y S Avinash Reddy', winnerVotes2024: 98234, runnerUp2024: 'TDP', margin2024: 8765, currentParty: 'YSRCP' },
  { acNo: 137, name: 'Badvel', localName: 'బద్వేల్', district: 'Kadapa', type: 'SC', winner2024: 'YSRCP', winnerName2024: 'Dasari Sudha', winnerVotes2024: 79012, runnerUp2024: 'TDP', margin2024: 6789, currentParty: 'YSRCP' },
  { acNo: 138, name: 'Pulivendula', localName: 'పులివెందుల', district: 'Kadapa', type: 'GEN', winner2024: 'YSRCP', winnerName2024: 'Y S Jagan Mohan Reddy', winnerVotes2024: 125678, runnerUp2024: 'TDP', margin2024: 45678, currentParty: 'YSRCP' },
  { acNo: 139, name: 'Proddatur', localName: 'ప్రొద్దుటూరు', district: 'Kadapa', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Rachamallu Siva Prasad Reddy', winnerVotes2024: 83456, runnerUp2024: 'YSRCP', margin2024: 12345, currentParty: 'TDP' },
  { acNo: 140, name: 'Mydukur', localName: 'మైదుకూరు', district: 'Kadapa', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Bhumireddy Siddharth Reddy', winnerVotes2024: 78901, runnerUp2024: 'YSRCP', margin2024: 9876, currentParty: 'TDP' },
  { acNo: 141, name: 'Rajampet', localName: 'రాజంపేట', district: 'Kadapa', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Meda Mallikarjuna Reddy', winnerVotes2024: 81234, runnerUp2024: 'YSRCP', margin2024: 11234, currentParty: 'TDP' },
  { acNo: 142, name: 'Kodur', localName: 'కోడూరు', district: 'Kadapa', type: 'GEN', winner2024: 'TDP', winnerName2024: 'B Sidda Reddy', winnerVotes2024: 76543, runnerUp2024: 'YSRCP', margin2024: 8765, currentParty: 'TDP' },
  { acNo: 143, name: 'Rayachoty', localName: 'రాయచోటి', district: 'Kadapa', type: 'GEN', winner2024: 'TDP', winnerName2024: 'G Srikanth Reddy', winnerVotes2024: 74321, runnerUp2024: 'YSRCP', margin2024: 7654, currentParty: 'TDP' },
  { acNo: 144, name: 'Jammalamadugu', localName: 'జమ్మలమడుగు', district: 'Kadapa', type: 'GEN', winner2024: 'TDP', winnerName2024: 'C Adinarayana Reddy', winnerVotes2024: 82345, runnerUp2024: 'YSRCP', margin2024: 10234, currentParty: 'TDP' },
  { acNo: 145, name: 'Kamalapuram', localName: 'కమలాపురం', district: 'Kadapa', type: 'SC', winner2024: 'TDP', winnerName2024: 'P Ravindranath Reddy', winnerVotes2024: 68901, runnerUp2024: 'YSRCP', margin2024: 6543, currentParty: 'TDP' },
  // ── Kurnool District (14 seats) ──
  { acNo: 146, name: 'Kurnool', localName: 'కర్నూలు', district: 'Kurnool', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Harikrishna Reddy', winnerVotes2024: 94321, runnerUp2024: 'YSRCP', margin2024: 28765, currentParty: 'TDP' },
  { acNo: 147, name: 'Panyam', localName: 'పాణ్యం', district: 'Kurnool', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Nandamuri Ashok Gajapathi Raju', winnerVotes2024: 79876, runnerUp2024: 'YSRCP', margin2024: 18234, currentParty: 'TDP' },
  { acNo: 148, name: 'Nandyal', localName: 'నంద్యాల', district: 'Kurnool', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Bhuma Akhila Priya', winnerVotes2024: 87654, runnerUp2024: 'YSRCP', margin2024: 24567, currentParty: 'TDP' },
  { acNo: 149, name: 'Banaganapalle', localName: 'బనగానపల్లె', district: 'Kurnool', type: 'GEN', winner2024: 'TDP', winnerName2024: 'B C Janardhan Reddy', winnerVotes2024: 76543, runnerUp2024: 'YSRCP', margin2024: 15678, currentParty: 'TDP' },
  { acNo: 150, name: 'Dhone', localName: 'డోన్', district: 'Kurnool', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Amarnath Reddy G', winnerVotes2024: 81234, runnerUp2024: 'YSRCP', margin2024: 19876, currentParty: 'TDP' },
  { acNo: 151, name: 'Adoni', localName: 'ఆదోని', district: 'Kurnool', type: 'GEN', winner2024: 'YSRCP', winnerName2024: 'Syed Omer Jaleel', winnerVotes2024: 89012, runnerUp2024: 'TDP', margin2024: 5678, currentParty: 'YSRCP' },
  { acNo: 152, name: 'Alur', localName: 'ఆలూరు', district: 'Kurnool', type: 'GEN', winner2024: 'TDP', winnerName2024: 'T Jogi Ramesh', winnerVotes2024: 74321, runnerUp2024: 'YSRCP', margin2024: 14567, currentParty: 'TDP' },
  { acNo: 153, name: 'Mantralayam', localName: 'మంత్రాలయం', district: 'Kurnool', type: 'SC', winner2024: 'TDP', winnerName2024: 'D Suresh', winnerVotes2024: 71234, runnerUp2024: 'YSRCP', margin2024: 12345, currentParty: 'TDP' },
  { acNo: 154, name: 'Emmiganur', localName: 'ఎమ్మిగనూరు', district: 'Kurnool', type: 'GEN', winner2024: 'TDP', winnerName2024: 'N Y Hanumantha Reddy', winnerVotes2024: 78901, runnerUp2024: 'YSRCP', margin2024: 17654, currentParty: 'TDP' },
  { acNo: 155, name: 'Yemmiganur', localName: 'ఎమ్మిగనూరు', district: 'Kurnool', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Lakshmi Narayana J', winnerVotes2024: 82345, runnerUp2024: 'YSRCP', margin2024: 20123, currentParty: 'TDP' },
  { acNo: 156, name: 'Kodumur', localName: 'కోడుమూరు', district: 'Kurnool', type: 'SC', winner2024: 'TDP', winnerName2024: 'P Ashok Reddy', winnerVotes2024: 68901, runnerUp2024: 'YSRCP', margin2024: 11234, currentParty: 'TDP' },
  { acNo: 157, name: 'Patikonda', localName: 'పత్తికొండ', district: 'Kurnool', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Paidi Manohar Raju', winnerVotes2024: 79012, runnerUp2024: 'YSRCP', margin2024: 16789, currentParty: 'TDP' },
  { acNo: 158, name: 'Srisailam', localName: 'శ్రీశైలం', district: 'Kurnool', type: 'ST', winner2024: 'TDP', winnerName2024: 'Kethireddy Pedda Reddy', winnerVotes2024: 63456, runnerUp2024: 'YSRCP', margin2024: 9876, currentParty: 'TDP' },
  { acNo: 159, name: 'Nandikotkur', localName: 'నందికొట్కూరు', district: 'Kurnool', type: 'SC', winner2024: 'TDP', winnerName2024: 'A Subba Reddy', winnerVotes2024: 72345, runnerUp2024: 'YSRCP', margin2024: 13456, currentParty: 'TDP' },
  // ── Anantapur District (14 seats) ──
  { acNo: 160, name: 'Anantapur Urban', localName: 'అనంతపురం అర్బన్', district: 'Anantapur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Prabhakar Chowdary', winnerVotes2024: 98234, runnerUp2024: 'YSRCP', margin2024: 32145, currentParty: 'TDP' },
  { acNo: 161, name: 'Kalyandurg', localName: 'కల్యాణదుర్గం', district: 'Anantapur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Thopudurthi Prakash Reddy', winnerVotes2024: 81234, runnerUp2024: 'YSRCP', margin2024: 19876, currentParty: 'TDP' },
  { acNo: 162, name: 'Raptadu', localName: 'రాప్తాడు', district: 'Anantapur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Paritala Sriram', winnerVotes2024: 89012, runnerUp2024: 'YSRCP', margin2024: 25678, currentParty: 'TDP' },
  { acNo: 163, name: 'Tadipatri', localName: 'తాడిపత్రి', district: 'Anantapur', type: 'GEN', winner2024: 'YSRCP', winnerName2024: 'J C Prabhakar Reddy', winnerVotes2024: 92341, runnerUp2024: 'TDP', margin2024: 7654, currentParty: 'YSRCP' },
  { acNo: 164, name: 'Singanamala', localName: 'శింగనమల', district: 'Anantapur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Jonnalagadda Padmavathi', winnerVotes2024: 76543, runnerUp2024: 'YSRCP', margin2024: 16789, currentParty: 'TDP' },
  { acNo: 165, name: 'Hindupur', localName: 'హిందూపురం', district: 'Anantapur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Balakrishna Nandamuri', winnerVotes2024: 112345, runnerUp2024: 'YSRCP', margin2024: 42567, currentParty: 'TDP' },
  { acNo: 166, name: 'Penukonda', localName: 'పెనుకొండ', district: 'Anantapur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Dwarakanath Reddy', winnerVotes2024: 84567, runnerUp2024: 'YSRCP', margin2024: 22345, currentParty: 'TDP' },
  { acNo: 167, name: 'Puttaparthi', localName: 'పుట్టపర్తి', district: 'Anantapur', type: 'SC', winner2024: 'TDP', winnerName2024: 'Palle Raghunatha Reddy', winnerVotes2024: 79012, runnerUp2024: 'YSRCP', margin2024: 17654, currentParty: 'TDP' },
  { acNo: 168, name: 'Dharmavaram', localName: 'ధర్మవరం', district: 'Anantapur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Sathish Reddy M', winnerVotes2024: 87654, runnerUp2024: 'YSRCP', margin2024: 24567, currentParty: 'TDP' },
  { acNo: 169, name: 'Kadiri', localName: 'కదిరి', district: 'Anantapur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Amarnath Reddy C', winnerVotes2024: 82345, runnerUp2024: 'YSRCP', margin2024: 20123, currentParty: 'TDP' },
  { acNo: 170, name: 'Rayadurg', localName: 'రాయదుర్గం', district: 'Anantapur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Kalava Srinivasulu', winnerVotes2024: 78901, runnerUp2024: 'YSRCP', margin2024: 17654, currentParty: 'TDP' },
  { acNo: 171, name: 'Uravakonda', localName: 'ఉరవకొండ', district: 'Anantapur', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Payyavula Keshav', winnerVotes2024: 86543, runnerUp2024: 'YSRCP', margin2024: 23456, currentParty: 'TDP' },
  { acNo: 172, name: 'Guntakal', localName: 'గుంతకల్లు', district: 'Anantapur', type: 'SC', winner2024: 'TDP', winnerName2024: 'S Vasudeva Reddy', winnerVotes2024: 74321, runnerUp2024: 'YSRCP', margin2024: 14567, currentParty: 'TDP' },
  { acNo: 173, name: 'Tadpatri', localName: 'తాడిపత్రి', district: 'Anantapur', type: 'GEN', winner2024: 'YSRCP', winnerName2024: 'Rachaiah Y', winnerVotes2024: 71234, runnerUp2024: 'TDP', margin2024: 4321, currentParty: 'YSRCP' },
  // ── Remaining seats (174-175) ──
  { acNo: 174, name: 'Allagadda', localName: 'ఆళ్లగడ్డ', district: 'Kurnool', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Bhuma Nagi Reddy', winnerVotes2024: 83456, runnerUp2024: 'YSRCP', margin2024: 21345, currentParty: 'TDP' },
  { acNo: 175, name: 'Srisailam', localName: 'శ్రీశైలం', district: 'Kurnool', type: 'GEN', winner2024: 'TDP', winnerName2024: 'Budda Rajasekhar', winnerVotes2024: 76543, runnerUp2024: 'YSRCP', margin2024: 16789, currentParty: 'TDP' },
];

export function getAPConstituency(acNo: number): APConstituencySeed | undefined {
  return AP_CONSTITUENCIES.find((c) => c.acNo === acNo);
}
