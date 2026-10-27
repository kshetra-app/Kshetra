#!/usr/bin/env python3
"""Focused exact-identifier and AP Gazette archival probe for W021.5 Stage B.

This probe follows only (a) exact candidate URLs/identifiers documented in prior source
inventories, or (b) PDF URLs returned by the Internet Archive CDX index for the official AP
Gazette host/date window. It never declares a Gazette authentic from a filename or archive
capture alone. Raw PDFs are retained only when their text/metadata is a material legal-source
candidate; the manifest records hashes/statuses for every fetch attempt.
"""
from __future__ import annotations
import concurrent.futures, gzip, hashlib, html, json, re, shutil, subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urlparse
import requests, fitz

OUT=Path("stage_b_exact_gazette_probe")
RAW=OUT/"raw"; TEXT=OUT/"text"
RAW.mkdir(parents=True,exist_ok=True); TEXT.mkdir(parents=True,exist_ok=True)
TIMEOUT=(8,18)
USER_AGENT="PANIN-W021.5-Exact-Gazette-Source-Forensic-Probe/1.0"
CA=Path("/etc/ssl/certs/ca-certificates.crt")
TLS_VERIFY=str(CA) if CA.is_file() else True
S=requests.Session()
S.headers.update({"User-Agent":USER_AGENT,"Accept":"application/pdf,text/html,application/xhtml+xml,*/*;q=0.8","Accept-Language":"en-IN,en;q=0.9"})
ALLOWED={"web.archive.org","index.commoncrawl.org","data.commoncrawl.org","egazette.gov.in","www.egazette.gov.in","egazette.nic.in","www.egazette.nic.in","apegazette.cgg.gov.in","www.apegazette.cgg.gov.in","deptpub.gov.in","www.deptpub.gov.in"}

def now(): return datetime.now(timezone.utc).isoformat()
def sha(b): return hashlib.sha256(b).hexdigest()
def safe(s): return re.sub(r"[^A-Za-z0-9_.-]+","_",s).strip("_")[:160]
def approved(url):
 p=urlparse(url)
 return p.scheme=="https" and (p.hostname or "").lower() in ALLOWED

def first_text(doc):
 return doc[0].get_text("text",sort=True) if doc.page_count else ""

def compact(s): return re.sub(r"\s+","",s or "").casefold()

def markers(full, first, kind):
 f=compact(first); a=compact(full)
 if kind=="2008":
  date=any(x in f for x in ("19thfebruary,2008","19february,2008","19thfebruary2008","19february2008","19/02/2008","19-02-2008","19.02.2008"))
  issue71=bool(re.search(r"\bno\.?\s*71\b",first,re.I))
  gazette=("gazetteofindia" in f or "भारतकाराजपत्र" in first)
  part=bool(re.search(r"part\s*ii",first,re.I) and re.search(r"section\s*3",first,re.I) and re.search(r"sub[\s-]*section",first,re.I))
  ids={
   "SO382E":bool(re.search(r"s\.?\s*o\.?\s*382\s*\(\s*e\s*\)",full,re.I)),
   "SO383E":bool(re.search(r"s\.?\s*o\.?\s*383\s*\(\s*e\s*\)",full,re.I)),
   "SO453E":bool(re.search(r"s\.?\s*o\.?\s*453\s*\(\s*e\s*\)",full,re.I)),
  }
  delim=bool(re.search(r"delimitation.{0,160}(parliamentary|assembly)|(?:parliamentary|assembly).{0,160}delimitation",full,re.I|re.S))
  return {
   "publicationDate19Feb2008OnFirstPage":date,
   "issueNo71OnFirstPage":issue71,
   "gazetteOfIndiaOnFirstPage":gazette,
   "partSectionMetadataOnFirstPage":part,
   "targetNotificationMarkersAnywhere":ids,
   "delimitationOrderTextAnywhere":delim,
   "issue71Candidate":bool(date and issue71 and gazette and part),
   "strictLegalContentCandidate":bool(date and gazette and part and any(ids.values()) and delim),
  }
 date=any(x in f for x in ("22ndseptember,2018","22september,2018","22ndseptember2018","22september2018","22/09/2018","22-09-2018","22.09.2018"))
 on55=bool(re.search(r"\bo\.?\s*n\.?\s*55\s*\(\s*e\s*\)",full,re.I)) or "on.55(e)" in a or "o.n.55(e)" in a
 notif=bool(re.search(r"282\s*/\s*AP\s*/\s*2018",full,re.I))
 apctx=bool(re.search(r"andhra\s+pradesh",full,re.I))
 gazette=("gazetteofindia" in f or "भारतकाराजपत्र" in first)
 part=bool(re.search(r"part\s*ii",first,re.I) and re.search(r"section\s*3",first,re.I))
 return {
  "publicationDate22Sep2018OnFirstPage":date,
  "on55EAnywhere":on55,
  "eciNotification282AP2018Anywhere":notif,
  "andhraPradeshContextAnywhere":apctx,
  "gazetteOfIndiaOnFirstPage":gazette,
  "partSectionMetadataOnFirstPage":part,
  "strictON55EGazetteCandidate":bool(date and on55 and notif and apctx and gazette),
  "issueDateAndRelatedContextCandidate":bool(date and (on55 or notif) and apctx and gazette),
 }

