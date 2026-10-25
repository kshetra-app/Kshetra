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
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 500 * 1024 * 1024;
const MAX_REDIRECTS = 5;
let totalDownloadedBytes = 0;
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
  { id:'SRC-CENSUS-PCA-SD-2011-XLSX', authority:'PRIMARY_OFFICIAL_DATASET', path:'official/census/DDW_PCA0000_2011_Indiastatedist.xlsx',
    url:'https://censusindia.gov.in/nada/index.php/catalog/6191/download/9268/DDW_PCA0000_2011_Indiastatedist.xlsx', effectiveDate:'2011', purpose:'Official state/district-level PCA workbook. Not constituency-level data; do not label as AC population.' },
  { id:'SRC-DATAMEET-AC-README', authority:'SECONDARY_SOURCE_METADATA', path:'secondary/datameet/assembly-constituencies-README.md',
    url:'https://raw.githubusercontent.com/datameet/maps/b2f56f6bd8fdead64f0210c133ab467d26e3621e/assembly-constituencies/README.md', purpose:'Pinned dataset caveats and license metadata.' },
  { id:'SRC-SOI-ABDB', authority:'PRIMARY_OFFICIAL_CATALOG', path:'official/soi/administrative-boundary-database.html',
    url:'https://surveyofindia.gov.in/pages/administrative-boundary-data-base-abdb-', purpose:'Official administrative boundaries; not a substitute for AC statutory boundaries or postal delivery beats.' },
  { id:'SRC-SOI-VILLAGE-BOUNDARIES', authority:'PRIMARY_OFFICIAL_CATALOG', path:'official/soi/village-boundary-database.html',
    url:'https://surveyofindia.gov.in/pages/village-boundary-data-base-of-entire-india', purpose:'Official village boundary database discovery page; candidate for Census-village spatial joins only after exact version and coverage validation.' },
  { id:'SRC-SOI-VECTOR-CATALOG-2025', authority:'PRIMARY_OFFICIAL_METADATA', path:'official/soi/vector-data-catalog-2025.pdf',
    url:'https://www.surveyofindia.gov.in/UserFiles/files/Vector%20Data%20Catalog%202025%281%29.pdf', purpose:'Metadata for available administrative boundary products.' },
  { id:'SRC-DATAMEET-AC-SHP', authority:'SECONDARY_CANDIDATE_GIS', path:'secondary/datameet/India_AC.shp',
    url:'https://raw.githubusercontent.com/datameet/maps/7a1c21c2e3f059a19aba1023f64ed7e174462ca4/assembly-constituencies/India_AC.shp', license:'CC BY 2.5 India per dataset README',
    purpose:'Candidate geometry only. Dataset README warns about shifted geometry, missing/wrong names and pre-delimitation boundaries in several states.' },
  { id:'SRC-DATAMEET-AC-DBF', authority:'SECONDARY_CANDIDATE_GIS', path:'secondary/datameet/India_AC.dbf',
    url:'https://raw.githubusercontent.com/datameet/maps/7a1c21c2e3f059a19aba1023f64ed7e174462ca4/assembly-constituencies/India_AC.dbf', license:'CC BY 2.5 India per dataset README', purpose:'Attribute companion for candidate geometry; not official truth.' },
  { id:'SRC-DATAMEET-AC-SHX', authority:'SECONDARY_CANDIDATE_GIS', path:'secondary/datameet/India_AC.shx',
    url:'https://raw.githubusercontent.com/datameet/maps/7a1c21c2e3f059a19aba1023f64ed7e174462ca4/assembly-constituencies/India_AC.shx', license:'CC BY 2.5 India per dataset README', purpose:'Shapefile index companion.' },
  { id:'SRC-DATAMEET-AC-PRJ', authority:'SECONDARY_CANDIDATE_GIS', path:'secondary/datameet/India_AC.prj',
    url:'https://raw.githubusercontent.com/datameet/maps/7a1c21c2e3f059a19aba1023f64ed7e174462ca4/assembly-constituencies/India_AC.prj', license:'CC BY 2.5 India per dataset README', purpose:'Shapefile CRS companion.' },
  ...[
    ['S03','assam','assam.geojson'],['U07','puducherry','puducherry.geojson'],['S11','kerala','kerala.geojson'],['S22','tamil_nadu','tamil_nadu.geojson'],['S25','west_bengal','west_bengal.geojson']
  ].map(([stateCode,slug,file]) => ({
    id:'SRC-SECONDARY-ECI-2026-AC-'+stateCode, authority:'SECONDARY_ECI_PORTAL_EXTRACTION', path:'secondary/eci-2026-extraction/'+stateCode+'.geojson',
    url:'https://raw.githubusercontent.com/saisantoshv3/assemnbly_gis_files/730263a08afa3cf7a0cd12db68bcddc90aefcc03/2026_assembly_election/'+slug+'_'+stateCode+'/'+file,
    purpose:'Third-party GeoJSON extraction claiming ECI May 2026 results-portal origin. Compare with direct ECI response; do not accept as official without direct source and temporal validation.'
  })),
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
    const requestHeaders = {
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Accept':'text/html,application/pdf,application/json,application/zip,application/octet-stream,*/*',
      'Accept-Language':'en-IN,en;q=0.9'
    };
    if (new URL(current).hostname.toLowerCase() === 'results.eci.gov.in') {
      requestHeaders.Referer = 'https://results.eci.gov.in/';
    }
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(60000),
      headers: requestHeaders
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
    if (totalDownloadedBytes + fetched.bytes.byteLength > MAX_TOTAL_BYTES) throw new Error('TOTAL_DOWNLOAD_BUDGET_EXCEEDED');
    totalDownloadedBytes += fetched.bytes.byteLength;
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




/* Crawl the official ECI statistical-report index by state row. For each state,
 * retrieve the two most recent report pages linked by ECI and the XLSX linked
 * from the "10 - Detailed Results" section. This is deliberately bounded and
 * source-year/state tagged; it does not infer missing results. */
const eciIndex = manifest.results.find(r => r.id==='SRC-ECI-STATISTICAL-INDEX' && r.status==='DOWNLOADED_HASHED');
if (eciIndex) {
  try {
    const html = await fs.readFile(eciIndex.localPath, 'utf8');
    const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
    const byState = new Map();
    const strip = value => value.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
    for (const row of rows) {
      const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
      if (cells.length < 2) continue;
      const stateName = strip(cells[0][1]);
      if (!stateName || /^(states|years|state)$/i.test(stateName)) continue;
      const anchors = [...row.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
      const links = [];
      for (const anchor of anchors) {
        const href = new URL(anchor[1].replace(/&amp;/g,'&'), eciIndex.finalUrl).toString();
        const match = new URL(href).pathname.match(/\/statistical-report\/ae\/(\d{4})\/(\d+)/i);
        if (!match || !hostAllowed(href)) continue;
        links.push({url:href,year:Number(match[1]),code:match[2],label:strip(anchor[2])});
      }
      links.sort((a,b)=>b.year-a.year || (/(including)/i.test(b.label)?-1:0));
      const chosen=[];
      const seenYears=new Set();
      for (const link of links) {
        if (seenYears.has(link.year)) continue;
        chosen.push({...link,stateName});
        seenYears.add(link.year);
        if (chosen.length===2) break;
      }
      if (chosen.length) byState.set(stateName,chosen);
    }

    const reportPages=[...byState.values()].flat().slice(0,80);
    for (const page of reportPages) {
      const stateSlug=safeName(page.stateName.toLowerCase().replace(/\s+/g,'-'));
      const source={
        id:'SRC-ECI-AE-'+page.year+'-'+page.code,
        authority:'PRIMARY_OFFICIAL_STATISTICAL_REPORT',
        path:'official/eci/statistical-reports/'+stateSlug+'/'+page.year+'-'+page.code+'.html',
        url:page.url,
        state:page.stateName,
        electionYear:page.year,
        eciReportCode:page.code,
        purpose:'Official state assembly election statistical report; download detailed results XLSX for this state/year.'
      };
      const result={...source,retrievedAt:new Date().toISOString(),status:'PENDING',sha256:null,bytes:null,finalUrl:null,contentType:null};
      let reportHtml='';
      try {
        const fetched=await fetchBounded(source.url);
        if (totalDownloadedBytes + fetched.bytes.byteLength > MAX_TOTAL_BYTES) throw new Error('TOTAL_DOWNLOAD_BUDGET_EXCEEDED');
        totalDownloadedBytes+=fetched.bytes.byteLength;
        const destination=path.join(OUT,source.path);
        await fs.mkdir(path.dirname(destination),{recursive:true});
        await fs.writeFile(destination,fetched.bytes,{flag:'w'});
        reportHtml=fetched.bytes.toString('utf8');
        result.status='DOWNLOADED_HASHED';
        result.sha256=sha256(fetched.bytes);
        result.bytes=fetched.bytes.byteLength;
        result.finalUrl=fetched.finalUrl;
        result.contentType=fetched.contentType;
        result.localPath=destination;
      } catch(error) {
        result.status='FETCH_FAILED';
        result.error=String(error?.message||error);
      }
      manifest.results.push(result);
      if (result.status!=='DOWNLOADED_HASHED') continue;

      const headingPattern=/10\s*[-–.]\s*Detailed Results/i;
      const heading=headingPattern.exec(reportHtml);
      if (!heading) {
        manifest.results.push({id:source.id+'-DETAILS',state:page.stateName,electionYear:page.year,status:'DETAILS_SECTION_NOT_FOUND',sourceReportSha256:result.sha256});
        continue;
      }
      const section=reportHtml.slice(heading.index,heading.index+12000);
      const xlsxAnchors=[...section.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
        .map(a=>({url:new URL(a[1].replace(/&amp;/g,'&'),result.finalUrl).toString(),label:strip(a[2])}))
        .filter(a=>/xlsx|excel|download/i.test(a.label) && hostAllowed(a.url));
      const xlsx=xlsxAnchors.find(a=>/xlsx|excel/i.test(a.label)) || xlsxAnchors[1] || xlsxAnchors[0];
      if (!xlsx) {
        manifest.results.push({id:source.id+'-DETAILS',state:page.stateName,electionYear:page.year,status:'DETAILED_RESULTS_XLSX_LINK_NOT_FOUND',sourceReportSha256:result.sha256});
        continue;
      }
      const dataSource={
        id:source.id+'-DETAILED-RESULTS-XLSX',
        authority:'PRIMARY_OFFICIAL_ECI_DETAILED_RESULTS',
        path:'official/eci/detailed-results/'+stateSlug+'/'+page.year+'-'+page.code+'-detailed-results.xlsx',
        url:xlsx.url,
        state:page.stateName,
        electionYear:page.year,
        eciReportCode:page.code,
        sourceReportUrl:result.finalUrl,
        sourceReportSha256:result.sha256,
        purpose:'Official ECI Detailed Results workbook. Parse only after checking headers, AC regime, totals and provenance.'
      };
      const dataResult={...dataSource,retrievedAt:new Date().toISOString(),status:'PENDING',sha256:null,bytes:null,finalUrl:null,contentType:null};
      try {
        const fetched=await fetchBounded(dataSource.url);
        if (totalDownloadedBytes + fetched.bytes.byteLength > MAX_TOTAL_BYTES) throw new Error('TOTAL_DOWNLOAD_BUDGET_EXCEEDED');
        totalDownloadedBytes+=fetched.bytes.byteLength;
        const destination=path.join(OUT,dataSource.path);
        await fs.mkdir(path.dirname(destination),{recursive:true});
        await fs.writeFile(destination,fetched.bytes,{flag:'w'});
        dataResult.status='DOWNLOADED_HASHED';
        dataResult.sha256=sha256(fetched.bytes);
        dataResult.bytes=fetched.bytes.byteLength;
        dataResult.finalUrl=fetched.finalUrl;
        dataResult.contentType=fetched.contentType;
        dataResult.localPath=destination;
      } catch(error) {
        dataResult.status='FETCH_FAILED';
        dataResult.error=String(error?.message||error);
      }
      manifest.results.push(dataResult);
    }
    manifest.eciStateReportDiscovery={
      stateRowsDiscovered:byState.size,
      reportPagesSelected:reportPages.length,
      reportPagesDownloaded:manifest.results.filter(r=>r.id.startsWith('SRC-ECI-AE-') && !r.id.endsWith('-DETAILS') && r.status==='DOWNLOADED_HASHED').length,
      detailedResultsWorkbooksDownloaded:manifest.results.filter(r=>r.id.endsWith('-DETAILED-RESULTS-XLSX') && r.status==='DOWNLOADED_HASHED').length
    };
  } catch(error) {
    manifest.eciStateReportDiscovery={status:'CRAWL_FAILED',error:String(error?.message||error)};
  }
}

/* Convert ECI's JavaScript-wrapped FeatureCollection responses into a derived
 * GeoJSON artifact without evaluating JavaScript. The result remains a
 * candidate until identity, statutory vintage, topology and seat-count checks pass. */
for (const sourceResult of manifest.results.filter(r => /^SRC-ECI-2026-AC-/.test(r.id) && r.status==='DOWNLOADED_HASHED')) {
  try {
    const raw = await fs.readFile(sourceResult.localPath, 'utf8');
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    if (first < 0 || last <= first) throw new Error('NO_JSON_OBJECT_FOUND');
    const parsed = JSON.parse(raw.slice(first, last + 1));
    if (parsed?.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
      throw new Error('NOT_A_GEOJSON_FEATURE_COLLECTION');
    }
    const stateCode = sourceResult.id.slice('SRC-ECI-2026-AC-'.length);
    const expectedSeats = { S03:126, U07:30, S11:140, S22:234, S25:294 }[stateCode];
    const geojson = JSON.stringify(parsed);
    const destination = path.join(OUT, 'derived/eci-2026-ac-geometry', stateCode + '.geojson');
    await fs.mkdir(path.dirname(destination), {recursive:true});
     await fs.writeFile(destination, geojson + '\n', {flag:'w'});
    const featureCount = parsed.features.length;
    const derived = {
      artifactId:'DERIVED-ECI-2026-AC-'+stateCode,
      sourceId:sourceResult.id,
      sourceSha256:sourceResult.sha256,
      transformation:'Extract first JSON object from ECI JavaScript wrapper; JSON.parse; serialize compact GeoJSON; no geometry edits',
      transformationVersion:'w0215-eci-js-to-geojson-v1',
      localPath:destination,
       sha256:sha256(Buffer.from(geojson + '\n','utf8')),
       bytes:Buffer.byteLength(geojson + '\n','utf8'),
      featureCount,
      expectedStatutorySeatCount:expectedSeats,
      status:featureCount===expectedSeats ? 'CANDIDATE_PENDING_IDENTITY_AND_TOPOLOGY_VALIDATION' : 'REJECTED_COUNT_MISMATCH',
      authorityClassification:'OFFICIAL_SOURCE_DERIVED_CANDIDATE_NOT_YET_ACCEPTED',
      acceptedAsOfficialGeometry:false
    };
    manifest.results.push(derived);
    console.log('[DERIVED_GEOJSON]', stateCode, featureCount, expectedSeats, derived.status, derived.sha256);
  } catch(error) {
    manifest.results.push({
      artifactId:'DERIVED-ECI-2026-AC-'+sourceResult.id.slice('SRC-ECI-2026-AC-'.length),
      sourceId:sourceResult.id,
      status:'DERIVATION_FAILED',
      error:String(error?.message||error)
    });
    console.error('[DERIVATION_FAILED]',sourceResult.id,String(error?.message||error));
  }
}


/* Audit third-party GeoJSON extractions independently. These are not promoted
 * to official; their hashes and feature counts are recorded for comparison. */
for (const sourceResult of manifest.results.filter(r => /^SRC-SECONDARY-ECI-2026-AC-/.test(r.id) && r.status==='DOWNLOADED_HASHED')) {
  try {
    const parsed = JSON.parse(await fs.readFile(sourceResult.localPath, 'utf8'));
    if (parsed?.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) throw new Error('NOT_A_GEOJSON_FEATURE_COLLECTION');
    const stateCode = sourceResult.id.slice('SRC-SECONDARY-ECI-2026-AC-'.length);
    const expectedSeats = { S03:126, U07:30, S11:140, S22:234, S25:294 }[stateCode];
    manifest.results.push({
      artifactId:'AUDIT-SECONDARY-ECI-2026-AC-'+stateCode,
      sourceId:sourceResult.id,
      sourceSha256:sourceResult.sha256,
      featureCount:parsed.features.length,
      expectedStatutorySeatCount:expectedSeats,
      status:parsed.features.length===expectedSeats ? 'COUNT_MATCH_CANDIDATE_ONLY' : 'REJECTED_COUNT_MISMATCH',
      authorityClassification:'SECONDARY_EXTRACTION_NOT_OFFICIAL',
      acceptedAsOfficialGeometry:false
    });
  } catch(error) {
    manifest.results.push({
      artifactId:'AUDIT-SECONDARY-ECI-2026-AC-'+sourceResult.id.slice('SRC-SECONDARY-ECI-2026-AC-'.length),
      sourceId:sourceResult.id,
      status:'AUDIT_FAILED',
      error:String(error?.message||error)
    });
  }
}

/* Discover report/data files linked by the official indexes. This is bounded,
 * provenance-preserving retrieval, not unbounded scraping. */
const indexSources = manifest.results.filter(r =>
  r.status==='DOWNLOADED_HASHED' &&
  ['SRC-ECI-STATISTICAL-INDEX','SRC-ECI-ELECTION-MANAGEMENT','SRC-CENSUS-PCA-SD-2011','SRC-SOI-ABDB','SRC-SOI-VILLAGE-BOUNDARIES'].includes(r.id) &&
  r.contentType && /html|text/i.test(r.contentType)
);
const discovered = new Map();
for (const index of indexSources) {
  try {
    const html = await fs.readFile(index.localPath, 'utf8');
    const anchorPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = anchorPattern.exec(html)) !== null) {
      const href = match[1].replace(/&amp;/g, '&').trim();
      const label = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!href || /^(#|javascript:|mailto:)/i.test(href)) continue;
      const absolute = new URL(href, index.finalUrl).toString();
      if (!hostAllowed(absolute)) continue;
      const pathLower = new URL(absolute).pathname.toLowerCase();
      if (/\.rar$/i.test(pathLower) && /PAN[%\s_-]*INDIA/i.test(pathLower)) {
        const sourceId='DISCOVERED-SOI-15GB-ABDB-ARCHIVE';
        if (!manifest.results.some(r=>r.id===sourceId)) manifest.results.push({
          id:sourceId, authority:'PRIMARY_OFFICIAL_METADATA_ONLY', url:absolute, discoveredFrom:index.id,
          status:'NOT_DOWNLOADED_SIZE_LIMITED', reason:'Survey of India Vector Data Catalog 2025 lists the entire-India administrative-boundary archive at approximately 15 GB; do not download the full archive in this bounded CI acquisition job.',
          note:'The official catalog metadata is retained; obtain a scoped state/UT product through the official portal if needed.'
        });
        continue;
      }
      const labelLower = label.toLowerCase();
      const isDataFile = /\.(pdf|xlsx?|csv|zip|rar|7z|geojson|shp|gpkg|kml|kmz)(?:$|\?)/i.test(absolute);
      const isRelevantLabel = /(form\s*20|statistical report|assembly election|election results|primary census abstract|pca|administrative boundary|vector data)/i.test(labelLower);
      if (!(isDataFile || isRelevantLabel)) continue;
      if (discovered.size < 40) {
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
    if (totalDownloadedBytes + fetched.bytes.byteLength > MAX_TOTAL_BYTES) throw new Error('TOTAL_DOWNLOAD_BUDGET_EXCEEDED');
    totalDownloadedBytes += fetched.bytes.byteLength;
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
  totalDownloadedBytes,
  totalDownloadBudgetBytes:MAX_TOTAL_BYTES,
  staticSourceCount:SOURCES.length,
  dynamicallyDiscoveredCount:manifest.results.filter(r=>r.id.startsWith('DISCOVERED-')).length,
  downloaded:manifest.results.filter(r=>r.status==='DOWNLOADED_HASHED').length,
  failed:manifest.results.filter(r=>r.status==='FETCH_FAILED').length,
  officialDownloads:manifest.results.filter(r=>r.status==='DOWNLOADED_HASHED' && !r.authority.startsWith('SECONDARY')).length,
  secondaryCandidateDownloads:manifest.results.filter(r=>r.status==='DOWNLOADED_HASHED' && r.authority.startsWith('SECONDARY')).length,
  derivedGeometryCandidates:manifest.results.filter(r=>r.artifactId && r.artifactId.startsWith('DERIVED-ECI-2026-AC-')).length,
  derivedGeometryAcceptedAsOfficial:manifest.results.filter(r=>r.acceptedAsOfficialGeometry===true).length
};
const manifestPath=path.join(OUT,'manifest.json');
await fs.writeFile(manifestPath, JSON.stringify(manifest,null,2)+'\n', 'utf8');
console.log(JSON.stringify({manifestPath,summary:manifest.summary},null,2));
if (manifest.summary.downloaded === 0) process.exitCode=1;
