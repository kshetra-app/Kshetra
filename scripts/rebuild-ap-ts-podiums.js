const fs = require('fs');
const { execFileSync } = require('child_process');

console.log('Loading clean raw United AP & TS podiums from git history (HEAD~1)...');
const rawApPod = JSON.parse(execFileSync('git', ['show', 'HEAD~1:data/historical/podiums/ap-podium.json'], {
  cwd: 'C:/K',
  maxBuffer: 100 * 1024 * 1024,
  encoding: 'utf8',
}));

const rawTsPod = JSON.parse(execFileSync('git', ['show', 'HEAD~1:data/historical/podiums/ts-podium.json'], {
  cwd: 'C:/K',
  maxBuffer: 100 * 1024 * 1024,
  encoding: 'utf8',
}));

console.log('Raw United AP keys:', Object.keys(rawApPod).length);
console.log('Raw TS keys:', Object.keys(rawTsPod).length);

const apPodFile = 'C:/K/data/historical/podiums/ap-podium.json';
const tsPodFile = 'C:/K/data/historical/podiums/ts-podium.json';
const apResFile = 'C:/K/data/historical/ap-podium-results.json';
const tsResFile = 'C:/K/data/historical/ts-podium-results.json';

// 1. Identify modern Telangana names (1-119)
const modernTS = {};
for (let i = 1; i <= 119; i++) {
  const c = rawTsPod[String(i)]?.find(x => x.year === 2023 || x.year === 2018 || x.year === 2014);
  modernTS[i] = c ? c.constituencyName : `Constituency ${i}`;
}

// 2. Identify modern Andhra Pradesh names (1-175)
const modernAP = {};
for (let i = 1; i <= 175; i++) {
  const c = rawApPod[String(i)]?.find(x => x.year === 2024 || x.year === 2019 || x.year === 2014);
  modernAP[i] = c ? c.constituencyName : `Constituency ${i}`;
}

