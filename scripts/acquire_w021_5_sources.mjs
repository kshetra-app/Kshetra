#!/usr/bin/env node
/**
 * W021.5 R1 source acquisition runner.
 *
 * Downloads a bounded, explicit allowlist of public source artifacts into an
 * untracked local cache, hashes exact response bytes, and writes a manifest.
 * It never inserts data into Supabase and never promotes secondary GIS data to
 * OFFICIAL. Review source terms and the resulting manifest before ingestion.
 *
 * Usage: node scripts/acquire_w021_5_sources.mjs
 * Optional: W0215_SOURCE_CACHE=/absolute/path/to/cache
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.W0215_SOURCE_CACHE
  ? path.resolve(process.env.W0215_SOURCE_CACHE)
  : path.join(ROOT, 'artifacts', 'w021_5_source_cache');
const MAX_BYTES = 100 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const ALLOWED_HOSTS = new Set([
  'eci.gov.in','www.eci.gov.in','old.eci.gov.in','results.eci.gov.in',
  'censusindia.gov.in','www.censusindia.gov.in',
  'surveyofindia.gov.in','www.surveyofindia.gov.in','onlinemaps.surveyofindia.gov.in',
  'raw.githubusercontent.com','github.com','www.indiapost.gov.in','indiapost.gov.in'
]);

const SOURCES = [
  { id:'SRC-ECI-DELIM-2008', authority:'PRIMARY_OFFICIAL', path:'official/eci/delimitation_order_2008_english.pdf',
    url:'https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008%28English%29.pdf',
    effectiveDate:'2008-11-26', purpose:'Statutory names, reservation and constituency extents; digital copy does not satisfy physical-gazette gate.' },
  { id:'SRC-ECI-STATISTICAL-INDEX', authority:'PRIMARY_OFFICIAL_INDEX', path:'official/eci/statistical-reports-index.html',
    url:'https://www.eci.gov.in/statistical-reports/', purpose:'Index to official election statistical reports; individual reports must be separately registered.' },
  { id:'SRC-ECI-ELECTION-MANAGEMENT', authority:'PRIMARY_OFFICIAL_INDEX', path:'official/eci/election-management.html',
    url:'https://www.eci.gov.in/election-management', purpose:'Official index to Form 20 and election results.' },
  { id:'SRC-ECI-AFFIDAVIT-PORTAL', authority:'PRIMARY_OFFICIAL_PORTAL', path:'official/eci/affidavit-portal.html',
    url:'https://www.eci.gov.in/affidavitt-portal', purpose:'Official candidate affidavit portal discovery page; individual affidavit files require record-level capture.' },
  { id:'SRC-CENSUS-PCA-SD-2011', authority:'PRIMARY_OFFICIAL_CATALOG', path:'official/census/pca-sd-2011-catalog.html',
    url:'https://censusindia.gov.in/nada/index.php/catalog/6191', effectiveDate:'2011', purpose:'Official PCA state/district catalogue; download links and exact workbook are captured separately when available.' },
  { id:'SRC-SOI-ABDB', authority:'PRIMARY_OFFICIAL_CATALOG', path:'official/soi/administrative-boundary-database.html',
    url:'https://surveyofindia.gov.in/pages/administrative-boundary-data-base-abdb-', purpose:'Official administrative boundaries; not a substitute for AC statutory boundaries or postal delivery beats.' },
  { id:'SRC-SOI-VECTOR-CATALOG-2025', authority:'PRIMARY_OFFICIAL_METADATA', path:'official/soi/vector-data-catalog-2025.pdf',
    url:'https://www.surveyofindia.gov.in/UserFiles/files/Vector%20Data%20Catalog%202025%281%29.pdf', purpose:'Metadata for available administrative boundary products.' },
  { id:'SRC-DATAMEET-AC-SHP', authority:'SECONDARY_CANDIDATE_GIS', path:'secondary/datameet/India_AC.shp',
    url:'https://raw.githubusercontent.com/datameet/maps/master/assembly-constituencies/India_AC.shp', license:'CC BY 2.5 India per dataset README',
    purpose:'Candidate geometry only. Dataset README warns about shifted geometry, missing/wrong names and pre-delimitation boundaries in several states.' },
  { id:'SRC-DATAMEET-AC-DBF', authority:'SECONDARY_CANDIDATE_GIS', path:'secondary/datameet/India_AC.dbf',
    url:'https://raw.githubusercontent.com/datameet/maps/master/assembly-constituencies/India_AC.dbf', license:'CC BY 2.5 India per dataset README', purpose:'Attribute companion for candidate geometry; not official truth.' },
  { id:'SRC-DATAMEET-AC-SHX', authority:'SECONDARY_CANDIDATE_GIS', path:'secondary/datameet/India_AC.shx',
    url:'https://raw.githubusercontent.com/datameet/maps/master/assembly-constituencies/India_AC.shx', license:'CC BY 2.5 India per dataset README', purpose:'Shapefile index companion.' },
  { id:'SRC-DATAMEET-AC-PRJ', authority:'SECONDARY_CANDIDATE_GIS', path:'secondary/datameet/India_AC.prj',
    url:'https://raw.githubusercontent.com/datameet/maps/master/assembly-constituencies/India_AC.prj', license:'CC BY 2.5 India per dataset README', purpose:'Shapefile CRS companion.' },
  ...[
    ['S03','assam'],['U07','puducherry'],['S11','kerala'],['S22','tamil-nadu'],['S25','west-bengal']
  ].map(([stateCode,slug]) => ({
    id:'SRC-ECI-2026-AC-'+stateCode, authority:'PRIMARY_PORTAL_CANDIDATE', path:'official/eci/2026-ac-geometry/'+stateCode+'.js',
    url:'https://results.eci.gov.in/ResultAcGenMay2026/ac/'+stateCode+'.js',
    purpose:'Election-cycle-specific portal geometry. Validate response, state identity, seat count and effective regime before use; do not generalize to other states.'
  }))
];

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
function safeName(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}
function hostAllowed(url) {
  return ALLOWED_HOSTS.has(new URL(url).hostname.toLowerCase());
}

async function fetchBounded(initialUrl) {
  let current = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!hostAllowed(current)) throw new Error('HOST_NOT_ALLOWLISTED: ' + new URL(current).hostname);
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(60000),
      headers: { 'User-Agent':'Kshetra-W021.5-Source-Acquisition/1.0 (+source provenance; non-automated bulk scraping avoided)' }
    });
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('REDIRECT_WITHOUT_LOCATION');
      current = new URL(location, current).toString();
      continue;
    }
    if (!response.ok) throw new Error('HTTP_' + response.status);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_BYTES) throw new Error('CONTENT_LENGTH_EXCEEDS_LIMIT');
    const chunks = [];
    let received = 0;
    if (!response.body) throw new Error('EMPTY_SOURCE_BODY');
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > MAX_BYTES) {
          await reader.cancel();
          throw new Error('BODY_EXCEEDS_LIMIT');
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = Buffer.concat(chunks, received);
    if (bytes.byteLength === 0) throw new Error('EMPTY_SOURCE_BODY');
    return {
      bytes,
      finalUrl: current,
      status: response.status,
      contentType: response.headers.get('content-type'),
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified')
    };
  }
  throw new Error('TOO_MANY_REDIRECTS');
}

await fs.mkdir(OUT, { recursive: true });
const manifest = {
  schemaVersion:1,
  title:'W021.5 Source Acquisition Manifest',
  startedAt:new Date().toISOString(),
  repositoryBaseline:'33945d20f318ae1aa0d9aba35052246599c5bbae',
  cacheDirectory:OUT,
  hashAlgorithm:'SHA-256 over exact downloaded response bytes',
  note:'A successful download is not proof of source authority, correctness, licence suitability, or national completeness.',
  results:[]
};

for (const source of SOURCES) {
  const result = { ...source, retrievedAt:new Date().toISOString(), status:'PENDING', sha256:null, bytes:null, finalUrl:null, contentType:null };
  try {
    const fetched = await fetchBounded(source.url);
    const destination = path.join(OUT, source.path);
    await fs.mkdir(path.dirname(destination), { recursive:true });
    await fs.writeFile(destination, fetched.bytes, { flag:'w' });
    result.status='DOWNLOADED_HASHED';
    result.sha256=sha256(fetched.bytes);
    result.bytes=fetched.bytes.byteLength;
    result.finalUrl=fetched.finalUrl;
    result.contentType=fetched.contentType;
    result.etag=fetched.etag;
    result.lastModified=fetched.lastModified;
    result.localPath=destination;
    result.note = source.authority.startsWith('SECONDARY')
      ? 'Secondary candidate only; not accepted as OFFICIAL.'
      : 'Downloaded artifact requires content, temporal, authority and coverage validation.';
    console.log('[DOWNLOADED_HASHED]', source.id, result.bytes, result.sha256);
  } catch (error) {
    result.status='FETCH_FAILED';
    result.error=String(error?.message || error);
    console.error('[FETCH_FAILED]', source.id, result.error);
  }
  manifest.results.push(result);
}


/* Discover report/data files linked by the official indexes. This is bounded,
 * provenance-preserving retrieval, not unbounded scraping. */
