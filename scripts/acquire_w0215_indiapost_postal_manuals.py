#!/usr/bin/env python3
"""Acquire official India Post postal manuals discovered from hash-verified catalogue HTML.

Every download URL must have been observed in the retained official page payload; this script
never guesses document tokens. HTTPS verification is enabled with the runner's system CA store.
Manual text is operational evidence only and cannot establish a national delivery-beat GIS layer.
"""
from __future__ import annotations
import hashlib, html, json, re, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import fitz
import requests

BASE = Path("stage_b_catalogue_expansion")
RAW_CATALOGUE = BASE / "raw"
OUT = Path("data/evidence/w021_5/indiapost_postal_manuals")
RAW = OUT / "raw"
TEXT = OUT / "text"
RAW.mkdir(parents=True, exist_ok=True)
TEXT.mkdir(parents=True, exist_ok=True)
ALLOWED_HOSTS = {"www.indiapost.gov.in", "indiapost.gov.in"}
TIMEOUT = (10, 30)
USER_AGENT = "PANIN-W021.5-Official-IndiaPost-Manual-Acquisition/1.0"
CA_BUNDLE = Path("/etc/ssl/certs/ca-certificates.crt")
VERIFY: str | bool = str(CA_BUNDLE) if CA_BUNDLE.is_file() else True
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": USER_AGENT,
    "Accept": "application/pdf,text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
})

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def utc() -> str:
    return datetime.now(timezone.utc).isoformat()

def parse_pdf(raw: bytes) -> dict:
    if not raw.startswith(b"%PDF-"):
        return {"pdfMagic": False, "pdfParseStatus": "NOT_PDF"}
    try:
        with fitz.open(stream=raw, filetype="pdf") as doc:
            text_value = "\n".join(p.get_text("text", sort=True) for p in doc)
            return {
                "pdfMagic": True,
                "pdfParseStatus": "PASS",
                "pdfVersion": re.match(rb"%PDF-([0-9.]+)", raw).group(1).decode() if re.match(rb"%PDF-([0-9.]+)", raw) else None,
                "pdfPageCount": len(doc),
                "text": text_value,
                "textSha256": sha(text_value.encode("utf-8")),
            }
    except Exception as exc:
        return {"pdfMagic": True, "pdfParseStatus": "FAIL", "pdfParseError": f"{type(exc).__name__}: {exc}"}

def parse_observed_document_records(body: str, final_url: str) -> list[dict]:
    # The exact live source uses escaped JSON inside a React/Next streaming payload.
    payload = body.replace("\\\"", "\"").replace("\\/", "/")
    pat = re.compile(
        r'\{"id":"([^"]{1,120})","slug":"([^"]{0,500})","title":"([^"]{0,500})",'
        r'"date":"([^"]{0,80})","size":"([^"]{0,80})","version":"([^"]{0,150})",'
        r'"type":"([^"]{0,40})","url":"([^"]{1,600})"\}'
    )
    dedup = {}
    for m in pat.finditer(payload):
        document_id, slug, title, date, size, version, filetype, path = m.groups()
        path = html.unescape(path).replace("\\/", "/")
        if not path.startswith("/api/documents/file/"):
            continue
        url = urljoin(final_url, path)
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
            continue
        record = {
            "documentId": document_id, "slug": html.unescape(slug),
            "title": html.unescape(title), "catalogueDate": date, "displayedSize": size,
            "version": html.unescape(version), "documentType": filetype,
            "downloadUrl": url, "discoveredOnPage": final_url,
        }
        dedup[(record["title"], record["downloadUrl"])] = record
    return list(dedup.values())

def relevance(record: dict) -> bool:
    title = record["title"]
    return bool(re.search(
        r"postal\s*manual|postal\s+manual|post\s*office\s+manual|postal\s+operations\s+manual|"
        r"post\s*office\s+guide|postal\s+guide|postmaster.{0,35}(manual|guide)",
        title, re.I
    ))

def scan_terms(text: str) -> dict:
    terms = {
        "deliveryBeat": r"delivery\s+beat|beat\s+of\s+delivery|beat\s+system",
        "beatList": r"beat\s+list|list\s+of\s+beats|delivery\s+list",
        "postalMap": r"postal\s+map|postman.?s\s+map|delivery\s+map",
        "postmaster": r"postmaster",
        "streetOrQuarter": r"street|quarter|locality",
        "alphabeticalBeatIndex": r"alphabetical.{0,100}(beat|street|quarter)|(beat|street|quarter).{0,100}alphabetical",
        "gisOrPolygon": r"geo.?json|shapefile|geospatial|GIS|vector\s+polygon",
    }
    result = {}
    for name, pattern in terms.items():
        matches = list(re.finditer(pattern, text, re.I))
        result[name] = {
            "found": bool(matches),
            "matchCount": len(matches),
            "snippets": [
                re.sub(r"\s+", " ", text[max(0,m.start()-220):min(len(text),m.end()+400)]).strip()
                for m in matches[:8]
            ],
        }
    return result

