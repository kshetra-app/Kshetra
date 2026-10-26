#!/usr/bin/env python3
"""Acquire official/government-hosted legal source bytes for W021.5 Stage B crosswalk."""
from __future__ import annotations
import hashlib, json, re, sys
from html.parser import HTMLParser
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
        "id": "AP_REORGANISATION_ACT_2014_GAZETTE_COPY",
        "urlCandidates": [
            "https://apseeds.ap.gov.in/PDF/apreorg/APRegACT2014.pdf",
            "https://tgerc.telangana.gov.in/file_upload/uploads/Acts%20and%20Polices/Acts%20and%20Rules/A.P.Reorganisation%20act%202014.pdf",
            "https://www.indiacode.nic.in/bitstream/123456789/2123/1/A2014-6E.pdf",
        ],
        "publisher": "Government-hosted copy of Gazette of India / India Code",
        "documentTitle": "Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014; Gazette dated 1 March 2014)",
        "required": True,
        "terms": ["SECTION 15", "SECOND SCHEDULE", "SCHEDULE - XXVII", "TELANGANA", "119"],
        "purpose": "Primary legal schedule and statutory AC roster/extent crosswalk; host/source lineage must be recorded."
    },
    {
        "id": "CEO_TELANGANA_HOP_2024_SCHEDULE",
        "urlCandidates": ["https://ceotelangana.nic.in/HOP-2024/11301_25-%20Ge%20to%20the%20HoP%202024-%20Schedule%20of%20Election_11zon.pdf", "https://ceotelangana.nic.in/HOP-2024/11301_25-%20Ge%20to%20the%20HoP%202024-%20Schedule%20of%20Election.pdf"],
        "publisher": "Chief Electoral Officer, Telangana",
        "documentTitle": "General Elections to the House of People 2024 — Schedule of Election",
        "required": False,
        "terms": ["282/AP/2018(DEL)", "Removal of Difficulties", "119", "175", "TELANGANA"],
        "purpose": "Official state-election-office corroboration of the legal chain; not the original 2018 notification itself."
    },
    {
        "id": "ECI_GENERAL_ELECTIONS_2024_PRESS_NOTE",
        "urlCandidates": ["https://elections24.eci.gov.in/docs/press-note-no-23.pdf"],
        "publisher": "Election Commission of India",
        "documentTitle": "General Elections 2024 Press Note No. 23",
        "required": False,
        "terms": ["282/AP/2018", "TELANGANA", "ASSEMBLY CONSTITUENCIES"],
        "purpose": "Corroborative election-administration evidence; not a replacement for the Act, ECI notification or Gazette."
    },
    {
        "id": "ECI_NOTIFICATION_282_AP_2018_DEL",
        "urlCandidates": [
            "https://www.eci.gov.in/eci-backend/public/api/download?url=LMAhAK6sOPBp%2FNFF0iRfXbEB1EVSLT41NNLRjYNJJP1KivrUxbfqkDatmHy12e%2FzVx8fLfn2ReU7TfrqYobgIsVIzE4H7zCkL60TDPfde3hSidsZ4fuGUaZAjsPMK3mFe%2FOayCb%2Bc1mgC3WIErfdO%2BA072J7HtGm2kYfstpL5XIZTWrH2JWU7UfZrKWF1BUsH9xccKER%2BJMZVGi7SrzX57%2FMm24zs1eyK2AB5zsjcWKzrILRQG%2FBbbQ%2Fx5bNYVaCn7kX4xoHNibbBVAsqukcOQ%3D%3D",
            "https://eci.gov.in/eci-backend/public/api/download?url=LMAhAK6sOPBp%2FNFF0iRfXbEB1EVSLT41NNLRjYNJJP1KivrUxbfqkDatmHy12e%2FzVx8fLfn2ReU7TfrqYobgIsVIzE4H7zCkL60TDPfde3hSidsZ4fuGUaZAjsPMK3mFe%2FOayCb%2Bc1mgC3WIErfdO%2BA072J7HtGm2kYfstpL5XIZTWrH2JWU7UfZrKWF1BUsH9xccKER%2BJMZVGi7SrzX57%2FMm24zs1eyK2AB5zsjcWKzrILRQG%2FBbbQ%2Fx5bNYVaCn7kX4xoHNibbBVAsqukcOQ%3D%3D"
        ],
        "publisher": "Election Commission of India",
        "documentTitle": "Notification No. 282/AP/2018(DEL), dated 22 September 2018",
        "required": False,
        "terms": ["282/AP/2018(DEL)", "SCHEDULE - XXVII", "TELANGANA", "119", "175"],
        "purpose": "Primary legal notification for AP/Telangana constituency extent lineage; if binary bytes remain blocked, preserve the exact failed attempts and use official HTML only as corroboration, never as a replacement for the Gazette."
    },
    {
        "id": "AP_REORGANISATION_REMOVAL_DIFFICULTIES_ORDERS",
        "urlCandidates": [
            "https://upload.indiacode.nic.in/showfile?actid=AC_CEN_5_5_00058_201406_1517807327989&filename=Andhra+Pradesh+Reorganisation+%28Removal+of+Difficulties%29+First%2C+Second+and+Third+Order.pdf&type=order"
        ],
        "publisher": "India Code, Government of India",
        "documentTitle": "Andhra Pradesh Reorganisation (Removal of Difficulties) First, Second and Third Orders",
        "required": False,
        "terms": ["ANDHRA PRADESH REORGANISATION", "DELIMITATION", "2015"],
        "purpose": "Check the legal sequence; do not assume relevance to Assembly Constituency extent without reading."
    },
]
ALLOWED_HOSTS = {
    "apseeds.ap.gov.in", "tgerc.telangana.gov.in",
    "www.indiacode.nic.in", "indiacode.nic.in", "upload.indiacode.nic.in",
    "elections24.eci.gov.in", "www.eci.gov.in", "eci.gov.in", "ceotelangana.nic.in", "www.pib.gov.in", "pib.gov.in",
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36",
    "Accept": "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

HTML_SOURCES = [
    {
        "id": "PIB_AP_TELANGANA_DELIMITATION_LEGAL_CHAIN_IFRAME",
        "url": "https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2015227&lang=2&reg=48",
        "publisher": "Press Information Bureau, Government of India",
        "documentTitle": "PIB press release iframe corroborating the AP/Telangana delimitation legal chain",
        "terms": ["282/AP/2018(DEL)", "Removal of Difficulties", "119", "175", "Andhra Pradesh Reorganisation"],
        "purpose": "Alternate official PIB HTML endpoint observed to expose the full press-release text; corroborative only, not the primary ECI notification or Gazette."
    },
    {
        "id": "PIB_AP_TELANGANA_DELIMITATION_LEGAL_CHAIN",
        "url": "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2015227&lang=2&reg=48",
        "publisher": "Press Information Bureau, Government of India",
        "documentTitle": "PIB press release corroborating the AP/Telangana delimitation legal chain",
        "terms": ["282/AP/2018(DEL)", "Removal of Difficulties", "119", "175", "Andhra Pradesh Reorganisation"],
        "purpose": "Official HTML corroboration; not a substitute for the Act, Gazette, or ECI notification."
    }
]

class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
    def handle_data(self, data):
        if data and data.strip():
            self.parts.append(data.strip())

manifest = {
    "schemaVersion": 2,
    "title": "W021.5 Stage B official legal crosswalk source acquisition",
    "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
    "directive": "CTO Directive 154 — Stage B only",
    "databaseAccess": "NONE",
    "sources": [],
    "htmlSources": [],
}
session = requests.Session(impersonate="chrome124")
required_failures = []
for src in SOURCES:
    row = {
        "sourceId": src["id"], "publisher": src["publisher"], "documentTitle": src["documentTitle"],
        "urlCandidates": src["urlCandidates"], "required": src["required"],
        "purpose": src["purpose"], "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
        "status": "NOT_ATTEMPTED", "attempts": [],
    }
    selected = None
    for index, url in enumerate(src["urlCandidates"], 1):
        attempt = {"candidateIndex": index, "url": url, "retrievedAtUtc": datetime.now(timezone.utc).isoformat()}
        try:
            parsed = urlparse(url)
            if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
                raise RuntimeError("URL_HOST_NOT_ALLOWLISTED")
            response = session.get(url, headers=HEADERS, timeout=25, allow_redirects=True)
            final = urlparse(response.url)
            if final.scheme != "https" or final.hostname not in ALLOWED_HOSTS:
                raise RuntimeError("REDIRECT_HOST_NOT_ALLOWLISTED:" + str(response.url))
            raw = response.content
            attempt.update({
                "httpStatus": response.status_code, "contentType": response.headers.get("Content-Type"),
                "finalUrl": response.url, "byteLength": len(raw), "sha256": sha(raw),
                "pdfMagic": raw.startswith(b"%PDF-"),
            })
            if response.status_code == 200 and raw:
                safe = re.sub(r"[^A-Za-z0-9_.-]", "_", src["id"])
                raw_path = RAW / f"{safe}_candidate_{index}.bin"
                raw_path.write_bytes(raw)
                attempt["rawArtifact"] = f"raw/{raw_path.name}"
                if raw.startswith(b"%PDF-"):
                    selected = (response, raw, safe, index, raw_path)
                    attempt["selection"] = "SELECTED_PDF_BYTES"
                    row["attempts"].append(attempt)
                    break
                attempt["selection"] = "NON_PDF_BYTES_RETAINED_CONTINUE"
            else:
                attempt["selection"] = "HTTP_FAILURE_CONTINUE"
        except Exception as exc:
            attempt["error"] = f"{type(exc).__name__}: {exc}"
        row["attempts"].append(attempt)

    if selected:
        response, raw, safe, index, raw_path = selected
        doc = fitz.open(stream=raw, filetype="pdf")
        full_text = "\n".join(page.get_text("text", sort=True) for page in doc)
        text_file = OUT / f"{safe}.txt"
        text_file.write_text(full_text, encoding="utf-8")
        row.update({
            "status": "DOWNLOADED_HASHED_PDF",
            "selectedUrl": response.url,
            "selectedCandidateIndex": index,
            "byteLength": len(raw),
            "sha256": sha(raw),
            "rawArtifact": f"raw/{raw_path.name}",
            "pdfPageCount": doc.page_count,
            "textExtractionMethod": "PyMuPDF page text; page indices are zero-based.",
            "textArtifact": text_file.name,
            "termFindings": {
                term: [i for i, page in enumerate(doc) if term.casefold() in page.get_text("text", sort=True).casefold()]
                for term in src["terms"]
            },
        })
    else:
        row["status"] = "NO_PDF_BYTES_ACQUIRED"
        row["error"] = "No allowlisted candidate returned a non-empty PDF payload. Review every attempt; do not claim a source hash from error HTML."
        if src["required"]:
            required_failures.append(src["id"])
    manifest["sources"].append(row)

# Acquire official HTML corroboration separately; a failure here is recorded but does not
# invalidate the required Gazette PDF acquisition.
for src in HTML_SOURCES:
    row = {"sourceId":src["id"],"url":src["url"],"publisher":src["publisher"],"documentTitle":src["documentTitle"],
           "purpose":src["purpose"],"retrievedAtUtc":datetime.now(timezone.utc).isoformat()}
    try:
        parsed = urlparse(src["url"])
        if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
            raise RuntimeError("URL_HOST_NOT_ALLOWLISTED")
        response = session.get(src["url"], headers=HEADERS, timeout=25, allow_redirects=True)
        final = urlparse(response.url)
        if final.scheme != "https" or final.hostname not in ALLOWED_HOSTS:
            raise RuntimeError("REDIRECT_HOST_NOT_ALLOWLISTED:" + response.url)
        raw = response.content
        row.update({"httpStatus":response.status_code,"finalUrl":response.url,
                    "contentType":response.headers.get("Content-Type"),"byteLength":len(raw),"sha256":sha(raw)})
        if response.status_code == 200 and raw:
            safe = re.sub(r"[^A-Za-z0-9_.-]", "_", src["id"])
            raw_path = RAW / f"{safe}.html"
            raw_path.write_bytes(raw)
            parser = PlainText()
            parser.feed(raw.decode(response.encoding or "utf-8", errors="replace"))
            text_value = re.sub(r"\\s+", " ", " ".join(parser.parts)).strip()
            text_path = OUT / f"{safe}.txt"
            text_path.write_text(text_value, encoding="utf-8")
            row.update({"status":"DOWNLOADED_HASHED_HTML","rawArtifact":f"raw/{raw_path.name}",
                        "textArtifact":text_path.name,"textSha256":sha(text_value.encode("utf-8")),
                        "termFindings":{term:term.casefold() in text_value.casefold() for term in src["terms"]}})
        else:
            row["status"] = "HTTP_FAILURE"
    except Exception as exc:
        row.update({"status":"FETCH_FAILED","error":f"{type(exc).__name__}: {exc}"})
    manifest["htmlSources"].append(row)

manifest["requiredFailures"] = required_failures
manifest["overallStatus"] = "REQUIRED_SOURCE_FAILURES" if required_failures else "REQUIRED_SOURCE_BYTES_ACQUIRED"
manifest["completedAtUtc"] = datetime.now(timezone.utc).isoformat()
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps(manifest, indent=2, ensure_ascii=False))
if required_failures:
    sys.exit(1)
