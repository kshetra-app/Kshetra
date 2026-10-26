#!/usr/bin/env python3
"""Discover and probe the public Bihar election GIS service linked by the official BEGIS portal.

No credentials, database access, or access-control bypass. HTTPS is preferred; the
public service's published HTTP endpoint may be tested only as a documented
read-only discovery fallback and is never considered sufficient provenance alone.
"""
from __future__ import annotations
import hashlib, json, re, sys
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse, parse_qsl, urlencode
from curl_cffi import requests

ROOT = Path("stage_b_bihar_gis")
RAW = ROOT / "raw"
ROOT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)
START = "https://gis.bihar.gov.in/DEPTS/ElectionNew.aspx"
ALLOWED_HOSTS = {"gis.bihar.gov.in", "gisserver.bihar.gov.in"}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36",
    "Accept": "text/html,application/json,application/javascript,*/*;q=0.9",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": START,
}
manifest = {
    "schemaVersion": 2,
    "title": "W021.5 Stage B Bihar official election GIS endpoint discovery and read-only geometry probe",
    "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
    "scope": "read-only public-source discovery; no database access",
    "startUrl": START,
    "status": "PARTIAL",
    "requests": [],
    "discoveredServiceUrls": [],
    "serviceMetadata": [],
    "geometryProbes": [],
    "notes": [
        "The official Bihar Election Geo-Intelligence System page lists Assembly and Pin Code Boundary layers.",
        "The official page's JavaScript publishes http://gisserver.bihar.gov.in/arcgis/rest/services/ and relative ELECTION/AC/MapServer and AdministrativrBoundaries/PIN_Code_Boundary/MapServer layer paths.",
        "HTTPS is tried first. Public HTTP is used only as a read-only fallback when the official page itself explicitly publishes that service URL; HTTP transport is a provenance warning and does not close acceptance.",
        "A PIN code boundary is not automatically an India Post delivery-beat polygon.",
        "A structurally checked feature response is not full topology validation or legal-vintage acceptance."
    ],
}
session = requests.Session(impersonate="chrome124")
queue = [START]
seen = set()
while queue and len(seen) < 25:
    url = queue.pop(0)
    if url in seen: continue
    seen.add(url)
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
        continue
    row = {"url": url, "retrievedAtUtc": datetime.now(timezone.utc).isoformat()}
    try:
        response = session.get(url, headers=HEADERS, timeout=25, allow_redirects=True)
        final = urlparse(response.url)
        if final.scheme != "https" or final.hostname not in ALLOWED_HOSTS:
            row.update({"status": "REDIRECT_OUTSIDE_ALLOWLIST", "finalUrl": response.url})
            manifest["requests"].append(row)
            continue
        raw = response.content
        name = f"page_{len(manifest['requests'])+1}.bin"
        (RAW / name).write_bytes(raw)
        row.update({
            "status": "HTTP_OK" if response.status_code == 200 else "HTTP_ERROR",
            "httpStatus": response.status_code,
            "contentType": response.headers.get("Content-Type"),
            "finalUrl": response.url,
            "byteLength": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "artifact": f"raw/{name}",
        })
        manifest["requests"].append(row)
        if response.status_code != 200:
            continue
        text = unescape(raw.decode(response.encoding or "utf-8", errors="replace"))
        found = re.findall(r"https?://[^\s\"'<>]+", text)
        found += [urljoin(response.url, x) for x in re.findall(r"(?:src|href)\s*=\s*[\"']([^\"']+)[\"']", text, re.I)]
        found = list(dict.fromkeys(x.replace("&amp;", "&").rstrip(");,") for x in found))
        for candidate in found:
            p = urlparse(candidate)
            if p.scheme == "https" and p.hostname == "gis.bihar.gov.in":
                if p.path.lower().endswith((".js", ".aspx", ".ashx")) and candidate not in seen and candidate not in queue:
                    queue.append(candidate)
            if p.hostname in ALLOWED_HOSTS and re.search(r"(MapServer|FeatureServer)", p.path, re.I):
                if candidate not in manifest["discoveredServiceUrls"]:
                    manifest["discoveredServiceUrls"].append(candidate)
        # The official map script uses a service-root variable plus relative service paths.
        roots = re.findall(r"""(?:var|let|const)\s+Url\s*=\s*["'](https?://[^"']+/arcgis/rest/services/)["']""", text, re.I)
        for root in roots:
            root = root.rstrip("/") + "/"
            for rel in ("ELECTION/AC/MapServer", "AdministrativrBoundaries/PIN_Code_Boundary/MapServer"):
                candidate = urljoin(root, rel)
                if candidate not in manifest["discoveredServiceUrls"]:
                    manifest["discoveredServiceUrls"].append(candidate)
    except Exception as exc:
        row.update({"status": "REQUEST_FAILED", "error": f"{type(exc).__name__}: {exc}"})
        manifest["requests"].append(row)

