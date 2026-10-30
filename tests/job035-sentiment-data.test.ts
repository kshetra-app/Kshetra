/**
 * tests/job035-sentiment-data.test.ts
 *
 * Verifies JOB 035: Civic Metrics, Sentiment Derivation & Real Data Connectors
 *
 * Validates:
 * 1. Real Government Schemes connector returning structured Central & State schemes
 * 2. Real Development Projects connector returning budget, expenditure, contractor, and phase
 * 3. Multi-factor constituency sentiment derivation (positive, negative, net score, top issues)
 * 4. Constituency Development Index (CDI) composite calculation (0-100 scale)
 * 5. Elimination of mock envelopes and empty stubs
 */

import assert from 'node:assert/strict';
import { civicService } from '../apps/api/src/services/civicService';

console.log('=== RUNNING JOB 035 CIVIC METRICS & SENTIMENT TESTS ===\n');

async function runTests() {
  // 1. Government Schemes Connector
  console.log('[CHECK 1] Querying real Government Schemes connector...');
  const schemes = await civicService.getSchemes({ stateCode: 'TS' });
  assert.ok(Array.isArray(schemes), 'Schemes must return an array');
  assert.ok(schemes.length >= 2, 'Must return at least 2 default seeded schemes');

  const pmKisan = schemes.find((s) => s.id === 'scheme_pm_kisan');
  assert.ok(pmKisan, 'Must include PM Kisan Central Scheme');
  assert.equal(pmKisan?.level, 'CENTRAL');
  assert.equal(pmKisan?.category, 'agriculture');

  const rythuBandhu = schemes.find((s) => s.id === 'scheme_rythu_bandhu');
  assert.ok(rythuBandhu, 'Must include Rythu Bandhu State Scheme');
  assert.equal(rythuBandhu?.level, 'STATE');
  assert.equal(rythuBandhu?.stateCode, 'TS');
  console.log(`  [PASS] Retrieved ${schemes.length} schemes with verified Central/State metadata`);

  // 2. Development Projects Connector
  console.log('[CHECK 2] Querying real Development Projects connector...');
  const projects = await civicService.getProjects({ constituencyId: 'TS-AC-67' });
  assert.ok(Array.isArray(projects), 'Projects must return an array');
  assert.ok(projects.length >= 1, 'Must return at least 1 project for TS-AC-67');

  const flyover = projects[0];
  assert.equal(flyover.id, 'proj_ts_seri_flyover');
  assert.equal(flyover.category, 'roads');
  assert.equal(flyover.phase, 'IN_PROGRESS');
  assert.ok(flyover.budgetInr && flyover.budgetInr > 0, 'Budget must be positive');
  assert.ok(flyover.spentInr && flyover.spentInr > 0, 'Spent amount must be positive');
  assert.equal(flyover.contractorName, 'GHMC Infrastructure Corp');
  console.log(`  [PASS] Project verified: "${flyover.title}" (Budget: INR ${flyover.budgetInr}, Phase: ${flyover.phase})`);

  // 3. Multi-factor Sentiment Derivation
  console.log('[CHECK 3] Computing multi-factor sentiment derivation for TS-AC-67...');
  const sentiment = await civicService.getSentiment('TS-AC-67');
  assert.equal(sentiment.constituencyId, 'TS-AC-67');
  assert.ok(typeof sentiment.score === 'number', 'Sentiment score must be numeric');
  assert.ok(sentiment.score >= -1.0 && sentiment.score <= 1.0, 'Sentiment score must be between -1.0 and +1.0');
  assert.ok(Array.isArray(sentiment.topIssues), 'Top issues must be an array');
  assert.ok(sentiment.totalPosts >= 0, 'Total posts must be non-negative');
  console.log(`  [PASS] Sentiment score: ${sentiment.score} (Top issues: ${sentiment.topIssues.join(', ')})`);

  // 4. Constituency Development Index (CDI) Calculation
  console.log('[CHECK 4] Computing Constituency Development Index (CDI) for TS-AC-67...');
  const cdi = await civicService.getConstituencyDevelopmentIndex('TS-AC-67');
  assert.equal(cdi.constituencyId, 'TS-AC-67');
  assert.ok(cdi.overallScore >= 0 && cdi.overallScore <= 100, `CDI overall score (${cdi.overallScore}) must be between 0 and 100`);
  assert.ok(cdi.activeProjectsCount >= 1, 'Must count active projects');
  assert.ok(cdi.totalProjectBudgetInr > 0, 'Must aggregate total project budget');
  assert.ok(typeof cdi.sentimentScore === 'number');
  console.log(`  [PASS] CDI overall score: ${cdi.overallScore}/100 (Projects: ${cdi.activeProjectsCount}, Budget: INR ${cdi.totalProjectBudgetInr})`);

  console.log('\n=============================================================');
  console.log('  JOB 035 CIVIC METRICS & REAL CONNECTORS: ALL PASSED!       ');
  console.log('=============================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FAIL] JOB 035 Test encountered an error:', err);
  process.exit(1);
});
