#!/usr/bin/env python3
"""Read-only acquisition and structural audit of the official CEO Delhi polling-station index.

Only page URLs linked by the official index are followed. No CAPTCHA bypass, voter-level
personal data scraping, database access, or inferred station-to-AC mappings are performed.
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse

from curl_cffi import requests

OUT = Path("stage_b_ceo_delhi_polling_stations")
RAW = OUT / "raw"
RAW.mkdir(parents=True, exist_ok=True)
INDEX_URL = "https://ceodelhinet.nic.in/ceodelhiweb/ListofPollingStation.aspx"
ALLOWED_HOSTS = {"ceodelhi.gov.in", "ceodelhinet.nic.in"}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

class PageLinkParser(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__()
        self.base_url = base_url
        self.links = []
        self._a = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag.lower() == "a" and a.get("href"):
            self._a = {"href": a["href"], "textParts": []}

    def handle_data(self, data):
        if self._a is not None and data and data.strip():
            self._a["textParts"].append(data.strip())

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._a is not None:
            raw_url = urljoin(self.base_url, self._a["href"])
            self._a["url"] = raw_url
            self._a["text"] = " ".join(self._a.pop("textParts"))
            self.links.append(self._a)
            self._a = None

class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tables = []
        self._table = None
        self._row = None
        self._cell = None
        self._cell_tag = None

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag == "table":
            if self._table is None:
                self._table = {"rows": []}
        elif self._table is not None and tag == "tr":
            self._row = []
        elif self._row is not None and tag in ("td", "th"):
            self._cell = []
            self._cell_tag = tag

    def handle_data(self, data):
        if self._cell is not None and data and data.strip():
            self._cell.append(data.strip())

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ("td", "th") and self._cell is not None and self._row is not None:
            self._row.append({"tag": self._cell_tag, "text": " ".join(self._cell)})
            self._cell = None
            self._cell_tag = None
        elif tag == "tr" and self._row is not None and self._table is not None:
            if any(c["text"] for c in self._row):
                self._table["rows"].append(self._row)
            self._row = None
        elif tag == "table" and self._table is not None:
            self.tables.append(self._table)
            self._table = None

def validate_url(url: str, require_detail: bool = False) -> None:
    u = urlparse(url)
    if u.scheme != "https" or u.hostname not in ALLOWED_HOSTS:
        raise ValueError(f"UNAPPROVED_SOURCE_URL:{url}")
    if require_detail and u.path.rstrip("/").lower() != "/loksabhapollingstation-2024.aspx".lower():
        raise ValueError(f"UNEXPECTED_DETAIL_PATH:{url}")

def get_html(url: str) -> tuple[object, bytes]:
    validate_url(url)
    response = requests.get(url, headers=HEADERS, timeout=12, allow_redirects=True, impersonate="chrome124")
    validate_url(response.url)
    return response, response.content

manifest = {
    "schemaVersion": 1,
    "title": "Official CEO Delhi 2024 AC-to-polling-station index acquisition",
    "directive": "CTO Directive 154 — W021.5 Stage B only",
    "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
    "officialIndexUrl": INDEX_URL,
    "databaseAccess": "NONE",
    "scope": "Delhi jurisdiction only; no national completeness claim",
    "records": [],
}

# First retain and hash the exact index bytes; detail URLs are derived only from observed links.
try:
    response, raw = get_html(INDEX_URL)
    idx = {
        "sourceId": "CEO_DELHI_POLLING_STATION_INDEX",
        "requestedUrl": INDEX_URL,
        "finalUrl": response.url,
        "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
        "httpStatus": response.status_code,
        "contentType": response.headers.get("Content-Type"),
        "byteLength": len(raw),
        "sha256": sha(raw),
        "status": "DOWNLOADED_HASHED_HTML" if response.status_code == 200 and raw else "HTTP_FAILURE",
    }
    if response.status_code != 200 or not raw:
        manifest["index"] = idx
        manifest["overallStatus"] = "BLOCKED_INDEX_NOT_ACQUIRED"
        manifest["completedAtUtc"] = datetime.now(timezone.utc).isoformat()
        (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(manifest, indent=2))
        sys.exit(1)

    (RAW / "CEO_DELHI_POLLING_STATION_INDEX.html").write_bytes(raw)
    idx["rawArtifact"] = "raw/CEO_DELHI_POLLING_STATION_INDEX.html"
    manifest["index"] = idx
    parser = PageLinkParser(response.url)
    parser.feed(raw.decode(response.encoding or "utf-8", errors="replace"))
    detail_by_ac = {}
    rejected_links = []
    for link in parser.links:
        url = link["url"]
        u = urlparse(url)
        if u.scheme != "https" or u.hostname not in ALLOWED_HOSTS:
            continue
        if u.path.rstrip("/").lower() != "/loksabhapollingstation-2024.aspx":
            continue
        q = parse_qs(u.query)
        try:
            ac_no = int((q.get("ac_no") or [""])[0])
        except ValueError:
            rejected_links.append({"href": url, "reason": "MISSING_OR_INVALID_AC_NUMBER"})
            continue
        if not 1 <= ac_no <= 70:
            rejected_links.append({"href": url, "reason": "AC_NUMBER_OUT_OF_RANGE"})
            continue
        ac_name = (q.get("Ac_Name") or [""])[0].strip()
        # retain exact link text and params; reject duplicate ACs with differing URLs below.
        detail_by_ac.setdefault(ac_no, []).append({
            "url": url,
            "acName": ac_name,
            "indexLinkText": link.get("text", ""),
        })

    selected = []
    conflicts = []
    for ac_no, entries in sorted(detail_by_ac.items()):
        unique = {x["url"]: x for x in entries}
        if len(unique) != 1:
            conflicts.append({"acNo": ac_no, "urls": sorted(unique)})
        else:
            selected.append({"acNo": ac_no, **next(iter(unique.values()))})

    manifest["index"]["observedLinkCount"] = len(parser.links)
    manifest["index"]["distinctAssemblyConstituencyLinks"] = len(selected)
    manifest["index"]["rejectedRelevantLinks"] = rejected_links
    manifest["index"]["duplicateUrlConflicts"] = conflicts
    manifest["index"]["acNumbersObserved"] = [x["acNo"] for x in selected]
    expected = set(range(1, 71))
    manifest["index"]["missingACNumbers"] = sorted(expected - {x["acNo"] for x in selected})
    manifest["index"]["unexpectedACNumbers"] = sorted({x["acNo"] for x in selected} - expected)
except Exception as exc:
    manifest["index"] = {"status": "FETCH_FAILED", "error": f"{type(exc).__name__}: {exc}"}
    manifest["overallStatus"] = "BLOCKED_INDEX_NOT_ACQUIRED"
    manifest["completedAtUtc"] = datetime.now(timezone.utc).isoformat()
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    sys.exit(1)

def acquire_one(item):
    ac_no = item["acNo"]
    url = item["url"]
    record = {
        "sourceId": f"CEO_DELHI_PS_2024_AC_{ac_no:02d}",
        "acNo": ac_no,
        "acNameFromIndex": item["acName"],
        "requestedUrl": url,
        "indexLinkText": item["indexLinkText"],
        "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
    }
    try:
        validate_url(url, require_detail=True)
        response = requests.get(url, headers=HEADERS, timeout=12, allow_redirects=True, impersonate="chrome124")
        validate_url(response.url, require_detail=True)
        raw = response.content
        record.update({
            "finalUrl": response.url,
            "httpStatus": response.status_code,
            "contentType": response.headers.get("Content-Type"),
            "byteLength": len(raw),
            "sha256": sha(raw) if raw else None,
        })
        if response.status_code == 200 and raw:
            name = f"CEO_DELHI_POLLING_STATIONS_AC_{ac_no:02d}.html"
            (RAW / name).write_bytes(raw)
            record["rawArtifact"] = f"raw/{name}"
            record["status"] = "DOWNLOADED_HASHED_HTML"
            parser = TableParser()
            parser.feed(raw.decode(response.encoding or "utf-8", errors="replace"))
            table_summaries = []
            for table_i, table in enumerate(parser.tables, 1):
                rows = table["rows"]
                header = []
                if rows and all(c.get("tag") == "th" for c in rows[0]):
                    header = [c["text"] for c in rows[0]]
                    data_rows = rows[1:]
                else:
                    data_rows = rows
                table_summaries.append({
                    "tableIndex": table_i,
                    "header": header,
                    "rowCount": len(rows),
                    "dataRowCount": len(data_rows),
                    "sampleRows": [[c["text"] for c in row] for row in data_rows[:5]],
                })
            record["tables"] = table_summaries
            record["tableCount"] = len(table_summaries)
            record["tableDataRowCount"] = sum(t["dataRowCount"] for t in table_summaries)
            text_parser = PageLinkParser(response.url)
            text_parser.feed(raw.decode(response.encoding or "utf-8", errors="replace"))
            record["pdfLinksObserved"] = [
                {"url": x["url"], "text": x.get("text", "")}
                for x in text_parser.links if urlparse(x["url"]).path.lower().endswith(".pdf")
            ][:50]
        else:
            record["status"] = "HTTP_FAILURE_NO_SOURCE_BYTES_ACCEPTED"
    except Exception as exc:
        record["status"] = "FETCH_FAILED"
        record["error"] = f"{type(exc).__name__}: {exc}"
    return record

# Modest concurrency limits load on this public government service while staying reproducible.
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    futures = [pool.submit(acquire_one, item) for item in selected]
    for future in concurrent.futures.as_completed(futures):
        manifest["records"].append(future.result())

manifest["records"].sort(key=lambda r: r["acNo"])
manifest["summary"] = {
    "distinctACLinksObserved": len(selected),
    "distinctACPagesAttempted": len(selected),
    "pagesDownloadedHashed": sum(1 for r in manifest["records"] if r.get("status") == "DOWNLOADED_HASHED_HTML"),
    "pagesFailed": sum(1 for r in manifest["records"] if r.get("status") != "DOWNLOADED_HASHED_HTML"),
    "uniqueSuccessfulACNumbers": sorted({r["acNo"] for r in manifest["records"] if r.get("status") == "DOWNLOADED_HASHED_HTML"}),
    "missingSuccessfulACNumbers": sorted(set(range(1, 71)) - {r["acNo"] for r in manifest["records"] if r.get("status") == "DOWNLOADED_HASHED_HTML"}),
}
manifest["overallStatus"] = (
    "PASS_70_OF_70_POLLING_STATION_PAGES_ACQUIRED"
    if manifest["summary"]["pagesDownloadedHashed"] == 70
       and manifest["index"].get("distinctAssemblyConstituencyLinks") == 70
       and not manifest["index"].get("missingACNumbers")
       and not manifest["index"].get("duplicateUrlConflicts")
    else "PARTIAL_OFFICIAL_DELHI_POLLING_STATION_ACQUISITION"
)
manifest["completedAtUtc"] = datetime.now(timezone.utc).isoformat()
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps(manifest, indent=2, ensure_ascii=False))
if manifest["overallStatus"] != "PASS_70_OF_70_POLLING_STATION_PAGES_ACQUIRED":
    sys.exit(1)
