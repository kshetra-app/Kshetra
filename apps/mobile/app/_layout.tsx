import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ErrorUtils } from 'react-native';

// Capture any global errors before they crash the app
let _globalError: string | null = null;
const _origHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
  _globalError = `[${isFatal ? 'FATAL' : 'ERROR'}] ${error?.message ?? error}\n\n${error?.stack ?? ''}`;
  if (_origHandler) _origHandler(error, isFatal);
});

// Wrap all imports in try/catch to capture module-level crashes
let Stack: any;
let StatusBar: any;
let GestureHandlerRootView: any;
let SplashScreen: any;
let useAuthStore: any;
let ErrorBoundary: any;
let useTheme: any;
let usePushNotifications: any;
let useNetworkStore: any;
let OfflineBanner: any;
let initErrorReporting: any;
let setUser: any;
let _importError: string | null = null;

try {
  Stack = require('expo-router').Stack;
  StatusBar = require('expo-status-bar').StatusBar;
  GestureHandlerRootView = require('react-native-gesture-handler').GestureHandlerRootView;
  SplashScreen = require('expo-splash-screen');
  useAuthStore = require('../stores/auth').useAuthStore;
  ErrorBoundary = require('../components/ErrorBoundary').default;
  useTheme = require('../lib/useTheme').useTheme;
  usePushNotifications = require('../lib/usePushNotifications').usePushNotifications;
  useNetworkStore = require('../lib/networkStatus').useNetworkStore;
  OfflineBanner = require('../components/OfflineBanner').default;
  const errRep = require('../lib/errorReporting');
  initErrorReporting = errRep.initErrorReporting;
  setUser = errRep.setUser;
  require('../i18n');
  SplashScreen.preventAutoHideAsync();
} catch (e: any) {
  _importError = `Import error: ${e?.message ?? e}\n\n${e?.stack ?? ''}`;
}

function CrashScreen({ error }: { error: string }) {
  return (
    <View style={crashStyles.container}>
      <Text style={crashStyles.title}>⚠ Crash Diagnostic</Text>
      <Text style={crashStyles.subtitle}>Share this with the developer:</Text>
      <ScrollView style={crashStyles.scroll}>
        <Text style={crashStyles.error} selectable>{error}</Text>
      </ScrollView>
    </View>
  );
}

const crashStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A', paddingTop: 60, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#EF4444', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9CA3AF', marginBottom: 16 },
  scroll: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 12 },
  error: { fontSize: 12, color: '#F87171', fontFamily: 'monospace', lineHeight: 18 },
});

export default function RootLayout() {
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  // Show import errors
  if (_importError) return <CrashScreen error={_importError} />;

  // Show global errors
  useEffect(() => {
    const interval = setInterval(() => {
      if (_globalError && !runtimeError) setRuntimeError(_globalError);
    }, 500);
    return () => clearInterval(interval);
  }, [runtimeError]);

  if (runtimeError) return <CrashScreen error={runtimeError} />;

  // Normal app — if imports succeeded
  try {
    const initializeAuth = useAuthStore((s: any) => s.initialize);
    const { colors } = useTheme();
    usePushNotifications();
    const startNetworkMonitoring = useNetworkStore((s: any) => s.startMonitoring);
    const user = useAuthStore((s: any) => s.user);

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
  } catch (e: any) {
    return <CrashScreen error={`Render error: ${e?.message ?? e}\n\n${e?.stack ?? ''}`} />;
  }
}