// Mapping of Old United AP (1999/2004 Delim 3) to Modern TS AC (1-119)
const oldToTsMap = {
  188: 82, // ACHAMPET -> Achampet
  189: 81, // NAGARKURNOOL -> Nagarkurnool
  190: 83, // KALWAKURTHI -> Kalwakurthy
  191: 84, // SHADNAGAR -> Shadnagar
  192: 75, // JADCHERLA -> Jadcherla
  193: 74, // MAHBUBNAGAR -> Mahbubnagar
  194: 78, // WANAPARTHY -> Wanaparthy
  195: 85, // KOLLAPUR -> Kollapur
  196: 80, // ALAMPUR -> Alampur
  197: 79, // GADWAL -> Gadwal
  198: 76, // AMARCHINTA -> Devarkadra
  199: 77, // MAKTHAL -> Makthal
  200: 72, // KODANGAL -> Kodangal
  201: 56, // TANDUR -> Tandur
  202: 55, // VICARABAD -> Vicarabad
  203: 54, // PARGI -> Pargi
  204: 53, // CHEVELLA -> Chevella
  205: 49, // IBRAHIMPATNAM -> Ibrahimpatnam
  206: 48, // MUSHEERABAD -> Musheerabad
  207: 57, // HIMAYATNAGAR -> Amberpet
  208: 62, // SANATHNAGAR -> Sanathnagar
  209: 61, // SECUNDERABAD -> Secunderabad
  210: 64, // KHAIRATABAD -> Khairatabad
  211: 68, // SECUNDERABAD CANTONMENT -> Secunderabad Cantt
  212: 58, // MALAKPET -> Malakpet
  213: 63, // ASAF NAGAR -> Nampally
  214: 65, // MAHARAJGUNJ -> Goshamahal
  215: 59, // KARWAN -> Karwan
  216: 67, // CHANDRAYANGUTTA -> Chandrayangutta
  217: 66, // CHARMINAR -> Charminar
  218: 60, // YAKUTPURA -> Yakutpura
  219: 39, // MEDCHAL -> Medchal
  220: 34, // SIDDIPET -> Siddipet
  221: 41, // DOMMAT -> Dubbak
  222: 42, // GAJWEL -> Gajwel
  223: 35, // NARSAPUR -> Narsapur
  224: 40, // SANGAREDDY -> Sangareddy
  225: 36, // ZAHIRABAD -> Zahirabad
  226: 38, // NARAYANKHED -> Narayankhed
  227: 43, // MEDAK -> Medak
  228: 43, // RAMAYAMPET -> Medak
  229: 37, // ANDOLE -> Andole
  230: 16, // BALKONDA -> Balkonda
  231: 11, // ARMOOR -> Armur
  232: 15, // KAMAREDDY -> Kamareddy
  233: 14, // YELLAREDDY -> Yellareddy
  234: 13, // JUKKAL -> Jukkal
  235: 12, // BODHAN -> Bodhan
  236: 18, // NIZAMABAD -> Nizamabad (Urban)
  237: 17, // DICHPALLI -> Nizamabad (Rural)
  239: 9,  // NIRMAL -> Nirmal
  240: 10, // MUDHOLE -> Mudhole
  241: 7,  // ADILABAD -> Adilabad
  242: 8,  // BOATH -> Boath
  243: 5,  // ASIFABAD -> Asifabad
  244: 6,  // KHANAPUR -> Khanapur
  245: 4,  // LUXETTIPET -> Mancherial
  246: 1,  // SIRPUR -> Sirpur
  247: 2,  // CHINNUR -> Chennur
  248: 24, // MANTHANI -> Manthani
  249: 25, // PEDDAPALLI -> Peddapalle
  250: 23, // MYDARAM -> Ramagundam
  251: 27, // HUZURABAD -> Huzurabad
  252: 31, // KAMALAPUR -> Wardhannapet
  253: 32, // INDURTHI -> Husnabad
  254: 26, // KARIMNAGAR -> Karimnagar
  255: 28, // CHOPPADANDI -> Choppadandi
  256: 22, // JAGTIAL -> Jagtial
  257: 21, // BUGGARAM -> Dharmapuri
  258: 20, // METPALLI -> Koratla
  259: 29, // SIRCILLA -> Sircilla
  260: 30, // NARELLA -> Vemulawada
  261: 98, // CHERIYAL -> Jangaon
  262: 98, // JANGAON -> Jangaon
  263: 100,// CHENNUR (Warangal) -> Palakurthi
  264: 101,// DHORNAKAL -> Dornakal
  265: 102,// MAHBUBABAD -> Mahabubabad
  266: 103,// NARSAMPET -> Narsampet
  267: 104,// PARKAL -> Parkal
  268: 99, // GHANPUR -> Station Ghanpur
  269: 106,// WARANGAL -> Warangal East
  270: 105,// HANAMKONDA -> Warangal West
  271: 107,// SHYAMPET -> Bhupalpalle
  272: 108,// PARKAL/MULUG -> Mulug
  273: 108,// MULUG -> Mulug
  274: 119,// BHADRACHALAM -> Bhadrachalam
  275: 118,// BURGAMPAHAD -> Pinapaka
  276: 117,// KOTHAGUDEM -> Kothagudem
  277: 116,// SATHUPALLI -> Sathupalle
  278: 113,// MADHIRA -> Madhira
  279: 114,// PALAIR -> Palair
  280: 112,// KHAMMAM -> Khammam
  281: 115,// SHUJATNAGAR -> Yellandu
  282: 115,// YELLANDU -> Yellandu
  283: 96, // TUNGATURTHI -> Thungathurthi
  284: 95, // SURYAPET -> Suryapet
  285: 97, // KODAD -> Kodad
  286: 88, // MIRYALGUDA -> Miryalaguda
  287: 87, // CHALAKURTHI -> Nagarjuna Sagar
  288: 92, // NAKREKAL -> Nakrekal
  289: 91, // NALGONDA -> Nalgonda
  290: 94, // RAMANNAPET -> Alair
  291: 90, // ALAIR -> Alair
  292: 94, // BHONGIR -> Bhongir
  293: 93, // MUNGODE -> Munugode
  294: 86, // DEVERKONDA -> Devarakonda
};