def query_cdx(label, params, manifest):
 url="https://web.archive.org/cdx/search/cdx?"+urlencode(params,doseq=True)
 rec={"label":label,"url":url,"queriedAtUtc":now()}
 try:
  if not approved(url): raise ValueError("CDX URL not approved")
  r=S.get(url,timeout=TIMEOUT,allow_redirects=True,verify=TLS_VERIFY)
  b=r.content
  rec.update({"httpStatus":r.status_code,"byteLength":len(b),"sha256":sha(b)})
  if r.status_code!=200:
   rec.update({"status":"CDX_HTTP_FAILURE","errorBodySha256":sha(b) if b else None});manifest["cdxQueries"].append(rec);return []
  (RAW/(safe(label)+"_cdx.txt")).write_bytes(b)
  try: data=json.loads(r.text.strip().rstrip(","))
  except Exception: data=None
  if not isinstance(data,list) or len(data)<2:
   rec.update({"status":"NO_CDX_RECORDS","recordCount":0});manifest["cdxQueries"].append(rec);return []
  hdr=data[0]; out=[]
  for cells in data[1:]:
   item=dict(zip(hdr,cells)) if isinstance(hdr,list) and isinstance(cells,list) else cells if isinstance(cells,dict) else {}
   if str(item.get("statuscode"))=="200" and str(item.get("mimetype","")).startswith("application/pdf"):
    out.append(item)
  rec.update({"status":"CDX_RESULTS_ACQUIRED","recordCount":len(out),"sampleRecords":out[:12]})
  manifest["cdxQueries"].append(rec)
  return out
 except Exception as e:
  rec.update({"status":"CDX_FETCH_FAILED_TLS_VERIFICATION_RETAINED","error":f"{type(e).__name__}: {e}"})
  manifest["cdxQueries"].append(rec);return []

def capture_url(ts,original):
 # Preserve the actual source URL in CDX metadata; do not silently substitute a different
 # Gazette URL. Wayback id_ asks for the archived response bytes instead of a replay wrapper.
 return f"https://web.archive.org/web/{ts}id_/{original}"

def probe_candidate(item, cohort, gazette_kind):
 ts=str(item.get("timestamp") or "")
 original=str(item.get("original") or item.get("url") or "")
 archive=str(item.get("archiveUrl") or (capture_url(ts,original) if ts and original else original))
 rec={"cohort":cohort,"gazetteKind":gazette_kind,"originalUrl":original,"archiveUrl":archive,"captureTimestamp":ts or None,"attemptedAtUtc":now(),"status":"NOT_ATTEMPTED"}
 if not approved(archive):
  rec.update({"status":"REJECTED_UNAPPROVED_URL"});return rec
 try:
  r=S.get(archive,timeout=TIMEOUT,allow_redirects=True,verify=TLS_VERIFY)
  final=r.url; b=r.content
  rec.update({"finalUrl":final,"httpStatus":r.status_code,"contentType":r.headers.get("Content-Type"),"byteLength":len(b),"sha256":sha(b) if b else None,"pdfMagic":b.startswith(b"%PDF-")})
  if not approved(final):
   rec.update({"status":"REJECTED_REDIRECT_HOST"});return rec
  if r.status_code!=200 or not b.startswith(b"%PDF-"):
   rec.update({"status":"FETCH_FAILED_OR_NOT_PDF"});return rec
  try:
   doc=fitz.open(stream=b,filetype="pdf")
   pages=[p.get_text("text",sort=True) for p in doc]
   full="\n".join(pages); first=pages[0] if pages else ""
   rec.update({"pdfParseStatus":"PASS","pdfVersion":re.match(rb"%PDF-([0-9.]+)",b).group(1).decode() if re.match(rb"%PDF-([0-9.]+)",b) else None,
    "pdfPageCount":doc.page_count,"firstPageTextBytes":len(first.encode()),"firstPageTextSha256":sha(first.encode()),"fullTextBytes":len(full.encode()),"fullTextSha256":sha(full.encode()),
    "findings":markers(full,first,gazette_kind),
    "firstPagePreview":first[:2800],"fullTextPreview":full[:1800]})
  except Exception as e:
   rec.update({"status":"PDF_PARSE_FAILED","pdfParseError":f"{type(e).__name__}: {e}"});return rec
  findings=rec.get("findings",{})
  material=False
  if gazette_kind=="2008":
   material=bool(findings.get("issue71Candidate") or findings.get("strictLegalContentCandidate") or findings.get("delimitationOrderTextAnywhere") or any(findings.get("targetNotificationMarkersAnywhere",{}).values()))
  else:
   material=bool(findings.get("strictON55EGazetteCandidate") or findings.get("issueDateAndRelatedContextCandidate") or findings.get("on55EAnywhere") or findings.get("eciNotification282AP2018Anywhere"))
  if material:
   name=safe(f"{cohort}_{gazette_kind}_{ts or sha(original.encode())[:12]}")+".pdf"
   textname=safe(f"{cohort}_{gazette_kind}_{ts or sha(original.encode())[:12]}")+".txt"
   (RAW/name).write_bytes(b)
   (TEXT/textname).write_text(full,encoding="utf-8")
   rec["rawArtifact"]="raw/"+name;rec["textArtifact"]="text/"+textname
  if gazette_kind=="2008" and findings.get("strictLegalContentCandidate"):
   rec["status"]="STRICT_2008_GAZETTE_LEGAL_CONTENT_CANDIDATE_NEEDS_ISSUE_RECONCILIATION"
  elif gazette_kind=="2008" and findings.get("issue71Candidate"):
   rec["status"]="GAZETTE_2008_ISSUE71_METADATA_CANDIDATE_NEEDS_LEGAL_REVIEW"
  elif gazette_kind=="2018" and findings.get("strictON55EGazetteCandidate"):
   rec["status"]="STRICT_ON55E_GAZETTE_CANDIDATE_NEEDS_ISSUE_RECONCILIATION"
  elif gazette_kind=="2018" and findings.get("issueDateAndRelatedContextCandidate"):
   rec["status"]="GAZETTE_2018_DATE_RELATED_CONTEXT_CANDIDATE_NOT_STRICT"
  elif material:
   rec["status"]="LEGAL_MARKER_NEAR_MATCH_NOT_ACCEPTED_AS_GAZETTE"
  else:
   rec["status"]="VALID_PDF_NO_TARGET_MARKERS"
  return rec
 except Exception as e:
  rec.update({"status":"ARCHIVE_FETCH_FAILED_TLS_VERIFICATION_RETAINED","error":f"{type(e).__name__}: {e}"})
  return rec

