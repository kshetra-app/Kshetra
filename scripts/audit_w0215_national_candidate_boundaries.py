#!/usr/bin/env python3
"""Pinned, read-only audit of a public national Assembly Constituency GeoJSON candidate.

The upstream repository says this data is not official. It is preserved and screened
for gaps only; it is never promoted to canonical legal geometry.
"""
from __future__ import annotations
import argparse, gzip, hashlib, json, re, subprocess
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from pyproj import Transformer
from shapely.geometry import Polygon, MultiPolygon, shape
from shapely.ops import transform
from shapely.strtree import STRtree
from shapely.validation import explain_validity, make_valid

REPO_URL = "https://github.com/Marma-Fintech-Organization/india-electoral-boundaries.git"
PINNED = "3e4e9f347b260040278c36f563fb2efa28e2a476"
TGRAC_URL = "https://tgrac.telangana.gov.in/arcgis/rest/services/Master_Administrative_Folder/Master_Administrative_Boundary/MapServer/0/query?where=1%3D1&outFields=%2A&returnGeometry=true&outSR=4326&f=json"
TGRAC_HOST = "tgrac.telangana.gov.in"
AREA_TRANSFORM = Transformer.from_crs("EPSG:4326","EPSG:6933",always_xy=True).transform
TS_TRANSFORM = Transformer.from_crs("EPSG:4326","EPSG:32644",always_xy=True).transform
EXPECTED_FILES = 4129

def sha(b): return hashlib.sha256(b).hexdigest()
def utc(): return datetime.now(timezone.utc).isoformat()
def git(root,*args):
    return subprocess.run(["git","-C",str(root),*args],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE).stdout
def norm(s):
    s=str(s or "").strip().casefold()
    s=re.sub(r"\s+assembly\s*$","",s)
    s=re.sub(r"\s*\(\s*(sc|st)\s*\)\s*$",r" \1",s)
    return " ".join(re.sub(r"[^a-z0-9]+"," ",s).split())
def ring_area(r):
    return sum((a[0]*b[1]-b[0]*a[1]) for a,b in zip(r,r[1:]))/2.0
def esri_to_shape(g):
    rings=g.get("rings") or []
    exteriors=[]; holes=[]
    for ring in rings:
        if len(ring)<4: continue
        poly=Polygon(ring)
        if ring_area(ring)<0: exteriors.append((poly,ring))
        else: holes.append((poly,ring))
    if not exteriors and rings:
        valid=[(Polygon(r),r) for r in rings if len(r)>=4]
        if valid:
            largest=max(valid,key=lambda x:abs(x[0].area))
            exteriors=[largest]
            holes=[x for x in valid if x is not largest]
    assigned=[[] for _ in exteriors]
    for hp,hr in holes:
        point=hp.representative_point()
        parents=[(i,abs(ep.area)) for i,(ep,er) in enumerate(exteriors) if ep.covers(point)]
        if parents: assigned[min(parents,key=lambda x:x[1])[0]].append(hr)
    polys=[Polygon(er,hs) for (_,er),hs in zip(exteriors,assigned)]
    if not polys: return None
    return polys[0] if len(polys)==1 else MultiPolygon(polys)