// Mapping of Old United AP (1-187) to Modern AP AC (1-175)
const oldToApMap = {
  1: 1,    // ICHAPURAM -> Ichchapuram
  2: 1,    // SOMPETA -> merged into Ichchapuram
  3: 3,    // TEKKALI -> Tekkali
  4: 4,    // HARISHCHANDRA -> Pathapatnam
  5: 5,    // NARASANNAPETA -> Narasannapeta
  6: 4,    // PATAPATNAM -> Pathapatnam
  7: 6,    // KOTHURU -> Palakonda / Amadalavalasa
  8: 7,    // NAGURU -> Kurupam
  9: 8,    // PARVATHIPURAM -> Parvathipuram
  10: 9,   // SALUR -> Salur
  11: 10,  // BOBBILI -> Bobbili
  12: 11,  // THERLAM -> Cheepurupalli
  13: 2,   // VUNUKURU -> Palasa
  14: 6,   // PALAKONDA -> Palakonda
  15: 5,   // AMADALAVALASA -> Amadalavalasa
  16: 12,  // SRIKAKULAM -> Srikakulam
  17: 13,  // ETCHERLA -> Etcherla
  18: 10,  // CHEEPURUPALLI -> Cheepurupalli
  19: 14,  // GAJAPATHINAGARAM -> Gajapathinagaram
  20: 15,  // VIZIANAGARAM -> Vizianagaram
  21: 16,  // SATHIVADA -> Nellimarla
  22: 17,  // BHOGAPURAM -> Nellimarla
  23: 20,  // BHEEMUNIPATNAM -> Bhimili
  24: 22,  // VISAKHAPATNAM-I -> Visakhapatnam South
  25: 21,  // VISAKHAPATNAM-II -> Visakhapatnam East
  26: 23,  // PENDURTHI -> Pendurthi
  27: 19,  // UTTARAPALLI -> Srungavarapukota
  28: 19,  // SRUNGAVARAPUKOTA -> Srungavarapukota
  29: 26,  // PADERU -> Paderu
  30: 27,  // MADUGULA -> Madugula
  31: 28,  // CHODAVARAM -> Chodavaram
  32: 30,  // ANAKAPALLI -> Anakapalle
  33: 29,  // PARAVADA -> Pendurthi
  34: 32,  // ELAMANCHILI -> Elamanchili
  35: 31,  // PAYAKARAOPETA -> Payakaraopet
  36: 33,  // NARSIPATNAM -> Narsipatnam
  37: 28,  // CHINTAPALLI -> Paderu
  38: 27,  // YELLAVARAM -> Rampachodavaram
  39: 51,  // BURUGUPUDI -> Rajahmundry Rural
  40: 50,  // RAJAHMUNDRY -> Rajahmundry City
  41: 52,  // KADIAM -> Rajanagaram
  42: 53,  // JAGGAMPETA -> Jaggampeta
  43: 41,  // PEDDAPURAM -> Peddapuram
  44: 42,  // PRATHIPADU -> Prathipadu
  45: 35,  // TUNI -> Tuni
  46: 36,  // PITHAPURAM -> Pithapuram
  47: 38,  // KAKINADA -> Kakinada City
  48: 39,  // SAMALKOT -> Kakinada Rural
  49: 43,  // ANAPARTHY -> Anaparthy
  50: 44,  // RAMACHANDRAPURAM -> Ramachandrapuram
  51: 45,  // MUMMIDIVARAM -> Mummidivaram
  52: 46,  // AMALAPURAM -> Amalapuram
  53: 47,  // RAZOLE -> Razole
  54: 48,  // GANNAVARAM (East Godavari) -> P.Gannavaram
  55: 49,  // KOTHAPETA -> Kothapeta
  56: 54,  // MANDAPETA -> Mandapeta
  57: 57,  // KOVVUR -> Kovvur
  58: 58,  // NIDADAVOLE -> Nidadavole
  59: 59,  // ACHHANTA -> Achanta
  60: 57,  // PALACOLE -> Palakollu
  61: 60,  // NARASAPUR -> Narasapuram
  62: 61,  // BHIMAVARAM -> Bhimavaram
  63: 62,  // UNDI -> Undi
  64: 63,  // TANUKU -> Tanuku
  65: 65,  // TADEPALLIGUDEM -> Tadepalligudem
  66: 66,  // UNGUTUR -> Unguturu
  67: 64,  // DENDULURU -> Denduluru
  68: 65,  // ELURU -> Eluru
  69: 67,  // GOPALAPURAM -> Gopalapuram
  70: 67,  // POLAVARAM -> Polavaram
  71: 68,  // CHINTALAPUDI -> Chintalapudi
  72: 69,  // TIRUVURU -> Tiruvuru
  73: 73,  // KAIKALUR -> Kaikalur
  74: 74,  // PEDANA -> Pedana
  75: 75,  // MACHILIPATNAM -> Machilipatnam
  76: 76,  // AVANIGADDA -> Avanigadda
  77: 77,  // PAMARRU -> Pamarru
  78: 78,  // PENAMALURU -> Penamaluru
  79: 79,  // VIJAYAWADA WEST -> Vijayawada West
  80: 80,  // VIJAYAWADA CENTRAL -> Vijayawada Central
  81: 81,  // VIJAYAWADA EAST -> Vijayawada East
  82: 70,  // NUZVID (old AC 82) -> modern AP AC 70 (Nuzvid)
  83: 83,  // NANDIGAMA -> Nandigama
  84: 84,  // JAGGAYYAPETA -> Jaggayyapeta
  85: 85,  // PEDAKURAPADU -> Pedakurapadu
  86: 86,  // TADIKONDA -> Tadikonda
  87: 87,  // MANGALAGIRI -> Mangalagiri
  88: 88,  // PONNUR -> Ponnur
  89: 89,  // VEMURU -> Vemuru
  90: 90,  // REPALLE -> Repalle
  91: 91,  // TENALI -> Tenali
  92: 92,  // BAPATLA -> Bapatla
  93: 93,  // PRATHIPADU (Guntur) -> Prathipadu
  94: 94,  // GUNTUR EAST -> Guntur East
  95: 95,  // GUNTUR WEST -> Guntur West
  96: 96,  // CHILAKALURIPET -> Chilakaluripet
  97: 97,  // NARASARAOPET -> Narasaraopet
  98: 98,  // SATTENAPALLE -> Sattenapalle
  99: 99,  // VINUKONDA -> Vinukonda
  100: 100,// GURAJALA -> Gurajala
  101: 101,// MACHERLA -> Macherla
  102: 102,// YERRAGONDAPALEM -> Yerragondapalem
  103: 103,// DARSI -> Darsi
  104: 104,// PARCHUR -> Parchur
  105: 105,// ADDANKI -> Addanki
  106: 106,// CHIRALA -> Chirala
  107: 107,// SANTHANUTHALAPADU -> Santhanuthalapadu
  108: 108,// ONGOLE -> Ongole
  109: 109,// KANDUKUR -> Kandukur
  110: 110,// KANIGIRI -> Kanigiri
  111: 111,// KONDAPI -> Kondapi
  112: 112,// MARKAPUR -> Markapuram
  113: 113,// GIDDALUR -> Giddalur
  114: 114,// UDAYAGIRI -> Udayagiri
  115: 115,// KAVALI -> Kavali
  116: 116,// ATMAKUR -> Atmakur
  117: 117,// KOVUR -> Kovur
  118: 118,// NELLORE CITY -> Nellore City
  119: 119,// NELLORE RURAL -> Nellore Rural
  120: 120,// SARVEPALLI -> Sarvepalli
  121: 121,// GUDUR -> Gudur
  122: 122,// SULLURPETA -> Sullurpeta
  123: 123,// VENKATAGIRI -> Venkatagiri
  124: 124,// UDAYAGIRI -> Udayagiri
  125: 125,// BADVEL -> Badvel
  126: 126,// RAJAMPET -> Rajampet
  127: 127,// RAILWAY KODUR -> Railway Kodur
  128: 128,// RAYACHOTI -> Rayachoti
  129: 129,// PULIVENDLA -> Pulivendla
  130: 130,// KAMALAPURAM -> Kamalapuram
  131: 131,// JAMMALAMADUGU -> Jammalamadugu
  132: 132,// PRODDATUR -> Proddatur
  133: 133,// MYDUKUR -> Mydukur
  134: 134,// ALLAGADDA -> Allagadda
  135: 135,// SRISAILAM -> Srisailam
  136: 136,// NANDIKOTKUR -> Nandikotkur
  137: 137,// KURNOOL -> Kurnool
  138: 138,// PANYAM -> Panyam
  139: 139,// NANDYAL -> Nandyal
  140: 140,// BANAGANAPALLE -> Banaganapalle
  141: 141,// DHONE -> Dhone
  142: 142,// PATTIKONDA -> Pattikonda
  143: 143,// KODUMUR -> Kodumur
  144: 144,// YEMMIGANUR -> Yemmiganur
  145: 145,// MANTRALAYAM -> Mantralayam
  146: 146,// ADONI -> Adoni
  147: 147,// ALUR -> Alur
  148: 148,// RAYADURG -> Rayadurg
  149: 149,// URAVAKONDA -> Uravakonda
  150: 150,// GUNTAKAL -> Guntakal
  151: 151,// TADIPATRI -> Tadipatri
  152: 152,// SINGANAMALA -> Singanamala
  153: 153,// ANANTAPUR URBAN -> Anantapur Urban
  154: 154,// KALYANDURG -> Kalyandurg
  155: 155,// RAPTADU -> Raptadu
  156: 156,// MADAKASIRA -> Madakasira
  157: 157,// HINDUPUR -> Hindupur
  158: 158,// PENUKONDA -> Penukonda
  159: 159,// PUTTAPARTHI -> Puttaparthi
  160: 160,// DHARMAVARAM -> Dharmavaram
  161: 161,// KADIRI -> Kadiri
  162: 162,// THAMBALLAPALLE -> Thamballapalle
  163: 163,// PILERU -> Pileru
  164: 164,// MADANAPALLE -> Madanapalle
  165: 165,// PUNGANUR -> Punganur
  166: 166,// CHANDRAGIRI -> Chandragiri
  167: 167,// TIRUPATI -> Tirupati
  168: 168,// SRIKALAHASTI -> Srikalahasti
  169: 169,// SATYAVEDU -> Satyavedu
  170: 170,// NAGARI -> Nagari
  171: 171,// GANGADHARA NELLORE -> Gangadhara Nellore
  172: 172,// CHITTOOR -> Chittoor
  173: 173,// PUTHALAPATTU -> Puthalapattu
  174: 174,// PALAMANER -> Palamaner
  175: 175,// KUPPAM -> Kuppam
};