def probe_live_page(url,label,manifest):
 rec={"label":label,"requestedUrl":url,"attemptedAtUtc":now()}
 if not approved(url):
  rec["status"]="REJECTED_UNAPPROVED_URL";manifest["livePages"].append(rec);return
 try:
  r=S.get(url,timeout=TIMEOUT,allow_redirects=True,verify=TLS_VERIFY)
  b=r.content;final=r.url
  rec.update({"finalUrl":final,"httpStatus":r.status_code,"contentType":r.headers.get("Content-Type"),"byteLength":len(b),"sha256":sha(b) if b else None})
  if not approved(final): rec["status"]="REJECTED_REDIRECT_HOST";manifest["livePages"].append(rec);return
  if r.status_code==200 and b:
   ctype=(r.headers.get("Content-Type") or "").lower()
   if "html" in ctype or b"<html" in b[:800].lower():
    name=safe(label)+"_live.html";(RAW/name).write_bytes(b);rec["rawArtifact"]="raw/"+name
    textbody=b.decode(r.encoding or "utf-8",errors="replace")
    rec["pageTitle"]=(re.search(r"<title[^>]*>(.*?)</title>",textbody,re.I|re.S).group(1).strip()[:500] if re.search(r"<title[^>]*>(.*?)</title>",textbody,re.I|re.S) else None)
    rec["targetMarkerFindings"]={
     "on55E":bool(re.search(r"O\.?\s*N\.?\s*55\s*\(\s*E\s*\)",textbody,re.I)),
     "notification282AP2018":bool(re.search(r"282\s*/\s*AP\s*/\s*2018",textbody,re.I)),
     "so382E":bool(re.search(r"S\.?\s*O\.?\s*382\s*\(\s*E\s*\)",textbody,re.I)),
     "issueNo71":bool(re.search(r"\bNo\.?\s*71\b",textbody,re.I)),
    }
    rec["status"]="OFFICIAL_CATALOGUE_HTML_ACQUIRED"
   else:
    rec["status"]="HTTP_200_NON_HTML"
  else: rec["status"]="HTTP_FAILURE"
 except Exception as e:rec.update({"status":"LIVE_PROBE_FAILED_TLS_VERIFICATION_RETAINED","error":f"{type(e).__name__}: {e}"})
 manifest["livePages"].append(rec)

def load_cdx_snapshot(path: Path, manifest: dict) -> list:
 """Load previously captured CDX bytes without replacing them with derived records."""
 rec={"path":str(path),"loadedAtUtc":now()}
 try:
  raw=path.read_bytes()
  rec.update({"byteLength":len(raw),"sha256":sha(raw)})
  data=json.loads(raw.decode("utf-8").strip().rstrip(","))
  if not isinstance(data,list) or len(data)<2 or not isinstance(data[0],list):
   raise ValueError("CDX snapshot is not a JSON header/rows array")
  header=data[0]; rows=[]
  for cells in data[1:]:
   if not isinstance(cells,list): continue
   item=dict(zip(header,cells))
   if str(item.get("statuscode"))=="200" and str(item.get("mimetype","")).startswith("application/pdf") and item.get("timestamp") and item.get("original"):
    rows.append(item)
  rec.update({"status":"COMMITTED_CDX_SNAPSHOT_PARSED","recordCount":len(rows),"header":header})
  manifest.setdefault("loadedCdxSnapshots",[]).append(rec)
  return rows
 except Exception as e:
  rec.update({"status":"CDX_SNAPSHOT_LOAD_FAILED","error":f"{type(e).__name__}: {e}"})
  manifest.setdefault("loadedCdxSnapshots",[]).append(rec)
  return []


CC_INDEX_PRIORITY=["CC-MAIN-2018-39","CC-MAIN-2018-43","CC-MAIN-2018-47","CC-MAIN-2018-51","CC-MAIN-2019-04","CC-MAIN-2019-13"]
CC_SOURCE_HOSTS={"apegazette.cgg.gov.in","www.apegazette.cgg.gov.in","egazette.gov.in","www.egazette.gov.in","egazette.nic.in","www.egazette.nic.in"}

def commoncrawl_collection_list(manifest):
    url="https://index.commoncrawl.org/collinfo.json"
    record={"requestedUrl":url,"attemptedAtUtc":now()}
    try:
        if not approved(url):raise ValueError("Common Crawl index host not approved")
        r=S.get(url,timeout=TIMEOUT,allow_redirects=True,verify=TLS_VERIFY)
        b=r.content
        record.update({"finalUrl":r.url,"httpStatus":r.status_code,"byteLength":len(b),"sha256":sha(b)})
        if r.status_code!=200:
            record.update({"status":"COLLECTION_LIST_HTTP_FAILURE"});manifest["commonCrawlCollections"]=record;return []
        (RAW/"CommonCrawl_collinfo.json").write_bytes(b)
        data=json.loads(b)
        ids={x.get("id"):x for x in data if isinstance(x,dict) and x.get("id")}
        chosen=[ids[x] for x in CC_INDEX_PRIORITY if x in ids]
        if len(chosen)<4:
            fallback=[x for k,x in ids.items() if re.match(r"CC-MAIN-(2018|2019)-",k or "")]
            fallback.sort(key=lambda x:x.get("id",""))
            for item in fallback:
                if item not in chosen:chosen.append(item)
                if len(chosen)>=6:break
        record.update({"status":"COLLECTION_LIST_ACQUIRED","collectionCount":len(data),"selectedIndexes":[x.get("id") for x in chosen]})
        manifest["commonCrawlCollections"]=record
        return chosen
    except Exception as e:
        record.update({"status":"COLLECTION_LIST_FETCH_FAILED_TLS_VERIFICATION_RETAINED","error":f"{type(e).__name__}: {e}"})
        manifest["commonCrawlCollections"]=record
        return []

