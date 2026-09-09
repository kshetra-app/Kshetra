import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('=== KSHETRA CI/CD: REPO & EVIDENCE INTEGRITY CHECKER (Amendment v1.4 Part 34) ===\n');

// 1. Check Working Tree Cleanliness (if git is available)
let isWorkingTreeClean = false;
let gitStatusOutput = '';
try {
  gitStatusOutput = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  isWorkingTreeClean = gitStatusOutput.length === 0;
} catch (err) {
  console.warn('Git status check warning:', err.message);
}

console.log(`1. Working Tree Status: ${isWorkingTreeClean ? 'CLEAN (0 unstaged changes)' : 'DIRTY (' + gitStatusOutput.split('\n').length + ' modified files)'}`);

// 2. Extract referenced commits from continuity registers
const acceptanceRegisterPath = path.resolve('ACCEPTANCE_REGISTER.md');
const executionStatePath = path.resolve('EXECUTION_STATE.md');

const referencedCommits = new Set();
const commitRegex = /`([0-9a-f]{7,40})`/g;

if (fs.existsSync(acceptanceRegisterPath)) {
  const content = fs.readFileSync(acceptanceRegisterPath, 'utf8');
  let match;
  while ((match = commitRegex.exec(content)) !== null) {
    referencedCommits.add(match[1]);
  }
}

if (fs.existsSync(executionStatePath)) {
  const content = fs.readFileSync(executionStatePath, 'utf8');
  let match;
  while ((match = commitRegex.exec(content)) !== null) {
    referencedCommits.add(match[1]);
  }
}

console.log(`\n2. Extracted ${referencedCommits.size} Referenced Commit Identifiers from registers.`);

// Verify which commits exist in branch history and are ancestors of HEAD
const verifiedCommits = [];
const missingCommits = [];

referencedCommits.forEach(sha => {
  try {
    const rev = execSync(`git rev-parse --verify "${sha}"`, { encoding: 'utf8' }).trim();
    // Ensure the object is an actual commit
    execSync(`git cat-file -e "${sha}^{commit}"`, { stdio: 'pipe' });
    // Ensure the commit is actually in the ancestry of HEAD (not a dead/amended reflog object)
    execSync(`git merge-base --is-ancestor "${sha}" HEAD`, { stdio: 'pipe' });
    verifiedCommits.push({ sha, resolvedFullSha: rev, exists: true, isAncestor: true });
  } catch (err) {
    missingCommits.push(sha);
  }
});

console.log(`   - Verified in Git ancestry: ${verifiedCommits.length}`);
console.log(`   - Unresolved / Phantom:     ${missingCommits.length} (${missingCommits.join(', ') || 'none'})`);

const report = {
  evidenceMetadata: {
    repository: 'https://github.com/kshetra-app/Kshetra.git',
    branch: 'master',
    targetMandate: 'CI/CD Repo & Evidence Integrity (Amendment v1.4 Part 34A & 34B)',
    timestamp: new Date().toISOString()
  },
  workingTree: {
    clean: isWorkingTreeClean,
    uncommittedEntries: gitStatusOutput ? gitStatusOutput.split('\n') : []
  },
  referencedCommitsChecked: referencedCommits.size,
  verifiedCommitsCount: verifiedCommits.length,
  missingCommitsCount: missingCommits.length,
  unresolvedCommits: missingCommits,
  status: missingCommits.length === 0 ? 'PASS' : 'WARNING_PENDING_COMMITS'
};

const reportPath = path.resolve('reports/w003_evidence_integrity_report.json');
let shouldWrite = true;
if (fs.existsSync(reportPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    if (
      existing.workingTree?.clean === isWorkingTreeClean &&
      existing.referencedCommitsChecked === referencedCommits.size &&
      existing.verifiedCommitsCount === verifiedCommits.length &&
      existing.missingCommitsCount === missingCommits.length &&
      existing.status === (missingCommits.length === 0 ? 'PASS' : 'WARNING_PENDING_COMMITS')
    ) {
      shouldWrite = false;
    }
  } catch (err) {}
}

if (shouldWrite) {
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nEvidence Integrity Report written to: reports/w003_evidence_integrity_report.json`);
} else {
  console.log(`\nEvidence Integrity Report up to date: reports/w003_evidence_integrity_report.json`);
}

if (missingCommits.length > 0) {
  console.error(`\n[FAIL] Found ${missingCommits.length} unresolved or non-ancestor commit(s) in registers: ${missingCommits.join(', ')}`);
  process.exit(1);
}

console.log(`[PASS] Repository & Evidence Integrity check completed (${verifiedCommits.length}/${referencedCommits.size} commits verified).`);
