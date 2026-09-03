import { readFileSync } from 'node:fs';

function parseParty(raw) {
  const s = (raw || '').toLowerCase();
  if (s.includes('bharatiya janata') || s.includes('bjp') || s.includes('bhartiya janata')) return 'BJP';
  if (s.includes('national congress') || s.includes('inc') || s.includes('congress')) return 'INC';
  if (s.includes('biju janata dal') || s.includes('bjd')) return 'BJD';
  if (s.includes('aam aadmi') || s.includes('aap')) return 'AAP';
  if (s.includes('bahujan samaj') || s.includes('bsp')) return 'BSP';
  if (s.includes('rashtriya loktantrik') || s.includes('rlp')) return 'RLP';
  if (s.includes('rashtriya lok dal') || s.includes('rld')) return 'RLD';
  if (s.includes('bharat adivasi') || s.includes('bap')) return 'BAP';
  if (s.includes('asom gana parishad') || s.includes('agp')) return 'AGP';
  if (s.includes('all india united democratic front') || s.includes('aiudf')) return 'AIUDF';
  if (s.includes('bodoland people') || s.includes('bpf')) return 'BPF';
  if (s.includes('united people') || s.includes('uppl')) return 'UPPL';
  if (s.includes('all india trinamool') || s.includes('aitc')) return 'AITC';
  if (s.includes('communist party of india (marxist)') || s.includes('cpim') || s.includes('cpm')) return 'CPIM';
  if (s.includes('samajwadi party') || s.includes('sp')) return 'SP';
  if (s.includes('independent') || s.includes('ind')) return 'IND';
  if (s.includes('gondwana gantantra') || s.includes('ggp')) return 'GGP';
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'OTH';
}

function parseState(file, targetCount) {
  const text = readFileSync('scripts/' + file, 'utf8');
  const rows = text.split('|-');
  const seats = [];

  for (const r of rows) {
    const lines = r.split('\n').map(l => l.trim()).filter(Boolean);
    let acIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^[|!]\s*(\d{1,3})\s*$/);
      if (m && parseInt(m[1]) >= 1 && parseInt(m[1]) <= targetCount) {
        acIdx = i;
        break;
      }
    }
    if (acIdx === -1) continue;

    const acNo = parseInt(lines[acIdx].replace(/^[|!]/, '').trim());
    const nameLine = lines[acIdx + 1] || '';
    let name = nameLine.replace(/^[|!]/, '').replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1').replace(/\s*\([^)]*\)\s*$/, '').trim();

    // collect cells
    const cells = lines.slice(acIdx + 2).filter(l => !l.startsWith('!') && !l.includes('bgcolor=') && !l.includes('style=background-color') && !l.includes('style="background-color'));
    const clean = (s) => (s || '').replace(/^[|!]/, '').replace(/.*\|\s*/, '').replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1').replace(/\{\{[^|]+\|([^}]+)\}\}/g, '$1').replace(/['"{}]/g, '').trim();

    const wCand = clean(cells[0]);
    const wParty = parseParty(clean(cells[1]));
    const wVotes = parseInt(clean(cells[2]).replace(/[^\d]/g, '')) || 0;
    const ruCand = clean(cells[4]);
    const ruParty = parseParty(clean(cells[5]));
    const margin = parseInt(clean(cells[cells.length - 1]).replace(/[^\d]/g, '')) || 0;

    seats.push({ acNo, name, wCand, wParty, wVotes, ruCand, ruParty, margin });
  }

  // Deduplicate in case by-polls rows were in table
  const byNo = new Map();
  for (const s of seats) {
    if (!byNo.has(s.acNo)) byNo.set(s.acNo, s);
  }
  console.log(file, 'Seats extracted:', byNo.size, 'out of', targetCount);
  const tally = {};
  for (const s of byNo.values()) tally[s.wParty] = (tally[s.wParty] || 0) + 1;
  console.log('  Tally:', tally);
}

parseState('rj-2023-wiki.txt', 200);
parseState('mp-2023-wiki.txt', 230);
parseState('cg-2023-wiki.txt', 90);
parseState('od-2024-wiki.txt', 147);
parseState('as-2021-wiki.txt', 126);
