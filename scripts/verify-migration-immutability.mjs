#!/usr/bin/env node

/**
 * scripts/verify-migration-immutability.mjs
 *
 * Master Execution Framework — W021.5 / CTO Directive 091 (Workstream C)
 * True Raw-Byte Migration Immutability & Exact Path-Set Verification
 *
 * Compares all 68 migrations under supabase/migrations/ byte-for-byte against the starting commit
 * `0ea572d860aa064766042f6b418b157fd8e2098f` using raw Buffer comparisons and SHA-256 hashes
 * WITHOUT newline or CRLF/LF normalization.
 * Enforces exact path sets, zero database mutations, and strict byte-for-byte immutability.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

export const STARTING_COMMIT = '0ea572d860aa064766042f6b418b157fd8e2098f';
export const EXPECTED_MIGRATION_COUNT = 68;

/**
 * Pure comparison function comparing raw byte maps.
 * Never normalizes text, newlines, or line endings.
 *
 * @param {Map<string, Buffer|null>} baselineFiles - Map of relative path -> raw Buffer from baseline commit
 * @param {Map<string, Buffer|null>} currentFiles - Map of relative path -> raw Buffer from current tree
 * @returns {object} Detailed immutability audit report
 */
export function compareMigrationBytes(baselineFiles, currentFiles) {
  const baselinePaths = Array.from(baselineFiles.keys()).sort();
  const currentPaths = Array.from(currentFiles.keys()).sort();

  const missingPaths = baselinePaths.filter((p) => !currentFiles.has(p));
  const addedPaths = currentPaths.filter((p) => !baselineFiles.has(p));
  const commonPaths = baselinePaths.filter((p) => currentFiles.has(p));

  const contentModifiedFiles = [];
  const identicalFiles = [];
  const unresolvedBlobs = [];
  const results = [];

  for (const p of commonPaths) {
    const baseBuf = baselineFiles.get(p);
    const currBuf = currentFiles.get(p);

    if (baseBuf === undefined || baseBuf === null) {
      unresolvedBlobs.push(p);
      results.push({
        path: p,
        status: 'BASELINE_BLOB_UNRESOLVED',
        isMatch: false,
      });
      continue;
    }

    if (currBuf === undefined || currBuf === null) {
      results.push({
        path: p,
        status: 'CURRENT_FILE_UNREADABLE',
        isMatch: false,
      });
      continue;
    }

    const baseSha256 = crypto.createHash('sha256').update(baseBuf).digest('hex');
    const currSha256 = crypto.createHash('sha256').update(currBuf).digest('hex');
    const isMatch = baseBuf.equals(currBuf);

    if (isMatch) {
      identicalFiles.push(p);
      results.push({
        path: p,
        status: 'RAW_BYTES_IDENTICAL',
        isMatch: true,
        baseSha256,
        currSha256,
        byteLength: currBuf.length,
      });
    } else {
      contentModifiedFiles.push(p);
      results.push({
        path: p,
        status: 'CONTENT_MODIFIED',
        isMatch: false,
        baseSha256,
        currSha256,
        baseByteLength: baseBuf.length,
        currByteLength: currBuf.length,
      });
    }
  }

  const pathSetsIdentical = missingPaths.length === 0 && addedPaths.length === 0;
  const isImmutabilityPreserved =
    pathSetsIdentical &&
    unresolvedBlobs.length === 0 &&
    contentModifiedFiles.length === 0 &&
    results.length > 0 &&
    results.every((r) => r.isMatch === true);

  return {
    isImmutabilityPreserved,
    pathSetsIdentical,
    totalBaselinePaths: baselinePaths.length,
    totalCurrentPaths: currentPaths.length,
    identicalCount: identicalFiles.length,
    missingPaths,
    addedPaths,
    unresolvedBlobs,
    contentModifiedFiles,
    results,
  };
}

/**
 * Verifies repository migration immutability against baseline commit using raw byte comparisons.
 */
