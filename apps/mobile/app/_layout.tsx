import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../stores/auth';
import ErrorBoundary from '../components/ErrorBoundary';
import { useTheme } from '../lib/useTheme';
import { usePushNotifications } from '../lib/usePushNotifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initializeAuth = useAuthStore((s) => s.initialize);
  const { colors, isDark } = useTheme();
  usePushNotifications();

  useEffect(() => {
    initializeAuth();
    SplashScreen.hideAsync();
  }, [initializeAuth]);

  return (
    <ErrorBoundary fallbackMessage="Kshetra encountered an error. Please restart the app.">
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={colors.statusBar} />
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
