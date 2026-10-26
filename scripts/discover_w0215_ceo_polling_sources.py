#!/usr/bin/env python3
"""Read-only discovery of exact public polling-station source URLs on state/UT CEO portals.

This is a link-discovery run, not a national crosswalk. It does not download electoral-roll PDFs
or elector-level material, submit forms, bypass CAPTCHA, or authenticate to protected portals.
Only HTTPS links observed in actual downloaded official-root HTML are followed.
"""
from __future__ import annotations
import concurrent.futures, hashlib, json, re
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
import fitz

OUT=Path("stage_b_ceo_portal_discovery")
RAW=OUT/"raw"
RAW.mkdir(parents=True,exist_ok=True)
TIMEOUT=(8,18)
USER_AGENT="PANIN-W021.5-Official-CEO-Source-Discovery/1.0"
PORTALS=[
 {"code":"AP","name":"Andhra Pradesh","url":"https://ceoandhra.nic.in/"},
 {"code":"AR","name":"Arunachal Pradesh","url":"https://ceoarunachal.nic.in/"},
 {"code":"AS","name":"Assam","url":"https://ceoassam.nic.in/"},
 {"code":"BR","name":"Bihar","url":"https://ceobihar.nic.in/"},
 {"code":"CG","name":"Chhattisgarh","url":"https://ceochhattisgarh.nic.in/"},
 {"code":"GA","name":"Goa","url":"https://ceogoa.nic.in/"},
 {"code":"GJ","name":"Gujarat","url":"https://ceo.gujarat.gov.in/"},
 {"code":"HR","name":"Haryana","url":"https://ceoharyana.gov.in/"},
 {"code":"HP","name":"Himachal Pradesh","url":"https://ceohimachal.nic.in/"},
 {"code":"JH","name":"Jharkhand","url":"https://ceojharkhand.nic.in/"},
 {"code":"KA","name":"Karnataka","url":"https://ceokarnataka.kar.nic.in/"},
 {"code":"KL","name":"Kerala","url":"https://ceo.kerala.gov.in/"},
 {"code":"MP","name":"Madhya Pradesh","url":"https://ceomadhyapradesh.nic.in/"},
 {"code":"MH","name":"Maharashtra","url":"https://ceo.maharashtra.gov.in/"},
 {"code":"MN","name":"Manipur","url":"https://ceomanipur.nic.in/"},
 {"code":"ML","name":"Meghalaya","url":"https://ceomeghalaya.nic.in/"},
 {"code":"MZ","name":"Mizoram","url":"https://ceomizoram.nic.in/"},
 {"code":"NL","name":"Nagaland","url":"https://ceonagaland.nic.in/"},
 {"code":"OD","name":"Odisha","url":"https://ceoodisha.nic.in/"},
 {"code":"PB","name":"Punjab","url":"https://ceopunjab.nic.in/"},
 {"code":"RJ","name":"Rajasthan","url":"https://ceorajasthan.nic.in/"},
 {"code":"SK","name":"Sikkim","url":"https://ceosikkim.nic.in/"},
 {"code":"TN","name":"Tamil Nadu","url":"https://elections.tn.gov.in/"},
 {"code":"TS","name":"Telangana","url":"https://ceotelangana.nic.in/"},
 {"code":"TR","name":"Tripura","url":"https://ceotripura.nic.in/"},
 {"code":"UP","name":"Uttar Pradesh","url":"https://ceouttarpradesh.nic.in/"},
 {"code":"UK","name":"Uttarakhand","url":"https://ceouttarakhand.nic.in/"},
 {"code":"WB","name":"West Bengal","url":"https://ceowestbengal.nic.in/"},
 {"code":"DL","name":"Delhi","url":"https://ceodelhi.gov.in/"},
 {"code":"CH","name":"Chandigarh","url":"https://ceochandigarh.gov.in/"},
 {"code":"PY","name":"Puducherry","url":"https://ceopuducherry.py.gov.in/"},
 {"code":"JK","name":"Jammu and Kashmir / Ladakh portal","url":"https://ceojk.nic.in/"},
]
PORTAL_HOSTS={urlparse(p["url"]).hostname.lower() for p in PORTALS}
EXTRA_GOV_HOSTS={"eci.gov.in","www.eci.gov.in","eci.nic.in","www.eci.nic.in","sansad.in","www.sansad.in"}
ALLOWED_HOSTS=PORTAL_HOSTS|EXTRA_GOV_HOSTS

