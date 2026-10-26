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
        "id": "ECI_DELIMITATION_ORDER_2008",
        "urlCandidates": [
            "https://upload.indiacode.nic.in/showfile?actid=AC_CEN_3_20_00030_200233_1517807324510&filename=Delimitation+Order%2C2008.pdf&type=order",
            "https://upload.indiacode.nic.in/showfile?actid=AC_CEN_3_20_00030_200233_1517807324510&type=order&filename=Delimitation%20Order%2C2008.pdf",
            "https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008%28English%29.pdf"
        ],
        "publisher": "India Code / Election Commission of India",
        "documentTitle": "Delimitation of Parliamentary and Assembly Constituencies Order, 2008",
        "required": False,
        "terms": ["SCHEDULE - III", "ASSEMBLY CONSTITUENCIES", "TELANGANA", "ANDHRA PRADESH"],
        "purpose": "Primary historical delimitation order; acquire original PDF bytes if the exact official host permits access. Must be reconciled with later jurisdiction-specific orders and amendments; not alone proof of present legal extent."
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
    "elections24.eci.gov.in", "www.eci.gov.in", "eci.gov.in", "ceotelangana.nic.in", "www.pib.gov.in", "pib.gov.in", "apegazette.cgg.gov.in", "www.telangana.gov.in", "tggazette.cgg.gov.in", "indiankanoon.org", "egazette.gov.in", "www.egazette.gov.in", "deptpub.gov.in", "www.deptpub.gov.in", "old.eci.gov.in", "ceodelhi.gov.in", "ceodelhinet.nic.in",
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
        "id": "ECI_PUBLICATIONS_CATALOGUE",
        "url": "https://www.eci.gov.in/eci-publication/",
        "publisher": "Election Commission of India",
        "documentTitle": "Official ECI publications catalogue — exact legal PDF link discovery",
        "terms": ["Delimitation of Parliamentary & Assembly Constituencies Order - 2008", "Assam", "Jammu & Kashmir", "PDF"],
        "purpose": "First-party catalogue and link discovery only; HTML is not the underlying legal instrument. Extract and retry only exact discovered PDF hrefs."
    },
    {
        "id": "ECI_DELIMITATION_LANDING",
        "url": "https://www.eci.gov.in/delimitation/",
        "publisher": "Election Commission of India",
        "documentTitle": "Official ECI delimitation landing page and jurisdiction-specific legal-source index",
        "terms": ["Assam 2023", "Jammu & Kashmir", "Delimitation Commission", "Old Delimitation Orders"],
        "purpose": "Discover applicable jurisdiction-specific orders and corrigenda; landing page alone does not establish a complete legal chain."
    },
    {
        "id": "AP_EGAZETTE_CATALOGUE",
        "url": "https://apegazette.cgg.gov.in/",
        "publisher": "Government of Andhra Pradesh — Gazette publication portal",
        "documentTitle": "Official Andhra Pradesh e-Gazette portal",
        "terms": ["Gazette", "Search", "2018", "Notification"],
        "purpose": "Find the 22 September 2018 extraordinary Gazette counterpart for ECI Notification 282/AP/2018(DEL). Portal response is discovery evidence until the exact Gazette issue and PDF bytes are acquired."
    },
    {
        "id": "TELANGANA_GAZETTE_CATALOGUE",
        "url": "https://www.telangana.gov.in/gazette/",
        "publisher": "Government of Telangana",
        "documentTitle": "Official Telangana Gazette catalogue information page",
        "terms": ["tggazette.cgg.gov.in", "extraordinary", "authentic", "Gazette"],
        "purpose": "Custodian/portal discovery only; target notification is stated to be in the Andhra Pradesh State Gazette and Gazette of India, so do not substitute Telangana Gazette without evidence."
    },
    {
        "id": "ECI_LEGACY_DELIMITATION_ORDER_2008_PAGE",
        "url": "https://old.eci.gov.in/files/file/3931-delimitation-2008-order-issued-by-eci/",
        "publisher": "Election Commission of India — legacy official file library",
        "documentTitle": "Legacy ECI official file-library entry for Delimitation Order, 2008",
        "terms": ["Delimitation Order 2008", "PDF", "download", "Schedule II", "Schedule XXXI"],
        "purpose": "Discover the exact official attachment/download link and compare its bytes with the pre-existing claimed source digest; HTML page is discovery only."
    },
    {
        "id": "ECI_CURRENT_DELIMITATION_ORDER_2008_ARCHIVE_PAGE",
        "url": "https://eci.gov.in/files/file/3931-delimitation-of-parliamentary-and-assembly-constituencies-order-2008/",
        "publisher": "Election Commission of India — official file archive",
        "documentTitle": "Official ECI file archive for the 2008 Delimitation Order",
        "terms": ["Delimitation Order 2008", "PDF", "download", "Schedule II", "Schedule XXXI"],
        "purpose": "Second official archive route cited by repository dossiers; capture exact links and asset metadata without assuming a guessed file URL."
    },
    {
        "id": "ECI_DELIMITATION_ORDER_2008_LANDING_PAGE",
        "url": "https://eci.gov.in/delimitation/delimitation-order-2008/",
        "publisher": "Election Commission of India",
        "documentTitle": "Official ECI delimitation-order landing page",
        "terms": ["Delimitation Order 2008", "Schedules", "Gazette", "Assembly Constituencies"],
        "purpose": "Official landing-page discovery route named in the existing Gazette inventory; direct assets must be acquired and hashed separately."
    },
    {
        "id": "DEPT_PUBLICATION_SEARCH_GAZETTE_ON55E",
        "url": "https://deptpub.gov.in/?s=O.N.55%28E%29",
        "publisher": "Government of India, Department of Publication",
        "documentTitle": "Official catalogue search for Gazette identifier O.N.55(E)",
        "terms": ["O.N.55(E)", "22 September 2018", "Andhra Pradesh", "Delimitation"],
        "purpose": "Search the observed Department of Publication search form for the precise official Gazette item corroborated by Lok Sabha proceedings."
    },
    {
        "id": "DEPT_PUBLICATION_SEARCH_DELIMITATION_2008",
        "url": "https://deptpub.gov.in/?s=Delimitation%20Order%202008",
        "publisher": "Government of India, Department of Publication",
        "documentTitle": "Official catalogue search for Delimitation Order 2008",
        "terms": ["Delimitation Order 2008", "S.O.382(E)", "19 February 2008"],
        "purpose": "Search official publication catalogue using exact instrument wording; any result is a discovery lead until document bytes and identifier are verified."
    },
    {
        "id": "DEPT_PUBLICATION_SEARCH_SO382E",
        "url": "https://deptpub.gov.in/?s=S.O.%20382%28E%29",
        "publisher": "Government of India, Department of Publication",
        "documentTitle": "Official catalogue search for S.O.382(E), dated 19 February 2008",
        "terms": ["S.O.382(E)", "19 February 2008", "Delimitation"],
        "purpose": "Search exact commencement Gazette identifier; distinguish Presidential commencement order from the consolidated ECI schedule document."
    },
    {
        "id": "DEPT_PUBLICATION_SEARCH_AP_NOTIFICATION_2018",
        "url": "https://deptpub.gov.in/?s=282%2FAP%2F2018",
        "publisher": "Government of India, Department of Publication",
        "documentTitle": "Official catalogue search for ECI Notification 282/AP/2018(DEL)",
        "terms": ["282/AP/2018", "O.N.55(E)", "22 September 2018", "Andhra Pradesh"],
        "purpose": "Search exact ECI notification number against official publication catalogue; record whether an indexed or downloadable Gazette counterpart is exposed."
    },
    {
        "id": "CEO_DELHI_POLLING_STATION_LIST_INDEX",
        "url": "https://ceodelhinet.nic.in/ceodelhiweb/ListofPollingStation.aspx",
        "publisher": "Chief Electoral Officer, Government of NCT of Delhi",
        "documentTitle": "Official Delhi AC-organized polling station listing index",
        "terms": ["Assembly Constituency", "Polling Station", "List of Polling Station", "Part Number"],
        "purpose": "Investigate a jurisdictional pilot source for official AC/PS mapping. Do not claim national completeness from a Delhi-only list."
    },
    {
        "id": "CEO_DELHI_AC_MAPS_AND_POLLING_LOCATION_INDEX",
        "url": "https://ceodelhi.gov.in/MapPage.aspx",
        "publisher": "Chief Electoral Officer, Government of NCT of Delhi",
        "documentTitle": "Official Delhi GIS, Assembly Constituency maps and polling-location index",
        "terms": ["GIS Map with Polling Locations", "AC maps", "constituency map", "Polling Stations"],
        "purpose": "Discover exact official map and polling-location asset links; map links are not raw vector geometries unless the underlying file format proves that."
    },
    {
        "id": "DEPT_PUBLICATION_RSS_SEARCH_O_N_55E",
        "url": "https://deptpub.gov.in/search/O.N.55%28E%29/feed/rss2/",
        "publisher": "Government of India, Department of Publication",
        "documentTitle": "Official publisher RSS search feed for Gazette identifier O.N.55(E)",
        "terms": ["O.N.55(E)", "22 September 2018", "Gazette of India", "Andhra Pradesh", "Delimitation"],
        "purpose": "Follow the exact RSS link observed in the official Department of Publication search response; extract actual result items and item links rather than infer them from search form text."
    },
    {
        "id": "DEPT_PUBLICATION_RSS_SEARCH_DELIMITATION_2008",
        "url": "https://deptpub.gov.in/search/Delimitation+Order+2008/feed/rss2/",
        "publisher": "Government of India, Department of Publication",
        "documentTitle": "Official publisher RSS search feed for Delimitation Order 2008",
        "terms": ["Delimitation Order 2008", "S.O.382(E)", "S.O.383(E)", "S.O.453(E)", "19 February 2008"],
        "purpose": "Follow the exact RSS link observed in the official search response to discover any matching issue/item records."
    },
    {
        "id": "DEPT_PUBLICATION_RSS_SEARCH_SO_382E",
        "url": "https://deptpub.gov.in/search/S.O.+382%28E%29/feed/rss2/",
        "publisher": "Government of India, Department of Publication",
        "documentTitle": "Official publisher RSS search feed for notification S.O.382(E)",
        "terms": ["S.O.382(E)", "19 February 2008", "Delimitation"],
        "purpose": "Query the original publication-reference number in the official publisher RSS feed; any nonmatching result remains discovery only."
    },
    {
        "id": "DEPT_PUBLICATION_RSS_SEARCH_282_AP_2018",
        "url": "https://deptpub.gov.in/search/282/AP/2018/feed/rss2/",
        "publisher": "Government of India, Department of Publication",
        "documentTitle": "Official publisher RSS search feed for ECI Notification 282/AP/2018(DEL)",
        "terms": ["282/AP/2018", "O.N.55(E)", "22 September 2018", "Andhra Pradesh"],
        "purpose": "Query the specific ECI instrument identifier through the publication site's observed RSS search route."
    },
    {
        "id": "TELANGANA_HIGH_COURT_2018_DELIMITATION_JUDGMENT",
        "url": "https://indiankanoon.org/doc/71192582/",
        "publisher": "Telangana High Court judgment (secondary online text reproduction)",
        "documentTitle": "Marri Shasidhar Reddy v. Election Commission of India, decision dated 16 November 2018",
        "terms": ["282/AP/2018(DEL)", "53-Rampachodavaram", "67-Polavaram", "Telangana"],
        "purpose": "Independent judicial-context cross-check for the notification's legal effect; not a replacement for original ECI notification or Gazette bytes."
    },
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
    },
    {
        "id": "GAZETTE_OF_INDIA_OFFICIAL_PORTAL",
        "url": "https://egazette.gov.in/",
        "publisher": "Government of India, Department of Publication / eGazette",
        "documentTitle": "Official Gazette of India search portal — exact issue discovery",
        "terms": ["Gazette Directory", "Election", "Extra Ordinary Gazettes", "22 September 2018"],
        "purpose": "Official custodian discovery route for locating the exact Gazette of India issue carrying Notification No. 282/AP/2018(DEL); homepage acquisition alone is not the notification or certified Gazette."
    },
    {
        "id": "DEPARTMENT_OF_PUBLICATION_GAZETTE_CATALOGUE",
        "url": "https://deptpub.gov.in/document-category/gazett/",
        "publisher": "Government of India, Department of Publication",
        "documentTitle": "Official Department of Publication Gazette catalogue",
        "terms": ["Gazettes", "View", "Download"],
        "purpose": "Official index/custodian route to corroborate Gazette publication and locate the issue; catalogue text alone is not the original instrument."
    }
]

