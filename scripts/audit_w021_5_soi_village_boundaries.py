#!/usr/bin/env python3
"""Audit official Survey of India village-boundary ZIPs without ingesting them.

These are administrative village boundaries, not Assembly Constituency polygons.
This tool is CI/research-only and does not enter the mobile/runtime dependency graph.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import tempfile
import zipfile
from pathlib import Path

import geopandas as gpd

EXPECTED = [
    ("ANB", "andaman-nicobar-islands"), ("AP", "andhra-pradesh"),
    ("BIH", "bihar"), ("CHD", "chandigarh"), ("CG", "chhattisgarh"),
    ("DNHDD", "dnh-dd"), ("DEL", "delhi"), ("GOA", "goa"),
    ("GUJ", "gujarat"), ("HAR", "haryana"), ("JHA", "jharkhand"),
    ("KAR", "karnataka"), ("KER", "kerala"), ("LAK", "lakshadweep"),
    ("MP", "madhya-pradesh"), ("MAH", "maharashtra"), ("ODI", "odisha"),
    ("PY", "puducherry"), ("PUN", "punjab"), ("RAJ", "rajasthan"),
    ("SKM", "sikkim"), ("TN", "tamil-nadu"), ("TS", "telangana"),
    ("TRI", "tripura"), ("UP", "uttar-pradesh"), ("UK", "uttarakhand"),
    ("WB", "west-bengal"),
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def first_field(columns, candidates):
    lower = {c.lower(): c for c in columns}
    for candidate in candidates:
        if candidate.lower() in lower:
            return lower[candidate.lower()]
    return None


def audit_archive(archive: Path, code: str, slug: str) -> dict:
    record = {
        "sourceId": "SRC-SOI-VILLAGE-" + code,
        "archive": archive.name,
        "archiveBytes": archive.stat().st_size,
        "archiveSha256": sha256(archive),
        "status": "PENDING",
    }
    try:
        with tempfile.TemporaryDirectory(prefix="w0215-soi-village-") as tmp_name:
            tmp = Path(tmp_name).resolve()
            with zipfile.ZipFile(archive) as zf:
                members = zf.infolist()
                for member in members:
                    destination = (tmp / member.filename).resolve()
                    if destination != tmp and tmp not in destination.parents:
                        raise ValueError("ZIP_PATH_TRAVERSAL_MEMBER")
                zf.extractall(tmp)
            shapefiles = list(tmp.rglob("*.shp"))
            if len(shapefiles) != 1:
                raise ValueError(f"EXPECTED_ONE_SHP_FOUND_{len(shapefiles)}")
            shp = shapefiles[0]
            frame = gpd.read_file(shp)
            xml_path = Path(str(shp) + ".xml")
            xml = xml_path.read_text(encoding="utf-8", errors="ignore") if xml_path.exists() else ""
            village_code = first_field(frame.columns, ["Vill_LGD", "FINAL_LGD"])
            state_code = first_field(frame.columns, ["State_LGD", "MDDS_ST"])
            district_code = first_field(frame.columns, ["Dist_LGD", "MDDS_DT"])
            state_name = first_field(frame.columns, ["STATE_UT", "STATE"])
            if village_code is None:
                raise ValueError("VILLAGE_LGD_FIELD_NOT_FOUND")
            transformed = frame.to_crs("EPSG:4326")
            bounds = [round(float(x), 6) for x in transformed.total_bounds]
            source_state_names = sorted(
                str(v) for v in frame[state_name].dropna().unique()
            ) if state_name else []
            record.update({
                "status": "AUDITED_CANDIDATE",
                "shapefile": shp.name,
                "shapefileBytes": shp.stat().st_size,
                "shapefileSha256": sha256(shp),
                "featureCount": int(len(frame)),
                "geometryTypes": {str(k): int(v) for k, v in frame.geometry.geom_type.value_counts().items()},
                "invalidGeometryCount": int((~frame.geometry.is_valid).sum()),
                "emptyGeometryCount": int(frame.geometry.is_empty.sum()),
                "crsWkt": frame.crs.to_wkt() if frame.crs else None,
                "prjContainsLccWgs84": "LCC_WGS84" in Path(str(shp)[:-4] + ".prj").read_text(errors="ignore") if Path(str(shp)[:-4] + ".prj").exists() else False,
                "xmlCreatedDate": (re.search(r"<CreaDate>(.*?)</CreaDate>", xml) or [None, None])[1],
                "xmlModifiedDate": (re.search(r"<ModDate>(.*?)</ModDate>", xml) or [None, None])[1],
                "xmlClaimsWebMercator3857": bool(re.search(r"LatestWKID&gt;3857|LatestWKID>3857", xml)),
                "sourceStateNames": source_state_names,
                "boundsEpsg4326": bounds,
                "villageCodeField": village_code,
                "nullVillageCodeCount": int(frame[village_code].isna().sum()),
                "uniqueVillageCodes": int(frame[village_code].nunique(dropna=True)),
                "rowsWithDuplicateVillageCode": int(frame.duplicated([village_code], keep=False).sum()),
                "nullStateCodeCount": int(frame[state_code].isna().sum()) if state_code else None,
                "nullDistrictCodeCount": int(frame[district_code].isna().sum()) if district_code else None,
                "authorityClassification": "PRIMARY_OFFICIAL_ADMINISTRATIVE_GEOMETRY",
                "acceptedAsAssemblyConstituencyGeometry": False,
                "note": "Village/administrative polygons only. Duplicate village codes may represent urban ward/feature fragments and require topology and identity reconciliation before aggregation."
            })
            if record["invalidGeometryCount"] > 0:
                record["status"] = "AUDITED_WITH_INVALID_GEOMETRIES"
            if record["xmlClaimsWebMercator3857"] and record["prjContainsLccWgs84"]:
                record["crsMetadataStatus"] = "CONFLICT_XML_3857_VS_PRJ_LCC_WGS84_REQUIRES_RECONCILIATION"
            else:
                record["crsMetadataStatus"] = "PRJ_WKT_PRESENT; VERIFY_AGAINST_SOURCE_METADATA"
    except Exception as exc:
        record["status"] = "AUDIT_FAILED"
        record["error"] = str(exc)
    return record


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    source_dir = args.source_dir.resolve()
    records = []
    for code, slug in EXPECTED:
        archive = source_dir / (slug + ".zip")
        if not archive.is_file():
            records.append({
                "sourceId": "SRC-SOI-VILLAGE-" + code,
                "expectedSlug": slug,
                "status": "SOURCE_NOT_DOWNLOADED",
            })
            continue
        records.append(audit_archive(archive, code, slug))

    downloaded = [r for r in records if r.get("status", "").startswith("AUDITED")]
    report = {
        "title": "W021.5 Survey of India Official Village Boundary Source Audit",
        "auditId": "W0215-SOI-VILLAGE-AUDIT-001",
        "sourceIndex": "https://surveyofindia.gov.in/pages/village-boundary-data-base-of-entire-india",
        "auditTool": "scripts/audit_w021_5_soi_village_boundaries.py",
        "notAnAssemblyBoundaryDataset": True,
        "summary": {
            "expectedArchives": len(EXPECTED),
            "downloadedAndAuditedArchives": len(downloaded),
            "missingArchives": sum(r["status"] == "SOURCE_NOT_DOWNLOADED" for r in records),
            "auditFailures": sum(r["status"] == "AUDIT_FAILED" for r in records),
            "totalFeatures": sum(r.get("featureCount", 0) for r in records),
            "invalidGeometries": sum(r.get("invalidGeometryCount", 0) for r in records),
            "crsMetadataConflicts": sum(r.get("crsMetadataStatus", "").startswith("CONFLICT") for r in records),
        },
        "disposition": "USE_AS_OFFICIAL_VILLAGE_ADMINISTRATIVE_GEOMETRY_ONLY_AFTER_PER_FILE_VALIDATION; NEVER SUBSTITUTE FOR ASSEMBLY CONSTITUENCY BOUNDARIES",
        "records": records,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], indent=2))


if __name__ == "__main__":
    main()
