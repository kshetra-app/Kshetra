#!/usr/bin/env python3
"""Acquire and extract the official ECI 2008 Delimitation Order as source evidence.

This probe retries the same official document through browser-like session/cookie
flows and URL-encoding variants. It records unavailable responses as evidence;
it does not treat a missing PDF binary as legal acceptance.
"""
from __future__ import annotations
import hashlib, json, re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
from curl_cffi import requests
import fitz

URL = "https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008%28English%29.pdf"
URL_VARIANTS = [
    URL,
    URL.replace("%28", "(").replace("%29", ")"),
    URL + "?download=1",
]
HOME = "https://www.eci.gov.in/"
ALLOWED_HOSTS = {"www.eci.gov.in", "eci.gov.in"}
OUT = Path("stage_b_legal_source")
RAW = OUT / "raw"
OUT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.eci.gov.in/",
    "Origin": "https://www.eci.gov.in",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
}

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def get_allowlisted(session, initial_url: str, timeout=75):
    current = initial_url
    for _ in range(6):
        parsed = urlparse(current)
        if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
            raise RuntimeError(f"URL_NOT_ALLOWLISTED: {current}")
        response = session.get(current, headers=HEADERS, timeout=timeout, allow_redirects=False)
        if response.status_code in (301, 302, 303, 307, 308):
            location = response.headers.get("Location")
            if not location:
                raise RuntimeError("REDIRECT_WITHOUT_LOCATION")
            current = urljoin(current, location)
            continue
        return response, response.content, current
    raise RuntimeError("TOO_MANY_REDIRECTS")

manifest = {
 "schemaVersion":1,"sourceId":"SRC-ECI-DELIMITATION-ORDER-2008","sourceUrl":URL,
 "publisher":"Election Commission of India","sourceTitle":"Delimitation of Parliamentary and Assembly Constituencies Order, 2008",
 "retrievedAtUtc":datetime.now(timezone.utc).isoformat(),"status":"NOT_ACQUIRED","attempts":[],
 "rawArtifact":None,"rawBytes":None,"rawSha256":None,"httpStatus":None,"contentType":None,
 "etag":None,"lastModified":None,"finalUrl":None,"pdfMagic":False,"pdfPageCount":None,
 "extractionStatus":"NOT_ATTEMPTED","rosterEntriesExtracted":0,"rosterNumbersUnique":0,
 "rosterNumbers1To119Complete":False,"scheduleStartPageIndex0Based":None,
 "schedulePagesVisited":[],"parserWarnings":[],"error":None
}
selected=None
session=requests.Session(impersonate="chrome124")
# Establish ordinary first-party cookies, but do not rely on homepage availability.
try:
    home_resp, home_raw, home_final = get_allowlisted(session, HOME, timeout=30)
    manifest["homepageSession"]={"httpStatus":home_resp.status_code,"finalUrl":home_final,"cookieNames":sorted(session.cookies.keys())}
except Exception as exc:
    manifest["homepageSession"]={"error":f"{type(exc).__name__}: {exc}"}

for index, url in enumerate(URL_VARIANTS, start=1):
    attempt={"attempt":index,"url":url,"retrievedAtUtc":datetime.now(timezone.utc).isoformat()}
    try:
        response, raw, final_url = get_allowlisted(session, url)
        attempt.update({
          "httpStatus":response.status_code,"contentType":response.headers.get("Content-Type"),
          "etag":response.headers.get("ETag"),"lastModified":response.headers.get("Last-Modified"),
          "finalUrl":final_url,"responseBytes":len(raw),"responseSha256":sha256(raw),
          "pdfMagic":raw.startswith(b"%PDF-")
        })
        name=f"attempt_{index}.pdf" if response.status_code==200 and raw.startswith(b"%PDF-") else f"attempt_{index}_response.bin"
        (RAW/name).write_bytes(raw)
        attempt["artifact"]=f"raw/{name}"
        manifest["attempts"].append(attempt)
        if response.status_code==200 and raw.startswith(b"%PDF-"):
            selected=(response,raw,final_url,name)
            break
    except Exception as exc:
        attempt["error"]=f"{type(exc).__name__}: {exc}"
        manifest["attempts"].append(attempt)

if selected is None:
    manifest["status"]="SOURCE_HTTP_UNAVAILABLE"
    manifest["error"]="No URL variant returned a PDF; inspect attempt status/body hashes."
    if manifest["attempts"]:
        last=manifest["attempts"][-1]
        manifest.update({"httpStatus":last.get("httpStatus"),"contentType":last.get("contentType"),"rawBytes":last.get("responseBytes"),"rawSha256":last.get("responseSha256"),"finalUrl":last.get("finalUrl"),"rawArtifact":last.get("artifact")})