POLL_RE=re.compile(r"poll(?:ing)?[\s_\-/]*(?:station|stations|booth|booths|location|locations)|list[\s_\-/]*of[\s_\-/]*polling|booth[\s_\-/]*(?:list|details|map)|polling[\s_\-/]*place",re.I)
ROLL_RE=re.compile(r"electoral[\s_\-/]*roll|voter[\s_\-/]*list|pdf[\s_\-/]*roll|elector[\s_\-/]*search|epic|voter[\s_\-/]*search",re.I)
CAPTCHA_RE=re.compile(r"captcha|access denied|forbidden|verify you are human|cloudflare",re.I)

def utc(): return datetime.now(timezone.utc).isoformat()
def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def safe(s): return re.sub(r"[^A-Za-z0-9_.-]+","_",s).strip("_")[:160]
def host(url): return (urlparse(url).hostname or "").lower()
def approved(url):
 p=urlparse(url)
 return p.scheme=="https" and host(url) in ALLOWED_HOSTS

class LinkParser(HTMLParser):
 def __init__(self,base):
  super().__init__(convert_charrefs=True); self.base=base; self.links=[]; self._a=None; self._form=None; self.forms=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs); tag=tag.lower()
  if tag=="a" and d.get("href"):
   self._a={"href":urljoin(self.base,d["href"]),"text_parts":[],"tag":tag}
  if tag=="form":
   self._form={"action":urljoin(self.base,d.get("action") or self.base),"method":(d.get("method") or "get").lower(),"inputs":[]}; self.forms.append(self._form)
  elif self._form is not None and tag in ("input","select","button"):
   self._form["inputs"].append({k:d.get(k) for k in ("name","id","type","value")})
  for key in ("src","data-url","data-href","data-file"):
   if d.get(key) and tag in ("iframe","frame","object","embed","source","script"):
    self.links.append({"url":urljoin(self.base,d[key]),"text":"","tag":tag,"attribute":key})
 def handle_data(self,data):
  if self._a is not None and data and data.strip(): self._a["text_parts"].append(data.strip())
 def handle_endtag(self,tag):
  if tag.lower()=="a" and self._a is not None:
   self._a["text"]=" ".join(self._a.pop("text_parts")); self._a["attribute"]="href"; self.links.append(self._a); self._a=None
  if tag.lower()=="form": self._form=None

S=requests.Session()
S.headers.update({"User-Agent":USER_AGENT,"Accept":"text/html,application/xhtml+xml,application/pdf;q=0.8,*/*;q=0.5","Accept-Language":"en-IN,en;q=0.9"})
CA=Path("/etc/ssl/certs/ca-certificates.crt")
TLS_VERIFY=str(CA) if CA.is_file() else True

def fetch(url):
 if not approved(url): raise ValueError("UNAPPROVED_HTTPS_URL:"+url)
 r=S.get(url,timeout=TIMEOUT,allow_redirects=True,verify=TLS_VERIFY)
 if not approved(r.url): raise ValueError("REDIRECT_TO_UNAPPROVED_HOST:"+r.url)
 return r

def is_candidate(link):
 label=(link.get("text") or "")+" "+link.get("url","")
 if not POLL_RE.search(label): return False
 # Never download a link that points to elector-level lists or voter searches, even if the
 # adjacent anchor mentions polling stations. Record no personal data.
 if ROLL_RE.search(label): return False
 return True

def save_raw(code,kind,body):
 name=safe(f"{code}_{kind}")
 if not Path(name).suffix:
  name += ".bin"
 (RAW/name).write_bytes(body)
 return "raw/"+name

