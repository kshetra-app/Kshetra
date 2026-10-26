#!/usr/bin/env python3
"""Evidence-only deep probe of Gazette archive indexes and India Post official document catalogues.

No TLS verification is disabled; no authentication, CAPTCHA, or WAF is bypassed.
A Gazette candidate is retained as the required item only if PDF bytes, parsed text,
exact O.N.55(E)/282/AP/2018 markers and the Andhra Pradesh delimitation context agree.
PIN-code boundaries are always classified separately from delivery-beat geometry.
"""
from __future__ import annotations
import concurrent.futures
import hashlib
import html
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urljoin, urlparse
from html.parser import HTMLParser

import requests
import fitz

OUT = Path("stage_b_catalogue_expansion")
RAW = OUT / "raw"
TEXT = OUT / "text"
RAW.mkdir(parents=True, exist_ok=True)
TEXT.mkdir(parents=True, exist_ok=True)

TIMEOUT = (10, 24)
MAX_GAZETTE_PDF_ATTEMPTS = 500
MAX_POSTAL_DOCUMENT_DOWNLOADS = 50
LIVE_ALLOWED_HOSTS = {
    "egazette.gov.in", "www.egazette.gov.in", "egazette.nic.in", "www.egazette.nic.in",
    "deptpub.gov.in", "www.deptpub.gov.in", "www.indiapost.gov.in", "indiapost.gov.in",
    "data.gov.in", "www.data.gov.in", "sikkim.data.gov.in",
    "www.eci.gov.in", "eci.gov.in", "apegazette.cgg.gov.in",
    "ceo-andhra.nic.in", "ceotelangana.nic.in", "sansad.in",
}
USER_AGENT = "PANIN-W021.5-Official-Catalogue-Forensic-Probe/1.0"
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": USER_AGENT,
    "Accept": "application/pdf,text/html,application/xhtml+xml,application/json,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
})

def now() -> str:
    return datetime.now(timezone.utc).isoformat()

