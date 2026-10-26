#!/usr/bin/env python3
"""Read-only W021.5 Stage B source acquisition probe.

Downloads only allowlisted public ECI/state-GIS source URLs. It never writes to a
database, never changes application data, and never treats a third-party mirror
as official truth. All retrieved bytes and a machine-readable manifest are saved
under stage_b_acquisition/ for an Actions artifact.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urljoin, urlparse

from curl_cffi import requests

OUT = Path("stage_b_acquisition")
RAW = OUT / "raw"
NORMALIZED = OUT / "normalized"
RAW.mkdir(parents=True, exist_ok=True)
NORMALIZED.mkdir(parents=True, exist_ok=True)

ALLOWED_HOSTS = {"results.eci.gov.in", "tgrac.telangana.gov.in"}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36",
    "Referer": "https://results.eci.gov.in/",
    "Accept": "application/json, text/javascript, */*;q=0.9",
}
ECI_STATES = [
    {"code": "S03", "name": "assam", "expected_features": 126},
    {"code": "U07", "name": "puducherry", "expected_features": 30},
    {"code": "S11", "name": "kerala", "expected_features": 140},
    {"code": "S22", "name": "tamil_nadu", "expected_features": 234},
    {"code": "S25", "name": "west_bengal", "expected_features": 294},
]
SOURCES = [
    {
        "id": f"eci-result-{x['code']}",
        "kind": "official_ecI_result_portal_candidate",
        "url": f"https://results.eci.gov.in/ResultAcGenMay2026/ac/{x['code']}.js",
        "state_code": x["code"],
        "state_name": x["name"],
        "expected_features": x["expected_features"], "required": False,
    }
    for x in ECI_STATES
]
TELANGANA_LAYER = "https://tgrac.telangana.gov.in/arcgis/rest/services/AdministrativeInfoSystem_Folder/Administrative_Information_System/MapServer/24"
SOURCES.extend([
    {"id": "telangana-layer-metadata", "kind": "official_state_gis_metadata_candidate", "url": TELANGANA_LAYER + "?f=pjson", "required": False},
    {"id": "telangana-ac-geometry", "kind": "official_state_gis_geometry_candidate", "url": TELANGANA_LAYER + "/query?" + urlencode({
        "where": "1=1", "outFields": "*", "returnGeometry": "true", "outSR": "4326", "f": "json"
    }), "required": True},
])
TELANGANA_2026_LAYER = "https://tgrac.telangana.gov.in/arcgis/rest/services/EndowmentLands_Folder/EndowmentLands_Admin_2026/MapServer/12"
SOURCES.extend([
    {"id": "telangana-2026-layer-metadata", "kind": "official_state_gis_2026_service_candidate", "url": TELANGANA_2026_LAYER + "?f=pjson", "required": False},
    {"id": "telangana-2026-ac-geometry", "kind": "official_state_gis_2026_geometry_candidate", "url": TELANGANA_2026_LAYER + "/query?" + urlencode({
        "where": "1=1", "outFields": "*", "returnGeometry": "true", "outSR": "4326", "f": "json"
    }), "expected_features": 119, "required": True},
])
TELANGANA_ADMIN_NEW = "https://tgrac.telangana.gov.in/arcgis/rest/services/EndowmentLands_Folder/Endowment_Lands_Admin_New/MapServer/12"
TELANGANA_ADMIN_OLD = "https://tgrac.telangana.gov.in/arcgis/rest/services/EndowmentLands_Folder/Endowment_Lands_Old/MapServer/13"
# Newly discovered official TGRAC master administrative-boundary service (EPSG:4326).
# Treat it as an additional candidate only; acquisition and topology/legal review decide its disposition.
TELANGANA_MASTER_LAYER = "https://tgrac.telangana.gov.in/arcgis/rest/services/Master_Administrative_Folder/Master_Administrative_Boundary/MapServer/0"
SOURCES.extend([
    {"id": "telangana-master-layer-metadata", "kind": "official_state_gis_master_service_candidate", "url": TELANGANA_MASTER_LAYER + "?f=pjson", "required": False},
    {"id": "telangana-master-ac-geometry", "kind": "official_state_gis_master_geometry_candidate", "url": TELANGANA_MASTER_LAYER + "/query?" + urlencode({"where":"1=1","outFields":"*","returnGeometry":"true","outSR":"4326","f":"json"}), "expected_features":119, "required": False},
])
SOURCES.extend([
    {"id": "telangana-admin-new-layer-metadata", "kind": "official_state_gis_new_service_candidate", "url": TELANGANA_ADMIN_NEW + "?f=pjson"},
    {"id": "telangana-admin-new-ac-geometry", "kind": "official_state_gis_new_geometry_candidate", "url": TELANGANA_ADMIN_NEW + "/query?" + urlencode({"where":"1=1","outFields":"*","returnGeometry":"true","outSR":"4326","f":"json"}), "expected_features":119, "required":False},
    {"id": "telangana-admin-old-layer-metadata", "kind": "official_state_gis_old_service_candidate", "url": TELANGANA_ADMIN_OLD + "?f=pjson"},
    {"id": "telangana-admin-old-ac-geometry", "kind": "official_state_gis_old_geometry_candidate", "url": TELANGANA_ADMIN_OLD + "/query?" + urlencode({"where":"1=1","outFields":"*","returnGeometry":"true","outSR":"4326","f":"json"}), "expected_features":119},
])



def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def parse_js_geojson(raw: bytes) -> dict:
    text = raw.decode("utf-8-sig")
    starts = [i for i in (text.find("{"), text.find("[")) if i >= 0]
    if not starts:
        raise ValueError("No JSON object/array opener found in JavaScript response")
    payload = text[min(starts):].strip().rstrip(";").strip()
    data = json.loads(payload)
    if isinstance(data, list):
        data = {"type": "FeatureCollection", "features": data}
    if not isinstance(data, dict):
        raise ValueError("Parsed source is not a JSON object or feature list")
    if data.get("type") != "FeatureCollection":
        if data.get("type") == "Feature":
            data = {"type": "FeatureCollection", "features": [data]}
        else:
            raise ValueError(f"Expected FeatureCollection, got {data.get('type')!r}")
    if not isinstance(data.get("features"), list):
        raise ValueError("FeatureCollection has no features array")
    return data

def geom_checks(data: dict) -> dict:
    features = data.get("features", [])
    types: dict[str, int] = {}
    ids: list[str] = []
    names: list[str] = []
    missing_geometry = empty_coordinates = unclosed_rings = nonfinite = bad_types = non_polygon = 0
    bbox = [math.inf, math.inf, -math.inf, -math.inf]
    ring_min = None

    id_keys = ("AC_NO", "AC_NO_", "AC_NUMBER", "AC_NUM", "AC_CODE", "ACNO", "ac_no", "AC_ID", "Assembly", "OBJECTID", "FID")
    name_keys = ("AC_NAME", "AC_NAME_EN", "AC_NAME_ENG", "ACNAME", "NAME", "name", "AC_NAME_E", "Assembly_Name")

    def visit_coords(node):
        nonlocal unclosed_rings, nonfinite, ring_min
        if not isinstance(node, list):
            return
        if len(node) >= 2 and isinstance(node[0], (int, float)) and isinstance(node[1], (int, float)):
            x, y = node[0], node[1]
            if not math.isfinite(x) or not math.isfinite(y):
                nonfinite += 1
            else:
                bbox[0] = min(bbox[0], x); bbox[1] = min(bbox[1], y)
                bbox[2] = max(bbox[2], x); bbox[3] = max(bbox[3], y)
            return
        if len(node) >= 4 and all(isinstance(p, list) and len(p) >= 2 and isinstance(p[0], (int, float)) and isinstance(p[1], (int, float)) for p in node):
            ring_min = len(node) if ring_min is None else min(ring_min, len(node))
            if node[0][0] != node[-1][0] or node[0][1] != node[-1][1]:
                unclosed_rings += 1
            for point in node:
                visit_coords(point)
            return
        for child in node:
            visit_coords(child)

    for feature in features:
        if not isinstance(feature, dict):
            bad_types += 1
            continue
        geom = feature.get("geometry")
        geom_type = geom.get("type") if isinstance(geom, dict) else "MISSING"
        types[geom_type or "MISSING"] = types.get(geom_type or "MISSING", 0) + 1
        if geom_type not in ("Polygon", "MultiPolygon"):
            non_polygon += 1
        if not isinstance(geom, dict):
            missing_geometry += 1
            continue
        coords = geom.get("coordinates")
        if not isinstance(coords, list) or not coords:
            empty_coordinates += 1
        else:
            visit_coords(coords)
        props = feature.get("properties") or {}
        if not ids:
            pass
        for key in id_keys:
            if props.get(key) not in (None, ""):
                ids.append(str(props[key])); break
        for key in name_keys:
            if props.get(key) not in (None, ""):
                names.append(str(props[key])); break

    feature_count = len(features)
    return {
        "feature_count": feature_count,
        "geometry_types": types,
        "missing_geometry": missing_geometry,
        "empty_coordinates": empty_coordinates,
        "unclosed_rings": unclosed_rings,
        "non_finite_coordinates": nonfinite,
        "non_feature_objects": bad_types,
        "non_polygon_geometries": non_polygon,
        "id_values_observed": len(ids),
        "unique_ids_observed": len(set(ids)),
        "duplicate_ids_observed": len(ids) - len(set(ids)),
        "name_values_observed": len(names),
        "unique_names_observed": len(set(names)),
        "duplicate_names_observed": len(names) - len(set(names)),
        "minimum_ring_vertices": ring_min,
        "coordinate_bbox": bbox if math.isfinite(bbox[0]) else None,
        "declared_crs": data.get("crs"),
        "structural_sanity": "PASS" if feature_count > 0 and not (missing_geometry or empty_coordinates or unclosed_rings or nonfinite or bad_types or non_polygon) and len(ids) == feature_count and len(set(ids)) == feature_count and len(names) == feature_count and len(set(names)) == feature_count else "FAIL",
        "topology_validated": False,
    }

manifest = {
    "title": "W021.5 Stage B official-source acquisition probe",
    "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
    "directive": "CTO Directive 154 — Stage B only",
    "read_only": True,
    "production_database_access": "NONE",
    "staging_database_access": "NONE",
    "sources": [],
    "overall_status": "PARTIAL",
    "limitations": [
        "Structural sanity checks are not full polygon topology validation.",
        "Legal Gazette/order effective-date reconciliation is not performed by this script.",
        "A successful HTTP response does not by itself establish that a layer is the legally authoritative current boundary.",
        "Community mirror artifacts are not fetched or vendored by this script."
    ],
}
failures = []
warnings = []

def fetch_allowlisted(initial_url: str):
    current = initial_url
    for _ in range(6):
        parsed = urlparse(current)
        if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
            raise RuntimeError(f"URL_NOT_ALLOWLISTED: {current}")
        response = requests.get(
            current, headers=HEADERS, timeout=45,
            impersonate="chrome124", allow_redirects=False
        )
        if response.status_code in (301, 302, 303, 307, 308):
            location = response.headers.get("Location")
            if not location:
                raise RuntimeError("REDIRECT_WITHOUT_LOCATION")
            current = urljoin(current, location)
            continue
        return response, response.content, current
    raise RuntimeError("TOO_MANY_REDIRECTS")

for source in SOURCES:
    record = {
        "source_id": source["id"], "kind": source["kind"], "url": source["url"],
        "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
        "status": "NOT_ACQUIRED",
    }
    try:
        response, raw, final_url = fetch_allowlisted(source["url"])
        record.update({
            "http_status": response.status_code,
            "content_type": response.headers.get("Content-Type"),
            "etag": response.headers.get("ETag"),
            "last_modified": response.headers.get("Last-Modified"),
            "final_url": final_url,
            "byte_length": len(raw),
            "raw_sha256": sha256(raw),
        })
        safe_name = re.sub(r"[^A-Za-z0-9_.-]", "_", source["id"])
        (RAW / f"{safe_name}.bin").write_bytes(raw)
        record["raw_artifact"] = f"raw/{safe_name}.bin"
        if response.status_code < 200 or response.status_code >= 300:
            raise RuntimeError(f"HTTP {response.status_code}")
        if not raw:
            raise RuntimeError("Empty response body")

        if source["kind"] == "official_ecI_result_portal_candidate":
            data = parse_js_geojson(raw)
            normalized = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            (NORMALIZED / f"{source['state_code']}_{source['state_name']}.geojson").write_bytes(normalized)
            checks = geom_checks(data)
            checks["expected_feature_count"] = source["expected_features"]
            checks["expected_feature_count_status"] = "PASS" if checks["feature_count"] == source["expected_features"] else "FAIL"
            checks["normalised_geojson_sha256"] = sha256(normalized)
            checks["normalised_geojson_bytes"] = len(normalized)
            record["geometry_checks"] = checks
            record["normalised_artifact"] = f"normalized/{source['state_code']}_{source['state_name']}.geojson"
            if checks["structural_sanity"] != "PASS" or checks["expected_feature_count_status"] != "PASS":
                raise RuntimeError("GeoJSON structural sanity or expected feature count failed")
        elif source["id"].startswith("telangana") and source["id"].endswith("-ac-geometry"):
            data = json.loads(raw.decode("utf-8-sig"))
            if data.get("error"):
                raise RuntimeError("ArcGIS query error: " + json.dumps(data["error"], ensure_ascii=False))
            features = data.get("features")
            if not isinstance(features, list) or not features:
                raise RuntimeError("ArcGIS query did not return a non-empty feature array")
            ids, names, assembly_values = [], [], []
            missing_geometry = empty_rings = unclosed_rings = nonfinite = 0
            bbox = [float("inf"), float("inf"), -float("inf"), -float("inf")]
            ring_count = 0
            for feature in features:
                attrs = feature.get("attributes") or {}
                if attrs.get("OBJECTID") not in (None, ""): ids.append(str(attrs["OBJECTID"]))
                for name_key in ("Assembly_Name", "ASSEMBLY_N", "Ass_Name", "AC_NAME"):
                    if attrs.get(name_key) not in (None, ""):
                        names.append(str(attrs[name_key])); break
                for assembly_key in ("Assembly", "Ass_Name", "ASSEMBLY_N"):
                    if attrs.get(assembly_key) not in (None, ""):
                        assembly_values.append(str(attrs[assembly_key])); break
                geometry = feature.get("geometry") or {}
                rings = geometry.get("rings")
                if not isinstance(rings, list) or not rings:
                    missing_geometry += 1
                    continue
                for ring in rings:
                    ring_count += 1
                    if not isinstance(ring, list) or len(ring) < 4:
                        empty_rings += 1
                        continue
                    if ring[0][:2] != ring[-1][:2]:
                        unclosed_rings += 1
                    for point in ring:
                        if not isinstance(point, list) or len(point) < 2 or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in point[:2]):
                            nonfinite += 1
                        else:
                            x, y = point[0], point[1]
                            bbox[0] = min(bbox[0], x); bbox[1] = min(bbox[1], y)
                            bbox[2] = max(bbox[2], x); bbox[3] = max(bbox[3], y)
            record["geometry_checks"] = {
                "feature_count": len(features),
                "geometry_type": data.get("geometryType"),
                "geometry_types": {"esriGeometryPolygon": len(features)} if data.get("geometryType") == "esriGeometryPolygon" else {"UNKNOWN": len(features)},
                "ring_count": ring_count,
                "missing_geometry_features": missing_geometry,
                "rings_too_short": empty_rings,
                "unclosed_rings": unclosed_rings,
                "non_finite_coordinates": nonfinite,
                "unique_object_ids": len(set(ids)),
                "duplicate_object_ids": len(ids) - len(set(ids)),
                "unique_assembly_names": len(set(names)),
                "duplicate_assembly_names": len(names) - len(set(names)),
                "unique_assembly_values": len(set(assembly_values)),
                "coordinate_bbox": bbox if math.isfinite(bbox[0]) else None,
                "spatial_reference": data.get("spatialReference"),
                "structural_sanity": "PASS" if len(features) > 0 and len(ids) == len(features) and len(set(ids)) == len(features) and len(names) == len(features) and len(set(names)) == len(features) and not (missing_geometry or empty_rings or unclosed_rings or nonfinite) else "FAIL",
                "topology_validated": False
            }
            if source.get("expected_features") is not None:
                record["geometry_checks"]["expected_feature_count"] = source["expected_features"]
                record["geometry_checks"]["expected_feature_count_status"] = "PASS" if record["geometry_checks"]["feature_count"] == source["expected_features"] else "FAIL"
            if record["geometry_checks"]["structural_sanity"] != "PASS" or record["geometry_checks"].get("expected_feature_count_status", "PASS") != "PASS":
                raise RuntimeError("Telangana ArcGIS polygon structural sanity or expected feature count failed")
        else:
            data = json.loads(raw.decode("utf-8-sig"))
            record["metadata_json_parse"] = "PASS" if isinstance(data, dict) else "FAIL"
            if not isinstance(data, dict):
                raise RuntimeError("Expected JSON metadata object")
        record["status"] = "ACQUIRED_AND_STRUCTURALLY_CHECKED"
    except Exception as exc:
        record["error"] = f"{type(exc).__name__}: {exc}"
        if source.get("required", False):
            record["status"] = "FAILED_REQUIRED_SOURCE"
            record["severity"] = "ERROR"
            failures.append(source["id"])
        else:
            record["status"] = "OPTIONAL_SOURCE_UNAVAILABLE_OR_CHECK_FAILED"
            record["severity"] = "WARNING"
            warnings.append(source["id"])
    manifest["sources"].append(record)

manifest["failed_source_ids"] = failures
manifest["warning_source_ids"] = warnings
manifest["required_source_ids"] = [s["id"] for s in SOURCES if s.get("required", False)]
manifest["overall_status"] = "ACQUIRED_WITH_REQUIRED_FAILURES" if failures else ("ACQUIRED_WITH_WARNINGS" if warnings else "ACQUIRED_STRUCTURAL_CHECKS_PASS")
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({
    "overall_status": manifest["overall_status"],
    "source_count": len(SOURCES),
    "failed_source_ids": failures,
    "warning_source_ids": warnings,
    "manifest": str(OUT / "manifest.json"),
}, indent=2))
if failures:
    sys.exit(1)
