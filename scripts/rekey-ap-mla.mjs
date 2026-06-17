/**
 * Re-key AP MLA profiles to the official AC numbering from the authoritative
 * constituency seed. Two join keys: (1) constituency name (alias-normalized),
 * (2) MLA name vs seed winnerName (token overlap). Each official seat gets the
 * best-matching profile; surplus/bogus profiles are parked at acNo 900+ so they
 * are never served by getAPMLAProfile(1..175).
 *
 * Dry:   node scripts/rekey-ap-mla.mjs
 * Write: node scripts/rekey-ap-mla.mjs --write
 */
import { readFileSync, writeFileSync } from 'node:fs';
const WRITE = process.argv.includes('--write');
const MLA = 'C:/K/data/seed/andhra-pradesh-mla-profiles.ts';
const SEED = 'C:/K/data/seed/andhra-pradesh-constituencies.ts';

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g,'');
const ALIASES = { anakapalli:'anakapalle',yelamanchili:'elamanchili',payakaraopeta:'payakaraopet',nidadavolu:'nidadavole',
  palacole:'palakollu',narsapuram:'narasapuram',gurazala:'gurajala',sattenapalli:'sattenapalle',satyavedu:'sathyavedu',
  pulivendula:'pulivendla',rayachoty:'rayachoti',patikonda:'pattikonda',parchurpr:'parchur',jaggaiahpeta:'jaggayyapeta',
  ponnur:'ponnuru',emmiganur:'yemmiganur',tadpatri:'tadipatri',gannavarameg:'gannavaramkonaseema',gannavaram:'gannavaramkrishna',
  prathipadu:'prathipadukakinada' };

const seedTxt = readFileSync(SEED, 'utf8');
const seed = [...seedTxt.matchAll(/\{ acNo: (\d+), name: '([^']+)'.*?winnerName2024: '([^']+)'/g)]
  .map((m) => ({ acNo:+m[1], name:m[2], winner:m[3] }));
const seedByName = new Map(seed.map((s)=>[norm(s.name), s]));
const aliasResolve = (cn) => { const n=norm(cn); return seedByName.get(n) ?? (ALIASES[n]?seedByName.get(ALIASES[n]):undefined); };

const tokens = (s) => new Set(s.toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter((t)=>t.length>2));
const nameMatch = (a,b) => { const ta=tokens(a), tb=tokens(b); let c=0; for(const t of ta) if(tb.has(t)) c++; return c; };
const seedByWinner = (nm) => { let best=null,bc=0; for(const s of seed){const c=nameMatch(nm,s.winner); if(c>bc){bc=c;best=s;}} return bc>=1?best:null; };

const txt = readFileSync(MLA, 'utf8');
const parts = txt.split(/(?=id: 'MLA_AP)/);
const head = parts[0];
const blocks = parts.slice(1);

const profiles = blocks.map((b, i) => {
  const ac = b.match(/acNo:\s*(\d+)/);
  const nm = b.match(/name:\s*'([^']+)'/);
  const cn = b.match(/constituencyName:\s*'([^']+)'/);
  return { i, block:b, acNo: ac?+ac[1]:null, name: nm?nm[1]:'', cons: cn?cn[1]:'' };
});

// resolve each profile to an official seat
for (const p of profiles) {
  const byCons = aliasResolve(p.cons);
  const byWin = seedByWinner(p.name);
  p.seat = byCons ?? byWin;
  p.via = byCons ? 'cons' : (byWin ? 'winner' : 'none');
  // confidence: does MLA name match the seed winner of the resolved seat?
  p.winnerOk = p.seat ? nameMatch(p.name, p.seat.winner) >= 1 : false;
}

// group by official acNo, pick best profile per seat
const bySeat = new Map();
for (const p of profiles) if (p.seat) { if(!bySeat.has(p.seat.acNo)) bySeat.set(p.seat.acNo,[]); bySeat.get(p.seat.acNo).push(p); }
const assigned = new Map(); // acNo -> profile
for (const [acNo, list] of bySeat) {
  list.sort((a,b) => (b.winnerOk?1:0)-(a.winnerOk?1:0) || (a.via==='cons'?-1:1));
  assigned.set(acNo, list[0]);
  for (const p of list.slice(1)) p.surplus = true;
}
let park = 900;
for (const p of profiles) { p.newAcNo = (p.seat && assigned.get(p.seat.acNo)===p) ? p.seat.acNo : (p.surplus||!p.seat ? park++ : p.seat.acNo); }

const coveredSeats = new Set([...assigned.keys()]);
const missing = seed.filter((s)=>!coveredSeats.has(s.acNo));
const parked = profiles.filter((p)=>p.newAcNo>=900);
console.log('profiles =', profiles.length, '| official seats covered =', coveredSeats.size, '/175');
console.log('resolved via constituencyName =', profiles.filter((p)=>p.via==='cons').length,
  '| via winnerName =', profiles.filter((p)=>p.via==='winner').length, '| unresolved =', profiles.filter((p)=>p.via==='none').length);
console.log('parked (surplus/bogus) =', parked.length, '->', parked.map((p)=>`${p.cons}(${p.name})`).join(' | '));
console.log('\nofficial seats still MISSING a profile ('+missing.length+'):', missing.map((s)=>`${s.acNo} ${s.name}`).join(', ') || 'none');
const lowconf = profiles.filter((p)=>p.newAcNo<900 && !p.winnerOk);
console.log('\nassigned but MLA name != seed winner ('+lowconf.length+') [review]:');
lowconf.slice(0,40).forEach((p)=>{ const s=p.seat; console.log(`  off#${p.newAcNo} ${s.name}: profile '${p.name}' [${p.cons}] vs seed winner '${s.winner}'`); });

if (WRITE) {
  // Detach the structural tail (closing "];" + helper functions) from the last block.
  const last = profiles[profiles.length - 1];
  const tailMatch = last.block.match(/\n\];[\s\S]*$/);
  const tail = tailMatch ? tailMatch[0] : '\n];\n';
  last.block = last.block.replace(/\n\];[\s\S]*$/, '\n');

  let out = head;
  let kept = 0;
  for (const p of profiles) {
    if (p.newAcNo >= 900) continue; // drop bogus/surplus profiles
    let b = p.block;
    b = b.replace(/acNo:\s*\d+/, `acNo: ${p.newAcNo}`);
    b = b.replace(/constituencyNumber:\s*\d+/, `constituencyNumber: ${p.newAcNo}`);
    out += b;
    kept++;
  }
  out += tail;
  writeFileSync(MLA, out, 'utf8');
  console.log(`\nWROTE ${MLA} (${kept} profiles kept, ${profiles.length - kept} dropped)`);
}
