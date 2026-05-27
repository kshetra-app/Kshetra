const fs = require('fs');
let content = fs.readFileSync('data/seed/mp-profiles.ts', 'utf8');

// Manual fixes for the 5 remaining MPs
const fixes = [
  { name: 'Ramesh Jigajinagi', state: 'KA' },       // Bijapur = Karnataka
  { name: 'Dr. Ricky Andrew J. Syngkon', state: 'ML' }, // Shillong = Meghalaya
  { name: 'Gurumoorthy Maddila', state: 'AP' },      // Tirupathi = AP (note: not TN)
  { name: 'Sasikanth Senthil', state: 'TN' },        // Tiruvallur = Tamil Nadu
  { name: 'Saleng A Sangma', state: 'ML' },          // Tura = Meghalaya
];

for (const fix of fixes) {
  // Find the block with this MP's name and fix stateCode
  const nameEsc = fix.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `(name:\\s*'${nameEsc}'[\\s\\S]*?stateCode:\\s*)''`,
    'g'
  );
  const before = content;
  content = content.replace(re, `$1'${fix.state}'`);
  if (content !== before) {
    console.log(`Fixed: ${fix.name} → ${fix.state}`);
  } else {
    console.log(`Warning: Could not find ${fix.name}`);
  }
}

const remaining = (content.match(/stateCode: ''/g) || []).length;
console.log(`Remaining empty: ${remaining}`);
fs.writeFileSync('data/seed/mp-profiles.ts', content, 'utf8');
console.log('Done!');
