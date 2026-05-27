#!/usr/bin/env node
/**
 * backfill-state-codes.js
 * Reads data/seed/mp-profiles.ts, maps district → stateCode for all 473 Lok Sabha MPs,
 * and writes the updated file back.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../data/seed/mp-profiles.ts');
let content = fs.readFileSync(filePath, 'utf8');

// District value → StateCode
const districtToState = {
  'ANDHRA PRADESH': 'AP',
  'ARUNACHAL PRADESH': 'AR',
  'ASSAM': 'AS',
  'BIHAR': 'BR',
  'CHHATTISGARH': 'CG',
  'GOA': 'GA',
  'GUJARAT': 'GJ',
  'HARYANA': 'HR',
  'HIMACHAL PRADESH': 'HP',
  'JHARKHAND': 'JH',
  'KARNATAKA': 'KA',
  'KERALA': 'KL',
  'MADHYA PRADESH': 'MP',
  'MAHARASHTRA': 'MH',
  'MANIPUR': 'MN',
  'MEGHALAYA': 'ML',
  'MIZORAM': 'MZ',
  'NAGALAND': 'NL',
  'ODISHA': 'OD',
  'PUNJAB': 'PB',
  'RAJASTHAN': 'RJ',
  'SIKKIM': 'SK',
  'TAMIL NADU': 'TN',
  'TELANGANA': 'TS',
  'TRIPURA': 'TR',
  'UTTAR PRADESH': 'UP',
  'UTTARAKHAND': 'UK',
  'WEST BENGAL': 'WB',
  'DELHI': 'DL',
  'JAMMU AND KASHMIR': 'JK',
  'LADAKH': 'LA',
  'PUDUCHERRY': 'PY',
  'CHANDIGARH': 'CH',
  'ANDAMAN AND NICOBAR ISLANDS': 'AN',
  'LAKSHADWEEP': 'LD',
  'DADRA AND NAGAR HAVELI AND DAMAN AND DIU': 'DN',
};

// The MP blocks have stateCode BEFORE district in the file structure.
// Pattern: stateCode: '', ... district: 'STATE_NAME'
// We need to match each object block and fix the stateCode inside it.

const counts = {};
let totalReplaced = 0;
const notMapped = new Set();

// Split file into individual MP object blocks (between { and },)
// Strategy: use a state machine to find each object, then process it
const lines = content.split('\n');
const outputLines = [];

// We process line by line tracking context
let currentBlock = [];
let inBlock = false;
let blockStateCode = null;
let blockDistrict = null;
let blockStartLine = -1;

function processBlock(blockLines) {
  // Find district and stateCode lines in this block
  let districtLine = -1;
  let stateCodeLine = -1;
  let district = null;
  let hasEmptyStateCode = false;

  for (let i = 0; i < blockLines.length; i++) {
    const line = blockLines[i];
    const distMatch = line.match(/district:\s*'([^']*)'/);
    if (distMatch) {
      district = distMatch[1];
      districtLine = i;
    }
    const scMatch = line.match(/stateCode:\s*'([^']*)'/);
    if (scMatch) {
      stateCodeLine = i;
      if (scMatch[1] === '') hasEmptyStateCode = true;
    }
  }

  if (hasEmptyStateCode && district) {
    const key = district.toUpperCase();
    const sc = districtToState[key];
    if (sc) {
      // Replace the stateCode line
      blockLines[stateCodeLine] = blockLines[stateCodeLine].replace(
        /stateCode:\s*''/,
        `stateCode: '${sc}'`
      );
      counts[sc] = (counts[sc] || 0) + 1;
      totalReplaced++;
    } else {
      notMapped.add(district);
    }
  }
  return blockLines;
}

// Simple approach: parse the whole file as text, find each MP object
// Each MP object starts with "  {\n" and ends with "  },"
const blockPattern = /( {2}\{[\s\S]*? {2}\},)/g;
let newContent = content.replace(blockPattern, (match) => {
  const matchLines = match.split('\n');
  const processed = processBlock(matchLines);
  return processed.join('\n');
});

// Count remaining empty stateCodes
const remainingEmpty = (newContent.match(/stateCode: ''/g) || []).length;

console.log(`Total stateCode fields backfilled: ${totalReplaced}`);
console.log(`Remaining empty: ${remainingEmpty}`);
console.log(`By state:`, JSON.stringify(counts, null, 2));
if (notMapped.size > 0) {
  console.log(`Unmapped district values:`, [...notMapped]);
}

// Write back
fs.writeFileSync(filePath, newContent, 'utf8');
console.log(`\nFile written: ${filePath}`);