// 3. Rebuild Telangana Podiums
const cleanTsPod = {};
for (let ac = 1; ac <= 119; ac++) {
  const existing = rawTsPod[String(ac)] || [];
  // Keep 2023, 2018, 2014, 2009 (modern TS ACs)
  const modernContests = existing.filter(c => c.year >= 2009).map(c => ({
    ...c,
    constituencyName: modernTS[ac] || c.constituencyName,
  }));

  // Find 1999 and 2004 from genuine TS seats in United AP (old AC 188-294)
  const mappedOldAcs = Object.entries(oldToTsMap)
    .filter(([oldAc, modernAc]) => modernAc === ac)
    .map(([oldAc]) => Number(oldAc));

  const historicalContests = [];
  for (const oldAc of mappedOldAcs) {
    const oldContests = rawApPod[String(oldAc)] || [];
    for (const year of [2004, 1999]) {
      const oc = oldContests.find(c => c.year === year);
      if (oc && !historicalContests.some(x => x.year === year)) {
        historicalContests.push({
          ...oc,
          constituencyName: modernTS[ac] || oc.constituencyName,
          delimitationId: '3',
        });
      }
    }
  }

  // Combine and sort by year descending
  const all = [...modernContests, ...historicalContests].sort((a, b) => b.year - a.year);
  cleanTsPod[String(ac)] = all;
}

