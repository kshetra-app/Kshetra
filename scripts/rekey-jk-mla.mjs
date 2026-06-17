/**
 * Re-key J&K MLA profiles to the official AC numbering (1-90) from the
 * authoritative constituency seed, and fix the district field (seed is the
 * source of truth, removing the 'Sc'/'St' leak). Join key: constituencyName
 * (alias-normalized). For seats with a Nov-2025 by-election, the by-election
 * winner (current member) supersedes the original 2024 winner's profile.
 *
 * Dry:   node scripts/rekey-jk-mla.mjs
 * Write: node scripts/rekey-jk-mla.mjs --write
 */
import { readFileSync, writeFileSync } from 'node:fs';
const WRITE = process.argv.includes('--write');
const MLA = 'C:/K/data/seed/jammu-kashmir-mla-profiles.ts';
const SEED = 'C:/K/data/seed/jammu-kashmir-constituencies.ts';

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
// profile constituencyName (normalized) -> seed name, where normalization alone fails
const ALIASES = { rspurajammusouth: 'RS Pora–Jammu South' };

// ── parse authoritative seed ────────────────────────────────────────────────
const seedTxt = readFileSync(SEED, 'utf8');
const seed = [...seedTxt.matchAll(/\{ acNo: (\d+), name: '([^']+)'[^}]*?district: '([^']*)', type: '(GEN|SC|ST)', winner2024: '[^']*', winnerName2024: '([^']+)'/g)]
  .map((m) => ({ acNo: +m[1], name: m[2], district: m[3], type: m[4], winner: m[5] }));
const seedByName = new Map(seed.map((s) => [norm(s.name), s]));
const resolve = (cn) => {
  const clean = cn.replace(/\s*:\s*Bye Election.*$/i, '').trim();
  const n = norm(clean);
  return seedByName.get(n) ?? (ALIASES[n] ? seedByName.get(norm(ALIASES[n])) : undefined);
};

const tokens = (s) => new Set(s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((t) => t.length > 2));
const nameMatch = (a, b) => { const ta = tokens(a), tb = tokens(b); let c = 0; for (const t of ta) if (tb.has(t)) c++; return c; };

// ── parse profiles (one object per line) ────────────────────────────────────
const txt = readFileSync(MLA, 'utf8');
const lines = txt.split('\n');
const profiles = [];
lines.forEach((line, idx) => {
  const m = line.match(/^\s*\{ acNo:.*\},?\s*$/);
  if (!m) return;
  const ac = line.match(/acNo:\s*(\d+)/);
  const nm = line.match(/name:\s*'([^']+)'/);
  const cn = line.match(/constituencyName:\s*'([^']+)'/);
  profiles.push({ idx, line, oldAc: ac ? +ac[1] : null, name: nm ? nm[1] : '',
    cons: cn ? cn[1] : '', isBye: /Bye Election/i.test(line) });
});

for (const p of profiles) {
  p.seat = resolve(p.cons);
  p.winnerOk = p.seat ? nameMatch(p.name, p.seat.winner) >= 1 : false;
}

// group by official seat; choose current member (by-election > winner-match > first)
const bySeat = new Map();
for (const p of profiles) if (p.seat) { if (!bySeat.has(p.seat.acNo)) bySeat.set(p.seat.acNo, []); bySeat.get(p.seat.acNo).push(p); }
const assigned = new Map();
for (const [acNo, list] of bySeat) {
  list.sort((a, b) => (b.isBye ? 1 : 0) - (a.isBye ? 1 : 0) || (b.winnerOk ? 1 : 0) - (a.winnerOk ? 1 : 0));
  assigned.set(acNo, list[0]);
  for (const p of list.slice(1)) p.surplus = true;
}
let park = 900;
for (const p of profiles) p.newAc = (p.seat && assigned.get(p.seat.acNo) === p) ? p.seat.acNo : park++;

const covered = new Set([...assigned.keys()]);
const missing = seed.filter((s) => !covered.has(s.acNo));
const unresolved = profiles.filter((p) => !p.seat);
console.log('profiles =', profiles.length, '| official seats covered =', covered.size, '/90');
console.log('unresolved profiles =', unresolved.length, unresolved.map((p) => `${p.cons}(${p.name})`).join(' | ') || '');
console.log('surplus/parked =', profiles.filter((p) => p.newAc >= 900).map((p) => `${p.cons}(${p.name})`).join(' | ') || 'none');
console.log('by-election overrides =', profiles.filter((p) => p.isBye && p.newAc < 900).map((p) => `off#${p.newAc} ${p.seat.name}->${p.name}`).join(' | ') || 'none');
console.log('\nMISSING profile for official seats (' + missing.length + '):', missing.map((s) => `${s.acNo} ${s.name}`).join(', ') || 'none');
const lowconf = profiles.filter((p) => p.newAc < 900 && !p.winnerOk && !p.isBye);
console.log('\nassigned but name != seed winner (' + lowconf.length + ') [review]:');
lowconf.forEach((p) => console.log(`  off#${p.newAc} ${p.seat.name}: '${p.name}' vs seed '${p.seat.winner}' [profile cons='${p.cons}']`));

if (WRITE) {
  const profIdx = profiles.map((p) => p.idx);
  const firstIdx = Math.min(...profIdx);
  const lastIdx = Math.max(...profIdx);
  const header = lines.slice(0, firstIdx);
  const footer = lines.slice(lastIdx + 1);

  const kept = profiles.filter((p) => p.newAc < 900).sort((a, b) => a.newAc - b.newAc);
  const body = kept.map((p) => p.line
    .replace(/acNo:\s*\d+/, `acNo: ${p.newAc}`)
    .replace(/district:\s*'[^']*'/, `district: '${p.seat.district}'`)
    .replace(/constituencyName:\s*'[^']*'/, `constituencyName: '${p.seat.name}'`)
    .replace(/\s*$/, '')
    .replace(/,?$/, ','));

  const headerFixed = header.join('\n')
    .replace(/^.*82 MLAs.*$/m, ' * Jammu & Kashmir MLA Profiles — current members (90-seat assembly, 2024 + 2025 by-elections)')
    .replace(/AUTO-GENERATED from MyNeta\.info J&K 2024 election data\./,
      'Keyed to official AC numbering (1-90) via scripts/rekey-jk-mla.mjs.\n * Source: MyNeta.info J&K 2024 + Nov-2025 by-elections (Budgam, Nagrota).');
  writeFileSync(MLA, headerFixed + '\n' + body.join('\n') + '\n' + footer.join('\n'), 'utf8');
  console.log(`\nWROTE ${MLA} (${kept.length} profiles, ${profiles.length - kept.length} dropped/parked)`);
}