class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
    def handle_data(self, data):
        if data and data.strip():
            self.parts.append(data.strip())

class LinkAndFormCollector(HTMLParser):
    """Capture links and search-form metadata from official portal HTML for reproducible follow-up."""
    def __init__(self):
        super().__init__()
        self.links = []
        self.forms = []
        self._form = None
        self._link = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for attr in ("href", "src", "data-href", "data-url", "data-file", "action"):
            value = a.get(attr)
            if value and (tag.lower() in ("a", "iframe", "frame", "object", "embed", "source", "link", "script") or attr in ("data-href", "data-url", "data-file")):
                self.links.append({"tag": tag.lower(), "attribute": attr, "href": value, "text": "", "discoveredFrom": "HTML_ATTRIBUTE"})
        if tag.lower() == "a" and a.get("href"):
            self._link = {"href": a["href"], "textParts": []}
        elif tag.lower() == "form":
            self._form = {"action": a.get("action"), "method": (a.get("method") or "get").lower(), "inputs": []}
            self.forms.append(self._form)
        elif tag.lower() in ("input", "select", "button", "textarea") and self._form is not None:
            item = {"tag": tag.lower(), "name": a.get("name"), "type": a.get("type"), "value": a.get("value"), "id": a.get("id")}
            self._form["inputs"].append(item)
    def handle_data(self, data):
        if self._link is not None and data and data.strip():
            self._link["textParts"].append(data.strip())
    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._link is not None:
            self._link["text"] = " ".join(self._link.pop("textParts"))
            self.links.append(self._link)
            self._link = None
        elif tag.lower() == "form":
            self._form = None

