#!/usr/bin/env python3
"""Forensic topology audit for downloaded Telangana Assembly Constituency ArcGIS JSON.

This is a candidate-source audit, not legal acceptance. It preserves source hashes,
checks ESRI ring structure, converts ESRI rings to Shapely geometries using the
ESRI exterior-clockwise / hole-counterclockwise convention, and reports validity,
overlaps, union properties and unresolved legal/source questions.
"""
from __future__ import annotations

import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path

from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely.validation import explain_validity

ROOT = Path("stage_b_acquisition")
RAW = ROOT / "raw"
OUT = ROOT / "geometry_audit.json"

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def signed_area(ring):
    return sum(ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1] for i in range(len(ring) - 1)) / 2.0

def convert_esri_feature(feature):
    attrs = feature.get("attributes") or {}
    rings = (feature.get("geometry") or {}).get("rings") or []
    shells = [ring for ring in rings if signed_area(ring) < 0]
    holes = [ring for ring in rings if signed_area(ring) > 0]
    if not shells and rings:
        shell = max(rings, key=lambda ring: abs(signed_area(ring)))
        shells = [shell]
        holes = [ring for ring in rings if ring is not shell]
    shell_polys = [Polygon(ring) for ring in shells]
    assigned_holes = [[] for _ in shell_polys]
    unassigned_holes = 0
    for hole in holes:
        hole_poly = Polygon(hole)
        point = hole_poly.representative_point()
        candidates = [i for i, shell in enumerate(shell_polys) if shell.contains(point)]
        if not candidates:
            unassigned_holes += 1
            continue
        assigned_holes[min(candidates, key=lambda i: shell_polys[i].area)].append(hole)
    parts = [Polygon(shell, holes=assigned_holes[i]) for i, shell in enumerate(shells)]
    geom = parts[0] if len(parts) == 1 else MultiPolygon(parts)
    return attrs, geom, unassigned_holes

