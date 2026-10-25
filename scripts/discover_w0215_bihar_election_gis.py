#!/usr/bin/env python3
"""Discover public official Bihar election GIS service endpoints without bypassing access controls."""
from __future__ import annotations
import hashlib, json, re, sys, time
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
ALLOWED_HOSTS = {"gis.bihar.gov.in"}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36",
    "Accept": "text/html,application/json,application/javascript,*/*;q=0.9",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://gis.bihar.gov.in/",
}
manifest = {
    "schemaVersion": 1,
    "title": "W021.5 Stage B Bihar official election GIS endpoint discovery",
    "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
    "scope": "read-only public-source discovery; no database access",
    "startUrl": START,
    "status": "PARTIAL",
    "requests": [],
    "discoveredServiceUrls": [],
    "serviceMetadata": [],
    "notes": [
        "The public Bihar Election Geo-Intelligence System page lists an Assembly election layer and a Pin Code Boundary layer.",
        "Discovery is not acceptance: legal vintage, source ownership, licence, canonical AC identifiers, topology, and Gazette alignment must still be verified.",
        "Only the explicit allowlisted host is fetched. Cross-host endpoints are recorded but not requested until separately vetted.",
        "No authentication, access-control bypass, or WAF circumvention is attempted."
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
            if p.scheme == "https" and p.hostname and re.search(r"(MapServer|FeatureServer)", p.path, re.I):
                if candidate not in manifest["discoveredServiceUrls"]:
                    manifest["discoveredServiceUrls"].append(candidate)
    except Exception as exc:
        row.update({"status": "REQUEST_FAILED", "error": f"{type(exc).__name__}: {exc}"})
        manifest["requests"].append(row)

# Inspect only service endpoints on the same official host. Preserve raw metadata responses.
for service_url in manifest["discoveredServiceUrls"]:
    p = urlparse(service_url)
    if p.scheme != "https" or p.hostname not in ALLOWED_HOSTS:
        continue
    query = dict(parse_qsl(p.query, keep_blank_values=True))
    query["f"] = "pjson"
    metadata_url = urlunparse(p._replace(query=urlencode(query)))
    row = {"serviceUrl": service_url, "metadataUrl": metadata_url}
    try:
        response = session.get(metadata_url, headers=HEADERS, timeout=25, allow_redirects=True)
        raw = response.content
        name = f"service_{len(manifest['serviceMetadata'])+1}.bin"
        (RAW / name).write_bytes(raw)
        row.update({"httpStatus": response.status_code, "contentType": response.headers.get("Content-Type"),
                    "byteLength": len(raw), "sha256": hashlib.sha256(raw).hexdigest(), "artifact": f"raw/{name}"})
        if response.status_code == 200:
            try:
                data = response.json()
                row["jsonStatus"] = "PASS"
                row["serviceDescription"] = data.get("serviceDescription")
                row["mapName"] = data.get("mapName")
                row["layers"] = [{"id": x.get("id"), "name": x.get("name"), "type": x.get("type")} for x in data.get("layers", [])
                                 if re.search(r"assembly|pin|boundary|constituency", str(x.get("name", "")), re.I)]
                row["tables"] = [{"id": x.get("id"), "name": x.get("name")} for x in data.get("tables", [])]
            except Exception as exc:
                row["jsonStatus"] = "FAIL"
                row["error"] = f"{type(exc).__name__}: {exc}"
        else:
            row["status"] = "HTTP_ERROR"
    except Exception as exc:
        row["error"] = f"{type(exc).__name__}: {exc}"
    manifest["serviceMetadata"].append(row)

manifest["completedAtUtc"] = datetime.now(timezone.utc).isoformat()
manifest["overallStatus"] = "SERVICE_ENDPOINTS_DISCOVERED" if manifest["discoveredServiceUrls"] else "PORTAL_REACHABILITY_OR_ENDPOINT_DISCOVERY_BLOCKED"
(ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"overallStatus": manifest["overallStatus"], "requestCount": len(manifest["requests"]),
                  "serviceUrls": manifest["discoveredServiceUrls"], "manifest": str(ROOT / "manifest.json")}, indent=2))
if manifest["overallStatus"] != "SERVICE_ENDPOINTS_DISCOVERED":
    sys.exit(1)
