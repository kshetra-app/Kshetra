/**
 * Re-key Tripura dependent seed files (MLA profiles, political timeline, trivia)
 * from the OLD alphabetical acNo numbering to the NEW official ECI acNo numbering
 * established in the rebuilt tripura-constituencies.ts.
 *
 * MLA + timeline are re-keyed by constituencyName (ground truth identity).
 * Trivia constituency-contexts are translated via oldAcNo -> name -> newAcNo.
 *
 *   node scripts/rekey-tripura.mjs            # dry run (report only)
 *   node scripts/rekey-tripura.mjs --write    # rewrite the files
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const WRITE = process.argv.includes('--write');
const D = 'C:/K/data/seed/';
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// spelling aliases: oldName(norm) -> newName(norm)
const ALIAS = {
  chawmanu: 'chhawmanu',
  kakrabanshalgara: 'kakrabansalgarah',
  kalyanpurpramodnagar: 'kalyanpurpramodenagar',
  karamchara: 'karamchhara',
  pabiachara: 'pabiachhara',
  pecharthal: 'pencharthal',
  radhakishorpur: 'radhakishorepur',
  townbardowali: 'townbordowali',
};

const parseSeed = (txt) => {
  const m = [...txt.matchAll(/acNo: (\d+), name: '([^']+)'/g)];
  return m.map(([, ac, name]) => ({ acNo: +ac, name }));
};
// Rich parse of the NEW seed (acNo, name, district, type, currentParty, winnerName).
const parseNewSeed = (txt) => [...txt.matchAll(/acNo: (\d+), name: '([^']+)',(?:[^\n]*?)district: '([^']*)', type: '([^']*)',[^\n]*?winnerName\d+: '([^']*)'[^\n]*?currentParty: '([^']*)'/g)]
  .map(([, ac, name, dist, type, winner, party]) => ({ acNo: +ac, name, dist, type, winner, party }));
const oldSeed = parseSeed(execSync('git -C C:/K show HEAD:data/seed/tripura-constituencies.ts', { encoding: 'utf8', maxBuffer: 1 << 24 }));
const newSeedTxt = readFileSync(D + 'tripura-constituencies.ts', 'utf8');
const newSeed = parseSeed(newSeedTxt);
const newRich = new Map(parseNewSeed(newSeedTxt).map((s) => [s.acNo, s]));

const newByName = new Map(newSeed.map((s) => [norm(s.name), s.acNo]));
const resolveName = (name) => {
  const n = norm(name);
  return newByName.get(n) ?? newByName.get(ALIAS[n]) ?? null;
};

// old acNo -> new acNo (via name)
const old2new = new Map();
const unresolvedOld = [];
for (const o of oldSeed) {
  const na = resolveName(o.name);
  if (na) old2new.set(o.acNo, na); else unresolvedOld.push(o.name);
}

console.log('old seats', oldSeed.length, '| new seats', newSeed.length);
console.log('old->new resolved', old2new.size, '| unresolved old names', unresolvedOld.length, unresolvedOld.join(', ') || '');

// ── Re-key a file's objects by constituencyName (acNo precedes constituencyName) ──
function rekeyByName(path, label) {
  let txt = readFileSync(path, 'utf8');
  const miss = [];
  let count = 0;
  txt = txt.replace(
    /acNo: (\d+),((?:(?!acNo:)[\s\S])*?constituencyName: ')([^']*)(')/g,
    (m, ac, mid, cname, tail) => {
      const clean = cname.replace(/\s*:?\s*Bye[- ]?Election.*$/i, '').trim();
      const na = resolveName(clean);
      if (na == null) { miss.push(cname); return m; }
      count++;
      return `acNo: ${na},${mid}${clean}${tail}`;
    }
  );
  console.log(`\n[${label}] re-keyed ${count} entries | unmatched names: ${miss.length}`, miss.join(', ') || '');
  return { txt, miss };
}

// ── Translate bare acNo (trivia contexts) via old2new ──
function translateAcNo(path, label) {
  let txt = readFileSync(path, 'utf8');
  let count = 0; const miss = [];
  txt = txt.replace(/("?acNo"?:\s*)(\d+)/g, (m, pre, ac) => {
    const na = old2new.get(+ac);
    if (na == null) { miss.push(+ac); return m; }
    count++;
    return `${pre}${na}`;
  });
  console.log(`\n[${label}] translated ${count} acNo refs | unmapped: ${miss.length}`, miss.join(',') || '');
  return { txt, miss };
}

// ── MLA profiles: block-based re-key + dedup (keep by-poll) + fill missing ──
function rekeyMLA(path) {
  const txt = readFileSync(path, 'utf8');
  const headEnd = txt.indexOf('= [') + 3;
  const footStart = txt.lastIndexOf('];');
  const head = txt.slice(0, headEnd);
  const foot = txt.slice(footStart);
  const body = txt.slice(headEnd, footStart);
  const blocks = [...body.matchAll(/\{[^{}]+\}/g)].map((m) => m[0]);
  const miss = [];
  const byAc = new Map(); // newAcNo -> { block, bypoll }
  for (const b of blocks) {
    const cn = (b.match(/constituencyName: '([^']*)'/) || [])[1];
    if (cn == null) { miss.push('(no constituencyName)'); continue; }
    const bypoll = /Bye[- ]?Election/i.test(cn);
    const clean = cn.replace(/\s*:?\s*Bye[- ]?Election.*$/i, '').trim();
    const na = resolveName(clean);
    if (na == null) { miss.push(cn); continue; }
    const rich = newRich.get(na);
    let nb = b.replace(/acNo: \d+,/, `acNo: ${na},`)
             .replace(/constituencyName: '[^']*'/, `constituencyName: '${clean}'`);
    if (rich) nb = nb.replace(/district: '[^']*'/, `district: '${rich.dist}'`);
    const prev = byAc.get(na);
    if (!prev || (bypoll && !prev.bypoll)) byAc.set(na, { block: nb, bypoll });
  }
  // fill missing seats with identity-only profiles (no fabricated affidavit fields)
  const filled = [];
  for (const s of newSeed) {
    if (byAc.has(s.acNo)) continue;
    const r = newRich.get(s.acNo);
    filled.push(s.acNo);
    byAc.set(s.acNo, { block: `{
    acNo: ${s.acNo},
    name: '${(r?.winner || '').replace(/'/g, "\\'")}',
    party: '${r?.party || ''}',
    gender: 'M',
    terms: 1,
    constituencyName: '${s.name.replace(/'/g, "\\'")}',
    district: '${r?.dist || ''}',
  }`, bypoll: false });
  }
  const ordered = [...byAc.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => '  ' + v.block.trim());
  const out = head + '\n' + ordered.join(',\n') + ',\n' + foot;
  console.log('\n[MLA] profiles after re-key', byAc.size, '| unmatched', miss.length, miss.join(', ') || '', '| identity-filled seats', filled.join(',') || 'none');
  return { txt: out, miss, filled };
}

const mla = rekeyMLA(D + 'tripura-mla-profiles.ts');
const tl = rekeyByName(D + 'tripura-political-timeline.ts', 'timeline');
const tv = translateAcNo(D + 'tripura-trivia.ts', 'trivia');

if (WRITE) {
  if (mla.miss.length || tl.miss.length || tv.miss.length) {
    console.log('\nNOT WRITING — resolve unmatched names/acNos first (add to ALIAS).');
  } else {
    writeFileSync(D + 'tripura-mla-profiles.ts', mla.txt, 'utf8');
    writeFileSync(D + 'tripura-political-timeline.ts', tl.txt, 'utf8');
    writeFileSync(D + 'tripura-trivia.ts', tv.txt, 'utf8');
    console.log('\nWROTE re-keyed MLA, timeline, trivia.');
  }
}
