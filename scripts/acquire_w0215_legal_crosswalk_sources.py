#!/usr/bin/env python3
"""Acquire official government legal-source bytes for W021.5 Stage B crosswalk work."""
from __future__ import annotations
import hashlib, json, re, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from curl_cffi import requests
import fitz

OUT = Path("stage_b_legal_crosswalk")
RAW = OUT / "raw"
OUT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)

SOURCES = [
    {
        "id": "INDIACODE_AP_REORGANISATION_ACT_2014",
        "url": "https://www.indiacode.nic.in/bitstream/123456789/2123/1/A2014-6E.pdf",
        "publisher": "India Code, Legislative Department, Government of India",
        "required": True,
        "terms": ["SECTION 15", "SECOND SCHEDULE", "AMENDMENTS TO THE DELIMITATION"],
    },
    {
        "id": "ECI_GENERAL_ELECTIONS_2024_DELIMITATION_PRESS_NOTE",
        "url": "https://elections24.eci.gov.in/docs/press-note-no-23.pdf",
        "publisher": "Election Commission of India",
        "required": True,
        "terms": ["282/AP/2018", "TELANGANA", "ASSEMBLY CONSTITUENCIES"],
    },
    {
        "id": "INDIACODE_AP_REORGANISATION_REMOVAL_DIFFICULTIES_ORDERS",
        "url": "https://upload.indiacode.nic.in/showfile?actid=AC_CEN_5_5_00058_201406_1517807327989&filename=Andhra+Pradesh+Reorganisation+%28Removal+of+Difficulties%29+First%2C+Second+and+Third+Order.pdf&type=order",
        "publisher": "India Code, Government of India",
        "required": False,
        "terms": ["ANDHRA PRADESH REORGANISATION", "DELIMITATION", "2015"],
    },
]
ALLOWED_HOSTS = {"www.indiacode.nic.in", "indiacode.nic.in", "upload.indiacode.nic.in", "elections24.eci.gov.in"}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36",
    "Accept": "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

manifest = {
    "schemaVersion": 1,
    "title": "W021.5 Stage B official legal crosswalk source acquisition",
    "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
    "directive": "CTO Directive 154 — Stage B only",
    "databaseAccess": "NONE",
    "sources": [],
}
session = requests.Session(impersonate="chrome124")
required_failures = []
for src in SOURCES:
    row = {
        "sourceId": src["id"], "publisher": src["publisher"], "url": src["url"],
        "required": src["required"], "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
        "status": "NOT_ATTEMPTED",
    }
    try:
        parsed = urlparse(src["url"])
        if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
            raise RuntimeError("URL_HOST_NOT_ALLOWLISTED")
        response = session.get(src["url"], headers=HEADERS, timeout=60, allow_redirects=True)
        final = urlparse(response.url)
        if final.scheme != "https" or final.hostname not in ALLOWED_HOSTS:
            raise RuntimeError("REDIRECT_HOST_NOT_ALLOWLISTED:" + str(response.url))
        raw = response.content
        safe = re.sub(r"[^A-Za-z0-9_.-]", "_", src["id"])
        path = RAW / f"{safe}.bin"
        path.write_bytes(raw)
        row.update({
            "httpStatus": response.status_code, "contentType": response.headers.get("Content-Type"),
            "finalUrl": response.url, "byteLength": len(raw), "sha256": sha(raw),
            "pdfMagic": raw.startswith(b"%PDF-"), "rawArtifact": f"raw/{path.name}",
        })
        if response.status_code != 200 or not raw:
            raise RuntimeError(f"HTTP_{response.status_code}_OR_EMPTY")
        if not raw.startswith(b"%PDF-"):
            row["status"] = "BYTES_ACQUIRED_NON_PDF_REQUIRES_REVIEW"
            row["error"] = "HTTP 200 but payload is not PDF magic; bytes preserved and hashed."
        else:
            doc = fitz.open(stream=raw, filetype="pdf")
            full_text = "\n".join(page.get_text("text", sort=True) for page in doc)
            row["pdfPageCount"] = doc.page_count
            row["termFindings"] = {
                term: [i for i, page in enumerate(doc) if term.casefold() in page.get_text("text", sort=True).casefold()]
                for term in src["terms"]
            }
            row["textExtractionMethod"] = "PyMuPDF page text; page indices are zero-based."
            text_file = OUT / f"{safe}.txt"
            text_file.write_text(full_text, encoding="utf-8")
            row["textArtifact"] = text_file.name
            row["status"] = "DOWNLOADED_HASHED_PDF"
        if src["required"] and row["status"] != "DOWNLOADED_HASHED_PDF":
            required_failures.append(src["id"])
    except Exception as exc:
        row["status"] = "FETCH_FAILED"
        row["error"] = f"{type(exc).__name__}: {exc}"
        if src["required"]:
            required_failures.append(src["id"])
    manifest["sources"].append(row)

manifest["requiredFailures"] = required_failures
manifest["overallStatus"] = "REQUIRED_SOURCE_FAILURES" if required_failures else "REQUIRED_SOURCE_BYTES_ACQUIRED"
manifest["completedAtUtc"] = datetime.now(timezone.utc).isoformat()
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps(manifest, indent=2, ensure_ascii=False))
if required_failures:
    sys.exit(1)
