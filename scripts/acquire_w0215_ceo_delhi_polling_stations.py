#!/usr/bin/env python3
"""Read-only acquisition and structural audit of the official CEO Delhi polling-station index.

Only page URLs linked by the official index are followed. No CAPTCHA bypass, voter-level
personal data scraping, database access, or inferred station-to-AC mappings are performed.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse

from curl_cffi import requests

OUT = Path("stage_b_ceo_delhi_polling_stations")
RAW = OUT / "raw"
RAW.mkdir(parents=True, exist_ok=True)
INDEX_URL = "https://ceodelhinet.nic.in/ceodelhiweb/ListofPollingStation.aspx"
ALLOWED_HOSTS = {"ceodelhi.gov.in", "ceodelhinet.nic.in"}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

# Reuse one session so the observed ASP.NET form can be submitted with the source
# page's legitimate cookies and hidden view-state tokens.
SESSION = requests.Session(impersonate="chrome124")
SESSION.headers.update(HEADERS)

class PageLinkParser(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__()
        self.base_url = base_url
        self.links = []
        self._a = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag.lower() == "a" and a.get("href"):
            self._a = {"href": a["href"], "textParts": []}

    def handle_data(self, data):
        if self._a is not None and data and data.strip():
            self._a["textParts"].append(data.strip())

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._a is not None:
            raw_url = urljoin(self.base_url, self._a["href"])
            self._a["url"] = raw_url
            self._a["text"] = " ".join(self._a.pop("textParts"))
            self.links.append(self._a)
            self._a = None

class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tables = []
        self._table = None
        self._row = None
        self._cell = None
        self._cell_tag = None

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag == "table":
            if self._table is None:
                attrs = dict(attrs)
                self._table = {"id": attrs.get("id"), "class": attrs.get("class"), "rows": []}
        elif self._table is not None and tag == "tr":
            self._row = []
        elif self._row is not None and tag in ("td", "th"):
            self._cell = []
            self._cell_tag = tag

    def handle_data(self, data):
        if self._cell is not None and data and data.strip():
            self._cell.append(data.strip())

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ("td", "th") and self._cell is not None and self._row is not None:
            self._row.append({"tag": self._cell_tag, "text": " ".join(self._cell)})
            self._cell = None
            self._cell_tag = None
        elif tag == "tr" and self._row is not None and self._table is not None:
            if any(c["text"] for c in self._row):
                self._table["rows"].append(self._row)
            self._row = None
        elif tag == "table" and self._table is not None:
            self.tables.append(self._table)
            self._table = None

class FormOptionParser(HTMLParser):
    """Record non-sensitive form controls and select-option labels for official public indexes."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.forms = []
        self._form = None
        self._select = None
        self._option = None
    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        a = dict(attrs)
        if tag == "form":
            self._form = {"action": a.get("action"), "method": (a.get("method") or "get").lower(), "inputs": [], "selects": []}
            self.forms.append(self._form)
        elif self._form is not None and tag == "input":
            self._form["inputs"].append({"name": a.get("name"), "type": a.get("type"), "value": a.get("value"), "id": a.get("id")})
        elif self._form is not None and tag == "select":
            self._select = {"name": a.get("name"), "id": a.get("id"), "options": []}
            self._form["selects"].append(self._select)
        elif self._select is not None and tag == "option":
            self._option = {"value": a.get("value"), "textParts": []}
    def handle_data(self, data):
        if self._option is not None and data and data.strip():
            self._option["textParts"].append(data.strip())
    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == "option" and self._option is not None and self._select is not None:
            self._option["text"] = " ".join(self._option.pop("textParts"))
            self._select["options"].append(self._option)
            self._option = None
        elif tag == "select":
            self._select = None
        elif tag == "form":
            self._form = None

def validate_url(url: str, require_detail: bool = False) -> None:
    u = urlparse(url)
    if u.scheme != "https" or u.hostname not in ALLOWED_HOSTS:
        raise ValueError(f"UNAPPROVED_SOURCE_URL:{url}")
    if require_detail and u.path.rstrip("/").lower() != "/loksabhapollingstation-2024.aspx".lower():
        raise ValueError(f"UNEXPECTED_DETAIL_PATH:{url}")