class RssParser(HTMLParser):
    """Extract exact item title/link/date/description from a publisher's RSS XML feed."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items = []
        self._item = None
        self._field = None
        self._parts = []
    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag == "item":
            self._item = {}
        elif self._item is not None and tag in ("title", "link", "guid", "pubdate", "description", "dc:date"):
            self._field = tag
            self._parts = []
    def handle_data(self, data):
        if self._field is not None and data:
            self._parts.append(data.strip())
    def handle_endtag(self, tag):
        tag = tag.lower()
        if self._item is not None and self._field == tag:
            self._item[self._field] = " ".join(x for x in self._parts if x)
            self._field = None
            self._parts = []
        elif tag == "item" and self._item is not None:
            self.items.append(self._item)
            self._item = None

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
            response = session.get(url, headers=HEADERS, timeout=10, allow_redirects=True)
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
        response = session.get(src["url"], headers=HEADERS, timeout=10, allow_redirects=True)
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
            decoded_html = raw.decode(response.encoding or "utf-8", errors="replace")
            parser = PlainText()
            parser.feed(decoded_html)
            text_value = re.sub(r"\s+", " ", " ".join(parser.parts)).strip()
            text_path = OUT / f"{safe}.txt"
            text_path.write_text(text_value, encoding="utf-8")
            collector = LinkAndFormCollector()
            collector.feed(decoded_html)
            extra = {}
            if "/feed/rss2/" in src["url"]:
                rss = RssParser()
                rss.feed(decoded_html)
                extra = {"rssItems": rss.items, "rssItemCount": len(rss.items)}
            row.update({"status":"DOWNLOADED_HASHED_HTML","rawArtifact":f"raw/{raw_path.name}",
                        "textArtifact":text_path.name,"textSha256":sha(text_value.encode("utf-8")),
                        "discoveredLinks":collector.links,
                        "searchForms":collector.forms,
                        **extra,
                        "termFindings":{term:term.casefold() in text_value.casefold() for term in src["terms"]}})
        else:
            row["status"] = "HTTP_FAILURE"
    except Exception as exc:
        row.update({"status":"FETCH_FAILED","error":f"{type(exc).__name__}: {exc}"})
    manifest["htmlSources"].append(row)

manifest["requiredFailures"] = required_failures
critical_ids = {"ECI_DELIMITATION_ORDER_2008", "ECI_NOTIFICATION_282_AP_2018_DEL"}
critical_source_failures = [row["sourceId"] for row in manifest["sources"] if row["sourceId"] in critical_ids and row["status"] != "DOWNLOADED_HASHED_PDF"]
manifest["criticalSourceFailures"] = critical_source_failures
manifest["overallStatus"] = ("REQUIRED_SOURCE_FAILURES" if required_failures else "PARTIAL_CRITICAL_SOURCE_FAILURES" if critical_source_failures else "REQUIRED_SOURCE_BYTES_ACQUIRED")
manifest["completedAtUtc"] = datetime.now(timezone.utc).isoformat()
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps(manifest, indent=2, ensure_ascii=False))
if required_failures or critical_source_failures:
    sys.exit(1)