def probe_root(p):
 row={**p,"requestedAtUtc":utc(),"status":"NOT_ATTEMPTED","discoveredCandidateCount":0,"discoveredCandidateLinks":[]}
 try:
  r=fetch(p["url"]); body=r.content
  row.update({"finalUrl":r.url,"httpStatus":r.status_code,"contentType":r.headers.get("Content-Type"),"byteLength":len(body),"sha256":sha(body)})
  if r.status_code!=200 or not body:
   row["status"]="HTTP_FAILURE_OR_EMPTY";return row
  ctype=(r.headers.get("Content-Type") or "").lower()
  if not ("html" in ctype or body.lstrip().startswith((b"<!doctype html",b"<html",b"<?xml"))):
   row["status"]="NON_HTML_ROOT_RESPONSE";row["rawArtifact"]=save_raw(p["code"],"root",body);return row
  name=safe(p["code"]+"_official_ceo_root")+".html";(RAW/name).write_bytes(body);row["rawArtifact"]="raw/"+name
  decoded=r.encoding or "utf-8"; text=body.decode(decoded,errors="replace")
  row["titleSnippet"]=re.search(r"<title[^>]*>(.*?)</title>",text,re.I|re.S).group(1).strip()[:300] if re.search(r"<title[^>]*>(.*?)</title>",text,re.I|re.S) else None
  row["identityMarkers"]={t:(t.casefold() in text.casefold()) for t in [p["name"],"Chief Electoral Officer","Election Commission","CEO"]}
  if CAPTCHA_RE.search(text[:50000]): row["status"]="DOWNLOADED_HTML_CAPTCHA_OR_ACCESS_CHALLENGE"
  else: row["status"]="DOWNLOADED_HASHED_ROOT_HTML"
  parser=LinkParser(r.url);parser.feed(text)
  candidates=[]
  for link in parser.links:
   u=link.get("url","")
   if not approved(u): continue
   if not is_candidate(link): continue
   candidates.append({"url":u,"text":link.get("text",""),"tag":link.get("tag"),"attribute":link.get("attribute"),"discoveredFrom":r.url})
  unique={}
  for x in candidates: unique[(x["url"],x["text"])]=x
  row["discoveredCandidateLinks"]=sorted(unique.values(),key=lambda x:(x["url"],x["text"]))[:100]
  row["discoveredCandidateCount"]=len(unique)
  row["formsObserved"]=parser.forms[:20]
 except Exception as e:
  row.update({"status":"ROOT_FETCH_FAILED_TLS_VERIFICATION_RETAINED","error":f"{type(e).__name__}: {e}"})
 return row

def probe_candidate(item,portal):
 row={"stateCode":portal["code"],"stateName":portal["name"],"sourceIndexUrl":portal["url"],"requestedUrl":item["url"],"linkText":item["text"],"discoveredFrom":item["discoveredFrom"],"retrievedAtUtc":utc()}
 try:
  r=fetch(item["url"]); b=r.content
  row.update({"finalUrl":r.url,"httpStatus":r.status_code,"contentType":r.headers.get("Content-Type"),"byteLength":len(b),"sha256":sha(b)})
  if r.status_code!=200 or not b:
   row["status"]="HTTP_FAILURE_OR_EMPTY";return row
  ctype=(r.headers.get("Content-Type") or "").lower()
  if b.startswith(b"%PDF-") or "application/pdf" in ctype:
   if not b.startswith(b"%PDF-"): row["status"]="PDF_CONTENT_TYPE_BUT_NO_PDF_MAGIC";return row
   try:
    doc=fitz.open(stream=b,filetype="pdf")
    texts=[p.get_text("text",sort=True) for p in doc]
    full="\n".join(texts); first=texts[0] if texts else ""
    row.update({"pdfParseStatus":"PASS","pdfPageCount":doc.page_count,"pdfVersion":re.match(rb"%PDF-([0-9.]+)",b).group(1).decode() if re.match(rb"%PDF-([0-9.]+)",b) else None,
      "firstPageTextSha256":sha(first.encode()),"fullTextSha256":sha(full.encode()),
      "termFindings":{"pollingStation":bool(POLL_RE.search(full)),"containsElectorRollTerms":bool(ROLL_RE.search((item.get("text","")+" "+item["url"])+" "+first[:4000]))},
      "firstPagePreview":first[:1800]})
   except Exception as e: row.update({"pdfParseStatus":"FAIL","pdfParseError":f"{type(e).__name__}: {e}"})
   if row.get("pdfParseStatus")!="PASS": row["status"]="PDF_PARSE_FAILED";return row
   row["rawArtifact"]=save_raw(portal["code"],"candidate_"+sha(item["url"].encode())[:12]+".pdf",b)
   row["status"]="OFFICIAL_PORTAL_PDF_BYTES_ACQUIRED_CANDIDATE_ONLY"
  else:
   if not ("html" in ctype or b"<html" in b[:500].lower()): row["status"]="NON_HTML_NON_PDF";return row
   text=b.decode(r.encoding or "utf-8",errors="replace")
   name=safe(portal["code"]+"_candidate_"+sha(item["url"].encode())[:12])+".html";(RAW/name).write_bytes(b);row["rawArtifact"]="raw/"+name
   parser=LinkParser(r.url);parser.feed(text)
   row.update({"status":"OFFICIAL_PORTAL_HTML_BYTES_ACQUIRED_DISCOVERY_ONLY","titleSnippet":re.search(r"<title[^>]*>(.*?)</title>",text,re.I|re.S).group(1).strip()[:300] if re.search(r"<title[^>]*>(.*?)</title>",text,re.I|re.S) else None,
    "identityMarkers":{t:t.casefold() in text.casefold() for t in [portal["name"],"Chief Electoral Officer","Election Commission","Polling Station"]},
    "nestedCandidateLinkCount":sum(1 for l in parser.links if is_candidate(l) and approved(l.get("url","")))})
 except Exception as e:
  row.update({"status":"CANDIDATE_FETCH_FAILED_TLS_VERIFICATION_RETAINED","error":f"{type(e).__name__}: {e}"})
 return row