def get_html(url: str) -> tuple[object, bytes]:
    validate_url(url)
    response = SESSION.get(url, headers=HEADERS, timeout=12, allow_redirects=True)
    validate_url(response.url)
    return response, response.content

manifest = {
    "schemaVersion": 1,
    "title": "Official CEO Delhi 2024 AC-to-polling-station index acquisition",
    "directive": "CTO Directive 154 — W021.5 Stage B only",
    "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
    "officialIndexUrl": INDEX_URL,
    "databaseAccess": "NONE",
    "scope": "Delhi jurisdiction only; no national completeness claim",
    "records": [],
}

# First retain and hash the exact index bytes; detail URLs are derived only from observed links.
try:
    response, raw = get_html(INDEX_URL)
    idx = {
        "sourceId": "CEO_DELHI_POLLING_STATION_INDEX",
        "requestedUrl": INDEX_URL,
        "finalUrl": response.url,
        "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
        "httpStatus": response.status_code,
        "contentType": response.headers.get("Content-Type"),
        "byteLength": len(raw),
        "sha256": sha(raw),
        "status": "DOWNLOADED_HASHED_HTML" if response.status_code == 200 and raw else "HTTP_FAILURE",
    }
    if response.status_code != 200 or not raw:
        manifest["index"] = idx
        manifest["overallStatus"] = "BLOCKED_INDEX_NOT_ACQUIRED"
        manifest["completedAtUtc"] = datetime.now(timezone.utc).isoformat()
        (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(manifest, indent=2))
        sys.exit(1)

    (RAW / "CEO_DELHI_POLLING_STATION_INDEX.html").write_bytes(raw)
    idx["rawArtifact"] = "raw/CEO_DELHI_POLLING_STATION_INDEX.html"
    manifest["index"] = idx
    parser = PageLinkParser(response.url)
    parser.feed(raw.decode(response.encoding or "utf-8", errors="replace"))
    detail_by_ac = {}
    rejected_links = []
    for link in parser.links:
        url = link["url"]
        u = urlparse(url)
        if u.scheme != "https" or u.hostname not in ALLOWED_HOSTS:
            continue
        if u.path.rstrip("/").lower() != "/loksabhapollingstation-2024.aspx":
            continue
        q = parse_qs(u.query)
        try:
            ac_no = int((q.get("ac_no") or [""])[0])
        except ValueError:
            rejected_links.append({"href": url, "reason": "MISSING_OR_INVALID_AC_NUMBER"})
            continue
        if not 1 <= ac_no <= 70:
            rejected_links.append({"href": url, "reason": "AC_NUMBER_OUT_OF_RANGE"})
            continue
        ac_name = (q.get("Ac_Name") or [""])[0].strip()
        # retain exact link text and params; reject duplicate ACs with differing URLs below.
        detail_by_ac.setdefault(ac_no, []).append({
            "url": url,
            "acName": ac_name,
            "indexLinkText": link.get("text", ""),
        })

    selected = []
    conflicts = []
    for ac_no, entries in sorted(detail_by_ac.items()):
        unique = {x["url"]: x for x in entries}
        if len(unique) != 1:
            conflicts.append({"acNo": ac_no, "urls": sorted(unique)})
        else:
            selected.append({"acNo": ac_no, **next(iter(unique.values()))})

    manifest["index"]["observedLinkCount"] = len(parser.links)
    # Follow the exact same-host relative polling-station list link observed in the index.
    # It is a discovered URL, not a guessed endpoint.
    psl_links = []
    for link in parser.links:
        u = urlparse(link["url"])
        if u.scheme == "https" and u.hostname in ALLOWED_HOSTS and u.path.rstrip("/").lower() == "/ceodelhiweb/psl.aspx":
            psl_links.append(link)
    manifest["auxiliaryPages"] = []
    psl_form_state = None
    for i, link in enumerate({x["url"]: x for x in psl_links}.values(), 1):
        aux = {"sourceId": "CEO_DELHI_PSL_RELATIVE_LINK", "requestedUrl": link["url"], "indexLinkText": link.get("text", ""), "retrievedAtUtc": datetime.now(timezone.utc).isoformat()}
        try:
            aux_response, aux_raw = get_html(link["url"])
            aux.update({"finalUrl": aux_response.url, "httpStatus": aux_response.status_code, "contentType": aux_response.headers.get("Content-Type"), "byteLength": len(aux_raw), "sha256": sha(aux_raw) if aux_raw else None})
            if aux_response.status_code == 200 and aux_raw:
                filename = f"CEO_DELHI_PSL_{i}.html"
                (RAW / filename).write_bytes(aux_raw)
                aux["status"] = "DOWNLOADED_HASHED_HTML"
                aux["rawArtifact"] = f"raw/{filename}"
                page_parser = PageLinkParser(aux_response.url)
                page_parser.feed(aux_raw.decode(aux_response.encoding or "utf-8", errors="replace"))
                aux["observedLinks"] = page_parser.links
                form_parser = FormOptionParser()
                form_parser.feed(aux_raw.decode(aux_response.encoding or "utf-8", errors="replace"))
                aux["forms"] = form_parser.forms
                if urlparse(aux_response.url).path.rstrip("/").lower() == "/ceodelhiweb/psl.aspx":
                    psl_form_state = {"url": aux_response.url, "forms": form_parser.forms}
                table_parser = TableParser()
                table_parser.feed(aux_raw.decode(aux_response.encoding or "utf-8", errors="replace"))
                aux["tables"] = [{"rowCount": len(t["rows"]), "sampleRows": [[cell["text"] for cell in row] for row in t["rows"][:4]]} for t in table_parser.tables]
            else:
                aux["status"] = "HTTP_FAILURE"
        except Exception as exc:
            aux.update({"status": "FETCH_FAILED", "error": f"{type(exc).__name__}: {exc}"})
        manifest["auxiliaryPages"].append(aux)
    manifest["index"]["distinctAssemblyConstituencyLinks"] = len(selected)
    manifest["index"]["rejectedRelevantLinks"] = rejected_links
    manifest["index"]["duplicateUrlConflicts"] = conflicts
    manifest["index"]["acNumbersObserved"] = [x["acNo"] for x in selected]
    expected = set(range(1, 71))
    manifest["index"]["missingACNumbers"] = sorted(expected - {x["acNo"] for x in selected})
    manifest["index"]["unexpectedACNumbers"] = sorted({x["acNo"] for x in selected} - expected)
