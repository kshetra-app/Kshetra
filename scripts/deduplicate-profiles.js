const fs = require('fs');
const path = require('path');

const SEED_DIR = path.join(__dirname, '..', 'data', 'seed');

const files = [
  { code: 'TN', file: 'tamil-nadu-mla-profiles.ts', varName: 'TN_MLA_PROFILES' },
  { code: 'KL', file: 'kerala-mla-profiles.ts', varName: 'KL_MLA_PROFILES' },
  { code: 'WB', file: 'west-bengal-mla-profiles.ts', varName: 'WB_MLA_PROFILES' },
];

function extractBlocks(arrayStr) {
  const blocks = [];
  let braceCount = 0;
  let currentBlockStart = -1;
  
  for (let i = 0; i < arrayStr.length; i++) {
    const char = arrayStr[i];
    if (char === '{') {
      if (braceCount === 0) {
        currentBlockStart = i;
      }
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0 && currentBlockStart !== -1) {
        blocks.push(arrayStr.slice(currentBlockStart, i + 1));
        currentBlockStart = -1;
      }
    }
  }
  return blocks;
}

for (const f of files) {
  console.log(`Deduplicating ${f.code} in ${f.file}...`);
  const profPath = path.join(SEED_DIR, f.file);
  if (!fs.existsSync(profPath)) {
    console.log(`  File not found!`);
    continue;
  }
  
  const content = fs.readFileSync(profPath, 'utf8');
  
  const arrayStartStr = `export const ${f.varName}: LegislatorProfile[] = [`;
  const startIdx = content.indexOf(arrayStartStr);
  if (startIdx === -1) {
    console.log(`  ❌ Could not find start of array!`);
    continue;
  }
  
  const startArrayIdx = startIdx + arrayStartStr.length;
  // Find the closing ];
  const endArrayIdx = content.indexOf('];', startArrayIdx);
  if (endArrayIdx === -1) {
    console.log(`  ❌ Could not find end of array!`);
    continue;
  }
  
  const arrayStr = content.slice(startArrayIdx, endArrayIdx);
  const blocks = extractBlocks(arrayStr);
  
  console.log(`  Found ${blocks.length} total profile blocks.`);
  
  const seenAcNos = new Set();
  const uniqueBlocks = [];
  let duplicateCount = 0;
  
  for (const block of blocks) {
    const acNoMatch = block.match(/\bacNo:\s*(\d+)/);
    if (!acNoMatch) {
      console.log(`  ⚠️ Profile block missing acNo! Skipping.`);
      continue;
    }
    const acNo = Number(acNoMatch[1]);
    
    if (seenAcNos.has(acNo)) {
      duplicateCount++;
      // We prioritize blocks that are richer.
      // If the already saved block has dataCompleteness: 20 (our generated minimal one),
      // but this block has dataCompleteness > 20, let's replace it!
      const existingIdx = uniqueBlocks.findIndex(b => Number(b.match(/\bacNo:\s*(\d+)/)[1]) === acNo);
      const existingBlock = uniqueBlocks[existingIdx];
      const existingCompleteness = Number(existingBlock.match(/dataCompleteness:\s*(\d+)/)?.[1] || 0);
      const currentCompleteness = Number(block.match(/dataCompleteness:\s*(\d+)/)?.[1] || 0);
      
      if (currentCompleteness > existingCompleteness) {
        uniqueBlocks[existingIdx] = block;
      }
      continue;
    }
    
    seenAcNos.add(acNo);
    uniqueBlocks.push(block);
  }
  
  console.log(`  Unique blocks: ${uniqueBlocks.length}, Duplicate blocks removed: ${duplicateCount}`);
  
  const newArrayStr = '\n' + uniqueBlocks.join(',\n') + '\n';
  const updatedContent = content.slice(0, startArrayIdx) + newArrayStr + content.slice(endArrayIdx);
  
  fs.writeFileSync(profPath, updatedContent, 'utf8');
  console.log(`  Successfully deduplicated and updated ${f.file}!\n`);
}

console.log('Deduplication script completed successfully!');
