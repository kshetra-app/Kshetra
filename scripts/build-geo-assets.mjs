#!/usr/bin/env node
/**
 * build-geo-assets.mjs
 * ---------------------------------------------------------------------------
 * Phase 3 (Performance): move constituency boundary GeoJSON off-device.
 *
 * Reads the source GeoJSON in apps/mobile/data/*.json, shrinks each file via
 * coordinate-precision reduction + consecutive-duplicate removal + minified
 * serialisation, and writes the optimised copies to apps/api/public/geo/.
 *
 * It also emits a versioned manifest (content-hash per file) consumed by both
 * the API (cache validation) and the mobile app (cache-busting + remote URL
 * resolution). The national overview (india-states.json / "IN") is flagged
 * `bundled` so the app keeps shipping it for an instant, offline first paint.
 *
 * Pure Node — no external deps. Run with: node scripts/build-geo-assets.mjs
 */

import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_DIR = join(ROOT, 'apps', 'mobile', 'data');
const OUT_DIR = join(ROOT, 'apps', 'api', 'public', 'geo');
const MOBILE_MANIFEST = join(SRC_DIR, 'geo-manifest.json');

/** Coordinate precision: 5 decimals ≈ 1.1 m — ample for constituency borders. */
const PRECISION = 5;

/** state code -> source filename (mirrors apps/mobile/lib/geoLoader.ts loaders). */
const FILES = {
  IN: 'india-states.json',
  TS: 'telangana-assembly.json',
  AP: 'ap-assembly.json',
  KA: 'ka-assembly.json',
  MH: 'mh-assembly.json',
  TN: 'tn-assembly.json',
  KL: 'kl-assembly.json',
  WB: 'wb-assembly.json',
  UP: 'up-assembly.json',
  RJ: 'rj-assembly.json',
  GJ: 'gj-assembly.json',
  DL: 'dl-assembly.json',
  OD: 'od-assembly.json',
  JH: 'jh-assembly.json',
  BR: 'br-assembly.json',
  PB: 'pb-assembly.json',
  HR: 'hr-assembly.json',
  CG: 'cg-assembly.json',
  MP: 'mp-assembly.json',
  AS: 'as-assembly.json',
  GA: 'ga-assembly.json',
  HP: 'hp-assembly.json',
  JK: 'jk-assembly.json',
  PY: 'py-assembly.json',
  TR: 'tr-assembly.json',
  ML: 'ml-assembly.json',
  MN: 'mn-assembly.json',
  NL: 'nl-assembly.json',
  UK: 'uk-assembly.json',
  SK: 'sk-assembly.json',
  AR: 'ar-assembly.json',
  MZ: 'mz-assembly.json',
};

/** States kept inside the JS bundle (small, default landing, offline-safe). */
const BUNDLED = new Set(['IN']);

const round = (n) => {
  const f = 10 ** PRECISION;
  return Math.round(n * f) / f;
};

/** Reduce precision + drop consecutive duplicate positions in a linear ring. */
function shrinkRing(ring) {
  const out = [];
  let prevX, prevY;
  for (const pos of ring) {
    const x = round(pos[0]);
    const y = round(pos[1]);
    if (x === prevX && y === prevY) continue;
    out.push(pos.length > 2 ? [x, y, ...pos.slice(2)] : [x, y]);
    prevX = x;
    prevY = y;
  }
  return out;
}

function shrinkGeometry(geom) {
  if (!geom) return geom;
  if (geom.type === 'Polygon') {
    return { ...geom, coordinates: geom.coordinates.map(shrinkRing) };
  }
  if (geom.type === 'MultiPolygon') {
    return { ...geom, coordinates: geom.coordinates.map((poly) => poly.map(shrinkRing)) };
  }
  if (geom.type === 'GeometryCollection') {
    return { ...geom, geometries: geom.geometries.map(shrinkGeometry) };
  }
  return geom;
}

function shrinkCollection(fc) {
  return {
    ...fc,
    features: (fc.features ?? []).map((f) => ({
      ...f,
      geometry: shrinkGeometry(f.geometry),
    })),
  };
}

function countPositions(fc) {
  let n = 0;
  for (const f of fc.features ?? []) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') for (const r of g.coordinates) n += r.length;
    else if (g.type === 'MultiPolygon') for (const p of g.coordinates) for (const r of p) n += r.length;
  }
  return n;
}

function main() {
  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const prevManifest = existsSync(MOBILE_MANIFEST)
    ? JSON.parse(readFileSync(MOBILE_MANIFEST, 'utf8'))
    : {};

  const manifest = {};
  let srcTotal = 0;
  let outTotal = 0;
  let gzTotal = 0;

  for (const [code, file] of Object.entries(FILES)) {
    const srcPath = join(SRC_DIR, file);
    if (!existsSync(srcPath)) {
      console.warn(`  ! skip ${code} — source not found: ${file}`);
      continue;
    }

    const srcRaw = readFileSync(srcPath);
    srcTotal += srcRaw.length;

    let shrunk;
    try {
      const before = countPositions(JSON.parse(srcRaw.toString('utf8')));
      const fc = JSON.parse(srcRaw.toString('utf8'));
      shrunk = shrinkCollection(fc);
      const after = countPositions(shrunk);
      const out = Buffer.from(JSON.stringify(shrunk));
      const gz = gzipSync(out, { level: 9 });
      const version = createHash('sha1').update(out).digest('hex').slice(0, 12);

      writeFileSync(join(OUT_DIR, file), out);
      writeFileSync(join(OUT_DIR, `${file}.gz`), gz);
      outTotal += out.length;
      gzTotal += gz.length;

      const prev = prevManifest[code] ?? {};
      manifest[code] = {
        file,
        count: prev.count ?? (shrunk.features?.length ?? 0),
        hasPolygons: prev.hasPolygons ?? (after > 0),
        ...(prev.status ? { status: prev.status } : {}),
        bytes: out.length,
        gzipBytes: gz.length,
        version,
        ...(BUNDLED.has(code) ? { bundled: true } : {}),
      };

      const pct = ((1 - gz.length / srcRaw.length) * 100).toFixed(0);
      console.log(
        `  ${code.padEnd(3)} ${file.padEnd(26)} ${(srcRaw.length / 1024).toFixed(0).padStart(6)}KB -> gz ${(gz.length / 1024).toFixed(0).padStart(5)}KB  (-${pct}%, pts ${before}->${after})`,
      );
    } catch (err) {
      console.error(`  x FAILED ${code} (${file}):`, err.message);
    }
  }

  // Manifest copies: mobile (bundled, tiny) + API (served alongside tiles).
  const manifestJson = JSON.stringify(manifest, null, 2);
  writeFileSync(MOBILE_MANIFEST, manifestJson);
  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest));

  console.log('\n  ---------------------------------------------');
  console.log(`  source total : ${(srcTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  output total : ${(outTotal / 1024 / 1024).toFixed(2)} MB (plain)`);
  console.log(`  gzip total   : ${(gzTotal / 1024 / 1024).toFixed(2)} MB (over the wire)`);
  console.log(`  wire saving  : ${((1 - gzTotal / srcTotal) * 100).toFixed(1)}%`);
  console.log(`  states       : ${Object.keys(manifest).length}`);
  console.log(`  out dir      : ${OUT_DIR}`);
}

main();