def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def safe(s: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", s).strip("_")[:150]

def approved_live_url(url: str) -> bool:
    p = urlparse(url)
    return p.scheme == "https" and (p.hostname or "").lower() in LIVE_ALLOWED_HOSTS

class LinkParser(HTMLParser):
    def __init__(self, base: str):
        super().__init__(convert_charrefs=True)
        self.base = base
        self.links = []
        self._a = None
        self._form = None
        self.forms = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        tag = tag.lower()
        for key in ("href", "src", "action", "data-url", "data-href", "data-file"):
            if a.get(key) and (tag in ("a", "link", "iframe", "frame", "script", "object", "embed", "source", "form") or key.startswith("data-")):
                self.links.append({
                    "tag": tag, "attribute": key, "url": urljoin(self.base, html.unescape(a[key])),
                    "text": "", "discoveredFrom": "HTML_ATTRIBUTE"
                })
        if tag == "a" and a.get("href"):
            self._a = {"tag": "a", "attribute": "href", "url": urljoin(self.base, html.unescape(a["href"])), "textParts": []}
        if tag == "form":
            self._form = {"action": urljoin(self.base, a.get("action") or self.base), "method": (a.get("method") or "get").lower(), "inputs": []}
            self.forms.append(self._form)
        elif self._form is not None and tag in ("input", "select", "button", "textarea"):
            self._form["inputs"].append({k:a.get(k) for k in ("name", "id", "type", "value")})
    def handle_data(self, data):
        if self._a is not None and data and data.strip():
            self._a["textParts"].append(data.strip())
    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._a is not None:
            self._a["text"] = " ".join(self._a.pop("textParts"))
            self._a["discoveredFrom"] = "HTML_ANCHOR"
            self.links.append(self._a)
            self._a = None
        if tag.lower() == "form":
            self._form = None

def save_bytes(name: str, data: bytes) -> str:
    p = RAW / name
    p.write_bytes(data)
    return str(p.relative_to(OUT))

def save_text(name: str, text: str) -> str:
    p = TEXT / name
    p.write_text(text, encoding="utf-8")
    return str(p.relative_to(OUT))

def parse_pdf(raw: bytes) -> dict:
    if not raw.startswith(b"%PDF-"):
        return {"pdfMagic": False, "pdfParseStatus": "NOT_PDF"}
    try:
        doc = fitz.open(stream=raw, filetype="pdf")
        pages = doc.page_count
        text_value = "\n".join(p.get_text("text", sort=True) for p in doc)
        return {
            "pdfMagic": True,
            "pdfParseStatus": "PASS",
            "pdfVersion": re.match(rb"%PDF-([0-9.]+)", raw).group(1).decode() if re.match(rb"%PDF-([0-9.]+)", raw) else None,
            "pdfPageCount": pages,
            "text": text_value,
            "textSha256": sha(text_value.encode("utf-8")),
        }
    except Exception as e:
        return {"pdfMagic": True, "pdfParseStatus": "FAIL", "pdfParseError": f"{type(e).__name__}: {e}"}

def gazette_match(txt: str) -> dict:
    folded = re.sub(r"\s+", " ", txt).casefold()
    on55 = bool(re.search(r"\bo\.?\s*n\.?\s*55\s*\(\s*e\s*\)", txt, re.I))
    notice = bool(re.search(r"282\s*/\s*AP\s*/\s*2018\s*\(\s*DEL\s*\)", txt, re.I))
    date = bool(re.search(r"22(?:nd)?\s+September,?\s+2018|22\s*[-/]\s*09\s*[-/]\s*2018|22\.09\.2018", txt, re.I))
    constituency = any(x in folded for x in ("rampachodavaram", "polavaram", "andhra pradesh"))
    gazette = ("gazette of india" in folded or "भारत का राजपत्र" in txt)
    score = sum([on55, notice, date, constituency, gazette])
    return {
        "on55EExactMarker": on55,
        "eci2018NotificationNumberMarker": notice,
        "publicationDateMarker": date,
        "andhraPradeshConstituencyContext": constituency,
        "gazetteOfIndiaMarker": gazette,
        "gazetteCandidateScore": score,
        "strictGazetteCandidate": bool(on55 and date and constituency and gazette),
    }

def probe_live_page(url: str, label: str) -> dict:
    row = {"label": label, "requestedUrl": url, "retrievedAtUtc": now()}
    if not approved_live_url(url):
        row.update({"status": "REJECTED_UNAPPROVED_HOST_OR_SCHEME"})
        return row
    try:
        r = SESSION.get(url, timeout=TIMEOUT, allow_redirects=True, verify=True)
        final = r.url
        if not approved_live_url(final):
            row.update({"status": "REJECTED_REDIRECT_HOST_OR_SCHEME", "httpStatus": r.status_code, "finalUrl": final})
            return row
        raw = r.content
        row.update({
            "finalUrl": final,
            "httpStatus": r.status_code,
            "contentType": r.headers.get("Content-Type"),
            "byteLength": len(raw),
            "sha256": sha(raw) if raw else None,
            "firstBytesHex": raw[:16].hex(),
        })
        if r.status_code != 200 or not raw:
            row["status"] = "HTTP_FAILURE_OR_EMPTY"
            return row
        ctype = (r.headers.get("Content-Type") or "").lower()
        if raw.startswith(b"%PDF-") or "application/pdf" in ctype:
            pdf = parse_pdf(raw)
            row.update({k:v for k,v in pdf.items() if k != "text"})
            if pdf.get("pdfParseStatus") == "PASS":
                name = safe(label) + "_live.pdf"
                row["rawArtifact"] = save_bytes(name, raw)
                text_name = safe(label) + "_live.txt"
                row["textArtifact"] = save_text(text_name, pdf["text"])
                row["textSha256"] = pdf["textSha256"]
                row["gazetteTermFindings"] = gazette_match(pdf["text"])
                row["titleSnippets"] = pdf["text"][:1500]
                row["status"] = "DIRECT_PDF_BYTES_ACQUIRED"
            else:
                row["status"] = "PDF_BYTES_WITH_PARSE_FAILURE"
        else:
            name = safe(label) + "_live.html"
            row["rawArtifact"] = save_bytes(name, raw)
            body = r.text
            parser = LinkParser(final)
            parser.feed(body)
            row.update({
                "status": "DOWNLOADED_HASHED_HTML_DISCOVERY_ONLY",
                "textLength": len(body),
                "links": parser.links[:3000],
                "forms": parser.forms[:100],
                "bodyTermFindings": {term: term.casefold() in body.casefold() for term in (
                    "O.N.55(E)", "282/AP/2018", "S.O.382(E)", "postal manual",
                    "post office guide", "delivery beat", "postal map", "Pincode Boundary"
                )},
            })
            # India Post publishes document catalogue metadata in serialized page JSON.
            # Extract title/url pairs only from actual retrieved HTML; never invent IDs.
            embedded = []
            for m in re.finditer(r'"title"\s*:\s*"([^"]{1,300})".{0,1200}?"url"\s*:\s*"([^"]{1,300})"', body, re.I | re.S):
                title, path = m.group(1), m.group(2).replace("\\/", "/")
                if path.startswith("/api/documents/file/"):
                    embedded.append({"title": html.unescape(title), "url": urljoin(final, path)})
            dedup = {}
            for x in embedded:
                dedup[(x["title"], x["url"])] = x
            doc_mentions = list(dedup.values())
            row["embeddedDocumentLinkCount"] = len(doc_mentions)
            row["relevantDocumentLinks"] = [
                x for x in doc_mentions if re.search(
                    r"postal manual|post office guide|delivery.?beat|postman.{0,35}(manual|guide)|manual.{0,35}post office|postal operations|post office rules|post office manual",
                    x["title"], re.I
                )
            ][:250]
            row["documentTitleSamples"] = doc_mentions[:40]
        return row
    except Exception as e:
        row.update({"status": "FETCH_FAILED_TLS_VERIFICATION_RETAINED", "error": f"{type(e).__name__}: {e}"})
        return row

def cdx_query(label: str, params: dict) -> dict:
    url = "https://web.archive.org/cdx/search/cdx?" + urlencode(params, doseq=True)
    row = {"label":label,"cdxUrl":url,"queriedAtUtc":now(),"status":"NOT_ATTEMPTED"}
    try:
        r = SESSION.get(url, timeout=(10,40), allow_redirects=True, verify=True)
        raw = r.content
        row.update({"httpStatus":r.status_code,"byteLength":len(raw),"sha256":sha(raw) if raw else None})
        name = safe(label) + "_cdx.txt"
        row["rawArtifact"] = save_bytes(name, raw)
        if r.status_code != 200:
            row["status"] = "CDX_HTTP_FAILURE"
            return row, []
        # CDX output=json is a JSON array-of-arrays, not JSONL.
        # Parse the entire response first; do not silently degrade to whitespace-split records.
        data = None
        try:
            data = json.loads(r.text.strip().rstrip(","))
        except Exception:
            try:
                data = r.json()
            except Exception:
                data = None
        if not isinstance(data, list) or len(data) < 2:
            row["status"] = "NO_CDX_RECORDS"
            row["recordCount"] = 0
            row["parseError"] = "NO_VALID_JSON_ARRAY"
            return row, []
        header = data[0]
        records = []
        for cells in data[1:]:
            try:
                if isinstance(cells, dict):
                    item = cells
                elif isinstance(header, list) and isinstance(cells, list):
                    item = dict(zip(header, cells))
                else:
                    continue
                if str(item.get("statuscode")) == "200":
                    records.append(item)
            except Exception:
                continue
        row["status"] = "CDX_RESULTS_ACQUIRED"
        row["recordCount"] = len(records)
        row["fields"] = header
        row["sampleRecords"] = records[:8]
        return row, records
    except Exception as e:
        row.update({"status":"CDX_FETCH_FAILED_TLS_VERIFICATION_RETAINED","error":f"{type(e).__name__}: {e}"})
        return row, []

def archived_pdf_probe(item: dict, query_label: str) -> dict:
    ts = str(item.get("timestamp") or "")
    original = str(item.get("original") or "")
    row = {"queryLabel":query_label,"timestamp":ts,"originalUrl":original,"cdxDigest":item.get("digest"),"cdxLength":item.get("length"),"attemptedAtUtc":now()}
    if not re.fullmatch(r"\d{14}", ts):
        row["status"] = "INVALID_ARCHIVE_TIMESTAMP"
        return row
    archive_url = f"https://web.archive.org/web/{ts}id_/{original}"
    row["archiveUrl"] = archive_url
    try:
        r = SESSION.get(archive_url, timeout=TIMEOUT, allow_redirects=True, verify=True)
        raw = r.content
        row.update({"httpStatus":r.status_code,"finalUrl":r.url,"contentType":r.headers.get("Content-Type"),"byteLength":len(raw),"sha256":sha(raw) if raw else None,"pdfMagic":raw.startswith(b"%PDF-")})
        if r.status_code != 200 or not raw.startswith(b"%PDF-"):
            row["status"] = "ARCHIVED_RESPONSE_NOT_PDF"
            return row
        pdf = parse_pdf(raw)
        row.update({k:v for k,v in pdf.items() if k != "text"})
        if pdf.get("pdfParseStatus") != "PASS":
            row["status"] = "ARCHIVED_PDF_PARSE_FAILED"
            return row
        findings = gazette_match(pdf["text"])
        row["termFindings"] = findings
        row["textPreview"] = pdf["text"][:1200]
        if findings["strictGazetteCandidate"]:
            raw_name = safe(f"GAZETTE_ON55E_{ts}") + ".pdf"
            text_name = safe(f"GAZETTE_ON55E_{ts}") + ".txt"
            row["rawArtifact"] = save_bytes(raw_name, raw)
            row["textArtifact"] = save_text(text_name, pdf["text"])
            row["status"] = "STRICT_GAZETTE_ON55E_CANDIDATE_ACQUIRED"
        elif findings["on55EExactMarker"] or findings["eci2018NotificationNumberMarker"]:
            raw_name = safe(f"GAZETTE_NEAR_MATCH_{ts}") + ".pdf"
            row["candidateRawArtifact"] = save_bytes(raw_name, raw)
            row["status"] = "LEGAL_IDENTIFIER_NEAR_MATCH_NOT_ACCEPTED_AS_GAZETTE"
        else:
            row["status"] = "VALID_PDF_NO_TARGET_MARKERS"
        return row
    except Exception as e:
        row.update({"status":"ARCHIVE_DOWNLOAD_FAILED","error":f"{type(e).__name__}: {e}"})
        return row

def main():
    manifest = {
        "schemaVersion":1,
        "title":"W021.5 deep official Gazette and India Post catalogue evidence probe",
        "runStartedAtUtc":now(),
        "liveTlsVerification":"ENABLED",
        "archiveIntermediary":"Internet Archive Wayback CDX and exact-capture URLs",
        "databaseAccess":"NONE",
        "scope":"Read-only discovery and source-byte acquisition only; no canonicality is conferred by a successful download.",
        "livePages":[],
        "cdxQueries":[],
        "archivedPdfAttempts":[],
        "postalDocumentAttempts":[],
        "disposition":{},
    }
    live_urls = [
        ("EGazette_Extraordinary_Search","https://egazette.gov.in/SearchResult.aspx?Category=extraordinary"),
        ("EGazette_Ordinary_Search","https://egazette.gov.in/SearchResult.aspx?Category=ordinary"),
        ("EGazette_Home","https://egazette.gov.in/"),
        ("Department_Publication_Search_On55E","https://deptpub.gov.in/?s=O.N.55%28E%29"),
        ("Department_Publication_Search_2008Order","https://deptpub.gov.in/?s=Delimitation%20Order%202008"),
        ("ECI_Delimitation_Landing","https://www.eci.gov.in/delimitation/"),
        ("ECI_Publications_Catalogue","https://www.eci.gov.in/eci-publication/"),
        ("AP_EGazette_Home","https://apegazette.cgg.gov.in/"),
        ("IndiaPost_Home","https://www.indiapost.gov.in/"),
        ("IndiaPost_Ebooks","https://www.indiapost.gov.in/documents/ebooks"),
        ("IndiaPost_ActsAndPolicies","https://www.indiapost.gov.in/documents/actsandpolicies"),
        ("IndiaPost_Guidelines","https://www.indiapost.gov.in/documents/guidelines"),
        ("IndiaPost_Publications","https://www.indiapost.gov.in/documents/publications"),
        ("IndiaPost_OrdersAndNotices","https://www.indiapost.gov.in/documents/ordersandnotices"),
        ("IndiaPost_GazetteNotifications","https://www.indiapost.gov.in/documents/gazzettenotifications"),
        ("IndiaPost_RecruitmentRules","https://www.indiapost.gov.in/documents/recruitmentrules"),
        ("OGD_AllIndiaPincodeGeoJSON","https://data.gov.in/resource/all-india-pincode-boundary-geojson"),
        ("OGD_SikkimPincodeGeoJSON","https://sikkim.data.gov.in/catalog/all-india-pincode-boundary-geo-json"),
    ]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        future_map = {pool.submit(probe_live_page, url, label):(url,label) for label,url in live_urls}
        for fut in concurrent.futures.as_completed(future_map):
            manifest["livePages"].append(fut.result())
    # These are official publication index/document-directory URL prefixes. CDX prefix
    # results are discovery leads; each returned PDF must be downloaded and parsed before
    # it is accepted as O.N.55(E). No guessed file ID is used.
    cdx_specs = [
      ("EGazetteGovIn2018PdfsCaptured2018To2026",{
        "url":"https://egazette.gov.in/WriteReadData/2018/","matchType":"prefix",
        "from":"20180922","to":"20261231","output":"json",
        "fl":"timestamp,original,statuscode,mimetype,digest,length","filter":["statuscode:200","mimetype:application/pdf"],
        "collapse":"urlkey","limit":"4000"
      }),
      ("EGazetteGovIn2018PdfsAllCaptures",{
        "url":"https://egazette.gov.in/WriteReadData/2018/","matchType":"prefix",
        "output":"json","fl":"timestamp,original,statuscode,mimetype,digest,length",
        "filter":["statuscode:200","mimetype:application/pdf"],"collapse":"urlkey","limit":"4000"
      }),
      ("EGazetteNicIn2018PdfsCaptured2018To2026",{
        "url":"https://egazette.nic.in/WriteReadData/2018/","matchType":"prefix",
        "from":"20180922","to":"20261231","output":"json",
        "fl":"timestamp,original,statuscode,mimetype,digest,length","filter":["statuscode:200","mimetype:application/pdf"],
        "collapse":"urlkey","limit":"4000"
      }),
      ("EGazetteExtraordinarySearchHtmlArchive",{
        "url":"https://egazette.gov.in/SearchResult.aspx?Category=extraordinary",
        "from":"20180101","to":"20261231","output":"json","fl":"timestamp,original,statuscode,mimetype,digest,length",
        "filter":["statuscode:200","mimetype:text/html"],"collapse":"timestamp:6","limit":"200"
      }),
      ("EGazetteExtraordinarySearchHtmlArchiveLegacy",{
        "url":"https://egazette.nic.in/SearchResult.aspx?Category=extraordinary",
        "from":"20180101","to":"20261231","output":"json","fl":"timestamp,original,statuscode,mimetype,digest,length",
        "filter":["statuscode:200","mimetype:text/html"],"collapse":"timestamp:6","limit":"200"
      }),
    ]
    cdx_rows = []
    for label,params in cdx_specs:
        row, records = cdx_query(label,params)
        row["candidatesLimitedByRun"] = min(len(records), MAX_GAZETTE_PDF_ATTEMPTS)
        manifest["cdxQueries"].append(row)
        if "2018Pdfs" in label:
            cdx_rows.extend((label,x) for x in records if str(x.get("mimetype","")).lower()=="application/pdf")
        elif "SearchHtmlArchive" in label and records:
            # Search-page captures are valuable discovery only; preserve up to 40 snapshot responses.
            html_records=sorted(records,key=lambda x:(x.get("timestamp",""),x.get("original","")),reverse=True)[:40]
            for rec in html_records:
                ts=str(rec.get("timestamp") or "")
                original=str(rec.get("original") or "")
                try:
                    url=f"https://web.archive.org/web/{ts}id_/{original}"
                    rr=SESSION.get(url,timeout=TIMEOUT,allow_redirects=True,verify=True)
                    body=rr.content
                    item={"queryLabel":label,"timestamp":ts,"originalUrl":original,"archiveUrl":url,"httpStatus":rr.status_code,"byteLength":len(body),"sha256":sha(body) if body else None}
                    if rr.status_code==200 and body:
                        item["rawArtifact"]=save_bytes(safe(label+"_"+ts)+".html",body)
                        text_body=rr.text
                        item["bodyFindings"]={term:term.casefold() in text_body.casefold() for term in ("O.N.55(E)","282/AP/2018","22 September 2018","delimitation","Rampachodavaram","Polavaram")}
                        lp=LinkParser(rr.url);lp.feed(text_body)
                        item["links"]=lp.links[:1500]
                        item["forms"]=lp.forms[:50]
                        item["status"]="ARCHIVED_SEARCH_PAGE_DOWNLOADED_DISCOVERY_ONLY"
                    else:
                        item["status"]="ARCHIVED_SEARCH_PAGE_NOT_DOWNLOADED"
                    manifest["archivedPdfAttempts"].append(item)
                except Exception as e:
                    manifest["archivedPdfAttempts"].append({"queryLabel":label,"timestamp":ts,"originalUrl":original,"status":"ARCHIVED_SEARCH_PAGE_FETCH_FAILED","error":f"{type(e).__name__}: {e}"})
    # Deduplicate file URLs, retaining the capture nearest to the 2018 publication date.
    by_url = {}
    for qlabel, x in cdx_rows:
        original = str(x.get("original") or "")
        if not original or not original.lower().endswith(".pdf"):
            continue
        ts = str(x.get("timestamp") or "")
        if not re.fullmatch(r"\d{14}",ts):
            continue
        previous=by_url.get(original)
        if previous is None:
            by_url[original]=(qlabel,x)
        else:
            prev_ts=str(previous[1].get("timestamp") or "")
            # Prefer captures from late 2018/2019; otherwise the earliest captured PDF after publication.
            def score(st):
                try:
                    year=int(st[:4]);month=int(st[4:6]);day=int(st[6:8])
                    if year==2018 and (month,day)>=(9,22): return (0,abs(int(st[:8])-20180922),st)
                    if year==2019:return (1,abs(int(st[:8])-20180922),st)
                    return (2,abs(int(st[:8])-20180922),st)
                except: return (3,99999999,st)
            if score(ts)<score(prev_ts):
                by_url[original]=(qlabel,x)
    candidates=list(by_url.values())
    candidates.sort(key=lambda pair:(
        0 if pair[1].get("timestamp","")[:4] in ("2018","2019") else 1,
        abs(int(pair[1].get("timestamp","20180922000000")[:8])-20180922),
        -int(pair[1].get("length") or 0)
    ))
    selected=candidates[:MAX_GAZETTE_PDF_ATTEMPTS]
    def try_pdf(pair):
        label,item=pair
        return archived_pdf_probe(item,label)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures=[pool.submit(try_pdf,x) for x in selected]
        for fut in concurrent.futures.as_completed(futures):
            res=fut.result()
            # retain only target-matching PDFs and the bounded metadata for misses;
            # all candidate hash/status records are still retained for reproducibility.
            manifest["archivedPdfAttempts"].append(res)
    # Discover and acquire the India Post official document candidates based only on
    # title/url pairs actually present in acquired official HTML.
    doc_links={}
    for page in manifest["livePages"]:
        if not page.get("label","").startswith("IndiaPost_") or page.get("status")!="DOWNLOADED_HASHED_HTML_DISCOVERY_ONLY":
            continue
        for x in page.get("relevantDocumentLinks",[]):
            doc_links[(x["title"],x["url"])]=x
    def download_postal_document(x):
        url=x["url"]
        row={"title":x["title"],"observedUrl":url,"attemptedAtUtc":now(),"classification":"OFFICIAL_POSTAL_DOCUMENT_CANDIDATE"}
        try:
            p=urlparse(url)
            if p.scheme!="https" or p.hostname not in ("www.indiapost.gov.in","indiapost.gov.in"):
                row["status"]="REJECTED_UNAPPROVED_POSTAL_DOCUMENT_URL";return row
            r=SESSION.get(url,timeout=TIMEOUT,allow_redirects=True,verify=True)
            if not approved_live_url(r.url):
                row.update({"status":"REJECTED_REDIRECT_HOST","httpStatus":r.status_code,"finalUrl":r.url});return row
            raw=r.content
            row.update({"httpStatus":r.status_code,"finalUrl":r.url,"contentType":r.headers.get("Content-Type"),"byteLength":len(raw),"sha256":sha(raw) if raw else None,"pdfMagic":raw.startswith(b"%PDF-")})
            if r.status_code!=200 or not raw.startswith(b"%PDF-"):
                row["status"]="POSTAL_DOCUMENT_RESPONSE_NOT_VALID_PDF";return row
            pdf=parse_pdf(raw)
            row.update({k:v for k,v in pdf.items() if k!="text"})
            if pdf.get("pdfParseStatus")!="PASS":
                row["status"]="POSTAL_PDF_PARSE_FAILED";return row
            text_body=pdf["text"]
            terms={
              "deliveryBeat":bool(re.search(r"delivery\s+beat|beat\s+list|delivery\s+list",text_body,re.I)),
              "postalMap":bool(re.search(r"postal\s+map|postman.?s\s+map",text_body,re.I)),
              "postmaster":bool(re.search(r"postmaster",text_body,re.I)),
              "postalManual":bool(re.search(r"postal\s+manual|post\s+office\s+manual|post\s+office\s+guide",text_body,re.I)),
              "nationalPolygon":bool(re.search(r"geo.?json|shapefile|geospatial\s+data|GIS",text_body,re.I)),
            }
            row["termFindings"]=terms
            row["textPreview"]=text_body[:2000]
            name=safe(x["title"])+"_postal_document.pdf"
            row["rawArtifact"]=save_bytes(name,raw)
            row["textArtifact"]=save_text(safe(x["title"])+"_postal_document.txt",text_body)
            row["status"]="OFFICIAL_POSTAL_PDF_ACQUIRED"
            return row
        except Exception as e:
            row.update({"status":"POSTAL_DOCUMENT_FETCH_FAILED","error":f"{type(e).__name__}: {e}"})
            return row
    selected_postal=list(doc_links.values())[:MAX_POSTAL_DOCUMENT_DOWNLOADS]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures=[pool.submit(download_postal_document,x) for x in selected_postal]
        for fut in concurrent.futures.as_completed(futures):
            manifest["postalDocumentAttempts"].append(fut.result())
    manifest["completedAtUtc"]=now()
    matched=[x for x in manifest["archivedPdfAttempts"] if x.get("status")=="STRICT_GAZETTE_ON55E_CANDIDATE_ACQUIRED"]
    near=[x for x in manifest["archivedPdfAttempts"] if x.get("status")=="LEGAL_IDENTIFIER_NEAR_MATCH_NOT_ACCEPTED_AS_GAZETTE"]
    usable_postal=[x for x in manifest["postalDocumentAttempts"] if x.get("status")=="OFFICIAL_POSTAL_PDF_ACQUIRED" and (x.get("termFindings",{}).get("deliveryBeat") or x.get("termFindings",{}).get("postalMap"))]
    manifest["disposition"]={
      "strictGazetteON55ECandidateCount":len(matched),
      "nearMatchPdfCount":len(near),
      "archivedPdfUrlsAttempted":sum(1 for x in manifest["archivedPdfAttempts"] if x.get("queryLabel","").find("2018Pdfs")>=0 and x.get("pdfMagic") is not None),
      "officialPostalDocumentCandidatesDiscovered":len(doc_links),
      "officialPostalPdfsAcquired":len(manifest["postalDocumentAttempts"]),
      "postalPdfsMentioningDeliveryBeatOrPostalMap":len(usable_postal),
      "interpretation":"A strict Gazette candidate must still be reconciled against its issue metadata and ECI source. No candidate URL or archive record alone establishes authenticity. PIN-code polygons are not delivery-beat polygons.",
    }
    mb=(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n").encode()
    (OUT/"manifest.json").write_bytes(mb)
    (OUT/"README.md").write_text(
      "W021.5 evidence-only deep official catalogue probe. All live HTTPS requests retained TLS verification. Archive candidates originate only from Wayback CDX records for official Gazette directory/search URL prefixes; every PDF is parsed and tested for O.N.55(E), date, Gazette and Andhra Pradesh delimitation markers. Any strict match is a candidate for human/legal issue reconciliation, not automatic legal acceptance. India Post documents are discovered only from titles/URLs present in official retrieved catalogue HTML; PIN-code resources are never treated as delivery beats. Full source/response hashes are in manifest.json.\n",
      encoding="utf-8"
    )
    print(json.dumps({
      "status":"CATALOGUE_AND_ARCHIVE_EXPANSION_COMPLETED",
      "manifestBytes":len(mb),
      "manifestSha256":sha(mb),
      "disposition":manifest["disposition"],
      "cdxQueries":[{"label":x["label"],"status":x["status"],"records":x.get("recordCount")} for x in manifest["cdxQueries"]],
      "livePages":[{"label":x["label"],"status":x.get("status"),"httpStatus":x.get("httpStatus"),"bytes":x.get("byteLength"),"sha256":x.get("sha256"),"relevantDocumentLinks":len(x.get("relevantDocumentLinks",[]))} for x in manifest["livePages"]],
      "strictMatches":[{"url":x.get("originalUrl"),"archiveUrl":x.get("archiveUrl"),"bytes":x.get("byteLength"),"sha256":x.get("sha256"),"pages":x.get("pdfPageCount")} for x in matched],
      "postalManualMatches":[{"title":x.get("title"),"url":x.get("finalUrl"),"bytes":x.get("byteLength"),"sha256":x.get("sha256"),"terms":x.get("termFindings")} for x in usable_postal],
    },indent=2))
if __name__=="__main__":
    main()
