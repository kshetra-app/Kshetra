#!/usr/bin/env node
/**
 * Parse the LokSabha2024 winners page HTML (already fetched)
 * and generate the complete 543-MP seed.
 *
 * Also merge with Rajya Sabha data from sansad.in
 * 
 * Usage: node scrapers/parse-and-generate-mp-seed.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SANSAD_DIR  = path.resolve(__dirname, 'output', 'sansad');
const MYNETA_DIR  = path.resolve(__dirname, 'output', 'myneta');
const SEED_FILE   = path.resolve(__dirname, '../data/seed/mp-profiles.ts');

const SLEEP = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Fetch helper ─────────────────────────────────────────────────────────────
function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      }
    }, (res) => {
      if ([301,302].includes(res.statusCode)) return resolve(fetchHtml(res.headers.location));
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

// ─── State mapping from constituency ─────────────────────────────────────────
// Maps LS constituency names to state codes based on 2024 data
const CONSTITUENCY_STATE_MAP = {
  // Andhra Pradesh
  'ARAKU': 'AP', 'SRIKAKULAM': 'AP', 'VIZIANAGARAM': 'AP', 'VISAKHAPATNAM': 'AP',
  'ANAKAPALLE': 'AP', 'KAKINADA': 'AP', 'AMALAPURAM': 'AP', 'RAJAHMUNDRY': 'AP',
  'NARASAPURAM': 'AP', 'ELURU': 'AP', 'MACHILIPATNAM': 'AP', 'VIJAYAWADA': 'AP',
  'NARASARAOPET': 'AP', 'BAPATLA': 'AP', 'ONGOLE': 'AP', 'NANDYAL': 'AP',
  'KURNOOL': 'AP', 'ANANTAPUR': 'AP', 'HINDUPUR': 'AP', 'KADAPA': 'AP',
  'NELLORE': 'AP', 'TIRUPATI': 'AP', 'RAJAMPET': 'AP', 'CHITTOOR': 'AP',
  // Andaman
  'ANDAMAN AND NICOBAR ISLANDS': 'AN',
  // Arunachal Pradesh
  'ARUNACHAL EAST': 'AR', 'ARUNACHAL WEST': 'AR',
  // Assam

  // Bihar
  'VALMIKI NAGAR': 'BR', 'PASCHIM CHAMPARAN': 'BR', 'PURVI CHAMPARAN': 'BR',
  'SITAMARHI': 'BR', 'MADHUBANI': 'BR', 'JHANJHARPUR': 'BR', 'SUPAUL': 'BR',
  'ARARIA': 'BR', 'KISHANGANJ': 'BR', 'KATIHAR': 'BR', 'PURNIA': 'BR',
  'MADHEPURA': 'BR', 'DARBHANGA': 'BR', 'MUZAFFARPUR': 'BR', 'VAISHALI': 'BR',
  'GOPALGANJ': 'BR', 'SIWAN': 'BR', 'MAHARAJGANJ': 'BR', 'SARAN': 'BR',
  'HAJIPUR': 'BR', 'UJIARPUR': 'BR', 'SAMASTIPUR': 'BR', 'BEGUSARAI': 'BR',
  'KHAGARIA': 'BR', 'BHAGALPUR': 'BR', 'BANKA': 'BR', 'MUNGER': 'BR',
  'NALANDA': 'BR', 'PATNA SAHIB': 'BR', 'PATALIPUTRA': 'BR', 'ARRAH': 'BR',
  'BUXAR': 'BR', 'SASARAM': 'BR', 'KARAKAT': 'BR', 'JAHANABAD': 'BR',
  'AURANGABAD': 'BR', 'GAYA': 'BR', 'NAWADA': 'BR', 'JAMUI': 'BR',
  // Chandigarh
  'CHANDIGARH': 'CH',
  // Chhattisgarh
  'SARGUJA': 'CG', 'RAIGARH': 'CG', 'JANJGIR-CHAMPA': 'CG', 'KORBA': 'CG',
  'BILASPUR': 'CG', 'RAJNANDGAON': 'CG', 'DURG': 'CG', 'RAIPUR': 'CG',
  'MAHASAMUND': 'CG', 'BASTAR': 'CG', 'KANKER': 'CG',
  // Dadra
  'DADRA AND NAGAR HAVELI': 'DN',
  // Daman
  'DAMAN AND DIU': 'DD',
  // Delhi
  'CHANDNI CHOWK': 'DL', 'NORTH EAST DELHI': 'DL', 'EAST DELHI': 'DL',
  'NEW DELHI': 'DL', 'NORTH WEST DELHI': 'DL', 'WEST DELHI': 'DL',
  'SOUTH DELHI': 'DL',
  // Goa
  'NORTH GOA': 'GA', 'SOUTH GOA': 'GA',
  // Gujarat
  'KACHCHH': 'GJ', 'BANASKANTHA': 'GJ', 'PATAN': 'GJ', 'MAHESANA': 'GJ',
  'SABARKANTHA': 'GJ', 'GANDHINAGAR': 'GJ', 'AHMEDABAD EAST': 'GJ',
  'AHMEDABAD WEST': 'GJ', 'SURENDRANAGAR': 'GJ', 'RAJKOT': 'GJ',
  'PORBANDAR': 'GJ', 'JAMNAGAR': 'GJ', 'JUNAGADH': 'GJ', 'AMRELI': 'GJ',
  'BHAVNAGAR': 'GJ', 'ANAND': 'GJ', 'KHEDA': 'GJ', 'PANCHMAHAL': 'GJ',
  'DAHOD': 'GJ', 'VADODARA': 'GJ', 'CHHOTA UDAIPUR': 'GJ', 'BHARUCH': 'GJ',
  'BARDOLI': 'GJ', 'SURAT': 'GJ', 'NAVSARI': 'GJ', 'VALSAD': 'GJ',
  // Haryana
  'AMBALA': 'HR', 'KURUKSHETRA': 'HR', 'SIRSA': 'HR', 'HISAR': 'HR',
  'KARNAL': 'HR', 'SONIPAT': 'HR', 'ROHTAK': 'HR', 'BHIWANI-MAHENDRAGARH': 'HR',
  'GURGAON': 'HR', 'FARIDABAD': 'HR',
  // Himachal Pradesh
  'KANGRA': 'HP', 'MANDI': 'HP', 'HAMIRPUR': 'HP', 'SHIMLA': 'HP',
  // Jammu & Kashmir
  'BARAMULLA': 'JK', 'SRINAGAR': 'JK', 'ANANTNAG-RAJOURI': 'JK',
  'UDHAMPUR': 'JK', 'JAMMU': 'JK', 'LADAKH': 'LA',
  // Jharkhand
  'RAJMAHAL': 'JH', 'DUMKA': 'JH', 'GODDA': 'JH', 'CHATRA': 'JH',
  'KODERMA': 'JH', 'GIRIDIH': 'JH', 'DHANBAD': 'JH', 'RANCHI': 'JH',
  'JAMSHEDPUR': 'JH', 'SINGHBHUM': 'JH', 'KHUNTI': 'JH', 'LOHARDAGA': 'JH',
  'PALAMU': 'JH', 'HAZARIBAGH': 'JH',
  // Karnataka
  'CHIKKODI': 'KA', 'BELGAUM': 'KA', 'BAGALKOT': 'KA', 'BIJAPUR': 'KA',
  'GULBARGA': 'KA', 'RAICHUR': 'KA', 'BIDAR': 'KA', 'KOPPAL': 'KA',
  'BELLARY': 'KA', 'HAVERI': 'KA', 'DHARWAD': 'KA', 'UTTARA KANNADA': 'KA',
  'DAVANAGERE': 'KA', 'SHIMOGA': 'KA', 'UDUPI CHIKMAGALUR': 'KA',
  'HASSAN': 'KA', 'DAKSHINA KANNADA': 'KA', 'CHITRADURGA': 'KA',
  'TUMKUR': 'KA', 'MANDYA': 'KA', 'MYSORE': 'KA', 'CHAMARAJANAGAR': 'KA',
  'BANGALORE RURAL': 'KA', 'BANGALORE NORTH': 'KA', 'BANGALORE CENTRAL': 'KA',
  'BANGALORE SOUTH': 'KA', 'CHIKKABALLAPUR': 'KA', 'KOLAR': 'KA',
  // Kerala
  'KASARAGOD': 'KL', 'KANNUR': 'KL', 'VATAKARA': 'KL', 'WAYANAD': 'KL',
  'KOZHIKODE': 'KL', 'MALAPPURAM': 'KL', 'PONNANI': 'KL', 'PALAKKAD': 'KL',
  'ALATHUR': 'KL', 'THRISSUR': 'KL', 'CHALAKUDY': 'KL', 'ERNAKULAM': 'KL',
  'IDUKKI': 'KL', 'KOTTAYAM': 'KL', 'ALAPPUZHA': 'KL', 'MAVELIKKARA': 'KL',
  'PATHANAMTHITTA': 'KL', 'KOLLAM': 'KL', 'ATTINGAL': 'KL', 'THIRUVANANTHAPURAM': 'KL',
  // Lakshadweep
  'LAKSHADWEEP': 'LD',
  // Madhya Pradesh
  'MORENA': 'MP', 'BHIND': 'MP', 'GWALIOR': 'MP', 'GUNA': 'MP',
  'SAGAR': 'MP', 'TIKAMGARH': 'MP', 'DAMOH': 'MP', 'KHAJURAHO': 'MP',
  'SATNA': 'MP', 'REWA': 'MP', 'SIDHI': 'MP', 'SHAHDOL': 'MP',
  'JABALPUR': 'MP', 'MANDLA': 'MP', 'BALAGHAT': 'MP', 'CHHINDWARA': 'MP',
  'HOSHANGABAD': 'MP', 'VIDISHA': 'MP', 'BHOPAL': 'MP', 'RAJGARH': 'MP',
  'DEWAS': 'MP', 'UJJAIN': 'MP', 'MANDSOUR': 'MP', 'RATLAM': 'MP',
  'DHAR': 'MP', 'INDORE': 'MP', 'KHARGONE': 'MP', 'KHANDWA': 'MP',
  'BETUL': 'MP',
  // Maharashtra
  'NANDURBAR': 'MH', 'DHULE': 'MH', 'JALGAON': 'MH', 'RAVER': 'MH',
  'BULDHANA': 'MH', 'AKOLA': 'MH', 'AMRAVATI': 'MH', 'WARDHA': 'MH',
  'RAMTEK': 'MH', 'NAGPUR': 'MH', 'BHANDARA-GONDIYA': 'MH', 'GADCHIROLI-CHIMUR': 'MH',
  'CHANDRAPUR': 'MH', 'YAVATMAL-WASHIM': 'MH', 'HINGOLI': 'MH', 'NANDED': 'MH',
  'LATUR': 'MH', 'OSMANABAD': 'MH', 'SOLAPUR': 'MH', 'MADHA': 'MH',
  'SANGLI': 'MH', 'SATARA': 'MH', 'RATNAGIRI-SINDHUDURG': 'MH', 'KOLHAPUR': 'MH',
  'HATKANANGLE': 'MH', 'SHIRUR': 'MH', 'AHMEDNAGAR': 'MH', 'SHIRDI': 'MH',
  'BEED': 'MH', 'JALNA': 'MH', 'AURANGABAD': 'MH', 'DINDORI': 'MH',
  'NASHIK': 'MH', 'PALGHAR': 'MH', 'BHIWANDI': 'MH', 'KALYAN': 'MH',
  'THANE': 'MH', 'MUMBAI NORTH': 'MH', 'MUMBAI NORTH WEST': 'MH',
  'MUMBAI NORTH EAST': 'MH', 'MUMBAI NORTH CENTRAL': 'MH', 'MUMBAI SOUTH CENTRAL': 'MH',
  'MUMBAI SOUTH': 'MH', 'RAIGAD': 'MH', 'MAVAL': 'MH', 'PUNE': 'MH',
  'BARAMATI': 'MH', 'INDAPUR': 'MH',
  // Manipur
  'INNER MANIPUR': 'MN', 'OUTER MANIPUR': 'MN',
  // Meghalaya
  'SHILLONG': 'ML', 'TURA': 'ML',
  // Mizoram
  'MIZORAM': 'MZ',
  // Nagaland
  'NAGALAND': 'NL',
  // Odisha
  'SUNDERGARH': 'OD', 'KEONJHAR': 'OD', 'MAYURBHANJ': 'OD', 'BALASORE': 'OD',
  'BHADRAK': 'OD', 'JAJPUR': 'OD', 'DHENKANAL': 'OD', 'BOLANGIR': 'OD',
  'KALAHANDI': 'OD', 'NABARANGPUR': 'OD', 'KANDHAMAL': 'OD', 'CUTTACK': 'OD',
  'KENDRAPARA': 'OD', 'JAGATSINGHPUR': 'OD', 'PURI': 'OD', 'BHUBANESWAR': 'OD',
  'ASKA': 'OD', 'BERHAMPUR': 'OD', 'KORAPUT': 'OD', 'SAMBALPUR': 'OD',
  'BARGARH': 'OD',
  // Puducherry
  'PUDUCHERRY': 'PY',
  // Punjab
  'GURDASPUR': 'PB', 'AMRITSAR': 'PB', 'KHADOOR SAHIB': 'PB', 'JALANDHAR': 'PB',
  'HOSHIARPUR': 'PB', 'ANANDPUR SAHIB': 'PB', 'LUDHIANA': 'PB', 'FATEHGARH SAHIB': 'PB',
  'FARIDKOT': 'PB', 'FIROZPUR': 'PB', 'BATHINDA': 'PB', 'SANGRUR': 'PB',
  'PATIALA': 'PB',
  // Rajasthan
  'GANGANAGAR': 'RJ', 'BIKANER': 'RJ', 'CHURU': 'RJ', 'JHUNJHUNU': 'RJ',
  'SIKAR': 'RJ', 'JAIPUR RURAL': 'RJ', 'JAIPUR': 'RJ', 'ALWAR': 'RJ',
  'BHARATPUR': 'RJ', 'KARAULI-DHOLPUR': 'RJ', 'DAUSA': 'RJ', 'TONK-SAWAI MADHOPUR': 'RJ',
  'AJMER': 'RJ', 'NAGAUR': 'RJ', 'PALI': 'RJ', 'JODHPUR': 'RJ',
  'BARMER': 'RJ', 'JALORE': 'RJ', 'UDAIPUR': 'RJ', 'BANSWARA': 'RJ',
  'CHITTORGARH': 'RJ', 'RAJSAMAND': 'RJ', 'BHILWARA': 'RJ', 'KOTA': 'RJ',
  'JHALAWAR-BARAN': 'RJ',
  // Sikkim
  'SIKKIM': 'SK',
  // Tamil Nadu
  'THIRUVALLUR': 'TN', 'CHENNAI NORTH': 'TN', 'CHENNAI SOUTH': 'TN',
  'CHENNAI CENTRAL': 'TN', 'SRIPERUMBUDUR': 'TN', 'KANCHEEPURAM': 'TN',
  'ARAKKONAM': 'TN', 'VELLORE': 'TN', 'KRISHNAGIRI': 'TN', 'DHARMAPURI': 'TN',
  'TIRUVANNAMALAI': 'TN', 'ARANI': 'TN', 'VILUPPURAM': 'TN', 'KALLAKURICHI': 'TN',
  'SALEM': 'TN', 'NAMAKKAL': 'TN', 'ERODE': 'TN', 'TIRUPPUR': 'TN',
  'NILGIRIS': 'TN', 'COIMBATORE': 'TN', 'POLLACHI': 'TN', 'DINDIGUL': 'TN',
  'KARUR': 'TN', 'TIRUCHIRAPPALLI': 'TN', 'PERAMBALUR': 'TN', 'CUDDALORE': 'TN',
  'CHIDAMBARAM': 'TN', 'MAYILADUTHURAI': 'TN', 'NAGAPATTINAM': 'TN',
  'THANJAVUR': 'TN', 'SIVAGANGA': 'TN', 'MADURAI': 'TN', 'THENI': 'TN',
  'VIRUDHUNAGAR': 'TN', 'RAMANATHAPURAM': 'TN', 'THOOTHUKUDI': 'TN',
  'TIRUNELVELI': 'TN', 'KANNIYAKUMARI': 'TN',
  // Telangana
  'ADILABAD': 'TS', 'PEDDAPALLE': 'TS', 'KARIMNAGAR': 'TS', 'NIZAMABAD': 'TS',
  'ZAHIRABAD': 'TS', 'MEDAK': 'TS', 'MALKAJGIRI': 'TS', 'SECUNDERABAD': 'TS',
  'HYDERABAD': 'TS', 'CHEVELLA': 'TS', 'MAHBUBNAGAR': 'TS', 'NAGARKURNOOL': 'TS',
  'NALGONDA': 'TS', 'BHONGIR': 'TS', 'WARANGAL': 'TS', 'MAHABUBABAD': 'TS',
  'KHAMMAM': 'TS',
  // Tripura
  'TRIPURA EAST': 'TR', 'TRIPURA WEST': 'TR',
  // Uttar Pradesh
  'SAHARANPUR': 'UP', 'KAIRANA': 'UP', 'MUZAFFARNAGAR': 'UP', 'BIJNOR': 'UP',
  'NAGINA': 'UP', 'MORADABAD': 'UP', 'RAMPUR': 'UP', 'SAMBHAL': 'UP',
  'FIROZABAD': 'UP', 'MAINPURI': 'UP', 'ETAH': 'UP', 'BADAUN': 'UP',
  'AONLA': 'UP', 'BAREILLY': 'UP', 'PILIBHIT': 'UP', 'SHAHJAHANPUR': 'UP',
  'KHERI': 'UP', 'DHAURAHRA': 'UP', 'SITAPUR': 'UP', 'HARDOI': 'UP',
  'MISRIKH': 'UP', 'UNNAO': 'UP', 'LUCKNOW': 'UP', 'RAE BARELI': 'UP',
  'AMETHI': 'UP', 'SULTANPUR': 'UP', 'PRATAPGARH': 'UP', 'FARRUKHABAD': 'UP',
  'ETAWAH': 'UP', 'KANNAUJ': 'UP', 'KANPUR': 'UP', 'AKBARPUR': 'UP',
  'JALAUN': 'UP', 'JHANSI': 'UP', 'HAMIRPUR': 'UP', 'BANDA': 'UP',
  'FATEHPUR': 'UP', 'KAUSHAMBI': 'UP', 'ALLAHABAD': 'UP', 'PHULPUR': 'UP',
  'AMBEDKARNAGAR': 'UP', 'SHRAWASTI': 'UP', 'DOMARIYAGANJ': 'UP', 'BASTI': 'UP',
  'SANT KABIR NAGAR': 'UP', 'LALGANJ': 'UP', 'AZAMGARH': 'UP', 'GHOSI': 'UP',
  'SALEMPUR': 'UP', 'BALLIA': 'UP', 'JAUNPUR': 'UP', 'MACHHLISHAHR': 'UP',
  'GHAZIPUR': 'UP', 'CHANDAULI': 'UP', 'VARANASI': 'UP', 'BHADOHI': 'UP',
  'MIRZAPUR': 'UP', 'ROBERTSGANJ': 'UP', 'AGRA': 'UP', 'FATEHPUR SIKRI': 'UP',
  'ALIGARH': 'UP', 'HATHRAS': 'UP', 'MATHURA': 'UP', 'AMROHA': 'UP',
  'MEERUT': 'UP', 'BAGHPAT': 'UP', 'GHAZIABAD': 'UP', 'GAUTAM BUDDHA NAGAR': 'UP',
  'BULANDSHAHR': 'UP', 'ALIGARH': 'UP', 'AYODHYA': 'UP', 'BAHRAICH': 'UP',
  'GONDA': 'UP', 'KAISERGANJ': 'UP', 'GORAKHPUR': 'UP',
  // Uttarakhand
  'TEHRI GARHWAL': 'UK', 'GARHWAL': 'UK', 'ALMORA': 'UK', 'NAINITAL-UDHAMSINGH NAGAR': 'UK',
  'HARIDWAR': 'UK',
  // West Bengal
  'COOCH BEHAR': 'WB', 'ALIPURDUAR': 'WB', 'JALPAIGURI': 'WB', 'DARJEELING': 'WB',
  'RAIGANJ': 'WB', 'BALURGHAT': 'WB', 'MALDAHA UTTAR': 'WB', 'MALDAHA DAKSHIN': 'WB',
  'JANGIPUR': 'WB', 'BAHRAMPUR': 'WB', 'MURSHIDABAD': 'WB', 'KRISHNANAGAR': 'WB',
  'RANAGHAT': 'WB', 'BANGAON': 'WB', 'BARRACKPORE': 'WB', 'DUM DUM': 'WB',
  'BARASAT': 'WB', 'BASIRHAT': 'WB', 'JOYNAGAR': 'WB', 'MATHURAPUR': 'WB',
  'DIAMOND HARBOUR': 'WB', 'JADAVPUR': 'WB', 'KOLKATA DAKSHIN': 'WB',
  'KOLKATA UTTAR': 'WB', 'HOWRAH': 'WB', 'ULUBERIA': 'WB', 'SRERAMPUR': 'WB',
  'HOOGHLY': 'WB', 'ARAMBAG': 'WB', 'TAMLUK': 'WB', 'KANTHI': 'WB',
  'GHATAL': 'WB', 'JHARGRAM': 'WB', 'MEDINIPUR': 'WB', 'PURULIA': 'WB',
  'BANKURA': 'WB', 'BISHNUPUR': 'WB', 'BARDHAMAN PURBA': 'WB', 'BARDHAMAN-DURGAPUR': 'WB',
  'ASANSOL': 'WB', 'BOLPUR': 'WB', 'BIRBHUM': 'WB',
};

function getStateFromConstituency(constituency) {
  if (!constituency) return '';
  const clean = constituency.replace(/\s*\(SC\)|\s*\(ST\)/gi, '').trim().toUpperCase();
  if (CONSTITUENCY_STATE_MAP[clean]) return CONSTITUENCY_STATE_MAP[clean];
  // Try partial
  for (const [key, code] of Object.entries(CONSTITUENCY_STATE_MAP)) {
    if (clean.startsWith(key) || key.startsWith(clean.substring(0, Math.min(clean.length, 6)))) {
      return code;
    }
  }
  return '';
}

// ─── Parser for the MyNeta winners HTML ───────────────────────────────────────
function parseMyneta(html) {
  // ① Strip the obfuscated <script>...</script> blocks that MyNeta injects
  //    every 9 rows — these break multi-line regex matching across rows
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '');

  const winners = [];
  
  // ② Match each <tr> data row: SNO | Candidate | Constituency | Party | Criminal | Education | Assets | Liabilities
  const rowRe = /<tr[^>]*>\s*<td>(\d+)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
  
  let m;
  while ((m = rowRe.exec(clean)) !== null) {
    const sno = parseInt(m[1], 10);
    const nameTd = m[2];
    const constTd = m[3];
    const partyTd = m[4];
    const crimTd = m[5];
    const eduTd = m[6];
    const assetTd = m[7];
    const liabTd = m[8];

    // Extract name from the last anchor tag
    const allLinks = [...nameTd.matchAll(/>([^<]+)<\/a>/g)];
    if (!allLinks.length) continue;
    const name = allLinks[allLinks.length - 1][1].trim();
    if (!name || name.length < 2) continue;

    // Extract constituency (strip HTML)
    const constituency = constTd.replace(/<[^>]+>/g, '').trim();
    
    // Extract party
    const party = partyTd.replace(/<[^>]+>/g, '').trim();
    
    // Extract criminal cases count
    const crimMatch = crimTd.match(/>\s*(\d+)\s*</);
    const criminalCases = crimMatch ? parseInt(crimMatch[1], 10) : 0;
    
    // Extract education
    const education = eduTd.replace(/<[^>]+>/g, '').trim();
    
    // Extract assets (parse Rs 1,23,456 format)
    const assetMatch = assetTd.match(/Rs(?:&nbsp;|\s)([\d,]+)/);
    const totalAssets = assetMatch ? parseInt(assetMatch[1].replace(/,/g, ''), 10) : 0;
    
    // Extract liabilities
    const liabMatch = liabTd.match(/Rs(?:&nbsp;|\s)([\d,]+)/);
    const totalLiabilities = liabMatch ? parseInt(liabMatch[1].replace(/,/g, ''), 10) : 0;
    
    // Extract profile link
    const linkMatch = nameTd.match(/href=([^\s>]+LokSabha2024[^\s>]*)/);
    const sourceUrl = linkMatch ? `https://myneta.info${linkMatch[1].replace(/^https?:\/\/myneta.info/, '')}` : '';
    
    // Extract candidate ID for photo URL
    const idMatch = nameTd.match(/candidate_id=(\d+)/g);
    const candidateId = idMatch ? idMatch[idMatch.length - 1].replace('candidate_id=', '') : '';
    const photoUrl = candidateId ? 
      `https://myneta.info/LokSabha2024/photos/${candidateId}.jpg` : '';

    winners.push({
      sno,
      name,
      constituency,
      party,
      criminalCases,
      education,
      totalAssets,
      totalLiabilities,
      sourceUrl,
      photoUrl,
      candidateId,
    });
  }

  return winners;
}

// ─── State code helpers ───────────────────────────────────────────────────────
const STATE_MAP = {
  'Andhra Pradesh': 'AP', 'Arunachal Pradesh': 'AR', 'Assam': 'AS', 'Bihar': 'BR',
  'Chhattisgarh': 'CG', 'Goa': 'GA', 'Gujarat': 'GJ', 'Haryana': 'HR',
  'Himachal Pradesh': 'HP', 'Jharkhand': 'JH', 'Karnataka': 'KA', 'Kerala': 'KL',
  'Madhya Pradesh': 'MP', 'Maharashtra': 'MH', 'Manipur': 'MN', 'Meghalaya': 'ML',
  'Mizoram': 'MZ', 'Nagaland': 'NL', 'Odisha': 'OD', 'Punjab': 'PB',
  'Rajasthan': 'RJ', 'Sikkim': 'SK', 'Tamil Nadu': 'TN', 'Telangana': 'TS',
  'Tripura': 'TR', 'Uttar Pradesh': 'UP', 'Uttarakhand': 'UK', 'West Bengal': 'WB',
  'Jammu & Kashmir': 'JK', 'Jammu and Kashmir': 'JK', 'Ladakh': 'LA',
  'Delhi': 'DL', 'Puducherry': 'PY', 'Chandigarh': 'CH',
  'Dadra and Nagar Haveli': 'DN', 'Daman and Diu': 'DD',
  'Lakshadweep': 'LD', 'Andaman and Nicobar Islands': 'AN',
};

function stateCode(stateName) {
  if (!stateName) return '';
  if (STATE_MAP[stateName]) return STATE_MAP[stateName];
  for (const [key, code] of Object.entries(STATE_MAP)) {
    if (stateName.toLowerCase().includes(key.toLowerCase().substring(0, 6))) return code;
  }
  return stateName.substring(0, 2).toUpperCase();
}

const PARTY_MAP = {
  'BHARATIYA JANATA PARTY': 'BJP', 'INDIAN NATIONAL CONGRESS': 'INC',
  'SAMAJWADI PARTY': 'SP', 'ALL INDIA TRINAMOOL CONGRESS': 'AITC',
  'DRAVIDA MUNNETRA KAZHAGAM': 'DMK', 'TELUGU DESAM': 'TDP',
  'JANATA DAL  (UNITED)': 'JDU', 'JANATA DAL (UNITED)': 'JDU',
  'YSR CONGRESS PARTY': 'YSRCP', 'SHIV SENA': 'SHS',
  'NATIONALIST CONGRESS PARTY': 'NCP', 'BIJU JANATA DAL': 'BJD',
  'AAM AADMI PARTY': 'AAP', 'COMMUNIST PARTY OF INDIA  (MARXIST)': 'CPIM',
  'COMMUNIST PARTY OF INDIA(MARXIST)': 'CPIM', 'CPI(M)': 'CPIM',
  'COMMUNIST PARTY OF INDIA': 'CPI', 'BAHUJAN SAMAJ PARTY': 'BSP',
  'RASHTRIYA JANATA DAL': 'RJD', 'INDIAN UNION MUSLIM LEAGUE': 'IUML',
  'JANTA DAL SECULAR': 'JDS', 'JANATA DAL (SECULAR)': 'JDS', 'JD(S)': 'JDS',
  'SHIROMANI AKALI DAL': 'SAD', 'INDEPENDENT': 'IND',
  'NATIONALIST CONGRESS PARTY – SHARADCHANDRA PAWAR': 'NCPSP',
  'NATIONALIST CONGRESS PARTY - SHARADCHANDRA PAWAR': 'NCPSP',
  'SHIV SENA (UDDHAV BALASAHEB THACKERAY)': 'SSUBT',
  'RASHTRIYA LOKTANTRIK PARTY': 'RLP',
  'JAMMU & KASHMIR NATIONAL CONFERENCE': 'JKNC', 
  'JAMMU AND KASHMIR NATIONAL CONFERENCE': 'JKNC',
  'INDIAN NATIONAL CONFERENCE': 'JKNC',
  'PEOPLES DEMOCRATIC PARTY': 'PDP',
  'TELANGANA RASHTRA SAMITHI': 'TRS', 'BHARAT RASHTRA SAMITHI': 'BRS',
  'RASHTRIYA LOK DAL': 'RLD',
};

function normaliseParty(raw) {
  if (!raw) return 'IND';
  const upper = raw.toUpperCase().trim();
  if (PARTY_MAP[upper]) return PARTY_MAP[upper];
  // known short forms
  const SHORT = ['BJP', 'INC', 'AAP', 'SP', 'BSP', 'DMK', 'TDP', 'NCP', 'BJD', 'AITC',
    'YSRCP', 'RJD', 'CPIM', 'CPI', 'SAD', 'JDU', 'IND', 'SHS', 'JDS', 'BRS'];
  if (SHORT.includes(upper)) return upper;
  // Abbreviate
  return upper.replace(/[^A-Z ]/g, '').split(' ').filter(w => w.length > 2).map(w => w[0]).join('').substring(0, 6) || upper.substring(0, 6);
}

function san(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").trim();
}

function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\b(\w)/g, c => c.toUpperCase());
}

function mapEdu(cat) {
  if (!cat) return '';
  const c = cat.toLowerCase();
  if (c.includes('post grad') || c.includes('phd') || c.includes('doctorat')) return 'Post Graduate';
  if (c.includes('graduate professional')) return 'Graduate Professional';
  if (c.includes('graduate')) return 'Graduate';
  if (c.includes('12th') || c.includes('hsc') || c.includes('inter')) return '12th Pass';
  if (c.includes('10th') || c.includes('ssc') || c.includes('matri')) return '10th Pass';
  if (c.includes('8th')) return '8th Pass';
  if (c.includes('others') || c.includes('literate')) return 'Literate';
  return cat.trim();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏛️  Kshetra MP Seed Generator');
  console.log('═'.repeat(60));

  // ── Step 1: Fetch LS 2024 from MyNeta ──
  console.log('\n📥 Loading LS 2024 winners...');
  let lsWinners = [];

  // Prefer Puppeteer output (all 543) over parsed HTML (483)
  const puppeteerFile = path.join(MYNETA_DIR, 'LokSabha2024-puppeteer.json');
  const parsedFile = path.join(MYNETA_DIR, 'LokSabha2024-parsed.json');

  if (fs.existsSync(puppeteerFile)) {
    lsWinners = JSON.parse(fs.readFileSync(puppeteerFile, 'utf8'));
    console.log(`   Loaded ${lsWinners.length} from LokSabha2024-puppeteer.json`);
  } else if (fs.existsSync(parsedFile)) {
    lsWinners = JSON.parse(fs.readFileSync(parsedFile, 'utf8'));
    console.log(`   Loaded ${lsWinners.length} from LokSabha2024-parsed.json`);
  } else {
    // Live fetch fallback
    let lsHtml = '';
    try {
      lsHtml = await fetchHtml('https://myneta.info/LokSabha2024/index.php?action=show_winners&sort=default');
      console.log(`   Got ${Math.round(lsHtml.length/1024)}KB`);
    } catch (err) {
      console.log(`   ⚠️  Fetch failed: ${err.message}`);
    }
    lsWinners = parseMyneta(lsHtml);
    fs.writeFileSync(parsedFile, JSON.stringify(lsWinners, null, 2));
    console.log(`   Parsed ${lsWinners.length} LS winners`);
  }

  // ── Step 2: Load RS from sansad.in (already scraped + fixed) ──
  console.log('\n📦 Loading Rajya Sabha data...');
  let rsWinners = [];
  const rsFixedFile = path.join(SANSAD_DIR, 'rajya-sabha-fixed.json');
  const rsRawFile = path.join(SANSAD_DIR, 'rajya-sabha-members.json');

  if (fs.existsSync(rsFixedFile)) {
    rsWinners = JSON.parse(fs.readFileSync(rsFixedFile, 'utf8'));
    console.log(`   Loaded ${rsWinners.length} from rajya-sabha-fixed.json (clean)`);
  } else if (fs.existsSync(rsRawFile)) {
    rsWinners = JSON.parse(fs.readFileSync(rsRawFile, 'utf8'));
    console.log(`   Loaded ${rsWinners.length} from rajya-sabha-members.json (raw)`);
  } else {
    console.log(`   ⚠️  No RS file found`);
  }

  // ── Step 3: Generate LS MP entries ──
  console.log('\n🔨 Generating LS MP entries...');
  const lsEntries = lsWinners.map((w, i) => {
    const name = san(toTitleCase(w.name));
    const constituency = san(toTitleCase(w.constituency));
    const party = normaliseParty(w.party);
    const sc = getStateFromConstituency(w.constituency);
    const edu = mapEdu(w.education);
    const hasPhoto = w.photoUrl ? `'${san(w.photoUrl)}'` : 'undefined';
    const hasSrc = w.sourceUrl ? `'${san(w.sourceUrl)}'` : 'undefined';

    let entry = `  {\n    id: 'LS_${String(i + 1).padStart(3, '0')}',\n    name: '${name}',\n    party: '${party}',\n    stateCode: '${sc}',\n    house: 'lok_sabha',\n    constituency: '${constituency}',\n    gender: 'M',\n    terms: 1,\n    electedYear: 2024,`;
    if (w.criminalCases > 0) entry += `\n    criminalCases: ${w.criminalCases},`;
    else entry += `\n    criminalCases: 0,`;
    if (w.totalAssets > 0) entry += `\n    totalAssets: ${w.totalAssets},`;
    if (w.totalLiabilities > 0) entry += `\n    totalLiabilities: ${w.totalLiabilities},`;
    if (edu) entry += `\n    education: '${san(edu)}',`;
    if (hasPhoto !== 'undefined') entry += `\n    photoUrl: ${hasPhoto},`;
    if (hasSrc !== 'undefined') entry += `\n    sourceUrl: ${hasSrc},`;
    entry += `\n  }`;
    return entry;
  });

  // ── Step 4: Generate RS MP entries ──
  console.log('\n🔨 Generating RS MP entries...');
  const rsEntries = rsWinners.map((w, i) => {
    // Fixed RS data has: name (full name, already cleaned), party, photoUrl
    // Raw RS data has: name (serial), state (actual name), party, photoUrl
    let memberName = w.name || '';
    // If name looks like a serial number, use state field as name (raw data)
    if (/^\d+$/.test(memberName.trim())) {
      memberName = w.state || w.stateName || memberName;
    }
    const name = san(toTitleCase(memberName));
    const party = normaliseParty(w.party || '');
    const sc = stateCode(w.stateCode || w.state || w.stateName || '');
    const hasPhoto = w.photoUrl ? `'${san(w.photoUrl)}'` : 'undefined';

    let entry = `  {\n    id: 'RS_${String(i + 1).padStart(3, '0')}',\n    name: '${name}',\n    party: '${party}',\n    stateCode: '${sc}',\n    house: 'rajya_sabha',\n    gender: 'M',\n    terms: 1,\n    electedYear: 2024,`;
    if (hasPhoto !== 'undefined') entry += `\n    photoUrl: ${hasPhoto},`;
    entry += `\n  }`;
    return entry;
  });

  // ── Step 5: Write seed file ──
  console.log('\n✍️  Writing mp-profiles.ts...');

  const content = `/**
 * ╔════════════════════════════════════════════════════════════════════════╗
 * ║  MEMBER OF PARLIAMENT PROFILES — 18th Lok Sabha (2024) + Rajya Sabha ║
 * ╚════════════════════════════════════════════════════════════════════════╝
 *
 * AUTO-GENERATED by scrapers/parse-and-generate-mp-seed.js
 * Sources: MyNeta.info (LokSabha2024) + Sansad.in (Rajya Sabha via Puppeteer)
 * Generated: ${new Date().toISOString().split('T')[0]}
 *
 * Lok Sabha : ${lsWinners.length} / 543 MPs
 * Rajya Sabha: ${rsWinners.length} / 245 members
 * Total      : ${lsWinners.length + rsWinners.length}
 */

