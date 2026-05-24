import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Bill } from '../lib/civicMetricsTypes';
import { getBillStatusLabel } from '../lib/civicMetricsTypes';

interface BillCardProps {
  bill: Bill;
  onPress?: () => void;
  onSupport?: () => void;
  onOppose?: () => void;
}

export default function BillCard({ bill, onPress, onSupport, onOppose }: BillCardProps) {
  const totalOpinion = bill.publicOpinion.support + bill.publicOpinion.oppose + bill.publicOpinion.neutral;
  const supportPct = totalOpinion > 0 ? Math.round((bill.publicOpinion.support / totalOpinion) * 100) : 0;

  const statusColor = bill.status === 'enacted' ? '#10B981' : bill.status === 'lapsed' || bill.status === 'withdrawn' ? '#EF4444' : '#3B82F6';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: bill.type === 'money' || bill.type === 'finance' ? '#F59E0B20' : '#3B82F620' }]}>
          <Text style={[styles.typeText, { color: bill.type === 'money' || bill.type === 'finance' ? '#F59E0B' : '#3B82F6' }]}>{bill.type.replace('_', ' ').toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{getBillStatusLabel(bill.status)}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{bill.title}</Text>
      <Text style={styles.meta}>Introduced by {bill.introducedBy} ({bill.introducedByParty}) · {bill.houseIntroduced.replace('_', ' ')}</Text>

      <Text style={styles.summary} numberOfLines={3}>{bill.summary}</Text>

      {/* Timeline */}
      {bill.timeline.length > 0 && (
        <View style={styles.timelineRow}>
          <Ionicons name="time" size={12} color="#6B7280" />
          <Text style={styles.timelineText}>{bill.timeline[bill.timeline.length - 1].action} ({bill.timeline[bill.timeline.length - 1].date})</Text>
        </View>
      )}

      {/* Public Opinion */}
      <View style={styles.opinionSection}>
        <Text style={styles.opinionLabel}>Public Opinion ({totalOpinion.toLocaleString()} votes)</Text>
        <View style={styles.opinionBar}>
          <View style={[styles.opinionFill, { width: `${supportPct}%`, backgroundColor: '#10B981' }]} />
        </View>
        <View style={styles.opinionActions}>
          <Pressable style={styles.opinionButton} onPress={onSupport}>
            <Ionicons name="thumbs-up" size={14} color="#10B981" />
            <Text style={[styles.opinionCount, { color: '#10B981' }]}>{bill.publicOpinion.support}</Text>
          </Pressable>
          <Text style={styles.opinionPct}>{supportPct}% support</Text>
          <Pressable style={styles.opinionButton} onPress={onOppose}>
            <Ionicons name="thumbs-down" size={14} color="#EF4444" />
            <Text style={[styles.opinionCount, { color: '#EF4444' }]}>{bill.publicOpinion.oppose}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 16, marginHorizontal: 16, marginVertical: 6, padding: 14, borderWidth: 1, borderColor: '#1F2937' },
  header: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 9, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  title: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', lineHeight: 20, marginBottom: 4 },
  meta: { fontSize: 11, color: '#6B7280', marginBottom: 8 },
  summary: { fontSize: 13, color: '#9CA3AF', lineHeight: 18, marginBottom: 10 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10, backgroundColor: '#0D1117', padding: 8, borderRadius: 8 },
  timelineText: { fontSize: 11, color: '#9CA3AF', flex: 1 },
  opinionSection: { borderTopWidth: 1, borderTopColor: '#1F2937', paddingTop: 10 },
  opinionLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
  opinionBar: { height: 6, backgroundColor: '#EF444430', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  opinionFill: { height: '100%', borderRadius: 3 },
  opinionActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  opinionButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  opinionCount: { fontSize: 12, fontWeight: '700' },
  opinionPct: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
});
