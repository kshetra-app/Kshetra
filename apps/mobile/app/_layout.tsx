import { useEffect, lazy, Suspense } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../stores/auth';
import ErrorBoundary from '../components/ErrorBoundary';
import { useTheme } from '../lib/useTheme';
import { usePushNotifications } from '../lib/usePushNotifications';
import { useNetworkStore } from '../lib/networkStatus';
import OfflineBanner from '../components/OfflineBanner';
import { useContributorVerificationStore } from '../stores/contributorVerification';
import '../i18n';

const KYCVerificationSheet = lazy(() => import('../components/KYCVerificationSheet'));

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initializeAuth = useAuthStore((s) => s.initialize);
  const { colors, isDark } = useTheme();
  usePushNotifications();
  const startNetworkMonitoring = useNetworkStore((s) => s.startMonitoring);
  const showKYCSheet = useContributorVerificationStore((s) => s.showKYCSheet);

  useEffect(() => {
    initializeAuth();
    SplashScreen.hideAsync();
    const stopNetwork = startNetworkMonitoring();
    return () => { if (stopNetwork) stopNetwork(); };
  }, [initializeAuth, startNetworkMonitoring]);

  return (
    <ErrorBoundary fallbackMessage="Kshetra encountered an error. Please restart the app.">
    <SafeAreaProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={colors.statusBar} />
      <OfflineBanner />
      {showKYCSheet && (
        <Suspense fallback={null}>
          <KYCVerificationSheet />
        </Suspense>
      )}
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
        <Stack.Screen
          name="parliament/index"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="delimitation/index"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="delimitation/my-impact"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="candidate-xray/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0A0A1A' },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="issue/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#030712' },
            headerTintColor: '#FFFFFF',
            headerShadowVisible: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="notification-settings"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0A0A1A' },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0A0A1A' },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="leadership-academy"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="analytics/index"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="legislator/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0A0A1A' },
            headerTintColor: '#FFFFFF',
            headerShadowVisible: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="journalist/index"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="politician-portal/index"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="campaign-manager/index"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="civic-metrics/index"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="live-election/index"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="investor-demo/index"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="hierarchy/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0A0A1A' },
            headerTintColor: '#FFFFFF',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="local-bodies/index"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0A0A1A' },
            headerTintColor: '#FFFFFF',
            headerShadowVisible: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="representative/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0A0A1A' },
            headerTintColor: '#FFFFFF',
            headerShadowVisible: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="representative/edit/[id]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0A0A1A' },
            headerTintColor: '#FFFFFF',
            headerShadowVisible: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="reader"
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}
