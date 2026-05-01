// Minimal entry point — bypass expo-router to diagnose native crash
import { AppRegistry, View, Text, StyleSheet } from 'react-native';

function MinimalApp() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kshetra</Text>
      <Text style={styles.body}>If you can see this, the native layer works!</Text>
      <Text style={styles.body}>The crash is in expo-router or app imports.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 16 },
  body: { fontSize: 16, color: '#9CA3AF', textAlign: 'center', lineHeight: 24 },
});

AppRegistry.registerComponent('main', () => MinimalApp);
