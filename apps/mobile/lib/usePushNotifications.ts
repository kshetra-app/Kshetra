import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { requestPermissions, getPushToken } from './notifications';
import { useNotificationsStore } from '../stores/notifications';
import { useAuthStore } from '../stores/auth';
import { API_BASE_URL } from './constants';
import { registerPushToken } from './supabaseDataService';
import type { AlertCategory } from './notifications';

/**
 * Hook that handles:
 * 1. Requesting notification permissions on mount
 * 2. Registering the push token with the API
 * 3. Listening for incoming notifications
 * 4. Adding received notifications to the in-app store
 * 5. Handling notification tap → deep link navigation
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

          // Also notify API backend for push service workers
          fetch(`${API_BASE_URL}/api/v1/notifications/register-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': user.id,
            },
            body: JSON.stringify({
              token,
              platform,
              deviceName: `${Platform.OS} ${Platform.Version}`,
            }),
          }).catch(() => {});
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

  // Listen for notification taps (background → foreground)
  useEffect(() => {
    try {
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data;
          if (data?.route && typeof data.route === 'string') {
            // Deep link: navigate to the specified route
            router.push(data.route as any);
          } else if (data?.postId && typeof data.postId === 'string') {
            // Navigate to feed (future: specific post)
            router.push('/(tabs)/feed');
          } else if (data?.issueId && typeof data.issueId === 'string') {
            // Navigate to dashboard issues
            router.push('/(tabs)/dashboard');
          } else if (data?.constituencyId && typeof data.constituencyId === 'string') {
            // Navigate to constituency detail
            router.push(`/constituency/${data.constituencyId}` as any);
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