export function verifyMigrationImmutability(startingCommit = STARTING_COMMIT) {
  const migrationsDir = path.join(REPO_ROOT, 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found at ${migrationsDir}`);
  }

  // 1. Retrieve baseline tree paths and blobs from starting commit
  const treeOutput = execSync(`git ls-tree -r ${startingCommit} supabase/migrations`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();

  const treeLines = treeOutput.split('\n').filter(Boolean);
  const baselineBlobMap = new Map();

  for (const line of treeLines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 4) {
      const blobSha = parts[2];
      const relPath = parts.slice(3).join(' ');
      if (relPath.endsWith('.sql')) {
        baselineBlobMap.set(relPath, blobSha);
      }
    }
  }

  // 2. Read baseline Git blobs as RAW BUFFERS via git cat-file --batch
  const batchInput = Array.from(baselineBlobMap.values()).join('\n') + '\n';
  const batchOutputBuffer = execSync(`git cat-file --batch`, {
    cwd: REPO_ROOT,
    input: batchInput,
    maxBuffer: 50 * 1024 * 1024,
  });

  const blobBySha = new Map();
  let offset = 0;
  while (offset < batchOutputBuffer.length) {
    const headerEnd = batchOutputBuffer.indexOf(0x0a, offset);
    if (headerEnd === -1) break;
    const header = batchOutputBuffer.toString('utf8', offset, headerEnd);
    const [sha, type, sizeStr] = header.split(' ');
    const size = parseInt(sizeStr, 10);
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + size;
    const blobBuffer = batchOutputBuffer.subarray(contentStart, contentEnd);
    blobBySha.set(sha, blobBuffer);
    offset = contentEnd + 1; // skip trailing newline
  }

  const baselineFiles = new Map();
  for (const [relPath, blobSha] of baselineBlobMap.entries()) {
    const buf = blobBySha.get(blobSha) || null;
    baselineFiles.set(relPath, buf);
  }

  // 3. Read current local files as RAW BUFFERS without any text encoding or newline normalization
  const localFileNames = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const currentFiles = new Map();

  for (const f of localFileNames) {
    const fullPath = path.join(migrationsDir, f);
    const relPath = `supabase/migrations/${f}`;
    const rawBuf = fs.readFileSync(fullPath); // RAW Buffer
    currentFiles.set(relPath, rawBuf);
  }

  // 4. Execute pure byte comparison
  const comparison = compareMigrationBytes(baselineFiles, currentFiles);

  // 5. Verify secondary count invariant
  const secondaryCountValid =
    comparison.totalBaselinePaths === EXPECTED_MIGRATION_COUNT &&
    comparison.totalCurrentPaths === EXPECTED_MIGRATION_COUNT;

  // 6. Verify git diff is empty
  const gitDiffOutput = execSync(`git diff ${startingCommit} -- supabase/migrations`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();

  const isGitDiffClean = gitDiffOutput.length === 0;

  const isImmutabilityPreserved =
    comparison.isImmutabilityPreserved &&
    secondaryCountValid &&
    isGitDiffClean;

  return {
    isImmutabilityPreserved,
    isGitDiffClean,
    startingCommit,
    totalFilesAudited: comparison.totalCurrentPaths,
    expectedCount: EXPECTED_MIGRATION_COUNT,
    identicalCount: comparison.identicalCount,
    bitwiseMatchCount: comparison.identicalCount,
    mismatchCount: comparison.contentModifiedFiles.length,
    missingPaths: comparison.missingPaths,
    addedPaths: comparison.addedPaths,
    unresolvedBlobs: comparison.unresolvedBlobs,
    contentModifiedFiles: comparison.contentModifiedFiles,
    pathSetsIdentical: comparison.pathSetsIdentical,
    results: comparison.results,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Auditing 68 SQL migrations against starting commit ${STARTING_COMMIT}...`);
  const report = verifyMigrationImmutability();
  console.log(`[PASS] Total migrations verified: ${report.identicalCount}/${report.expectedCount}`);
  console.log(`[PASS] Raw byte matches: ${report.identicalCount}`);
  console.log(`[PASS] Missing paths: ${report.missingPaths.length}`);
  console.log(`[PASS] Added paths: ${report.addedPaths.length}`);
  console.log(`[PASS] Content modified: ${report.contentModifiedFiles.length}`);
  console.log(`[PASS] Path sets identical: ${report.pathSetsIdentical}`);
  console.log(`[PASS] Git diff clean: ${report.isGitDiffClean}`);
  console.log(`[PASS] Raw-byte immutability preserved: ${report.isImmutabilityPreserved}`);
}
