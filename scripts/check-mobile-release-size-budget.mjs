#!/usr/bin/env node
/** GEO-02 fail-closed gate against Metro source maps and Android release archives. */
import { existsSync, readFileSync, writeFileSync, resolve, dirname } from 'node:fs';
const args = process.argv.slice(2);
function flag(name, fallback) { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; }
const reportPath = flag('--report', 'reports/geo-02-mobile-release-size/mobile-release-size.json');
const maxAabMiB = Number(process.env.MAX_ANDROID_AAB_MIB ?? '80');
const maxApkMiB = Number(process.env.MAX_ANDROID_APK_MIB ?? '90');
const maxGeoSourceBytes = Number(process.env.MAX_GEOGRAPHY_SOURCE_BYTES ?? String(5 * 1024 * 1024));
const MiB = 1024 * 1024;
if (!existsSync(reportPath)) { console.error('GEO-02: release report missing: ' + reportPath); process.exit(2); }
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const errors = [];
const metro = report.metro ?? {};
if (metro.sourceMapCount < 1 || metro.uniqueSourceCount < 1) errors.push('Metro source-map graph is missing.');
if (metro.geographyAndStateDataSourceBytes > maxGeoSourceBytes) errors.push('Geography/state data sources exceed byte budget: ' + metro.geographyAndStateDataSourceBytes + ' > ' + maxGeoSourceBytes);
const artifacts = report.releaseArtifacts ?? [];
const aab = artifacts.find((artifact) => artifact.kind === 'AAB');
const apk = artifacts.find((artifact) => artifact.kind === 'APK');
if (!aab) errors.push('Release AAB report is missing.');
if (!apk) errors.push('Release APK report is missing.');
if (aab && aab.archiveBytes > maxAabMiB * MiB) errors.push('AAB ' + aab.archiveMiB + ' MiB exceeds ' + maxAabMiB + ' MiB budget.');
if (apk && apk.archiveBytes > maxApkMiB * MiB) errors.push('APK ' + apk.archiveMiB + ' MiB exceeds ' + maxApkMiB + ' MiB budget.');
const result = { status: errors.length ? 'FAIL' : 'PASS', limits: { maxAabMiB, maxApkMiB, maxGeographySourceBytes: maxGeoSourceBytes }, errors };
const outputPath = resolve(dirname(resolve(reportPath)), 'geo-02-budget-gate.json');
writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
