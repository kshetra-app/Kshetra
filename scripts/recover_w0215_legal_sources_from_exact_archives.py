#!/usr/bin/env python3
"""Verified-HTTPS recovery of exact official legal-document URL captures."""
from __future__ import annotations
import concurrent.futures, hashlib, json, re
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode, urlparse
import requests
import fitz

OUT=Path("stage_b_archival_recovery")
RAW=OUT/"raw"; TEXT=OUT/"text"
RAW.mkdir(parents=True,exist_ok=True); TEXT.mkdir(parents=True,exist_ok=True)
ARCHIVE_HOST="web.archive.org"
TIMEOUT=(8,22)
S=requests.Session()
S.headers.update({"User-Agent":"PANIN-W021.5-Legal-Evidence-Recovery/1.0","Accept":"application/pdf,application/json,text/html,*/*;q=0.8"})
def utc(): return datetime.now(timezone.utc).isoformat()
def sha(b): return hashlib.sha256(b).hexdigest()
def safe(s): return re.sub(r"[^A-Za-z0-9_.-]+","_",s)
def dump(path,obj):
    b=(json.dumps(obj,indent=2,ensure_ascii=False)+"\n").encode()
    path.write_bytes(b); return b

class Links(HTMLParser):
    def __init__(self,base): super().__init__(convert_charrefs=True); self.base=base; self.links=[]; self.forms=[]; self.form=None; self.link=None
    def handle_starttag(self,tag,attrs):
        from urllib.parse import urljoin
        a=dict(attrs); tag=tag.lower()
        for k in ("href","src","action","data-href","data-url"):
            if a.get(k) and (tag in ("a","link","iframe","frame","script","object","embed","source","form") or k.startswith("data-")):
                self.links.append({"tag":tag,"attribute":k,"url":urljoin(self.base,a[k])})
        if tag=="a" and a.get("href"): self.link={"url":urljoin(self.base,a["href"]),"text":[]}
        if tag=="form":
            self.form={"action":urljoin(self.base,a.get("action") or self.base),"method":(a.get("method") or "get").lower(),"controls":[]}
            self.forms.append(self.form)
        elif self.form is not None and tag in ("input","select","button","textarea"):
            self.form["controls"].append({k:a.get(k) for k in ("name","id","type","value")})
    def handle_data(self,data):
        if self.link is not None and data.strip(): self.link["text"].append(data.strip())
    def handle_endtag(self,tag):
        if tag.lower()=="a" and self.link is not None:
            self.link["text"]=" ".join(self.link["text"]); self.links.append(self.link); self.link=None
        if tag.lower()=="form": self.form=None

