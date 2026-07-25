import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { useLiveExchangeStore } from '../../stores/liveExchange';
import {
  ISSUE_CATEGORY_CONFIG,
  TIER_CONFIG,
  DEPARTMENT_CONFIG,
  VISIBILITY_CONFIG,
  ACK_CONFIG,
  hasAI,
} from '../../lib/lmxTypes';

export default function LivePlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const event = useLiveExchangeStore((s) => s.getEventById(id));
  const alerts = useLiveExchangeStore(useShallow((s) => s.getAlertsForEvent(id)));
  const incrementViewers = useLiveExchangeStore((s) => s.incrementViewers);
  const endEvent = useLiveExchangeStore((s) => s.endEvent);
  const currentReporterId = useLiveExchangeStore((s) => s.currentReporterId);

  useEffect(() => {
    if (!event) return;
    incrementViewers(id, 1);
    return () => incrementViewers(id, -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!event) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle" size={40} color="#374151" />
        <Text style={styles.notFound}>Stream not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const cat = ISSUE_CATEGORY_CONFIG[event.issueCategory];
  const tier = TIER_CONFIG[event.accreditationTier];
  const vis = VISIBILITY_CONFIG[event.visibilityMode];
  const isLive = event.status === 'live';
  const isOwner = event.reporterId === currentReporterId;
  const aiOn = hasAI(event);

  return (
    <View style={styles.container}>
      {/* Video area */}
      <View style={[styles.player, { paddingTop: insets.top }]}>
        <View style={styles.playerInner}>
          <Ionicons name={cat.icon as any} size={54} color={cat.color} />
          <Text style={styles.playerNote}>
            {isLive ? 'Live video feed' : 'Replay'}
          </Text>
          <Text style={styles.playerUrl} numberOfLines={1}>{event.mediaPlaybackHls}</Text>
        </View>

        <Pressable style={[styles.closeBtn, { top: insets.top + 8 }]} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={26} color="#FFFFFF" />
        </Pressable>

        <View style={[styles.topBadges, { top: insets.top + 10 }]}>
          <View style={[styles.liveBadge, { backgroundColor: isLive ? '#EF4444' : '#374151' }]}>
            {isLive && <View style={styles.dot} />}
            <Text style={styles.liveText}>{isLive ? 'LIVE' : 'REPLAY'}</Text>
          </View>
          <View style={styles.viewerBadge}>
            <Ionicons name="eye" size={12} color="#FFFFFF" />
            <Text style={styles.viewerText}>{event.viewerCount}</Text>
          </View>
        </View>

        {!!event.organizationName && (
          <View style={styles.brandOverlay}>
            <Text style={styles.brandText}>{event.organizationName}</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Title block */}
        <View style={styles.block}>
          <Text style={styles.headline}>
            {event.ai?.autoHeadline?.trim() ||
              `${cat.label} — ${event.locality || event.districtName || event.stateCode}`}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.tierBadge, { borderColor: tier.color }]}>
              <Ionicons name={tier.badgeIcon as any} size={11} color={tier.color} />
              <Text style={[styles.tierText, { color: tier.color }]}>{tier.label}</Text>
            </View>
            <Text style={styles.reporter}>{event.reporterName}</Text>
            <View style={styles.credPill}>
              <Ionicons name="pulse" size={11} color="#10B981" />
              <Text style={styles.credText}>{Math.round(event.credibilityScore)}</Text>
            </View>
          </View>

          <View style={styles.chipsRow}>
            <View style={[styles.pill, { backgroundColor: cat.color + '22' }]}>
              <Ionicons name={cat.icon as any} size={11} color={cat.color} />
              <Text style={[styles.pillText, { color: cat.color }]}>{cat.label}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: vis.color + '22' }]}>
              <Ionicons name={vis.icon as any} size={11} color={vis.color} />
              <Text style={[styles.pillText, { color: vis.color }]}>{vis.shortLabel}</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name="location" size={11} color="#9CA3AF" />
              <Text style={styles.pillText}>{event.districtName || event.stateCode}</Text>
            </View>
          </View>
        </View>

        {/* AI panel — only when AI is active */}
        {aiOn ? (
          <View style={styles.aiPanel}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={15} color="#A855F7" />
              <Text style={styles.aiTitle}>AI Enrichment</Text>
              <Text style={styles.aiProvider}>{event.ai?.modelProvider}</Text>
            </View>
            {!!event.ai?.summary && <Text style={styles.aiSummary}>{event.ai.summary}</Text>}
            {!!event.ai?.transcript && (
              <>
                <Text style={styles.aiLabel}>Transcript</Text>
                <Text style={styles.aiBody}>{event.ai.transcript}</Text>
              </>
            )}
            <View style={styles.aiStats}>
              {typeof event.ai?.emergencyScore === 'number' && (
                <AiStat label="Emergency" value={`${Math.round(event.ai.emergencyScore)}`} />
              )}
              {typeof event.ai?.crowdEstimate === 'number' && (
                <AiStat label="Crowd" value={`${event.ai.crowdEstimate}`} />
              )}
              {typeof event.ai?.authenticityScore === 'number' && (
                <AiStat label="Authenticity" value={`${Math.round(event.ai.authenticityScore)}`} />
              )}
            </View>
          </View>
        ) : (
          <View style={styles.aiOff}>
            <Ionicons name="sparkles-outline" size={14} color="#6B7280" />
            <Text style={styles.aiOffText}>
              AI enrichment is not active. Transcript, summary and emergency scoring will appear here
              once an AI model is subscribed. The stream and all routing work without it.
            </Text>
          </View>
        )}

        {/* Department alerts fired */}
        {alerts.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Department Alerts</Text>
            {alerts.map((al) => {
              const dcfg = DEPARTMENT_CONFIG[al.departmentType];
              const ack = al.acknowledgment ? ACK_CONFIG[al.acknowledgment] : null;
              return (
                <View key={al.id} style={styles.alertRow}>
                  <View style={[styles.alertIcon, { backgroundColor: dcfg.color + '22' }]}>
                    <Ionicons name={dcfg.icon as any} size={16} color={dcfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertLabel}>{dcfg.label}</Text>
                    <Text style={styles.alertStatus}>
                      {al.deliveryStatus === 'dispatched' ? 'Dispatched' : al.deliveryStatus}
                    </Text>
                  </View>
                  {ack ? (
                    <View style={[styles.ackBadge, { backgroundColor: ack.color + '22' }]}>
                      <Ionicons name={ack.icon as any} size={12} color={ack.color} />
                      <Text style={[styles.ackText, { color: ack.color }]}>{ack.label}</Text>
                    </View>
                  ) : (
                    <Text style={styles.pendingText}>Awaiting ack</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Owner controls */}
        {isOwner && isLive && (
          <View style={styles.block}>
            <Pressable style={styles.endBtn} onPress={() => endEvent(event.id)}>
              <Ionicons name="stop-circle" size={20} color="#FFFFFF" />
              <Text style={styles.endBtnText}>End Broadcast</Text>
            </Pressable>
            <Text style={styles.ownerHint}>
              Buffer state: {event.bufferState} · Stream ID: {event.streamId}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function AiStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.aiStat}>
      <Text style={styles.aiStatValue}>{value}</Text>
      <Text style={styles.aiStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  center: { justifyContent: 'center', alignItems: 'center', gap: 10 },
  notFound: { color: '#9CA3AF', fontSize: 15, fontWeight: '700' },
  backLink: { marginTop: 6 },
  backLinkText: { color: '#4F8EF7', fontSize: 14, fontWeight: '700' },
  player: { height: 260, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  playerInner: { alignItems: 'center', gap: 8 },
  playerNote: { color: '#9CA3AF', fontSize: 13, fontWeight: '700' },
  playerUrl: { color: '#4B5563', fontSize: 10, maxWidth: 260 },
  closeBtn: { position: 'absolute', left: 12, padding: 4 },
  topBadges: { position: 'absolute', right: 12, flexDirection: 'row', gap: 8 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  liveText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  viewerBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  viewerText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  brandOverlay: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  brandText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  block: { paddingHorizontal: 16, paddingTop: 16 },
  headline: { fontSize: 19, fontWeight: '800', color: '#F9FAFB', lineHeight: 25 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  tierText: { fontSize: 10, fontWeight: '800' },
  reporter: { flex: 1, fontSize: 13, color: '#D1D5DB', fontWeight: '700' },
  credPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#10B98122', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  credText: { fontSize: 11, fontWeight: '800', color: '#10B981' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1F2937', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  pillText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  aiPanel: { margin: 16, marginBottom: 0, padding: 14, backgroundColor: '#A855F70D', borderRadius: 14, borderWidth: 1, borderColor: '#A855F733' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#C4B5FD' },
  aiProvider: { fontSize: 10, color: '#8B5CF6', fontWeight: '700' },
  aiSummary: { fontSize: 13, color: '#E5E7EB', lineHeight: 19, marginTop: 10 },
  aiLabel: { fontSize: 11, fontWeight: '800', color: '#A855F7', marginTop: 12, textTransform: 'uppercase' },
  aiBody: { fontSize: 12, color: '#9CA3AF', lineHeight: 18, marginTop: 4 },
  aiStats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  aiStat: { flex: 1, backgroundColor: '#111827', borderRadius: 10, padding: 10, alignItems: 'center' },
  aiStatValue: { fontSize: 18, fontWeight: '800', color: '#F9FAFB' },
  aiStatLabel: { fontSize: 10, color: '#6B7280', fontWeight: '700', marginTop: 2 },
  aiOff: { flexDirection: 'row', gap: 8, margin: 16, marginBottom: 0, padding: 12, backgroundColor: '#111827', borderRadius: 12 },
  aiOffText: { flex: 1, fontSize: 11, color: '#6B7280', lineHeight: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 8 },
  alertIcon: { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  alertLabel: { fontSize: 13, fontWeight: '700', color: '#F9FAFB' },
  alertStatus: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  ackBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ackText: { fontSize: 10, fontWeight: '800' },
  pendingText: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  endBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EF4444', paddingVertical: 13, borderRadius: 12 },
  endBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  ownerHint: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 8 },
});
