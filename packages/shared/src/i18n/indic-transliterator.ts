/**
 * Indic Phonetic Transliterator & Cross-Script Grapheme Engine
 * Supports 13 Languages: en, te, hi, kn, mr, ta, ml, bn, gu, pa, or, as, ne
 *
 * Implements Unicode Brahmic Relative Offset Invariance (ISO 15924)
 * with deterministic phonetic Latin-to-Indic transliteration.
 */

export const SCRIPT_BASES: Record<string, number> = {
  Deva: 0x0900, // hi, mr, ne
  Beng: 0x0980, // bn, as
  Guru: 0x0a00, // pa
  Gujr: 0x0a80, // gu
  Orya: 0x0b00, // or
  Taml: 0x0b80, // ta
  Telu: 0x0c00, // te
  Knda: 0x0c80, // kn
  Mlym: 0x0d00, // ml
};

export const LANG_TO_SCRIPT: Record<string, string> = {
  en: 'Latn',
  hi: 'Deva',
  mr: 'Deva',
  ne: 'Deva',
  bn: 'Beng',
  as: 'Beng',
  pa: 'Guru',
  gu: 'Gujr',
  or: 'Orya',
  ta: 'Taml',
  te: 'Telu',
  kn: 'Knda',
  ml: 'Mlym',
};

// ── Deterministic Latin to Devanagari Base Syllables ──────────────────────────
const CONSONANT_MAP: Record<string, string> = {
  k: 'क', kh: 'ख', g: 'ग', gh: 'घ', ng: 'ङ',
  ch: 'च', chh: 'छ', j: 'ज', jh: 'झ', ny: 'ञ',
  t: 'ट', th: 'ठ', d: 'ड', dh: 'ढ', n: 'ण',
  ta: 'त', tha: 'थ', da: 'द', dha: 'ध', na: 'न',
  p: 'प', ph: 'फ', f: 'फ़', b: 'ब', bh: 'भ', m: 'म',
  y: 'य', r: 'र', l: 'ल', v: 'व', w: 'व',
  sh: 'श', shh: 'ष', s: 'स', h: 'ह',
  ksh: 'क्ष', tr: 'त्र', gy: 'ज्ञ',
};

const VOWEL_MATRA_MAP: Record<string, string> = {
  aa: 'ा', a: '', i: 'ि', ee: 'ी', u: 'ु', oo: 'ू',
  e: 'े', ai: 'ै', o: 'ो', au: 'ौ', an: 'ं', ah: 'ः',
};

const INDEPENDENT_VOWELS: Record<string, string> = {
  a: 'अ', aa: 'आ', i: 'इ', ee: 'ई', u: 'उ', oo: 'ऊ',
  e: 'ए', ai: 'ऐ', o: 'ओ', au: 'औ',
};

/** Convert a string from one Indic script to another using Unicode relative offset */
export function indicToIndic(text: string, fromScript: string, toScript: string): string {
  const fromBase = SCRIPT_BASES[fromScript];
  const toBase = SCRIPT_BASES[toScript];
  if (!fromBase || !toBase || fromBase === toBase) return text;

  let out = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const offset = code - fromBase;
    if (offset >= 0 && offset <= 0x7f) {
      // Within Indic block
      out += String.fromCharCode(toBase + offset);
    } else {
      out += text[i];
    }
  }
  return out;
}

/** Basic deterministic phonetic conversion from English/Latin to Devanagari */
export function latinToDevanagari(englishWord: string): string {
  const w = englishWord.toLowerCase().trim();
  if (!w) return '';

  let res = '';
  let i = 0;
  while (i < w.length) {
    // Check 3-char, 2-char, then 1-char consonant combinations
    let matchedConsonant: string | null = null;
    let matchLen = 0;

    for (const len of [3, 2, 1]) {
      if (i + len <= w.length) {
        const sub = w.slice(i, i + len);
        if (CONSONANT_MAP[sub]) {
          matchedConsonant = CONSONANT_MAP[sub];
          matchLen = len;
          break;
        }
      }
    }

    if (matchedConsonant) {
      res += matchedConsonant;
      i += matchLen;
      // Check for vowel matra
      let matchedMatra = '';
      let matraLen = 0;
      for (const vlen of [2, 1]) {
        if (i + vlen <= w.length) {
          const vsub = w.slice(i, i + vlen);
          if (VOWEL_MATRA_MAP[vsub] !== undefined) {
            matchedMatra = VOWEL_MATRA_MAP[vsub];
            matraLen = vlen;
            break;
          }
        }
      }
      res += matchedMatra;
      i += matraLen;
    } else {
      // Independent vowel or non-alphabetic
      let matchedVowel = '';
      let vlen = 0;
      for (const len of [2, 1]) {
        if (i + len <= w.length) {
          const vsub = w.slice(i, i + len);
          if (INDEPENDENT_VOWELS[vsub]) {
            matchedVowel = INDEPENDENT_VOWELS[vsub];
            vlen = len;
            break;
          }
        }
      }
      if (matchedVowel) {
        res += matchedVowel;
        i += vlen;
      } else {
        res += w[i];
        i++;
      }
    }
  }
  return res;
}

/** Transliterate text from any language/script to all 13 supported languages */
export function transliterateToAll13(
  sourceText: string,
  sourceLang: string = 'en'
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!sourceText) return result;

  // Step 1: Obtain Devanagari representation as the universal phonetic bridge
  let devanagariBridge = '';
  const srcScript = LANG_TO_SCRIPT[sourceLang] || 'Latn';

  if (srcScript === 'Deva') {
    devanagariBridge = sourceText;
  } else if (srcScript === 'Latn') {
    // English -> Devanagari
    const words = sourceText.split(/\s+/);
    devanagariBridge = words.map(latinToDevanagari).join(' ');
  } else {
    // Other Indic script -> Devanagari
    devanagariBridge = indicToIndic(sourceText, srcScript, 'Deva');
  }

  // Step 2: Map from Devanagari to all other scripts
  result['en'] = sourceLang === 'en' ? sourceText : sourceText; // Keep English source
  result['hi'] = devanagariBridge;
  result['mr'] = devanagariBridge;
  result['ne'] = devanagariBridge;

  const targetScripts: [string, string][] = [
    ['te', 'Telu'],
    ['kn', 'Knda'],
    ['ta', 'Taml'],
    ['ml', 'Mlym'],
    ['bn', 'Beng'],
    ['as', 'Beng'],
    ['gu', 'Gujr'],
    ['pa', 'Guru'],
    ['or', 'Orya'],
  ];

  for (const [lang, script] of targetScripts) {
    result[lang] = indicToIndic(devanagariBridge, 'Deva', script);
  }

  // Retain original source text if sourceLang is one of the 13
  if (sourceLang && result[sourceLang]) {
    result[sourceLang] = sourceText;
  }

  return result;
}