def query_commoncrawl_index(index_info, label, target_url, url_filter=None, limit=500, manifest=None):
    api=index_info.get("cdx-api") or f"https://index.commoncrawl.org/{index_info.get('id')}-index"
    rec={"label":label,"collection":index_info.get("id"),"indexUrl":api,"targetUrl":target_url,"attemptedAtUtc":now()}
    if not approved(api):
        rec["status"]="REJECTED_UNAPPROVED_INDEX_URL"
        manifest.setdefault("commonCrawlQueries",[]).append(rec)
        return []
    params={"url":target_url,"matchType":"prefix","output":"json",
            "filter":["status:200","mime:application/pdf"],"limit":str(limit)}
    if url_filter:params["filter"].append("url:"+url_filter)
    try:
        r=S.get(api,params=params,timeout=TIMEOUT,allow_redirects=True,verify=TLS_VERIFY)
        b=r.content
        rec.update({"finalUrl":r.url,"httpStatus":r.status_code,"byteLength":len(b),"sha256":sha(b)})
        if r.status_code!=200:
            rec.update({"status":"COMMONCRAWL_INDEX_HTTP_FAILURE","errorBodySha256":sha(b) if b else None})
            manifest.setdefault("commonCrawlQueries",[]).append(rec)
            return []
        name=safe(f"CommonCrawl_{index_info.get('id')}_{label}")+"_index.jsonl"
        (RAW/name).write_bytes(b);rec["rawIndexArtifact"]="raw/"+name
        rows=[]
        for line in b.splitlines():
            if not line.strip():continue
            try: item=json.loads(line)
            except Exception:continue
            if str(item.get("status"))=="200" and str(item.get("mime","")).lower().startswith("application/pdf"):
                if item.get("url") and item.get("filename") and item.get("offset") and item.get("length"):
                    rows.append(item)
        rec.update({"status":"COMMONCRAWL_INDEX_RESULTS_ACQUIRED","recordCount":len(rows),
                    "sampleRecords":[{k:x.get(k) for k in ("url","timestamp","status","mime","filename","offset","length","digest")} for x in rows[:8]]})
        manifest.setdefault("commonCrawlQueries",[]).append(rec)
        return rows
    except Exception as e:
        rec.update({"status":"COMMONCRAWL_INDEX_QUERY_FAILED_TLS_VERIFICATION_RETAINED","error":f"{type(e).__name__}: {e}"})
        manifest.setdefault("commonCrawlQueries",[]).append(rec)
        return []

