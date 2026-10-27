#!/usr/bin/env python3
"""Acquire the official OGD India all-India PIN-boundary resource without equating it to delivery beats."""
from __future__ import annotations
import concurrent.futures, hashlib, html, json, re, zipfile, io
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests

OUT=Path("stage_b_india_post_pin_boundary_probe")
RAW=OUT/"raw"
RAW.mkdir(parents=True,exist_ok=True)
RESOURCE_URL="https://data.gov.in/resource/all-india-pincode-boundary-geojson"
ALLOWED={"data.gov.in","www.data.gov.in","api.data.gov.in","indiapost.gov.in","www.indiapost.gov.in"}
USER_AGENT="PANIN-W021.5-Official-Postal-Resource-Acquisition/1.0"
CA=Path("/etc/ssl/certs/ca-certificates.crt")
VERIFY=str(CA) if CA.is_file() else True
TIMEOUT=(10,24)
MAX_BODY=100*1024*1024

def now(): return datetime.now(timezone.utc).isoformat()
def sha(b): return hashlib.sha256(b).hexdigest()
def safe(s): return re.sub(r"[^A-Za-z0-9_.-]+","_",s)[:130]
def approved(url):
    p=urlparse(url)
    return p.scheme=="https" and (p.hostname or "").lower() in ALLOWED

class Links(HTMLParser):
    def __init__(self,base):
        super().__init__(convert_charrefs=True);self.base=base;self.links=[];self.page_text=[];self._script=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);tag=tag.lower()
        for k in ("href","src","action","data-url","data-href","data-download-url","data-file-url"):
            val=a.get(k)
            if val:
                u=urljoin(self.base,html.unescape(val.strip()))
                self.links.append({"tag":tag,"attribute":k,"url":u,"text":""})
        if tag=="script": self._script=True
    def handle_endtag(self,tag):
        if tag.lower()=="script":self._script=False
    def handle_data(self,data):
        if data and data.strip(): self.page_text.append(data.strip())

def response_record(url,resp,body,path=None):
    return {"requestedUrl":url,"finalUrl":resp.url,"retrievedAtUtc":now(),"httpStatus":resp.status_code,
            "contentType":resp.headers.get("Content-Type"),"contentDisposition":resp.headers.get("Content-Disposition"),
            "etag":resp.headers.get("ETag"),"lastModified":resp.headers.get("Last-Modified"),
            "byteLength":len(body),"sha256":sha(body),"rawArtifact":path}

def parse_geojson_bytes(body):
    try:
        obj=json.loads(body.decode("utf-8-sig"))
        if isinstance(obj,dict) and obj.get("type")=="FeatureCollection" and isinstance(obj.get("features"),list):
            return obj
    except Exception: pass
    return None

def inspect_geojson(obj):
    try:
        from shapely.geometry import shape
        from shapely.validation import explain_validity
    except Exception:
        return {"status":"NOT_RUN_SHAPELY_UNAVAILABLE"}
    types={};invalid=[];bounds=[];empty=0
    for i,f in enumerate(obj.get("features",[])):
        gobj=f.get("geometry")
        if not gobj:
            invalid.append({"index":i,"reason":"MISSING_GEOMETRY"});continue
        try:
            g=shape(gobj);types[g.geom_type]=types.get(g.geom_type,0)+1
            if g.is_empty:empty+=1
            if not g.is_valid:invalid.append({"index":i,"reason":explain_validity(g),"properties":f.get("properties")})
            if not g.is_empty:bounds.append(g.bounds)
        except Exception as e: invalid.append({"index":i,"reason":f"{type(e).__name__}: {e}"})
    all_bounds=None if not bounds else [min(x[0] for x in bounds),min(x[1] for x in bounds),max(x[2] for x in bounds),max(x[3] for x in bounds)]
    return {"status":"COMPLETED","featureCount":len(obj.get("features",[])),"geometryTypes":types,
            "invalidGeometryCount":len(invalid),"emptyGeometryCount":empty,"invalidExamples":invalid[:100],
            "overallBounds":all_bounds,"sampleProperties":[f.get("properties") for f in obj.get("features",[])[:5]]}