def fetch_tgrac(out):
    rec={"url":TGRAC_URL,"publisher":"TGRAC official public ArcGIS REST service","retrievedAtUtc":utc(),"status":"NOT_ATTEMPTED","role":"State-GIS candidate only; effective legal date/version/licence not established"}
    try:
        req=Request(TGRAC_URL,headers={"User-Agent":"PANIN-W021.5-ReadOnly-Evidence-Audit/1.0","Accept":"application/json"})
        with urlopen(req,timeout=40) as response:
            final=response.geturl()
            if urlparse(final).scheme!="https" or urlparse(final).hostname!=TGRAC_HOST:
                raise ValueError("unexpected TGRAC redirect host/scheme")
            raw=response.read()
            rec.update({"httpStatus":response.status,"finalUrl":final,"contentType":response.headers.get("Content-Type"),"etag":response.headers.get("ETag"),"lastModified":response.headers.get("Last-Modified"),"byteLength":len(raw),"sha256":sha(raw)})
            data=json.loads(raw)
            if response.status!=200 or "features" not in data:
                rec.update({"status":"HTTP_200_NON_FEATURE_RESPONSE","topLevelKeys":list(data)[:20]})
                return rec,None
            (out/"tgrac_master_ac_response.json").write_bytes(raw)
            rec.update({"status":"DOWNLOADED_HASHED_OFFICIAL_GIS_CANDIDATE","rawArtifact":"tgrac_master_ac_response.json","featureCount":len(data["features"]),"fieldNames":sorted({k for f in data["features"] for k in (f.get("attributes") or {})})})
            return rec,data
    except HTTPError as e:
        b=e.read()
        rec.update({"status":"HTTP_FAILURE","httpStatus":e.code,"error":str(e),"errorBodyBytes":len(b),"errorBodySha256":sha(b),"note":"Error-body hash, not source-geometry hash."})
    except Exception as e:
        rec.update({"status":"FETCH_FAILED","error":f"{type(e).__name__}: {e}"})
    return rec,None

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--source",required=True)
    ap.add_argument("--out",required=True)
    a=ap.parse_args()
    root=Path(a.source).resolve(); out=Path(a.out).resolve(); out.mkdir(parents=True,exist_ok=True)
    commit=git(root,"rev-parse","HEAD").decode().strip()
    remote=git(root,"remote","get-url","origin").decode().strip().rstrip("/")
    if commit!=PINNED: raise SystemExit(f"SOURCE_COMMIT_NOT_PINNED:{commit}")
    if remote!=REPO_URL.rstrip("/"): raise SystemExit(f"SOURCE_REMOTE_MISMATCH:{remote}")
    tree=git(root,"ls-tree","-r","-z",commit)
    blobsha={}
    for ent in tree.split(b"\0"):
        if not ent: continue
        try:
            meta,path=ent.split(b"\t",1); parts=meta.decode().split()
            if len(parts)==3: blobsha[path.decode("utf-8","replace")]=parts[2]
        except Exception: pass
    documentation={}
    for name in ["README.md","SOURCES.md","LICENSE","data/meta.json","data/known-issues.json"]:
        p=root/name
        if p.is_file():
            b=p.read_bytes()
            documentation[name]={"byteLength":len(b),"sha256":sha(b),"gitBlobSha":blobsha.get(name)}
    if not (root/"README.md").is_file() or not (root/"SOURCES.md").is_file():
        raise SystemExit("UPSTREAM_PROVENANCE_DOCUMENTS_MISSING")
    known={}
    if (root/"data/known-issues.json").exists():
        try: known=json.loads((root/"data/known-issues.json").read_text(encoding="utf-8"))
        except Exception: known={}
    known_issues={x.get("file"):x for x in known.get("issues",[]) if isinstance(x,dict)}

    # Lossless, pinned git tree snapshot with the upstream licence/source documents included.
    tar_bytes=git(root,"archive","--format=tar","--prefix=india-electoral-boundaries/",commit)
    snapshot=gzip.compress(tar_bytes,compresslevel=9,mtime=0)
    snapshot_path=out/"india_electoral_boundaries_source_snapshot.tar.gz"
    snapshot_path.write_bytes(snapshot)

    files=sorted((root/"data/states").glob("*/ac/*.geojson"))
    if len(files)!=EXPECTED_FILES:
        raise SystemExit(f"EXPECTED_{EXPECTED_FILES}_GEOJSON_FILES_GOT_{len(files)}")
    inventory=[]; errors=[]; raw_hashes=defaultdict(list); geometry_hashes=defaultdict(list)
    by_state=defaultdict(list); state_types=defaultdict(Counter); state_sources=defaultdict(Counter)
    quality=Counter(); global_types=Counter(); identity_mismatches=[]; out_of_bounds=[]
    coord_vertices=0; source_unresolved=0; feature_names=defaultdict(list)
    for p in files:
        rel=p.relative_to(root).as_posix(); b=p.read_bytes(); state= p.parts[-3]
        r={"path":rel,"byteLength":len(b),"sha256":sha(b),"gitBlobSha":blobsha.get(rel),"stateCodeFromPath":state}
        raw_hashes[r["sha256"]].append(rel)
        try:
            obj=json.loads(b); props=obj.get("properties") or {}; geom_obj=obj.get("geometry")
            no=int(p.stem); gtype=(geom_obj or {}).get("type")
            r.update({"featureId":obj.get("id"),"featureType":obj.get("type"),"filenameACNumber":no,
              "stateCode":props.get("stateCode"),"stateName":props.get("stateName"),"acNo":props.get("acNo"),
              "acName":props.get("acName"),"seatType":props.get("seatType"),"districtName":props.get("districtName"),
              "pcNo":props.get("pcNo"),"pcName":props.get("pcName"),"quality":props.get("quality"),
              "sources":props.get("sources"),"geometryType":gtype,"knownIssue":known_issues.get(rel)})
            quality[str(props.get("quality"))]+=1
            for s in props.get("sources") or []: state_sources[state][str(s)]+=1
            if not props.get("sources") or all(str(s).strip().upper() in ("TBD","UNKNOWN","UNVERIFIED","") for s in (props.get("sources") or [])):
                r["sourceProvenanceStatus"]="UNRESOLVED_OR_TBD"; source_unresolved+=1
            else:r["sourceProvenanceStatus"]="NAMED_SOURCE_REFERENCES"
            if obj.get("type")!="Feature": errors.append({"path":rel,"error":"NOT_GEOJSON_FEATURE"})
            if str(props.get("stateCode") or "").lower()!=state: identity_mismatches.append({"path":rel,"error":"STATE_CODE_PATH_MISMATCH"})
            if props.get("acNo")!=no: identity_mismatches.append({"path":rel,"error":"AC_NUMBER_FILENAME_MISMATCH","acNo":props.get("acNo")})
            if obj.get("id")!=f"{str(props.get('stateCode') or '').upper()}-AC-{no}": identity_mismatches.append({"path":rel,"error":"FEATURE_ID_PATTERN_MISMATCH","featureId":obj.get("id")})
            feature_names[state].append(str(props.get("acName") or ""))
            if str(props.get("seatType") or "").upper() in ("LOK_SABHA","PARLIAMENTARY","PC"):
                errors.append({"path":rel,"error":"ASSEMBLY_FEATURE_MARKED_PARLIAMENTARY","seatType":props.get("seatType")})
            if not geom_obj:
                r.update({"geometryValid":False,"geometryValidityReason":"MISSING_GEOMETRY","bounds":None})
                errors.append({"path":rel,"error":"MISSING_GEOMETRY"})
            else:
                g=shape(geom_obj); valid=bool(g.is_valid and not g.is_empty)
                global_types[g.geom_type]+=1; state_types[state][g.geom_type]+=1
                r.update({"geometryValid":valid,"geometryValidityReason":None if g.is_valid else explain_validity(g),"bounds":list(g.bounds) if not g.is_empty else None,"isEmpty":g.is_empty})
                if g.geom_type not in ("Polygon","MultiPolygon"): errors.append({"path":rel,"error":"UNEXPECTED_GEOMETRY_TYPE","geometryType":g.geom_type})
                if g.is_empty: errors.append({"path":rel,"error":"EMPTY_GEOMETRY"})
                if not g.is_valid: errors.append({"path":rel,"error":"INVALID_GEOMETRY","reason":explain_validity(g),"bounds":list(g.bounds) if not g.is_empty else None})
                if not g.is_empty:
                    x0,y0,x1,y1=g.bounds
                    if x0 < -180 or x1 > 180 or y0 < -90 or y1 > 90: out_of_bounds.append({"path":rel,"bounds":list(g.bounds)})
                r["coordinateVertexCount"]=sum(len(ring.coords) for poly in ([g] if g.geom_type=="Polygon" else list(g.geoms) if g.geom_type=="MultiPolygon" else []) for ring in ([poly.exterior]+list(poly.interiors)))
                coord_vertices+=r["coordinateVertexCount"]
                if valid and g.geom_type in ("Polygon","MultiPolygon"):
                    gh=sha(g.normalize().wkb); geometry_hashes[gh].append(rel)
                    by_state[state].append((rel,g,transform(AREA_TRANSFORM,g)))
        except Exception as e:
            r.update({"parseError":f"{type(e).__name__}: {e}"})
            errors.append({"path":rel,"error":"PARSE_ERROR","detail":str(e)[:300]})
        inventory.append(r)

    overlaps=[]; overlap_summary={}; overlap_total=0
    for state,items in sorted(by_state.items()):
        projected=[z[2] for z in items]; total_pairs=0; total_overlap=0
        if len(projected)>1:
            tree=STRtree(projected)
            for i,g in enumerate(projected):
                for j0 in tree.query(g):
                    j=int(j0)
                    if j<=i:continue
                    total_pairs+=1
                    try: area=float(g.intersection(projected[j]).area)
                    except Exception as e:
                        errors.append({"stateCode":state,"error":"INTERSECTION_FAILED","files":[items[i][0],items[j][0]],"detail":str(e)[:250]});continue
                    if area>1.0:
                        total_overlap+=1; overlap_total+=1
                        if len(overlaps)<2000:overlaps.append({"stateCode":state,"fileA":items[i][0],"fileB":items[j][0],"overlapAreaM2EPSG6933":area})
        overlap_summary[state]={"validPolygons":len(items),"bboxPairsChecked":total_pairs,"overlapPairsOver1m2":total_overlap}

    dup_raw=[{"sha256":k,"paths":v} for k,v in raw_hashes.items() if len(v)>1]
    dup_geom=[{"normalizedGeometrySha256":k,"paths":v} for k,v in geometry_hashes.items() if len(v)>1]
    state_summaries=[]
    for state in sorted({p.parts[-3] for p in files}):
        rows=[r for r in inventory if r["stateCodeFromPath"]==state]
        names=Counter(norm(x) for x in feature_names[state])
        state_summaries.append({
          "stateCode":state,"featureCount":len(rows),"geometryTypes":dict(state_types[state]),
          "invalidGeometries":sum(1 for x in rows if x.get("geometryValid") is False and x.get("geometryValidityReason")),
          "unresolvedSourceCount":sum(1 for x in rows if x.get("sourceProvenanceStatus")=="UNRESOLVED_OR_TBD"),
          "qualityLabels":dict(Counter(str(x.get("quality")) for x in rows)),
          "duplicateNormalizedNames":[n for n,cnt in names.items() if n and cnt>1],
          "overlapScreen":overlap_summary.get(state,{"validPolygons":0,"bboxPairsChecked":0,"overlapPairsOver1m2":None})
        })

    # Fetch a current official-state GIS candidate separately; it is only a comparator.
    tgrac_rec={"status":"NOT_ATTEMPTED"}; tgrac=None
    try:
        req=Request(TGRAC_URL,headers={"User-Agent":"PANIN-W021.5-ReadOnly-Evidence-Audit/1.0","Accept":"application/json"})
        with urlopen(req,timeout=40) as resp:
            final=resp.geturl()
            if urlparse(final).scheme!="https" or urlparse(final).hostname!=TGRAC_HOST: raise ValueError("TGRAC redirect host/scheme mismatch")
            raw=resp.read(); tgrac=json.loads(raw)
            tgrac_path=out/"tgrac_master_ac_response.json"; tgrac_path.write_bytes(raw)
            tgrac_rec={"status":"DOWNLOADED_HASHED_OFFICIAL_GIS_CANDIDATE","url":TGRAC_URL,"finalUrl":final,
              "retrievedAtUtc":utc(),"httpStatus":resp.status,"contentType":resp.headers.get("Content-Type"),
              "etag":resp.headers.get("ETag"),"lastModified":resp.headers.get("Last-Modified"),
              "byteLength":len(raw),"sha256":sha(raw),"rawArtifact":tgrac_path.name,"featureCount":len(tgrac.get("features",[])),
              "fieldNames":sorted({k for f in tgrac.get("features",[]) for k in (f.get("attributes") or {})})}
    except HTTPError as e:
        body=e.read();tgrac_rec={"status":"HTTP_FAILURE","httpStatus":e.code,"errorBodyBytes":len(body),"errorBodySha256":sha(body),"note":"Error-body hash, not geometry hash."}
    except Exception as e: tgrac_rec={"status":"FETCH_FAILED","error":f"{type(e).__name__}: {e}","url":TGRAC_URL}

    tgrac_comparison={"source":tgrac_rec,"status":"NOT_AVAILABLE","matchedByName":0,"comparisons":[]}
    if tgrac is not None and "features" in tgrac:
        tfeatures=tgrac.get("features") or []
        fields=tgrac_rec.get("fieldNames") or []
        namefield=next((x for x in ["Assembly_Name","Assembly","ASSEMBLY_N","Ass_Name","AssemblyName","AC_NAME","ACName","Name","NAME"] if x in fields),None)
        tby={}
        if namefield:
            for f in tfeatures:
                at=f.get("attributes") or {}
                if at.get(namefield) is not None:tby[norm(at[namefield])]={"f":f,"name":at[namefield],"attributes":at}
        cby={}
        for row in inventory:
            if row.get("stateCodeFromPath")=="ts" and row.get("acName"):
                try:
                    feat=json.loads((root/row["path"]).read_text(encoding="utf-8"))
                    cby[norm(feat["properties"]["acName"])]={"feat":feat,"row":row}
                except Exception:pass
        comps=[]; unm_c=[]; unm_t=[]
        for key,cr in cby.items():
            tr=tby.get(key)
            if not tr:unm_c.append({"normalizedName":key,"path":cr["row"]["path"],"name":cr["feat"]["properties"].get("acName")});continue
            try:
                cg=shape(cr["feat"]["geometry"]);tg=esri_to_shape(tr["f"].get("geometry") or {})
                if tg is None:raise ValueError("ESRI ring conversion failed")
                cv,tv=cg.is_valid,tg.is_valid
                cc=cg if cv else make_valid(cg);tt=tg if tv else make_valid(tg)
                cp=transform(TS_TRANSFORM,cc);tp=transform(TS_TRANSFORM,tt)
                sd=float(cp.symmetric_difference(tp).area);union=float(cp.union(tp).area)
                comps.append({"candidateName":cr["feat"]["properties"].get("acName"),"candidateACNumber":cr["feat"]["properties"].get("acNo"),"candidatePath":cr["row"]["path"],"candidateFileSha256":cr["row"]["sha256"],"tgracName":tr["name"],"tgracAttributes":{k:v for k,v in tr["attributes"].items() if isinstance(v,(str,int,float,bool)) or v is None},"candidateGeometryValid":cv,"tgracGeometryValid":tv,"inMemoryRepairForComparisonOnly":not(cv and tv),"symmetricDifferenceAreaM2UTM44N":sd,"relativeSymmetricDifference":sd/union if union else None,"hausdorffDistanceMUTM44N":float(cp.hausdorff_distance(tp))})
            except Exception as e: comps.append({"candidateName":cr["feat"]["properties"].get("acName"),"candidatePath":cr["row"]["path"],"tgracName":tr["name"],"error":f"{type(e).__name__}: {e}"})
        for key,tr in tby.items():
            if key not in cby:unm_t.append({"normalizedName":key,"name":tr["name"]})
        tgrac_comparison={"source":tgrac_rec,"status":"COMPARISON_COMPLETED","nameField":namefield,"candidateFeatureCount":len(cby),"tgracFeatureCount":len(tby),"matchedByName":sum(1 for x in comps if "symmetricDifferenceAreaM2UTM44N" in x),"unmatchedCandidate":unm_c,"unmatchedTgrac":unm_t,"comparisons":comps,"thresholdCounts":{"symdiffOver1m2":sum(x.get("symmetricDifferenceAreaM2UTM44N",0)>1 for x in comps),"symdiffOver10kM2":sum(x.get("symmetricDifferenceAreaM2UTM44N",0)>10000 for x in comps),"symdiffOver100kM2":sum(x.get("symmetricDifferenceAreaM2UTM44N",0)>100000 for x in comps),"hausdorffOver100m":sum(x.get("hausdorffDistanceMUTM44N",0)>100 for x in comps)},"limitations":["Name normalization is a comparison key, not statutory identity proof.","TGRAC geometry itself has an invalid Dornakal feature and no verified effective date/version/licence.","Any make_valid operation is in-memory only for comparison; raw source geometries are retained unchanged."]}

    upstream_readme=(root/"README.md").read_bytes()
    sources_md=(root/"SOURCES.md").read_bytes()
    license_b=(root/"LICENSE").read_bytes() if (root/"LICENSE").exists() else b""
    quality_counts=Counter(str(r.get("quality")) for r in inventory)
    source_summary={
      "repository":REPO_URL,"pinnedCommit":commit,"gitTreeSha":git(root,"rev-parse",f"{commit}^{{tree}}").decode().strip(),
      "githubLicenseMetadata":"Other / SPDX NOASSERTION (GitHub API)", "upstreamLicenseClaim":"CC BY-SA 4.0 for data/documentation and MIT for code per upstream materials; verify individual feature-source rights.",
      "sourceLicenseLimitations":["Upstream expressly says data is not official and is not 100% accurate.","SOURCES.md identifies sources as TBD for some features pending source confirmation; provenance/licence at feature level remains incomplete.","Repository API license metadata is NOASSERTION despite its own licence statements; legal reuse/redistribution requires review."],
      "upstreamDocs":{n:{"bytes":(root/n).stat().st_size,"sha256":sha((root/n).read_bytes()),"gitBlobSha":blobsha.get(n)} for n in ["README.md","SOURCES.md","LICENSE","data/meta.json","data/known-issues.json"] if (root/n).is_file()},
      "snapshot":{"path":"india_electoral_boundaries_source_snapshot.tar.gz","bytes":len(snapshot),"sha256":sha(snapshot),"uncompressedGitArchiveBytes":len(tar_bytes),"format":"gzip-compressed git archive at pinned upstream commit, including upstream source/notice files"},
      "featureFileCount":len(files),"stateCodeCount":len({p.parts[-3] for p in files}),"stateFeatureCounts":dict(sorted(Counter(p.parts[-3] for p in files).items()),
      "distinctRawFileHashes":len(raw_hashes),"duplicateRawFileGroups":[{"sha256":k,"paths":v} for k,v in raw_hashes.items() if len(v)>1],
      "duplicateNormalizedGeometryGroups":[{"geometrySha256":k,"paths":v} for k,v in geometry_hashes.items() if len(v)>1],
      "coordinateVertexCount":coord_vertices,"geometryTypes":dict(global_types),"qualityLabels":dict(quality_counts),
      "unresolvedSourceFiles":source_unresolved,"unresolvedSourcePercentage":100*source_unresolved/len(files),
      "invalidGeometryCount":sum(1 for r in inventory if r.get("geometryValid") is False and r.get("geometryValidityReason")),
      "identityMismatchCount":len(identity_mismatches),"identityMismatches":identity_mismatches[:500],
      "coordinateBoundsOutsideWGS84Count":len(out_of_bounds),"coordinateBoundsOutsideWGS84":out_of_bounds[:100],
      "unexpectedGeometryOrParseErrorCount":len(errors),"unexpectedGeometryOrParseErrors":errors[:1000],
      "overlapScreen":{"method":"Shapely 2.1.2 STRtree; valid polygons transformed to EPSG:6933 equal-area; material overlap >1 m²; invalid geometries excluded and separately reported; no source repair.","perState":overlap_summary,"overlapPairsOver1m2":overlap_total,"first2000Pairs":overlaps},
      "stateSummaries":state_summaries,"knownIssues":known.get("issues",[]),"telanganaTgracComparison":tgrac_comparison,"generatedAtUtc":utc()
    }
    audit_b=(json.dumps(source_summary,indent=2,ensure_ascii=False)+"\n").encode()
    (out/"candidate_geometry_audit.json").write_bytes(audit_b)
    inventory_b=(json.dumps(inventory,indent=2,ensure_ascii=False)+"\n").encode()
    inventory_gz=gzip.compress(inventory_b,compresslevel=9,mtime=0)
    (out/"source_file_inventory.json.gz").write_bytes(inventory_gz)
    manifest={"schemaVersion":1,"title":"Pinned non-official national AC geometry candidate acquisition and audit","sourceRepository":REPO_URL,"pinnedCommit":commit,"gitTreeSha":source_summary["gitTreeSha"],"featureFiles":len(files),"stateCodeCount":len(feature_count_by_state) if "feature_count_by_state" in locals() else len({p.parts[-3] for p in files},"invalidGeometryCount":source_summary["invalidGeometryCount"],"unresolvedSourceCount":source_unresolved,"overlapPairsOver1m2":overlap_total,"snapshot":{"path":snapshot_path.name,"bytes":len(snapshot),"sha256":sha(snapshot)},"audit":{"path":"candidate_geometry_audit.json","bytes":len(audit_b),"sha256":sha(audit_b)},"inventory":{"path":"source_file_inventory.json.gz","bytes":len(inventory_gz),"uncompressedBytes":len(inventory_b),"sha256":sha(inventory_gz)},"tgracStatus":tgrac_rec.get("status"),"disposition":"CANDIDATE_ONLY_NOT_OFFICIAL_NOT_CANONICAL","databaseAccess":"NONE","generatedAtUtc":utc()}
    mb=(json.dumps(manifest,indent=2)+"\n").encode()
    (out/"manifest.json").write_bytes(mb)
    json.loads((out/"candidate_geometry_audit.json").read_text(encoding="utf-8"))
    inv_check=json.loads(gzip.decompress((out/"source_file_inventory.json.gz").read_bytes()))
    if len(inv_check)!=len(files) or sha((out/snapshot_path.name).read_bytes())!=sha(snapshot) or sha((out/"source_file_inventory.json.gz").read_bytes())!=sha(inventory_gz):
        raise SystemExit("DURABLE_OUTPUT_READBACK_FAILED")
    readme=f"""# National Assembly Constituency geometry candidate audit — NOT OFFICIAL

Pinned source repository: {REPO_URL}
Commit: {commit}
Git tree SHA: {source_summary["gitTreeSha"]}

Disposition: CANDIDATE ONLY. This is not official national statutory boundary evidence and is not accepted as canonical geometry.

Acquired {len(files)} individual AC GeoJSON files across {len({p.parts[-3] for p in files})} state/UT codes. Source snapshot: {snapshot_path.name} ({len(snapshot)} bytes; SHA-256 {sha(snapshot)}). Per-file raw SHA-256 and Git blob SHA are in source_file_inventory.json.gz. Full geometry/provenance audit is in candidate_geometry_audit.json.

The upstream documentation says the data is not official and not 100% accurate. GitHub reports licence metadata as Other/NOASSERTION; the upstream claims CC BY-SA 4.0 for data/docs and MIT for code, but some feature source identifiers are TBD. Preserve the upstream attribution and licence/source documents included in the snapshot. Source-level attribution and reuse rights remain unresolved.

A current TGRAC Telangana GIS response was separately fetched and hashed if the service was available. This is also a candidate source, with no verified legal effective date/version/licence and a known invalid Dornakal polygon. Geometric comparisons are screening only; make_valid is used only in memory to compare geometries, never to rewrite raw source files.
"""
    (out/"README.md").write_text(readme,encoding="utf-8")
    print(json.dumps({"status":"CANDIDATE_SOURCE_SNAPSHOT_ACQUIRED_AND_AUDITED_NOT_CANONICAL","pinnedCommit":commit,"sourceFiles":len(files),"statesUTs":len({p.parts[-3] for p in files}),"invalidGeometries":source_summary["invalidGeometryCount"],"unresolvedSourceFiles":source_unresolved,"overlapPairsOver1m2":overlap_total,"tgracStatus":tgrac_rec.get("status"),"outputs":[{"path":snapshot_path.name,"bytes":len(snapshot),"sha256":sha(snapshot)},{"path":"candidate_geometry_audit.json","bytes":len(audit_b),"sha256":sha(audit_b)},{"path":"source_file_inventory.json.gz","bytes":len(inventory_gz),"sha256":sha(inventory_gz)},{"path":"manifest.json","bytes":len(mb),"sha256":sha(mb)}]},indent=2))
if __name__=="__main__":main()
