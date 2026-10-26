#!/usr/bin/env python3
"""Reproducible preliminary topology and state-coverage audit for Bihar BEGIS AC polygons."""
from __future__ import annotations
import hashlib, json, os, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import LinearRing, Polygon, MultiPolygon
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree
from shapely.validation import explain_validity
from shapely import make_valid

ROOT = Path("stage_b_bihar_gis")
RAW = ROOT / "raw"
MANIFEST = ROOT / "manifest.json"
OUT = ROOT / "audit.json"

def load_probe(manifest, source_id):
    for row in manifest.get("geometryProbes", []):
        if row.get("serviceId") == source_id and row.get("artifact"):
            p = ROOT / row["artifact"]
            if p.exists():
                return row, p
    return None, None

def esri_polygon(geometry):
    rings = (geometry or {}).get("rings") or []
    exteriors, holes = [], []
    ring_issues = []
    for ring in rings:
        try:
            lr = LinearRing(ring)
            if len(ring) < 4 or ring[0][:2] != ring[-1][:2]:
                ring_issues.append({"pointCount":len(ring),"closed":bool(ring and ring[0][:2] == ring[-1][:2])})
            (holes if lr.is_ccw else exteriors).append(ring)
        except Exception as exc:
            ring_issues.append({"error":f"{type(exc).__name__}: {exc}"})
    if not exteriors and rings:
        exteriors, holes = [rings[0]], rings[1:]
    outer_polys = [Polygon(r) for r in exteriors]
    assigned = {i: [] for i in range(len(exteriors))}
    orphan_holes = 0
    for hole in holes:
        hp = Polygon(hole)
        pt = hp.representative_point()
        candidates = [(outer.area, i) for i, outer in enumerate(outer_polys) if outer.covers(pt)]
        if candidates:
            assigned[min(candidates)[1]].append(hole)
        else:
            orphan_holes += 1
    parts = [Polygon(exteriors[i], assigned[i]) for i in range(len(exteriors))]
    geom = parts[0] if len(parts) == 1 else MultiPolygon(parts)
    return geom, ring_issues, orphan_holes, max(0, len(parts)-1)

