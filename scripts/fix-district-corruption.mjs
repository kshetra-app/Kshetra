import fs from 'fs';
import path from 'path';

const dir = path.resolve('data/seed');

const corruptedMlaFiles = [
  'andhra-pradesh-mla-profiles.ts',
  'arunachal-pradesh-mla-profiles.ts',
  'assam-mla-profiles.ts',
  'bihar-mla-profiles.ts',
  'chhattisgarh-mla-profiles.ts',
  'goa-mla-profiles.ts',
  'gujarat-mla-profiles.ts',
  'haryana-mla-profiles.ts',
  'himachal-pradesh-mla-profiles.ts',
  'jharkhand-mla-profiles.ts',
  'kerala-mla-profiles.ts',
  'madhya-pradesh-mla-profiles.ts',
  'mizoram-mla-profiles.ts',
  'odisha-mla-profiles.ts',
  'puducherry-mla-profiles.ts',
  'punjab-mla-profiles.ts',
  'rajasthan-mla-profiles.ts',
  'sikkim-mla-profiles.ts',
  'tamil-nadu-mla-profiles.ts',
  'west-bengal-mla-profiles.ts',
];

function parseConstituencies(constFilePath) {
  const content = fs.readFileSync(constFilePath, 'utf8');
  // Map by acNo and also by normalized name
  const byAcNo = new Map();
  const byName = new Map();

  // Match objects like { acNo: 13, name: 'Salur', ... district: 'Parvathipuram Manyam', type: 'ST' ... }
  // Regex to match fields across single or multiple lines
  const itemRegex = /{\s*acNo:\s*(\d+)[^}]*?name:\s*['"]([^'"]+)['"][^}]*?}/gs;
  let match;
  while ((match = itemRegex.exec(content)) !== null) {
    const chunk = match[0];
    const acNo = parseInt(match[1], 10);
    const name = match[2].trim();
    
    const districtMatch = chunk.match(/district:\s*['"]([^'"]+)['"]/);
    const typeMatch = chunk.match(/type:\s*['"]([^'"]+)['"]/);
    
    if (districtMatch) {
      const district = districtMatch[1].trim();
      const type = typeMatch ? typeMatch[1].trim() : 'GEN';
      const info = { acNo, name, district, type };
      byAcNo.set(acNo, info);
      byName.set(name.toLowerCase(), info);
    }
  }

  return { byAcNo, byName };
}

let totalFixed = 0;

for (const mlaFile of corruptedMlaFiles) {
  const mlaPath = path.join(dir, mlaFile);
  const constFile = mlaFile.replace('-mla-profiles.ts', '-constituencies.ts');
  const constPath = path.join(dir, constFile);

  const { byAcNo, byName } = parseConstituencies(constPath);
  let content = fs.readFileSync(mlaPath, 'utf8');

  let fileFixes = 0;

  // Check interface definition: add reservationType?: 'General' | 'SC' | 'ST' | string; if not present
  if (!content.includes('reservationType?:')) {
    // Add to LegislatorProfile or MLAProfile interface
    content = content.replace(/(export interface (?:LegislatorProfile|MLAProfile)[^{]*{[^}]*?district\??:\s*string;)/s, '$1\n  reservationType?: \'General\' | \'SC\' | \'ST\' | string;');
  }

  // Format 1: Multiline records:
  // e.g.
  //     constituencyName: 'Salur',
  //     constituencyNumber: 13,
  //     district: 'St',
  // Or:
  //     acNo: 13,
  // ...
  //     district: 'Sc',
  
  // Format 2: Single-line records:
  // { acNo: 1, name: 'Manoj Manzil', ... district: 'Sc', ... }

  // Let's do a block-by-block replacement for objects with district: 'Sc' or 'St'
  
  // Replace in single-line records:
  // { ... acNo: X, ... constituencyName: 'Y', ... district: 'Sc' ... }
  const singleLineRegex = /({[^\n]*?acNo:\s*(\d+)[^\n]*?district:\s*'(Sc|St)'[^\n]*?})/g;
  content = content.replace(singleLineRegex, (match, fullObj, acNoStr, scSt) => {
    const acNo = parseInt(acNoStr, 10);
    const constNameMatch = fullObj.match(/constituencyName:\s*['"]([^'"]+)['"]/);
    const constName = constNameMatch ? constNameMatch[1].trim().toLowerCase() : null;

    let info = (constName && byName.get(constName)) || byAcNo.get(acNo);
    if (!info) {
      console.warn(`Could not find constituency for acNo ${acNo} in ${mlaFile}`);
      return match;
    }

    const realDistrict = info.district;
    const resType = scSt.toUpperCase(); // 'SC' or 'ST'
    fileFixes++;
    totalFixed++;

    // Replace district: 'Sc' with district: 'RealDistrict', reservationType: 'SC'
    return fullObj.replace(/district:\s*'(Sc|St)'/, `district: '${realDistrict}', reservationType: '${resType}'`);
  });

  // Multiline records replacement:
  // Find lines with district: 'Sc' or district: 'St'
  // Look backwards for acNo or constituencyNumber or constituencyName
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*)district:\s*'(Sc|St)',?/);
    if (m) {
      const indent = m[1];
      const scSt = m[2];
      const resType = scSt.toUpperCase();

      // Look back up to 30 lines for acNo or constituencyNumber or constituencyName
      let acNo = null;
      let constName = null;
      for (let j = i - 1; j >= Math.max(0, i - 35); j--) {
        const prev = lines[j];
        if (prev.includes('{') && prev.trim().startsWith('{')) {
          // Reached start of object
        }
        const numM = prev.match(/(?:constituencyNumber|acNo):\s*(\d+)/);
        if (numM && acNo === null) {
          acNo = parseInt(numM[1], 10);
        }
        const nameM = prev.match(/constituencyName:\s*['"]([^'"]+)['"]/);
        if (nameM && constName === null) {
          constName = nameM[1].trim().toLowerCase();
        }
      }

      let info = (constName && byName.get(constName)) || (acNo !== null && byAcNo.get(acNo));
      if (!info) {
        console.warn(`Could not find constituency for multiline record at line ${i+1} in ${mlaFile} (acNo=${acNo}, name=${constName})`);
      } else {
        const realDistrict = info.district.replace(/'/g, "\\'");
        lines[i] = `${indent}district: '${realDistrict}',\n${indent}reservationType: '${resType}',`;
        fileFixes++;
        totalFixed++;
      }
    }
  }

  content = lines.join('\n');
  fs.writeFileSync(mlaPath, content, 'utf8');
  console.log(`${mlaFile}: fixed ${fileFixes} records`);
}

console.log(`\nTotal corrupted district records fixed: ${totalFixed}`);
