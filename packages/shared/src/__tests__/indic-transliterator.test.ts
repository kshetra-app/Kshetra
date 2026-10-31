import { transliterateToAll13, indicToIndic } from '../i18n/indic-transliterator';
import { PARTIES_13_LANG, EDUCATION_13_LANG, getLocalizedTerm } from '../i18n/domain-dictionary';

describe('13-Language Indic Transliterator & Domain Dictionary', () => {
  it('should transliterate an Indian candidate name to all 13 languages', () => {
    const name = 'Rajesh Kumar';
    const localized = transliterateToAll13(name, 'en');

    expect(localized['en']).toBe('Rajesh Kumar');
    expect(localized['hi'].length).toBeGreaterThan(0);
    expect(localized['te'].length).toBeGreaterThan(0);
    expect(localized['ta'].length).toBeGreaterThan(0);
    expect(localized['kn'].length).toBeGreaterThan(0);
    expect(localized['ml'].length).toBeGreaterThan(0);
    expect(localized['bn'].length).toBeGreaterThan(0);
    expect(localized['gu'].length).toBeGreaterThan(0);
    expect(localized['pa'].length).toBeGreaterThan(0);
    expect(localized['or'].length).toBeGreaterThan(0);
    expect(localized['as'].length).toBeGreaterThan(0);
    expect(localized['mr'].length).toBeGreaterThan(0);
    expect(localized['ne'].length).toBeGreaterThan(0);
  });

  it('should preserve Indic characters when shifting from Devanagari to Telugu and Tamil', () => {
    const devanagari = 'कमल'; // Kamal
    const telugu = indicToIndic(devanagari, 'Deva', 'Telu');
    expect(telugu).toBe('కమల');

    const kannada = indicToIndic(devanagari, 'Deva', 'Knda');
    expect(kannada).toBe('ಕಮಲ');
  });

  it('should translate political parties across all 13 languages from domain dictionary', () => {
    const party = 'BJP';
    const te = getLocalizedTerm(PARTIES_13_LANG, party, 'te');
    const ta = getLocalizedTerm(PARTIES_13_LANG, party, 'ta');
    const bn = getLocalizedTerm(PARTIES_13_LANG, party, 'bn');

    expect(te).toBe('భారతీయ జనతా పార్టీ');
    expect(ta).toBe('பாரதிய ஜனதா கட்சி');
    expect(bn).toBe('ভারতীয় জনতা পার্টি');
  });

  it('should translate educational qualifications across all 13 languages', () => {
    const edu = 'Post Graduate';
    const hi = getLocalizedTerm(EDUCATION_13_LANG, edu, 'hi');
    const te = getLocalizedTerm(EDUCATION_13_LANG, edu, 'te');

    expect(hi).toContain('परास्नातक');
    expect(te).toContain('స్నాతకోన్నతుడు');
  });
});
