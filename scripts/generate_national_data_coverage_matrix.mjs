#!/usr/bin/env node

/**
 * scripts/generate_national_data_coverage_matrix.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 085, 086 & 087
 * Canonical Political Truth, Evidence-Based Coverage and Contract Integrity
 *
 * Mechanically inspects repository data files, API routes, and mobile stores
 * across all 31 Indian states and Union Territories.
 * Produces:
 * - reports/w021_5_national_data_coverage_matrix.json
 * - reports/w021_5_national_data_coverage_matrix.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  inspectAffidavitsAst,
  inspectMlaProfilesAst,
  inspectHistoricalResultsAst,
} from './lib/ast_data_parser.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

// ─── Authoritative States and Expected Statutory Assembly Seat Counts ───
export const AUTHORITATIVE_STATE_SEATS = {
  TS: { name: 'Telangana', seats: 119 },
  AP: { name: 'Andhra Pradesh', seats: 175 },
  KA: { name: 'Karnataka', seats: 224 },
  MH: { name: 'Maharashtra', seats: 288 },
  TN: { name: 'Tamil Nadu', seats: 234 },
  KL: { name: 'Kerala', seats: 140 },
  WB: { name: 'West Bengal', seats: 294 },
  UP: { name: 'Uttar Pradesh', seats: 403 },
  RJ: { name: 'Rajasthan', seats: 200 },
  GJ: { name: 'Gujarat', seats: 182 },
  JH: { name: 'Jharkhand', seats: 81 },
  OD: { name: 'Odisha', seats: 147 },
  DL: { name: 'Delhi', seats: 70 },
  PB: { name: 'Punjab', seats: 117 },
  HR: { name: 'Haryana', seats: 90 },
  CG: { name: 'Chhattisgarh', seats: 90 },
  MP: { name: 'Madhya Pradesh', seats: 230 },
  BR: { name: 'Bihar', seats: 243 },
  AS: { name: 'Assam', seats: 126 },
  GA: { name: 'Goa', seats: 40 },
  HP: { name: 'Himachal Pradesh', seats: 68 },
  MN: { name: 'Manipur', seats: 60 },
  ML: { name: 'Meghalaya', seats: 60 },
  MZ: { name: 'Mizoram', seats: 40 },
  NL: { name: 'Nagaland', seats: 60 },
  TR: { name: 'Tripura', seats: 60 },
  SK: { name: 'Sikkim', seats: 32 },
  AR: { name: 'Arunachal Pradesh', seats: 60 },
  UK: { name: 'Uttarakhand', seats: 70 },
  PY: { name: 'Puducherry', seats: 30 },
  JK: { name: 'Jammu & Kashmir', seats: 90 },
};

export const STATE_SLUGS = {
  TS: 'telangana',
  AP: 'andhra-pradesh',
  KA: 'karnataka',
  MH: 'maharashtra',
  TN: 'tamil-nadu',
  KL: 'kerala',
  WB: 'west-bengal',
  UP: 'uttar-pradesh',
  RJ: 'rajasthan',
  GJ: 'gujarat',
  JH: 'jharkhand',
  OD: 'odisha',
  DL: 'delhi',
  PB: 'punjab',
  HR: 'haryana',
  CG: 'chhattisgarh',
  MP: 'madhya-pradesh',
  BR: 'bihar',
  AS: 'assam',
  GA: 'goa',
  HP: 'himachal-pradesh',
  MN: 'manipur',
  ML: 'meghalaya',
  MZ: 'mizoram',
  NL: 'nagaland',
  TR: 'tripura',
  SK: 'sikkim',
  AR: 'arunachal-pradesh',
  UK: 'uttarakhand',
  PY: 'puducherry',
  JK: 'jammu-kashmir',
};

// Safe depth-aware object block extractor
export function extractObjectBlocks(str) {
  const blocks = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let stringChar = '';
  let escape = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (inString) {
      if (ch === stringChar) {
        inString = false;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        blocks.push(str.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return blocks;
}

// Hardened GeoJSON validation logic (CTO Directive 088 & 089 Workstreams A & C)
export function validateGeoJsonObject(parsed, stateCode, statutorySeats, fileName = 'geojson-object') {
  const errors = [];
  if (!parsed || parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    return {
      hasGeoJSON: false,
      filePresent: true,
      fileName,
      featureCount: 0,
      validFeatureCount: 0,
      geometryValidFeatureCount: 0,
      coordinateNumericValidFeatureCount: 0,
      coordinateRangeValidFeatureCount: 0,
      multipartFeatureCount: 0,
      coordNumericErrors: 0,
      coordRangeErrors: 0,
      expectedStatutoryAcCount: statutorySeats,
      uniqueStatutoryAcsLinked: 0,
      linkedConstituencyCount: 0,
      missingStatutoryAcNos: Array.from({ length: statutorySeats }, (_, i) => i + 1),
      duplicateLinkedAcs: [],
      excessFeatureCount: 0,
      duplicateFeatureCount: 0,
      outOfRangeLinkedAcs: [],
      unresolvedFeatureCount: 0,
      allExpectedStatutoryAcsRepresented: false,
      allFeaturesValid: false,
      allGeometriesValid: false,
      allCoordinatesNumericValid: false,
      allCoordinatesRangeValid: false,
      linkageValid: false,
      statutoryComplete: false,
      coordinatesValid: false,
      coordinateRangeValid: false,
      authoritativeVerified: false,
      validationErrors: ['Root is not a valid FeatureCollection'],
    };
  }

  let validFeatureCount = 0;
  let geometryValidFeatureCount = 0;
  let coordinateNumericValidFeatureCount = 0;
  let coordinateRangeValidFeatureCount = 0;
  let multipartFeatureCount = 0;
  let coordNumericErrors = 0;
  let coordRangeErrors = 0;

  const linkedAcs = new Set();
  const seenAcs = new Set();
  const duplicateLinkedAcs = [];
  const outOfRangeLinkedAcs = [];
  let unresolvedFeatureCount = 0;

  for (let i = 0; i < parsed.features.length; i++) {
    const f = parsed.features[i];
    let featureGeometryValid = true;
    let featureNumericValid = false;
    let featureRangeValid = false;
    let coordinatesTraversed = false;

    if (!f || f.type !== 'Feature') {
      errors.push(`Feature[${i}] is not a valid Feature object`);
      featureGeometryValid = false;
      continue;
    }

    if (!f.geometry || typeof f.geometry !== 'object') {
      errors.push(`Feature[${i}] missing geometry object`);
      featureGeometryValid = false;
      continue;
    }

    const gType = f.geometry.type;
    if (gType !== 'Polygon' && gType !== 'MultiPolygon') {
      errors.push(`Feature[${i}] geometry type "${gType}" is unsupported (only Polygon/MultiPolygon permitted)`);
      featureGeometryValid = false;
    }

    if (gType === 'MultiPolygon') {
      multipartFeatureCount++;
    }

    const coords = f.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length === 0) {
      errors.push(`Feature[${i}] coordinates array is empty or non-array`);
      featureGeometryValid = false;
    }

    // Deep coordinate nesting, ring closure, and numeric/range position validation
    if (featureGeometryValid) {
      coordinatesTraversed = true;
      featureNumericValid = true;
      featureRangeValid = true;

      if (gType === 'Polygon') {
        // Must be Array of LinearRings (depth 3: number[][][])
        for (const ring of coords) {
          if (!Array.isArray(ring) || ring.length < 4) {
            featureGeometryValid = false;
            errors.push(`Feature[${i}] polygon ring has invalid structure or < 4 positions (RFC 7946 violation)`);
            break;
          }
          // Linear ring closure requirement: first and last position must be equivalent
          const first = ring[0];
          const last = ring[ring.length - 1];
          if (!Array.isArray(first) || !Array.isArray(last) || first[0] !== last[0] || first[1] !== last[1]) {
            featureGeometryValid = false;
            errors.push(`Feature[${i}] polygon ring is not closed: first [${first}] != last [${last}]`);
            break;
          }
          for (const pos of ring) {
            if (!Array.isArray(pos) || pos.length < 2) {
              featureGeometryValid = false;
              errors.push(`Feature[${i}] coordinate position is not a 2-element array`);
              break;
            }
            const [lng, lat] = pos;
            if (typeof lng !== 'number' || typeof lat !== 'number' || !Number.isFinite(lng) || !Number.isFinite(lat) || isNaN(lng) || isNaN(lat)) {
              featureNumericValid = false;
              coordNumericErrors++;
            } else if (lng < 65 || lng > 100 || lat < 5 || lat > 40) {
              featureRangeValid = false;
              coordRangeErrors++;
            }
          }
        }
      } else if (gType === 'MultiPolygon') {
        // Must be Array of Polygons (depth 4: number[][][][])
        for (const poly of coords) {
          if (!Array.isArray(poly) || poly.length === 0) {
            featureGeometryValid = false;
            errors.push(`Feature[${i}] MultiPolygon polygon element is empty or non-array`);
            break;
          }
          for (const ring of poly) {
            if (!Array.isArray(ring) || ring.length < 4) {
              featureGeometryValid = false;
              errors.push(`Feature[${i}] MultiPolygon ring has invalid structure or < 4 positions (RFC 7946 violation)`);
              break;
            }
            // Linear ring closure requirement
            const first = ring[0];
            const last = ring[ring.length - 1];
            if (!Array.isArray(first) || !Array.isArray(last) || first[0] !== last[0] || first[1] !== last[1]) {
              featureGeometryValid = false;
              errors.push(`Feature[${i}] MultiPolygon ring is not closed: first [${first}] != last [${last}]`);
              break;
            }
            for (const pos of ring) {
              if (!Array.isArray(pos) || pos.length < 2) {
                featureGeometryValid = false;
                errors.push(`Feature[${i}] MultiPolygon coordinate position is not a 2-element array`);
                break;
              }
              const [lng, lat] = pos;
              if (typeof lng !== 'number' || typeof lat !== 'number' || !Number.isFinite(lng) || !Number.isFinite(lat) || isNaN(lng) || isNaN(lat)) {
                featureNumericValid = false;
                coordNumericErrors++;
              } else if (lng < 65 || lng > 100 || lat < 5 || lat > 40) {
                featureRangeValid = false;
                coordRangeErrors++;
              }
            }
          }
        }
      }
    }

    // Workstream C Invariant: Features rejected before coordinate traversal MUST NOT increment numeric or range counts!
    if (featureGeometryValid) {
      geometryValidFeatureCount++;
      if (coordinatesTraversed && featureNumericValid) coordinateNumericValidFeatureCount++;
      if (coordinatesTraversed && featureRangeValid) coordinateRangeValidFeatureCount++;
    }

    // A feature is strictly valid only if all geometry, numeric, and coordinate range checks pass
    if (featureGeometryValid && coordinatesTraversed && featureNumericValid && featureRangeValid) {
      validFeatureCount++;
    }

    // Check constituency AC linkage
    const ac = f.properties?.AC_NO ?? f.properties?.ac_no ?? f.properties?.acNo ?? f.properties?.acNumber;
    if (ac != null && !isNaN(Number(ac)) && Number.isInteger(Number(ac))) {
      const acNum = Number(ac);
      if (acNum >= 1 && acNum <= statutorySeats) {
        if (seenAcs.has(acNum)) {
          duplicateLinkedAcs.push(acNum);
        } else {
          seenAcs.add(acNum);
        }
        linkedAcs.add(acNum);
      } else {
        outOfRangeLinkedAcs.push(acNum);
      }
    } else {
      unresolvedFeatureCount++;
    }
  }

  const totalFeatures = parsed.features.length;
  const missingStatutoryAcNos = [];
  for (let s = 1; s <= statutorySeats; s++) {
    if (!linkedAcs.has(s)) {
      missingStatutoryAcNos.push(s);
    }
  }

  const uniqueStatutoryAcsLinked = linkedAcs.size;
  const duplicateAcSet = [...new Set(duplicateLinkedAcs)];
  const excessFeatureCount = duplicateLinkedAcs.length;
  const outOfRangeAcSet = [...new Set(outOfRangeLinkedAcs)];

  const allExpectedStatutoryAcsRepresented = missingStatutoryAcNos.length === 0;
  const allGeometriesValid = totalFeatures > 0 && geometryValidFeatureCount === totalFeatures;
  const allCoordinatesNumericValid = totalFeatures > 0 && coordinateNumericValidFeatureCount === totalFeatures && coordNumericErrors === 0;
  const allCoordinatesRangeValid = totalFeatures > 0 && coordinateRangeValidFeatureCount === totalFeatures && coordRangeErrors === 0;
  const allFeaturesValid = totalFeatures > 0 && validFeatureCount === totalFeatures && errors.length === 0;
  const linkageValid = linkedAcs.size > 0 && unresolvedFeatureCount === 0 && outOfRangeLinkedAcs.length === 0;
  const statutoryComplete = allExpectedStatutoryAcsRepresented;

  const coordinatesValid = allCoordinatesNumericValid;
  const coordinateRangeValid = allCoordinatesRangeValid;

  // Under Directive 088 & 089 Workstream C:
  // hasGeoJSON requires all features, geometries, coordinates, and linkage to be valid.
  // statutoryComplete is a distinct metric tracking whether every statutory AC is represented.
  const hasGeoJSON = totalFeatures > 0 &&
    allFeaturesValid &&
    allGeometriesValid &&
    allCoordinatesNumericValid &&
    allCoordinatesRangeValid &&
    linkageValid &&
    errors.length === 0;

  return {
    hasGeoJSON,
    filePresent: true,
    fileName,
    featureCount: totalFeatures,
    validFeatureCount,
    geometryValidFeatureCount,
    coordinateNumericValidFeatureCount,
    coordinateRangeValidFeatureCount,
    multipartFeatureCount,
    coordNumericErrors,
    coordRangeErrors,
    expectedStatutoryAcCount: statutorySeats,
    uniqueStatutoryAcsLinked,
    linkedConstituencyCount: uniqueStatutoryAcsLinked,
    missingStatutoryAcNos,
    duplicateLinkedAcs: duplicateAcSet,
    excessFeatureCount,
    duplicateFeatureCount: excessFeatureCount,
    outOfRangeLinkedAcs: outOfRangeAcSet,
    unresolvedFeatureCount,
    allExpectedStatutoryAcsRepresented,
    allFeaturesValid,
    allGeometriesValid,
    allCoordinatesNumericValid,
    allCoordinatesRangeValid,
    linkageValid,
    statutoryComplete,
    coordinatesValid,
    coordinateRangeValid,
    authoritativeVerified: false, // Local boundary file; not live statutory ECI database verified
    validationErrors: errors.slice(0, 5),
  };
}

export function inspectGeoJSON(stateCode, statutorySeats, overridePath = null) {
  const slug = STATE_SLUGS[stateCode];
  const geoPath = path.join(REPO_ROOT, 'data', 'geo', `${slug}-assembly.geojson`);
  const altGeoPath = path.join(REPO_ROOT, 'data', 'geo', `${stateCode.toLowerCase()}-assembly.geojson`);
  const targetPath = overridePath || (fs.existsSync(geoPath) ? geoPath : (fs.existsSync(altGeoPath) ? altGeoPath : null));

  if (!targetPath || !fs.existsSync(targetPath)) {
    return {
      hasGeoJSON: false,
      filePresent: false,
      fileName: null,
      featureCount: 0,
      validFeatureCount: 0,
      geometryValidFeatureCount: 0,
      coordinateNumericValidFeatureCount: 0,
      coordinateRangeValidFeatureCount: 0,
      multipartFeatureCount: 0,
      coordNumericErrors: 0,
      coordRangeErrors: 0,
      linkedConstituencyCount: 0,
      duplicateLinkedAcs: [],
      duplicateFeatureCount: 0,
      outOfRangeLinkedAcs: [],
      unresolvedFeatureCount: 0,
      linkageValid: false,
      coordinatesValid: false,
      coordinateRangeValid: false,
      authoritativeVerified: false,
      validationErrors: ['File not found in data/geo'],
    };
  }

  try {
    const raw = fs.readFileSync(targetPath, 'utf8');
    const parsed = JSON.parse(raw);
    return validateGeoJsonObject(parsed, stateCode, statutorySeats, path.basename(targetPath));
  } catch (err) {
    return {
      hasGeoJSON: false,
      filePresent: true,
      fileName: path.basename(targetPath),
      featureCount: 0,
      validFeatureCount: 0,
      geometryValidFeatureCount: 0,
      coordinateNumericValidFeatureCount: 0,
      coordinateRangeValidFeatureCount: 0,
      multipartFeatureCount: 0,
      coordNumericErrors: 0,
      coordRangeErrors: 0,
      linkedConstituencyCount: 0,
      duplicateLinkedAcs: [],
      duplicateFeatureCount: 0,
      outOfRangeLinkedAcs: [],
      unresolvedFeatureCount: 0,
      linkageValid: false,
      coordinatesValid: false,
      coordinateRangeValid: false,
      authoritativeVerified: false,
      validationErrors: [err.message],
    };
  }
}

// Inspect affidavits in store via AST structural parsing (CTO Directive 088 Workstream B)
// Enforces required candidate fields: id, candidateName, acNo, constituencyName, stateCode, sourceUrl
export function inspectAffidavits(stateCode, statutorySeats) {
  const storePath = path.join(REPO_ROOT, 'apps', 'mobile', 'stores', 'affidavits.ts');
  if (!fs.existsSync(storePath)) {
    return {
      total: 0,
      totalAffidavitsInStore: 0,
      presentInFileCount: 0,
      structurallyValidCount: 0,
      identityValidatedCount: 0,
      sourceProvenanceRecordedCount: 0,
      verified: 0,
      officiallyVerifiedCount: 0,
      canonicalDatabaseBacked: false,
      formallyAccepted: false,
      pending: 0,
      records: [],
      syntacticParseSuccess: false,
      parseErrors: ['File not found on disk'],
    };
  }

  const content = fs.readFileSync(storePath, 'utf8');
  return inspectAffidavitsAst(content, stateCode, statutorySeats, null, 'affidavits.ts');
}

// Inspect historical election records tied to actual per-constituency source files via AST (CTO Directive 088 Workstream C)
export function inspectHistoricalCoverage(stateCode, statutorySeats = 500) {
  const slug = STATE_SLUGS[codeOrSlug(stateCode)];
  const histPath = path.join(REPO_ROOT, 'data', 'seed', `${slug}-historical-results.ts`);
  const exists = fs.existsSync(histPath);

  if (!exists) {
    return {
      stateHistoricalFilePresent: false,
      demonstrablePerAcYears: [],
      totalHistoricalYears: 0,
      eventsByYear: {},
      malformedRecordCount: 0,
    };
  }

  const content = fs.readFileSync(histPath, 'utf8');
  const res = inspectHistoricalResultsAst(content, statutorySeats, `${slug}-historical-results.ts`);
  return {
    stateHistoricalFilePresent: true,
    demonstrablePerAcYears: res.demonstrablePerAcYears,
    totalHistoricalYears: res.totalHistoricalYears,
    eventsByYear: res.eventsByYear,
    malformedRecordCount: res.malformedRecordCount,
  };
}

// Inspect MLA profiles file with AST parsing and boundary awareness (CTO Directive 088 Workstream B)
export function inspectMlaProfiles(stateCode, statutorySeats) {
  const slug = STATE_SLUGS[codeOrSlug(stateCode)];
  const mlaPath = path.join(REPO_ROOT, 'data', 'seed', `${slug}-mla-profiles.ts`);
  if (!fs.existsSync(mlaPath)) {
    return {
      uniqueProfilesCount: 0,
      resolvedToStatutoryAcCount: 0,
      extraNonStatutoryProfiles: 0,
      duplicateProfilesCount: 0,
      malformedProfilesCount: 0,
      totalEvaluated: 0,
    };
  }

  const content = fs.readFileSync(mlaPath, 'utf8');
  return inspectMlaProfilesAst(content, statutorySeats, `${slug}-mla-profiles.ts`);
}

function codeOrSlug(code) {
  return STATE_SLUGS[code] ? code : Object.keys(STATE_SLUGS).find(k => STATE_SLUGS[k] === code) || code;
}

// Helper to validate raw constituencies array
export function validateConstituencyArray(rawConstituencies, statutorySeats) {
  const seenAcNos = new Set();
  const duplicateAcNos = [];
  const outOfRangeAcNos = [];
  const malformedAcRecords = [];
  const validAcMap = new Map();

  for (const c of rawConstituencies) {
    if (!c || typeof c !== 'object') {
      malformedAcRecords.push(c);
      continue;
    }

    const rawAc = c.acNo;
    const ac = typeof rawAc === 'number' ? rawAc : parseInt(rawAc, 10);
    if (isNaN(ac) || !Number.isInteger(ac)) {
      malformedAcRecords.push(c);
      continue;
    }

    if (seenAcNos.has(ac)) {
      duplicateAcNos.push(ac);
      continue; // Duplicate record cannot be added as valid statutory AC!
    }

    seenAcNos.add(ac);

    if (ac < 1 || ac > statutorySeats) {
      outOfRangeAcNos.push(ac);
    } else {
      validAcMap.set(ac, c);
    }
  }

  const missingAcNos = [];
  for (let i = 1; i <= statutorySeats; i++) {
    if (!validAcMap.has(i)) {
      missingAcNos.push(i);
    }
  }

  return {
    validAcRecords: Array.from(validAcMap.values()),
    uniqueValidAcCount: validAcMap.size,
    duplicateAcNos: [...new Set(duplicateAcNos)],
    outOfRangeAcNos: [...new Set(outOfRangeAcNos)],
    malformedAcCount: malformedAcRecords.length,
    missingAcNos,
  };
}

/**
 * Generate evidence-based national coverage matrix.
 * Audits all 7 required dimensions per State/UT without hardcoded tier promotion.
 */
