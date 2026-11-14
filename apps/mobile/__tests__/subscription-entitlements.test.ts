jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { getEffectiveTierConfig } from '../stores/subscription';

describe('subscription entitlements', () => {
  it('does not use a locally stored paid tier as production authority', () => {
    const config = getEffectiveTierConfig('institutional', true);

    expect(config.label).toBe('Free');
    expect(config.exportFormats).toEqual(['csv', 'xlsx', 'pdf']);
    expect(config.maxExportsPerMonth).toBe(-1);
    expect(config.maxIssuesPerExport).toBe(-1);
  });

  it('keeps development tier previews available outside live environments', () => {
    const config = getEffectiveTierConfig('pro', false);

    expect(config.label).toBe('Pro');
    expect(config.exportFormats).toEqual(['csv', 'xlsx', 'pdf']);
    expect(config.maxExportsPerMonth).toBe(10);
    expect(config.maxIssuesPerExport).toBe(50);
  });
});
