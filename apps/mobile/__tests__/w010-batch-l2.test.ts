import fs from 'fs';
import path from 'path';

describe('W010 BATCH L2 — DEF-008 & DEF-012 VERIFICATION', () => {
  const rootAppDir = path.resolve(__dirname, '..');
  const localesDir = path.join(rootAppDir, 'i18n/locales');
  const allLanguages = ['en', 'te', 'hi', 'ta', 'kn', 'ml', 'mr', 'bn', 'gu', 'or', 'pa', 'as', 'ne'];

  function loadLocale(lang: string) {
    const filePath = path.join(localesDir, `${lang}.ts`);
    const content = fs.readFileSync(filePath, 'utf8');
    const clean = content
      .replace(/^import\s+.*;/gm, '')
      .replace(/^export\s+type\s+.*;/gm, '')
      .replace(/^type\s+.*;/gm, '')
      .replace(/^export\s+default\s+[a-zA-Z0-9_]+;/gm, '')
      .replace(/^const\s+[a-zA-Z0-9_]+(\s*:\s*[a-zA-Z0-9_<>\s]+)?\s*=\s*/m, 'return ');
    const fn = new Function(clean);
    return fn();
  }

  function extractKeysFromSource(content: string): Set<string> {
    const keys = new Set<string>();
    const lines = content.split('\n');
    const sectionStack: string[] = [];

    lines.forEach(line => {
      if (/^\s*\}/.test(line)) {
        sectionStack.pop();
      }
      const sectionMatch = line.match(/^\s*["']?([a-zA-Z0-9_]+)["']?\s*:\s*\{/);
      if (sectionMatch) {
        sectionStack.push(sectionMatch[1]);
      }
      const keyMatch = line.match(/^\s*["']?([a-zA-Z0-9_]+)["']?\s*:\s*['"`]/);
      if (keyMatch && !line.includes('{')) {
        const prefix = sectionStack.length > 0 ? sectionStack.join('.') + '.' : '';
        keys.add(`${prefix}${keyMatch[1]}`);
      }
    });
    return keys;
  }

  describe('DEF-012: 13-Locale 100% Key Parity & Authentic Localization', () => {
    it('verifies all 13 locale files exist and are valid TypeScript/JavaScript objects', () => {
      for (const lang of allLanguages) {
        const filePath = path.join(localesDir, `${lang}.ts`);
        expect(fs.existsSync(filePath)).toBe(true);
        const obj = loadLocale(lang);
        expect(typeof obj).toBe('object');
        expect(obj).not.toBeNull();
      }
    });

    it('verifies every language provides full coverage for canonical en keys (2,128) with zero missing', () => {
      const enFile = path.join(localesDir, 'en.ts');
      const enContent = fs.readFileSync(enFile, 'utf8');
      const enKeys = extractKeysFromSource(enContent);
      expect(enKeys.size).toBe(2128);

      for (const lang of allLanguages) {
        const filePath = path.join(localesDir, `${lang}.ts`);
        const content = fs.readFileSync(filePath, 'utf8');
        const langKeys = extractKeysFromSource(content);

        // Verify zero missing keys compared to canonical en
        const missing = Array.from(enKeys).filter(k => !langKeys.has(k));
        expect(missing).toEqual([]);
      }
    });

    it('verifies zero empty strings across all 13 locale files', () => {
      for (const lang of allLanguages) {
        const langObj = loadLocale(lang);
        const checkNoEmpty = (o: any, p = '') => {
          for (const [k, v] of Object.entries(o)) {
            const full = p ? `${p}.${k}` : k;
            if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
              checkNoEmpty(v, full);
            } else if (typeof v === 'string') {
              expect(v.trim().length).toBeGreaterThan(0);
            }
          }
        };
        checkNoEmpty(langObj);
      }
    });
  });

  describe('DEF-008: Hardcoded String Elimination & Canonical i18n Usage', () => {
    it('verifies moderation screen uses canonical i18n keys for statutory notices and actions', () => {
      const moderationPath = path.join(rootAppDir, 'app/moderation/index.tsx');
      const content = fs.readFileSync(moderationPath, 'utf8');

      expect(content).toContain("i18n.t('moderation.");
      expect(content).not.toContain('>Statutory Compliance Warning<');
      expect(content).not.toContain('>Approve Content<');
      expect(content).not.toContain('>Reject Content<');
    });

    it('verifies representative profile screen uses canonical i18n keys', () => {
      const repPath = path.join(rootAppDir, 'app/representative/[id].tsx');
      const content = fs.readFileSync(repPath, 'utf8');

      expect(content).toContain("i18n.t('representative.");
      expect(content).not.toContain('>Terms & Offices<');
      expect(content).not.toContain('>Assets & Liabilities<');
      expect(content).not.toContain('>Attendance Rate<');
    });

    it('verifies legislator profile screen uses canonical i18n keys', () => {
      const legPath = path.join(rootAppDir, 'app/legislator/[id].tsx');
      const content = fs.readFileSync(legPath, 'utf8');

      expect(content).toContain("i18n.t('legislator.");
      expect(content).not.toContain('>Official Legislative Record<');
      expect(content).not.toContain('>Election Commission of India affidavits<');
    });

    it('verifies edit profile screen uses canonical i18n keys', () => {
      const editPath = path.join(rootAppDir, 'app/edit-profile.tsx');
      const content = fs.readFileSync(editPath, 'utf8');

      expect(content).toContain("t('editProfile.");
      expect(content).toContain("t('common.save')");
    });
  });
});
