// Custom entry point — wraps expo-router with crash diagnostics
import { AppRegistry, View, Text, ScrollView, StyleSheet } from 'react-native';

let _bootError = null;

try {
  // This is exactly what expo-router/entry-classic does:
  require('@expo/metro-runtime');
} catch (e) {
  _bootError = { phase: 'metro-runtime', error: e };
}

if (!_bootError) {
  try {
    const { App } = require('expo-router/build/qualified-entry');
    const { renderRootComponent } = require('expo-router/build/renderRootComponent');
    renderRootComponent(App);
  } catch (e) {
    _bootError = { phase: 'expo-router-init', error: e };
  }
}

if (_bootError) {
  function CrashApp() {
    const err = _bootError.error;
    return (
      <View style={cs.container}>
        <Text style={cs.title}>Crash in: {_bootError.phase}</Text>
        <ScrollView style={cs.scroll}>
          <Text style={cs.error} selectable>
            {err?.message || String(err)}
            {'\n\n'}
            {err?.stack || '(no stack)'}
          </Text>
        </ScrollView>
      </View>
    );
  }
  const cs = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A1A', paddingTop: 60, paddingHorizontal: 16 },
    title: { fontSize: 20, fontWeight: '800', color: '#EF4444', marginBottom: 16 },
    scroll: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 12 },
    error: { fontSize: 12, color: '#F87171', fontFamily: 'monospace', lineHeight: 18 },
  });
  AppRegistry.registerComponent('main', () => CrashApp);
}
