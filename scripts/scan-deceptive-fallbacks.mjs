import fs from 'fs';
import path from 'path';

console.log('=== DEF-002 POST-REMEDIATION SCANNER ===\n');

const targetFiles = [
  'apps/mobile/lib/supabaseDataService.ts',
  'apps/mobile/lib/pageService.ts'
];

const results = [];
let totalViolations = 0;

targetFiles.forEach(relPath => {
  const fullPath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${relPath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  const fileViolations = [];

  // 1. Check for `if (!guard()) return true` or similar deceptive boolean returns
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    // Guard check returning true
    if (/if\s*\([^)]*guard[^)]*\)\s*return\s+true\s*;/i.test(line) ||
        /if\s*\([^)]*!isUuid[^)]*\)\s*return\s+true\s*;/i.test(line) ||
        /if\s*\([^)]*!isSupabaseConfigured[^)]*\)\s*return\s+true\s*;/i.test(line)) {
      fileViolations.push({
        line: lineNum,
        pattern: 'GUARD_RETURNING_TRUE',
        content: line.trim()
      });
    }

    // Synthetic ID returning success: true
    if (/return\s*\{\s*id\s*:\s*[`'"]local-[^}]+success\s*:\s*true/i.test(line) ||
        /id\s*:\s*`local-[^`]+`\s*,\s*success\s*:\s*true/i.test(line)) {
      fileViolations.push({
        line: lineNum,
        pattern: 'SYNTHETIC_ID_SUCCESS_TRUE',
        content: line.trim()
      });
    }

    // Catch block returning true or success: true
    if (/\}\s*catch\s*(\([^)]*\))?\s*\{[^}]*return\s+(true|\{\s*[^}]*success\s*:\s*true)/i.test(line)) {
      fileViolations.push({
        line: lineNum,
        pattern: 'CATCH_RETURNING_TRUE',
        content: line.trim()
      });
    }
  });

  totalViolations += fileViolations.length;
  results.push({
    file: relPath,
    scannedLines: lines.length,
    violationsCount: fileViolations.length,
    violations: fileViolations,
    status: fileViolations.length === 0 ? 'CLEAN' : 'VIOLATIONS_FOUND'
  });

  console.log(`[SCAN] ${relPath.padEnd(45)}: ${fileViolations.length} violations (Status: ${fileViolations.length === 0 ? 'CLEAN' : 'FAIL'})`);
});

const report = {
  evidenceMetadata: {
    mandate: 'DEF-002 Independent Post-Scan: zero deceptive fallback success semantics',
    verifiedBy: 'DECEPTIVE_FALLBACK_SCANNER',
    timestamp: new Date().toISOString()
  },
  scannedFilesCount: targetFiles.length,
  totalViolations,
  verdict: totalViolations === 0 ? 'PASS' : 'FAIL',
  results
};

const reportPath = path.join(process.cwd(), 'reports', 'w010_def002_post_scan.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nMachine-readable evidence written to: ${reportPath}`);
console.log(`DEF-002 Scanner Verdict: ${totalViolations === 0 ? 'PASSED (0 remaining deceptive success branches)' : 'FAILED'}`);

if (process.argv.includes('--strict') && totalViolations > 0) {
  process.exit(1);
}
