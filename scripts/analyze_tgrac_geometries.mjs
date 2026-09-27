import fs from 'node:fs';
import path from 'node:path';

// Telangana approximate geographic bounding box:
// Longitude: ~77.0° E to ~81.5° E
// Latitude: ~15.8° N to ~19.95° N
const TELANGANA_BBOX = {
  minLon: 77.0,
  maxLon: 81.5,
  minLat: 15.8,
  maxLat: 19.95
};

function analyzeGeometries() {
  const filePath = 'data/geo/candidate_authoritative/tgrac_mandals_raw.json';
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  console.log('Total features:', data.features.length);

  let nullGeomCount = 0;
  let emptyGeomCount = 0;
  let nanInfCount = 0;
  let outOfBoundsCount = 0;
  let singleRingCount = 0;
  let multiRingCount = 0;
  let zeroAreaCount = 0;

  let overallBbox = {
    minLon: Infinity,
    minLat: Infinity,
    maxLon: -Infinity,
    maxLat: -Infinity
  };

  const featureSummaries = [];
  const geometryHashes = new Map();
  let duplicateGeomCount = 0;

  for (let i = 0; i < data.features.length; i++) {
    const f = data.features[i];
    const fid = f.attributes.FID;
    const name = f.attributes.mandal_nam;
    const district = f.attributes.dist_name;
    const geom = f.geometry;

    if (!geom || !geom.rings) {
      nullGeomCount++;
      featureSummaries.push({ fid, name, district, valid: false, error: 'NULL_GEOMETRY' });
      continue;
    }

    const rings = geom.rings;
    if (rings.length === 0) {
      emptyGeomCount++;
      featureSummaries.push({ fid, name, district, valid: false, error: 'EMPTY_RINGS' });
      continue;
    }

    if (rings.length === 1) {
      singleRingCount++;
    } else {
      multiRingCount++;
    }

    let featMinLon = Infinity;
    let featMinLat = Infinity;
    let featMaxLon = -Infinity;
    let featMaxLat = -Infinity;

    let hasNanInf = false;
    let totalPoints = 0;
    let approxArea = 0; // Shoelace formula for outer rings

    // Check closed rings and coordinates
    let ringErrors = [];
    for (let rIdx = 0; rIdx < rings.length; rIdx++) {
      const ring = rings[rIdx];
      if (ring.length < 4) {
        ringErrors.push(`Ring ${rIdx} has < 4 points (${ring.length})`);
      }
      // Check ring closure
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ringErrors.push(`Ring ${rIdx} is not closed: first=(${first}) last=(${last})`);
      }

      // Shoelace area
      let ringArea = 0;
      for (let pIdx = 0; pIdx < ring.length - 1; pIdx++) {
        const p1 = ring[pIdx];
        const p2 = ring[pIdx + 1];

        if (isNaN(p1[0]) || isNaN(p1[1]) || !isFinite(p1[0]) || !isFinite(p1[1])) {
          hasNanInf = true;
        }

        const lon = p1[0];
        const lat = p1[1];

        if (lon < featMinLon) featMinLon = lon;
        if (lon > featMaxLon) featMaxLon = lon;
        if (lat < featMinLat) featMinLat = lat;
        if (lat > featMaxLat) featMaxLat = lat;

        ringArea += (p1[0] * p2[1]) - (p2[0] * p1[1]);
        totalPoints++;
      }
      approxArea += Math.abs(ringArea) / 2;
    }

    if (hasNanInf) {
      nanInfCount++;
    }

    if (approxArea === 0) {
      zeroAreaCount++;
    }

    // Check bounds
    const outOfBounds = (
      featMinLon < TELANGANA_BBOX.minLon ||
      featMaxLon > TELANGANA_BBOX.maxLon ||
      featMinLat < TELANGANA_BBOX.minLat ||
      featMaxLat > TELANGANA_BBOX.maxLat
    );

    if (outOfBounds) {
      outOfBoundsCount++;
    }

    if (featMinLon < overallBbox.minLon) overallBbox.minLon = featMinLon;
    if (featMaxLon > overallBbox.maxLon) overallBbox.maxLon = featMaxLon;
    if (featMinLat < overallBbox.minLat) overallBbox.minLat = featMinLat;
    if (featMaxLat > overallBbox.maxLat) overallBbox.maxLat = featMaxLat;

    // Check geometry duplicate hash
    const geomStr = JSON.stringify(rings);
    if (geometryHashes.has(geomStr)) {
      duplicateGeomCount++;
      console.warn(`Duplicate geometry detected between FID ${fid} and FID ${geometryHashes.get(geomStr)}`);
    } else {
      geometryHashes.set(geomStr, fid);
    }

    featureSummaries.push({
      fid,
      name,
      district,
      ringsCount: rings.length,
      totalPoints,
      approxPlanarAreaSqDeg: approxArea,
      bbox: [featMinLon, featMinLat, featMaxLon, featMaxLat],
      outOfBounds,
      ringErrors
    });
  }

  console.log('\n--- GEOMETRY AUDIT RESULTS ---');
  console.log('Null geometries:', nullGeomCount);
  console.log('Empty geometries:', emptyGeomCount);
  console.log('NaN / Infinity coordinates:', nanInfCount);
  console.log('Zero area geometries:', zeroAreaCount);
  console.log('Duplicate geometries:', duplicateGeomCount);
  console.log('Single-ring features:', singleRingCount);
  console.log('Multi-ring features (islands/multipolygons/holes):', multiRingCount);
  console.log('Out of Telangana bounds:', outOfBoundsCount);
  console.log('Overall bounding box [minLon, minLat, maxLon, maxLat]:', [
    overallBbox.minLon.toFixed(4),
    overallBbox.minLat.toFixed(4),
    overallBbox.maxLon.toFixed(4),
    overallBbox.maxLat.toFixed(4)
  ]);

  const featuresWithRingErrors = featureSummaries.filter(f => f.ringErrors.length > 0);
  console.log('Features with unclosed or defective rings:', featuresWithRingErrors.length);

  return {
    totalFeatures: data.features.length,
    nullGeomCount,
    emptyGeomCount,
    nanInfCount,
    zeroAreaCount,
    duplicateGeomCount,
    singleRingCount,
    multiRingCount,
    outOfBoundsCount,
    overallBbox,
    featuresWithRingErrors
  };
}

analyzeGeometries();
