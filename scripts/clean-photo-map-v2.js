const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, '..', 'apps', 'mobile', 'data', 'candidate-photo-map.json');
const photoMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

// Known wrong matches to remove
const WRONG_ENTRIES = [
  'A. Raja',           // Has T. Raja Singh photo
  'Lakshmi Raj Singh', // Has Rajnath Singh photo
  'R Narendra',        // Has Narendra Modi photo
  'G Sudhakar',        // Has K Sudhakar photo
  'H K Patil',         // Has M B Patil photo
  'Muttamsetti Srinivasa Rao', // Has Ganta Srinivasa Rao photo
  'E. K. Vijayan',     // Has Pinarayi Vijayan photo
  'A. C. Moideen',     // Has Kurukkoli Moideen photo
  'P Rajeev',          // Has Rajeev Chandrasekhar photo (wrong person)
];

for (const name of WRONG_ENTRIES) {
  if (photoMap[name]) {
    delete photoMap[name];
    console.log(`Removed: ${name}`);
  }
}

fs.writeFileSync(mapPath, JSON.stringify(photoMap, null, 2));

// Final stats
const vals = Object.values(photoMap);
const counts = {};
for (const v of vals) counts[v] = (counts[v] || 0) + 1;
const dupes = Object.entries(counts).filter(([, c]) => c > 1);
console.log(`\nFinal: ${Object.keys(photoMap).length} entries, ${dupes.length} duplicate URLs (aliases)`);
dupes.forEach(([url, c]) => {
  const names = Object.entries(photoMap).filter(([, u]) => u === url).map(([n]) => n);
  console.log(`  ${c}x: ${names.join(', ')}`);
});
