/**
 * Network Status Monitor
 *
 * Tracks online/offline state using @react-native-community/netinfo.
 * Provides a Zustand store for global access + a React hook.
 * Falls back to assuming online when NetInfo is unavailable.
 */

import { create } from 'zustand';

let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo');
} catch {
  // NetInfo not available (web / missing native module)
}

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;

  /** Start monitoring network changes */
  startMonitoring: () => () => void;
}

export const useNetworkStore = create<NetworkState>()((set) => ({
  isConnected: true,
  isInternetReachable: true,
  connectionType: 'unknown',

  startMonitoring: () => {
    if (!NetInfo) return () => {};

    const unsubscribe = NetInfo.default.addEventListener((state: any) => {
      set({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type ?? 'unknown',
      });
    });

    return unsubscribe;
  },
}));

/**
 * Simple check: are we online right now?
 */
export function isOnline(): boolean {
  return useNetworkStore.getState().isConnected;
}
