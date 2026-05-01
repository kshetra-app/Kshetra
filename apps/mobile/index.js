// Diagnostic entry — test all imports before rendering anything
import { AppRegistry, View, Text, ScrollView, StyleSheet } from 'react-native';

// Capture ALL errors globally
const errors = [];
const origHandler = global.ErrorUtils?.getGlobalHandler();
global.ErrorUtils?.setGlobalHandler((error, isFatal) => {
  errors.push(`[${isFatal ? 'FATAL' : 'ERROR'}] ${error?.message || error}\n${error?.stack || ''}`);
  // Don't call origHandler — prevent crash
});

// Test each import individually
const status = [];

try { require('@expo/metro-runtime'); status.push('metro-runtime: OK'); }
catch (e) { status.push('metro-runtime: SKIP (expected)'); }

let App = null;
try { App = require('expo-router/build/qualified-entry').App; status.push('qualified-entry: OK'); }
catch (e) { status.push('qualified-entry: FAIL - ' + (e?.message || e)); errors.push(e?.stack || ''); }

let renderRoot = null;
try { renderRoot = require('expo-router/build/renderRootComponent').renderRootComponent; status.push('renderRootComponent: OK'); }
catch (e) { status.push('renderRootComponent: FAIL - ' + (e?.message || e)); errors.push(e?.stack || ''); }

// Always show diagnostic screen
function DiagApp() {
  return (
    <View style={ds.container}>
      <Text style={ds.title}>Boot Diagnostic</Text>
      <ScrollView style={ds.scroll}>
        <Text style={ds.label}>Import Status:</Text>
        {status.map((s, i) => (
          <Text key={i} style={s.includes('FAIL') ? ds.fail : ds.ok}>{s}</Text>
        ))}
        <Text style={ds.label}>{'\n'}Global Errors ({errors.length}):</Text>
        {errors.length === 0
          ? <Text style={ds.ok}>None captured</Text>
          : errors.map((e, i) => <Text key={i} style={ds.fail} selectable>{e}</Text>)
        }
        <Text style={ds.label}>{'\n'}App component: {App ? 'LOADED' : 'NULL'}</Text>
        <Text style={ds.label}>renderRoot: {renderRoot ? 'LOADED' : 'NULL'}</Text>
      </ScrollView>
    </View>
  );
}

const ds = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A', paddingTop: 60, paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 16 },
  scroll: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 12 },
  label: { fontSize: 14, fontWeight: '700', color: '#9CA3AF', marginTop: 8 },
  ok: { fontSize: 13, color: '#34D399', marginTop: 4, fontFamily: 'monospace' },
  fail: { fontSize: 13, color: '#F87171', marginTop: 4, fontFamily: 'monospace' },
});

AppRegistry.registerComponent('main', () => DiagApp);
