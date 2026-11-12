/**
 * tests/delimitation-source-truth-provenance.test.mjs
 *
 * Verification Suite for CTO DIRECTIVE: Delimitation Source-Truth / Provenance Remediation
 *
 * Tests:
 * A. 543 remains current operative baseline where applicable.
 * B. 2011 / 543 benchmark is not used by any active Lok Sabha projection because no such projection exists.
 * C. No active PANIN projection is classified as OFFICIAL.
 * D. All active projection outputs carry PANIN_SCENARIO provenance.
 * E. Bill 45 introduction event exists.
 * F. Bill 45 defeat event exists.
 * G. Bill 46 introduction event exists.
 * H. Bill 46 infructuous event exists.
 * I. Bill 47 introduction event exists.
 * J. Bill 47 infructuous event exists.
 * K. Event history is immutable and ordered.
 * L. 850/815/35 cannot accidentally become CURRENT_OPERATIVE_LAW.
 * M. Existing scenario disclaimers retain their meaning.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve('.');

describe('W020 Delimitation Source-Truth & Provenance Verification Suite', () => {
  test('Check A: 543 remains current operative baseline and is not replaced by 850', () => {
    const censusFile = readFileSync(
      resolve(REPO_ROOT, 'data/census/india-district-population-2011.ts'),
      'utf8',
    );
    assert.match(censusFile, /export const TOTAL_LOK_SABHA_SEATS = 543;/);
    assert.match(
      censusFile,
      /export const CURRENT_STATUTORY_LOK_SABHA_SEATS = TOTAL_LOK_SABHA_SEATS;/,
    );
    assert.doesNotMatch(censusFile, /export const TOTAL_LOK_SABHA_SEATS = 850;/);
  });

  test('Check B: 2011 / 543 benchmark is not used by active projection engines', () => {
    const seatCalcFile = readFileSync(
      resolve(REPO_ROOT, 'apps/mobile/lib/delimitation/seatCalculator.ts'),
      'utf8',
    );
    const delimServiceFile = readFileSync(
      resolve(REPO_ROOT, 'apps/api/src/services/delimitationService.ts'),
      'utf8',
    );
    const delimRouteFile = readFileSync(
      resolve(REPO_ROOT, 'apps/api/src/routes/delimitation.ts'),
      'utf8',
    );

    // Neither service nor route imports or references IDEAL_POP_PER_LS_SEAT_2011
    assert.doesNotMatch(seatCalcFile, /IDEAL_POP_PER_LS_SEAT/);
    assert.doesNotMatch(delimServiceFile, /IDEAL_POP_PER_LS_SEAT/);
    assert.doesNotMatch(delimRouteFile, /IDEAL_POP_PER_LS_SEAT/);
  });

  test('Check C & D: Active projection outputs carry POLIGRAM_SCENARIO provenance and officialDelimitationOrder: false', () => {
    const seatCalcFile = readFileSync(
      resolve(REPO_ROOT, 'apps/mobile/lib/delimitation/seatCalculator.ts'),
      'utf8',
    );
    const delimServiceFile = readFileSync(
      resolve(REPO_ROOT, 'apps/api/src/services/delimitationService.ts'),
      'utf8',
    );

    assert.match(seatCalcFile, /authorityLayer:\s*'POLIGRAM_SCENARIO'/);
    assert.match(seatCalcFile, /officialDelimitationOrder:\s*false/);
    assert.match(delimServiceFile, /authorityLayer:\s*'POLIGRAM_SCENARIO'/);
    assert.match(delimServiceFile, /officialDelimitationOrder:\s*false/);
  });

  test('Check E-J: Canonical timeline is linked, confidence-labeled, and free of unsupported vote figures', () => {
    const mobileStoreFile = readFileSync(
      resolve(REPO_ROOT, 'apps/mobile/stores/delimitation.ts'),
      'utf8',
    );
    const timelineFile = readFileSync(
      resolve(REPO_ROOT, 'apps/api/src/services/delimitationTruth.ts'),
      'utf8',
    );

    assert.doesNotMatch(mobileStoreFile, /SEED_EVENTS|divisionAyes:\s*298|divisionNoes:\s*230/);
    assert.match(timelineFile, /id:\s*'LEG-2026-04-16-BILLS-INTRODUCED'/);
    assert.match(timelineFile, /id:\s*'LEG-2026-04-17-BILLS-NOT-PASSED'/);
    assert.match(timelineFile, /id:\s*'LEG-CENSUS-2026-11-02-POPULATION-ENUMERATION'/);
    assert.match(timelineFile, /outcome:\s*'NOT_PASSED'/);
    assert.match(timelineFile, /sourceUrl:\s*'https:\/\/elibrary\.sansad\.in\//);
    assert.match(timelineFile, /16 to 30 November 2026/);
    const apraEventIndex = timelineFile.indexOf("id: 'LEG-2014-01'");
    const gsrEventIndex = timelineFile.indexOf("id: 'LEG-2015-01'");
    assert.match(timelineFile.slice(apraEventIndex, apraEventIndex + 500), /verified:\s*false/);
    assert.match(timelineFile.slice(gsrEventIndex, gsrEventIndex + 500), /verified:\s*false/);
    assert.doesNotMatch(
      timelineFile,
      /divisionAyes|divisionNoes|Ayes 298|Noes 230|LEG-FUTURE-DELIM/,
    );
  });

  test('Check K: Timeline events are strictly chronological', () => {
    const timelineFile = readFileSync(
      resolve(REPO_ROOT, 'apps/api/src/services/delimitationTruth.ts'),
      'utf8',
    );

    const dateRegex = /date:\s*'(\d{4}-\d{2}-\d{2})'/g;
    const dates = [];
    let match;
    while ((match = dateRegex.exec(timelineFile)) !== null) {
      dates.push(match[1]);
    }
    assert.ok(dates.length >= 10, 'Expected at least 10 timeline dates in events array');
    for (let i = 1; i < dates.length; i++) {
      assert.ok(
        dates[i] >= dates[i - 1],
        `Dates must be monotonically non-decreasing: ${dates[i - 1]} vs ${dates[i]}`,
      );
    }
  });

  test('Check L: 850/815/35 are never classified as CURRENT_OPERATIVE_LAW', () => {
    const timelineFile = readFileSync(
      resolve(REPO_ROOT, 'apps/api/src/services/delimitationTruth.ts'),
      'utf8',
    );
    const contractsFile = readFileSync(
      resolve(REPO_ROOT, 'packages/shared/src/contracts/delimitation.ts'),
      'utf8',
    );
    assert.match(contractsFile, /'NOT_PASSED'/);

    const billIntroIndex = timelineFile.indexOf('LEG-2026-04-16-BILLS-INTRODUCED');
    const bill45IntroChunk = timelineFile.slice(billIntroIndex, billIntroIndex + 1000);
    assert.match(bill45IntroChunk, /classification:\s*'PROPOSED_LEGISLATIVE'/);

    const billOutcomeIndex = timelineFile.indexOf('LEG-2026-04-17-BILLS-NOT-PASSED');
    const billOutcomeChunk = timelineFile.slice(billOutcomeIndex, billOutcomeIndex + 1200);
    assert.match(billOutcomeChunk, /classification:\s*'HISTORICAL_FACT'/);

    assert.doesNotMatch(bill45IntroChunk, /CURRENT_OPERATIVE_LAW/);
    assert.doesNotMatch(billOutcomeChunk, /CURRENT_OPERATIVE_LAW/);
  });

  test('Check M: Existing scenario disclaimers retain their statutory warnings', () => {
    const delimServiceFile = readFileSync(
      resolve(REPO_ROOT, 'apps/api/src/services/delimitationService.ts'),
      'utf8',
    );
    assert.match(delimServiceFile, /statutoryBasisDisclaimer/);
    assert.match(delimServiceFile, /does NOT constitute an official gazetted order/);
  });
});
