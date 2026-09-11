import fs from 'fs';
import path from 'path';

console.log('=== KSHETRA API ARCHITECTURE AUDIT & SEPARATION GENERATOR (JOB W006) ===\n');

const rootDir = process.cwd();
const mobileDir = path.join(rootDir, 'apps/mobile');
const apiDir = path.join(rootDir, 'apps/api');

function getFilesRecursively(dir, filterRegex) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!['node_modules', '.expo', 'dist', 'android', 'ios', '.git'].includes(file)) {
        results = results.concat(getFilesRecursively(fullPath, filterRegex));
      }
    } else if (filterRegex.test(file)) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

// 1. Mobile file scanning
const mobileFiles = getFilesRecursively(mobileDir, /\.(ts|tsx|js|jsx)$/);
console.log(`1. Scanned ${mobileFiles.length} mobile source files...`);

const legacyDirectSupabaseCallers = [];
const directSupabaseTableCallers = [];
const railwayApiCallers = [];
const localFallbackFiles = [];
const realtimeCallers = [];
const authCallers = [];

const tableAccessMap = {};

for (const f of mobileFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const rel = path.relative(mobileDir, f).replace(/\\/g, '/');

  // Legacy baseline regex (matches 12 direct Supabase callers from W000)
  const hasSupabaseImport = /from\s+['"][^'"]*supabase['"]/.test(content) || /supabase\./.test(content) || /createClient/.test(content);
  if (hasSupabaseImport) {
    legacyDirectSupabaseCallers.push(rel);
  }

  // Supabase Table queries: .from('table')
  const fromMatches = [...content.matchAll(/\.from\(\s*['"]([^'"]+)['"]\s*\)/g)];
  if (fromMatches.length > 0) {
    directSupabaseTableCallers.push(rel);
    for (const m of fromMatches) {
      const tbl = m[1];
      if (!tableAccessMap[tbl]) tableAccessMap[tbl] = [];
      tableAccessMap[tbl].push(rel);
    }
  }

  // Supabase Realtime: .channel('...')
  if (/\.channel\(/.test(content)) {
    realtimeCallers.push(rel);
  }

  // Supabase Auth: supabase.auth
  if (/supabase\.auth\./.test(content)) {
    authCallers.push(rel);
  }

  // Railway API: API_BASE_URL or REMOTE_API_URL or direct fetch to Railway or api routes
  const hasRailwayEnv = /API_BASE_URL|REMOTE_API_URL/.test(content);
  const hasApiFetch = /fetch\(\s*[`'"].*?(?:\/api\/|\/geo\/)/.test(content) || /fetch\(\s*[`'"]\${(?:API_BASE_URL|apiUrl|REMOTE_API_URL)}/.test(content);
  if (hasRailwayEnv || hasApiFetch) {
    railwayApiCallers.push(rel);
  }

  // Local fallback / mock patterns
  const hasMockPattern = /local-cmt-|local-issue-|local-short-|local-asp-|local-kyc-|local-alert-|dummy|placeholder-anon|isSupabaseConfigured|if\s*\(!guard\(\)\)\s*return/.test(content);
  if (hasMockPattern) {
    localFallbackFiles.push(rel);
  }
}

const uniqueLegacySupabase = [...new Set(legacyDirectSupabaseCallers)].sort();
const uniqueTableCallers = [...new Set(directSupabaseTableCallers)].sort();
const uniqueRailwayCallers = [...new Set(railwayApiCallers)].sort();
const uniqueRealtimeCallers = [...new Set(realtimeCallers)].sort();
const uniqueAuthCallers = [...new Set(authCallers)].sort();
const uniqueLocalFallbackFiles = [...new Set(localFallbackFiles)].sort();

console.log(`   - Baseline Supabase Callers (W000 criteria): ${uniqueLegacySupabase.length}`);
console.log(`   - Direct Supabase Table .from() Callers: ${uniqueTableCallers.length}`);
console.log(`   - Supabase Realtime Callers: ${uniqueRealtimeCallers.length}`);
console.log(`   - Supabase Auth Callers: ${uniqueAuthCallers.length}`);
console.log(`   - Railway API Callers: ${uniqueRailwayCallers.length}`);
console.log(`   - Local Fallback / Mock Files: ${uniqueLocalFallbackFiles.length}`);

// 2. Scan API routes
const apiRouteFiles = fs.readdirSync(path.join(apiDir, 'src/routes')).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));
const registeredFastifyRoutes = [];

function scanApiRouteFile(filePath, prefix = '') {
  const content = fs.readFileSync(filePath, 'utf8');
  const routeRegex = /(?:app|fastify)\.(get|post|put|delete|patch|options|head)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    let rPath = match[2];
    if (prefix && !rPath.startsWith(prefix)) {
      rPath = prefix + (rPath.startsWith('/') ? rPath : '/' + rPath);
    }
    registeredFastifyRoutes.push({
      method: match[1].toUpperCase(),
      path: rPath,
      file: path.basename(filePath)
    });
  }
}