else:
    response,raw,final_url,name=selected
    manifest.update({
      "status":"PDF_ACQUIRED","httpStatus":response.status_code,"contentType":response.headers.get("Content-Type"),
      "etag":response.headers.get("ETag"),"lastModified":response.headers.get("Last-Modified"),
      "finalUrl":final_url,"rawBytes":len(raw),"rawSha256":sha256(raw),"pdfMagic":True,
      "rawArtifact":f"raw/{name}"
    })
    try:
        doc=fitz.open(stream=raw,filetype="pdf")
        manifest["pdfPageCount"]=doc.page_count
        start=None
        for i in range(min(doc.page_count,100)):
            t=doc[i].get_text("text",sort=True).upper()
            if "ANDHRA PRADESH" in t and ("SCHEDULE" in t or "ASSEMBLY CONSTITUENCIES" in t):
                start=i;break
        manifest["scheduleStartPageIndex0Based"]=start
        entries={}
        page_texts=[]
        if start is not None:
            for pi in range(start,min(doc.page_count,start+40)):
                page=doc[pi]
                words=page.get_text("words")
                lines={}
                for w in words:
                    x0,y0,x1,y1,word,*_=w
                    key=round(y0/2.0)*2.0
                    lines.setdefault(key,[]).append((x0,word))
                page_entries=[]
                for y,items in sorted(lines.items()):
                    left=[word for x,word in sorted(items) if x<260]
                    if not left:continue
                    line=" ".join(left).strip()
                    m=re.match(r"^\s*(\d{1,3})\.?\s+(.+?)\s*$",line)
                    if not m:continue
                    n=int(m.group(1));name=m.group(2).strip(" .\t")
                    if 1<=n<=294 and name and len(name)<80:page_entries.append((n,name))
                for n,name in page_entries:
                    if n not in entries:entries[n]={"acNumber":n,"name":name,"sourcePageIndex0Based":pi}
                manifest["schedulePagesVisited"].append(pi)
                page_texts.append(page.get_text("text",sort=True))
                if 119 in entries:break
        roster=[entries[n] for n in sorted(entries) if 1<=n<=119]
        numbers=[x["acNumber"] for x in roster]
        manifest["rosterEntriesExtracted"]=len(roster)
        manifest["rosterNumbersUnique"]=len(set(numbers))
        manifest["rosterNumbers1To119Complete"]=set(numbers)==set(range(1,120))
        manifest["extractionStatus"]="COMPLETE_119" if manifest["rosterNumbers1To119Complete"] else "PARTIAL_REQUIRES_PARSER_REVIEW"
        if len(roster)<119:manifest["parserWarnings"].append("Fewer than 119 AC rows extracted; inspect the PDF text and left-column coordinates.")
        roster_doc={
          "schemaVersion":1,"sourceId":"SRC-ECI-DELIMITATION-ORDER-2008","sourceUrl":URL,
          "sourcePdfBytes":len(raw),"sourcePdfSha256":sha256(raw),"pdfPageCount":doc.page_count,
          "scheduleStartPageIndex0Based":start,"entries":roster,"entryCount":len(roster),
          "numbersComplete1To119":manifest["rosterNumbers1To119Complete"],
          "method":"PyMuPDF word-coordinate extraction; candidate name text taken from left column only. This is not independently accepted until reconciled with the PDF text and state reorganisation/legal effective-date chain."
        }
        (OUT/"eci_2008_schedule_iii_telangana_roster_candidate.json").write_text(json.dumps(roster_doc,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        (OUT/"eci_2008_schedule_iii_page_text.txt").write_text("\n\n".join(page_texts),encoding="utf-8")
        manifest["rosterArtifact"]="eci_2008_schedule_iii_telangana_roster_candidate.json"
        manifest["textArtifact"]="eci_2008_schedule_iii_page_text.txt"
    except Exception as exc:
        manifest["extractionStatus"]="PARSER_ERROR"
        manifest["error"]=f"{type(exc).__name__}: {exc}"
manifest["completedAtUtc"]=datetime.now(timezone.utc).isoformat()
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
print(json.dumps({k:manifest.get(k) for k in ["status","httpStatus","rawBytes","rawSha256","pdfMagic","pdfPageCount","scheduleStartPageIndex0Based","rosterEntriesExtracted","rosterNumbers1To119Complete","extractionStatus","error","attempts","parserWarnings"]},indent=2))
