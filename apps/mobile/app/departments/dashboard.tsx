import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLiveExchangeStore } from '../../stores/liveExchange';
import type { AlertAcknowledgment, DepartmentAlert } from '../../lib/lmxTypes';
import { DEPARTMENT_CONFIG, ACK_CONFIG, TIER_CONFIG } from '../../lib/lmxTypes';

/**
 * Department Console — in-app simulation of the Kshetra-hosted department
 * dashboard (doc Section 12, 17). A subscribed office sees reporter-initiated
 * alerts routed to it by jurisdiction, with feed access + AI context, and
 * acknowledges each as genuine / false / unable-to-verify. That acknowledgment
 * feeds directly back into the reporter's credibility score (doc Section 12.6).
 */
export default function DepartmentDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const departments = useLiveExchangeStore((s) => s.departments);
  const alerts = useLiveExchangeStore((s) => s.alerts);
  const getEventById = useLiveExchangeStore((s) => s.getEventById);
  const acknowledgeAlert = useLiveExchangeStore((s) => s.acknowledgeAlert);

  const [departmentId, setDepartmentId] = useState<string>(departments[0]?.id ?? '');

  const selectedDept = departments.find((d) => d.id === departmentId);

  const inbox = useMemo(
    () =>
      alerts
        .filter((a) => a.departmentId === departmentId)
        .sort((a, b) => new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime()),
    [alerts, departmentId],
  );

  const pending = inbox.filter((a) => !a.acknowledgment).length;

  const ack = (alertId: string, verdict: AlertAcknowledgment) =>
    acknowledgeAlert(alertId, verdict, selectedDept?.officeName ?? 'department');

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Department Console</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Department picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.deptRow}
      >
        {departments.map((d) => {
          const cfg = DEPARTMENT_CONFIG[d.departmentType];
          const active = d.id === departmentId;
          const cnt = alerts.filter((a) => a.departmentId === d.id && !a.acknowledgment).length;
          return (
            <Pressable
              key={d.id}
              onPress={() => setDepartmentId(d.id)}
              style={[styles.deptChip, active && { backgroundColor: cfg.color + '22', borderColor: cfg.color }]}
            >
              <Ionicons name={cfg.icon as any} size={14} color={active ? cfg.color : '#9CA3AF'} />
              <Text style={[styles.deptChipText, active && { color: cfg.color }]} numberOfLines={1}>
                {d.officeName}
              </Text>
              {cnt > 0 && (
                <View style={styles.cntBadge}>
                  <Text style={styles.cntText}>{cnt}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedDept && (
        <View style={styles.deptInfo}>
          <View style={styles.deptInfoRow}>
            <Ionicons name="location" size={12} color="#6B7280" />
            <Text style={styles.deptInfoText}>
              {[selectedDept.districtName, selectedDept.stateCode].filter(Boolean).join(', ')} ·{' '}
              {selectedDept.jurisdictionType.replace('_', ' ')}
            </Text>
          </View>
          <View style={[styles.subBadge, { backgroundColor: selectedDept.verified ? '#10B98122' : '#F59E0B22' }]}>
            <Ionicons
              name={selectedDept.verified ? 'shield-checkmark' : 'time'}
              size={11}
              color={selectedDept.verified ? '#10B981' : '#F59E0B'}
            />
            <Text style={[styles.subText, { color: selectedDept.verified ? '#10B981' : '#F59E0B' }]}>
              {selectedDept.subscriptionStatus} · {selectedDept.deliveryMethod}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {inbox.length} alert(s) · {pending} awaiting acknowledgment
        </Text>
      </View>

      <FlatList
        data={inbox}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <AlertCard alert={item} eventName={getEventById(item.liveEventId)?.reporterName} onAck={ack}
            onOpen={() => router.push(`/live/${item.liveEventId}` as any)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off" size={40} color="#374151" />
            <Text style={styles.emptyText}>No alerts routed to this office yet</Text>
          </View>
        }
      />
    </View>
  );
}

function AlertCard({
  alert,
  eventName,
  onAck,
  onOpen,
}: {
  alert: DepartmentAlert;
  eventName?: string;
  onAck: (id: string, verdict: AlertAcknowledgment) => void;
  onOpen: () => void;
}) {
  const dcfg = DEPARTMENT_CONFIG[alert.departmentType];
  const acked = alert.acknowledgment ? ACK_CONFIG[alert.acknowledgment] : null;
  const event = useLiveExchangeStore((s) => s.getEventById(alert.liveEventId));

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: dcfg.color + '22' }]}>
          <Ionicons name={dcfg.icon as any} size={18} color={dcfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{dcfg.label} alert</Text>
          <Text style={styles.cardMeta}>
            {eventName ?? 'Reporter'} · {new Date(alert.dispatchedAt).toLocaleTimeString()}
          </Text>
        </View>
        {event && (
          <View style={[styles.tierBadge, { borderColor: TIER_CONFIG[event.accreditationTier].color }]}>
            <Text style={[styles.tierText, { color: TIER_CONFIG[event.accreditationTier].color }]}>
              {TIER_CONFIG[event.accreditationTier].label}
            </Text>
          </View>
        )}
      </View>

      {!!alert.aiSummary && <Text style={styles.aiSummary}>{alert.aiSummary}</Text>}

      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Ionicons name="location" size={12} color="#6B7280" />
          <Text style={styles.statText}>
            {alert.gpsLat?.toFixed(3)}, {alert.gpsLng?.toFixed(3)}
          </Text>
        </View>
        {event && (
          <View style={styles.stat}>
            <Ionicons name="pulse" size={12} color="#10B981" />
            <Text style={styles.statText}>Credibility {Math.round(event.credibilityScore)}</Text>
          </View>
        )}
      </View>

      <Pressable style={styles.watchBtn} onPress={onOpen}>
        <Ionicons name="play-circle" size={16} color="#4F8EF7" />
        <Text style={styles.watchText}>Watch live feed</Text>
      </Pressable>

      {acked ? (
        <View style={[styles.ackedBar, { backgroundColor: acked.color + '18' }]}>
          <Ionicons name={acked.icon as any} size={15} color={acked.color} />
          <Text style={[styles.ackedText, { color: acked.color }]}>
            Acknowledged: {acked.label}
          </Text>
        </View>
      ) : (
        <View style={styles.ackRow}>
          {(Object.keys(ACK_CONFIG) as AlertAcknowledgment[]).map((v) => {
            const cfg = ACK_CONFIG[v];
            return (
              <Pressable
                key={v}
                onPress={() => onAck(alert.id, v)}
                style={[styles.ackBtn, { borderColor: cfg.color }]}
              >
                <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                <Text style={[styles.ackBtnText, { color: cfg.color }]}>{cfg.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  deptRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  deptChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 220,
    borderWidth: 1, borderColor: '#1F2937', backgroundColor: '#111827',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  deptChipText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', flexShrink: 1 },
  cntBadge: { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  cntText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
  deptInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 10 },
  deptInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deptInfoText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  subBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  subText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  summaryRow: { paddingHorizontal: 16, marginTop: 12 },
  summaryText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#111827', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: '#1F2937' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#F9FAFB' },
  cardMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  tierBadge: { borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  tierText: { fontSize: 9, fontWeight: '800' },
  aiSummary: { fontSize: 12, color: '#C4B5FD', lineHeight: 17, marginTop: 10 },
  cardStats: { flexDirection: 'row', gap: 14, marginTop: 10 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  watchBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  watchText: { fontSize: 12, color: '#4F8EF7', fontWeight: '700' },
  ackRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  ackBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1, paddingVertical: 9, borderRadius: 9,
  },
  ackBtnText: { fontSize: 10, fontWeight: '800' },
  ackedBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 10, borderRadius: 9 },
  ackedText: { fontSize: 12, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
});