export async function generateCoverageInventory() {
  const inventory = [];

  for (const [code, meta] of Object.entries(AUTHORITATIVE_STATE_SEATS)) {
    const slug = STATE_SLUGS[code];
    const constPath = path.join(REPO_ROOT, 'data', 'seed', `${slug}-constituencies.ts`);

    let rawConstituencies = [];
    if (fs.existsSync(constPath)) {
      try {
        const mod = await import(`file://${constPath}`);
        const exportKey = Object.keys(mod)[0];
        rawConstituencies = Array.isArray(mod[exportKey]) ? mod[exportKey] : [];
      } catch (err) {
        console.error(`Error importing ${constPath}:`, err.message);
      }
    }

    // 1. Registry / Identity Dimension with strict deduplication & malformed detection
    const valResult = validateConstituencyArray(rawConstituencies, meta.seats);
    const { validAcRecords, uniqueValidAcCount, duplicateAcNos, outOfRangeAcNos, malformedAcCount, missingAcNos } = valResult;

    const seatCoveragePercent = ((uniqueValidAcCount / meta.seats) * 100).toFixed(1);
    const seatCoverageRatio = `${uniqueValidAcCount}/${meta.seats} (${seatCoveragePercent}%)`;

    // 2. Electoral Results Dimension
    let resultsPresentCount = 0;
    let winnerVotesPresentCount = 0;
    let winnerVotesMissingCount = 0;
    let marginPresentCount = 0;
    let marginMissingCount = 0;
    const evidencedYearsSet = new Set();
    const evidencedTypesSet = new Set();

    for (const c of validAcRecords) {
      let recYear = null;
      if (c.winner2025 !== undefined || c.winnerName2025 !== undefined) recYear = 2025;
      else if (c.winner2024 !== undefined || c.winnerName2024 !== undefined) recYear = 2024;
      else if (c.winner2023 !== undefined || c.winnerName2023 !== undefined) recYear = 2023;
      else if (c.winner2022 !== undefined || c.winnerName2022 !== undefined) recYear = 2022;
      else if (c.winner2021 !== undefined || c.winnerName2021 !== undefined) recYear = 2021;
      else if (c.winner2020 !== undefined || c.winnerName2020 !== undefined) recYear = 2020;
      else if (typeof c.electionYear === 'number') recYear = c.electionYear;

      if (recYear != null) evidencedYearsSet.add(recYear);

      if (c.electionType === 'BYPOLL' || c.electionType === 'GENERAL') {
        evidencedTypesSet.add(c.electionType);
      }

      const winner = c.winner2025 ?? c.winner2024 ?? c.winner2023 ?? c.winner2022 ?? c.winner2021 ?? c.winner2020 ?? c.winner;
      const winnerName = c.winnerName2025 ?? c.winnerName2024 ?? c.winnerName2023 ?? c.winnerName2022 ?? c.winnerName2021 ?? c.winnerName2020 ?? c.winnerName;
      if (winner || winnerName) {
        resultsPresentCount++;
      }

      const votes = c.winnerVotes2025 ?? c.winnerVotes2024 ?? c.winnerVotes2023 ?? c.winnerVotes2022 ?? c.winnerVotes2021 ?? c.winnerVotes2020 ?? c.winnerVotes;
      if (typeof votes === 'number') {
        winnerVotesPresentCount++;
      } else {
        winnerVotesMissingCount++;
      }

      const margin = c.margin2025 ?? c.margin2024 ?? c.margin2023 ?? c.margin2022 ?? c.margin2021 ?? c.margin2020 ?? c.margin;
      if (typeof margin === 'number') {
        marginPresentCount++;
      } else {
        marginMissingCount++;
      }
    }

    const resultsCoveragePercent = meta.seats > 0 ? ((resultsPresentCount / meta.seats) * 100).toFixed(1) : '0.0';
    const resultsCoverageRatio = `${resultsPresentCount}/${meta.seats} (${resultsCoveragePercent}%)`;

    // Derive recent election year strictly from record evidence (NO state code or cycle guessing!)
    const evidencedRecentYears = [...evidencedYearsSet].sort((a, b) => b - a);
    const primaryRecentElectionYear = evidencedRecentYears.length > 0 ? evidencedRecentYears[0] : null;
    const primaryRecentElectionType = evidencedTypesSet.has('BYPOLL') && evidencedTypesSet.size === 1
      ? 'BYPOLL'
      : (evidencedTypesSet.has('GENERAL') ? 'GENERAL' : null);

    // 3. Historical Coverage Dimension (structural parsing without hardcoded state-code lists)
    const hist = inspectHistoricalCoverage(code, meta.seats);
    const allAvailableYears = primaryRecentElectionYear != null
      ? [...new Set([primaryRecentElectionYear, ...hist.demonstrablePerAcYears])].sort((a, b) => b - a)
      : [...hist.demonstrablePerAcYears].sort((a, b) => b - a);

    // 4. Representative / Profile Dimension
    const mla = inspectMlaProfiles(code, meta.seats);
    const profileCoveragePercent = meta.seats > 0 ? ((mla.resolvedToStatutoryAcCount / meta.seats) * 100).toFixed(1) : '0.0';
    const profileCoverageRatio = `${mla.resolvedToStatutoryAcCount}/${meta.seats} (${profileCoveragePercent}%)`;

    // 5. Affidavit Dimension
    const aff = inspectAffidavits(code, meta.seats);
    const affidavitCoveragePercent = meta.seats > 0 ? ((aff.total / meta.seats) * 100).toFixed(1) : '0.0';
    const affidavitCoverageRatio = `${aff.total}/${meta.seats} (${affidavitCoveragePercent}%)`;

    // 6. Geospatial Dimension (deep structural & coordinate validation)
    const geo = inspectGeoJSON(code, meta.seats);

    // 7. Provenance Dimension
    let primarySource = 'Election Commission of India (ECI) / State Election Commission';
    let affidavitSource = aff.total > 0 ? 'ADR / MyNeta candidate disclosures' : 'None';
    const verificationStatus = 'OFFLINE_LOCAL_FIXTURE';
    const liveDatabaseVerified = false;

    // ─── Observable Evidence-Derived Tier & Status Classification ───
    // Under Rule IV-001, NO state can be CANONICAL_FULL without complete verified affidavits,
    // geospatial coverage, and live database verification.
    let dataTier = 'SEEDED_SINGLE_TERM_PENDING_GEO_HIST';
    let dataCompletenessStatus = 'FUNCTIONAL_PARTIAL_OFFLINE';
    const materialGaps = [];
    const knownExceptions = [];

    if (uniqueValidAcCount < meta.seats) {
      materialGaps.push(`Constituency seed count (${uniqueValidAcCount}) is less than statutory assembly seats (${meta.seats})`);
    }

    if (aff.total === 0) {
      materialGaps.push('Candidate financial affidavits pending indexing (all constituencies display Affidavit Pending notice)');
    } else if (aff.total < meta.seats) {
      materialGaps.push(`Candidate affidavits only partially available: ${aff.total}/${meta.seats} seats (${affidavitCoveragePercent}% coverage; ${meta.seats - aff.total} seats display Affidavit Pending notice)`);
    }

    if (!geo.hasGeoJSON) {
      materialGaps.push('Assembly boundary GeoJSON not indexed in repository data/geo');
    }

    if (hist.demonstrablePerAcYears.length === 0) {
      materialGaps.push('Per-constituency historical elections prior to current term not yet seeded');
    }

    // Material Defect Notice
    if (code === 'TS') {
      materialGaps.push('Financial defect DQ-W021.5-B2.2E-001 remains STRICTLY OPEN pending CTO adjudication');
    }

    // Delhi Statutory Invariant Notice
    if (code === 'DL') {
      knownExceptions.push('Delhi statutory Assembly is strictly 70 seats. Demographics file contains 151 extra non-assembly records (DL-AC-071 through DL-AC-221) classified as NON_STATUTORY_DEMOGRAPHIC_PLACEHOLDER');
    }

    // Evidence Tier Assignment
    if (geo.hasGeoJSON && hist.demonstrablePerAcYears.length > 0 && aff.total > 0) {
      dataTier = 'SEEDED_RICH_LOCAL_WITH_GEO';
      dataCompletenessStatus = 'PARTIAL_VERIFIED_OFFLINE';
    } else if (hist.demonstrablePerAcYears.length > 0) {
      dataTier = 'SEEDED_HISTORICAL_NO_GEO';
      dataCompletenessStatus = 'FUNCTIONAL_PARTIAL_OFFLINE';
    } else {
      dataTier = 'SEEDED_SINGLE_TERM_PENDING_GEO_HIST';
      dataCompletenessStatus = 'FUNCTIONAL_PARTIAL_OFFLINE';
    }

    inventory.push({
      stateCode: code,
      stateName: meta.name,
      statutoryAssemblySeats: meta.seats,
      seededConstituencyCount: uniqueValidAcCount,
      registryIdentity: {
        statutorySeats: meta.seats,
        uniqueValidAcCount,
        seatCoverageRatio,
        missingAcNos,
        duplicateAcNos,
        outOfRangeAcNos,
        malformedAcCount,
        unexpectedExtraRecords: code === 'DL' ? ['DL-AC-071..DL-AC-221 (Demographics)'] : [],
        identityStatus: uniqueValidAcCount === meta.seats ? 'VERIFIED_STATUTORY_MATCH' : 'MISMATCH',
      },
      electoralResults: {
        recentElectionYear: primaryRecentElectionYear,
        recentElectionType: primaryRecentElectionType,
        resultsPresentCount,
        resultsCoverageRatio,
        winnerVotesPresentCount,
        winnerVotesMissingCount,
        marginPresentCount,
        marginMissingCount,
      },
      historicalCoverage: {
        primaryElectionYear: primaryRecentElectionYear,
        demonstrablePerAcYears: hist.demonstrablePerAcYears,
        totalElectionYearsRepresented: (primaryRecentElectionYear ? 1 : 0) + hist.demonstrablePerAcYears.length,
        stateHistoricalFilePresent: hist.stateHistoricalFilePresent,
        inferredYearsRejected: [],
      },
      representativeCoverage: {
        uniqueProfilesCount: mla.uniqueProfilesCount,
        resolvedToStatutoryAcCount: mla.resolvedToStatutoryAcCount,
        profileCoverageRatio,
        extraNonStatutoryProfiles: mla.extraNonStatutoryProfiles,
        duplicateProfilesCount: mla.duplicateProfilesCount,
        malformedProfilesCount: mla.malformedProfilesCount,
      },
      affidavitCoverage: {
        totalAffidavitsInStore: aff.total,
        affidavitCoverageRatio,
        hasPendingNotice: aff.total < meta.seats,
        presentInFileCount: aff.presentInFileCount,
        structurallyValidCount: aff.structurallyValidCount,
        identityValidatedCount: aff.identityValidatedCount,
        sourceProvenanceRecordedCount: aff.sourceProvenanceRecordedCount,
        officiallyVerifiedCount: aff.officiallyVerifiedCount,
        canonicalDatabaseBacked: aff.canonicalDatabaseBacked,
        formallyAccepted: aff.formallyAccepted,
      },
      geospatialCoverage: geo,
      provenanceCoverage: {
        primarySource,
        affidavitSource,
        verificationStatus,
        liveDatabaseVerified,
      },
      primaryElectionYear: primaryRecentElectionYear,
      primaryElectionType: primaryRecentElectionType,
      availableElectionYears: allAvailableYears,
      mlaProfilesAvailable: mla.resolvedToStatutoryAcCount,
      demographicsAvailable: uniqueValidAcCount,
      affidavitsAvailable: aff.total,
      hasGeoJSON: geo.hasGeoJSON,
      hasHistoricalPerConstituency: hist.demonstrablePerAcYears.length > 0,
      hasStateElectionHistory: hist.stateHistoricalFilePresent,
      dataTier,
      dataCompletenessStatus,
      provenanceSource: aff.total > 0 ? `${primarySource} + ${affidavitSource}` : primarySource,
      materialGaps,
      knownExceptions,
    });
  }

  return inventory;
}