def main() -> None:
    manifest_path = BASE / "manifest.json"
    if not manifest_path.is_file():
        raise SystemExit("RETAINED_OFFICIAL_CATALOGUE_MANIFEST_MISSING")
    upstream_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    source_pages = []
    docs = {}
    source_errors = []
    for item in upstream_manifest.get("livePages", []):
        label = str(item.get("label", ""))
        if not label.startswith("IndiaPost_") or item.get("status") != "DOWNLOADED_HASHED_HTML_DISCOVERY_ONLY":
            continue
        rel = item.get("rawArtifact")
        raw_path = BASE / (rel or "")
        row = {
            "label": label, "requestedUrl": item.get("requestedUrl"),
            "finalUrl": item.get("finalUrl"), "rawArtifactPath": rel,
            "expectedByteLength": item.get("byteLength"), "expectedSha256": item.get("sha256"),
            "status": "NOT_VALIDATED",
        }
        if not rel or not raw_path.is_file():
            row["status"] = "RAW_CATALOGUE_PAGE_MISSING"
            source_errors.append(row)
            source_pages.append(row)
            continue
        raw = raw_path.read_bytes()
        actual_sha = sha(raw)
        row.update({"actualByteLength": len(raw), "actualSha256": actual_sha})
        if len(raw) != item.get("byteLength") or actual_sha != item.get("sha256"):
            row["status"] = "RAW_CATALOGUE_HASH_OR_SIZE_MISMATCH"
            source_errors.append(row)
            source_pages.append(row)
            continue
        if urlparse(item.get("finalUrl", "")).hostname not in ALLOWED_HOSTS:
            row["status"] = "REJECTED_NON_OFFICIAL_CATALOGUE_HOST"
            source_errors.append(row)
            source_pages.append(row)
            continue
        parsed_records = parse_observed_document_records(raw.decode("utf-8", errors="replace"), item["finalUrl"])
        row["status"] = "RAW_CATALOGUE_HASH_VERIFIED"
        row["documentRecordsParsed"] = len(parsed_records)
        row["relevantManualRecords"] = sum(1 for d in parsed_records if relevance(d))
        row["parsedDocumentRecordsSha256"] = sha(json.dumps(parsed_records,sort_keys=True,ensure_ascii=False).encode("utf-8"))
        source_pages.append(row)
        for d in parsed_records:
            if relevance(d):
                docs[(d["title"],d["downloadUrl"])] = d

    # Exact catalogue-observed document tokens only; prioritize core Postal Manual volumes.
    doc_list = list(docs.values())
    doc_list.sort(key=lambda x: (
        0 if re.search(r"Postal Manual Vol\.\s*II\b",x["title"],re.I) else
        1 if re.search(r"Postal Manual Vol\.\s*(III|IV)\b",x["title"],re.I) else
        2,
        x["title"].casefold(), x["downloadUrl"]
    ))
    manifest = {
        "schemaVersion": 1,
        "title": "Official India Post postal manual acquisition and delivery-beat text scan",
        "startedAtUtc": utc(),
        "authority": "Department of Posts, Ministry of Communications, Government of India",
        "officialCatalogueBranchSource": "Previously captured official India Post pages committed in stage_b_catalogue_expansion/",
        "tlsVerification": "ENABLED",
        "tlsTrustStore": str(CA_BUNDLE) if CA_BUNDLE.is_file() else "requests default CA bundle",
        "databaseAccess": "NONE",
        "sourceCatalogueValidation": source_pages,
        "sourceCatalogueErrors": source_errors,
        "manualCandidatesObserved": len(doc_list),
        "manualCandidateRecords": doc_list,
        "downloads": [],
    }

    def download_one(item: dict) -> dict:
        row = {**item, "requestedAtUtc": utc(), "classification": "OFFICIAL_POSTAL_MANUAL_CANDIDATE"}
        try:
            parsed = urlparse(item["downloadUrl"])
            if parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS:
                row["status"] = "REJECTED_UNAPPROVED_HOST"
                return row
            response = SESSION.get(item["downloadUrl"], timeout=TIMEOUT, allow_redirects=True, verify=VERIFY)
            if response.url != item["downloadUrl"] and (
                urlparse(response.url).scheme != "https" or urlparse(response.url).hostname not in ALLOWED_HOSTS
            ):
                row.update({"status":"REJECTED_REDIRECT_HOST","httpStatus":response.status_code,"finalUrl":response.url})
                return row
            raw = response.content
            row.update({
                "finalUrl": response.url, "httpStatus": response.status_code,
                "contentType": response.headers.get("Content-Type"),
                "byteLength": len(raw), "sha256": sha(raw) if raw else None,
                "pdfMagic": raw.startswith(b"%PDF-"),
            })
            if response.status_code != 200 or not raw.startswith(b"%PDF-"):
                row["status"] = "OFFICIAL_CATALOGUE_LINK_NOT_VALID_PDF_BYTES"
                row["errorBodyPreview"] = raw[:350].decode("utf-8",errors="replace")
                return row
            parsed_pdf = parse_pdf(raw)
            row.update({k:v for k,v in parsed_pdf.items() if k != "text"})
            if parsed_pdf.get("pdfParseStatus") != "PASS":
                row["status"] = "OFFICIAL_PDF_PARSE_FAILED"
                return row
            text_body = parsed_pdf["text"]
            row["termFindings"] = scan_terms(text_body)
            safe_name = re.sub(r"[^A-Za-z0-9_.-]+","_",item["title"]).strip("_.")[:100]
            pdf_path = RAW / (safe_name + ".pdf")
            text_path = TEXT / (safe_name + ".txt")
            pdf_path.write_bytes(raw)
            text_path.write_text(text_body,encoding="utf-8")
            row["rawArtifact"] = str(pdf_path.relative_to(OUT))
            row["textArtifact"] = str(text_path.relative_to(OUT))
            row["textLength"] = len(text_body)
            row["textSha256"] = parsed_pdf["textSha256"]
            row["status"] = "OFFICIAL_POSTAL_PDF_BYTES_ACQUIRED_AND_PARSED"
            return row
        except Exception as exc:
            row.update({"status":"FETCH_FAILED_TLS_VERIFICATION_RETAINED","error":f"{type(exc).__name__}: {exc}"})
            return row

    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(download_one,item) for item in doc_list]
        for future in concurrent.futures.as_completed(futures):
            manifest["downloads"].append(future.result())
    manifest["downloads"].sort(key=lambda x:(x.get("title","").casefold(),x.get("downloadUrl","")))
    acquired = [x for x in manifest["downloads"] if x.get("status")=="OFFICIAL_POSTAL_PDF_BYTES_ACQUIRED_AND_PARSED"]
    beat_text = [x for x in acquired if any(x.get("termFindings",{}).get(k,{}).get("found") for k in ("deliveryBeat","beatList","postalMap"))]
    gis_text = [x for x in acquired if x.get("termFindings",{}).get("gisOrPolygon",{}).get("found")]
    manifest["summary"] = {
        "officialCataloguePagesHashValidated": sum(1 for x in source_pages if x.get("status")=="RAW_CATALOGUE_HASH_VERIFIED"),
        "officialCataloguePagesExpected": len(source_pages),
        "catalogueHashOrFetchErrors": len(source_errors),
        "manualRecordsObserved": len(doc_list),
        "manualPDFsAcquiredAndParsed": len(acquired),
        "manualPDFsFailedOrUnavailable": len(doc_list)-len(acquired),
        "manualsContainingDeliveryBeatOrBeatListOrPostalMapText": len(beat_text),
        "manualsContainingGISOrPolygonText": len(gis_text),
        "officialDeliveryBeatPolygonDatasetAcquired": False,
        "nationalDeliveryBeatGeometryDisposition": "OPEN_NO_NATIONAL_GIS_DATASET_ACQUIRED_OR_VERIFIED",
    }
    manifest["disposition"] = (
        "OFFICIAL_POSTAL_MANUALS_ACQUIRED_AND_SCANNED; DELIVERY_BEAT_GIS_STILL_OPEN"
        if acquired else "NO_POSTAL_MANUAL_PDF_BYTES_ACQUIRED; DELIVERY_BEAT_GIS_STILL_OPEN"
    )
    manifest["completedAtUtc"] = utc()
    body = (json.dumps(manifest,indent=2,ensure_ascii=False)+"\n").encode("utf-8")
    (OUT/"manifest.json").write_bytes(body)
    readback=json.loads((OUT/"manifest.json").read_text(encoding="utf-8"))
    if readback["summary"]["manualRecordsObserved"] != len(doc_list):
        raise SystemExit("MANIFEST_READBACK_VALIDATION_FAILED")
    if not acquired:
        raise SystemExit("NO_POSTAL_MANUAL_PDFS_ACQUIRED")
    (OUT/"README.md").write_text(
        "# Official India Post postal-manual evidence — delivery-beat GIS remains open\n\n"
        f"Catalogue pages SHA-256 validated: {manifest['summary']['officialCataloguePagesHashValidated']}/{len(source_pages)}.\n"
        f"Manual candidates from actual official page payloads: {len(doc_list)}; acquired/parsed: {len(acquired)}.\n"
        f"Manuals containing a delivery-beat/list/postal-map phrase: {len(beat_text)}; containing GIS/polygon terms: {len(gis_text)}.\n\n"
        "The PDFs were linked from retained official India Post catalogue HTML. Each source page and each downloaded PDF has a byte length and SHA-256 in manifest.json. TLS verification remained enabled. A manual mentioning operational postal maps or delivery-beat lists is not proof that a national geospatial delivery-beat polygon dataset exists. No PIN-code polygon is treated as a delivery beat. The national delivery-beat geometry requirement therefore remains OPEN unless raw authorized geometry and its coverage metadata are acquired or an authenticated custodian response supports a formally adjudicated alternative.\n",
        encoding="utf-8"
    )
    print(json.dumps({"status":manifest["disposition"],"summary":manifest["summary"],"downloads":[{k:x.get(k) for k in ("title","downloadUrl","status","byteLength","sha256","pdfPageCount","termFindings","rawArtifact")} for x in manifest["downloads"]]},indent=2,ensure_ascii=False))

if __name__ == "__main__":
    main()