// scan server.ts
scanApiRouteFile(path.join(apiDir, 'src/server.ts'));
for (const rf of apiRouteFiles) {
  let pfx = '';
  if (rf === 'constituencies.ts') pfx = '/api/v1';
  else if (rf === 'health.ts') pfx = '/api';
  else if (rf === 'metrics.ts') pfx = '/api';
  else if (rf === 'debug.ts') pfx = '/api';
  scanApiRouteFile(path.join(apiDir, 'src/routes', rf), pfx);
}

// deduplicate
const uniqueRoutes = [];
const seenRoutes = new Set();
for (const r of registeredFastifyRoutes) {
  const key = `${r.method} ${r.path}`;
  if (!seenRoutes.has(key)) {
    seenRoutes.add(key);
    uniqueRoutes.push(r);
  }
}

console.log(`2. Scanned ${uniqueRoutes.length} unique Fastify route registrations across ${apiRouteFiles.length} route modules...`);

// 3. Classify all 85 methods in supabaseDataService.ts into architectural classes
const dataServiceContent = fs.readFileSync(path.join(mobileDir, 'lib/supabaseDataService.ts'), 'utf8');
const methodRegex = /export\s+async\s+function\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\):/g;
let fnMatch;
const classifiedFunctions = [];

while ((fnMatch = methodRegex.exec(dataServiceContent)) !== null) {
  const fnName = fnMatch[1];
  const params = fnMatch[2].replace(/\s+/g, ' ').trim();
  
  // Extract body slice for this function
  const startIdx = fnMatch.index;
  const nextMatch = dataServiceContent.indexOf('export async function ', startIdx + 20);
  const bodySlice = nextMatch !== -1 
    ? dataServiceContent.substring(startIdx, nextMatch) 
    : dataServiceContent.substring(startIdx, startIdx + 2500);

  // Determine tables touched
  const tables = [...new Set([...bodySlice.matchAll(/\.from\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]))];
  const rpcs = [...new Set([...bodySlice.matchAll(/\.rpc\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]))];
  const hasFetch = /fetch\(/.test(bodySlice);
  const isInsert = /\.insert\(|\.upsert\(/.test(bodySlice);
  const isUpdate = /\.update\(/.test(bodySlice);
  const isDelete = /\.delete\(/.test(bodySlice);
  const isSelect = /\.select\(/.test(bodySlice) && !isInsert && !isUpdate && !isDelete;

  let architecturalClass = 'CLASS_B_CLIENT_WRITE_STRANGLER_TARGET';
  let targetFastifyEndpoint = '';
  let rationale = '';

  if (hasFetch) {
    architecturalClass = 'CLASS_C_ALREADY_FASTIFY_ROUTED';
    const fetchPathMatch = bodySlice.match(/\/api\/v1\/[a-zA-Z0-9_\-\/]+/);
    targetFastifyEndpoint = fetchPathMatch ? fetchPathMatch[0] : 'Fastify /api/v1';
    rationale = 'Already implemented to call Fastify HTTP endpoint directly';
  } else if (isSelect) {
    architecturalClass = 'CLASS_A_READ_RLS_GOVERNED';
    targetFastifyEndpoint = 'Supabase PostgREST / RLS read (or optional CDN cache in W008)';
    rationale = 'Read query governed by Supabase RLS and indexes; safe for direct client read';
  } else {
    architecturalClass = 'CLASS_B_CLIENT_WRITE_STRANGLER_TARGET';
    rationale = 'Client-side mutation bypassing server validation, audit logging, and centralized rate limiting. Prime strangler migration candidate.';
    
    // Map to potential or existing Fastify route
    if (tables.includes('civic_issues') || tables.includes('issue_upvotes') || tables.includes('issue_comments') || tables.includes('issue_disputes') || tables.includes('issue_follows')) {
      targetFastifyEndpoint = '/api/v1/civic/...';
    } else if (tables.includes('posts') || tables.includes('comments') || tables.includes('reactions') || tables.includes('poll_votes')) {
      targetFastifyEndpoint = '/api/v1/feed/... (or /api/v1/posts/...)';
    } else if (tables.includes('creator_kyc_records') || tables.includes('contributor_devices') || tables.includes('action_fingerprints')) {
      targetFastifyEndpoint = '/api/v1/contributor/kyc';
    } else if (tables.includes('political_shorts') || tables.includes('short_approvals') || tables.includes('short_flags') || tables.includes('short_comments')) {
      targetFastifyEndpoint = '/api/v1/shorts/...';
    } else if (tables.includes('live_events') || tables.includes('lmx_department_alerts') || tables.includes('content_alerts') || tables.includes('lmx_distribution_destinations') || tables.includes('lmx_moderation_events')) {
      targetFastifyEndpoint = '/api/v1/lmx/...';
    } else if (tables.includes('aspirant_profiles') || tables.includes('module_progress') || tables.includes('challenge_participation') || tables.includes('community_endorsements')) {
      targetFastifyEndpoint = '/api/v1/aspirant/... (Academy)';
    } else if (tables.includes('user_profiles')) {
      targetFastifyEndpoint = '/api/v1/user/profile';
    } else if (tables.includes('push_tokens') || tables.includes('notification_log')) {
      targetFastifyEndpoint = '/api/v1/notifications/...';
    } else if (tables.includes('reports')) {
      targetFastifyEndpoint = '/api/v1/moderation/report';
    } else {
      targetFastifyEndpoint = '/api/v1/...';
    }
  }

  classifiedFunctions.push({
    name: fnName,
    parameters: params,
    tablesTouched: tables,
    rpcsInvoked: rpcs,
    hasFastifyFetch: hasFetch,
    isMutation: isInsert || isUpdate || isDelete,
    architecturalClass,
    targetFastifyEndpoint,
    rationale
  });
}

const classACount = classifiedFunctions.filter(f => f.architecturalClass === 'CLASS_A_READ_RLS_GOVERNED').length;
const classBCount = classifiedFunctions.filter(f => f.architecturalClass === 'CLASS_B_CLIENT_WRITE_STRANGLER_TARGET').length;
const classCCount = classifiedFunctions.filter(f => f.architecturalClass === 'CLASS_C_ALREADY_FASTIFY_ROUTED').length;

console.log(`3. Classified 85 data service methods:`);
console.log(`   - Class A (Read, RLS-Governed): ${classACount}`);
console.log(`   - Class B (Mutation Strangler Target): ${classBCount}`);
console.log(`   - Class C (Already Fastify Routed): ${classCCount}`);

// 4. Build Strangulation Phase Matrix
const strangulationPhases = [
  {
    phase: 'Phase 1: High-Risk Civic & Moderation Mutations',
    priority: 'P0 (Immediate / W007-W008)',
    rationale: 'Public-facing civic issues, comments, disputes, and content reports must be moderated and rate-limited at the API gateway.',
    methods: classifiedFunctions.filter(f => 
      ['reportIssue', 'addIssueComment', 'disputeIssueResolution', 'tagMLAOnIssue', 'submitContentReport'].includes(f.name)
    ).map(f => f.name),
    canonicalFastifyEndpoints: [
      'POST /api/v1/civic/issues',
      'POST /api/v1/civic/issues/:id/comments',
      'POST /api/v1/civic/issues/:id/dispute',
      'POST /api/v1/moderation/report'
    ]
  },
  {
    phase: 'Phase 2: Social Feed, Reactions & Poll Voting',
    priority: 'P1 (W008-W009)',
    rationale: 'Prevent vote stuffing, malicious post injections, and unmoderated comments by centralizing write validation in Fastify.',
    methods: classifiedFunctions.filter(f => 
      ['composePost', 'editPost', 'deletePost', 'votePoll', 'addPostComment', 'deletePostComment', 'reactToPost', 'reactToComment'].includes(f.name)
    ).map(f => f.name),
    canonicalFastifyEndpoints: [
      'POST /api/v1/feed/posts',
      'PUT /api/v1/feed/posts/:id',
      'DELETE /api/v1/feed/posts/:id',
      'POST /api/v1/feed/polls/:id/vote',
      'POST /api/v1/feed/posts/:id/comments',
      'POST /api/v1/feed/reactions'
    ]
  },
  {
    phase: 'Phase 3: Creator KYC, LMX & Devices',
    priority: 'P1 (W009-W010)',
    rationale: 'Sensitive identity data (KYC, biometric selfies, forensic device fingerprints) must never be written directly from client without strict server-side schema verification and encryption.',
    methods: classifiedFunctions.filter(f => 
      ['submitKYC', 'insertActionFingerprint', 'upsertContributorDevice', 'createLiveEvent', 'updateLiveEvent', 'endLiveEvent', 'dispatchDepartmentAlert', 'acknowledgeDepartmentAlert'].includes(f.name)
    ).map(f => f.name),
    canonicalFastifyEndpoints: [
      'POST /api/v1/contributor/kyc',
      'POST /api/v1/devices/fingerprint',
      'POST /api/v1/lmx/live',
      'POST /api/v1/lmx/alerts'
    ]
  },
  {
    phase: 'Phase 4: Political Shorts & Aspirant Leadership Academy',
    priority: 'P2 (W010-W011)',
    rationale: 'Video shorts uploads, endorsements, and leadership academy quiz grading.',
    methods: classifiedFunctions.filter(f => 
      ['uploadShort', 'approveShort', 'flagShort', 'addShortComment', 'registerAspirant', 'startModule', 'completeModule', 'joinChallenge', 'endorseAspirant'].includes(f.name)
    ).map(f => f.name),
    canonicalFastifyEndpoints: [
      'POST /api/v1/shorts/upload',
      'POST /api/v1/shorts/:id/comments',
      'POST /api/v1/academy/register',
      'POST /api/v1/academy/modules/:id/complete'
    ]
  }
];

// 5. Output audit reports
const auditReport = {
  evidenceMetadata: {
    jobId: 'W006',
    title: 'API Architecture Audit & Separation',
    authority: 'Master Execution Framework Amendment v1.4 / DEC-002 / DEC-028',
    timestamp: new Date().toISOString(),
    commitCoordinates: {
      verifiedRemoteHead: '838e851',
      auditedCodeCommit: '838e851',
      evidenceCommit: 'pending',
      acceptanceCommit: 'pending'
    }
  },
  auditSummary: {
    totalMobileFilesScanned: mobileFiles.length,
    baselineDirectSupabaseCallersCount: uniqueLegacySupabase.length,
    directSupabaseTableCallersCount: uniqueTableCallers.length,
    railwayApiCallerFilesCount: uniqueRailwayCallers.length,
    localFallbackFilesCount: uniqueLocalFallbackFiles.length,
    realtimeChannelFilesCount: uniqueRealtimeCallers.length,
    authCallerFilesCount: uniqueAuthCallers.length,
    totalRegisteredFastifyRoutes: uniqueRoutes.length,
    totalFastifyRouteModules: apiRouteFiles.length
  },
  callers: {
    baselineDirectSupabaseCallers: uniqueLegacySupabase,
    directSupabaseTableCallers: uniqueTableCallers,
    railwayApiCallers: uniqueRailwayCallers,
    realtimeCallers: uniqueRealtimeCallers,
    authCallers: uniqueAuthCallers,
    localFallbackFiles: uniqueLocalFallbackFiles
  },
  tableAccessMap,
  dataServiceClassification: {
    totalMethods: classifiedFunctions.length,
    classCounts: {
      CLASS_A_READ_RLS_GOVERNED: classACount,
      CLASS_B_CLIENT_WRITE_STRANGLER_TARGET: classBCount,
      CLASS_C_ALREADY_FASTIFY_ROUTED: classCCount
    },
    methods: classifiedFunctions
  },
  strangulationMigrationPlan: strangulationPhases,
  registeredFastifyRoutes: uniqueRoutes
};

fs.writeFileSync(path.join(rootDir, 'reports/w006_api_architecture_audit.json'), JSON.stringify(auditReport, null, 2));
console.log('Successfully wrote reports/w006_api_architecture_audit.json');
