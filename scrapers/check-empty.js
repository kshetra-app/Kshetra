const fs = require('fs');
const content = fs.readFileSync('data/seed/mp-profiles.ts', 'utf8');
const blocks = content.match(/ {2}\{[\s\S]*? {2}\},/g) || [];
let count = 0;
for (const b of blocks) {
  if (b.includes("stateCode: ''")) {
    count++;
    const name = b.match(/name:\s*'([^']*)'/)?.[1] || 'unknown';
    const constit = b.match(/constituency:\s*'([^']*)'/)?.[1] || 'unknown';
    const dist = b.match(/district:\s*'([^']*)'/)?.[1] || 'unknown';
    console.log(count + '. ' + name + ' | ' + constit + ' | ' + dist);
  }
}
console.log('Total still empty:', count);
