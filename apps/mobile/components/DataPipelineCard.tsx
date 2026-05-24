import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DataPipelineStatus } from '../lib/electionLiveTypes';
import { getDataFreshnessColor, getDataFreshnessLabel } from '../lib/electionLiveTypes';

interface DataPipelineCardProps {
  pipeline: DataPipelineStatus[];
  onRefresh?: () => void;
}

function PipelineRow({ item }: { item: DataPipelineStatus }) {
  const freshnessColor = getDataFreshnessColor(item.freshness);
  return (
    <View style={styles.row}>
      <View style={[styles.healthDot, { backgroundColor: item.isHealthy ? '#10B981' : '#EF4444' }]} />
      <View style={styles.rowInfo}>
        <Text style={styles.sourceName}>{item.source}</Text>
        <Text style={[styles.freshness, { color: freshnessColor }]}>{getDataFreshnessLabel(item.freshness)}</Text>
      </View>
      <View style={styles.rowStats}>
        <Text style={styles.recordCount}>{item.recordCount > 0 ? item.recordCount.toLocaleString() : '-'}</Text>
        <Text style={styles.recordLabel}>records</Text>
      </View>
    </View>
  );
}

export default function DataPipelineCard({ pipeline, onRefresh }: DataPipelineCardProps) {
  const healthy = pipeline.filter((p) => p.isHealthy).length;
  const total = pipeline.length;
  const overallHealthy = healthy === total;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="git-network" size={18} color="#4F8EF7" />
          <Text style={styles.title}>Data Pipeline</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.healthBadge, { backgroundColor: overallHealthy ? '#10B98120' : '#EF444420' }]}>
            <View style={[styles.healthDotLarge, { backgroundColor: overallHealthy ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.healthText, { color: overallHealthy ? '#10B981' : '#EF4444' }]}>{healthy}/{total} healthy</Text>
          </View>
          {onRefresh && (
            <Pressable onPress={onRefresh} hitSlop={8}>
              <Ionicons name="refresh" size={18} color="#6B7280" />
            </Pressable>
          )}
        </View>
      </View>

      {pipeline.map((item) => (
        <PipelineRow key={item.source} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  healthDotLarge: { width: 8, height: 8, borderRadius: 4 },
  healthText: { fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1F293740' },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
  rowInfo: { flex: 1 },
  sourceName: { fontSize: 13, fontWeight: '600', color: '#D1D5DB' },
  freshness: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  rowStats: { alignItems: 'flex-end' },
  recordCount: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  recordLabel: { fontSize: 9, color: '#6B7280' },
});