def probe_commoncrawl_warc_record(item, cohort, gazette_kind):
    original=str(item.get("url") or "")
    host=(urlparse(original).hostname or "").lower()
    rec={"cohort":cohort,"gazetteKind":gazette_kind,"originalUrl":original,"captureTimestamp":item.get("timestamp"),
         "commonCrawlCollection":item.get("_collection"),"commonCrawlDigest":item.get("digest"),
         "warcFilename":item.get("filename"),"warcOffset":item.get("offset"),"warcRecordLength":item.get("length"),
         "attemptedAtUtc":now(),"status":"NOT_ATTEMPTED"}
    if host not in CC_SOURCE_HOSTS or urlparse(original).scheme not in ("http","https"):
        rec["status"]="REJECTED_NON_OFFICIAL_SOURCE_HOST"
        return rec
    try:
        offset=int(item["offset"]); length=int(item["length"])
        if length<=0 or length>12_000_000:
            rec.update({"status":"REJECTED_WARC_RECORD_LENGTH_OUT_OF_BOUNDS","warcRecordLength":length})
            return rec
        filename=str(item["filename"]).lstrip("/")
        warc_url="https://data.commoncrawl.org/"+filename
        if not approved(warc_url):raise ValueError("WARC host is not approved")
        response=S.get(warc_url,headers={**S.headers,"Range":f"bytes={offset}-{offset+length-1}"},
                       timeout=TIMEOUT,allow_redirects=True,verify=TLS_VERIFY)
        compressed=response.content
        rec.update({"warcRequestUrl":warc_url,"warcHttpStatus":response.status_code,"warcReturnedBytes":len(compressed),
                    "warcResponseSha256":sha(compressed),"warcContentRange":response.headers.get("Content-Range")})
        if response.status_code!=206 or len(compressed)!=length:
            rec.update({"status":"WARC_RANGE_NOT_SERVED_EXACTLY"})
            return rec
        try:warc=gzip.decompress(compressed)
        except Exception as e:
            rec.update({"status":"WARC_GZIP_DECOMPRESSION_FAILED","error":f"{type(e).__name__}: {e}"})
            return rec
        warc_header_end=warc.find(b"\r\n\r\n")
        if warc_header_end<0:
            rec["status"]="WARC_HEADER_SEPARATOR_NOT_FOUND";return rec
        warc_header=warc[:warc_header_end]
        payload=warc[warc_header_end+4:]
        if b"WARC-Type: response" not in warc_header and b"WARC-Type: revisit" not in warc_header:
            rec["status"]="WARC_RECORD_NOT_HTTP_RESPONSE";return rec
        http_header_end=payload.find(b"\r\n\r\n")
        if http_header_end<0 or not payload[:http_header_end].startswith(b"HTTP/"):
            rec["status"]="WARC_HTTP_HEADER_NOT_FOUND";return rec
        http_header=payload[:http_header_end]
        pdf_bytes=payload[http_header_end+4:]
        length_match=re.search(rb"(?im)^Content-Length:\s*(\d+)\s*$",http_header)
        if length_match:
            pdf_bytes=pdf_bytes[:int(length_match.group(1))]
        rec.update({"warcRecordSha256":sha(warc),"httpResponseHeaders":http_header.decode("latin-1","replace")[:2000],
                    "httpBodyByteLength":len(pdf_bytes),"httpBodySha256":sha(pdf_bytes),"pdfMagic":pdf_bytes.startswith(b"%PDF-")})
        if not pdf_bytes.startswith(b"%PDF-"):
            rec["status"]="COMMONCRAWL_BODY_NOT_PDF";return rec
        try:
            doc=fitz.open(stream=pdf_bytes,filetype="pdf")
            pages=[p.get_text("text",sort=True) for p in doc]
            full="\n".join(pages);first=pages[0] if pages else ""
            findings=markers(full,first,gazette_kind)
            rec.update({"pdfParseStatus":"PASS","pdfVersion":re.match(rb"%PDF-([0-9.]+)",pdf_bytes).group(1).decode() if re.match(rb"%PDF-([0-9.]+)",pdf_bytes) else None,
                        "pdfPageCount":doc.page_count,"firstPageTextBytes":len(first.encode()),"firstPageTextSha256":sha(first.encode()),
                        "fullTextBytes":len(full.encode()),"fullTextSha256":sha(full.encode()),"findings":findings,
                        "firstPagePreview":first[:1800],"fullTextPreview":full[:1000],"status":"COMMONCRAWL_CAPTURE_PDF_PARSED"})
        except Exception as e:
            rec.update({"status":"COMMONCRAWL_CAPTURE_PDF_PARSE_FAILED","error":f"{type(e).__name__}: {e}"})
            return rec
        urlsuff=urlparse(original).path.lower()
        target_url=bool(re.search(r"E[_-]?71[_-]?2008|E[_-]?(382|383|453)[_-]?2008|O\.?N\.?55|282.?AP.?2018",urlsuff,re.I))
        f=findings
        material=bool(target_url or f.get("issue71Candidate") or f.get("strictLegalContentCandidate") or f.get("strictON55EGazetteCandidate") or
                      f.get("issueDateAndRelatedContextCandidate") or f.get("publicationDate19Feb2008OnFirstPage") or
                      f.get("publicationDate22Sep2018OnFirstPage") or any((f.get("targetNotificationMarkersAnywhere") or {}).values()) or
                      f.get("on55EAnywhere") or f.get("eciNotification282AP2018Anywhere"))
        if material:
            name=safe(f"CommonCrawl_{cohort}_{item.get('timestamp')}_{Path(urlparse(original).path).name}")+".pdf"
            (RAW/name).write_bytes(pdf_bytes)
            textname=Path(name).stem+".txt"
            (TEXT/textname).write_text(full,encoding="utf-8")
            rec["rawArtifact"]="raw/"+name;rec["textArtifact"]="text/"+textname
            if f.get("strictLegalContentCandidate"):rec["status"]="COMMONCRAWL_STRICT_2008_GAZETTE_CANDIDATE_NEEDS_AUTHENTICATION"
            elif f.get("strictON55EGazetteCandidate"):rec["status"]="COMMONCRAWL_STRICT_ON55E_CANDIDATE_NEEDS_AUTHENTICATION"
            else:rec["status"]="COMMONCRAWL_NEAR_MATCH_RETAINED_NOT_ACCEPTED"
        return rec
    except Exception as e:
        rec.update({"status":"COMMONCRAWL_WARC_FETCH_FAILED_TLS_VERIFICATION_RETAINED","error":f"{type(e).__name__}: {e}"})
        return rec

