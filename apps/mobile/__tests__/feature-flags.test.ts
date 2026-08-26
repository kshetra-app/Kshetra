import { useFeatureFlagsStore } from '../lib/featureFlags';
import { DEFAULT_FEATURE_FLAGS } from '@kshetra/shared';

describe('Mobile Feature Flags Store', () => {
  beforeEach(() => {
    useFeatureFlagsStore.getState().resetFlags();
  });

  it('initializes with default feature flags', () => {
    const state = useFeatureFlagsStore.getState();
    expect(state.enableMap).toBe(true);
    expect(state.enableExploreSearch).toBe(true);
    expect(state.enableFeed).toBe(true);
    expect(state.enableLiveTab).toBe(true);
  });

  it('updates a single feature flag', () => {
    useFeatureFlagsStore.getState().setFlag('enableShortsTab', false);
    expect(useFeatureFlagsStore.getState().enableShortsTab).toBe(false);

    useFeatureFlagsStore.getState().setFlag('enableShortsTab', true);
    expect(useFeatureFlagsStore.getState().enableShortsTab).toBe(true);
  });

  it('batch updates feature flags', () => {
    useFeatureFlagsStore.getState().setFlags({
      enableFeed: false,
      enableDelimitation: false,
    });

    const state = useFeatureFlagsStore.getState();
    expect(state.enableFeed).toBe(false);
    expect(state.enableDelimitation).toBe(false);
    expect(state.enableMap).toBe(true); // untouched
  });

  it('resets all flags to default', () => {
    useFeatureFlagsStore.getState().setFlags({
      enableMap: false,
      enableFeed: false,
    });

    useFeatureFlagsStore.getState().resetFlags();
    expect(useFeatureFlagsStore.getState().enableMap).toBe(DEFAULT_FEATURE_FLAGS.enableMap);
    expect(useFeatureFlagsStore.getState().enableFeed).toBe(DEFAULT_FEATURE_FLAGS.enableFeed);
  });
});