OFFICIAL_HOSTS={
 "www.eci.gov.in","eci.gov.in","eci.nic.in","www.eci.nic.in",
 "upload.indiacode.nic.in","indiacode.nic.in","www.indiacode.nic.in",
 "egazette.gov.in","www.egazette.gov.in","www.pib.gov.in","pib.gov.in",
 "sansad.in","apegazette.cgg.gov.in","www.apegazette.cgg.gov.in",
 "www.indiapost.gov.in","indiapost.gov.in","ceotelangana.nic.in",
 "ceodelhinet.nic.in","ceodelhi.gov.in"
}
SOURCES=[
 {"id":"ECI_2008_ORDER_CURRENT_URL","url":"https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008%28English%29.pdf","class":"PRIMARY_ECI_ORDER_ARCHIVE_COPY","terms":["Delimitation of Parliamentary and Assembly Constituencies Order, 2008","TABLE B","ANDHRA PRADESH"]},
 {"id":"ECI_2008_ORDER_LEGACY_URL","url":"http://eci.nic.in/eci_main/CurrentElections/CONSOLIDATED_ORDER%20_ECI%20.pdf","class":"PRIMARY_ECI_ORDER_LEGACY_ARCHIVE_COPY","terms":["Delimitation of Parliamentary and Assembly Constituencies Order, 2008","TABLE B"]},
 {"id":"ECI_2008_ORDER_FILENAME_VARIANT","url":"https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008(English).pdf","class":"PRIMARY_ECI_ORDER_ARCHIVE_COPY","terms":["Delimitation of Parliamentary and Assembly Constituencies Order, 2008","TABLE B"]},
 {"id":"GOI_GAZETTE_2023_SO382E_RECITAL","url":"https://egazette.gov.in/WriteReadData/2023/248113.pdf","class":"OFFICIAL_GAZETTE_2023_RECITAL_NOT_ORIGINAL_2008_ISSUE","terms":["S.O.382(E)","19th February, 2008"]},
 {"id":"ECI_NOTIFICATION_282_AP_2018_DEL","url":"https://www.eci.gov.in/eci-backend/public/api/download?url=LMAhAK6sOPBp%2FNFF0iRfXbEB1EVSLT41NNLRjYNJJP1KivrUxbfqkDatmHy12e%2FzVx8fLfn2ReU7TfrqYobgIsVIzE4H7zCkL60TDPfde3hSidsZ4fuGUaZAjsPMK3mFe%2FOayCb%2Bc1mgC3WIErfdO%2BA072J7HtGm2kYfstpL5XIZTWrH2JWU7UfZrKWF1BUsH9xccKER%2BJMZVGi7SrzX57%2FMm24zs1eyK2AB5zsjcWKzrILRQG%2FBbbQ%2Fx5bNYVaCn7kX4xoHNibbBVAsqukcOQ%3D%3D","class":"PRIMARY_ECI_NOTIFICATION_ARCHIVE_CROSSCHECK","terms":["282/AP/2018(DEL)","Schedule III","Table A"]},
 {"id":"LOK_SABHA_ON55E_PROCEEDINGS","url":"https://sansad.in/getFile/debatestextmk/16/XVI/19.12.2018.pdf?source=loksabhadocs","class":"OFFICIAL_PARLIAMENTARY_CORROBORATION_NOT_GAZETTE","terms":["O.N.55(E)","22 September 2018","delimitation"]},
 {"id":"INDIAPOST_MANUAL_DELIVERY_BEAT_CANDIDATE","url":"https://www.indiapost.gov.in/api/documents/file/U2FsdGVkX1--RhFaZrEZAs1p9vK78fGNgHXTbWx5f6en9hkrtRenRd6UW-nwfFIdx9zUCzn-sgveKpkmb8zqZw","class":"OFFICIAL_MANUAL_ARCHIVE_COPY_NOT_PROOF_OF_NATIONAL_POLYGONS","terms":["postal map","delivery beat","postmaster"]}
]
PORTALS=[
 "https://egazette.gov.in/","https://www.egazette.gov.in/",
 "https://apegazette.cgg.gov.in/",
 "https://deptpub.gov.in/search/O.N.55%28E%29/feed/rss2/",
 "https://deptpub.gov.in/search/Delimitation+Order+2008/feed/rss2/",
 "https://www.indiapost.gov.in/"
]
def live_probe(src):
    row={"sourceId":src["id"],"url":src["url"],"probedAtUtc":utc()}
    host=urlparse(src["url"]).hostname
    if host not in OFFICIAL_HOSTS:
        row.update({"status":"NOT_TRIED_UNAPPROVED_HOST","host":host}); return row
    # Keep TLS certificate verification enabled for all current-host probes.
    try:
        r=S.get(src["url"],timeout=TIMEOUT,allow_redirects=True,verify=True)
        row.update({"httpStatus":r.status_code,"finalUrl":r.url,"contentType":r.headers.get("Content-Type"),"byteLength":len(r.content),"sha256":sha(r.content) if r.content else None,"pdfMagic":r.content.startswith(b"%PDF-")})
        if r.status_code==200 and r.content.startswith(b"%PDF-"):
            fn=safe(src["id"])+"_live.pdf"; (RAW/fn).write_bytes(r.content)
            doc=fitz.open(stream=r.content,filetype="pdf")
            txt="\n".join(p.get_text("text",sort=True) for p in doc); tn=safe(src["id"])+"_live.txt"; (TEXT/tn).write_text(txt,encoding="utf-8")
            row.update({"status":"DIRECT_PDF_BYTES_ACQUIRED","rawArtifact":"raw/"+fn,"pdfPageCount":doc.page_count,"textArtifact":"text/"+tn,"textSha256":sha(txt.encode()),"termFindings":{t:t.casefold() in txt.casefold() for t in src["terms"]}})
        elif r.status_code==200 and "html" in (r.headers.get("Content-Type") or "").lower():
            parser=Links(r.url); parser.feed(r.text); row.update({"status":"DIRECT_HTML_DISCOVERY_ONLY","links":parser.links,"forms":parser.forms})
        else: row["status"]="DIRECT_HTTP_FAILURE_NOT_SOURCE_BYTES"
    except Exception as e:
        row.update({"status":"DIRECT_FETCH_FAILED_TLS_VERIFICATION_RETAINED","error":f"{type(e).__name__}: {e}"})
    return row