def main():
    if not MANIFEST.exists():
        OUT.write_text(json.dumps({"overallStatus":"MANIFEST_MISSING","completedAtUtc":datetime.now(timezone.utc).isoformat()},indent=2)+"\n")
        return 1
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    ac_probe, ac_path = load_probe(manifest, "bihar-assembly")
    if not ac_path:
        OUT.write_text(json.dumps({"overallStatus":"AC_GEOMETRY_NOT_ACQUIRED","completedAtUtc":datetime.now(timezone.utc).isoformat()},indent=2)+"\n")
        return 1
    raw = ac_path.read_bytes()
    data = json.loads(raw)
    features = data.get("features", [])
    rows, geoms, invalid, ring_issues, orphan_holes = [], [], [], [], []
    multipart_count = 0
    for feature in features:
        attrs = feature.get("attributes") or {}
        geom, rings_bad, orphan_count, multipart = esri_polygon(feature.get("geometry"))
        rows.append({"code":attrs.get("CONS_CODE"),"name":attrs.get("CONS_NAME"),"altName":attrs.get("CONST_NAME"),
                     "district":attrs.get("DIST_NAME"),"pcName":attrs.get("PC_NAME"),"pcNo":attrs.get("PC_NO"),
                     "objectId":attrs.get("OBJECTID"),"geometry":geom})
        geoms.append(geom)
        multipart_count += multipart
        for issue in rings_bad: ring_issues.append({"code":attrs.get("CONS_CODE"),"name":attrs.get("CONS_NAME"),**issue})
        if orphan_count: orphan_holes.append({"code":attrs.get("CONS_CODE"),"name":attrs.get("CONS_NAME"),"orphanHoleCount":orphan_count})
        if not geom.is_valid:
            invalid.append({"code":attrs.get("CONS_CODE"),"name":attrs.get("CONS_NAME"),"reason":explain_validity(geom)})
    codes = [r["code"] for r in rows]
    names = [r["name"] for r in rows]
    code_counts, name_counts = Counter(codes), Counter(names)
    # Project to UTM 45N for overlap/area screening; raw geometry remains untouched.
    project = Transformer.from_crs("EPSG:4326","EPSG:32645",always_xy=True).transform
    projected = [transform(project, g) for g in geoms]
    valid_for_screening = [make_valid(g) for g in projected]
    tree = STRtree(valid_for_screening)
    overlaps, tiny = [], 0
    for i, g in enumerate(valid_for_screening):
        for j in tree.query(g):
            j = int(j)
            if j <= i: continue
            inter = g.intersection(valid_for_screening[j])
            if inter.is_empty: continue
            area = inter.area
            if area > 1.0:
                overlaps.append({"a":rows[i]["code"],"an":rows[i]["name"],"b":rows[j]["code"],"bn":rows[j]["name"],"areaM2":area})
            elif area > 0:
                tiny += 1
    state_probe, state_path = load_probe(manifest, "bihar-state-boundary")
    coverage = {"status":"NOT_AVAILABLE","reason":"No comparable official state boundary geometry was included in the probe artifact."}
    if state_path:
        sd = json.loads(state_path.read_bytes())
        state_features = sd.get("features", [])
        bihar = []
        for f in state_features:
            attrs = f.get("attributes") or {}
            state_name = str(attrs.get("State_Name") or attrs.get("ST_NAME") or attrs.get("STATE_NAME") or attrs.get("NAME_1") or "").strip().upper()
            if state_name in ("BIHAR", "BIHAR STATE"):
                sg, _, _, _ = esri_polygon(f.get("geometry"))
                bihar.append(sg)
        if bihar:
            state_geom = make_valid(transform(project, unary_union(bihar)))
            ac_union = unary_union(valid_for_screening)
            outside = ac_union.difference(state_geom).area
            uncovered = state_geom.difference(ac_union).area
            coverage = {
                "status":"SCREENING_ONLY",
                "stateFeatureCount":len(bihar),
                "stateFeatureNames":["BIHAR"],
                "stateAreaM2":state_geom.area,
                "acUnionAreaM2":ac_union.area,
                "acOutsideStateM2":outside,
                "stateUncoveredByAcM2":uncovered,
                "symmetricDifferenceM2":outside+uncovered,
                "coveragePercent":100*(state_geom.area-uncovered)/state_geom.area if state_geom.area else None,
                "geometryRepairUsedForComparisonOnly":True,
                "warning":"State boundary may have different vintage/generalization; this comparison is not legal boundary acceptance."
            }
        else:
            coverage = {"status":"NOT_AVAILABLE","reason":"State boundary response acquired but no feature with ST_NAME/STATE_NAME/NAME_1 equal to BIHAR was found.",
                        "featureCount":len(state_features),"attributeSample":[f.get("attributes",{}) for f in state_features[:2]]}
    report = {
        "schemaVersion":1,
        "title":"Preliminary topology audit of official Bihar BEGIS Assembly layer candidate",
        "completedAtUtc":datetime.now(timezone.utc).isoformat(),
        "workflowRunId":os.getenv("GITHUB_RUN_ID"),
        "sourceServiceUrl":"https://gisserver.bihar.gov.in/arcgis/rest/services/ELECTION/AC/MapServer",
        "sourceQueryUrl":ac_probe.get("finalUrl") or ac_probe.get("requestUrl"),
        "sourceResponseArtifact":ac_probe.get("artifact"),
        "sourceResponseBytes":len(raw),
        "sourceResponseSha256":hashlib.sha256(raw).hexdigest(),
        "featureCount":len(rows),
        "geometryType":data.get("geometryType"),
        "spatialReference":data.get("spatialReference"),
        "fields":[x.get("name") for x in data.get("fields",[])],
        "uniqueConsCodeCount":len(set(codes)),
        "consCodeMin":min(codes) if codes else None,
        "consCodeMax":max(codes) if codes else None,
        "missingConsCodeCount":sum(x is None for x in codes),
        "duplicateConsCodes":{str(k):v for k,v in code_counts.items() if v>1},
        "uniqueConsNameCount":len(set(names)),
        "duplicateConsNames":{str(k):v for k,v in name_counts.items() if v>1},
        "uniqueObjectIdCount":len({r["objectId"] for r in rows}),
        "invalidFeatureGeometryCount":len(invalid),
        "invalidFeatureGeometry":invalid,
        "unclosedOrShortRingCount":len(ring_issues),
        "unclosedOrShortRings":ring_issues,
        "orphanHoleRingCount":len(orphan_holes),
        "orphanHoleRings":orphan_holes,
        "multipleExteriorPartsFeatureCount":multipart_count,
        "interconstituencyPositiveOverlapPairsOver1m2":len(overlaps),
        "largestOverlapPairs":sorted(overlaps,key=lambda x:x["areaM2"],reverse=True)[:25],
        "tinyPositiveOverlapPairsAtOrBelow1m2":tiny,
        "overlapAreaProjection":"EPSG:32645 (UTM zone 45N); screening threshold > 1 m²",
        "stateBoundaryCoverageComparison":coverage,
        "limitations":[
            "ArcGIS ring orientation was used to classify exterior/hole rings; multipart conversion requires independent review.",
            "Invalid geometries are not repaired in the source; make_valid is used only for overlap and state-coverage comparison.",
            "No legal-vintage, licence, Gazette-chain, or source-owner confirmation has been established.",
            "PIN Code Boundary is a separate administrative layer and is not accepted as India Post delivery-beat geometry."
        ],
        "disposition":"OFFICIAL GOVERNMENT GEOMETRY CANDIDATE; TOPOLOGY SCREENING FINDINGS REQUIRE REVIEW; NOT CANONICAL; DO NOT PROMOTE TO PRODUCTION",
        "databaseAccess":"NONE"
    }
    OUT.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({k:report[k] for k in ("featureCount","uniqueConsCodeCount","invalidFeatureGeometryCount","interconstituencyPositiveOverlapPairsOver1m2","stateBoundaryCoverageComparison","disposition")},indent=2,ensure_ascii=False))
    return 0

if __name__ == "__main__":
    sys.exit(main())
