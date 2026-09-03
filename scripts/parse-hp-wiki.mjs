import { readFileSync, writeFileSync } from 'node:fs';

const wiki = readFileSync('scripts/hp-2022-wiki.txt', 'utf8');
const rows = wiki.split('|-');

const seats = [];
let currentDistrict = '';

for (const r of rows) {
  const lines = r.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Check for district line
  for (const l of lines) {
    const distMatch = l.match(/! (?:rowspan="\d+"\s*\|)?\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/i);
    if (distMatch && distMatch[1].toLowerCase().includes('district')) {
      currentDistrict = distMatch[1].replace(/district/gi, '').trim();
    }
  }

  // Look for line starting with | followed by digits
  let acNoIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\|\s*\d+\s*$/.test(lines[i])) {
      acNoIdx = i;
      break;
    }
  }

  if (acNoIdx !== -1) {
    const acNo = parseInt(lines[acNoIdx].replace('|', '').trim());
    const nameLine = lines[acNoIdx + 1] || '';
    let name = nameLine.replace(/^\|/, '').trim();
    const nameMatch = name.match(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/);
    if (nameMatch) name = nameMatch[1];
    let type = 'GEN';
    if (name.includes('(SC)')) type = 'SC';
    if (name.includes('(ST)')) type = 'ST';
    name = name.replace(/\s*\([^)]*\)\s*$/, '').trim();

    // The remaining lines in this block contain candidate, party, votes, etc.
    const cleanCells = lines.slice(acNoIdx + 2).filter(l => !l.startsWith('style=') && !l.startsWith('!'));
    
    // Helper to clean wiki text from cell
    const cleanVal = (s) => s.replace(/^\|/, '').replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1').replace(/['"{}]/g, '').trim();

    // Winner candidate
    const wCand = cleanVal(cleanCells[0] || '');
    // Winner party
    let wParty = cleanVal(cleanCells[1] || '');
    if (wParty.includes('BJP')) wParty = 'BJP';
    else if (wParty.includes('INC') || wParty.includes('Congress')) wParty = 'INC';
    else if (wParty.includes('IND') || wParty.includes('Independent')) wParty = 'IND';
    else if (wParty.includes('AAP')) wParty = 'AAP';
    else if (wParty.includes('CPI')) wParty = 'CPIM';
    
    // Winner votes
    const wVotes = parseInt(cleanVal(cleanCells[2] || '').replace(/,/g, '')) || 0;
    
    // Runner-up candidate
    const ruCand = cleanVal(cleanCells[4] || '');
    // Runner-up party
    let ruParty = cleanVal(cleanCells[5] || '');
    if (ruParty.includes('BJP')) ruParty = 'BJP';
    else if (ruParty.includes('INC') || ruParty.includes('Congress')) ruParty = 'INC';
    else if (ruParty.includes('IND') || ruParty.includes('Independent')) ruParty = 'IND';
    else if (ruParty.includes('AAP')) ruParty = 'AAP';
    else if (ruParty.includes('CPI')) ruParty = 'CPIM';

    // Margin
    const margin = parseInt(cleanVal(cleanCells[7] || '').replace(/,/g, '')) || 0;

    seats.push({
      acNo,
      name,
      district: currentDistrict,
      type,
      winnerName: wCand,
      winnerParty: wParty,
      winnerVotes: wVotes,
      runnerName: ruCand,
      runnerParty: ruParty,
      margin,
    });
  }
}

console.log('Total parsed HP seats:', seats.length);
if (seats.length > 0) {
  console.log('Sample seat 1:', seats[0]);
  console.log('Sample seat 68:', seats[seats.length - 1]);
}
writeFileSync('scripts/hp-parsed-seats.json', JSON.stringify(seats, null, 2), 'utf8');
