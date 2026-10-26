#!/usr/bin/env python3
"""Compare acquired Telangana TGRAC AC candidate families without repairing source geometry.

This is a source-family screen, not a legal boundary validator. It never changes raw bytes,
never merges spelling aliases automatically, and never upgrades a candidate to canonical.
"""
from __future__ import annotations

import hashlib
import json
import statistics
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("stage_b_acquisition")
RAW = ROOT / "raw"
OUT = ROOT / "variant_comparison.json"
CANDIDATE_FILES = [
    "telangana-ac-geometry.bin",
    "telangana-2026-ac-geometry.bin",
    "telangana-admin-new-ac-geometry.bin",
    "telangana-admin-old-ac-geometry.bin",
    "telangana-master-ac-geometry.bin",
    "telangana-query-ac-geometry.bin",
    "telangana-rnb-ac-geometry.bin",
    "telangana-musiriver-ac-geometry.bin",
]
KNOWN_SPELLING_PAIRS = [("jangaon", "jangoan")]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def feature_name(feature: dict) -> str:
    attrs = feature.get("attributes") or {}
    value = (
        attrs.get("Assembly_Name")
        or attrs.get("Assembly")
        or attrs.get("ASSEMBLY_N")
        or attrs.get("Ass_Name")
        or ""
    )
    value = " ".join(str(value).strip().split())
    if value.casefold().endswith(" assembly"):
        value = value[: -len(" assembly")].strip()
    return value.casefold()


def feature_metrics(feature: dict) -> dict:
    geometry = feature.get("geometry") or {}
    rings = geometry.get("rings") or []
    points = [point[:2] for ring in rings for point in ring]
    bbox = None
    if points:
        bbox = [
            min(p[0] for p in points),
            min(p[1] for p in points),
            max(p[0] for p in points),
            max(p[1] for p in points),
        ]
    return {
        "ringLengths": [len(ring) for ring in rings],
        "pointCount": sum(len(ring) for ring in rings),
        "bbox": bbox,
        "rings": rings,
    }


def load_layer(filename: str) -> dict | None:
    path = RAW / filename
    if not path.is_file():
        return None
    raw = path.read_bytes()
    document = json.loads(raw)
    features = {}
    duplicate_names = []
    for feature in document.get("features", []):
        name = feature_name(feature)
        if not name:
            continue
        if name in features:
            duplicate_names.append(name)
            continue
        metrics = feature_metrics(feature)
        metrics["objectId"] = (feature.get("attributes") or {}).get("OBJECTID")
        features[name] = metrics
    return {
        "file": filename,
        "url": None,
        "byteLength": len(raw),
        "sha256": sha256(raw),
        "featureCount": len(document.get("features", [])),
        "uniqueNormalizedNames": len(features),
        "duplicateNormalizedNames": sorted(set(duplicate_names)),
        "features": features,
    }


