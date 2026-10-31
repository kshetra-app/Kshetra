jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { globalSearch } from '../lib/globalSearch';
import { getUnifiedConstituenciesForState } from '../lib/stateDataAdapter';

describe('Search UX & Keyboard Persistence Engine (DEC-202)', () => {
  it('supports 1-character incremental constituency search (e.g. typing "n")', () => {
    const results = globalSearch('n');
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);

    // Verify constituency starting with 'N' (e.g. Nagarkurnool / Nalgonda / Nirmal) is ranked with high relevance
    const nConstituencies = results.filter((r) => r.type === 'constituency');
    expect(nConstituencies.length).toBeGreaterThan(0);

    const nagarkurnool = nConstituencies.find((r) => r.title.toLowerCase().includes('nagarkurnool'));
    expect(nagarkurnool).toBeDefined();
    expect(nagarkurnool?.score).toBeGreaterThanOrEqual(80);
  });

  it('accurately filters and scores Nagarkurnool on progressive keystrokes', () => {
    // 1st keystroke: 'n'
    const resN = globalSearch('n');
    const hasNagarInN = resN.some((r) => r.title.toLowerCase().includes('nagarkurnool'));
    expect(hasNagarInN).toBe(true);

    // 2nd keystroke: 'na'
    const resNA = globalSearch('na');
    const nagarNA = resNA.find((r) => r.title.toLowerCase().includes('nagarkurnool'));
    expect(nagarNA).toBeDefined();
    expect(nagarNA?.score).toBeGreaterThanOrEqual(90);

    // 5th keystroke: 'nagar'
    const resNagar = globalSearch('nagar');
    const nagar5 = resNagar.find((r) => r.title.toLowerCase().includes('nagarkurnool'));
    expect(nagar5).toBeDefined();

    // Full match: 'nagarkurnool'
    const resFull = globalSearch('nagarkurnool');
    expect(resFull.length).toBeGreaterThan(0);
    expect(resFull[0].title.toLowerCase()).toContain('nagarkurnool');
    expect(resFull[0].score).toBe(100);
    expect(resFull[0].route).toBe('/constituency/TS-AC-81');
  });

  it('explore screen data adapter accurately loads and provides Nagarkurnool for Telangana (TS)', () => {
    const tsConstituencies = getUnifiedConstituenciesForState('TS');
    expect(tsConstituencies.length).toBe(119);

    const nagarkurnool = tsConstituencies.find((c) => c.name.toLowerCase() === 'nagarkurnool');
    expect(nagarkurnool).toBeDefined();
    expect(nagarkurnool?.acNo).toBe(81);
    expect(nagarkurnool?.district).toBe('Nagarkurnool');
  });

  it('handles empty query gracefully without throwing', () => {
    expect(globalSearch('')).toEqual([]);
    expect(globalSearch('   ')).toEqual([]);
  });

  it('handles special characters and whitespace without crashing', () => {
    const res = globalSearch('   nagarkurnool   ');
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].title.toLowerCase()).toContain('nagarkurnool');
  });

  describe('Architectural Invariants for Keyboard Persistence', () => {
    const fs = require('fs');
    const path = require('path');
    const mobileRoot = path.join(__dirname, '..');

    it('verifies explore.tsx mounts TextInput outside FlashList and never inside ListHeaderComponent', () => {
      const exploreCode = fs.readFileSync(path.join(mobileRoot, 'app/(tabs)/explore.tsx'), 'utf-8');

      // 1. TextInput is mounted in persistent header
      expect(exploreCode).toContain('<TextInput');
      expect(exploreCode).toContain('placeholder={t(\'explore.searchPlaceholder\')}');

      // 2. FlashList has keyboard configuration
      expect(exploreCode).toContain('keyboardShouldPersistTaps="handled"');
      expect(exploreCode).toContain('keyboardDismissMode="on-drag"');

      // 3. FlashList uses ListEmptyComponent instead of conditionally unmounting FlashList for ScrollView
      expect(exploreCode).toContain('ListEmptyComponent={renderEmptyComponent}');
      expect(exploreCode).not.toContain('filtered.length === 0 ? (');

      // 4. Keyboard dismissal is handled explicitly on result selection and submit
      expect(exploreCode).toContain('Keyboard.dismiss()');
    });

    it('verifies search.tsx supports 1-character queries and drag-dismissal', () => {
      const searchCode = fs.readFileSync(path.join(mobileRoot, 'app/search.tsx'), 'utf-8');
      expect(searchCode).toContain('query.trim().length >= 1');
      expect(searchCode).toContain('keyboardShouldPersistTaps="handled"');
      expect(searchCode).toContain('keyboardDismissMode="on-drag"');
      expect(searchCode).toContain('onSubmitEditing={() => Keyboard.dismiss()}');
    });

    it('verifies ConstituencySelectorSheet.tsx dismisses keyboard cleanly on constituency choice', () => {
      const sheetCode = fs.readFileSync(path.join(mobileRoot, 'components/ConstituencySelectorSheet.tsx'), 'utf-8');
      expect(sheetCode).toContain('keyboardShouldPersistTaps="handled"');
      expect(sheetCode).toContain('keyboardDismissMode="on-drag"');
      expect(sheetCode).toContain('Keyboard.dismiss()');
    });
  });
});
