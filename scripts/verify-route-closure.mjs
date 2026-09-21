import fs from 'fs';
import path from 'path';

console.log('=== DEF-001 ROUTE CLOSURE VALIDATOR ===\n');

const mobileAppDir = path.join(process.cwd(), 'apps', 'mobile', 'app');
const deletedFiles = [
  'apps/mobile/app/user/[id].tsx',
  'apps/mobile/app/auth/edit-profile.tsx',
  'apps/mobile/app/auth/onboarding.tsx'
];

const canonicalFiles = [
  'apps/mobile/app/user/[userId].tsx',
  'apps/mobile/app/edit-profile.tsx',
  'apps/mobile/app/onboarding.tsx'
];

// 1. Verify deleted files are completely absent
const deletedFileChecks = deletedFiles.map(rel => {
  const full = path.join(process.cwd(), rel);
  const exists = fs.existsSync(full);
  return { file: rel, exists, status: exists ? 'FAIL_STILL_EXISTS' : 'PASS_ABSENT' };
});

// 2. Verify canonical files exist
const canonicalFileChecks = canonicalFiles.map(rel => {
  const full = path.join(process.cwd(), rel);
  const exists = fs.existsSync(full);
  return { file: rel, exists, status: exists ? 'PASS_EXISTS' : 'FAIL_MISSING' };
});

// 3. Scan for stale route references
function getAllFiles(dir, exts = ['.ts', '.tsx', '.js', '.jsx']) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(res, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      files.push(res);
    }
  }
  return files;
}

const scanDirs = [
  path.join(process.cwd(), 'apps', 'mobile', 'app'),
  path.join(process.cwd(), 'apps', 'mobile', 'components')
];

const stalePatterns = [
  { pattern: /\/auth\/edit-profile/g, name: '/auth/edit-profile' },
  { pattern: /\/auth\/onboarding/g, name: '/auth/onboarding' },
  { pattern: /\/user\/\[id\]/g, name: '/user/[id]' }
];

const staleMatches = [];
scanDirs.forEach(dir => {
  const files = getAllFiles(dir);
  files.forEach(file => {
    const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');
    stalePatterns.forEach(({ pattern, name }) => {
      const matches = content.match(pattern);
      if (matches) {
        staleMatches.push({
          file: rel,
          staleReference: name,
          count: matches.length
        });
      }
    });
  });
});

// 4. Check _layout.tsx registrations and auth guards
const layoutFile = path.join(mobileAppDir, '_layout.tsx');
const layoutContent = fs.readFileSync(layoutFile, 'utf8');
const layoutHasEditProfile = layoutContent.includes('name="edit-profile"');
const layoutHasUserDetail = layoutContent.includes('name="user/[userId]"');
const layoutHasAuthGuard = layoutContent.includes('PROTECTED_ROUTES') || layoutContent.includes('useSegments') || layoutContent.includes('session');

const allPassed = 
  deletedFileChecks.every(c => !c.exists) &&
  canonicalFileChecks.every(c => c.exists) &&
  staleMatches.length === 0 &&
  layoutHasEditProfile &&
  layoutHasUserDetail;

console.log('Deleted files absent:', deletedFileChecks.every(c => !c.exists) ? 'PASS' : 'FAIL');
console.log('Canonical files present:', canonicalFileChecks.every(c => c.exists) ? 'PASS' : 'FAIL');
console.log('Stale route references found:', staleMatches.length);
console.log('Layout registrations verified:', layoutHasEditProfile && layoutHasUserDetail ? 'PASS' : 'FAIL');
console.log('Auth guard logic preserved in _layout.tsx:', layoutHasAuthGuard ? 'PASS' : 'FAIL');

const report = {
  evidenceMetadata: {
    mandate: 'DEF-001 Route Closure: zero duplicate routes, zero stale references, canonical routing verified',
    verifiedBy: 'ROUTE_CLOSURE_VALIDATOR',
    timestamp: new Date().toISOString()
  },
  verdict: allPassed ? 'PASS' : 'FAIL',
  deletedFileChecks,
  canonicalFileChecks,
  staleReferencesCount: staleMatches.length,
  staleReferences: staleMatches,
  layoutVerification: {
    layoutHasEditProfile,
    layoutHasUserDetail,
    layoutHasAuthGuard
  }
};

const reportPath = path.join(process.cwd(), 'reports', 'w010_def001_route_closure.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nMachine-readable evidence written to: ${reportPath}`);
console.log(`DEF-001 Route Closure Verdict: ${allPassed ? 'PASSED' : 'FAILED'}`);

if (process.argv.includes('--strict') && !allPassed) {
  process.exit(1);
}
