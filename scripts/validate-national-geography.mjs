#!/usr/bin/env node
/**
 * GEO-01 release gate. Structural checks are conservative; polygon validity,
 * cross-feature overlap/gap and authoritative topology require a spatial engine.
 */
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'apps/mobile/data/geo-manifest.json'),'utf8'));
const matrix=JSON.parse(fs.readFileSync(path.join(ROOT,'reports/w021_5b1_r5_current_regime_matrix.json'),'utf8'));
const rows=[];
assert.equal(matrix.totalAssemblySeats,4123); assert.equal(matrix.totalAssemblyJurisdictions,31); assert.equal(matrix.jurisdictions.reduce((n,j)=>n+j.assembly_count,0),4123);
function pointsOf(v,out=[]){if(Array.isArray(v)&&v.length>=2&&typeof v[0]==='number'&&typeof v[1]==='number'){out.push(v);return out;}if(Array.isArray(v))for(const x of v)pointsOf(x,out);return out;}
function ringsOf(g){if(g?.type==='Polygon')return g.coordinates??[];if(g?.type==='MultiPolygon')return(g.coordinates??[]).flatMap(p=>p);return[];}
for(const official of matrix.jurisdictions){
 const entry=manifest[official.jurisdiction_code]; const r={jurisdictionCode:official.jurisdiction_code,jurisdictionName:official.jurisdiction_name,expectedCount:official.assembly_count,manifestCount:entry?.count??null,fileFeatureCount:null,status:'BLOCKED',blockers:[]}; const add=s=>r.blockers.push(s);
 if(!entry)add('manifest_entry_missing'); if(!entry?.file)add('geometry_file_missing_from_manifest');
 let fc=null;if(entry?.file){const p=path.join(ROOT,'apps/mobile/data',entry.file);if(!fs.existsSync(p))add('geometry_file_missing');else try{fc=JSON.parse(fs.readFileSync(p,'utf8'));}catch{add('invalid_geojson_json');}}
 if(fc){if(fc.type!=='FeatureCollection'||!Array.isArray(fc.features))add('not_a_feature_collection');else{
  r.fileFeatureCount=fc.features.length;if(fc.features.length!==official.assembly_count)add('geojson_feature_count_differs_from_statutory_count');if(entry?.count!==fc.features.length)add('manifest_count_differs_from_actual_feature_count');if(entry?.count!==official.assembly_count)add('manifest_count_differs_from_statutory_count');
  const ids=new Set();for(const f of fc.features){const p=f?.properties??{};const id=p.AC_NO??p.ac_no??p.AC_NUM??p.AC_CODE??p.ac_code??f.id;if(id==null||String(id).trim()==='')add('feature_missing_official_id');else if(ids.has(String(id)))add('duplicate_official_id');else ids.add(String(id));if(!['Polygon','MultiPolygon'].includes(f?.geometry?.type))add('non_polygon_geometry');const rings=ringsOf(f?.geometry);if(!rings.length)add('polygon_has_no_rings');for(const ring of rings){if(!Array.isArray(ring)||ring.length<4){add('ring_too_short');continue;}const a=ring[0],b=ring[ring.length-1];if(!Array.isArray(a)||!Array.isArray(b)||a[0]!==b[0]||a[1]!==b[1])add('ring_not_closed');}for(const pt of pointsOf(f?.geometry?.coordinates)){if(!Number.isFinite(pt[0])||!Number.isFinite(pt[1])||pt[0]<-180||pt[0]>180||pt[1]<-90||pt[1]>90)add('coordinate_outside_wgs84_bounds');}if(p.STATE&&p.STATE!==official.jurisdiction_code)add('feature_jurisdiction_code_mismatch');}r.uniqueIdCount=ids.size;
 }}
 if(!entry?.hasPolygons||entry?.status==='placeholder')add('placeholder_or_unapproved_polygon_geometry');if(!official.authoritative_source||!official.source_reference||!official.source_publication_date||!official.current_regime_effective_date)add('official_source_or_effective_date_missing');
 r.blockers=[...new Set(r.blockers)];r.status=r.blockers.length?'BLOCKED':'STRUCTURAL_CHECKS_PASS_TOPOLOGY_UNVERIFIED';rows.push(r);
}
const report={schemaVersion:'1.0.0',generatedAt:new Date().toISOString(),sourceMatrix:'reports/w021_5b1_r5_current_regime_matrix.json',manifest:'apps/mobile/data/geo-manifest.json',canonicalBaseline:{assemblyConstituencies:4123,parliamentaryConstituencies:543,assemblyJurisdictions:31},totals:{jurisdictionsChecked:rows.length,observedGeoJsonFeatures:rows.reduce((n,r)=>n+(r.fileFeatureCount??0),0),blockedJurisdictions:rows.filter(r=>r.status==='BLOCKED').length,unexplainedDifferences:rows.filter(r=>r.blockers.includes('geojson_feature_count_differs_from_statutory_count')||r.blockers.includes('manifest_count_differs_from_statutory_count')).length},verdict:'BLOCKED',rows,outstandingSpatialEngineChecks:['self-intersections and polygon validity','cross-feature overlaps','gaps/coverage against authoritative boundary source','jurisdiction bounds against verified reference']};
fs.writeFileSync(path.join(ROOT,'reports/geo-01-reconciliation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({reportPath:'reports/geo-01-reconciliation.json',verdict:report.verdict,totals:report.totals},null,2));if(report.totals.blockedJurisdictions>0||report.totals.unexplainedDifferences>0)process.exitCode=1;