def run_commoncrawl_archive_scan(manifest, previously_seen_urls):
    """Second independent web archive; only its WARC response bytes are inspected, never trusted from filename alone."""
    indexes=commoncrawl_collection_list(manifest)
    target_specs=[
      ("APGazetteUploadWindow","http://apegazette.cgg.gov.in/gazettes/",r".*/gazettes/(1537[4-9][0-9]{8}|1538[0-9]{9}|1539[0-9]{9}|154[0-3][0-9]{8})[.]pdf$","2018"),
      ("CentralGazette2018","http://egazette.nic.in/WriteReadData/2018/",r".*/WriteReadData/2018/.*[.]pdf$","2018"),
      ("CentralGazette2008","http://egazette.nic.in/WriteReadData/2008/",r".*/WriteReadData/2008/.*[.]pdf$","2008")
    ]
    # Query the 4 crawl indexes closest to the legal publication/republication window, plus one 2019 follow-up.
    if len(indexes)>5:indexes=indexes[:5]
    jobs=[]
    for idx in indexes:
        for label,prefix,regex,kind in target_specs:
            jobs.append((idx,label,prefix,regex,kind))
    query_rows=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        futs={pool.submit(query_commoncrawl_index,idx,label,prefix,regex,500,manifest):(idx,label,kind) for idx,label,prefix,regex,kind in jobs}
        for future in concurrent.futures.as_completed(futs):
            idx,label,kind=futs[future]
            try:
                rows=future.result()
                for row in rows:
                    row["_collection"]=idx.get("id")
                    row["_queryLabel"]=label
                    row["_kind"]=kind
                    query_rows.append(row)
            except Exception as e:
                manifest.setdefault("commonCrawlWorkerFailures",[]).append({"collection":idx.get("id"),"label":label,"error":f"{type(e).__name__}: {e}"})
    # Prefer newest indexed capture per exact source URL and do not waste requests on URLs already
    # byte-audited in the archived CDX cohorts. Retain up to 240 new unique URLs for bounded work.
    by_url={}
    for row in query_rows:
        url=str(row.get("url") or "")
        if not url or url in previously_seen_urls:continue
        old=by_url.get(url)
        if old is None or str(row.get("timestamp") or "")>str(old.get("timestamp") or ""):by_url[url]=row
    selected=sorted(by_url.values(),key=lambda x:(x.get("_kind",""),x.get("_queryLabel",""),x.get("url","")))[:240]
    manifest["commonCrawlCoverage"]={"collectionsQueried":[x.get("id") for x in indexes],"indexQueries":len(jobs),
        "indexRowsReturned":len(query_rows),"uniqueNewSourceUrls":len(by_url),"warcRecordsSelected":len(selected),
        "previouslySeenUrlsExcluded":True,"cap":240}
    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        futs=[pool.submit(probe_commoncrawl_warc_record,row,row.get("_queryLabel","CommonCrawl"),row.get("_kind","2018")) for row in selected]
        for future in concurrent.futures.as_completed(futs):
            try:results.append(future.result())
            except Exception as e:results.append({"status":"COMMONCRAWL_WARC_WORKER_FAILURE","error":f"{type(e).__name__}: {e}"})
    manifest["commonCrawlCoverage"]["warcRecordsProcessed"]=len(results)
    manifest["commonCrawlCoverage"]["warcPdfMagicCount"]=sum(1 for x in results if x.get("pdfMagic"))
    manifest["commonCrawlCoverage"]["warcPdfParsedCount"]=sum(1 for x in results if x.get("pdfParseStatus")=="PASS")
    manifest["commonCrawlCoverage"]["rawNearMatchPdfsRetained"]=sum(1 for x in results if x.get("rawArtifact"))
    manifest["commonCrawlCoverage"]["strict2008Candidates"]=sum(1 for x in results if x.get("findings",{}).get("strictLegalContentCandidate"))
    manifest["commonCrawlCoverage"]["strictON55ECandidates"]=sum(1 for x in results if x.get("findings",{}).get("strictON55EGazetteCandidate"))
    manifest["commonCrawlCoverage"]["statusCounts"]=dict(Counter(x.get("status","UNKNOWN") for x in results))
    return results