def fetch_one(url):
    rec={"requestedUrl":url,"attemptedAtUtc":now()}
    if not approved(url):
        rec.update({"status":"REJECTED_NON_ALLOWLISTED_HOST"});return rec,None,None
    try:
        r=requests.get(url,headers={"User-Agent":USER_AGENT,"Accept":"text/html,application/geo+json,application/json,application/zip,*/*;q=0.5","Accept-Language":"en-IN,en;q=0.9"},
                       timeout=TIMEOUT,allow_redirects=True,verify=VERIFY,stream=True)
        final=r.url
        if not approved(final):
            r.close();rec.update({"status":"REJECTED_REDIRECT_HOST","finalUrl":final,"httpStatus":r.status_code});return rec,None,None
        chunks=[];total=0
        for chunk in r.iter_content(1024*1024):
            if not chunk:continue
            total+=len(chunk)
            if total>MAX_BODY:
                r.close();rec.update({"status":"BODY_LIMIT_EXCEEDED","finalUrl":final,"httpStatus":r.status_code,"observedAtLeastBytes":total});return rec,None,None
            chunks.append(chunk)
        body=b"".join(chunks)
        r.close()
        rec.update({"finalUrl":final,"httpStatus":r.status_code,"contentType":r.headers.get("Content-Type"),
                    "contentDisposition":r.headers.get("Content-Disposition"),"etag":r.headers.get("ETag"),
                    "lastModified":r.headers.get("Last-Modified"),"byteLength":len(body),"sha256":sha(body)})
        if r.status_code!=200 or not body:
            rec["status"]="HTTP_FAILURE_NO_SOURCE_ACCEPTED";return rec,None,None
        suffix=Path(urlparse(final).path).suffix.lower()
        ctype=(r.headers.get("Content-Type") or "").lower()
        rawname=safe(urlparse(final).path.strip("/").replace("/","_") or urlparse(final).hostname)
        if not suffix:
            suffix=".bin" if "html" not in ctype else ".html"
        if suffix not in (".html",".htm",".json",".geojson",".zip",".shp",".csv",".xml",".pdf",".bin"):
            suffix=".bin"
        rawpath=RAW/(rawname+suffix)
        # Avoid overwriting different responses with the same path.
        if rawpath.exists() and sha(rawpath.read_bytes())!=sha(body):
            rawpath=RAW/(rawname+"_"+sha(body)[:10]+suffix)
        rawpath.write_bytes(body);rec["rawArtifact"]=str(rawpath.relative_to(OUT))
        rec["pdfMagic"]=body.startswith(b"%PDF-");rec["zipMagic"]=body.startswith(b"PK\x03\x04")
        obj=parse_geojson_bytes(body)
        if obj:
            rec["status"]="GEOJSON_FEATURE_COLLECTION_ACQUIRED";rec["geojsonAudit"]=inspect_geojson(obj)
        elif rec["zipMagic"]:
            zresult=[]
            try:
                with zipfile.ZipFile(io.BytesIO(body)) as z:
                    for info in z.infolist():
                        if info.is_dir():continue
                        zresult.append({"member":info.filename,"byteLength":info.file_size})
                        if info.file_size<=MAX_BODY and info.filename.lower().endswith((".geojson",".json")):
                            mb=z.read(info.filename);mo=parse_geojson_bytes(mb)
                            if mo:
                                member_name=RAW/(safe(Path(info.filename).name))
                                member_name.write_bytes(mb)
                                rec.setdefault("embeddedGeoJSON",[]).append({"member":info.filename,"rawArtifact":str(member_name.relative_to(OUT)),
                                     "byteLength":len(mb),"sha256":sha(mb),"geojsonAudit":inspect_geojson(mo)})
                rec["zipMembers"]=zresult;rec["status"]="ZIP_RESOURCE_ACQUIRED"
            except Exception as e:
                rec["status"]="ZIP_PARSE_FAILED";rec["zipParseError"]=f"{type(e).__name__}: {e}"
        elif "html" in ctype or body[:100].lower().find(b"<html")>=0 or body[:50].lower().find(b"<!doctype")>=0:
            rec["status"]="OFFICIAL_HTML_RESPONSE_ACQUIRED"
            try:
                parser=Links(final);parser.feed(body.decode("utf-8","replace"))
                rec["discoveredLinkCount"]=len(parser.links)
                rec["relevantLinks"]=[x for x in parser.links if re.search(r"pin|geo.?json|shapefile|shape.?file|download|resource|boundary|pincode|postal",x["url"]+" "+x.get("text",""),re.I)]
                rec["title"]=(re.search(r"<title[^>]*>(.*?)</title>",body.decode("utf-8","replace"),re.I|re.S).group(1).strip() if re.search(r"<title[^>]*>(.*?)</title>",body.decode("utf-8","replace"),re.I|re.S) else None)
                rec["htmlByteHashVerified"]=sha(rawpath.read_bytes())==rec["sha256"]
            except Exception as e:rec["htmlParseError"]=str(e)
        else:rec["status"]="NON_HTML_NON_GEOJSON_RESOURCE_ACQUIRED"
        return rec,body,rec.get("relevantLinks",[])
    except Exception as e:
        rec.update({"status":"FETCH_FAILED_TLS_VERIFICATION_RETAINED","error":f"{type(e).__name__}: {e}"});return rec,None,None