type HouseType = 'lok_sabha' | 'rajya_sabha';

export interface MPProfile {
  id: string;
  name: string;
  party: string;
  stateCode: string;
  house: HouseType;
  constituency?: string;
  constituencyNo?: number;
  district?: string;
  gender: 'M' | 'F';
  age?: number;
  dob?: string;
  dobEstimated?: boolean;
  education?: string;
  profession?: string;
  terms: number;
  electedYear: number;
  criminalCases?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  maritalStatus?: 'Single' | 'Married' | 'Widowed' | 'Divorced';
  photoUrl?: string;
  sourceUrl?: string;
  isMinister?: boolean;
  ministerialPortfolio?: string;
}

export const LOK_SABHA_MPs: MPProfile[] = [
${lsEntries.join(',\n')}
];

export const RAJYA_SABHA_MPs: MPProfile[] = [
${rsEntries.join(',\n')}
];

export const ALL_MPs: MPProfile[] = [...LOK_SABHA_MPs, ...RAJYA_SABHA_MPs];

// ── Search helpers ──────────────────────────────────────────────────────────

export function getMPById(id: string): MPProfile | undefined {
  return ALL_MPs.find(mp => mp.id === id);
}

export function searchMPs(query: string, limit = 20): MPProfile[] {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  return ALL_MPs.filter(mp =>
    mp.name.toLowerCase().includes(q) ||
    mp.party.toLowerCase().includes(q) ||
    (mp.constituency?.toLowerCase().includes(q)) ||
    mp.stateCode.toLowerCase() === q
  ).slice(0, limit);
}

