#!/usr/bin/env python3
"""Crosswalk Schedule XXVII statutory Telangana AC roster to two TGRAC GIS candidates."""
from __future__ import annotations
import hashlib, json, re, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from curl_cffi import requests

LEGAL_ROOT = Path("stage_b_legal_crosswalk")
LEGAL_ROSTER = LEGAL_ROOT / "telangana_statutory_ac_roster.json"
OUT = Path("stage_b_telanganaschedule_crosswalk")
RAW = OUT / "raw"
OUT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)

SOURCES = [
    {
        "id": "TGRAC_ENDOWMENT_ADMIN_2026",
        "url": "https://tgrac.telangana.gov.in/arcgis/rest/services/EndowmentLands_Folder/EndowmentLands_Admin_2026/MapServer/12/query?where=1%3D1&outFields=%2A&returnGeometry=true&outSR=4326&f=json",
        "nameField": "ASSEMBLY_N",
        "description": "TGRAC government GIS candidate: Assembly Constituency Boundary layer in EndowmentLands_Admin_2026 service.",
    },
    {
        "id": "TGRAC_ADMINISTRATIVE_INFO_SYSTEM",
        "url": "https://tgrac.telangana.gov.in/arcgis/rest/services/AdministrativeInfoSystem_Folder/Administrative_Information_System/MapServer/24/query?where=1%3D1&outFields=%2A&returnGeometry=true&outSR=4326&f=json",
        "nameField": "Assembly",
        "description": "TGRAC government GIS candidate: older Administrative Information System assembly geometry layer.",
    },
]
ALLOWED_HOSTS = {"tgrac.telangana.gov.in"}
# Explicitly provisional spelling variants observed between the 2014 Gazette roster
# and current TGRAC attributes. These are not canonical aliases and must be confirmed
# by the data custodian before any source value is rewritten.
CANDIDATE_ALIASES = {
    "Bellampalli (SC)": "Bellampalle (SC)",
    "Armur": "Armoor",
    "Jagtial": "Jagatial",
    "Sircilla": "Sirisilla",
    "Huzurabad": "Huzarabad",
    "Vicarabad (SC)": "Vikarabad (SC)",
    "Secunderabad Cantt. (SC)": "Secunderabad Cont (SC)",
    "Mahbubnagar": "Mahabubnagar",
    "Devarkadra": "Devarakdra",
    "Nagarjuna Sagar": "Nagarjunasagar",
    "Huzurnagar": "Huzuranagar",
    "Jangaon": "Jangoan",
}
def normalize(value):
    return " ".join(re.sub(r"[^a-z0-9]+", " ", str(value or "").casefold()).split())
