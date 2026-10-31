import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { transliterateToAll13 } from '../packages/shared/src/i18n/indic-transliterator.ts';
import { PARTIES_13_LANG, EDUCATION_13_LANG, getLocalizedTerm } from '../packages/shared/src/i18n/domain-dictionary.ts';

describe('W083 — Historical Officeholder & Podium Runner-Up Regression Suite', () => {

  it('Condition 1: Historical winners are not indiscriminately marked isCurrent: true', () => {
    // Read a slice of the generated seed file
    const p = path.resolve('data/seed/local-body-representatives.generated.ts');
    const fd = fs.openSync(p, 'r');
    const buf = Buffer.alloc(2000);
    fs.readSync(fd, buf, 0, 2000, 600);
    fs.closeSync(fd);
    const text = buf.toString('utf8');

    // AP 2021 cohort must have isCurrent: false and officeholdingStatus: 'HISTORICAL_WINNER'
    assert.match(text, /\\"isCurrent\\":false/);
    assert.match(text, /\\"officeholdingStatus\\":\\"HISTORICAL_WINNER\\"/);
    assert.match(text, /\\"dataStatus\\":\\"unverified\\"/);
  });

  it('Condition 2: Historical election podium captures Winner, 1st RU, 2nd RU and differentials', () => {
    const upFile = path.resolve('data/historical/up-podium-results.json');
    assert.ok(fs.existsSync(upFile), 'UP podium dataset must exist');

    const data = JSON.parse(fs.readFileSync(upFile, 'utf8'));
    assert.ok(data.length > 2000, 'Must have > 2000 UP contests from 1999 onwards');

    // Find contest 1 in 2022
    const contest2022 = data.find(c => c.electionYear === 2022 && c.acNo === 1);
    assert.ok(contest2022, 'Must find 2022 AC 1 in UP');

    assert.equal(contest2022.winner.rank, 1);
    assert.equal(contest2022.firstRunnerUp.rank, 2);
    assert.equal(contest2022.secondRunnerUp.rank, 3);

    const v1 = contest2022.winner.votes;
    const v2 = contest2022.firstRunnerUp.votes;
    const v3 = contest2022.secondRunnerUp.votes;

    assert.equal(contest2022.marginWinnerToRunnerUp1, v1 - v2);
    assert.equal(contest2022.marginWinnerToRunnerUp2, v1 - v3);
    assert.equal(contest2022.marginRunnerUp1ToRunnerUp2, v2 - v3);
  });

  it('Condition 3: 13-Language transliteration provides complete coverage without Latin fallback leakage', () => {
    const localized = transliterateToAll13('Umar Ali Khan', 'en');
    const langs = ['en', 'te', 'hi', 'kn', 'mr', 'ta', 'ml', 'bn', 'gu', 'pa', 'or', 'as', 'ne'];

    for (const l of langs) {
      assert.ok(localized[l], `Must have representation for ${l}`);
      assert.ok(localized[l].length > 0, `Representation for ${l} must not be empty`);
    }

    // Verify non-English scripts do not contain Latin characters
    const nonEnglish = ['te', 'hi', 'kn', 'mr', 'ta', 'ml', 'bn', 'gu', 'pa', 'or', 'as', 'ne'];
    for (const l of nonEnglish) {
      const hasLatin = /[a-zA-Z]/.test(localized[l]);
      assert.strictEqual(hasLatin, false, `Language ${l} must not leak raw Latin characters: ${localized[l]}`);
    }
  });

  it('Condition 4: Domain taxonomy translates all 13 languages accurately', () => {
    const langs = ['en', 'te', 'hi', 'kn', 'mr', 'ta', 'ml', 'bn', 'gu', 'pa', 'or', 'as', 'ne'];
    for (const l of langs) {
      const party = getLocalizedTerm(PARTIES_13_LANG, 'BJP', l);
      assert.ok(party && party.length > 0, `Party must be localized for ${l}`);

      const edu = getLocalizedTerm(EDUCATION_13_LANG, 'Graduate', l);
      assert.ok(edu && edu.length > 0, `Education must be localized for ${l}`);
    }
  });

});