except Exception as exc:
    manifest["index"] = {"status": "FETCH_FAILED", "error": f"{type(exc).__name__}: {exc}"}
    manifest["overallStatus"] = "BLOCKED_INDEX_NOT_ACQUIRED"
    manifest["completedAtUtc"] = datetime.now(timezone.utc).isoformat()
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    sys.exit(1)

def normalized_name(value: str) -> str:
    return " ".join((value or "").strip().upper().split())

def parse_tables(raw: bytes, encoding: str = "utf-8") -> list[dict]:
    parser = TableParser()
    parser.feed(raw.decode(encoding or "utf-8", errors="replace"))
    output = []
    for i, table in enumerate(parser.tables, 1):
        rows = table["rows"]
        header = [cell["text"] for cell in rows[0]] if rows and all(cell.get("tag") == "th" for cell in rows[0]) else []
        data_rows = rows[1:] if header else rows
        output.append({
            "tableIndex": i,
            "tableId": table.get("id"),
            "tableClass": table.get("class"),
            "header": header,
            "rowCount": len(rows),
            "dataRowCount": len(data_rows),
            "sampleRows": [[cell["text"] for cell in row] for row in data_rows[:5]],
        })
    return output

def parse_form(raw: bytes, encoding: str = "utf-8") -> list[dict]:
    parser = FormOptionParser()
    parser.feed(raw.decode(encoding or "utf-8", errors="replace"))
    return parser.forms

def hidden_payload(form: dict, select_name: str, ac_no: int) -> dict[str, str]:
    fields = {}
    for item in form.get("inputs", []):
        if item.get("name") and (item.get("type") or "").lower() == "hidden":
            fields[item["name"]] = item.get("value") or ""
    required = {"__VIEWSTATE", "__EVENTVALIDATION", "__EVENTTARGET", "__EVENTARGUMENT"}
    missing = sorted(required - set(fields))
    if missing:
        raise ValueError("ASP_NET_FORM_MISSING_STATE_FIELDS:" + ",".join(missing))
    fields["__EVENTTARGET"] = select_name
    fields["__EVENTARGUMENT"] = ""
    fields[select_name] = str(ac_no)
    return fields