def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def main():
    if not LEGAL_ROSTER.exists():
        raise RuntimeError("STATUTORY_ROSTER_MISSING")
    roster_doc = json.loads(LEGAL_ROSTER.read_text(encoding="utf-8"))
    if roster_doc.get("overallStatus") != "PASS":
        raise RuntimeError("STATUTORY_ROSTER_NOT_PASS")
    roster = roster_doc.get("roster", [])
    if len(roster) != 119:
        raise RuntimeError(f"STATUTORY_ROSTER_COUNT_{len(roster)}")
    session = requests.Session(impersonate="chrome124")
    manifest = {
        "schemaVersion": 1,
        "title": "Telangana Schedule XXVII statutory roster vs TGRAC GIS candidate name crosswalk",
        "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
        "databaseAccess": "NONE",
        "statutorySource": roster_doc.get("source"),
        "statutoryRosterValidation": roster_doc.get("validation"),
        "candidateAliases": CANDIDATE_ALIASES,
        "candidateAliasStatus": "INFERRED_NAME_ALIAS_REQUIRES_CUSTODIAN_CONFIRMATION",
        "sources": [],
        "crosswalks": [],
    }
    errors = []
    for src in SOURCES:
        p = urlparse(src["url"])
        if p.scheme != "https" or p.hostname not in ALLOWED_HOSTS:
            raise RuntimeError("URL_HOST_NOT_ALLOWLISTED:" + src["url"])
        row = {"sourceId":src["id"],"url":src["url"],"description":src["description"],"retrievedAtUtc":datetime.now(timezone.utc).isoformat()}
        try:
            response = session.get(src["url"], headers={
                "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36",
                "Accept":"application/json,*/*;q=0.8",
            }, timeout=45, allow_redirects=True)
            final = urlparse(response.url)
            if final.scheme != "https" or final.hostname not in ALLOWED_HOSTS:
                raise RuntimeError("REDIRECT_HOST_NOT_ALLOWLISTED:" + response.url)
            raw = response.content
            raw_path = RAW / f"{src['id'].lower()}_geometry.bin"
            raw_path.write_bytes(raw)
            row.update({
                "httpStatus":response.status_code,
                "finalUrl":response.url,
                "contentType":response.headers.get("Content-Type"),
                "byteLength":len(raw),
                "sha256":sha(raw),
                "rawArtifact":f"raw/{raw_path.name}",
                "etag":response.headers.get("ETag"),
            })
            if response.status_code != 200:
                raise RuntimeError(f"HTTP_{response.status_code}")
            data = response.json()
            features = data.get("features", [])
            name_field = src["nameField"]
            gis_rows = []
            by_name = {}
            for feature in features:
                attrs = feature.get("attributes") or {}
                gis_name = str(attrs.get(name_field) or "").strip()
                key = normalize(gis_name)
                gis_rows.append({"name":gis_name,"normalizedName":key,"objectId":attrs.get("OBJECTID"),"attributes":attrs})
                by_name.setdefault(key, []).append(gis_rows[-1])
            crosswalk = []
            for legal in roster:
                legal_name = legal["name"]
                exact = by_name.get(normalize(legal_name), [])
                if len(exact) == 1:
                    matched = exact[0]
                    match_type = "EXACT_NORMALIZED_NAME"
                elif len(exact) > 1:
                    matched = None
                    match_type = "DUPLICATE_GIS_NAME"
                else:
                    alias = CANDIDATE_ALIASES.get(legal_name)
                    alias_rows = by_name.get(normalize(alias), []) if alias else []
                    if len(alias_rows) == 1:
                        matched = alias_rows[0]
                        match_type = "CANDIDATE_ALIAS_REQUIRES_CONFIRMATION"
                    elif len(alias_rows) > 1:
                        matched = None
                        match_type = "DUPLICATE_ALIAS_TARGET"
                    else:
                        matched = None
                        match_type = "UNMATCHED"
                crosswalk.append({
                    "statutoryAcNumber":legal["number"],
                    "statutoryName":legal_name,
                    "statutoryDistrict":legal.get("district"),
                    "statutoryExtent":legal.get("extent"),
                    "gisNameField":name_field,
                    "gisName":matched.get("name") if matched else None,
                    "gisObjectId":matched.get("objectId") if matched else None,
                    "matchType":match_type,
                    "canonicalAcIdFromGis":False,
                })
            exact_count = sum(x["matchType"] == "EXACT_NORMALIZED_NAME" for x in crosswalk)
            alias_count = sum(x["matchType"] == "CANDIDATE_ALIAS_REQUIRES_CONFIRMATION" for x in crosswalk)
            unresolved = [x for x in crosswalk if x["matchType"] not in ("EXACT_NORMALIZED_NAME","CANDIDATE_ALIAS_REQUIRES_CONFIRMATION")]
            matched_ids = [x["gisObjectId"] for x in crosswalk if x["gisObjectId"] is not None]
            unique_gis_names = len(set(x["normalizedName"] for x in gis_rows))
            source_status = "PASS_NAME_ROSTER_SHAPE_COUNTS" if len(features) == 119 and unique_gis_names == 119 and len(unresolved) == 0 else "REQUIRES_REVIEW"
            row.update({
                "featureCount":len(features),
                "uniqueGisNameCount":unique_gis_names,
                "nameField":name_field,
                "geometryType":data.get("geometryType"),
                "spatialReference":data.get("spatialReference"),
                "objectIdFieldName":data.get("objectIdFieldName"),
                "structuralGeometryNotReauditedHere":True,
                "sourceStatus":source_status,
            })
            manifest["sources"].append(row)
            manifest["crosswalks"].append({
                "sourceId":src["id"],
                "featureCount":len(features),
                "uniqueGisNameCount":unique_gis_names,
                "exactNormalizedNameMatches":exact_count,
                "candidateAliasMatches":alias_count,
                "unresolvedCount":len(unresolved),
                "unresolved":unresolved,
                "crosswalk":crosswalk,
                "disposition":"NAME/ROSTER CROSSWALK ONLY; DOES NOT VALIDATE POLYGON EXTENTS OR CANONICAL GEOGRAPHY",
            })
            if source_status != "PASS_NAME_ROSTER_SHAPE_COUNTS":
                errors.append(src["id"] + ":" + source_status)
        except Exception as exc:
            row.update({"status":"FETCH_OR_PARSE_FAILED","error":f"{type(exc).__name__}: {exc}"})
            manifest["sources"].append(row)
            errors.append(src["id"] + ":" + str(exc))
    manifest["overallStatus"] = "PASS_WITH_CANDIDATE_ALIASES" if not errors and all(x["unresolvedCount"] == 0 for x in manifest["crosswalks"]) else "REQUIRES_REVIEW"
    manifest["errors"] = errors
    manifest["limitations"] = [
        "The statutory roster comes from a government-hosted copy of the Gazette/Act; its byte identity with India Code's copy is not verified.",
        "Name aliases are inferred from spelling differences and are not official alias declarations.",
        "TGRAC OBJECTID is not a canonical Assembly Constituency number; the legal serial number is preserved separately.",
        "No statutory extent-to-polygon comparison was performed. The Act's extents reference administrative units as on 15 February 2004 and Census 2001 municipal wards; matching these to polygons requires historical unit geometry and Gazette lineage.",
        "The existing geometry audit reports material disagreement across seven ACs and a shared invalid Dornakal polygon; name matches do not close these topology defects.",
        "Do not rewrite GIS names, canonical IDs, or geometry based on this candidate crosswalk without custodian confirmation and independent review."
    ]
    manifest["completedAtUtc"] = datetime.now(timezone.utc).isoformat()
    out_path = OUT / "telangana_statutory_vs_tgrac_crosswalk.json"
    out_path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({
        "overallStatus":manifest["overallStatus"],
        "sources":[{"sourceId":s.get("sourceId"),"status":s.get("sourceStatus"),"featureCount":s.get("featureCount"),"sha256":s.get("sha256")} for s in manifest["sources"]],
        "crosswalks":[{"sourceId":x["sourceId"],"exact":x["exactNormalizedNameMatches"],"aliases":x["candidateAliasMatches"],"unresolved":x["unresolvedCount"]} for x in manifest["crosswalks"]],
        "output":str(out_path)
    },indent=2))
    return 0 if manifest["overallStatus"] == "PASS_WITH_CANDIDATE_ALIASES" else 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        OUT.mkdir(parents=True,exist_ok=True)
        (OUT/"telangana_statutory_vs_tgrac_crosswalk.json").write_text(json.dumps({"overallStatus":"FAILED","error":f"{type(exc).__name__}: {exc}","completedAtUtc":datetime.now(timezone.utc).isoformat(),"databaseAccess":"NONE"},indent=2)+"\n")
        print(f"Crosswalk failed: {type(exc).__name__}: {exc}",file=sys.stderr)
        sys.exit(1)
