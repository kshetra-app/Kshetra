#!/usr/bin/env python3
"""Acquire and extract the official ECI 2008 Delimitation Order as source evidence.

External-source unavailability is recorded as evidence rather than treated as a
product CI failure. A successful HTTP response is not legal acceptance; the PDF
hash, extraction status and all parsing ambiguities are preserved in the manifest.
"""
from __future__ import annotations
import hashlib, json, re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
from curl_cffi import requests
import fitz

URL = "https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008%28English%29.pdf"
ALLOWED_HOSTS = {"www.eci.gov.in", "eci.gov.in"}
OUT = Path("stage_b_legal_source")
RAW = OUT / "raw"
OUT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def fetch_allowlisted(initial_url: str):
    current = initial_url
    for _ in range(6):
        parsed = urlparse(current)
        if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
            raise RuntimeError(f"URL_NOT_ALLOWLISTED: {current}")
        response = requests.get(
            current,
            headers={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36","Accept":"application/pdf,application/octet-stream;q=0.9,*/*;q=0.8","Referer":"https://www.eci.gov.in/"},
            timeout=75, impersonate="chrome124", allow_redirects=False
        )
        if response.status_code in (301,302,303,307,308):
            location=response.headers.get("Location")
            if not location: raise RuntimeError("REDIRECT_WITHOUT_LOCATION")
            current=urljoin(current,location)
            continue
        return response,response.content,current
    raise RuntimeError("TOO_MANY_REDIRECTS")

manifest={
 "schemaVersion":1,
 "sourceId":"SRC-ECI-DELIMITATION-ORDER-2008",
 "sourceUrl":URL,
 "publisher":"Election Commission of India",
 "sourceTitle":"Delimitation of Parliamentary and Assembly Constituencies Order, 2008",
 "retrievedAtUtc":datetime.now(timezone.utc).isoformat(),
 "status":"NOT_ACQUIRED",
 "rawArtifact":None,
 "rawBytes":None,
 "rawSha256":None,
 "httpStatus":None,
 "contentType":None,
 "etag":None,
 "lastModified":None,
 "finalUrl":None,
 "pdfMagic":False,
 "pdfPageCount":None,
 "extractionStatus":"NOT_ATTEMPTED",
 "rosterEntriesExtracted":0,
 "rosterNumbersUnique":0,
 "rosterNumbers1To119Complete":False,
 "scheduleStartPageIndex0Based":None,
 "schedulePagesVisited":[],
 "parserWarnings":[],
 "error":None
}
try:
    response,raw,final_url=fetch_allowlisted(URL)
    manifest.update({
      "httpStatus":response.status_code,
      "contentType":response.headers.get("Content-Type"),
      "etag":response.headers.get("ETag"),
      "lastModified":response.headers.get("Last-Modified"),
      "finalUrl":final_url,
      "rawBytes":len(raw),
      "rawSha256":sha256(raw),
      "pdfMagic":raw.startswith(b"%PDF-")
    })
    body_name="eci-delimitation-order-2008.pdf" if response.status_code==200 and raw.startswith(b"%PDF-") else "eci-delimitation-order-2008-response.bin"
    (RAW/body_name).write_bytes(raw)
    manifest["rawArtifact"]=f"raw/{body_name}"
    if response.status_code!=200:
        manifest["status"]="SOURCE_HTTP_UNAVAILABLE"
        manifest["error"]=f"HTTP_{response.status_code}"
    elif not raw.startswith(b"%PDF-"):
        manifest["status"]="SOURCE_RESPONSE_NOT_PDF"
        manifest["error"]="HTTP 200 response did not begin with PDF magic bytes"
    else:
        doc=fitz.open(stream=raw,filetype="pdf")
        manifest["pdfPageCount"]=doc.page_count
        # Find the Andhra Pradesh Schedule III start page by its legal heading.
        start=None
        for i in range(min(doc.page_count,100)):
            t=doc[i].get_text("text",sort=True).upper()
            if "ANDHRA PRADESH" in t and ("SCHEDULE" in t or "ASSEMBLY CONSTITUENCIES" in t):
                start=i
                break
        manifest["scheduleStartPageIndex0Based"]=start
        entries={}
        page_texts=[]
        if start is not None:
            for pi in range(start,min(doc.page_count,start+40)):
                page=doc[pi]
                words=page.get_text("words")
                # The statutory schedule places AC number/name in the left column.
                # Keep the right-hand territorial-extent column out of the roster name.
                lines={}
                for w in words:
                    x0,y0,x1,y1,word,*_=w
                    key=round(y0/2.0)*2.0
                    lines.setdefault(key,[]).append((x0,word))
                page_entries=[]
                for y,items in sorted(lines.items()):
                    left=[word for x,word in sorted(items) if x<260]
                    if not left: continue
                    line=" ".join(left).strip()
                    m=re.match(r"^\s*(\d{1,3})\.?\s+(.+?)\s*$",line)
                    if not m: continue
                    n=int(m.group(1)); name=m.group(2).strip(" .\t")
                    if 1<=n<=294 and name and len(name)<80:
                        page_entries.append((n,name))
                for n,name in page_entries:
                    if n not in entries:
                        entries[n]={"acNumber":n,"name":name,"sourcePageIndex0Based":pi}
                manifest["schedulePagesVisited"].append(pi)
                page_texts.append(page.get_text("text",sort=True))
                if 119 in entries:
                    break
        roster=[entries[n] for n in sorted(entries) if 1<=n<=119]
        numbers=[x["acNumber"] for x in roster]
        manifest["rosterEntriesExtracted"]=len(roster)
        manifest["rosterNumbersUnique"]=len(set(numbers))
        manifest["rosterNumbers1To119Complete"]=set(numbers)==set(range(1,120))
        manifest["status"]="PDF_ACQUIRED_AND_TEXT_EXTRACTED"
        manifest["extractionStatus"]="COMPLETE_119" if manifest["rosterNumbers1To119Complete"] else "PARTIAL_REQUIRES_PARSER_REVIEW"
        if len(roster)<119:
            manifest["parserWarnings"].append("Roster parser extracted fewer than 119 Andhra Pradesh Schedule III AC entries; inspect extracted text and PDF page coordinates.")
        roster_doc={
          "schemaVersion":1,
          "sourceId":"SRC-ECI-DELIMITATION-ORDER-2008",
          "sourceUrl":URL,
          "sourcePdfBytes":len(raw),
          "sourcePdfSha256":sha256(raw),
          "pdfPageCount":doc.page_count,
          "scheduleStartPageIndex0Based":start,
          "entries":roster,
          "entryCount":len(roster),
          "numbersComplete1To119":manifest["rosterNumbers1To119Complete"],
          "method":"PyMuPDF word-coordinate extraction; candidate name text taken from left column only. This is a machine-extracted roster candidate, not independently accepted until reconciled with the PDF text and state reorganisation/legal effective-date chain."
        }
        (OUT/"eci_2008_schedule_iii_telangana_roster_candidate.json").write_text(json.dumps(roster_doc,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        (OUT/"eci_2008_schedule_iii_page_text.txt").write_text("\n\n".join(page_texts),encoding="utf-8")
        manifest["rosterArtifact"]="eci_2008_schedule_iii_telangana_roster_candidate.json"
        manifest["textArtifact"]="eci_2008_schedule_iii_page_text.txt"
except Exception as exc:
    manifest["status"]="ACQUISITION_OR_EXTRACTION_ERROR"
    manifest["error"]=f"{type(exc).__name__}: {exc}"
manifest["completedAtUtc"]=datetime.now(timezone.utc).isoformat()
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
print(json.dumps({k:manifest.get(k) for k in ["status","httpStatus","rawBytes","rawSha256","pdfMagic","pdfPageCount","scheduleStartPageIndex0Based","rosterEntriesExtracted","rosterNumbers1To119Complete","extractionStatus","error","parserWarnings"]},indent=2))