def acquire_one_ac_postback(item: dict, form_state: dict) -> tuple[dict, dict | None]:
    ac_no = item["acNo"]
    record = {
        "sourceId": f"CEO_DELHI_PSL_AC_{ac_no:02d}",
        "acNo": ac_no,
        "acNameFromIndex": item["acName"],
        "indexLinkText": item["indexLinkText"],
        "formUrl": form_state["url"],
        "requestMethod": "POST",
        "requestedAtUtc": datetime.now(timezone.utc).isoformat(),
    }
    try:
        forms = form_state.get("forms") or []
        form = next((x for x in forms if x.get("method") == "post" and x.get("selects")), None)
        if form is None:
            raise ValueError("OFFICIAL_POSTBACK_FORM_OR_SELECT_NOT_FOUND")
        select = next((x for x in form["selects"] if "DropDownListDistNO" in (x.get("name") or "") or "Select AC Name" in (x.get("id") or "")), None)
        if select is None:
            raise ValueError("ASSEMBLY_CONSTITUENCY_SELECT_NOT_FOUND")
        options = {str(option.get("value")): option.get("text", "") for option in select["options"]}
        option_text = options.get(str(ac_no))
        if not option_text:
            raise ValueError(f"AC_OPTION_NOT_PRESENT_IN_OFFICIAL_FORM:{ac_no}")
        selected_label = re.sub(r"^\s*\d+\s*[-–:]\s*", "", option_text).strip()
        if normalized_name(selected_label) != normalized_name(item["acName"]):
            raise ValueError(f"INDEX_DROPDOWN_AC_NAME_MISMATCH:{item['acName']}!={selected_label}")
        post_url = urljoin(form_state["url"], form.get("action") or form_state["url"])
        validate_url(post_url)
        payload = hidden_payload(form, select["name"], ac_no)
        host = urlparse(form_state["url"])
        response = SESSION.post(
            post_url,
            data=payload,
            headers={
                **HEADERS,
                "Origin": f"{host.scheme}://{host.netloc}",
                "Referer": form_state["url"],
            },
            timeout=12,
            allow_redirects=True,
        )
        validate_url(response.url)
        raw = response.content
        record.update({
            "requestedUrl": post_url,
            "finalUrl": response.url,
            "httpStatus": response.status_code,
            "contentType": response.headers.get("Content-Type"),
            "byteLength": len(raw),
            "sha256": sha(raw) if raw else None,
            "selectedDropdownValue": str(ac_no),
            "selectedDropdownLabel": option_text,
            "selectedDropdownNameMatchesIndex": True,
        })
        content_type = (response.headers.get("Content-Type") or "").lower()
        if response.status_code == 200 and raw and ("html" in content_type or b"<html" in raw[:500].lower()):
            filename = f"CEO_DELHI_POLLING_STATIONS_AC_{ac_no:02d}_POSTBACK.html"
            (RAW / filename).write_bytes(raw)
            record["rawArtifact"] = f"raw/{filename}"
            record["status"] = "DOWNLOADED_HASHED_OFFICIAL_POSTBACK_HTML"
            record["tables"] = parse_tables(raw, response.encoding or "utf-8")
            record["tableCount"] = len(record["tables"])
            record["tableDataRowCount"] = sum(t["dataRowCount"] for t in record["tables"])
            # A selected AC returning its own form state is the minimum proof that the
            # controlled same-host ASP.NET postback worked. Keep new state for next AC.
            new_forms = parse_form(raw, response.encoding or "utf-8")
            next_state = {"url": response.url, "forms": new_forms} if new_forms else None
            record["updatedFormStatePresent"] = bool(next_state)
            if not next_state:
                record["stateWarning"] = "NO_FORM_STATE_IN_RESPONSE; subsequent AC submissions cannot safely reuse old view-state"
            return record, next_state
        record["status"] = "HTTP_FAILURE_NO_HTML_SOURCE_ACCEPTED"
    except Exception as exc:
        record["status"] = "FETCH_FAILED"
        record["error"] = f"{type(exc).__name__}: {exc}"
    return record, None