def archive_probe(src):
    original=src["url"]; row={"sourceId":src["id"],"originalUrl":original,"checkedAtUtc":utc(),"status":"NOT_ATTEMPTED","snapshots":[]}
    try:
        params=[("url",original),("output","json"),("fl","timestamp,original,statuscode,mimetype,digest,length"),("filter","statuscode:200"),("filter","mimetype:application/pdf"),("collapse","digest")]
        cdx="https://web.archive.org/cdx/search/cdx?"+urlencode(params)
        r=S.get(cdx,timeout=TIMEOUT,allow_redirects=True,verify=True)
        row.update({"cdxUrl":cdx,"cdxHttpStatus":r.status_code,"cdxBytes":len(r.content),"cdxSha256":sha(r.content) if r.content else None})
        if r.status_code!=200: row["status"]="CDX_HTTP_FAILURE"; return row
        try: data=r.json()
        except Exception: data=[line.split() for line in r.text.splitlines()]
        if not data or len(data)<2: row["status"]="NO_EXACT_URL_PDF_CAPTURE"; return row
        header=data[0]; snapshots=[]
        for z in data[1:]:
            item=z if isinstance(z,dict) else dict(zip(header,z))
            if item.get("statuscode")!="200" or item.get("mimetype")!="application/pdf" or not re.fullmatch(r"\d{14}",str(item.get("timestamp",""))): continue
            try: length=int(item.get("length") or 0)
            except: length=0
            if length<10000: continue
            snapshots.append({"timestamp":item["timestamp"],"original":item.get("original") or original,"statuscode":item["statuscode"],"mimetype":item["mimetype"],"cdxDigest":item.get("digest"),"cdxLength":length})
        snapshots.sort(key=lambda z:z["timestamp"],reverse=True)
        for snap in snapshots[:2]:
            archived=f"https://web.archive.org/web/{snap['timestamp']}id_/{snap['original']}"
            attempt={**snap,"archiveUrl":archived,"retrievedAtUtc":utc()}
            try:
                a=S.get(archived,timeout=TIMEOUT,allow_redirects=True,verify=True)
                attempt.update({"httpStatus":a.status_code,"finalUrl":a.url,"contentType":a.headers.get("Content-Type"),"byteLength":len(a.content),"sha256":sha(a.content) if a.content else None,"pdfMagic":a.content.startswith(b"%PDF-")})
                if a.status_code==200 and a.content.startswith(b"%PDF-"):
                    fn=safe(src["id"])+f"_wayback_{snap['timestamp']}.pdf"; (RAW/fn).write_bytes(a.content)
                    try:
                        doc=fitz.open(stream=a.content,filetype="pdf")
                        txt="\n".join(p.get_text("text",sort=True) for p in doc)
                        tn=safe(src["id"])+f"_wayback_{snap['timestamp']}.txt"; (TEXT/tn).write_text(txt,encoding="utf-8")
                        findings={t:t.casefold() in txt.casefold() for t in src["terms"]}
                        attempt.update({"pdfParseStatus":"PASS","pdfPageCount":doc.page_count,"rawArtifact":"raw/"+fn,"textArtifact":"text/"+tn,"textSha256":sha(txt.encode()),"termFindings":findings,"sourceClassification":src["class"],"archiveProvenance":"Internet Archive CDX record for exact original URL; not a current direct government-host response"})
                        if any(findings.values()):
                            row["selectedSnapshot"]=attempt
                    except Exception as e: attempt.update({"pdfParseStatus":"FAIL","pdfParseError":f"{type(e).__name__}: {e}","rawArtifact":"raw/"+fn})
                else: attempt["status"]="ARCHIVED_RESPONSE_NOT_PDF"
            except Exception as e: attempt.update({"status":"ARCHIVE_FETCH_FAILED_TLS_RETAINED","error":f"{type(e).__name__}: {e}"})
            row["snapshots"].append(attempt)
            if row.get("selectedSnapshot"): break
        row["status"]="ARCHIVED_PDF_ACQUIRED" if row.get("selectedSnapshot") else ("ARCHIVE_PDF_NO_MATCH" if row["snapshots"] else "NO_EXACT_URL_PDF_CAPTURE")
    except Exception as e: row.update({"status":"CDX_FAILED_TLS_VERIFICATION_RETAINED","error":f"{type(e).__name__}: {e}"})
    return row

