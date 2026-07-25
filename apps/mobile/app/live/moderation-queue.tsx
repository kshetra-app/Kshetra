import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { useLiveExchangeStore } from '../../stores/liveExchange';
import type { HumanDecision, LiveEvent } from '../../lib/lmxTypes';
import { ISSUE_CATEGORY_CONFIG, TIER_CONFIG, hasAI } from '../../lib/lmxTypes';

/**
 * Human moderation buffer triage (doc Section 13 Layer 3).
 * Streams sit in a short buffer before public/broadcast fan-out. Moderators
 * allow / mute / cut / escalate. AI flags (when active) extend the buffer and
 * are surfaced here — but AI never auto-kills; a human always decides.
 */
const DECISIONS: { key: HumanDecision; label: string; icon: string; color: string }[] = [
  { key: 'allow', label: 'Allow', icon: 'checkmark-circle', color: '#10B981' },
  { key: 'mute', label: 'Mute', icon: 'volume-mute', color: '#F59E0B' },
  { key: 'cut', label: 'Cut', icon: 'close-circle', color: '#EF4444' },
  { key: 'escalate', label: 'Escalate', icon: 'arrow-up-circle', color: '#8B5CF6' },
];

export default function ModerationQueueScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queue = useLiveExchangeStore(useShallow((s) => s.getModerationQueue()));
  const setHumanDecision = useLiveExchangeStore((s) => s.setHumanDecision);
  const aiServiceEnabled = useLiveExchangeStore((s) => s.aiServiceEnabled);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Moderation Queue</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.banner}>
        <Ionicons name="shield-half" size={15} color="#8B5CF6" />
        <Text style={styles.bannerText}>
          {queue.length} stream(s) in buffer.{' '}
          {aiServiceEnabled
            ? 'AI screening active — flags extend the buffer.'
            : 'AI screening off — human review only.'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {queue.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle" size={44} color="#10B981" />
            <Text style={styles.emptyText}>Queue clear — nothing awaiting review</Text>
          </View>
        ) : (
          queue.map((e) => (
            <QueueCard
              key={e.id}
              event={e}
              onDecision={(d) => setHumanDecision(e.id, d)}
              onOpen={() => router.push(`/live/${e.id}` as any)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function QueueCard({
  event,
  onDecision,
  onOpen,
}: {
  event: LiveEvent;
  onDecision: (d: HumanDecision) => void;
  onOpen: () => void;
}) {
  const cat = ISSUE_CATEGORY_CONFIG[event.issueCategory];
  const tier = TIER_CONFIG[event.accreditationTier];
  const aiOn = hasAI(event);
  const flags: string[] = [];
  if (aiOn) {
    if (event.ai?.violenceFlag) flags.push('violence');
    if (event.ai?.weaponFlag) flags.push('weapon');
    if (event.ai?.deepfakeFlag) flags.push('deepfake');
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
          <Ionicons name={cat.icon as any} size={18} color={cat.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {cat.label} · {event.locality || event.districtName || event.stateCode}
          </Text>
          <Text style={styles.cardMeta}>
            {event.reporterName} · {event.streamId} · buffer {event.bufferSeconds}s
          </Text>
        </View>
        <View style={[styles.tierBadge, { borderColor: tier.color }]}>
          <Text style={[styles.tierText, { color: tier.color }]}>{tier.label}</Text>
        </View>
      </View>

      {flags.length > 0 && (
        <View style={styles.flagRow}>
          {flags.map((f) => (
            <View key={f} style={styles.flag}>
              <Ionicons name="warning" size={11} color="#EF4444" />
              <Text style={styles.flagText}>{f}</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable style={styles.previewBtn} onPress={onOpen}>
        <Ionicons name="eye" size={15} color="#4F8EF7" />
        <Text style={styles.previewText}>Preview feed</Text>
      </Pressable>

      <View style={styles.decisionRow}>
        {DECISIONS.map((d) => (
          <Pressable
            key={d.key}
            onPress={() => onDecision(d.key)}
            style={[styles.decisionBtn, { borderColor: d.color }]}
          >
            <Ionicons name={d.icon as any} size={14} color={d.color} />
            <Text style={[styles.decisionText, { color: d.color }]}>{d.label}</Text>
          </Pressable>
        ))}
      </View>
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
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, padding: 11, backgroundColor: '#8B5CF614', borderRadius: 10,
  },
  bannerText: { flex: 1, fontSize: 12, color: '#C4B5FD', fontWeight: '600' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  card: { backgroundColor: '#111827', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: '#1F2937' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#F9FAFB' },
  cardMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  tierBadge: { borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  tierText: { fontSize: 9, fontWeight: '800' },
  flagRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EF444422', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  flagText: { fontSize: 10, fontWeight: '800', color: '#EF4444', textTransform: 'uppercase' },
  previewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  previewText: { fontSize: 12, color: '#4F8EF7', fontWeight: '700' },
  decisionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  decisionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1, paddingVertical: 9, borderRadius: 9,
  },
  decisionText: { fontSize: 10, fontWeight: '800' },
});