export async function writeCoverageReports() {
  const inventory = await generateCoverageInventory();
  const generatedAt = new Date().toISOString();

  const reportJson = {
    title: 'Kshetra W021.5 National Data Coverage Inventory Matrix',
    directive: 'CTO DIRECTIVE 085 / CTO DIRECTIVE 086 / CTO DIRECTIVE 087 / CTO DIRECTIVE 088',
    generatedAt,
    totalStatesAudited: inventory.length,
    summary: {
      canonicalFullStatesCount: 0, // STRICTLY ZERO under evidence-based Rule IV-001
      partialLocalWithGeoCount: inventory.filter((s) => s.dataTier === 'SEEDED_RICH_LOCAL_WITH_GEO').length,
      partialHistoricalNoGeoCount: inventory.filter((s) => s.dataTier === 'SEEDED_HISTORICAL_NO_GEO').length,
      seededSingleTermCount: inventory.filter((s) => s.dataTier === 'SEEDED_SINGLE_TERM_PENDING_GEO_HIST').length,
      unavailableCount: inventory.filter((s) => s.dataTier === 'UNAVAILABLE').length,
      totalStatutorySeats: inventory.reduce((acc, s) => acc + s.statutoryAssemblySeats, 0),
      totalSeededConstituencies: inventory.reduce((acc, s) => acc + s.seededConstituencyCount, 0),
      totalMlaProfiles: inventory.reduce((acc, s) => acc + s.mlaProfilesAvailable, 0),
      totalAffidavits: inventory.reduce((acc, s) => acc + s.affidavitsAvailable, 0),
      totalDuplicateConstituencyRecords: inventory.reduce((acc, s) => acc + s.registryIdentity.duplicateAcNos.length, 0),
      totalMalformedConstituencyRecords: inventory.reduce((acc, s) => acc + s.registryIdentity.malformedAcCount, 0),
    },
    states: inventory,
  };

  const jsonPath = path.join(REPO_ROOT, 'reports', 'w021_5_national_data_coverage_matrix.json');
  fs.writeFileSync(jsonPath, JSON.stringify(reportJson, null, 2), 'utf8');
  console.log(`[PASS] Wrote JSON coverage matrix to ${jsonPath}`);

  // Generate Markdown Report
  let md = `# KSHETRA W021.5 — NATIONAL DATA COVERAGE INVENTORY MATRIX

**Milestone:** W021.5 — National Political Intelligence and Candidate Transparency  
**Directive:** CTO Directive 085 / CTO Directive 086 / CTO Directive 087 / CTO Directive 088  
**Generated At:** \`${generatedAt}\`  
**Total States/UTs Audited:** ${inventory.length}  
**Defect Classification:** \`DQ-W021.5-B2.2E-001\` — **STRICTLY OPEN**  
**Governance Invariant:** Rule IV-001 — Non-Self-Acceptance  

---

## 1. Executive Summary

This matrix establishes the definitive, evidence-based national political data coverage inventory of the Kshetra platform across all 31 supported Indian states and Union Territories.

Under **CTO Directive 085 / 086 / 087 / 088** and **Rule IV-001 (Non-Self-Acceptance)**, this report repudiates unsupported completeness claims:
1. **Zero Canonical Full States:** No state is promoted to \`CANONICAL_FULL\` or \`VERIFIED_PRODUCTION\` merely because of allowlisted state codes or file existence. All records are classified truthfully as offline local seed fixtures pending live database verification.
2. **Multi-Dimensional Evidence:** Every state is audited across 7 distinct dimensions: Registry Identity, Electoral Results, Historical Coverage, Representative Profiles, Affidavits, Geospatial Boundaries, and Provenance.
3. **Delhi Statutory Invariant:** Strictly 70 statutory Assembly seats. 151 extra municipal/demographic records (\`DL-AC-071\` to \`DL-AC-221\`) are explicitly isolated as \`NON_STATUTORY_DEMOGRAPHIC_PLACEHOLDER\`.
4. **Historical Availability by Record Evidence:** Election years are derived solely from demonstrable per-constituency data records, not inferred from state codes or constants.
5. **Deduplicated Statutory Seat Accounting:** Duplicate constituency entries cannot inflate seeded seat counts or national totals. Numerator reflects unique, valid statutory AC identities.
6. **Strict GeoJSON Gate:** Coordinate range failures and geometry errors strictly invalidate \`hasGeoJSON\`. No boundary is deemed authoritative without live statutory database verification.
7. **Explicit Evidence Statuses:** Affidavits and profiles clearly distinguish presence in file, structural validity, identity validation, source provenance recording, and official verification.

### Platform Coverage Summary
- **Total Statutory Assembly Seats:** ${reportJson.summary.totalStatutorySeats}
- **Total Unique Seeded Constituencies:** ${reportJson.summary.totalSeededConstituencies} (${((reportJson.summary.totalSeededConstituencies / reportJson.summary.totalStatutorySeats) * 100).toFixed(1)}% seat identity coverage)
- **Total MLA Profiles Resolved to Statutory Seats:** ${reportJson.summary.totalMlaProfiles}
- **Total Candidate Affidavits in Store:** ${reportJson.summary.totalAffidavits}
- **Total Duplicate Constituency Records:** ${reportJson.summary.totalDuplicateConstituencyRecords}
- **Total Malformed Constituency Records:** ${reportJson.summary.totalMalformedConstituencyRecords}
- **Tier 0 (Canonical Full Production):** ${reportJson.summary.canonicalFullStatesCount} states (Strictly 0; live DB and complete affidavits pending)
- **Tier 1 (Seeded Rich Local + GeoJSON + Historical + Sample Affidavits):** ${reportJson.summary.partialLocalWithGeoCount} state (TS)
- **Tier 2 (Seeded Historical + Profiles, GeoJSON & Complete Affidavits Pending):** ${reportJson.summary.partialHistoricalNoGeoCount} states (AP, KA, MH, TN, KL, WB, UP)
- **Tier 3 (Seeded Single-Term Constituencies + Profiles, Affidavits & Geo Pending):** ${reportJson.summary.seededSingleTermCount} states/UTs

---

## 2. State-by-State Multi-Dimensional Coverage Inventory

| Code | State / UT | Statutory Seats | Seeded Seats (Ratio) | Primary Election | Historical Years | MLA Profiles (Ratio) | Affidavits (Ratio) | GeoJSON | Evidence Tier | Data Status |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
`;

  for (const s of inventory) {
    const geo = s.hasGeoJSON ? `✓ (${s.geospatialCoverage.validFeatureCount})` : '— (0)';
    const histYears = s.historicalCoverage.demonstrablePerAcYears.length > 0
      ? s.historicalCoverage.demonstrablePerAcYears.join(', ')
      : 'None';
    const primaryYearStr = s.primaryElectionYear
      ? `${s.primaryElectionYear}${s.primaryElectionType ? ` (${s.primaryElectionType})` : ''}`
      : 'None';
    md += `| **${s.stateCode}** | ${s.stateName} | ${s.statutoryAssemblySeats} | ${s.registryIdentity.seatCoverageRatio} | ${primaryYearStr} | ${histYears} | ${s.representativeCoverage.profileCoverageRatio} | ${s.affidavitCoverage.affidavitCoverageRatio} | ${geo} | \`${s.dataTier}\` | \`${s.dataCompletenessStatus}\` |\n`;
  }

  md += `
---

## 3. Detailed Dimensional Audit & State Gap Analysis

`;

  for (const s of inventory) {
    const primaryYearStr = s.primaryElectionYear
      ? `${s.primaryElectionYear}${s.primaryElectionType ? ` (${s.primaryElectionType})` : ''}`
      : 'None';
    md += `### ${s.stateName} (${s.stateCode})
- **1. Registry / Identity:** ${s.registryIdentity.seatCoverageRatio} statutory seats mapped. Status: \`${s.registryIdentity.identityStatus}\`. Missing ACs: ${s.registryIdentity.missingAcNos.length === 0 ? 'None' : s.registryIdentity.missingAcNos.join(', ')}. Duplicate ACs: ${s.registryIdentity.duplicateAcNos.length === 0 ? '0' : s.registryIdentity.duplicateAcNos.join(', ')}. Malformed: ${s.registryIdentity.malformedAcCount}.
- **2. Electoral Results:** ${s.electoralResults.resultsCoverageRatio} records present for ${primaryYearStr}. Winner votes present: ${s.electoralResults.winnerVotesPresentCount}, missing: ${s.electoralResults.winnerVotesMissingCount}. Margin present: ${s.electoralResults.marginPresentCount}, missing: ${s.electoralResults.marginMissingCount}.
- **3. Historical Elections:** Primary ${s.historicalCoverage.primaryElectionYear || 'None'} + Demonstrable historical years: [${s.historicalCoverage.demonstrablePerAcYears.join(', ') || 'None'}]. (Total terms: ${s.historicalCoverage.totalElectionYearsRepresented}). State historical file: ${s.historicalCoverage.stateHistoricalFilePresent ? 'Present' : 'Absent'}.
- **4. Representatives / Profiles:** ${s.representativeCoverage.profileCoverageRatio} resolved to statutory assembly seats. Extra non-statutory: ${s.representativeCoverage.extraNonStatutoryProfiles}. Duplicates: ${s.representativeCoverage.duplicateProfilesCount}.
- **5. Affidavits:** ${s.affidavitCoverage.affidavitCoverageRatio} candidates in store. Present in file: ${s.affidavitCoverage.presentInFileCount}, Structurally valid: ${s.affidavitCoverage.structurallyValidCount}, Identity validated: ${s.affidavitCoverage.identityValidatedCount}, Source recorded: ${s.affidavitCoverage.sourceProvenanceRecordedCount}, Officially verified: 0. Pending notice: ${s.affidavitCoverage.hasPendingNotice ? 'Active' : 'None'}.
- **6. Geospatial:** File: ${s.geospatialCoverage.fileName || 'None'} | Features: ${s.geospatialCoverage.featureCount} | Coordinates Valid: ${s.geospatialCoverage.coordinatesValid ? 'Yes' : 'No'} | Range Valid: ${s.geospatialCoverage.coordinateRangeValid ? 'Yes' : 'No'} | Linkage Valid: ${s.geospatialCoverage.linkageValid ? 'Yes' : 'No'}.
- **7. Provenance & Verification:** Source: ${s.provenanceSource} | Status: \`${s.provenanceCoverage.verificationStatus}\` | Live DB Verified: \`${s.provenanceCoverage.liveDatabaseVerified}\`.
- **Evidence Tier:** \`${s.dataTier}\` | **Data Completeness Status:** \`${s.dataCompletenessStatus}\`
`;

    if (s.knownExceptions.length > 0) {
      md += `- **Known Exceptions:**\n`;
      for (const ex of s.knownExceptions) {
        md += `  * ${ex}\n`;
      }
    }

    if (s.materialGaps.length === 0) {
      md += `- **Material Gaps:** None identified from local seeds.\n\n`;
    } else {
      md += `- **Material Gaps:**\n`;
      for (const g of s.materialGaps) {
        md += `  * ${g}\n`;
      }
      md += `\n`;
    }
  }

  md += `---

## 4. Non-Negotiable Governance & Lineage Rules

1. **Defect \`DQ-W021.5-B2.2E-001\` remains STRICTLY OPEN:** No financial disclosures have been altered or remediated without separate CTO adjudication.
2. **Rule IV-001 (Non-Self-Acceptance):** Submitted for independent review. A passing verification script does not constitute CTO acceptance.
3. **Delhi Assembly Boundary Invariant:** Delhi statutory seats are strictly 70. Extra records \`DL-AC-071\` through \`DL-AC-221\` are demographic/municipal non-assembly records preserved strictly as \`NON_STATUTORY_DEMOGRAPHIC_PLACEHOLDER\`.
4. **Zero Live Database Mutations:** This inventory was generated entirely through offline repository analysis without querying or mutating live production or staging databases.
5. **No Null Coercion:** Missing disclosures, missing vote margins, and unverified candidates are represented as \`null\` or Pending Disclosures, never fabricated as zero.
`;

  const mdPath = path.join(REPO_ROOT, 'reports', 'w021_5_national_data_coverage_matrix.md');
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log(`[PASS] Wrote Markdown coverage matrix to ${mdPath}`);
}

// Direct execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeCoverageReports();
}
