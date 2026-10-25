import { useCallback, useEffect, useState } from 'react';
import {
  getCachedStateMapData,
  loadStateScopedMapData,
  subscribeToStateMapData,
  type StateMapDataSnapshot,
} from './stateScopedMapData';

const initialSnapshot = (): StateMapDataSnapshot => ({
  status: 'loading',
  data: null,
  error: null,
  updatedAt: null,
});

/**
 * Selected-state map data only. The cache layer publishes cached, fresh,
 * offline and unavailable transitions; callers never substitute fake seeds.
 */
export function useStateScopedMapData(stateCode: string): StateMapDataSnapshot & { retry: () => void } {
  const code = stateCode.toUpperCase();
  const [snapshot, setSnapshot] = useState<StateMapDataSnapshot>(
    () => getCachedStateMapData(code) ?? initialSnapshot(),
  );
  const [retryNonce, setRetryNonce] = useState(0);
  const retry = useCallback(() => setRetryNonce((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setSnapshot(getCachedStateMapData(code) ?? initialSnapshot());
    const unsubscribe = subscribeToStateMapData((updatedCode, next) => {
      if (active && updatedCode === code) setSnapshot(next);
    });
    void loadStateScopedMapData(code).then((next) => {
      if (active) setSnapshot(next);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [code, retryNonce]);

  return { ...snapshot, retry };
}