// 4. Rebuild Andhra Pradesh Podiums
const cleanApPod = {};
for (let ac = 1; ac <= 175; ac++) {
  const existing = rawApPod[String(ac)] || [];
  // Keep 2024, 2019, 2014
  const modernContests = existing.filter(c => c.year >= 2014).map(c => ({
    ...c,
    constituencyName: modernAP[ac] || c.constituencyName,
  }));

  // For 2009: take United AP contest at (ac + 119)
  const united2009Ac = ac + 119;
  const contest2009 = rawApPod[String(united2009Ac)]?.find(c => c.year === 2009);
  if (contest2009) {
    modernContests.push({
      ...contest2009,
      constituencyName: modernAP[ac] || contest2009.constituencyName,
      delimitationId: '4',
    });
  }

  // For 2004 & 1999: take old Coastal AP / Rayalaseema contest (old AC 1-187)
  const mappedOldAcs = Object.entries(oldToApMap)
    .filter(([oldAc, modernAc]) => modernAc === ac)
    .map(([oldAc]) => Number(oldAc));

  const historicalContests = [];
  for (const oldAc of mappedOldAcs) {
    const oldContests = rawApPod[String(oldAc)] || [];
    for (const year of [2004, 1999]) {
      const oc = oldContests.find(c => c.year === year);
      if (oc && !historicalContests.some(x => x.year === year)) {
        historicalContests.push({
          ...oc,
          constituencyName: modernAP[ac] || oc.constituencyName,
          delimitationId: '3',
        });
      }
    }
  }

  const all = [...modernContests, ...historicalContests].sort((a, b) => b.year - a.year);
  cleanApPod[String(ac)] = all;
}