def compare_layers(a: dict, b: dict) -> dict:
    af = a["features"]
    bf = b["features"]
    common = sorted(set(af) & set(bf))
    unmatched_a = sorted(set(af) - set(bf))
    unmatched_b = sorted(set(bf) - set(af))
    same_rings = 0
    same_points = 0
    same_bbox = 0
    exact_ring_arrays = 0
    differing_ring_structure = []
    per_feature_max_delta = []

    for name in common:
        x = af[name]
        y = bf[name]
        if x["rings"] == y["rings"]:
            exact_ring_arrays += 1
        if x["ringLengths"] == y["ringLengths"]:
            same_rings += 1
            if x["pointCount"] == y["pointCount"]:
                same_points += 1
                delta = 0.0
                aligned = True
                for ring_x, ring_y in zip(x["rings"], y["rings"]):
                    if len(ring_x) != len(ring_y):
                        aligned = False
                        break
                    for point_x, point_y in zip(ring_x, ring_y):
                        delta = max(
                            delta,
                            abs(float(point_x[0]) - float(point_y[0])),
                            abs(float(point_x[1]) - float(point_y[1])),
                        )
                if aligned:
                    per_feature_max_delta.append(delta)
        else:
            differing_ring_structure.append(name)
        if x["bbox"] == y["bbox"]:
            same_bbox += 1

    spelling_candidates = []
    unmatched_set_a = set(unmatched_a)
    unmatched_set_b = set(unmatched_b)
    for left, right in KNOWN_SPELLING_PAIRS:
        if (left in unmatched_set_a and right in unmatched_set_b) or (
            right in unmatched_set_a and left in unmatched_set_b
        ):
            spelling_candidates.append({"left": left, "right": right, "automaticallyMerged": False})

    return {
        "left": a["file"],
        "right": b["file"],
        "leftSha256": a["sha256"],
        "rightSha256": b["sha256"],
        "leftBytes": a["byteLength"],
        "rightBytes": b["byteLength"],
        "leftFeatureCount": a["featureCount"],
        "rightFeatureCount": b["featureCount"],
        "commonNormalizedNames": len(common),
        "unmatchedLeftNames": unmatched_a,
        "unmatchedRightNames": unmatched_b,
        "potentialSpellingAliasesNotMerged": spelling_candidates,
        "exactRawResponseBytesMatch": a["sha256"] == b["sha256"] and a["byteLength"] == b["byteLength"],
        "exactRingArrayMatchesAmongCommonNames": exact_ring_arrays,
        "sameRingLengthVectorsAmongCommonNames": same_rings,
        "samePointCountsAmongCommonNames": same_points,
        "sameBoundingBoxesAmongCommonNames": same_bbox,
        "differentRingStructureNames": differing_ring_structure,
        "maxAbsolutePointwiseCoordinateDeltaDegrees": max(per_feature_max_delta) if per_feature_max_delta else None,
        "medianPerFeatureMaxCoordinateDeltaDegrees": statistics.median(per_feature_max_delta) if per_feature_max_delta else None,
        "interpretationLimit": "Pointwise coordinate screen only; not a full polygon overlay, legal extent check, coverage proof, or independent source-authority determination.",
    }


def main() -> int:
    ROOT.mkdir(parents=True, exist_ok=True)
    layers = []
    missing = []
    for filename in CANDIDATE_FILES:
        layer = load_layer(filename)
        if layer is None:
            missing.append(filename)
        else:
            layers.append(layer)
    if not layers:
        print("No candidate geometry files found; comparison not produced.", file=sys.stderr)
        return 2

    duplicate_groups = defaultdict(list)
    for layer in layers:
        duplicate_groups[layer["sha256"]].append(layer["file"])
    duplicate_groups = [
        {"sha256": digest, "files": sorted(files), "independentResponses": False}
        for digest, files in sorted(duplicate_groups.items())
        if len(files) > 1
    ]

    comparisons = []
    for i, left in enumerate(layers):
        for right in layers[i + 1 :]:
            comparisons.append(compare_layers(left, right))

    report = {
        "schemaVersion": 1,
        "title": "W021.5 Stage B Telangana TGRAC candidate variant-family comparison",
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "method": {
            "source": "Raw ESRI JSON responses in stage_b_acquisition/raw",
            "nameMatching": "Exact normalized layer name only; known Jangaon/Jangoan spelling candidate is reported but never automatically merged.",
            "comparison": "Compare raw SHA-256, feature names, ring-length vectors, point counts, bounding boxes, exact ring arrays, and pointwise coordinate deltas only when ring structures align.",
            "sourceIntegrity": "Raw bytes are read-only and never modified or repaired.",
        },
        "missingCandidateFiles": missing,
        "layers": [
            {key: value for key, value in layer.items() if key != "features"}
            for layer in layers
        ],
        "duplicateRawResponseGroups": duplicate_groups,
        "pairwiseComparisons": comparisons,
        "disposition": "CANDIDATE_FAMILY_SCREEN_ONLY; NO CANONICAL ACCEPTANCE",
        "knownCommonTopologyIssue": "Dornakal (ST) invalid ring self-intersection is evaluated by the separate topology audit.",
        "legalVintagesAndLicences": "NOT ESTABLISHED BY THIS SCRIPT",
        "productionDatabaseAccess": "NONE",
        "stagingDatabaseAccess": "NONE",
        "acceptance": "STAGE_B_PARTIAL_NOT_ACCEPTED",
    }
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(OUT), "layerCount": len(layers), "pairCount": len(comparisons), "duplicateResponseGroups": duplicate_groups}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