export function getMPsByState(stateCode: string): MPProfile[] {
  return ALL_MPs.filter(mp => mp.stateCode === stateCode);
}

export function getMPsByHouse(house: HouseType): MPProfile[] {
  return house === 'lok_sabha' ? LOK_SABHA_MPs : RAJYA_SABHA_MPs;
}

export function getMPsByParty(party: string): MPProfile[] {
  return ALL_MPs.filter(mp => mp.party === party);
}

// ── Backward-compatible aliases (used by apps/mobile/lib/data.ts) ───────────

/** @alias ALL_MPs */
export const ALL_MP_PROFILES = ALL_MPs;

/** Returns all Lok Sabha MPs */
export function getLokSabhaMPs(): MPProfile[] {
  return LOK_SABHA_MPs;
}

/** Returns all Rajya Sabha MPs */
export function getRajyaSabhaMPs(): MPProfile[] {
  return RAJYA_SABHA_MPs;
}

/** Returns MPs who are ministers (isMinister flag or ministerialPortfolio set) */
export function getMinisters(): MPProfile[] {
  return ALL_MPs.filter(mp => mp.isMinister || mp.ministerialPortfolio);
}

/** Returns party seat counts for a specific state */
export function getPartyStrengthForState(stateCode: string): Record<string, number> {
  const stateMPs = getMPsByState(stateCode);
  return stateMPs.reduce((acc, mp) => {
    acc[mp.party] = (acc[mp.party] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/** Returns alliance-level totals (NDA, INDIA, Others) */
export function getAllianceStrength(): Record<string, number> {
  const NDA  = ['BJP', 'JDU', 'TDP', 'SHS', 'SAD', 'LJP', 'RLTP', 'AJSU', 'AGP', 'NDPP', 'NPP', 'SKM', 'NPF'];
  const INDIA = ['INC', 'SP', 'AITC', 'DMK', 'CPIM', 'CPI', 'RJD', 'JKNC', 'NCPSP', 'SSUBT', 'AAP', 'JMM', 'BJD', 'VCK', 'RSP', 'IUML', 'AIUDF', 'KEC', 'MDMK', 'CPI', 'FB'];
  const result: Record<string, number> = { NDA: 0, INDIA: 0, Others: 0 };
  for (const mp of LOK_SABHA_MPs) {
    if (NDA.includes(mp.party)) result['NDA']++;
    else if (INDIA.includes(mp.party)) result['INDIA']++;
    else result['Others']++;
  }
  return result;
}

/** National party seat summary across LS */
export const NATIONAL_PARTY_STRENGTH: Record<string, number> = LOK_SABHA_MPs.reduce((acc, mp) => {
  acc[mp.party] = (acc[mp.party] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

/** Per-state MP summary */
export const STATE_PARLIAMENTARY_SUMMARIES: Record<string, { ls: number; rs: number; total: number }> = (() => {
  const result: Record<string, { ls: number; rs: number; total: number }> = {};
  for (const mp of ALL_MPs) {
    const sc = mp.stateCode;
    if (!sc) continue;
    if (!result[sc]) result[sc] = { ls: 0, rs: 0, total: 0 };
    if (mp.house === 'lok_sabha') result[sc].ls++;
    else result[sc].rs++;
    result[sc].total++;
  }
  return result;
})();
`;

  fs.writeFileSync(SEED_FILE, content, 'utf8');
  const stat = fs.statSync(SEED_FILE);
  
  console.log(`\n✅ mp-profiles.ts written!`);
  console.log(`   Lok Sabha MPs  : ${lsWinners.length}`);
  console.log(`   Rajya Sabha MPs: ${rsWinners.length}`);
  console.log(`   Total          : ${lsWinners.length + rsWinners.length}`);
  console.log(`   File size      : ${Math.round(stat.size/1024)}KB`);
  console.log(`   Path           : ${SEED_FILE}`);
  console.log('\n' + '═'.repeat(60));
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