manifest={"schemaVersion":1,"title":"W021.5 verified-HTTPS exact-URL archival recovery","retrievedAtUtc":utc(),"archiveIntermediary":"Internet Archive Wayback Machine","TLSVerification":"ENABLED for all live and archive requests; no verify=False, no WAF or CAPTCHA bypass","databaseAccess":"NONE","liveProbes":[],"archiveSearches":[],"portalProbes":[]}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    futures=[pool.submit(live_probe,src) for src in SOURCES]
    for fut in concurrent.futures.as_completed(futures): manifest["liveProbes"].append(fut.result())
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    futures=[pool.submit(archive_probe,src) for src in SOURCES]
    for fut in concurrent.futures.as_completed(futures): manifest["archiveSearches"].append(fut.result())
def portal_probe(url):
    row={"url":url,"probedAtUtc":utc()}
    try:
        r=S.get(url,timeout=TIMEOUT,allow_redirects=True,verify=True)
        row.update({"httpStatus":r.status_code,"finalUrl":r.url,"contentType":r.headers.get("Content-Type"),"byteLength":len(r.content),"sha256":sha(r.content) if r.content else None})
        if r.status_code==200 and r.content:
            fn=safe(urlparse(url).path.strip("/") or urlparse(url).hostname)+".html"; (RAW/fn).write_bytes(r.content)
            parser=Links(r.url); parser.feed(r.text); row.update({"status":"DOWNLOADED_HASHED_HTML_DISCOVERY_ONLY","rawArtifact":"raw/"+fn,"links":parser.links,"forms":parser.forms})
            if "rss2" in url:
                row["rssItemTextMentions"]={term:(term.casefold() in r.text.casefold()) for term in ("O.N.55(E)","Delimitation","282/AP/2018","S.O.382(E)")}
        else: row["status"]="HTTP_FAILURE_OR_EMPTY"
    except Exception as e: row.update({"status":"FETCH_FAILED_TLS_VERIFICATION_RETAINED","error":f"{type(e).__name__}: {e}"})
    return row
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    futures=[pool.submit(portal_probe,url) for url in PORTALS]
    for fut in concurrent.futures.as_completed(futures): manifest["portalProbes"].append(fut.result())
manifest["completedAtUtc"]=utc()
manifest["summary"]={
 "eci2008OrderArchiveCopyAcquired":any(x.get("selectedSnapshot") for x in manifest["archiveSearches"] if x["sourceId"].startswith("ECI_2008_ORDER")),
 "gazette2023RecitalArchiveCopyAcquired":any(x.get("selectedSnapshot") for x in manifest["archiveSearches"] if x["sourceId"]=="GOI_GAZETTE_2023_SO382E_RECITAL"),
 "eci2018NotificationIndependentArchiveCopyAcquired":any(x.get("selectedSnapshot") for x in manifest["archiveSearches"] if x["sourceId"]=="ECI_NOTIFICATION_282_AP_2018_DEL"),
 "lokSabhaProceedingsCopyAcquired":any(x.get("selectedSnapshot") for x in manifest["archiveSearches"] if x["sourceId"]=="LOK_SABHA_ON55E_PROCEEDINGS"),
 "indiaPostManualArchiveCopyAcquired":any(x.get("selectedSnapshot") for x in manifest["archiveSearches"] if x["sourceId"].startswith("INDIAPOST_MANUAL")),
 "note":"Archive copies retain original-URL and capture-time provenance. They are not automatically equivalent to a certified Gazette issue."
}
mb=dump(OUT/"manifest.json",manifest)
(OUT/"README.md").write_text("W021.5 exact-URL legal-source archival recovery. TLS verification stayed enabled. Each archived object is explicitly classified as a preservation copy, not a direct live government response. Original URL, archive timestamp, archive URL, byte length, SHA-256, PDF validation, page count and relevant-text findings are in manifest.json. A PDF error page is never accepted as a legal document. Gazette copies remain open unless exact issue identity and legal lineage are verified.\n",encoding="utf-8")
print(json.dumps({"status":"ARCHIVAL_RECOVERY_COMPLETED_WITH_PER_SOURCE_RESULTS","manifestBytes":len(mb),"manifestSha256":sha(mb),"summary":manifest["summary"],"archiveSearches":[{"sourceId":x["sourceId"],"status":x["status"],"tried":len(x.get("snapshots",[])),"selected":x.get("selectedSnapshot",{}).get("archiveUrl")} for x in manifest["archiveSearches"]],"portalProbes":[{"url":x["url"],"status":x.get("status"),"httpStatus":x.get("httpStatus"),"bytes":x.get("byteLength")} for x in manifest["portalProbes"]],"rawFiles":[{"path":p.as_posix(),"bytes":p.stat().st_size,"sha256":sha(p.read_bytes())} for p in sorted(RAW.glob("*")) if p.is_file()]},indent=2))
