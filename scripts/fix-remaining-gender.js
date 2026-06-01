const fs = require('fs');

const fixes = [
  ['telangana-mla-profiles.ts', 'Devireddy Sudheer Reddy', 'F', 'M'],
  ['andhra-pradesh-mla-profiles.ts', 'Nelavala Vijayasree', 'M', 'F'],
  ['maharashtra-mla-profiles.ts', 'Balaji Devidasrao Kalyankar', 'F', 'M'],
  ['maharashtra-mla-profiles.ts', 'Vidya Thakur', 'M', 'F'],
];

let count = 0;
for (const [file, name, from, to] of fixes) {
  const p = 'C:/K/data/seed/' + file;
  let c = fs.readFileSync(p, 'utf8');
  // Find the entry with this name and fix its gender
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp("(name:\\s*'" + escaped + "'[^}]*?gender:\\s*')" + from + "(')", 's');
  if (re.test(c)) {
    c = c.replace(re, '$1' + to + '$2');
    fs.writeFileSync(p, c);
    count++;
    console.log('Fixed: ' + name + ' -> ' + to);
  } else {
    console.log('NOT FOUND: ' + name + ' in ' + file);
  }
}
console.log('Fixed ' + count + ' entries');
