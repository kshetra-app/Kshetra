import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

/** Check for incoming messages while a chat view is visible. */
export function useForegroundChatRefresh(refresh: () => Promise<void>) {
  useFocusEffect(
    useCallback(() => {
      let active = true;
      let running = false;
      const tick = () => {
        if (!active || running || AppState.currentState !== 'active') return;
        running = true;
        void refresh()
          .catch(() => undefined)
          .finally(() => { running = false; });
      };
      tick();
      const timer = setInterval(tick, 4000);
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') tick();
      });
      return () => {
        active = false;
        clearInterval(timer);
        subscription.remove();
      };
    }, [refresh]),
  );
}
