const fs = require('fs');
const path = require('path');

const SEED_DIR = path.join(__dirname, '..', 'data', 'seed');

const helpers = {
  'tamil-nadu-mla-profiles.ts': `
export function getTNMLAProfile(acNo: number): LegislatorProfile | undefined {
  return getTNMLAByConstituency(acNo);
}
export function getAllTNMLAs(): LegislatorProfile[] {
  return TN_MLA_PROFILES;
}
`,
  'kerala-mla-profiles.ts': `
export function getKLMLAProfile(acNo: number): LegislatorProfile | undefined {
  return getKLMLAByConstituency(acNo);
}
export function getAllKLMLAs(): LegislatorProfile[] {
  return KL_MLA_PROFILES;
}
`,
  'west-bengal-mla-profiles.ts': `
export function getWBMLAProfile(acNo: number): LegislatorProfile | undefined {
  return getWBMLAByConstituency(acNo);
}
export function getAllWBMLAs(): LegislatorProfile[] {
  return WB_MLA_PROFILES;
}
`,
  'assam-mla-profiles.ts': `
export function getASMLAProfile(acNo: number): LegislatorProfile | undefined {
  return getASMLAByConstituency(acNo);
}
export function getAllASMLAs(): LegislatorProfile[] {
  return AS_MLA_PROFILES;
}
`,
  'puducherry-mla-profiles.ts': `
export function getPYMLAProfile(acNo: number): LegislatorProfile | undefined {
  return getPYMLAByConstituency(acNo);
}
export function getAllPYMLAs(): LegislatorProfile[] {
  return PY_MLA_PROFILES;
}
`,
};

for (const [file, helperText] of Object.entries(helpers)) {
  const filePath = path.join(SEED_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  // Avoid duplicate appending
  if (content.includes('getTNMLAProfile') || content.includes('getKLMLAProfile') || content.includes('getWBMLAProfile') || content.includes('getASMLAProfile') || content.includes('getPYMLAProfile')) {
    console.log(`Helpers already exist in ${file}`);
    continue;
  }
  
  content += helperText;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully appended helpers to ${file}`);
}

console.log('All missing helper functions appended successfully!');
