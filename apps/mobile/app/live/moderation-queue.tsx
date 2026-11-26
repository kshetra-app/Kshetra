import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { mapDbEventToLiveEvent, useLiveExchangeStore } from '../../stores/liveExchange';
import type { HumanDecision, LiveEvent } from '../../lib/lmxTypes';
import { ISSUE_CATEGORY_CONFIG, TIER_CONFIG, hasAI } from '../../lib/lmxTypes';
import { useTheme } from '../../lib/theme';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
import { IS_LIVE_ENVIRONMENT } from '../../lib/environment';
import { API_BASE_URL } from '../../lib/constants';
import { apiClient } from '../../lib/api';

/**
 * Human moderation buffer triage (doc Section 13 Layer 3).
 * Streams sit in a short buffer before public/broadcast fan-out. Moderators
 * allow / mute / cut / escalate. AI flags (when active) extend the buffer and
 * are surfaced here — but AI never auto-kills; a human always decides.
 */
const DECISIONS: { key: HumanDecision; labelKey: string; icon: string; color: string }[] = [
  { key: 'allow', labelKey: 'lmx.moderation.allow', icon: 'checkmark-circle', color: '#10B981' },
  { key: 'mute', labelKey: 'lmx.moderation.mute', icon: 'volume-mute', color: '#F59E0B' },
  { key: 'cut', labelKey: 'lmx.moderation.cut', icon: 'close-circle', color: '#EF4444' },
  { key: 'escalate', labelKey: 'lmx.moderation.escalate', icon: 'arrow-up-circle', color: '#8B5CF6' },
];

export default function ModerationQueueScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const localQueue = useLiveExchangeStore(useShallow((s) => s.getModerationQueue()));
  const setHumanDecision = useLiveExchangeStore((s) => s.setHumanDecision);
  const aiServiceEnabled = useLiveExchangeStore((s) => s.aiServiceEnabled);
  const [helpVisible, setHelpVisible] = useState(false);
  const [records, setRecords] = useState<LiveEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queue = IS_LIVE_ENVIRONMENT ? records : localQueue;

  const refresh = useCallback(async () => {
    if (!IS_LIVE_ENVIRONMENT) return;
    setRefreshing(true);
    setError(null);
    try {
      const result = await apiClient.get<Record<string, unknown>[]>('/api/v1/lmx/review', { authPolicy: 'authenticated' });
      setRecords(result.data.map(mapDbEventToLiveEvent));
    } catch {
      setRecords([]);
      setError(t('lmx.moderation.loadFailed', { defaultValue: 'The review queue is unavailable. Check your access and try again.' }));
    } finally {
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  async function preview(event: LiveEvent) {
    if (!IS_LIVE_ENVIRONMENT) {
      router.push(`/live/${event.id}` as any);
      return;
    }
    setError(null);
    try {
      const result = await apiClient.post<{ previewUrl: string }>(`/api/v1/lmx/review/${encodeURIComponent(event.id)}/preview`, undefined, { authPolicy: 'authenticated' });
      const url = new URL(result.data.previewUrl);
      if (url.origin !== new URL(API_BASE_URL).origin || url.pathname !== `/api/v1/lmx/watch/${event.id}/review` || !url.hash) {
        throw new Error('Invalid review link');
      }
      await Linking.openURL(url.href);
    } catch {
      setError(t('lmx.moderation.previewFailed', { defaultValue: 'The preview could not be opened. Refresh the queue and try again.' }));
    }
  }

  async function decide(event: LiveEvent, decision: HumanDecision) {
    if (!IS_LIVE_ENVIRONMENT) {
      setHumanDecision(event.id, decision);
      return;
    }
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.post(`/api/v1/lmx/live/${encodeURIComponent(event.id)}/moderate`, { decision }, { authPolicy: 'authenticated' });
      await refresh();
    } catch {
      setError(t('lmx.moderation.saveFailed', { defaultValue: 'The review decision could not be saved.' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{t('lmx.moderation.title')}</Text>
        <Pressable
          accessibilityLabel={t('discovery.pageHelp.openHelp', { defaultValue: 'Page Help' })}
          style={{ padding: 4 }}
          onPress={() => setHelpVisible(true)}
        >
          <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.banner}>
        <Ionicons name="shield-half" size={15} color="#8B5CF6" />
        <Text style={styles.bannerText}>
          {IS_LIVE_ENVIRONMENT
            ? t('lmx.moderation.activeBroadcasts', { defaultValue: 'Active broadcasts' })
            : t('lmx.moderation.streamsInBuffer', { count: queue.length })}{' '}
          {aiServiceEnabled
            ? t('lmx.moderation.aiScreeningActive')
            : t('lmx.moderation.aiScreeningOff')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        {error ? <Text accessibilityRole="alert" style={styles.emptyText}>{error}</Text> : null}
        {queue.length === 0 && !error && !refreshing ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle" size={44} color="#10B981" />
            <Text style={styles.emptyText}>{t('lmx.moderation.queueClear')}</Text>
          </View>
        ) : (
          queue.map((e) => (
            <QueueCard
              key={e.id}
              event={e}
              onDecision={(d) => void decide(e, d)}
              onOpen={() => void preview(e)}
              saving={saving}
            />
          ))
        )}
      </ScrollView>

      {/* Contextual Guidance */}
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="live-moderation"
      />
    </View>
  );
}

function QueueCard({
  event,
  onDecision,
  onOpen,
  saving,
}: {
  event: LiveEvent;
  onDecision: (d: HumanDecision) => void;
  onOpen: () => void;
  saving: boolean;
}) {
  const cat = ISSUE_CATEGORY_CONFIG[event.issueCategory];
  const tier = TIER_CONFIG[event.accreditationTier];
  const aiOn = hasAI(event);
  const { t } = useTranslation();
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
            {t(cat.labelKey)} · {event.locality || event.districtName || event.stateCode}
          </Text>
          <Text style={styles.cardMeta}>
            {event.reporterName} · {event.streamId}
          </Text>
        </View>
        <View style={[styles.tierBadge, { borderColor: tier.color }]}>
          <Text style={[styles.tierText, { color: tier.color }]}>{t(tier.labelKey)}</Text>
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
        <Text style={styles.previewText}>{t('lmx.moderation.previewFeed')}</Text>
      </Pressable>

      <View style={styles.decisionRow}>
        {DECISIONS.filter((decision) => !IS_LIVE_ENVIRONMENT || decision.key !== 'mute').map((d) => (
          <Pressable
            key={d.key}
            onPress={() => onDecision(d.key)}
            disabled={saving}
            style={[styles.decisionBtn, { borderColor: d.color }]}
          >
            <Ionicons name={d.icon as any} size={14} color={d.color} />
            <Text style={[styles.decisionText, { color: d.color }]}>{t(d.labelKey)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800' },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, padding: 11, borderRadius: 10, borderWidth: 1,
  },
  bannerText: { flex: 1, fontSize: 12, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },
  card: { borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  cardMeta: { fontSize: 11, marginTop: 2 },
  tierBadge: { borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  tierText: { fontSize: 9, fontWeight: '800' },
  flagRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  flag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  flagText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  previewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  previewText: { fontSize: 12, fontWeight: '700' },
  decisionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  decisionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1, paddingVertical: 9, borderRadius: 9,
  },
  decisionText: { fontSize: 10, fontWeight: '800' },
});
