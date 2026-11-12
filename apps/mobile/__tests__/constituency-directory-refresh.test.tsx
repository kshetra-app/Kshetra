jest.mock('../lib/environment', () => ({ IS_LIVE_ENVIRONMENT: true }));
jest.mock('../lib/api', () => ({
  apiClient: {
    constituencies: {
      listConstituencies: jest.fn(),
    },
  },
}));
jest.mock('../lib/stateDataAdapter', () => ({
  getUnifiedConstituenciesForState: jest.fn(() => []),
  toGeographyOnlyConstituency: jest.fn((record) => record),
}));

import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useConstituencyDirectory } from '../lib/useConstituencyDirectory';

const DIRECTORY_TTL_MS = 5 * 60 * 1000;
const AUTO_REFRESH_CHECK_INTERVAL_MS = 60 * 1000;

describe('live constituency directory refresh', () => {
  const listConstituencies = jest.requireMock('../lib/api').apiClient.constituencies
    .listConstituencies as jest.Mock;
  let appState = 'active';
  let onAppStateChange: ((nextState: AppStateStatus) => void) | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    appState = 'active';
    onAppStateChange = undefined;
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => appState,
    });
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      onAppStateChange = listener as (nextState: AppStateStatus) => void;
      return { remove: jest.fn() };
    });
    listConstituencies.mockImplementation(async (stateCode: string) => ({
      state: stateCode,
      count: 0,
      data: [],
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('revalidates while the app remains active past the cache lifetime', async () => {
    const { unmount } = renderHook(() => useConstituencyDirectory('KA'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listConstituencies).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(DIRECTORY_TTL_MS - AUTO_REFRESH_CHECK_INTERVAL_MS);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listConstituencies).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(AUTO_REFRESH_CHECK_INTERVAL_MS);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listConstituencies).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('revalidates when the app returns from the background', async () => {
    const { unmount } = renderHook(() => useConstituencyDirectory('TS'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listConstituencies).toHaveBeenCalledTimes(1);

    appState = 'background';
    await act(async () => onAppStateChange?.('background'));
    await act(async () => {
      jest.advanceTimersByTime(DIRECTORY_TTL_MS - AUTO_REFRESH_CHECK_INTERVAL_MS);
      await Promise.resolve();
    });
    expect(listConstituencies).toHaveBeenCalledTimes(1);

    appState = 'active';
    await act(async () => {
      onAppStateChange?.('active');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listConstituencies).toHaveBeenCalledTimes(2);
    unmount();
  });
});