def main():
 manifest={
  "schemaVersion":1,"title":"W021.5 focused Gazette issue and exact legal identifier probe",
  "runAtUtc":now(),"databaseAccess":"NONE","TLSVerification":"ENABLED",
  "scope":"Resolve exact 2008 Gazette issue no.71/identifiers and actual 2018 O.N.55(E) Gazette/AP Gazette counterpart. Archive candidate bytes remain unaccepted until legal issue metadata and text are reconciled.",
  "cdxQueries":[],"livePages":[],"candidates":[],"disposition":{}
 }
 # Direct official search pages: GET/inspect only. Do not submit forms or bypass WAF.
 for label,url in [
  ("EGazetteGovExtraordinarySearch","https://egazette.gov.in/SearchResult.aspx?Category=extraordinary"),
  ("EGazetteNicExtraordinarySearch","https://egazette.nic.in/SearchResult.aspx?Category=extraordinary"),
  ("EGazetteGovRoot","https://egazette.gov.in/"),
  ("APGazetteRoot","https://apegazette.cgg.gov.in/"),
  ("DepartmentPublicationContact","https://deptpub.gov.in/contact-us/"),
 ]: probe_live_page(url,label,manifest)

 exact2008=[
  ("E71_2008_001_https","https://egazette.gov.in/WriteReadData/2008/E_71_2008_001.pdf"),
  ("E71_2008_002_https","https://egazette.gov.in/WriteReadData/2008/E_71_2008_002.pdf"),
  ("E71_2008_001_https","https://egazette.gov.in/WriteReadData/2008/E_71_2008_001.pdf"),
  ("E382_2008_001_https","https://egazette.gov.in/WriteReadData/2008/E_382_2008_001.pdf"),
  ("E383_2008_001_https","https://egazette.gov.in/WriteReadData/2008/E_383_2008_001.pdf"),
  ("E453_2008_001_https","https://egazette.gov.in/WriteReadData/2008/E_453_2008_001.pdf"),
  ("KnownE248_2008","http://egazette.nic.in:80/WriteReadData/2008/E_248_2008_001.pdf"),
  ("KnownE55_2008","https://egazette.gov.in/WriteReadData/2008/E_55_2008_002.pdf"),
 ]
 exact2018=[
  ("E55_2018_001_https","https://egazette.gov.in/WriteReadData/2018/E_55_2018_001.pdf"),
  ("E55_2018_002_https","https://egazette.gov.in/WriteReadData/2018/E_55_2018_002.pdf"),
  ("Weekly190018","https://egazette.gov.in/WriteReadData/2018/190018.pdf"),
  ("Weekly190383","https://egazette.gov.in/WriteReadData/2018/190383.pdf"),
  ("Weekly190468","https://egazette.gov.in/WriteReadData/2018/190468.pdf"),
  ("Weekly189922","https://egazette.gov.in/WriteReadData/2018/189922.pdf"),
  ("Weekly190466","https://egazette.gov.in/WriteReadData/2018/190466.pdf"),
 ]
 tasks=[]
 # Try direct live URLs but only retain PDFs if headers/magic prove they are PDF;
 # these are exact-identifier-derived probes, not claims that the file exists.
 for cohort,url in exact2008: tasks.append(({"timestamp":"","original":url,"archiveUrl":url},cohort,"2008"))
 for cohort,url in exact2018: tasks.append(({"timestamp":"","original":url,"archiveUrl":url},cohort,"2018"))
 cdx_ap=query_cdx("APGazette2018PdfsCaptured",{
  "url":"https://apegazette.cgg.gov.in/","matchType":"prefix","from":"20180920","to":"20181231",
  "output":"json","fl":"timestamp,original,statuscode,mimetype,digest,length",
  "filter":["statuscode:200","mimetype:application/pdf"],"collapse":"urlkey","limit":"1500"
 },manifest)
 # Expand beyond archive captures made during Sep-Dec 2018. Andhra Pradesh Gazette document
 # filenames encode upload-time milliseconds; query the official gazettes/ prefix and filter
 # exact original URLs by an upload-time range covering 20 Sep–30 Nov 2018, independent of
 # when the Wayback capture occurred. Both HTTP-origin spellings are explicit source variants.
 ap_filename_rows=[]
 for label,prefix in [
  ("APGazetteUploadIdsSepNov2018_HTTP","http://apegazette.cgg.gov.in:80/gazettes/"),
  ("APGazetteUploadIdsSepNov2018_HTTPS","https://apegazette.cgg.gov.in/gazettes/")
 ]:
  rows=query_cdx(label,{
   "url":prefix,"matchType":"prefix","output":"json",
   "fl":"timestamp,original,statuscode,mimetype,digest,length",
   "filter":["statuscode:200","mimetype:application/pdf","original:.*(1537[4-9][0-9]{8}|1538[0-9]{9}|1539[0-9]{9}|154[0-3][0-9]{8})[.]pdf$"],
   "collapse":"urlkey","limit":"1500"
  },manifest)
  ap_filename_rows.extend(rows)
 # A previous evidence manifest already enumerated these exact Wayback AP Gazette URLs; this
 # CDX retry refreshes that set. Never infer the document from a random file identifier.
 for item in cdx_ap[:40]:
  item=dict(item);item["archiveUrl"]=capture_url(str(item.get("timestamp") or ""),str(item.get("original") or ""))
  tasks.append((item,"APGazetteArchiveCapture","2018"))
 for item in ap_filename_rows:
  item=dict(item);item["archiveUrl"]=capture_url(str(item.get("timestamp") or ""),str(item.get("original") or ""))
  tasks.append((item,"APGazette2018FilenameWindowArchiveCapture","2018"))
 cdx2008=query_cdx("EGazetteNic2008ExactIssue71AndLegalIds",{
  "url":"http://egazette.nic.in/WriteReadData/2008/E_","matchType":"prefix",
  "output":"json","fl":"timestamp,original,statuscode,mimetype,digest,length",
  "filter":["statuscode:200","mimetype:application/pdf"],"collapse":"urlkey","limit":"4000"
 },manifest)
 # Archive lookups for exact issue-71/legal-identifier file variants. A URL hit is only
 # a discovery lead; PDF bytes and printed issue metadata determine whether it is relevant.
 exact_2008_urls = [
  "http://egazette.nic.in:80/WriteReadData/2008/E_71_2008_001.pdf",
  "http://egazette.nic.in/WriteReadData/2008/E_71_2008_001.pdf",
  "https://egazette.nic.in/WriteReadData/2008/E_71_2008_001.pdf",
  "https://egazette.gov.in/WriteReadData/2008/E_71_2008_001.pdf",
  "http://egazette.nic.in:80/WriteReadData/2008/E_71_2008_002.pdf",
  "https://egazette.gov.in/WriteReadData/2008/E_71_2008_002.pdf",
  "https://egazette.gov.in/WriteReadData/2008/E_382_2008_001.pdf",
  "https://egazette.gov.in/WriteReadData/2008/E_383_2008_001.pdf",
  "https://egazette.gov.in/WriteReadData/2008/E_453_2008_001.pdf"
 ]
 for exact_url in exact_2008_urls:
  label="CDX_EXACT_"+safe(urlparse(exact_url).path.split("/")[-1])+"_"+str(len(manifest["cdxQueries"])+1)
  exact_rows=query_cdx(label,{
   "url":exact_url,"output":"json","fl":"timestamp,original,statuscode,mimetype,digest,length",
   "filter":["statuscode:200","mimetype:application/pdf"],"collapse":"urlkey","limit":"100"
  },manifest)
  for item in exact_rows:
   item=dict(item);item["archiveUrl"]=capture_url(str(item.get("timestamp") or ""),str(item.get("original") or ""))
   tasks.append((item,"Exact2008IdentifierArchiveCapture","2008"))
 # These committed CDX responses already enumerate previously discovered, byte-verified
 # archive indexes. Scan every row, not a first-page sample, to find the actual issue/date.
 committed_indexes = [
  ("stage_b_catalogue_expansion/raw/EGazetteNicIn2018PdfsCaptured2018To2026_cdx.txt","EGazetteNIC2018FullCapturedDirectory","2018"),
  ("stage_b_catalogue_expansion/raw/APGazette2018PdfsCaptured_cdx.txt","APGazette2018FullCapturedDirectory","2018"),
  ("stage_b_catalogue_expansion/raw/EGazetteNicIn2008PdfsAllCaptures_cdx.txt","EGazetteNIC2008FullCapturedDirectory","2008"),
  ("stage_b_catalogue_expansion/raw/EGazetteGovIn2008PdfsAllCaptures_cdx.txt","EGazetteGOV2008FullCapturedDirectory","2008")
 ]
 for snapshot_path,cohort,kind in committed_indexes:
  rows=load_cdx_snapshot(Path(snapshot_path),manifest)
  manifest.setdefault("coverageInventory",[]).append({"cdxPath":snapshot_path,"cohort":cohort,"kind":kind,"rowsQueued":len(rows)})
  for item in rows:
   item=dict(item);item["archiveUrl"]=capture_url(str(item.get("timestamp") or ""),str(item.get("original") or ""))
   tasks.append((item,cohort,kind))
 # Known timestamp-bound captures are included only as exact candidates and will be parsed again.
 known=[
  ("EGazetteE248Capture","http://egazette.nic.in:80/WriteReadData/2008/E_248_2008_001.pdf","20220325121427","2008"),
  ("EGazetteE55Capture","https://egazette.gov.in/WriteReadData/2008/E_55_2008_002.pdf","20231224171122","2008"),
  ("Weekly190018Capture","https://egazette.gov.in/WriteReadData/2018/190018.pdf","20181024230902","2018"),
  ("Weekly190383Capture","https://egazette.gov.in/WriteReadData/2018/190383.pdf","20181024231226","2018"),
  ("Weekly190468Capture","https://egazette.gov.in/WriteReadData/2018/190468.pdf","20181024175428","2018"),
  ("Weekly189922Capture","https://egazette.gov.in/WriteReadData/2018/189922.pdf","20181024230148","2018"),
  ("Weekly190466Capture","https://egazette.gov.in/WriteReadData/2018/190466.pdf","20181024231236","2018"),
 ]
 for cohort,original,ts,kind in known:
  tasks.append(({"timestamp":ts,"original":original,"archiveUrl":capture_url(ts,original)},cohort,kind))
 # De-duplicate while preserving the capture chosen; each different capture remains a separate provenance record.
 dedup={}
 for item,cohort,kind in tasks:
  key=(cohort,kind,item.get("timestamp",""),item.get("original",""),item.get("archiveUrl",""))
  dedup[key]=(item,cohort,kind)
 tasks=list(dedup.values())
 results=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
  futures=[pool.submit(probe_candidate,item,cohort,kind) for item,cohort,kind in tasks]
  for f in concurrent.futures.as_completed(futures):
   try:results.append(f.result())
   except Exception as e:results.append({"status":"PROBE_WORKER_FAILURE","error":f"{type(e).__name__}: {e}"})
 # Run a second independent archive after the original CDX cohort scan. It excludes exact source
 # URLs already present in committed/queried archive indexes, but retrieves and hashes WARC payloads
 # to discover pages missing from Internet Archive's captured set.
 previously_seen=set()
 for x in results:
  u=str(x.get("originalUrl") or "")
  if u:previously_seen.add(u)
 for rows in manifest.get("loadedCdxSnapshots",[]):
  pass
 commoncrawl_results=run_commoncrawl_archive_scan(manifest,previously_seen)
 results.extend(commoncrawl_results)
 results.sort(key=lambda x:(x.get("gazetteKind",""),x.get("cohort",""),x.get("captureTimestamp") or "",x.get("originalUrl","")))
 manifest["candidates"]=results
 manifest["disposition"]={
  "candidatesAttempted":len(results),
  "validPdfResponses":sum(1 for x in results if x.get("pdfMagic") and x.get("pdfParseStatus")=="PASS"),
  "rawCandidatePdfsRetained":sum(1 for x in results if x.get("rawArtifact")),
  "strict2008GazetteCandidates":sum(1 for x in results if x.get("findings",{}).get("strictLegalContentCandidate")),
  "issue71MetadataCandidates":sum(1 for x in results if x.get("findings",{}).get("issue71Candidate")),
  "strictON55EGazetteCandidates":sum(1 for x in results if x.get("findings",{}).get("strictON55EGazetteCandidate")),
  "2018RelatedContextCandidates":sum(1 for x in results if x.get("findings",{}).get("issueDateAndRelatedContextCandidate")),
  "directErrors":sum(1 for x in results if x.get("status") in ("FETCH_FAILED_OR_NOT_PDF","ARCHIVE_FETCH_FAILED_TLS_VERIFICATION_RETAINED","REJECTED_REDIRECT_HOST")),
  "interpretation":"A source candidate is not accepted without source URL, byte hash, printed issue date/no., Part/Section, and exact legal instrument content reconciliation."
 }
 manifest["completedAtUtc"]=now()
 mb=(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n").encode()
 (OUT/"manifest.json").write_bytes(mb)
 readback=json.loads((OUT/"manifest.json").read_text(encoding="utf-8"))
 if len(readback.get("candidates",[]))!=len(results): raise SystemExit("MANIFEST_READBACK_COUNT_FAIL")
 for x in results:
  if x.get("rawArtifact"):
   b=(OUT/x["rawArtifact"]).read_bytes()
   if sha(b)!=x.get("sha256") or len(b)!=x.get("byteLength"): raise SystemExit("RAW_PDF_HASH_MISMATCH")
 print(json.dumps({"status":"EXACT_GAZETTE_CANDIDATE_PROBE_COMPLETED","summary":manifest["disposition"],
  "cdx": [{"label":x["label"],"status":x["status"],"recordCount":x.get("recordCount")} for x in manifest["cdxQueries"]],
  "livePages":[{"label":x["label"],"status":x["status"],"httpStatus":x.get("httpStatus"),"bytes":x.get("byteLength"),"sha256":x.get("sha256"),"markers":x.get("targetMarkerFindings")} for x in manifest["livePages"]],
  "matches":[{"cohort":x.get("cohort"),"status":x.get("status"),"url":x.get("originalUrl"),"capture":x.get("captureTimestamp"),"bytes":x.get("byteLength"),"sha256":x.get("sha256"),"findings":x.get("findings")} for x in results if x.get("rawArtifact") or x.get("findings",{}).get("issue71Candidate") or x.get("findings",{}).get("strictON55EGazetteCandidate")]},indent=2,ensure_ascii=False))

if __name__=="__main__": main()