const indexSources = manifest.results.filter(r =>
  r.status==='DOWNLOADED_HASHED' &&
  ['SRC-ECI-STATISTICAL-INDEX','SRC-ECI-ELECTION-MANAGEMENT','SRC-CENSUS-PCA-SD-2011','SRC-SOI-ABDB'].includes(r.id) &&
  r.contentType && /html|text/i.test(r.contentType)
);
const discovered = new Map();
for (const index of indexSources) {
  try {
    const html = await fs.readFile(index.localPath, 'utf8');
    const anchorPattern = /<a\\b[^>]*href\\s*=\\s*["']([^"']+)["'][^>]*>([\\s\\S]*?)<\\/a>/gi;
    let match;
    while ((match = anchorPattern.exec(html)) !== null) {
      const href = match[1].replace(/&amp;/g, '&').trim();
      const label = match[2].replace(/<[^>]+>/g, ' ').replace(/\\s+/g, ' ').trim();
      if (!href || /^(#|javascript:|mailto:)/i.test(href)) continue;
      const absolute = new URL(href, index.finalUrl).toString();
      if (!hostAllowed(absolute)) continue;
      const pathLower = new URL(absolute).pathname.toLowerCase();
      const labelLower = label.toLowerCase();
      const isDataFile = /\\.(pdf|xlsx?|csv|zip|geojson|shp)(?:$|\\?)/i.test(absolute);
      const isRelevantLabel = /(form\\s*20|statistical report|assembly election|election results|primary census abstract|pca|administrative boundary|vector data)/i.test(labelLower);
      if (!(isDataFile || isRelevantLabel)) continue;
      if (discovered.size < 120) {
        discovered.set(absolute, {url:absolute,label:label.slice(0,240),indexSourceId:index.id,extension:path.extname(pathLower).slice(1)||'html'});
      }
    }
  } catch (error) {
    console.error('[INDEX_PARSE_FAILED]', index.id, String(error?.message || error));
  }
}
for (const [url, candidate] of discovered) {
  if (manifest.results.some(r => r.url === url)) continue;
  const source = {
    id:'DISCOVERED-'+crypto.createHash('sha256').update(url).digest('hex').slice(0,12),
    authority:'DISCOVERED_FROM_OFFICIAL_INDEX',
    path:'discovered/'+safeName(candidate.indexSourceId)+'/'+safeName(path.basename(new URL(url).pathname)||'download.'+candidate.extension),
    url,
    discoveredLabel:candidate.label,
    discoveredFrom:candidate.indexSourceId,
    purpose:'Dynamically linked official source artifact; inspect document identity, state/year, effective date, terms and data completeness before use.'
  };
  const result={...source,retrievedAt:new Date().toISOString(),status:'PENDING',sha256:null,bytes:null,finalUrl:null,contentType:null};
  try {
    const fetched=await fetchBounded(source.url);
    const destination=path.join(OUT,source.path);
    await fs.mkdir(path.dirname(destination),{recursive:true});
    await fs.writeFile(destination,fetched.bytes,{flag:'w'});
    result.status='DOWNLOADED_HASHED';
    result.sha256=sha256(fetched.bytes);
    result.bytes=fetched.bytes.byteLength;
    result.finalUrl=fetched.finalUrl;
    result.contentType=fetched.contentType;
    result.etag=fetched.etag;
    result.lastModified=fetched.lastModified;
    result.localPath=destination;
    console.log('[DISCOVERED_DOWNLOADED_HASHED]',source.id,result.bytes,result.sha256);
  } catch(error) {
    result.status='FETCH_FAILED';
    result.error=String(error?.message||error);
    console.error('[DISCOVERED_FETCH_FAILED]',source.id,result.error);
  }
  manifest.results.push(result);
}

manifest.completedAt=new Date().toISOString();
manifest.summary={
  total:manifest.results.length,
  staticSourceCount:SOURCES.length,
  dynamicallyDiscoveredCount:manifest.results.filter(r=>r.id.startsWith('DISCOVERED-')).length,
  downloaded:manifest.results.filter(r=>r.status==='DOWNLOADED_HASHED').length,
  failed:manifest.results.filter(r=>r.status==='FETCH_FAILED').length,
  officialDownloads:manifest.results.filter(r=>r.status==='DOWNLOADED_HASHED' && !r.authority.startsWith('SECONDARY')).length,
  secondaryCandidateDownloads:manifest.results.filter(r=>r.status==='DOWNLOADED_HASHED' && r.authority.startsWith('SECONDARY')).length
};
const manifestPath=path.join(OUT,'manifest.json');
await fs.writeFile(manifestPath, JSON.stringify(manifest,null,2)+'\n', 'utf8');
console.log(JSON.stringify({manifestPath,summary:manifest.summary},null,2));
if (manifest.summary.downloaded === 0) process.exitCode=1;
