#!/usr/bin/env python3
"""Archive and verify the official CEO Delhi 2024 polling-station evidence slice."""
from __future__ import annotations
import gzip, hashlib, io, json, os, tarfile
from datetime import datetime, timezone
from pathlib import Path

RUN_ID = os.environ.get("GITHUB_RUN_ID", "UNKNOWN")
COMMIT_SHA = os.environ.get("GITHUB_SHA", "UNKNOWN")
OUT = Path("stage_b_ceo_delhi_polling_stations")
RAW = OUT / "raw"
DURABLE = Path("data/evidence/w021_5/delhi_2024")
INDEX_URL = "https://ceodelhinet.nic.in/ceodelhiweb/ListofPollingStation.aspx"
FORM_URL = "https://ceodelhinet.nic.in/ceodelhiweb/PSL.aspx"
PASS = "PASS_70_OF_70_OFFICIAL_AC_POSTBACKS_ACQUIRED_AND_VALIDATED"

def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def write_json(path: Path, value: dict) -> bytes:
    b = (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b)
    return b

def main():
    mbytes = (OUT / "manifest.json").read_bytes()
    m = json.loads(mbytes)
    cb = (OUT / "polling_station_crosswalk.json").read_bytes()
    x = json.loads(cb)
    if m.get("overallStatus") != PASS:
        raise SystemExit("ACQUISITION_STATUS_NOT_PASS")
    integ = m.get("normalizedCrosswalk", {}).get("integrityValidation", {})
    if integ.get("status") != "PASS" or sha(cb) != m["normalizedCrosswalk"].get("sha256"):
        raise SystemExit("CROSSWALK_INTEGRITY_NOT_PASS")
    if len(m.get("records", [])) != 70 or len(x.get("records", [])) != 14947:
        raise SystemExit("EXPECTED_AC_OR_ROW_COUNTS_MISMATCH")
    if x.get("summary", {}).get("uniqueACCount") != 70:
        raise SystemExit("CROSSWALK_AC_COVERAGE_NOT_70")
    records = {r["acNo"]: r for r in m["records"]}
    if sorted(records) != list(range(1, 71)):
        raise SystemExit("DETAIL_AC_NUMBERS_NOT_1_TO_70")
    # Re-read every raw AC page and compare actual bytes with the recorded manifest.
    raw_pages = []
    for r in m["records"]:
        v = r.get("independentTableValidation", {})
        if r.get("status") != "DOWNLOADED_HASHED_OFFICIAL_POSTBACK_HTML" or v.get("status") != "PASS":
            raise SystemExit("AC_PAGE_OR_GRID_VALIDATION_FAIL:" + str(r.get("acNo")))
        rel = r.get("rawArtifact")
        p = OUT / (rel or "")
        if not rel or not p.is_file():
            raise SystemExit("RAW_PAGE_MISSING:" + str(r.get("acNo")))
        b = p.read_bytes()
        if len(b) != r.get("byteLength") or sha(b) != r.get("sha256"):
            raise SystemExit("RAW_PAGE_HASH_MISMATCH:" + str(r["acNo"]))
        raw_pages.append(p)
    pairs = [(r.get("assemblyConstituencyNumber"), r.get("pollingStationNumber")) for r in x["records"]]
    if len(set(pairs)) != len(pairs):
        raise SystemExit("DUPLICATE_AC_STATION_PAIR")
    if {r.get("assemblyConstituencyNumber") for r in x["records"]} != set(range(1, 71)):
        raise SystemExit("CROSSWALK_AC_COVERAGE_MISMATCH")
    for r in x["records"]:
        p = records.get(r["assemblyConstituencyNumber"])
        if not p or r.get("sourcePageSha256") != p.get("sha256") or r.get("sourcePageByteLength") != p.get("byteLength"):
            raise SystemExit("ROW_SOURCE_PAGE_HASH_LINK_MISMATCH")
    if len(x["records"]) != sum(r["independentTableValidation"]["dataRowCount"] for r in m["records"]):
        raise SystemExit("CROSSWALK_ROW_COUNT_MISMATCH")

    ix = m.get("index", {})
    ip = OUT / (ix.get("rawArtifact") or "")
    if ix.get("requestedUrl") != INDEX_URL or not ip.is_file():
        raise SystemExit("OFFICIAL_INDEX_MISSING")
    ib = ip.read_bytes()
    if len(ib) != ix.get("byteLength") or sha(ib) != ix.get("sha256"):
        raise SystemExit("OFFICIAL_INDEX_HASH_MISMATCH")
    aux = next((a for a in m.get("auxiliaryPages", []) if a.get("finalUrl", "").rstrip("/") == FORM_URL), None)
    if not aux or aux.get("status") != "DOWNLOADED_HASHED_HTML":
        raise SystemExit("OFFICIAL_FORM_SOURCE_MISSING")
    fp = OUT / (aux.get("rawArtifact") or "")
    if not fp.is_file():
        raise SystemExit("OFFICIAL_FORM_RAW_BYTES_MISSING")
    fb = fp.read_bytes()
    if len(fb) != aux.get("byteLength") or sha(fb) != aux.get("sha256"):
        raise SystemExit("OFFICIAL_FORM_HASH_MISMATCH")

    DURABLE.mkdir(parents=True, exist_ok=True)
    compressed = gzip.compress(cb, compresslevel=9, mtime=0)
    gzpath = DURABLE / "polling_station_crosswalk_2024.json.gz"
    gzpath.write_bytes(compressed)

    # Lossless archive of original response bodies, with normalized tar metadata.
    rawpaths = sorted(p for p in RAW.glob("*.html") if p.is_file())
    expected = {p.name for p in raw_pages} | {ip.name, fp.name}
    if not expected.issubset({p.name for p in rawpaths}):
        raise SystemExit("RAW_HTML_ARCHIVE_INPUTS_MISSING")
    tarpath = DURABLE / "ceo_delhi_polling_source_html_2024.tar.gz"
    with tarpath.open("wb") as sink:
        with gzip.GzipFile(fileobj=sink, mode="wb", compresslevel=9, mtime=0) as gz:
            with tarfile.open(fileobj=gz, mode="w") as tar:
                for p in rawpaths:
                    b = p.read_bytes()
                    info = tarfile.TarInfo("raw/" + p.name)
                    info.size = len(b); info.mtime = 0; info.uid = 0; info.gid = 0
                    info.uname = ""; info.gname = ""; info.mode = 0o644
                    tar.addfile(info, io.BytesIO(b))
    tb = tarpath.read_bytes()
    gb = gzpath.read_bytes()

    page_ledger = []
    for r in sorted(m["records"], key=lambda z: z["acNo"]):
        v = r["independentTableValidation"]
        page_ledger.append({
            "acNo": r["acNo"], "acName": r["acNameFromIndex"],
            "requestUrl": r.get("requestedUrl"), "finalUrl": r.get("finalUrl"),
            "retrievedAtUtc": r.get("requestedAtUtc"), "httpStatus": r.get("httpStatus"),
            "contentType": r.get("contentType"), "byteLength": r.get("byteLength"),
            "sha256": r.get("sha256"), "rawArchiveMember": "raw/" + Path(r["rawArtifact"]).name,
            "pollingStationCount": v.get("dataRowCount"),
            "stationNumberRange": v.get("stationNumberRange"), "validationStatus": v.get("status"),
            "validationChecks": v.get("checks")
        })
    ledger = {
        "schemaVersion": 1,
        "title": "Official CEO Delhi 2024 Assembly Constituency to polling-station evidence archive",
        "authority": "Chief Electoral Officer, Government of NCT of Delhi; public index and same-host polling-station list.",
        "scope": "Delhi only; not national polling-station coverage and not canonical AC geometry acceptance.",
        "workflow": {
            "runId": RUN_ID, "sourceCommit": COMMIT_SHA,
            "workflowUrl": "https://github.com/kshetra-app/Kshetra/actions/runs/" + RUN_ID,
            "completedAtUtc": m.get("completedAtUtc"),
            "rawResponseZipSha256": None,
            "note": "The run ZIP artifact has its own hash in the workflow run metadata; this repository archive independently stores and verifies all raw HTML bodies."
        },
        "index": {
            "url": ix.get("requestedUrl"), "finalUrl": ix.get("finalUrl"),
            "retrievedAtUtc": ix.get("retrievedAtUtc"), "httpStatus": ix.get("httpStatus"),
            "byteLength": ix.get("byteLength"), "sha256": ix.get("sha256"),
            "distinctAcLinks": ix.get("distinctAssemblyConstituencyLinks"),
            "rawArchiveMember": "raw/" + ip.name
        },
        "form": {
            "url": FORM_URL, "rawArchiveMember": "raw/" + fp.name,
            "byteLength": aux.get("byteLength"), "sha256": aux.get("sha256"),
            "httpStatus": aux.get("httpStatus"),
            "requestMethod": m.get("formPostback", {}).get("postbackMethod"),
            "selectField": m.get("formPostback", {}).get("selectName"),
            "detailMethod": "Same-host ASP.NET POST using source-provided viewstate/eventvalidation; no access-control bypass."
        },
        "crosswalk": {
            "gzipPath": str(gzpath), "gzipByteLength": len(gb), "gzipSha256": sha(gb),
            "jsonByteLength": len(cb), "jsonSha256": sha(cb),
            "records": len(x["records"]), "uniqueAcStationPairs": len(set(pairs)),
            "acCount": 70, "jsonParse": "PASS", "rowSourceHashLinks": "PASS",
            "missingAcNumbers": [], "duplicatePairs": 0
        },
        "rawHtmlArchive": {
            "path": str(tarpath), "byteLength": len(tb), "sha256": sha(tb),
            "memberCount": len(rawpaths),
            "members": [{"name": "raw/" + p.name, "byteLength": p.stat().st_size, "sha256": sha(p.read_bytes())} for p in rawpaths]
        },
        "summary": {
            "status": PASS, "acCount": 70, "pagesDownloaded": 70,
            "pagesIndependentlyValidated": 70, "pageFailures": 0, "stationRecords": len(x["records"]),
            "stationPairsUnique": True,
            "perAcStationCounts": [{"acNo": r["acNo"], "acName": r["acName"], "count": r["pollingStationCount"]} for r in page_ledger]
        },
        "perACSourceProvenance": page_ledger,
        "limitations": [
            "This is only a Delhi jurisdictional source slice.",
            "No national polling station crosswalk or Assembly Constituency geometry acceptance is implied.",
            "Only public polling-station table fields were acquired; no elector-level records were fetched.",
            "The normalized crosswalk is derived from the exact archived raw HTML tables and each row points to the source page hash.",
            "Hashes identify this exact snapshot; the official service may change in later retrievals."
        ],
        "generatedAtUtc": datetime.now(timezone.utc).isoformat()
    }
    lb = write_json(DURABLE / "source_manifest.json", ledger)
    readback = json.loads(gzip.decompress(gzpath.read_bytes()))
    if sha(gzip.decompress(gzpath.read_bytes())) != sha(cb) or len(readback["records"]) != len(x["records"]):
        raise SystemExit("GZIP_CROSSWALK_READBACK_FAIL")
    with tarfile.open(tarpath, "r:gz") as tar:
        for p in rawpaths:
            member = tar.extractfile("raw/" + p.name)
            if member is None or member.read() != p.read_bytes():
                raise SystemExit("RAW_ARCHIVE_READBACK_FAIL:" + p.name)

    readme = [
        "# Official CEO Delhi 2024 polling-station evidence",
        "",
        "Disposition: validated Delhi-only evidence slice; not national acceptance.",
        "",
        "Workflow run: " + RUN_ID,
        "Source index: " + INDEX_URL,
        "Index bytes/SHA-256: " + str(ix.get("byteLength")) + " / " + str(ix.get("sha256")),
        "Coverage: 70/70 AC pages, 14,947 unique AC-station pairs.",
        "Normalized JSON bytes/SHA-256: " + str(len(cb)) + " / " + sha(cb),
        "Gzip crosswalk bytes/SHA-256: " + str(len(gb)) + " / " + sha(gb),
        "Lossless raw HTML archive bytes/SHA-256: " + str(len(tb)) + " / " + sha(tb),
        "Source manifest bytes/SHA-256: " + str(len(lb)) + " / " + sha(lb),
        "",
        "This package does not close national polling-station coverage, national canonical AC geometry, legal extent-to-polygon validation, Gazette-byte requirements, or India Post delivery-beat evidence.",
        "The file byte hashes are for this exact retrieval snapshot and should not be presented as hashes of the publisher's server-side originals beyond the recorded HTTP responses."
    ]
    (DURABLE / "README.md").write_text("\n".join(readme) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "DURABLE_EVIDENCE_PACKAGE_PREPARED_AND_REOPEN_VERIFIED",
        "runId": RUN_ID,
        "files": [
            {"path": str(gzpath), "byteLength": len(gb), "sha256": sha(gb)},
            {"path": str(tarpath), "byteLength": len(tb), "sha256": sha(tb)},
            {"path": str(DURABLE / "source_manifest.json"), "byteLength": len(lb), "sha256": sha(lb)},
            {"path": str(DURABLE / "README.md"), "byteLength": (DURABLE / "README.md").stat().st_size, "sha256": sha((DURABLE / "README.md").read_bytes())}
        ],
        "acCount": 70, "stationRecords": len(x["records"])
    }, indent=2))

if __name__ == "__main__":
    main()
