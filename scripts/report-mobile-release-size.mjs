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
import { basename, join, relative, resolve } from 'node:path';
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
function isGeographySource(source) {
  const s = source.replace(/\\/g, '/').toLowerCase();
  return /(^|\/)(data\/seed\/|apps\/mobile\/data\/|\.geojson$)/.test(s)
    || /(^|\/)(stateDataAdapter|stateTriviaAdapter|stateDataDispatcher|enrichGeoJSON)\\.tsx?$/.test(s);
}

const files = walk(resolve(bundleDir));
const sourceMaps = files.filter((file) => file.endsWith('.map'));
const bundles = files.filter((file) => file.endsWith('.bundle') || file.endsWith('.hbc'));
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
const bundleStats = bundles.map((file) => ({ path: relative(resolve(bundleDir), file), bytes: statSync(file).size }));
const geoBundledSourceBytes = geoRows.reduce((n, row) => n + (row.bytes ?? 0), 0);

function zipEntries(file) {
  const listing = execFileSync('unzip', ['-l', file], { encoding: 'utf8', maxBuffer: 20 * MiB });
  const rows = [];
  for (const line of listing.split(/\\r?\\n/)) {
    const match = line.match(/^\\s*(\\d+)\\s+\\S+\\s+\\S+\\s+(.+)$/);
    if (match) rows.push({ name: match[2].trim(), bytes: Number(match[1]) });
  }
  return rows;
}
function archiveReport(path, kind) {
  if (!existsSync(path)) throw new Error(`Missing ${kind} release artifact: ${path}`);
  const entries = zipEntries(path);
  const total = (predicate) => entries.filter((e) => predicate(e.name)).reduce((n, e) => n + e.bytes, 0);
  const js = total((name) => /(^|\\/)assets\\/index\\.android\\.bundle$/.test(name) || /(^|\\/)index\\.android\\.bundle$/.test(name));
  const assets = total((name) => /(^|\\/)assets\\//.test(name) && !/index\\.android\\.bundle$/.test(name));
  const native = total((name) => /(^|\\/)lib\\/[^/]+\\/[^/]+\\.so$/.test(name));
  const dex = total((name) => /(^|\\/)classes(?:[0-9]+)?\\.dex$/.test(name));
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
  '',
  '| Bundle | Bytes |',
  '|---|---:|',
  ...bundleStats.map((b) => `| ${b.path} | ${b.bytes.toLocaleString()} |`),
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
