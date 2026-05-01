import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../stores/auth';
import ErrorBoundary from '../components/ErrorBoundary';
import { useTheme } from '../lib/useTheme';
import { usePushNotifications } from '../lib/usePushNotifications';
import { useNetworkStore } from '../lib/networkStatus';
import OfflineBanner from '../components/OfflineBanner';
import { initErrorReporting, setUser } from '../lib/errorReporting';
import '../i18n';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initializeAuth = useAuthStore((s) => s.initialize);
  const { colors, isDark } = useTheme();
  usePushNotifications();
  const startNetworkMonitoring = useNetworkStore((s) => s.startMonitoring);

  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    initErrorReporting();
    initializeAuth();
    SplashScreen.hideAsync();
    const stopNetwork = startNetworkMonitoring();
    return () => { if (stopNetwork) stopNetwork(); };
  }, [initializeAuth, startNetworkMonitoring]);

  useEffect(() => {
    setUser(user?.id ?? null, user?.email ?? undefined);
  }, [user]);

  return (
    <ErrorBoundary fallbackMessage="Kshetra encountered an error. Please restart the app.">
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={colors.statusBar} />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#0A0A1A' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="constituency/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0A0A1A' },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="auth/sign-in"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0A0A1A' },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0A0A1A' },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="ai-chat"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0A0A1A' },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
