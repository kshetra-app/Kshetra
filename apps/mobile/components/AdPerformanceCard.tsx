import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AdCreative } from '../lib/campaignTypes';
import { AD_FORMAT_CONFIG, formatBudget } from '../lib/campaignTypes';

interface AdPerformanceCardProps {
  ad: AdCreative;
  onPress?: () => void;
  onPause?: () => void;
}

export default function AdPerformanceCard({ ad, onPress, onPause }: AdPerformanceCardProps) {
  const formatConfig = AD_FORMAT_CONFIG[ad.format];
  const perf = ad.performance;
  const isActive = ad.status === 'active';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.formatBadge, { backgroundColor: '#4F8EF715' }]}>
          <Ionicons name={formatConfig.icon as any} size={12} color="#4F8EF7" />
          <Text style={styles.formatLabel}>{formatConfig.label}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isActive ? '#10B98120' : ad.status === 'paused' ? '#F59E0B20' : '#6B728020' }]}>
          <Text style={[styles.statusText, { color: isActive ? '#10B981' : ad.status === 'paused' ? '#F59E0B' : '#6B7280' }]}>{ad.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.name}>{ad.name}</Text>
      <Text style={styles.headline} numberOfLines={1}>{ad.headline}</Text>

      {/* Performance KPIs */}
      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Text style={styles.kpiValue}>{perf.impressions > 1000000 ? `${(perf.impressions / 1000000).toFixed(1)}M` : `${Math.round(perf.impressions / 1000)}K`}</Text>
          <Text style={styles.kpiLabel}>Impressions</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={[styles.kpiValue, { color: '#10B981' }]}>{perf.ctr.toFixed(1)}%</Text>
          <Text style={styles.kpiLabel}>CTR</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiValue}>{formatBudget(perf.spend)}</Text>
          <Text style={styles.kpiLabel}>Spent</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={[styles.kpiValue, { color: perf.roi > 200 ? '#10B981' : '#F59E0B' }]}>{perf.roi}%</Text>
          <Text style={styles.kpiLabel}>ROI</Text>
        </View>
      </View>

      {/* Sentiment */}
      <View style={styles.sentimentRow}>
        <Text style={styles.sentimentLabel}>Sentiment:</Text>
        <View style={styles.sentimentBar}>
          <View style={[styles.sentimentFill, { width: `${perf.sentimentPositive}%`, backgroundColor: '#10B981' }]} />
          <View style={[styles.sentimentFill, { width: `${perf.sentimentNeutral}%`, backgroundColor: '#6B7280' }]} />
          <View style={[styles.sentimentFill, { width: `${perf.sentimentNegative}%`, backgroundColor: '#EF4444' }]} />
        </View>
        <Text style={styles.sentimentPct}>{perf.sentimentPositive}% +</Text>
      </View>

      {/* ECI Compliance */}
      <View style={styles.complianceRow}>
        <Ionicons name={ad.isECICompliant ? 'checkmark-circle' : 'warning'} size={14} color={ad.isECICompliant ? '#10B981' : '#EF4444'} />
        <Text style={[styles.complianceText, { color: ad.isECICompliant ? '#10B981' : '#EF4444' }]}>{ad.isECICompliant ? 'ECI Compliant' : 'Compliance Issue'}</Text>
        {ad.disclosureText && <Text style={styles.disclosureText} numberOfLines={1}>Paid by: {ad.paidForBy}</Text>}
      </View>

      {/* Actions */}
      {isActive && onPause && (
        <Pressable style={styles.pauseButton} onPress={onPause}>
          <Ionicons name="pause" size={14} color="#F59E0B" />
          <Text style={styles.pauseText}>Pause Ad</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 16, marginHorizontal: 16, marginVertical: 6, padding: 14, borderWidth: 1, borderColor: '#1F2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  formatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  formatLabel: { fontSize: 11, fontWeight: '700', color: '#4F8EF7' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  headline: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingVertical: 8, backgroundColor: '#0D1117', borderRadius: 10, paddingHorizontal: 12 },
  kpi: { alignItems: 'center' },
  kpiValue: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  kpiLabel: { fontSize: 9, color: '#6B7280', marginTop: 2, fontWeight: '600' },
  sentimentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sentimentLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  sentimentBar: { flex: 1, height: 6, flexDirection: 'row', borderRadius: 3, overflow: 'hidden' },
  sentimentFill: { height: '100%' },
  sentimentPct: { fontSize: 11, color: '#10B981', fontWeight: '700', minWidth: 36, textAlign: 'right' },
  complianceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1F2937' },
  complianceText: { fontSize: 11, fontWeight: '700' },
  disclosureText: { fontSize: 10, color: '#6B7280', flex: 1, textAlign: 'right' },
  pauseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 8, backgroundColor: '#F59E0B10', borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B30' },
  pauseText: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
});
