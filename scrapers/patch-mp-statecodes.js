#!/usr/bin/env node
/**
 * Patches empty stateCode entries in mp-profiles.ts
 * stateCode appears BEFORE constituency in each entry
 *
 * Usage: node scrapers/patch-mp-statecodes.js
 */

const fs = require('fs');
const path = require('path');

const SEED_FILE = path.resolve(__dirname, '../data/seed/mp-profiles.ts');

// Maps constituency name (title-cased as in seed) → state code
const CONSTITUENCY_FIXES = {
  'Adilabad (St)': 'TS',
  'Ananthapur': 'AP',
  'Baharampur': 'WB',
  'Bansgaon (Sc)': 'UP',
  'Barabanki (Sc)': 'UP',
  'Burdwan - Durgapur': 'WB',
  'Chikkballapur': 'KA',
  'Dadar & Nagar Haveli (St)': 'DN',
  'Darrang-Udalguri': 'AS',
  'Deoria': 'UP',
  'Dibrugarh': 'AS',
  'Faizabad': 'UP',
  'Guntur': 'AP',
  'Jaynagar (Sc)': 'WB',
  'Kodarma': 'JH',
  'Kushi Nagar': 'UP',
  'Lakhimpur': 'UP',
  'Mohanlalganj (Sc)': 'UP',
  'Nagaon': 'AS',
  'Narsapuram': 'AP',
  'Narsaraopet': 'AP',
  'Parbhani': 'MH',
  'Sheohar': 'BR',
  'Sonitpur': 'AS',
  'Sreerampur': 'WB',
  'Sundargarh (St)': 'OD',
  'Surguja (St)': 'CG',
  'Tenkasi (Sc)': 'TN',
  'Thirupathi (Sc)': 'AP',
  'Vadakara': 'KL',
  'Ambedkar Nagar': 'UP',
  // These might appear in RS with empty state too:
  'Karimganj': 'AS', 'Silchar': 'AS', 'Jorhat': 'AS', 'Kaziranga': 'AS',
  'Kaliabor': 'AS', 'Nowgong': 'AS', 'Mangaldoi': 'AS', 'Tezpur': 'AS',
  'Barpeta': 'AS', 'Guwahati': 'AS', 'Dhubri': 'AS', 'Kokrajhar': 'AS',
};

console.log('📝 Patching stateCode in mp-profiles.ts...');
let content = fs.readFileSync(SEED_FILE, 'utf8');

let patched = 0;
for (const [constituency, code] of Object.entries(CONSTITUENCY_FIXES)) {
  // The pattern we're looking for is:
  //   stateCode: '',\n    house: 'lok_sabha',\n    constituency: 'CONSTITUENCY',
  // We want to replace stateCode: '' with stateCode: 'CODE'
  
  // Find all occurrences of this constituency
  const search = `constituency: '${constituency}',`;
  let searchIdx = 0;
  
  while (true) {
    const found = content.indexOf(search, searchIdx);
    if (found === -1) break;
    
    // Look backwards from found for "stateCode: '',"
    const lookback = content.substring(Math.max(0, found - 300), found);
    const emptyStateMatch = lookback.lastIndexOf("stateCode: '',");
    
    if (emptyStateMatch > -1) {
      const absPos = Math.max(0, found - 300) + emptyStateMatch;
      content = content.substring(0, absPos) + 
                `stateCode: '${code}',` + 
                content.substring(absPos + "stateCode: '',".length);
      patched++;
    }
    
    searchIdx = found + search.length;
  }
}

fs.writeFileSync(SEED_FILE, content, 'utf8');

// Verify
const remaining = (content.match(/stateCode: '',/g) || []).length;
const filled = (content.match(/stateCode: '[A-Z]{2,4}'/g) || []).length;

console.log(`✅ Patched ${patched} constituency entries`);
console.log(`   Empty stateCodes remaining: ${remaining}`);
console.log(`   Filled stateCodes         : ${filled}`);
