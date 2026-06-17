/**
 * Generic re-key of a state's dependent seed files (MLA profiles, political
 * timeline, trivia) from the OLD alphabetical acNo numbering to the NEW official
 * ECI acNo numbering established by the rebuilt <seedBase>-constituencies.ts.
 *
 * MLA + timeline are re-keyed by constituencyName (ground-truth identity); trivia
 * constituency-contexts are translated via oldAcNo -> name -> newAcNo.
 *
 *   node scripts/rekey-state.mjs <CODE> <seedBase>            # dry run
 *   node scripts/rekey-state.mjs <CODE> <seedBase> --write    # rewrite files
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CODE = process.argv[2];
const BASE = process.argv[3];
const WRITE = process.argv.includes('--write');
if (!CODE || !BASE) { console.error('usage: <CODE> <seedBase> [--write]'); process.exit(1); }
const D = 'C:/K/data/seed/';
const norm = (s) => String(s).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');

// per-state spelling aliases: oldName(norm) -> newName(norm)
const ALIASES = {
  TR: { chawmanu: 'chhawmanu', kakrabanshalgara: 'kakrabansalgarah', kalyanpurpramodnagar: 'kalyanpurpramodenagar', karamchara: 'karamchhara', pabiachara: 'pabiachhara', pecharthal: 'pencharthal', radhakishorpur: 'radhakishorepur', townbardowali: 'townbordowali' },
  ML: { tikrikilla: 'tikrikila' },
  MN: { bishenpur: 'bishnupur', keisamthong: 'keishamthong', khetrigao: 'kshetrigao', naoriapakhanglakpa: 'naoriyapakhanglakpa', sugnoo: 'sugnu', khangabo: 'khangabok' },
  NL: {},
  UK: { dehraduncantonment: 'dehraduncantt', devprayag: 'deoprayag', haridwar: 'hardwar', haridwarrural: 'hardwarrural', karanprayag: 'karnprayag', lalkuan: 'lalkuwa' },
  PY: {},
};
const ALIAS = ALIASES[CODE] || {};

const parseSeed = (txt) => [...txt.matchAll(/acNo: (\d+), name: '([^']+)'/g)].map(([, ac, name]) => ({ acNo: +ac, name }));
const parseNewSeed = (txt) => [...txt.matchAll(/acNo: (\d+), name: '([^']+)',(?:[^\n]*?)district: '([^']*)', type: '([^']*)',[^\n]*?winnerName\d+: '([^']*)'[^\n]*?currentParty: '([^']*)'/g)]
  .map(([, ac, name, dist, type, winner, party]) => ({ acNo: +ac, name, dist, type, winner, party }));

const oldSeed = parseSeed(execSync(`git -C C:/K show HEAD:data/seed/${BASE}-constituencies.ts`, { encoding: 'utf8', maxBuffer: 1 << 24 }));
const newSeedTxt = readFileSync(`${D}${BASE}-constituencies.ts`, 'utf8');
const newSeed = parseSeed(newSeedTxt);
const newRich = new Map(parseNewSeed(newSeedTxt).map((s) => [s.acNo, s]));

const newByName = new Map(newSeed.map((s) => [norm(s.name), s.acNo]));
const resolveName = (name) => { const n = norm(name); return newByName.get(n) ?? newByName.get(ALIAS[n]) ?? null; };

const old2new = new Map(); const unresolvedOld = [];
for (const o of oldSeed) { const na = resolveName(o.name); if (na) old2new.set(o.acNo, na); else unresolvedOld.push(o.name); }
console.log(`\n[${CODE}] old seats ${oldSeed.length} | new seats ${newSeed.length} | old->new ${old2new.size} | unresolved old: ${unresolvedOld.join(', ') || 'none'}`);

function rekeyByName(path, label) {
  if (!existsSync(path)) { console.log(`[${label}] (file missing)`); return { txt: '', miss: [], skip: true }; }
  let txt = readFileSync(path, 'utf8'); const miss = []; let count = 0;
  txt = txt.replace(/acNo: (\d+),((?:(?!acNo:)[\s\S])*?constituencyName: ')([^']*)(')/g, (m, ac, mid, cname, tail) => {
    const clean = cname.replace(/\s*:?\s*Bye[- ]?Election.*$/i, '').trim();
    const na = resolveName(clean);
    if (na == null) { miss.push(cname); return m; }
    count++; return `acNo: ${na},${mid}${clean}${tail}`;
  });
  console.log(`[${label}] re-keyed ${count} | unmatched ${miss.length}: ${miss.join(', ') || 'none'}`);
  return { txt, miss };
}

function translateAcNo(path, label) {
  if (!existsSync(path)) { console.log(`[${label}] (file missing)`); return { txt: '', miss: [], skip: true }; }
  let txt = readFileSync(path, 'utf8'); let count = 0; const miss = [];
  txt = txt.replace(/("?acNo"?:\s*)(\d+)/g, (m, pre, ac) => { const na = old2new.get(+ac); if (na == null) { miss.push(+ac); return m; } count++; return `${pre}${na}`; });
  console.log(`[${label}] translated ${count} | unmapped ${miss.length}: ${miss.join(',') || 'none'}`);
  return { txt, miss };
}

function rekeyMLA(path) {
  if (!existsSync(path)) { console.log('[MLA] (file missing)'); return { txt: '', miss: [], skip: true }; }
  const txt = readFileSync(path, 'utf8');
  const headEnd = txt.indexOf('= [') + 3, footStart = txt.lastIndexOf('];');
  const head = txt.slice(0, headEnd), foot = txt.slice(footStart), body = txt.slice(headEnd, footStart);
  const blocks = [...body.matchAll(/\{[^{}]+\}/g)].map((m) => m[0]);
  const miss = []; const byAc = new Map();
  for (const b of blocks) {
    const cn = (b.match(/constituencyName: '([^']*)'/) || [])[1];
    if (cn == null) { miss.push('(no constituencyName)'); continue; }
    const bypoll = /Bye[- ]?Election/i.test(cn);
    const clean = cn.replace(/\s*:?\s*Bye[- ]?Election.*$/i, '').trim();
    const na = resolveName(clean);
    if (na == null) { miss.push(cn); continue; }
    const rich = newRich.get(na);
    let nb = b.replace(/acNo: \d+,/, `acNo: ${na},`).replace(/constituencyName: '[^']*'/, `constituencyName: '${clean.replace(/'/g, "\\'")}'`);
    if (rich) nb = nb.replace(/district: '[^']*'/, `district: '${(rich.dist || '').replace(/'/g, "\\'")}'`);
    const prev = byAc.get(na);
    if (!prev || (bypoll && !prev.bypoll)) byAc.set(na, { block: nb, bypoll });
  }
  const filled = [];
  for (const s of newSeed) {
    if (byAc.has(s.acNo)) continue;
    const r = newRich.get(s.acNo); filled.push(s.acNo);
    byAc.set(s.acNo, { block: `{
    acNo: ${s.acNo},
    name: '${(r?.winner || '').replace(/'/g, "\\'")}',
    party: '${r?.party || ''}',
    gender: 'M',
    terms: 1,
    constituencyName: '${s.name.replace(/'/g, "\\'")}',
    district: '${(r?.dist || '').replace(/'/g, "\\'")}',
  }`, bypoll: false });
  }
  const ordered = [...byAc.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => '  ' + v.block.trim());
  const out = head + '\n' + ordered.join(',\n') + ',\n' + foot;
  const acs = [...byAc.keys()].sort((a, b) => a - b);
  const dup = acs.filter((a, i) => acs.indexOf(a) !== i);
  console.log(`[MLA] profiles ${byAc.size} | unmatched ${miss.length}: ${miss.join(', ') || 'none'} | filled ${filled.length}: ${filled.join(',') || 'none'} | dup ${dup.join(',') || 'none'}`);
  return { txt: out, miss, filled };
}

const mla = rekeyMLA(`${D}${BASE}-mla-profiles.ts`);
const tl = rekeyByName(`${D}${BASE}-political-timeline.ts`, 'timeline');
const tv = translateAcNo(`${D}${BASE}-trivia.ts`, 'trivia');

if (WRITE) {
  const blockers = [mla, tl, tv].filter((x) => !x.skip && x.miss && x.miss.length);
  if (blockers.length) { console.log('\nNOT WRITING — unmatched names/acNos remain (add aliases).'); }
  else {
    if (!mla.skip) writeFileSync(`${D}${BASE}-mla-profiles.ts`, mla.txt, 'utf8');
    if (!tl.skip) writeFileSync(`${D}${BASE}-political-timeline.ts`, tl.txt, 'utf8');
    if (!tv.skip) writeFileSync(`${D}${BASE}-trivia.ts`, tv.txt, 'utf8');
    console.log('\nWROTE re-keyed files for', CODE);
  }
}
