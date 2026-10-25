#!/usr/bin/env python3
"""Forensic audit of the downloaded DataMeet India_AC shapefile.

This is a research/CI tool only; it is not part of the mobile/runtime dependency
graph and it never converts this secondary dataset into canonical geometry.
Usage:
  python scripts/audit_w021_5_geometry_candidates.py --source PATH/India_AC.shp --output PATH/report.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import geopandas as gpd

EXPECTED = {
    "Andhra Pradesh": 175, "Arunachal Pradesh": 60, "Assam": 126,
    "Bihar": 243, "Chhattisgarh": 90, "Delhi": 70, "Goa": 40,
    "Gujarat": 182, "Haryana": 90, "Himachal Pradesh": 68,
    "Jammu & Kashmir": 90, "Jharkhand": 81, "Karnataka": 224,
    "Kerala": 140, "Madhya Pradesh": 230, "Maharashtra": 288,
    "Manipur": 60, "Meghalaya": 60, "Mizoram": 40, "Nagaland": 60,
    "Odisha": 147, "Puducherry": 30, "Punjab": 117, "Rajasthan": 200,
    "Sikkim": 32, "Tamil Nadu": 234, "Telangana": 119, "Tripura": 60,
    "Uttar Pradesh": 403, "Uttarakhand": 70, "West Bengal": 294,
}
ALIASES = {
    "ANDHRA PRADESH": "Andhra Pradesh", "ARUNACHAL PRADESH": "Arunachal Pradesh",
    "ASSAM": "Assam", "BIHAR": "Bihar", "CHHATTISGARH": "Chhattisgarh",
    "DELHI": "Delhi", "GOA": "Goa", "GUJARAT": "Gujarat", "HARYANA": "Haryana",
    "HIMACHAL PRADESH": "Himachal Pradesh", "JAMMU & KASHMIR": "Jammu & Kashmir",
    "JHARKHAND": "Jharkhand", "KARNATAKA": "Karnataka", "KERALA": "Kerala",
    "MADHYA PRADESH": "Madhya Pradesh", "MAHARASHTRA": "Maharashtra",
    "MANIPUR": "Manipur", "MEGHALAYA": "Meghalaya", "MIZORAM": "Mizoram",
    "NAGALAND": "Nagaland", "ORISSA": "Odisha", "PUDUCHERRY": "Puducherry",
    "PUNJAB": "Punjab", "RAJASTHAN": "Rajasthan", "SIKKIM": "Sikkim",
    "TAMIL NADU": "Tamil Nadu", "TRIPURA": "Tripura", "UTTAR PRADESH": "Uttar Pradesh",
    "UTTARKHAND": "Uttarakhand", "WEST BENGAL": "West Bengal",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    source = args.source.resolve()
    if not source.is_file():
        raise SystemExit(f"SOURCE_NOT_FOUND: {source}")

    frame = gpd.read_file(source)
    required = {"ST_CODE", "ST_NAME", "AC_NO", "AC_NAME", "STATUS", "geometry"}
    missing = sorted(required - set(frame.columns))
    if missing:
        raise SystemExit("SCHEMA_MISMATCH: missing fields " + ", ".join(missing))

    frame["state_normalized"] = frame["ST_NAME"].map(ALIASES)
    state_summary = []
    for state in sorted(EXPECTED):
        subset = frame[frame["state_normalized"] == state]
        pairs = subset[["ST_CODE", "AC_NO"]].astype(str).drop_duplicates()
        features = int(len(subset))
        unique_pairs = int(len(pairs))
        state_summary.append({
            "state": state,
            "expected_canonical_seats": EXPECTED[state],
            "source_features": features,
            "unique_source_state_ac_pairs": unique_pairs,
            "duplicate_extra_feature_rows": features - unique_pairs,
            "feature_count_delta_vs_expected": features - EXPECTED[state],
            "invalid_geometries": int((~subset.geometry.is_valid).sum()),
            "empty_geometries": int(subset.geometry.is_empty.sum()),
            "null_ac_names": int(subset["AC_NAME"].isna().sum()),
            "pre_delimitation_status_rows": int((subset["STATUS"] == "Pre delimitation").sum()),
            "null_status_rows": int(subset["STATUS"].isna().sum()),
            "status": "MISSING" if features == 0 else "CANDIDATE_REQUIRES_PRIMARY_SOURCE_RECONCILIATION",
        })

    unique_pairs = int(len(frame[["ST_CODE", "AC_NO"]].astype(str).drop_duplicates()))
    report = {
        "title": "W021.5 National Assembly Constituency Geometry Candidate Forensic Audit",
        "auditId": "W0215-GEO-CANDIDATE-AUDIT-001",
        "status": "REJECTED_FOR_PRODUCTION_GEOMETRY_RETAINED_AS_FORENSIC_CANDIDATE",
        "source": {
            "publisher": "DataMeet community maps project",
            "url": "https://github.com/datameet/maps/tree/master/assembly-constituencies",
            "sourceCommit": "7a1c21c2e3f059a19aba1023f64ed7e174462ca4",
            "readmeUrl": "https://github.com/datameet/maps/blob/master/assembly-constituencies/README.md",
            "license": "CC BY 2.5 India per dataset README",
            "sha256": sha256(source),
            "bytes": source.stat().st_size,
            "crs": str(frame.crs),
            "columns": list(frame.columns),
        },
        "totals": {
            "source_features": int(len(frame)),
            "expected_jurisdictions": len(EXPECTED),
            "source_state_name_count": int(frame["ST_NAME"].nunique()),
            "mapped_source_state_name_count": int(frame["state_normalized"].nunique()),
            "unique_source_state_ac_pairs": unique_pairs,
            "duplicate_extra_feature_rows": int(len(frame) - unique_pairs),
            "rows_belonging_to_duplicate_keys": int(frame.duplicated(["ST_CODE", "AC_NO"], keep=False).sum()),
            "invalid_geometries": int((~frame.geometry.is_valid).sum()),
            "empty_geometries": int(frame.geometry.is_empty.sum()),
            "null_ac_names": int(frame["AC_NAME"].isna().sum()),
            "null_status_rows": int(frame["STATUS"].isna().sum()),
            "bounds": [float(x) for x in frame.total_bounds],
        },
        "sourceWarnings": [
            "The source README says boundaries for Jammu & Kashmir, Jharkhand, Assam, Manipur, Nagaland and Arunachal Pradesh appear pre-delimitation.",
            "The source README warns of geometry shifts and missing/incorrect constituency names.",
            "The source README says Telangana is marked as belonging to Andhra Pradesh.",
        ],
        "acceptanceDecision": "DO_NOT_IMPORT_AS_CANONICAL_OR_OFFICIAL_GEOMETRY",
        "stateSummary": state_summary,
    }
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered)


if __name__ == "__main__":
    main()