def audit_file(path: Path):
    raw = path.read_bytes()
    source = json.loads(raw.decode("utf-8-sig"))
    features = source.get("features")
    if not isinstance(features, list) or not features:
        raise ValueError("ESRI JSON has no non-empty features array")
    converted = []
    issues = []
    total_rings = 0
    unclosed_rings = 0
    too_short_rings = 0
    nonfinite_points = 0
    for idx, feature in enumerate(features):
        attrs = feature.get("attributes") or {}
        rings = (feature.get("geometry") or {}).get("rings") or []
        total_rings += len(rings)
        for ring in rings:
            if not isinstance(ring, list) or len(ring) < 4:
                too_short_rings += 1
                continue
            if ring[0][:2] != ring[-1][:2]:
                unclosed_rings += 1
            for point in ring:
                if not isinstance(point, list) or len(point) < 2 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in point[:2]):
                    nonfinite_points += 1
        attrs, geom, unassigned = convert_esri_feature(feature)
        name = attrs.get("Assembly_Name") or attrs.get("ASSEMBLY_N") or attrs.get("Ass_Name") or attrs.get("Assembly") or "UNKNOWN"
        oid = attrs.get("OBJECTID")
        if unassigned:
            issues.append({"objectId": oid, "name": name, "issue": "UNASSIGNED_HOLE_RINGS", "count": unassigned})
        if not geom.is_valid:
            issues.append({"objectId": oid, "name": name, "issue": "INVALID_GEOMETRY", "reason": explain_validity(geom)})
        if geom.is_empty:
            issues.append({"objectId": oid, "name": name, "issue": "EMPTY_GEOMETRY"})
        converted.append({"attributes": attrs, "name": str(name), "objectId": str(oid), "geometry": geom})

    geoms = [item["geometry"] for item in converted]
    overlap_pairs = []
    zero_area_intersections = 0
    for i in range(len(geoms)):
        for j in range(i + 1, len(geoms)):
            a, b = geoms[i], geoms[j]
            if (a.bounds[2] < b.bounds[0] or b.bounds[2] < a.bounds[0] or
                a.bounds[3] < b.bounds[1] or b.bounds[3] < a.bounds[1]):
                continue
            inter = a.intersection(b)
            if inter.is_empty:
                continue
            if inter.area > 1e-12:
                overlap_pairs.append({
                    "objectIdA": converted[i]["objectId"], "nameA": converted[i]["name"],
                    "objectIdB": converted[j]["objectId"], "nameB": converted[j]["name"],
                    "intersectionAreaDegreesSquared": inter.area
                })
            else:
                zero_area_intersections += 1
    union = unary_union(geoms)
    ids = [item["objectId"] for item in converted]
    names = [item["name"] for item in converted]
    valid_count = sum(geom.is_valid for geom in geoms)
    return {
        "sourceFile": str(path),
        "sourceBytes": len(raw),
        "sourceSha256": sha256(raw),
        "sourceCommit": "not supplied by ArcGIS response; service endpoint and retrieval time are recorded separately",
        "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
        "featureCount": len(features),
        "expectedFeatureCount": 119,
        "expectedFeatureCountStatus": "PASS" if len(features) == 119 else "FAIL",
        "geometryType": source.get("geometryType"),
        "spatialReference": source.get("spatialReference"),
        "fieldNames": [field.get("name") for field in source.get("fields", [])],
        "totalRings": total_rings,
        "unclosedRings": unclosed_rings,
        "ringsTooShort": too_short_rings,
        "nonFinitePoints": nonfinite_points,
        "uniqueObjectIds": len(set(ids)),
        "duplicateObjectIds": len(ids) - len(set(ids)),
        "uniqueAssemblyNames": len(set(names)),
        "duplicateAssemblyNames": len(names) - len(set(names)),
        "validGeometries": valid_count,
        "invalidGeometries": len(geoms) - valid_count,
        "issues": issues,
        "positiveAreaOverlapPairs": overlap_pairs,
        "positiveAreaOverlapPairCount": len(overlap_pairs),
        "zeroAreaIntersectionPairs": zero_area_intersections,
        "unionValid": union.is_valid,
        "unionPartCount": len(union.geoms) if hasattr(union, "geoms") else 1,
        "unionBounds": list(union.bounds),
        "sumFeatureAreaDegreesSquared": sum(geom.area for geom in geoms),
        "unionAreaDegreesSquared": union.area,
        "sumMinusUnionAreaDegreesSquared": sum(geom.area for geom in geoms) - union.area,
        "decision": "CANDIDATE_REQUIRES_REMEDIATION_AND_LEGAL_RECONCILIATION" if issues or overlap_pairs else "STRUCTURALLY_CLEAN_CANDIDATE_REQUIRES_LEGAL_RECONCILIATION",
        "limitations": [
            "Area is reported in degrees squared only as a topology diagnostic, not a geodesic measurement.",
            "Zero positive-area overlap does not prove there are no gaps against the authoritative state boundary.",
            "No authoritative state polygon comparison, legal instrument/effective-date reconciliation, or canonical AC-number crosswalk was performed.",
            "No automatic geometry repair was applied; raw source bytes remain unchanged."
        ]
    }

results = []
errors = []
for name in ("telangana-ac-geometry.bin", "telangana-2026-ac-geometry.bin"):
    path = RAW / name
    if not path.exists():
        results.append({"sourceFile": str(path), "status": "NOT_PRESENT_IN_THIS_RUN"})
        continue
    try:
        results.append({"status": "AUDITED", **audit_file(path)})
    except Exception as exc:
        errors.append({"sourceFile": str(path), "error": f"{type(exc).__name__}: {exc}"})
        results.append({"sourceFile": str(path), "status": "AUDIT_FAILED", "error": errors[-1]["error"]})

report = {
    "schemaVersion": 1,
    "title": "W021.5 Telangana official GIS candidate topology audit",
    "createdAtUtc": datetime.now(timezone.utc).isoformat(),
    "runScope": "Read-only candidate source audit; not statutory acceptance",
    "results": results,
    "errors": errors,
    "overallDecision": "REVIEW_REQUIRED" if errors or any(r.get("invalidGeometries", 0) or r.get("positiveAreaOverlapPairCount", 0) for r in results) else "CANDIDATE_ONLY_PENDING_LEGAL_RECONCILIATION",
}
OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"output": str(OUT), "overallDecision": report["overallDecision"], "results": [{k:r.get(k) for k in ("sourceFile","status","featureCount","sourceSha256","invalidGeometries","positiveAreaOverlapPairCount","unionPartCount")} for r in results], "errors": errors}, indent=2))
if errors:
    raise SystemExit(1)
