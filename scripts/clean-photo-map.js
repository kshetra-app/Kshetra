const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, '..', 'apps', 'mobile', 'data', 'candidate-photo-map.json');
const photoMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

// Count how many times each URL appears
const urlCounts = {};
for (const url of Object.values(photoMap)) {
  urlCounts[url] = (urlCounts[url] || 0) + 1;
}

// For duplicate URLs, only keep the entry where the filename clearly matches the candidate name
const clean = {};
for (const [name, url] of Object.entries(photoMap)) {
  if (urlCounts[url] === 1) {
    // Unique URL — likely correct
    clean[name] = url;
    continue;
  }

  // Duplicate URL — verify name matches the URL filename
  const fileName = decodeURIComponent((url.split('/').pop() || '')).toLowerCase()
    .replace(/\d+px-/, '')
    .replace(/\.(jpg|jpeg|png|gif|webp)/i, '')
    .replace(/[_\-()%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const candidateWords = name.toLowerCase().replace(/[.,]/g, '').split(/\s+/).filter(w => w.length > 2);
  
  // Check if at least 2 significant words from the candidate name appear in filename
  const matchCount = candidateWords.filter(w => fileName.includes(w)).length;
  
  if (matchCount >= 2 || (candidateWords.length === 1 && matchCount >= 1)) {
    clean[name] = url;
  }
  // else: skip — wrong candidate
}

fs.writeFileSync(mapPath, JSON.stringify(clean, null, 2));

const removed = Object.keys(photoMap).length - Object.keys(clean).length;
console.log(`Before: ${Object.keys(photoMap).length}`);
console.log(`After: ${Object.keys(clean).length}`);
console.log(`Removed: ${removed} incorrect entries`);

// Verify no duplicates remain
const newCounts = {};
for (const url of Object.values(clean)) {
  newCounts[url] = (newCounts[url] || 0) + 1;
}
const remaining = Object.entries(newCounts).filter(([, c]) => c > 1);
console.log(`Remaining duplicate URLs: ${remaining.length}`);
if (remaining.length > 0) {
  remaining.slice(0, 5).forEach(([url, c]) => {
    console.log(`  ${c}x ${decodeURIComponent(url.split('/').pop())}`);
  });
}
