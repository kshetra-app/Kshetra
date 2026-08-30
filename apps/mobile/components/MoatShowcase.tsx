import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PlatformMoat } from '../lib/electionLiveTypes';

interface MoatShowcaseProps {
  moats: PlatformMoat[];
}

export default function MoatShowcase({ moats }: MoatShowcaseProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Platform Moat</Text>
      <Text style={styles.subtitle}>Defensible advantages that compound over time</Text>

      {moats.map((moat) => (
        <View key={moat.id} style={[styles.moatCard, { borderLeftColor: moat.color }]}>
          <View style={styles.moatHeader}>
            <View style={[styles.moatIcon, { backgroundColor: moat.color + '20' }]}>
              <Ionicons name={moat.icon as any} size={20} color={moat.color} />
            </View>
            <View style={styles.moatInfo}>
              <Text style={styles.moatLabel}>{moat.label}</Text>
              <Text style={[styles.moatMetric, { color: moat.color }]}>{moat.metric}</Text>
            </View>
          </View>
          <Text style={styles.moatDesc}>{moat.description}</Text>
          {moat.competitorComparison && (
            <View style={styles.compRow}>
              <Ionicons name="shield-checkmark" size={12} color="#F59E0B" />
              <Text style={styles.compText}>{moat.competitorComparison}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '900', color: '#241814', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#988275', textAlign: 'center', marginBottom: 16 },
  moatCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E8DED1', borderLeftWidth: 3 },
  moatHeader: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  moatIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  moatInfo: { flex: 1 },
  moatLabel: { fontSize: 15, fontWeight: '700', color: '#241814' },
  moatMetric: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  moatDesc: { fontSize: 12, color: '#6D5549', lineHeight: 17, marginBottom: 6 },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F59E0B10', padding: 8, borderRadius: 8 },
  compText: { fontSize: 11, color: '#F59E0B', fontWeight: '600', flex: 1 },
});
