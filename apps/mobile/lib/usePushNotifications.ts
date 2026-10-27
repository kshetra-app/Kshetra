import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { requestPermissions, getPushToken } from './notifications';
import { useNotificationsStore } from '../stores/notifications';
import { useAuthStore } from '../stores/auth';
import { registerPushToken } from './supabaseDataService';
import { apiClient } from './api';
import type { AlertCategory } from './notifications';

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
  if (data?.route && typeof data.route === 'string' && data.route.trim().length > 0) {
    return data.route.trim();
  }

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
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const router = useRouter();
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
    try {
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const { data } = response.notification.request.content;
          const category = (data?.category as AlertCategory) ?? 'app_updates';
          const targetRoute = resolveNotificationRoute(data as Record<string, unknown> | undefined, category);
          if (targetRoute) {
            router.push(targetRoute as any);
          }
        },
      );
    } catch {
      // expo-notifications native module may not be available
    }

    return () => {
      try { responseListener.current?.remove(); } catch {}
    };
  }, [router]);

  return { expoPushToken };
}
