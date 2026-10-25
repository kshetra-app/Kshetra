#!/usr/bin/env python3
"""Extract the statutory Telangana Assembly Constituency roster from the 2014 Gazette copy.

The output is a transformed evidence artifact, not a substitute for the legal source PDF.
It preserves the source URL/hash and records the parsing method and limitations.
"""
from __future__ import annotations
import hashlib, json, re, sys
from datetime import datetime, timezone
from pathlib import Path
import fitz

ROOT = Path("stage_b_legal_crosswalk")
RAW = ROOT / "raw"
MANIFEST = ROOT / "manifest.json"
OUT = ROOT / "telangana_statutory_ac_roster.json"

def fail(status: str, message: str, manifest=None):
    payload = {
        "schemaVersion": 1,
        "title": "Telangana statutory Assembly Constituency roster extraction",
        "overallStatus": status,
        "message": message,
        "completedAtUtc": datetime.now(timezone.utc).isoformat(),
        "sourceManifest": str(MANIFEST),
        "sourceManifestAvailable": bool(manifest),
        "roster": [],
        "databaseAccess": "NONE",
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return 1

def normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()

def main():
    if not MANIFEST.exists():
        return fail("SOURCE_MANIFEST_MISSING", "Legal-source acquisition manifest is missing.")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    source = next((x for x in manifest.get("sources", []) if x.get("sourceId") == "AP_REORGANISATION_ACT_2014_GAZETTE_COPY" and x.get("status") == "DOWNLOADED_HASHED_PDF"), None)
    if not source:
        return fail("SOURCE_PDF_NOT_ACQUIRED", "No hashed Gazette/Act PDF was acquired; no roster was inferred.", manifest)
    raw_rel = source.get("rawArtifact")
    raw_path = ROOT / raw_rel if raw_rel else None
    if not raw_path or not raw_path.exists():
        return fail("SOURCE_BYTES_MISSING", "Manifest refers to source bytes that are not present in the workspace.", manifest)
    raw = raw_path.read_bytes()
    source_sha = hashlib.sha256(raw).hexdigest()
    if source_sha != source.get("sha256"):
        return fail("SOURCE_HASH_MISMATCH", "Raw PDF bytes do not match the acquisition manifest hash.", manifest)
    doc = fitz.open(stream=raw, filetype="pdf")

    # Schedule XXVII (Telangana, Table A — Assembly Constituencies) starts on
    # printed page 40 (zero-based PDF page index 39); Table B marks the stop.
    entries = []
    current = None
    current_district = None
    active = False
    source_pages = set()
    for page_index, page in enumerate(doc):
        if page_index < 39 or page_index > 45:
            continue
        words = page.get_text("words", sort=True)
        lines = []
        for w in sorted(words, key=lambda x: (x[1], x[0])):
            x0, y0, x1, y1, token = w[:5]
            if y0 < 40 or y0 > 725:
                continue
            # Group tokens that share the same printed baseline.
            found = None
            for line in reversed(lines[-4:]):
                if abs(line["y"] - y0) <= 1.8:
                    found = line
                    break
            if found is None:
                found = {"y": y0, "words": []}
                lines.append(found)
            found["words"].append((x0, token))
        for line in lines:
            line_words = sorted(line["words"], key=lambda x: x[0])
            full_text = normalize(" ".join(t for _, t in line_words))
            if not active:
                if re.search(r"SCHEDULE\s*-+\s*XXVII", full_text, re.I):
                    active = True
                continue
            if re.search(r"TABLE\s*B\s*[–-]\s*PARLIAMENTARY CONSTITUENCIES", full_text, re.I):
                if current:
                    entries.append(current)
                    current = None
                active = False
                break
            if not full_text:
                continue
            # A district heading is not a constituency row.
            district_match = re.match(r"^(\d{1,2})\s*[—–-]\s*DISTRICT\s*:?\s*(.+)$", full_text, re.I)
            if district_match:
                current_district = normalize(district_match.group(2)).strip(":")
                continue
            left = [t for x, t in line_words if x < 205]
            right = [t for x, t in line_words if x >= 205]
            left_text = normalize(" ".join(left))
            right_text = normalize(" ".join(right))
            if left_text in ("Sl. No. & Name", "1", "1."):
                continue
            if re.match(r"^Extent of Assembly Constituencies", right_text, re.I):
                continue
            start = re.match(r"^(\d{1,3})\.\s*(.*)$", left_text)
            if start:
                if current:
                    entries.append(current)
                current = {
                    "number": int(start.group(1)),
                    "name": normalize(start.group(2)),
                    "district": current_district,
                    "extent": right_text,
                    "sourcePdfPageIndex": page_index,
                    "sourcePrintedPage": page_index + 1,
                }
                source_pages.add(page_index)
                continue
            if current:
                # Some long constituency names have a second left-column line,
                # while extent text continues in the right column.
                if left_text and not re.match(r"^\d+\s*$", left_text):
                    if right_text:
                        # Preserve both columns; a continuation of the name is rare
                        # and can be recognized by a parenthetical-only left value.
                        if re.fullmatch(r"\([^)]*\)", left_text):
                            current["name"] = normalize(current["name"] + " " + left_text)
                        else:
                            current["extent"] = normalize(current["extent"] + " " + left_text + " " + right_text)
                    else:
                        if re.fullmatch(r"\([^)]*\)", left_text):
                            current["name"] = normalize(current["name"] + " " + left_text)
                        else:
                            current["extent"] = normalize(current["extent"] + " " + left_text)
                elif right_text:
                    current["extent"] = normalize(current["extent"] + " " + right_text)
    if current:
        entries.append(current)

    # Deduplicate entries only if PDF layout extraction repeated an identical
    # row on the same page; never silently collapse distinct constituency numbers.
    by_number = {}
    duplicates = []
    for row in entries:
        n = row["number"]
        if n in by_number:
            if row == by_number[n]:
                duplicates.append(n)
                continue
            return fail("DUPLICATE_CONSTITUENCY_NUMBER", f"Conflicting parsed rows for AC number {n}.", manifest)
        by_number[n] = row
    roster = [by_number[n] for n in sorted(by_number)]
    numbers = [x["number"] for x in roster]
    missing = sorted(set(range(1, 120)) - set(numbers))
    extra = sorted(set(numbers) - set(range(1, 120)))
    empty_names = [x["number"] for x in roster if not x["name"]]
    empty_extents = [x["number"] for x in roster if not x["extent"]]
    districts = sorted(set(x["district"] for x in roster if x.get("district")))
    status = "PASS" if len(roster) == 119 and numbers == list(range(1,120)) and not empty_names and not empty_extents and len(districts) == 10 else "PARTIAL_PARSE_REQUIRES_REVIEW"
    payload = {
        "schemaVersion": 1,
        "title": "Telangana statutory Assembly Constituency roster — Schedule XXVII, Table A",
        "overallStatus": status,
        "source": {
            "documentTitle": source.get("documentTitle"),
            "hostedAt": source.get("selectedUrl"),
            "sourceAuthority": "GAZETTE_OF_INDIA_COPY_HOSTED_ON_AP_GOVERNMENT_DOMAIN",
            "sourceSha256": source_sha,
            "sourceBytes": len(raw),
            "sourcePdfPageCount": len(doc),
            "act": "Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014)",
            "schedule": "Schedule XXVII — Telangana — Table A, Assembly Constituencies",
            "gazetteDate": "2014-03-01",
            "territorialReferenceNote": "Schedule note states references to CT/OG/Mandal/villages/territorial divisions are to be read as on 15 February 2004; municipal wards as defined in Census of India 2001 Report.",
            "canonicalByteIdentityComparedToIndiaCode": False,
        },
        "retrievedAtUtc": source.get("retrievedAtUtc"),
        "transformationHistory": [
            "Fetched source PDF bytes over HTTPS from a Government of Andhra Pradesh-hosted path.",
            "Verified raw-byte SHA-256 against acquisition manifest.",
            "Extracted word coordinates with PyMuPDF 1.26.4.",
            "Parsed printed pages 40–46 using left-column x<205 for AC serial/name and right-column x>=205 for extent; grouped words by baseline.",
            "Normalized whitespace only; preserved the extracted constituency name and extent text.",
            "Validated serial-number sequence 1..119, non-empty names/extents, and district grouping count.",
        ],
        "validation": {
            "parsedRosterCount": len(roster),
            "expectedRosterCount": 119,
            "serialSequencePass": numbers == list(range(1,120)),
            "missingNumbers": missing,
            "extraNumbers": extra,
            "emptyNames": empty_names,
            "emptyExtents": empty_extents,
            "districtCount": len(districts),
            "districts": districts,
            "duplicateRowsRemoved": duplicates,
            "status": status,
        },
        "roster": roster,
        "limitations": [
            "The source is a government-hosted copy of the Gazette/Act, not byte-compared with the India Code-hosted original.",
            "The roster describes statutory extents in administrative units and ward references, not polygon geometry.",
            "The territorial reference note uses 15 February 2004 administrative divisions and Census of India 2001 municipal wards.",
            "Later ECI notifications/corrigenda and Gazette effective-date chain still require acquisition and reconciliation.",
            "Names/extents must be independently reviewed before using this roster to adjudicate a GIS layer.",
        ],
        "databaseAccess": "NONE",
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"overallStatus":status,"parsedRosterCount":len(roster),"missingNumbers":missing,"emptyNames":empty_names,"emptyExtents":empty_extents,"districtCount":len(districts),"output":str(OUT)},indent=2))
    return 0 if status == "PASS" else 1

if __name__ == "__main__":
    sys.exit(main())
