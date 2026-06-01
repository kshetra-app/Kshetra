/**
 * align-2026-mla-acnos.js
 *
 * Reads constituency seed files and MLA profile files for TN, KL, WB.
 * Matches MLA profiles to constituencies by name strictly, and rewrites
 * the profiles with corrected `acNo` and matching `id`.
 */

const fs = require('fs');
const path = require('path');

const SEED = path.join(__dirname, '..', 'data', 'seed');

const states = [
  {
    code: 'TN',
    constFile: 'tamil-nadu-constituencies.ts',
    profFile: 'tamil-nadu-mla-profiles.ts',
  },
  {
    code: 'KL',
    constFile: 'kerala-constituencies.ts',
    profFile: 'kerala-mla-profiles.ts',
  },
  {
    code: 'WB',
    constFile: 'west-bengal-constituencies.ts',
    profFile: 'west-bengal-mla-profiles.ts',
  },
];

// Normalize name strictly
function norm(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // Strip parentheses content like (SC), (ST)
    .replace(/[^a-z0-9]/g, '') // Strip all non-alphanumeric chars including spaces
    .trim();
}

// Custom aliases dictionary for exact match resolution
const ALIASES = {
  // TN
  'mettupalayam': 'mettuppalayam',
  'thoothukudi': 'thoothukkudi',
  'tiruppathur': 'tiruppattur',
  'madhuravoyal': 'maduravoyal',
  'aruppukottai': 'aruppukkottai',
  'mudukulathur': 'mudhukulathur',
  'bodinayakkanur': 'bodinayakanur',
  'gandarvakottai': 'gandarvakkottai',
  'vedharanyam': 'vedaranyam',
  'madhavaram': 'madavaram',
  
  // KL
  'vypen': 'vypin',
  'vallikkunnu': 'vallikunnu',
  'trikaripur': 'thrikkaripur',
  'thiruvambady': 'thiruvambadi',
  'taliparamba': 'thaliparamba',
  'quilandy': 'koyilandy',
  'nemmara': 'nenmara',
  'mavelikara': 'mavelikkara',
  'mannarkad': 'mannarkkad',
  'kuttiadi': 'kuttiady',
  'kozhikodesouth': 'kozhikodebsouth',
  'kazhakkoottam': 'kazhakoottam',
  'kasaragod': 'kasargod',
  'karunagappally': 'karunagapally',
  'irinjalakkuda': 'irinjalakuda',
  'dharmadam': 'dharmadom',
  'chathannur': 'chathannoor',
  'chalakkudy': 'chalakudy',
  'ambalapuzha': 'ambalappuzha',
  'ottapalam': 'ottappalam',
  'manjeshwar': 'manjeshwaram',
  'kalliasser': 'kalliasseri',
  
  // WB
  'arambag': 'Arambagh',
  'arambagh': 'Arambagh',
  'barrackpur': 'Barrackpore',
  'coochbehar': 'cooch behar',
  'harischandrapur': 'Harishchandrapur',
  'joynagar': 'Jaynagar',
  'kashipurbelgachhia': 'Kashipur-Belgachia',
  'labhpur': 'Labpur',
  'monteswar': 'Manteswar',
  'pandabeswar': 'Pandaveswar',
  'satgachhia': 'Satgachia',
  'tollyganj': 'Tollygunge',
  'mahishadal': 'Mahisadal',
  'indus': 'Indas',
};

// Check if names match strictly or via alias
function matchNames(constName, profName) {
  const nConst = norm(constName);
  const nProf = norm(profName);
  
  if (nConst === nProf) return true;
  
  // Try alias
  const alias = ALIASES[nProf];
  if (alias && norm(alias) === nConst) return true;
  
  return false;
}

for (const s of states) {
  console.log(`Aligning ${s.code}...`);
  const constPath = path.join(SEED, s.constFile);
  const profPath = path.join(SEED, s.profFile);
  
  if (!fs.existsSync(constPath) || !fs.existsSync(profPath)) {
    console.log(`  Files missing!`);
    continue;
  }
  
  const constContent = fs.readFileSync(constPath, 'utf8');
  const profContent = fs.readFileSync(profPath, 'utf8');
  
  // Parse constituencies
  const constituencies = [];
  const constRe = /\{ acNo:\s*(\d+),\s*name:\s*'([^']+)'/g;
  let m;
  while ((m = constRe.exec(constContent)) !== null) {
    constituencies.push({ acNo: parseInt(m[1]), name: m[2] });
  }
  
  console.log(`  Parsed ${constituencies.length} constituencies`);
  
  // Parse profile blocks
  const idRe = /id:\s*'MLA_([A-Z]+)_2026_(\d+)_001'/g;
  const positions = [];
  let pm;
  while ((pm = idRe.exec(profContent)) !== null) {
    positions.push({ id: pm[0], acNo: pm[2], pos: pm.index });
  }
  
  let output = profContent;
  let matchesCount = 0;
  
  // We will process profile blocks and replace acNo and id
  // Let's do it in reverse order to preserve string positions
  for (let i = positions.length - 1; i >= 0; i--) {
    const start = positions[i].pos;
    const end = i + 1 < positions.length ? positions[i + 1].pos : profContent.length;
    let block = profContent.slice(start, end);
    
    const constNameM = block.match(/\bconstituencyName:\s*'([^']+)'/);
    if (constNameM) {
      const cName = constNameM[1];
      const match = constituencies.find(c => matchNames(c.name, cName));
      
      if (match) {
        matchesCount++;
        const newAcNo = match.acNo;
        const paddedAcNo = String(newAcNo).padStart(3, '0');
        
        // Replace id and acNo inside the block
        block = block.replace(
          /id:\s*'MLA_[A-Z]+_2026_\d+_001'/,
          `id: 'MLA_${s.code}_2026_${paddedAcNo}_001'`
        );
        block = block.replace(
          /\bacNo:\s*\d+,/,
          `acNo: ${newAcNo},`
        );
        block = block.replace(
          /\bconstituencyNumber:\s*\d+,/,
          `constituencyNumber: ${newAcNo},`
        );
        // Also update the 2026 election history constituencyNumber if present
        block = block.replace(
          /constituencyNumber:\s*\d+/g,
          `constituencyNumber: ${newAcNo}`
        );
        
        output = output.slice(0, start) + block + output.slice(end);
      } else {
        console.log(`  ⚠️ Unmatched constituency in profile: ${cName}`);
      }
    }
  }
  
  fs.writeFileSync(profPath, output, 'utf8');
  console.log(`  Aligned ${matchesCount} / ${positions.length} profiles successfully.\n`);
}

console.log('✅ Done aligning MLA profile acNos!');
