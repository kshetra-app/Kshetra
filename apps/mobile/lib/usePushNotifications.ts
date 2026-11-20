import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRootNavigationState, useRouter } from 'expo-router';
import { requestPermissions, getPushToken } from './notifications';
import { useNotificationsStore } from '../stores/notifications';
import { useAuthStore } from '../stores/auth';
import { registerPushToken } from './supabaseDataService';
import { apiClient } from './api';
import type { AlertCategory } from './notifications';

const HANDLED_TAPS_KEY = 'poligram-handled-notification-taps';
const HANDLED_TAPS_LIMIT = 40;

export function getNotificationTap(response: Notifications.NotificationResponse) {
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const request = response.notification?.request;
  const content = request?.content;
  // Android can also emit a response for ordinary launcher intent extras.
  const title = typeof content?.title === 'string' ? content.title.trim() : '';
  const body = typeof content?.body === 'string' ? content.body.trim() : '';
  if (typeof request?.identifier !== 'string' || !request.identifier.trim() || !content || !(title || body)) {
    return null;
  }
  const data = content.data;
  const category = typeof data?.category === 'string' ? data.category : undefined;
  return { id: request.identifier, route: resolveNotificationRoute(data, category) };
}

/**
 * Resolves target application route from notification payload data and category.
 * Provides deterministic, deep-link navigation across all entity types.
 */
export function resolveNotificationRoute(
  data?: Record<string, unknown>,
  category?: AlertCategory | string,
): string {
  if (!data && !category) return '/notifications';

  // 1. Explicit deep link route
  const route = typeof data?.route === 'string' ? data.route.trim() : '';
  if (route.startsWith('/') && !route.startsWith('//')) return route;

  // 2. Entity-specific route resolution
  if (data?.issueId && typeof data.issueId === 'string') {
    return `/issue/${data.issueId}`;
  }
  if (data?.constituencyId && typeof data.constituencyId === 'string') {
    return `/constituency/${data.constituencyId}`;
  }
  if (data?.conversationId && typeof data.conversationId === 'string') {
    return `/messages/${data.conversationId}`;
  }
  if (data?.candidateId && typeof data.candidateId === 'string') {
    return `/candidate-xray/${data.candidateId}`;
  }
  if (data?.legislatorId && typeof data.legislatorId === 'string') {
    return `/legislator/${data.legislatorId}`;
  }
  if (data?.representativeId && typeof data.representativeId === 'string') {
    return `/representative/${data.representativeId}`;
  }
  if (data?.shortId && typeof data.shortId === 'string') {
    return `/(tabs)/shorts`;
  }
  if (data?.postId && typeof data.postId === 'string') {
    return `/(tabs)/feed`;
  }
  if (data?.delimitationState && typeof data.delimitationState === 'string') {
    return `/delimitation/state/${data.delimitationState.toUpperCase()}`;
  }

  // 3. Category-level fallbacks
  switch (category) {
    case 'civic_issue':
      return '/(tabs)/dashboard';
    case 'promise_update':
      return '/(tabs)/dashboard';
    case 'election_results':
      return '/live-election';
    case 'delimitation_alert':
      return '/delimitation';
    case 'community_activity':
      return '/(tabs)/feed';
    case 'constituency_updates':
      return data?.constituencyId ? `/constituency/${data.constituencyId}` : '/(tabs)/explore';
    default:
      return '/notifications';
  }
}

/**
 * Hook that handles:
 * 1. Requesting notification permissions on mount
 * 2. Registering the push token with Supabase and Fastify API Gateway
 * 3. Listening for incoming notifications in foreground
 * 4. Adding received notifications to the in-app store
 * 5. Handling notification tap -> deep link payload routing
 */
export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const router = useRouter();
  const navigationReady = Boolean(useRootNavigationState()?.key);
  const user = useAuthStore((s) => s.user);
  const addNotification = useNotificationsStore((s) => s.addNotification);
  const enabled = useNotificationsStore((s) => s.enabled);

  const registeredTokenRef = useRef<string | null>(null);

  // Register push token
  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    async function register() {
      const granted = await requestPermissions();
      if (!granted || !mounted) return;

      const token = await getPushToken();
      if (!token || !mounted) return;

      setExpoPushToken(token);

      // Register with Supabase and backend if user is authenticated
      if (user?.id) {
        // Only register if token/user has not already been registered in this session
        const registrationKey = `${user.id}:${token}`;
        if (registeredTokenRef.current === registrationKey) {
          return;
        }

        try {
          const platform = Platform.OS === 'ios' ? 'ios' : 'android';
          await registerPushToken(user.id, token, platform);
          registeredTokenRef.current = registrationKey;

          // Register with Fastify notification gateway
          await apiClient.notifications.registerToken(
            token,
            platform,
            `${Platform.OS} ${Platform.Version}`,
          ).catch((e) => {
            console.warn('[usePushNotifications] API gateway token registration warning:', e?.message || e);
          });
        } catch (err) {
          console.warn('[usePushNotifications] Failed to register push token:', err);
        }
      }
    }

    register();

    return () => {
      mounted = false;
    };
  }, [enabled, user?.id]);

  // Listen for incoming notifications (foreground)
  useEffect(() => {
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(
        (notification) => {
          const { title, body, data } = notification.request.content;
          if (title && body) {
            addNotification({
              title,
              body,
              category: (data?.category as AlertCategory) ?? 'app_updates',
              data: data as Record<string, unknown> | undefined,
            });
          }
        },
      );
    } catch {
      // expo-notifications native module may not be available
    }

    return () => {
      try { notificationListener.current?.remove(); } catch {}
    };
  }, [addNotification]);

  // Listen for notification taps (background -> foreground)
  useEffect(() => {
    if (!navigationReady) return;
    let active = true;
    const handledTaps = AsyncStorage.getItem(HANDLED_TAPS_KEY).then((value): string[] => {
      const saved: unknown = value ? JSON.parse(value) : [];
      return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
    }).catch((): string[] => []);

    const handleTap = (response: Notifications.NotificationResponse) => {
      try { Notifications.clearLastNotificationResponse(); } catch {}
      const tap = getNotificationTap(response);
      if (!tap) return;
      void handledTaps.then((seen) => {
        if (!active || seen.includes(tap.id)) return;
        seen.push(tap.id);
        if (seen.length > HANDLED_TAPS_LIMIT) seen.shift();
        void AsyncStorage.setItem(HANDLED_TAPS_KEY, JSON.stringify(seen)).catch(() => {});
        router.push(tap.route as any);
      });
    };

    let subscription: Notifications.Subscription | undefined;
    try {
      subscription = Notifications.addNotificationResponseReceivedListener(handleTap);
      const launchResponse = Notifications.getLastNotificationResponse();
      if (launchResponse) handleTap(launchResponse);
    } catch {
      // expo-notifications native module may not be available
    }

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [navigationReady, router]);

  return { expoPushToken };
}
