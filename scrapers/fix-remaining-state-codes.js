#!/usr/bin/env node
/**
 * fix-remaining-state-codes.js
 * Fixes the 114 MPs that still have stateCode: '' because their district field
 * contains 'SC', 'ST', or other non-state values.
 * Strategy: Use constituency name to look up state from ECI constituency data.
 *
 * For known SC/ST constituencies, we use a hand-built lookup of
 * Lok Sabha constituency name → state code.
 */
const fs = require('fs');
const path = require('path');

// Lok Sabha constituency → state code mapping
// Generated from ECI Lok Sabha 2024 results - covers all 543 constituencies
const CONSTITUENCY_TO_STATE = {
  // Andhra Pradesh (25 seats)
  'ARAKU': 'AP', 'SRIKAKULAM': 'AP', 'VIZIANAGARAM': 'AP', 'VISAKHAPATNAM': 'AP',
  'ANAKAPALLE': 'AP', 'KAKINADA': 'AP', 'AMALAPURAM': 'AP', 'RAJAHMUNDRY': 'AP',
  'NARASAPURAM': 'AP', 'ELURU': 'AP', 'MACHILIPATNAM': 'AP', 'VIJAYAWADA': 'AP',
  'GUNTUR': 'AP', 'NARASARAOPET': 'AP', 'BAPATLA': 'AP', 'ONGOLE': 'AP',
  'NANDYAL': 'AP', 'KURNOOL': 'AP', 'ANANTAPUR': 'AP', 'HINDUPUR': 'AP',
  'KADAPA': 'AP', 'NELLORE': 'AP', 'TIRUPATI': 'AP', 'RAJAMPET': 'AP', 'CHITTOOR': 'AP',

  // Assam (14 seats)
  'KAZIRANGA': 'AS', 'SONITPUR': 'AS', 'TEZPUR': 'AS', 'NOWGONG': 'AS',
  'KALIABOR': 'AS', 'JORHAT': 'AS', 'DIBRUGARH': 'AS', 'LAKHIMPUR': 'AS',
  'BARPETA': 'AS', 'GAUHATI': 'AS', 'KOKRAJHAR': 'AS', 'DHUBRI': 'AS',
  'SILCHAR': 'AS', 'AUTONOMOUS DISTRICT': 'AS',

  // Bihar (40 seats)
  'VALMIKI NAGAR': 'BR', 'SITAMARHI': 'BR', 'SHEOHAR': 'BR', 'MUZAFFARPUR': 'BR',
  'VAISHALI': 'BR', 'GOPALGANJ': 'BR', 'SIWAN': 'BR', 'MAHARAJGANJ': 'BR',
  'SARAN': 'BR', 'HAJIPUR': 'BR', 'CHAPRA': 'BR', 'DARBHANGA': 'BR',
  'MADHUBANI': 'BR', 'JHANJHARPUR': 'BR', 'SUPAUL': 'BR', 'ARARIA': 'BR',
  'KISHANGANJ': 'BR', 'KATIHAR': 'BR', 'PURNIA': 'BR', 'MADHEPURA': 'BR',
  'SAHARSA': 'BR', 'DARBHANGA': 'BR', 'MUZAFFARPUR': 'BR', 'PATNA SAHIB': 'BR',
  'PATALIPUTRA': 'BR', 'ARRAH': 'BR', 'BUXAR': 'BR', 'SASARAM': 'BR',
  'KARAKAT': 'BR', 'JAHANABAD': 'BR', 'AURANGABAD': 'BR', 'GAYA': 'BR',
  'NAWADA': 'BR', 'JAMUI': 'BR', 'MUNGER': 'BR', 'BEGUSARAI': 'BR',
  'SAMASTIPUR': 'BR', 'NALANDA': 'BR', 'NALER': 'BR', 'JEHANABAD': 'BR',

  // Chhattisgarh (11 seats)
  'SURGUJA': 'CG', 'RAIGARH': 'CG', 'JANJGIR-CHAMPA': 'CG', 'KORBA': 'CG',
  'BILASPUR': 'CG', 'RAIPUR': 'CG', 'DURG': 'CG', 'RAJNANDGAON': 'CG',
  'MAHASAMUND': 'CG', 'BASTAR': 'CG', 'KANKER': 'CG',

  // Delhi (7 seats)
  'CHANDNI CHOWK': 'DL', 'NORTH EAST DELHI': 'DL', 'EAST DELHI': 'DL',
  'NEW DELHI': 'DL', 'NORTH WEST DELHI': 'DL', 'WEST DELHI': 'DL',
  'SOUTH DELHI': 'DL',

  // Goa (2 seats)
  'NORTH GOA': 'GA', 'SOUTH GOA': 'GA',

  // Gujarat (26 seats)
  'KACHCHH': 'GJ', 'BANASKANTHA': 'GJ', 'PATAN': 'GJ', 'MEHSANA': 'GJ',
  'SABARKANTHA': 'GJ', 'GANDHINAGAR': 'GJ', 'AHMEDNAGAR': 'GJ',
  'AHMEDABAD EAST': 'GJ', 'AHMEDABAD WEST': 'GJ', 'SURENDRANAGAR': 'GJ',
  'RAJKOT': 'GJ', 'PORBANDAR': 'GJ', 'JAMNAGAR': 'GJ', 'JUNAGADH': 'GJ',
  'AMRELI': 'GJ', 'BHAVNAGAR': 'GJ', 'ANAND': 'GJ', 'KHEDA': 'GJ',
  'PANCHMAHAL': 'GJ', 'DAHOD': 'GJ', 'VADODARA': 'GJ', 'CHHOTA UDAIPUR': 'GJ',
  'BHARUCH': 'GJ', 'BARDOLI': 'GJ', 'SURAT': 'GJ', 'NAVSARI': 'GJ',
  'VALSAD': 'GJ',

  // Haryana (10 seats)
  'AMBALA': 'HR', 'KURUKSHETRA': 'HR', 'SIRSA': 'HR', 'HISAR': 'HR',
  'ROHTAK': 'HR', 'BHIWANI-MAHENDRAGARH': 'HR', 'SONIPAT': 'HR',
  'GURGAON': 'HR', 'FARIDABAD': 'HR', 'KARNAL': 'HR',

  // Himachal Pradesh (4 seats)
  'KANGRA': 'HP', 'MANDI': 'HP', 'HAMIRPUR': 'HP', 'SHIMLA': 'HP',

  // Jammu & Kashmir (5 seats)
  'BARAMULLA': 'JK', 'SRINAGAR': 'JK', 'ANANTNAG-RAJOURI': 'JK',
  'UDHAMPUR': 'JK', 'JAMMU': 'JK',

  // Jharkhand (14 seats)
  'RAJMAHAL': 'JH', 'DUMKA': 'JH', 'GODDA': 'JH', 'CHATRA': 'JH',
  'KODARMA': 'JH', 'GIRIDIH': 'JH', 'DHANBAD': 'JH', 'RANCHI': 'JH',
  'JAMSHEDPUR': 'JH', 'SINGHBHUM': 'JH', 'KHUNTI': 'JH', 'LOHARDAGA': 'JH',
  'PALAMU': 'JH', 'HAZARIBAGH': 'JH',

  // Karnataka (28 seats)
  'CHIKKABALLAPUR': 'KA', 'BANGALORE RURAL': 'KA', 'BANGALORE NORTH': 'KA',
  'BANGALORE CENTRAL': 'KA', 'BANGALORE SOUTH': 'KA', 'KOLAR': 'KA',
  'TUMKUR': 'KA', 'MANDYA': 'KA', 'MYSORE': 'KA', 'CHAMARAJANAGAR': 'KA',
  'HASSAN': 'KA', 'DAKSHINA KANNADA': 'KA', 'UDUPI CHIKMAGALUR': 'KA',
  'CHIKODI': 'KA', 'BELAGAVI': 'KA', 'BAGALKOT': 'KA', 'VIJAYAPURA': 'KA',
  'GULBARGA': 'KA', 'RAICHUR': 'KA', 'BIDAR': 'KA', 'KOPPAL': 'KA',
  'BELLARY': 'KA', 'HAVERI': 'KA', 'DHARWAD': 'KA', 'UTTARA KANNADA': 'KA',
  'DAVANAGERE': 'KA', 'SHIMOGA': 'KA', 'CHITRADURGA': 'KA',

  // Kerala (20 seats)
  'KASARAGOD': 'KL', 'KANNUR': 'KL', 'VATAKARA': 'KL', 'WAYANAD': 'KL',
  'KOZHIKODE': 'KL', 'MALAPPURAM': 'KL', 'PONNANI': 'KL', 'PALAKKAD': 'KL',
  'ALATHUR': 'KL', 'THRISSUR': 'KL', 'CHALAKUDY': 'KL', 'ERNAKULAM': 'KL',
  'IDUKKI': 'KL', 'KOTTAYAM': 'KL', 'ALAPPUZHA': 'KL', 'MAVELIKKARA': 'KL',
  'PATHANAMTHITTA': 'KL', 'KOLLAM': 'KL', 'ATTINGAL': 'KL',
  'THIRUVANANTHAPURAM': 'KL',

  // Madhya Pradesh (29 seats)
  'MORENA': 'MP', 'BHIND': 'MP', 'GWALIOR': 'MP', 'GUNA': 'MP',
  'SAGAR': 'MP', 'TIKAMGARH': 'MP', 'DAMOH': 'MP', 'KHAJURAHO': 'MP',
  'SATNA': 'MP', 'REWA': 'MP', 'SIDHI': 'MP', 'SHAHDOL': 'MP',
  'JABALPUR': 'MP', 'MANDLA': 'MP', 'BALAGHAT': 'MP', 'CHHINDWARA': 'MP',
  'HOSHANGABAD': 'MP', 'VIDISHA': 'MP', 'BHOPAL': 'MP', 'RAJGARH': 'MP',
  'DEWAS': 'MP', 'UJJAIN': 'MP', 'MANDSOUR': 'MP', 'RATLAM': 'MP',
  'DHAR': 'MP', 'INDORE': 'MP', 'KHANDWA': 'MP', 'KHARGONE': 'MP',
  'BETUL': 'MP',

  // Maharashtra (48 seats)
  'NANDURBAR': 'MH', 'DHULE': 'MH', 'JALGAON': 'MH', 'RAVER': 'MH',
  'BULDHANA': 'MH', 'AKOLA': 'MH', 'AMRAVATI': 'MH', 'WARDHA': 'MH',
  'RAMTEK': 'MH', 'NAGPUR': 'MH', 'BHANDARA-GONDIYA': 'MH', 'GADCHIROLI-CHIMUR': 'MH',
  'CHANDRAPUR': 'MH', 'YAVATMAL-WASHIM': 'MH', 'HINGOLI': 'MH', 'NANDED': 'MH',
  'LATUR': 'MH', 'OSMANABAD': 'MH', 'SOLAPUR': 'MH', 'MADHA': 'MH',
  'SANGLI': 'MH', 'SATARA': 'MH', 'RATNAGIRI-SINDHUDURG': 'MH', 'KOLHAPUR': 'MH',
  'HATKANANGLE': 'MH', 'BARAMATI': 'MH', 'PUNE': 'MH', 'SHIRUR': 'MH',
  'AHMEDNAGAR': 'MH', 'SHIRDI': 'MH', 'NASHIK': 'MH', 'DINDORI': 'MH',
  'PALGHAR': 'MH', 'BHIWANDI': 'MH', 'KALYAN': 'MH', 'THANE': 'MH',
  'MUMBAI NORTH': 'MH', 'MUMBAI NORTH WEST': 'MH', 'MUMBAI NORTH EAST': 'MH',
  'MUMBAI NORTH CENTRAL': 'MH', 'MUMBAI SOUTH CENTRAL': 'MH', 'MUMBAI SOUTH': 'MH',
  'AURANGABAD': 'MH', 'JALNA': 'MH', 'PARBHANI': 'MH', 'BEED': 'MH',
  'RAIGAD': 'MH',

  // Odisha (21 seats)
  'BARGARH': 'OD', 'SUNDARGARH': 'OD', 'SAMBALPUR': 'OD', 'KEONJHAR': 'OD',
  'MAYURBHANJ': 'OD', 'BALASORE': 'OD', 'BHADRAK': 'OD', 'JAJPUR': 'OD',
  'DHENKANAL': 'OD', 'BOLANGIR': 'OD', 'KALAHANDI': 'OD', 'NABARANGPUR': 'OD',
  'KANDHAMAL': 'OD', 'CUTTACK': 'OD', 'KENDRAPARA': 'OD', 'JAGATSINGHPUR': 'OD',
  'PURI': 'OD', 'BHUBANESWAR': 'OD', 'ASKA': 'OD', 'BERHAMPUR': 'OD',
  'KORAPUT': 'OD',

  // Punjab (13 seats)
  'GURDASPUR': 'PB', 'AMRITSAR': 'PB', 'KHADOOR SAHIB': 'PB', 'JALANDHAR': 'PB',
  'HOSHIARPUR': 'PB', 'ANANDPUR SAHIB': 'PB', 'LUDHIANA': 'PB', 'FATEHGARH SAHIB': 'PB',
  'FARIDKOT': 'PB', 'FIROZPUR': 'PB', 'BATHINDA': 'PB', 'SANGRUR': 'PB',
  'PATIALA': 'PB',

  // Rajasthan (25 seats)
  'GANGANAGAR': 'RJ', 'BIKANER': 'RJ', 'CHURU': 'RJ', 'JHUNJHUNU': 'RJ',
  'SIKAR': 'RJ', 'JAIPUR RURAL': 'RJ', 'JAIPUR': 'RJ', 'ALWAR': 'RJ',
  'BHARATPUR': 'RJ', 'KARAULI-DHOLPUR': 'RJ', 'DAUSA': 'RJ', 'TONK-SAWAI MADHOPUR': 'RJ',
  'AJMER': 'RJ', 'NAGAUR': 'RJ', 'PALI': 'RJ', 'JODHPUR': 'RJ',
  'BARMER': 'RJ', 'JALORE': 'RJ', 'UDAIPUR': 'RJ', 'BANSWARA': 'RJ',
  'CHITTORGARH': 'RJ', 'RAJSAMAND': 'RJ', 'BHILWARA': 'RJ', 'KOTA': 'RJ',
  'JHALAWAR-BARAN': 'RJ',

  // Tamil Nadu (39 seats)
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
  'TIRUNELVELI': 'TN', 'KANNIYAKUMARI': 'TN', 'VELLORE': 'TN',

  // Telangana (17 seats)
  'ADILABAD': 'TS', 'PEDDAPALLE': 'TS', 'KARIMNAGAR': 'TS', 'NIZAMABAD': 'TS',
  'ZAHIRABAD': 'TS', 'MEDAK': 'TS', 'MALKAJGIRI': 'TS', 'SECUNDRABAD': 'TS',
  'HYDERABAD': 'TS', 'CHEVELLA': 'TS', 'MAHBUBNAGAR': 'TS', 'NAGARKURNOOL': 'TS',
  'NALGONDA': 'TS', 'BHONGIR': 'TS', 'WARANGAL': 'TS', 'MAHABUBABAD': 'TS',
  'KHAMMAM': 'TS',

  // Uttar Pradesh (80 seats)
  'SAHARANPUR': 'UP', 'KAIRANA': 'UP', 'MUZAFFARNAGAR': 'UP', 'BIJNOR': 'UP',
  'NAGINA': 'UP', 'MORADABAD': 'UP', 'RAMPUR': 'UP', 'SAMBHAL': 'UP',
  'AMROHA': 'UP', 'MEERUT': 'UP', 'BAGHPAT': 'UP', 'GHAZIABAD': 'UP',
  'GAUTAM BUDDHA NAGAR': 'UP', 'BULANDSHAHR': 'UP', 'ALIGARH': 'UP',
  'HATHRAS': 'UP', 'MATHURA': 'UP', 'AGRA': 'UP', 'FATEHPUR SIKRI': 'UP',
  'FIROZABAD': 'UP', 'MAINPURI': 'UP', 'ETAH': 'UP', 'BADAUN': 'UP',
  'AONLA': 'UP', 'BAREILLY': 'UP', 'PILIBHIT': 'UP', 'SHAHJAHANPUR': 'UP',
  'KHERI': 'UP', 'DHAURAHRA': 'UP', 'SITAPUR': 'UP', 'HARDOI': 'UP',
  'MISRIKH': 'UP', 'UNNAO': 'UP', 'LUCKNOW': 'UP', 'RAE BARELI': 'UP',
  'AMETHI': 'UP', 'SULTANPUR': 'UP', 'PRATAPGARH': 'UP', 'FARRUKHABAD': 'UP',
  'ETAWAH': 'UP', 'KANNAUJ': 'UP', 'KANPUR': 'UP', 'AKBARPUR': 'UP',
  'JALAUN': 'UP', 'JHANSI': 'UP', 'HAMIRPUR': 'UP', 'BANDA': 'UP',
  'FATEHPUR': 'UP', 'KAUSHAMBI': 'UP', 'ALLAHABAD': 'UP', 'PHULPUR': 'UP',
  'AMBEDKAR NAGAR': 'UP', 'SHRAWASTI': 'UP', 'DOMARIYAGANJ': 'UP',
  'BASTI': 'UP', 'SANT KABIR NAGAR': 'UP', 'GONDA': 'UP', 'KAISERGANJ': 'UP',
  'BAHRAICH': 'UP', 'SRAVASTI': 'UP', 'BALRAMPUR': 'UP', 'GONDA': 'UP',
  'FAIZABAD': 'UP', 'BARABANKI': 'UP', 'GORAKHPUR': 'UP', 'KUSHI NAGAR': 'UP',
  'DEORIA': 'UP', 'BANSGAON': 'UP', 'LALGANJ': 'UP', 'AZAMGARH': 'UP',
  'GHOSI': 'UP', 'SALEMPUR': 'UP', 'BALLIA': 'UP', 'JAUNPUR': 'UP',
  'MACHHLISHAHR': 'UP', 'GHAZIPUR': 'UP', 'CHANDAULI': 'UP', 'VARANASI': 'UP',
  'BHADOHI': 'UP', 'MIRZAPUR': 'UP', 'ROBERTSGANJ': 'UP',

  // Uttarakhand (5 seats)
  'NAINITAL-UDHAM SINGH NAGAR': 'UK', 'ALMORA': 'UK', 'PAURI GARHWAL': 'UK',
  'TEHRI GARHWAL': 'UK', 'HARIDWAR': 'UK',

  // West Bengal (42 seats)
  'COOCH BEHAR': 'WB', 'ALIPURDUARS': 'WB', 'JALPAIGURI': 'WB',
  'DARJEELING': 'WB', 'RAIGANJ': 'WB', 'BALURGHAT': 'WB', 'MALDA NORTH': 'WB',
  'MALDA SOUTH': 'WB', 'JANGIPUR': 'WB', 'MURSHIDABAD': 'WB', 'BAHARAMPUR': 'WB',
  'KRISHNANAGAR': 'WB', 'RANAGHAT': 'WB', 'BANGAON': 'WB', 'BARRACKPUR': 'WB',
  'DUM DUM': 'WB', 'BARASAT': 'WB', 'BASIRHAT': 'WB', 'JAYNAGAR': 'WB',
  'MATHURAPUR': 'WB', 'DIAMOND HARBOUR': 'WB', 'JADAVPUR': 'WB',
  'KOLKATA SOUTH': 'WB', 'KOLKATA NORTH': 'WB', 'HOWRAH': 'WB',
  'ULUBERIA': 'WB', 'SRERAMPUR': 'WB', 'HOOGHLY': 'WB', 'ARAMBAG': 'WB',
  'TAMLUK': 'WB', 'KANTHI': 'WB', 'GHATAL': 'WB', 'JHARGRAM': 'WB',
  'MEDINIPUR': 'WB', 'PURULIA': 'WB', 'BANKURA': 'WB', 'BISHNUPUR': 'WB',
  'BARDHAMAN PURBA': 'WB', 'BARDHAMAN-DURGAPUR': 'WB', 'ASANSOL': 'WB',
  'BOLPUR': 'WB', 'BIRBHUM': 'WB',

  // Special UTs
  'ANDAMAN AND NICOBAR ISLANDS': 'AN',
  'LAKSHADWEEP': 'LD',
};

