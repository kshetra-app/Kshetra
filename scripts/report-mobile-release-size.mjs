/**
 * Mobile release artifact reporter for GEO-02.
 *
 * Consumes Expo Metro source maps plus locally-built Android release AAB/APK
 * files. It reports archive bytes separately from uncompressed payload
 * categories; a JS-only number is never presented as installed app size.
 *
 * Usage:
 *   node scripts/report-mobile-release-size.mjs --bundle-dir apps/mobile/dist
 *   node scripts/report-mobile-release-size.mjs --bundle-dir apps/mobile/dist \
 *     --aab apps/mobile/android/app/build/outputs/bundle/release/app-release.aab \
 *     --apk apps/mobile/android/app/build/outputs/apk/release/app-release.apk \
 *     --out reports/geo-02-mobile-release-size
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
function flag(name, fallback = undefined) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}
const bundleDir = flag('--bundle-dir');
const aabPath = flag('--aab');
const apkPath = flag('--apk');
const outDir = resolve(flag('--out', 'reports/geo-02-mobile-release-size'));
const MiB = 1024 * 1024;

if (!bundleDir || !existsSync(resolve(bundleDir))) {
  console.error('Missing --bundle-dir pointing at output from expo export --platform android --dump-sourcemap.');
  process.exit(2);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = join(dir, entry.name);
    return entry.isDirectory() ? walk(p) : [p];
  });
}
function jsonMap(file) {
  try {
    const value = JSON.parse(readFileSync(file, 'utf8'));
    return value && Array.isArray(value.sources) ? value : null;
  } catch {
    return null;
  }
}
function normalizedSource(source) { return source.split(String.fromCharCode(92)).join('/').toLowerCase(); }
function isGeographySource(source) {
  const s = normalizedSource(source);
  return s.includes('/data/seed/') || s.includes('/data/census/') || s.includes('/apps/mobile/data/') || s.endsWith('.geojson')
    || ['statedataadapter.ts','statedataadapter.tsx','statetriviaadapter.ts','statetriviaadapter.tsx','statedatadispatcher.ts','statedatadispatcher.tsx','enrichgeojson.ts','enrichgeojson.tsx'].some((name) => s.endsWith('/' + name));
}
function isForbiddenNationalSeed(source) {
  const s = normalizedSource(source);
  const basename = s.split('/').pop() ?? s;
  const forbiddenBasenames = new Set([
    'statedataadapter.ts', 'statedataadapter.tsx',
    'statetriviaadapter.ts', 'statetriviaadapter.tsx',
    'statedatadispatcher.ts', 'statedatadispatcher.tsx',
    'enrichgeojson.ts', 'enrichgeojson.tsx',
    'hierarchydata.ts', 'hierarchydata.tsx',
    'seedDataLoader.ts'.toLowerCase(), 'representativesdata.ts',
    'delimitationdensity.ts', 'seatcalculator.ts',
  ]);
  return forbiddenBasenames.has(basename)
    || s.includes('/data/seed/')
    || s.includes('/data/census/')
    || basename === 'booth-locations-2017.json'
    || s.endsWith('/apps/mobile/data/geo-manifest.json');
}

const files = walk(resolve(bundleDir));
const sourceMaps = files.filter((file) => file.endsWith('.map') || file.endsWith('.js.map'));
const bundles = files.filter((file) => ['.bundle', '.hbc', '.js'].some((suffix) => file.endsWith(suffix)) && !file.endsWith('.map'));
const sources = new Map();
for (const file of sourceMaps) {
  const map = jsonMap(file);
  if (!map) continue;
  for (let i = 0; i < map.sources.length; i++) {
    const source = String(map.sources[i]);
    const content = Array.isArray(map.sourcesContent) ? map.sourcesContent[i] : null;
    const bytes = typeof content === 'string' ? Buffer.byteLength(content) : null;
    const old = sources.get(source);
    if (!old || (bytes ?? -1) > (old.bytes ?? -1)) sources.set(source, { source, bytes });
  }
}
const graphRows = [...sources.values()].sort((a, b) => (b.bytes ?? -1) - (a.bytes ?? -1));
const geoRows = graphRows.filter((row) => isGeographySource(row.source));
const forbiddenRows = graphRows.filter((row) => isForbiddenNationalSeed(row.source));
const bundleStats = bundles.map((file) => ({ path: relative(resolve(bundleDir), file), bytes: statSync(file).size }));
const geoBundledSourceBytes = geoRows.reduce((n, row) => n + (row.bytes ?? 0), 0);

function zipEntries(file) {
  const listing = execFileSync('unzip', ['-l', file], { encoding: 'utf8', maxBuffer: 20 * MiB });
  const rows = [];
  for (const line of listing.split(String.fromCharCode(10))) {
    const columns = line.trim().split(/\s+/);
    // unzip -l rows are: uncompressed-bytes date time entry-path.
    // Ignore headers/footers by requiring a numeric first column and >= 4 columns.
    if (columns.length >= 4 && columns[0] !== '' && Number.isFinite(Number(columns[0]))) {
      rows.push({ name: columns.slice(3).join(' ').trim(), bytes: Number(columns[0]) });
    }
  }
  return rows;
}
function archiveReport(path, kind) {
  if (!existsSync(path)) throw new Error(`Missing ${kind} release artifact: ${path}`);
  const entries = zipEntries(path);
  const total = (predicate) => entries.filter((e) => predicate(e.name)).reduce((n, e) => n + e.bytes, 0);
  const js = total((name) => name.endsWith('/assets/index.android.bundle') || name === 'assets/index.android.bundle' || name.endsWith('/index.android.bundle') || name === 'index.android.bundle');
  const assets = total((name) => (name.includes('/assets/') || name.startsWith('assets/')) && !name.endsWith('index.android.bundle'));
  const native = total((name) => name.includes('/lib/') && name.endsWith('.so'));
  const dex = total((name) => name.endsWith('.dex') && (name.includes('/classes') || name.startsWith('classes')));
  return {
    kind,
    path: relative(process.cwd(), resolve(path)),
    archiveBytes: statSync(path).size,
    archiveMiB: Number((statSync(path).size / MiB).toFixed(2)),
    uncompressedEntriesBytes: entries.reduce((n, entry) => n + entry.bytes, 0),
    jsBundleBytes: js,
    otherAssetsBytes: assets,
    nativeLibrariesBytes: native,
    dexBytes: dex,
    entryCount: entries.length,
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
  };
}

const release = [];
if (aabPath) release.push(archiveReport(resolve(aabPath), 'AAB'));
if (apkPath) release.push(archiveReport(resolve(apkPath), 'APK'));
if (release.length === 0) {
  throw new Error('At least one of --aab or --apk is required; this report must measure a native release artifact.');
}

const report = {
  generatedAt: new Date().toISOString(),
  note: 'Source-map module byte totals are graph diagnostics, not APK/AAB sizes. Archive sizes are measured from the actual release artifact.',
  metro: {
    bundleFiles: bundleStats,
    sourceMapCount: sourceMaps.length,
    uniqueSourceCount: sources.size,
    geographyAndStateDataSourceCount: geoRows.length,
    geographyAndStateDataSourceBytes: geoBundledSourceBytes,
    forbiddenNationalSeedModuleCount: forbiddenRows.length,
    forbiddenNationalSeedModules: forbiddenRows.map((row) => row.source).sort(),
    largestGeographyAndStateDataSources: geoRows.slice(0, 40),
  },
  releaseArtifacts: release,
};
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'mobile-release-size.json'), JSON.stringify(report, null, 2) + '\n');
const lines = [
  '# Mobile release artifact size report',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  '> Source-map module bytes are graph diagnostics only; archive sizes below are measured directly from release AAB/APK files.',
  '',
  '## Metro dependency graph',
  '',
  `- Source maps: ${sourceMaps.length}`,
  `- Unique module sources: ${sources.size}`,
  `- Geography/state-data module sources: ${geoRows.length}`,
  `- Geography/state-data source bytes where sourceContent is available: ${geoBundledSourceBytes.toLocaleString()}`,
  `- Forbidden national seed/adapters in this Metro graph: ${forbiddenRows.length}`,
  '',
  '| Bundle | Bytes |',
  '|---|---:|',
  ...bundleStats.map((b) => `| ${b.path} | ${b.bytes.toLocaleString()} |`),
  '',
  '### Forbidden national modules detected in the base graph',
  '',
  ...(forbiddenRows.length ? forbiddenRows.map((row) => `- ${row.source}`) : ['- None detected.']),
  '',
  '### Largest geography/state-data modules',
  '',
  '| Module source | Source bytes |',
  '|---|---:|',
  ...geoRows.slice(0, 40).map((r) => `| ${r.source.replace(/\\|/g, '\\|')} | ${r.bytes == null ? 'not present in source map' : r.bytes.toLocaleString()} |`),
  '',
  '## Native release artifacts',
  '',
  '| Artifact | Archive MiB | Archive bytes | JS bundle bytes | Other assets bytes | Native .so bytes | DEX bytes | SHA-256 |',
  '|---|---:|---:|---:|---:|---:|---:|---|',
  ...release.map((r) => `| ${r.kind} | ${r.archiveMiB} | ${r.archiveBytes.toLocaleString()} | ${r.jsBundleBytes.toLocaleString()} | ${r.otherAssetsBytes.toLocaleString()} | ${r.nativeLibrariesBytes.toLocaleString()} | ${r.dexBytes.toLocaleString()} | ${r.sha256} |`),
  '',
];
writeFileSync(join(outDir, 'mobile-release-size.md'), lines.join('\n'));
console.log(lines.join('\n'));
