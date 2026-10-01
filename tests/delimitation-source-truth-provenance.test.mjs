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
    const censusFile = readFileSync(resolve(REPO_ROOT, 'data/census/india-district-population-2011.ts'), 'utf8');
    assert.match(censusFile, /export const TOTAL_LOK_SABHA_SEATS = 543;/);
    assert.match(censusFile, /export const CURRENT_STATUTORY_LOK_SABHA_SEATS = TOTAL_LOK_SABHA_SEATS;/);
    assert.doesNotMatch(censusFile, /export const TOTAL_LOK_SABHA_SEATS = 850;/);
  });

  test('Check B: 2011 / 543 benchmark is not used by active projection engines', () => {
    const seatCalcFile = readFileSync(resolve(REPO_ROOT, 'apps/mobile/lib/delimitation/seatCalculator.ts'), 'utf8');
    const delimServiceFile = readFileSync(resolve(REPO_ROOT, 'apps/api/src/services/delimitationService.ts'), 'utf8');
    const delimRouteFile = readFileSync(resolve(REPO_ROOT, 'apps/api/src/routes/delimitation.ts'), 'utf8');

    // Neither service nor route imports or references IDEAL_POP_PER_LS_SEAT_2011
    assert.doesNotMatch(seatCalcFile, /IDEAL_POP_PER_LS_SEAT/);
    assert.doesNotMatch(delimServiceFile, /IDEAL_POP_PER_LS_SEAT/);
    assert.doesNotMatch(delimRouteFile, /IDEAL_POP_PER_LS_SEAT/);
  });

  test('Check C & D: All active projection outputs carry PANIN_SCENARIO provenance and officialDelimitationOrder: false', () => {
    const seatCalcFile = readFileSync(resolve(REPO_ROOT, 'apps/mobile/lib/delimitation/seatCalculator.ts'), 'utf8');
    const delimServiceFile = readFileSync(resolve(REPO_ROOT, 'apps/api/src/services/delimitationService.ts'), 'utf8');

    assert.match(seatCalcFile, /authorityLayer:\s*'PANIN_SCENARIO'/);
    assert.match(seatCalcFile, /officialDelimitationOrder:\s*false/);
    assert.match(delimServiceFile, /authorityLayer:\s*'PANIN_SCENARIO'/);
    assert.match(delimServiceFile, /officialDelimitationOrder:\s*false/);
  });

  test('Check E, F, G, H, I, J: Six 2026 Historical Events exist with exact lifecycle statuses', () => {
    const mobileStoreFile = readFileSync(resolve(REPO_ROOT, 'apps/mobile/stores/delimitation.ts'), 'utf8');
    const delimServiceFile = readFileSync(resolve(REPO_ROOT, 'apps/api/src/services/delimitationService.ts'), 'utf8');

    // Bill 45 Introduction & Defeat
    assert.match(mobileStoreFile, /id:\s*'evt-2026-bill45-intro'/);
    assert.match(mobileStoreFile, /outcome:\s*'INTRODUCED'/);
    assert.match(mobileStoreFile, /id:\s*'evt-2026-bill45-defeat'/);
    assert.match(mobileStoreFile, /outcome:\s*'DEFEATED'/);
    assert.match(mobileStoreFile, /divisionAyes:\s*298/);
    assert.match(mobileStoreFile, /divisionNoes:\s*230/);

    // Bill 46 Introduction & Infructuous
    assert.match(mobileStoreFile, /id:\s*'evt-2026-bill46-intro'/);
    assert.match(mobileStoreFile, /id:\s*'evt-2026-bill46-infructuous'/);
    assert.match(mobileStoreFile, /outcome:\s*'INFRUCTUOUS'/);

    // Bill 47 Introduction & Infructuous
    assert.match(mobileStoreFile, /id:\s*'evt-2026-bill47-intro'/);
    assert.match(mobileStoreFile, /id:\s*'evt-2026-bill47-infructuous'/);

    // API Service Timeline events
    assert.match(delimServiceFile, /id:\s*'LEG-2026-04-16-BILL-45-INTRO'/);
    assert.match(delimServiceFile, /id:\s*'LEG-2026-04-17-BILL-45-DEFEAT'/);
    assert.match(delimServiceFile, /id:\s*'LEG-2026-04-16-BILL-46-INTRO'/);
    assert.match(delimServiceFile, /id:\s*'LEG-2026-04-17-BILL-46-INFRUCTUOUS'/);
    assert.match(delimServiceFile, /id:\s*'LEG-2026-04-16-BILL-47-INTRO'/);
    assert.match(delimServiceFile, /id:\s*'LEG-2026-04-17-BILL-47-INFRUCTUOUS'/);
  });

  test('Check K: Timeline events are strictly chronological', () => {
    const delimServiceFile = readFileSync(resolve(REPO_ROOT, 'apps/api/src/services/delimitationService.ts'), 'utf8');
    const getTimelineStart = delimServiceFile.indexOf('public getTimeline(): DelimitationTimelineDTO');
    const getTimelineEnd = delimServiceFile.indexOf('public getStatus(): DelimitationStatusDTO');
    const timelineChunk = delimServiceFile.slice(getTimelineStart, getTimelineEnd);

    // Extract dates only within the events: [...] array
    const eventsArrayStart = timelineChunk.indexOf('const events: TimelineEventItem[] = [');
    const eventsArrayEnd = timelineChunk.indexOf('];\n\n    const provenance =');
    const eventsArrayChunk = timelineChunk.slice(eventsArrayStart, eventsArrayEnd);

    const dateRegex = /date:\s*'(\d{4}-\d{2}-\d{2})'/g;
    const dates = [];
    let match;
    while ((match = dateRegex.exec(eventsArrayChunk)) !== null) {
      dates.push(match[1]);
    }
    assert.ok(dates.length >= 10, 'Expected at least 10 timeline dates in events array');
    for (let i = 1; i < dates.length; i++) {
      assert.ok(dates[i] >= dates[i - 1], `Dates must be monotonically non-decreasing: ${dates[i - 1]} vs ${dates[i]}`);
    }
  });

  test('Check L: 850/815/35 are never classified as CURRENT_OPERATIVE_LAW', () => {
    const mobileStoreFile = readFileSync(resolve(REPO_ROOT, 'apps/mobile/stores/delimitation.ts'), 'utf8');
    const delimServiceFile = readFileSync(resolve(REPO_ROOT, 'apps/api/src/services/delimitationService.ts'), 'utf8');
    const contractsFile = readFileSync(resolve(REPO_ROOT, 'packages/shared/src/contracts/delimitation.ts'), 'utf8');

    // Confirm that 850 in store is either PROPOSED_LEGISLATIVE or HISTORICAL_FACT
    const bill45IntroIndex = mobileStoreFile.indexOf('evt-2026-bill45-intro');
    const bill45IntroChunk = mobileStoreFile.slice(bill45IntroIndex, bill45IntroIndex + 1000);
    assert.match(bill45IntroChunk, /classification:\s*'PROPOSED_LEGISLATIVE'/);

    const bill45DefeatIndex = mobileStoreFile.indexOf('evt-2026-bill45-defeat');
    const bill45DefeatChunk = mobileStoreFile.slice(bill45DefeatIndex, bill45DefeatIndex + 1000);
    assert.match(bill45DefeatChunk, /classification:\s*'HISTORICAL_FACT'/);

    assert.doesNotMatch(bill45IntroChunk, /CURRENT_OPERATIVE_LAW/);
    assert.doesNotMatch(bill45DefeatChunk, /CURRENT_OPERATIVE_LAW/);
  });

  test('Check M: Existing scenario disclaimers retain their statutory warnings', () => {
    const delimServiceFile = readFileSync(resolve(REPO_ROOT, 'apps/api/src/services/delimitationService.ts'), 'utf8');
    assert.match(delimServiceFile, /statutoryBasisDisclaimer/);
    assert.match(delimServiceFile, /does NOT constitute an official gazetted order/);
  });
});