// Write clean podium files
fs.writeFileSync(tsPodFile, JSON.stringify(cleanTsPod, null, 2), 'utf8');
fs.writeFileSync(apPodFile, JSON.stringify(cleanApPod, null, 2), 'utf8');
console.log('Saved clean ts-podium.json and ap-podium.json!');

// 5. Rebuild ts-podium-results.json and ap-podium-results.json
const flatTs = [];
for (const [acStr, contests] of Object.entries(cleanTsPod)) {
  const acNo = Number(acStr);
  for (const c of contests) {
    flatTs.push({
      id: `TS-AC-${acNo}-${c.year}`,
      stateCode: 'TS',
      stateName: 'Telangana',
      electionYear: c.year,
      acNo,
      constituencyName: c.constituencyName,
      delimitationId: c.delimitationId || (c.year >= 2008 ? '4' : '3'),
      validVotes: c.totalValidVotes || 0,
      marginWinnerToRunnerUp1: c.marginWinnerToRunnerUp1 ?? null,
      marginWinnerToRunnerUp2: c.marginWinnerToRunnerUp2 ?? null,
      marginRunnerUp1ToRunnerUp2: c.marginRunnerUp1ToRunnerUp2 ?? null,
      winner: c.winner,
      firstRunnerUp: c.firstRunnerUp,
      secondRunnerUp: c.secondRunnerUp,
      year: c.year,
      totalValidVotes: c.totalValidVotes || 0,
      constituencyId: acNo,
    });
  }
}
flatTs.sort((a, b) => a.acNo - b.acNo || b.electionYear - a.electionYear);
fs.writeFileSync(tsResFile, JSON.stringify(flatTs, null, 2), 'utf8');
console.log(`Saved ${flatTs.length} contests to ts-podium-results.json`);

const flatAp = [];
for (const [acStr, contests] of Object.entries(cleanApPod)) {
  const acNo = Number(acStr);
  for (const c of contests) {
    flatAp.push({
      id: `AP-AC-${acNo}-${c.year}`,
      stateCode: 'AP',
      stateName: 'Andhra Pradesh',
      electionYear: c.year,
      acNo,
      constituencyName: c.constituencyName,
      delimitationId: c.delimitationId || (c.year >= 2008 ? '4' : '3'),
      validVotes: c.totalValidVotes || 0,
      marginWinnerToRunnerUp1: c.marginWinnerToRunnerUp1 ?? null,
      marginWinnerToRunnerUp2: c.marginWinnerToRunnerUp2 ?? null,
      marginRunnerUp1ToRunnerUp2: c.marginRunnerUp1ToRunnerUp2 ?? null,
      winner: c.winner,
      firstRunnerUp: c.firstRunnerUp,
      secondRunnerUp: c.secondRunnerUp,
      year: c.year,
      totalValidVotes: c.totalValidVotes || 0,
      constituencyId: acNo,
    });
  }
}
flatAp.sort((a, b) => a.acNo - b.acNo || b.electionYear - a.electionYear);
fs.writeFileSync(apResFile, JSON.stringify(flatAp, null, 2), 'utf8');
console.log(`Saved ${flatAp.length} contests to ap-podium-results.json`);

// Verification check
console.log('\n--- VERIFICATION ---');
console.log('TS AC 1 (Sirpur) years & winners:', cleanTsPod['1'].map(c => `${c.year}: ${c.constituencyName} - ${c.winner?.name}`));
console.log('TS AC 82 (Achampet) years & winners:', cleanTsPod['82'].map(c => `${c.year}: ${c.constituencyName} - ${c.winner?.name}`));
console.log('AP AC 1 (Ichchapuram) years & winners:', cleanApPod['1'].map(c => `${c.year}: ${c.constituencyName} - ${c.winner?.name}`));
console.log('AP AC 70 (Nuzvid) years & winners:', cleanApPod['70'].map(c => `${c.year}: ${c.constituencyName} - ${c.winner?.name}`));