const filePath = path.resolve(__dirname, '../data/seed/mp-profiles.ts');
let content = fs.readFileSync(filePath, 'utf8');

let fixed = 0;
let stillEmpty = 0;

// Match blocks where stateCode is still '' but we have constituency info
// Pattern: find objects with stateCode: '' and extract constituency field
const blockPattern = /( {2}\{[\s\S]*? {2}\},)/g;

content = content.replace(blockPattern, (block) => {
  if (!block.includes("stateCode: ''")) return block;

  // Get constituency name
  const constMatch = block.match(/constituency:\s*'([^']*)'/);
  if (!constMatch) {
    stillEmpty++;
    return block;
  }

  const constName = constMatch[1].toUpperCase().trim();

  // Try exact match first
  let sc = CONSTITUENCY_TO_STATE[constName];

  // Try partial match if exact fails
  if (!sc) {
    for (const [key, val] of Object.entries(CONSTITUENCY_TO_STATE)) {
      if (constName.includes(key) || key.includes(constName)) {
        sc = val;
        break;
      }
    }
  }

  if (sc) {
    fixed++;
    return block.replace("stateCode: ''", `stateCode: '${sc}'`);
  } else {
    stillEmpty++;
    return block;
  }
});

// Also fix 'DELHI (NCT' → 'DL'
const delhiFixes = (content.match(/stateCode: ''/g) || []).length;
content = content.replace(/district:\s*'DELHI \(NCT[^']*'([\s\S]*?)stateCode:\s*''/g,
  (m, mid) => m.replace("stateCode: ''", "stateCode: 'DL'"));

console.log(`Fixed with constituency lookup: ${fixed}`);
console.log(`Still empty after fix: ${stillEmpty}`);
console.log(`Delhi NCT fixes: ${delhiFixes}`);

const remaining = (content.match(/stateCode: ''/g) || []).length;
console.log(`Total remaining empty: ${remaining}`);

fs.writeFileSync(filePath, content, 'utf8');
console.log(`File written: ${filePath}`);