# The public CEO index exposes an ASP.NET dropdown whose official on-change postback
# populates the selected AC's polling-station listing on the same host. Use its current
# hidden view-state/event-validation fields and exact observed select field; do not call
# the separate ceodelhi.gov.in detail URLs that timed out on all 70 known AC links.
manifest["records"] = []
if not psl_form_state:
    manifest["formPostback"] = {"status": "BLOCKED_NO_OBSERVED_PSL_FORM"}
    manifest["summary"] = {"distinctACLinksObserved": len(selected), "distinctACPagesAttempted": 0, "pagesDownloadedHashed": 0, "pagesFailed": len(selected), "uniqueSuccessfulACNumbers": [], "missingSuccessfulACNumbers": list(range(1, 71))}
else:
    psl_form = next((x for x in psl_form_state.get("forms", []) if x.get("method") == "post" and x.get("selects")), None)
    select = next((x for x in (psl_form or {}).get("selects", []) if "DropDownListDistNO" in (x.get("name") or "")), None)
    option_map = {str(x.get("value")): x.get("text", "") for x in (select or {}).get("options", [])}
    observed_dropdown = []
    for ac_no in range(1, 71):
        label = option_map.get(str(ac_no))
        observed_dropdown.append({"acNo": ac_no, "label": label, "matchesIndex": normalized_name(re.sub(r"^\s*\d+\s*[-–:]\s*", "", label or "")) == normalized_name(next((x["acName"] for x in selected if x["acNo"] == ac_no), ""))})
    manifest["formPostback"] = {
        "status": "OFFICIAL_FORM_DISCOVERED",
        "formUrl": psl_form_state["url"],
        "postbackMethod": (psl_form or {}).get("method"),
        "selectName": (select or {}).get("name"),
        "dropdownOptionCount": len(option_map),
        "observedDropdownCoverage": observed_dropdown,
        "initialStateFieldsPresent": sorted([x["name"] for x in (psl_form or {}).get("inputs", []) if x.get("type") == "hidden" and x.get("name")]),
    }
    current_state = psl_form_state
    stop_after = 1 if "--pilot-one-ac" in sys.argv else 70
    for item in selected[:stop_after]:
        record, next_state = acquire_one_ac_postback(item, current_state)
        manifest["records"].append(record)
        if next_state is not None:
            current_state = next_state
        else:
            manifest["formPostback"]["status"] = "PARTIAL_FORM_POSTBACK_FAILURE"
            # If this page did not return updated form state, the next source cannot be
            # submitted reliably with a stale ASP.NET __VIEWSTATE token. Stop, retain gap.
            manifest["formPostback"]["stoppedAtAC"] = item["acNo"]
            break

manifest["records"].sort(key=lambda r: r["acNo"])
success = [r for r in manifest["records"] if r.get("status") == "DOWNLOADED_HASHED_OFFICIAL_POSTBACK_HTML"]
manifest["summary"] = {
    "distinctACLinksObserved": len(selected),
    "distinctACPagesAttempted": len(manifest["records"]),
    "pagesDownloadedHashed": len(success),
    "pagesFailed": len(manifest["records"]) - len(success),
    "uniqueSuccessfulACNumbers": sorted({r["acNo"] for r in success}),
    "missingSuccessfulACNumbers": sorted(set(range(1, 71)) - {r["acNo"] for r in success}),
    "postbackRowsObserved": sum(r.get("tableDataRowCount", 0) for r in success),
    "recordsWithUpdatedFormState": sum(1 for r in success if r.get("updatedFormStatePresent")),
}
manifest["overallStatus"] = (
    "PASS_70_OF_70_OFFICIAL_AC_POSTBACKS_ACQUIRED"
    if len(success) == 70 and len(manifest["index"].get("acNumbersObserved", [])) == 70
        and manifest["formPostback"].get("status") == "OFFICIAL_FORM_DISCOVERED"
        and manifest["summary"]["recordsWithUpdatedFormState"] == 70
    else "PARTIAL_OFFICIAL_DELHI_POLLING_STATION_ACQUISITION"
)
manifest["completedAtUtc"] = datetime.now(timezone.utc).isoformat()
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps(manifest, indent=2, ensure_ascii=False))
if manifest["overallStatus"] != "PASS_70_OF_70_OFFICIAL_AC_POSTBACKS_ACQUIRED":
    sys.exit(1)