def request_service(url: str, params: dict | None = None):
    p = urlparse(url)
    if p.hostname not in ALLOWED_HOSTS or p.scheme not in ("https", "http"):
        raise RuntimeError("SERVICE_URL_NOT_ALLOWLISTED")
    query = dict(parse_qsl(p.query, keep_blank_values=True))
    if params: query.update(params)
    target = urlunparse(p._replace(query=urlencode(query)))
    response = session.get(target, headers=HEADERS, timeout=30, allow_redirects=True)
    final = urlparse(response.url)
    if final.hostname not in ALLOWED_HOSTS or final.scheme not in ("https", "http"):
        raise RuntimeError("SERVICE_REDIRECT_OUTSIDE_ALLOWLIST")
    return response, target

def save_response(prefix: str, response):
    raw = response.content
    name = f"{prefix}_{len(list(RAW.glob(prefix + '_*.bin'))) + 1}.bin"
    (RAW / name).write_bytes(raw)
    return {"httpStatus": response.status_code, "contentType": response.headers.get("Content-Type"),
            "finalUrl": response.url, "transport": urlparse(response.url).scheme.upper(),
            "byteLength": len(raw), "sha256": hashlib.sha256(raw).hexdigest(), "artifact": f"raw/{name}"}

# Probe only the two services explicitly named in the official page's JavaScript.
known_services = {
    "bihar-assembly": "ELECTION/AC/MapServer",
    "bihar-pin-code-boundary": "AdministrativrBoundaries/PIN_Code_Boundary/MapServer",
    "bihar-state-boundary": "AdministrativrBoundaries/StateBoundary/MapServer",
}
for key, rel in known_services.items():
    candidates = [
        "https://gisserver.bihar.gov.in/arcgis/rest/services/" + rel,
        "http://gisserver.bihar.gov.in/arcgis/rest/services/" + rel,
    ]
    service_row = {"serviceId": key, "publishedRelativePath": rel, "attempts": []}
    chosen_url = None
    metadata = None
    for candidate in candidates:
        try:
            response, target = request_service(candidate, {"f": "pjson"})
            saved = save_response(key + "_metadata", response)
            attempt = {"requestUrl": target, **saved}
            service_row["attempts"].append(attempt)
            if response.status_code == 200:
                try:
                    metadata = response.json()
                    chosen_url = response.url.split("?")[0]
                    service_row["metadata"] = {
                        "serviceDescription": metadata.get("serviceDescription"),
                        "mapName": metadata.get("mapName"),
                        "capabilities": metadata.get("capabilities"),
                        "maxRecordCount": metadata.get("maxRecordCount"),
                        "spatialReference": metadata.get("spatialReference"),
                        "layers": [{"id": x.get("id"), "name": x.get("name"), "type": x.get("type")} for x in metadata.get("layers", [])],
                        "tables": [{"id": x.get("id"), "name": x.get("name")} for x in metadata.get("tables", [])],
                    }
                    break
                except Exception as exc:
                    service_row["metadataParseError"] = f"{type(exc).__name__}: {exc}"
        except Exception as exc:
            service_row["attempts"].append({"requestUrl": candidate, "error": f"{type(exc).__name__}: {exc}"})
    if chosen_url and metadata:
        if key == "bihar-assembly":
            layer_rows = metadata.get("layers", [])
            candidate_ids = [x.get("id") for x in layer_rows if re.search(r"assembly|ac|constituency", str(x.get("name", "")), re.I)]
            if not candidate_ids:
                candidate_ids = [0] if not layer_rows else [x.get("id") for x in layer_rows]
            for layer_id in candidate_ids:
                query_url = chosen_url.rstrip("/") + f"/{layer_id}/query"
                try:
                    response, target = request_service(query_url, {
                        "where": "1=1", "outFields": "*", "returnGeometry": "true",
                        "outSR": "4326", "f": "json", "resultRecordCount": "1000"
                    })
                    row = {"serviceId": key, "layerId": layer_id, "requestUrl": target, **save_response(key + "_geometry", response)}
                    if response.status_code == 200:
                        data = response.json()
                        features = data.get("features", [])
                        object_ids, ac_numbers, names = [], [], []
                        missing_geometry = 0
                        unclosed_rings = 0
                        nonfinite_coordinates = 0
                        for feature in features:
                            attrs = feature.get("attributes") or {}
                            oid_field = data.get("objectIdFieldName")
                            if oid_field and attrs.get(oid_field) is not None: object_ids.append(str(attrs[oid_field]))
                            for k in ("AC_NO", "ACNO", "AC_NUMBER", "AC_CODE", "AC_NAME", "AC_NAME_EN", "NAME", "Assembly_Name"):
                                if attrs.get(k) not in (None, ""):
                                    if k in ("AC_NO", "ACNO", "AC_NUMBER", "AC_CODE"):
                                        ac_numbers.append(str(attrs[k]))
                                    else:
                                        names.append(str(attrs[k]))
                                    break
                            geom = feature.get("geometry")
                            if not isinstance(geom, dict) or not geom.get("rings"):
                                missing_geometry += 1
                                continue
                            for ring in geom.get("rings", []):
                                if not isinstance(ring, list) or len(ring) < 4 or ring[0][:2] != ring[-1][:2]:
                                    unclosed_rings += 1
                                for point in ring:
                                    if not isinstance(point, list) or len(point) < 2 or not all(isinstance(v, (int,float)) for v in point[:2]):
                                        nonfinite_coordinates += 1
                        row["geometrySummary"] = {
                            "geometryType": data.get("geometryType"),
                            "featureCount": len(features),
                            "expectedFeatureCountFromPortal": 243,
                            "expectedCountStatus": "PASS" if len(features) == 243 else "MISMATCH",
                            "objectIdFieldName": data.get("objectIdFieldName"),
                            "uniqueObjectIdsObserved": len(set(object_ids)),
                            "uniqueACNumbersObserved": len(set(ac_numbers)),
                            "uniqueNamesObserved": len(set(names)),
                            "missingGeometryFeatures": missing_geometry,
                            "unclosedOrShortRings": unclosed_rings,
                            "nonNumericCoordinates": nonfinite_coordinates,
                            "spatialReference": data.get("spatialReference"),
                            "exceededTransferLimit": data.get("exceededTransferLimit", False),
                            "topologyValidated": False,
                            "acceptance": "CANDIDATE_ONLY",
                        }
                    manifest["geometryProbes"].append(row)
                except Exception as exc:
                    manifest["geometryProbes"].append({"serviceId": key, "layerId": layer_id, "error": f"{type(exc).__name__}: {exc}"})
        elif key == "bihar-state-boundary":
            layer_rows = metadata.get("layers", [])
            candidate_ids = [x.get("id") for x in layer_rows if re.search(r"state", str(x.get("name", "")), re.I)] or ([0] if not layer_rows else [x.get("id") for x in layer_rows])
            for layer_id in candidate_ids:
                query_url = chosen_url.rstrip("/") + f"/{layer_id}/query"
                try:
                    response, target = request_service(query_url, {"where":"1=1","outFields":"*","returnGeometry":"true","outSR":"4326","f":"json","resultRecordCount":"100"})
                    row = {"serviceId": key, "layerId": layer_id, "requestUrl": target, **save_response(key + "_geometry", response)}
                    if response.status_code == 200:
                        data = response.json()
                        features = data.get("features", [])
                        names = [str((f.get("attributes") or {}).get("ST_NAME") or (f.get("attributes") or {}).get("STATE_NAME") or "") for f in features]
                        row["geometrySummary"] = {"featureCount":len(features),"stateNames":sorted(set(x for x in names if x)),"geometryType":data.get("geometryType"),"spatialReference":data.get("spatialReference"),"topologyValidated":False,"acceptance":"COMPARISON_CANDIDATE_ONLY"}
                    manifest["geometryProbes"].append(row)
                except Exception as exc:
                    manifest["geometryProbes"].append({"serviceId": key, "layerId": layer_id, "error": f"{type(exc).__name__}: {exc}"})
        else:
            try:
                response, target = request_service(chosen_url.rstrip("/") + "/0/query", {"where":"1=1","returnCountOnly":"true","f":"json"})
                row = {"serviceId": key, "requestUrl": target, **save_response(key + "_count", response)}
                if response.status_code == 200:
                    row["featureCount"] = response.json().get("count")
                    row["note"] = "PIN polygon count only; not acquired as delivery-beat geometry."
                manifest["geometryProbes"].append(row)
            except Exception as exc:
                manifest["geometryProbes"].append({"serviceId": key, "error": f"{type(exc).__name__}: {exc}"})
    manifest["serviceMetadata"].append(service_row)

manifest["completedAtUtc"] = datetime.now(timezone.utc).isoformat()
manifest["overallStatus"] = "SERVICE_METADATA_ACQUIRED" if any(x.get("metadata") for x in manifest["serviceMetadata"]) else "PORTAL_REACHABLE_SERVICE_METADATA_NOT_ACQUIRED"
(ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({
    "overallStatus": manifest["overallStatus"],
    "requestCount": len(manifest["requests"]),
    "serviceUrls": manifest["discoveredServiceUrls"],
    "serviceMetadataCount": len(manifest["serviceMetadata"]),
    "geometryProbeCount": len(manifest["geometryProbes"]),
    "manifest": str(ROOT / "manifest.json"),
}, indent=2))
if manifest["overallStatus"] != "SERVICE_METADATA_ACQUIRED":
    sys.exit(1)