def main():
    manifest={"schemaVersion":1,"title":"Official OGD India All India PIN Boundary resource acquisition (not delivery-beat geometry)",
      "generatedAtUtc":now(),"databaseAccess":"NONE","TLSVerification":"ENABLED",
      "targetResource":RESOURCE_URL,"scope":"Acquire the official PIN-boundary resource if its exact download is exposed; explicitly do not equate PIN polygons with postman delivery beats.",
      "probes":[],"acquiredResources":[],"disposition":{}}
    # First obtain the official catalog page and extract real links and resource identifiers.
    base,body,links=fetch_one(RESOURCE_URL)
    manifest["probes"].append(base)
    discovered=[]
    if body:
        parser=Links(base.get("finalUrl") or RESOURCE_URL);parser.feed(body.decode("utf-8","replace"))
        textpage="\n".join(parser.page_text)
        (OUT/"resource_page_text.txt").write_text(textpage,encoding="utf-8")
        manifest["cataloguePageText"]={"path":"resource_page_text.txt","byteLength":len(textpage.encode()),"sha256":sha(textpage.encode()),"title":base.get("title")}
        for x in parser.links:
            u=x["url"]
            if not approved(u):continue
            if re.search(r"pin|geo.?json|shapefile|shape.?file|download|resource|boundary|pincode|postal|api/3/action|api.data.gov.in",u+" "+x.get("text",""),re.I):
                discovered.append(u)
        # Search embedded scripts and JSON attributes for official-host URL references.
        raw_html=body.decode("utf-8","replace")
        for match in re.findall(r"""(?:https?:)?//(?:www\.)?data\.gov\.in[^"'\\\s<>]+|(?:https?:)?//api\.data\.gov\.in[^"'\\\s<>]+|/(?:sites/default/files|api/3/action|resource)/[^"'\\\s<>]+""",raw_html,re.I):
            u=urljoin(base.get("finalUrl") or RESOURCE_URL,html.unescape(match))
            if approved(u):discovered.append(u)
    # Known standard CKAN-style catalogue/API routes are probes only; a successful response
    # is accepted as a resource only if actual returned data/mime/metadata proves that.
    discovered.extend([
      "https://data.gov.in/api/3/action/package_show?id=all-india-pincode-boundary-geojson",
      "https://data.gov.in/api/3/action/package_search?q=all%20india%20pincode%20boundary",
      "https://www.data.gov.in/api/3/action/package_show?id=all-india-pincode-boundary-geojson",
      "https://api.data.gov.in/resource/all-india-pincode-boundary-geojson",
    ])
    # Crawl official catalogue links to at most two levels; candidate links must come from
    # observed official HTML or the documented official API probes above.
    visited=set();queue=[]
    for u in discovered:
        if u not in visited:queue.append((u,1))
    max_requests=90
    while queue and len(visited)<max_requests:
        batch=[]
        while queue and len(batch)<10 and len(visited)+len(batch)<max_requests:
            u,depth=queue.pop(0)
            if u in visited:continue
            visited.add(u);batch.append((u,depth))
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            futures={pool.submit(fetch_one,u): (u,depth) for u,depth in batch}
            for future in concurrent.futures.as_completed(futures):
                url,depth=futures[future]
                rec,b,rel=future.result()
                manifest["probes"].append(rec)
                if b and rec.get("status") in ("GEOJSON_FEATURE_COLLECTION_ACQUIRED","ZIP_RESOURCE_ACQUIRED","NON_HTML_NON_GEOJSON_RESOURCE_ACQUIRED"):
                    manifest["acquiredResources"].append({k:rec.get(k) for k in ("requestedUrl","finalUrl","httpStatus","contentType","contentDisposition","byteLength","sha256","rawArtifact","status","geojsonAudit","zipMembers","embeddedGeoJSON") if k in rec})
                if b and depth<2 and rec.get("status")=="OFFICIAL_HTML_RESPONSE_ACQUIRED":
                    for x in (rel or []):
                        v=x.get("url")
                        if v and v not in visited and v not in queue and approved(v):queue.append((v,depth+1))
    good=[x for x in manifest["acquiredResources"] if x.get("status") in ("GEOJSON_FEATURE_COLLECTION_ACQUIRED","ZIP_RESOURCE_ACQUIRED")]
    manifest["disposition"]={
      "officialCataloguePageStatus":base.get("status"),
      "officialCatalogueRawBytesAcquired":bool(base.get("rawArtifact")),
      "candidateURLsDiscovered":len(discovered),"distinctCandidateRequestsMade":len(visited),
      "nonHtmlResourceBytesAcquired":len([x for x in manifest["probes"] if x.get("status")=="NON_HTML_NON_GEOJSON_RESOURCE_ACQUIRED"]),
      "geojsonFeatureCollectionsAcquired":len([x for x in manifest["probes"] if x.get("status")=="GEOJSON_FEATURE_COLLECTION_ACQUIRED"]),
      "zipResourcesAcquired":len([x for x in manifest["probes"] if x.get("status")=="ZIP_RESOURCE_ACQUIRED"]),
      "candidateResourceFiles":len(good),
      "pinBoundaryIsNotDeliveryBeatGeometry":True,
      "deliveryBeatGate":"OPEN: actual beat polygons or an authenticated custodian response still required",
      "interpretation":"The PIN dataset is retained only as a distinct postal-area candidate and cannot close EB-03."
    }
    manifest["completedAtUtc"]=now()
    b=(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n").encode()
    (OUT/"manifest.json").write_bytes(b)
    if not json.loads((OUT/"manifest.json").read_text())["disposition"]["pinBoundaryIsNotDeliveryBeatGeometry"]:
        raise SystemExit("SCOPE_LABEL_GATE_FAILURE")
    print(json.dumps({"status":"OFFICIAL_PIN_BOUNDARY_DISCOVERY_AND_ACQUISITION_COMPLETED","disposition":manifest["disposition"],
      "acquiredResources":manifest["acquiredResources"],"manifestBytes":len(b),"manifestSha256":sha(b)},indent=2,ensure_ascii=False))

if __name__=="__main__":main()