def main():
 manifest={"schemaVersion":1,"title":"Official state/UT CEO portal polling-station source discovery","retrievedAtUtc":utc(),"databaseAccess":"NONE","TLSVerification":"ENABLED","scope":"Official-root HTML discovery and bounded acquisition of explicitly linked non-elector polling-station list pages only; not a national crosswalk.","policy":{"noCaptchaBypass":True,"noAuthentication":True,"noElectoralRollPdfDownloads":True,"noElectorPersonalData":True,"noUnobservedUrls":True,"officialRootUrlLeadsRequireIndependentIdentityVerification":True},"expectedPortalCount":len(PORTALS),"portals":[],"candidatePageResults":[]}
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  fs=[pool.submit(probe_root,p) for p in PORTALS]
  for f in concurrent.futures.as_completed(fs): manifest["portals"].append(f.result())
 manifest["portals"].sort(key=lambda x:x["code"])
 tasks=[]
 for p in PORTALS:
  root=next(x for x in manifest["portals"] if x["code"]==p["code"])
  # Bound this to two candidate links per state to keep the sweep reproducible and small.
  for link in root.get("discoveredCandidateLinks",[])[:2]: tasks.append((p,link))
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  fs=[pool.submit(probe_candidate,link,p) for p,link in tasks]
  for f in concurrent.futures.as_completed(fs): manifest["candidatePageResults"].append(f.result())
 manifest["candidatePageResults"].sort(key=lambda x:(x["stateCode"],x["requestedUrl"]))
 manifest["summary"]={
  "officialPortalRootCount":len(PORTALS),
  "rootHtmlDownloaded":sum(1 for p in manifest["portals"] if p.get("status") in ("DOWNLOADED_HASHED_ROOT_HTML","DOWNLOADED_HTML_CAPTCHA_OR_ACCESS_CHALLENGE")),
  "rootFetchFailures":sum(1 for p in manifest["portals"] if "FETCH_FAILED" in p.get("status","")),
  "rootsWithPollingStationCandidateLinks":sum(1 for p in manifest["portals"] if p.get("discoveredCandidateCount",0)>0),
  "exactCandidateLinksDiscovered":sum(p.get("discoveredCandidateCount",0) for p in manifest["portals"]),
  "candidatePagesAttempted":len(manifest["candidatePageResults"]),
  "candidatePagesBytesAcquired":sum(1 for x in manifest["candidatePageResults"] if x.get("rawArtifact")),
  "candidatePdfBytesAcquired":sum(1 for x in manifest["candidatePageResults"] if x.get("status")=="OFFICIAL_PORTAL_PDF_BYTES_ACQUIRED_CANDIDATE_ONLY"),
  "candidateHtmlBytesAcquired":sum(1 for x in manifest["candidatePageResults"] if x.get("status")=="OFFICIAL_PORTAL_HTML_BYTES_ACQUIRED_DISCOVERY_ONLY"),
  "candidatePageFailures":sum(1 for x in manifest["candidatePageResults"] if "FAILED" in x.get("status","")),
  "status":"DISCOVERY_ONLY_NO_NATIONAL_CROSSWALK_ACCEPTANCE"
 }
 manifest["completedAtUtc"]=utc()
 (OUT/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 (OUT/"README.md").write_text(
  "# Official CEO portal polling-station source discovery\n\n"
  "Discovery only; no national crosswalk is inferred. All routes were discovered from retrieved official-root HTML, and every HTTP request retained TLS verification. "
  "No electoral-roll PDFs or elector-level records were downloaded. CAPTCHA/authentication protections were not bypassed. "
  "See manifest.json for per-portal HTTP statuses, raw HTML SHA-256, exact observed links, and candidate source statuses.\n",encoding="utf-8")
 print(json.dumps({"status":"DISCOVERY_COMPLETED","summary":manifest["summary"],
  "portalResults":[{"code":p["code"],"status":p["status"],"httpStatus":p.get("httpStatus"),"bytes":p.get("byteLength"),"candidateCount":p.get("discoveredCandidateCount",0),"sha256":p.get("sha256")} for p in manifest["portals"]],
  "candidatePageResults":[{"stateCode":x["stateCode"],"status":x["status"],"url":x["finalUrl"] if x.get("finalUrl") else x["requestedUrl"],"bytes":x.get("byteLength"),"sha256":x.get("sha256")} for x in manifest["candidatePageResults"]]},indent=2,ensure_ascii=False))

if __name__=="__main__": main()
