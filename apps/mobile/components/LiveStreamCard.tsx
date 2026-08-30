import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LiveEvent } from '../lib/lmxTypes';
import {
  ISSUE_CATEGORY_CONFIG,
  TIER_CONFIG,
  DEPARTMENT_CONFIG,
  hasAI,
} from '../lib/lmxTypes';
import { useTheme } from '../lib/theme';

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function LiveStreamCard({
  event,
  onPress,
}: {
  event: LiveEvent;
  onPress: (e: LiveEvent) => void;
}) {
  const { colors } = useTheme();
  const cat = ISSUE_CATEGORY_CONFIG[event.issueCategory];
  const tier = TIER_CONFIG[event.accreditationTier];
  const isLive = event.status === 'live';
  const aiOn = hasAI(event);

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.goldBorder || colors.border,
        },
      ]}
      onPress={() => onPress(event)}
    >
      {/* Thumbnail zone */}
      <View style={[styles.thumb, { backgroundColor: cat.color + '22' }]}>
        <Ionicons name={cat.icon as any} size={30} color={cat.color} />

        {/* Live / replay badge */}
        <View style={[styles.liveBadge, { backgroundColor: isLive ? '#EF4444' : '#374151' }]}>
          {isLive && <View style={styles.liveDot} />}
          <Text style={styles.liveText}>{isLive ? 'LIVE' : 'REPLAY'}</Text>
        </View>

        {/* Viewer count */}
        <View style={styles.viewers}>
          <Ionicons name="eye" size={11} color="#FFFFFF" />
          <Text style={styles.viewersText}>{formatCount(event.viewerCount)}</Text>
        </View>

        {/* Brand overlay (if streaming "as" an org) */}
        {!!event.organizationName && (
          <View style={styles.brand}>
            <Text style={styles.brandText} numberOfLines={1}>{event.organizationName}</Text>
          </View>
        )}

        {/* Priority pill */}
        <View style={styles.priority}>
          <Ionicons name="trending-up" size={10} color="#0A0A1A" />
          <Text style={styles.priorityText}>{Math.round(event.priorityScore)}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.rowBetween}>
          <View style={[styles.catTag, { backgroundColor: cat.color + '22' }]}>
            <Text style={[styles.catTagText, { color: cat.color }]}>{cat.label}</Text>
          </View>
          <Text style={styles.time}>{timeAgo(event.startedAt)} ago</Text>
        </View>

        <Text style={[styles.headline, { color: colors.text }]} numberOfLines={2}>
          {event.ai?.autoHeadline?.trim() ||
            `${cat.label} in ${event.locality || event.districtName || event.stateCode || 'Live'}`}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.tierBadge, { borderColor: tier.color }]}>
            <Ionicons name={tier.badgeIcon as any} size={10} color={tier.color} />
            <Text style={[styles.tierText, { color: tier.color }]}>{tier.label}</Text>
          </View>
          <Text style={[styles.reporter, { color: colors.textSecondary }]} numberOfLines={1}>{event.reporterName}</Text>
        </View>

        <View style={styles.footRow}>
          <View style={styles.locRow}>
            <Ionicons name="location" size={11} color={colors.textMuted} />
            <Text style={[styles.loc, { color: colors.textMuted }]} numberOfLines={1}>
              {[event.districtName, event.stateCode].filter(Boolean).join(', ') || 'Unknown'}
            </Text>
          </View>

          {/* Department alert indicators */}
          {event.alertDepartments.length > 0 && (
            <View style={styles.deptRow}>
              {event.alertDepartments.slice(0, 3).map((d) => (
                <View key={d} style={[styles.deptDot, { backgroundColor: DEPARTMENT_CONFIG[d].color }]}>
                  <Ionicons name={DEPARTMENT_CONFIG[d].icon as any} size={9} color="#FFFFFF" />
                </View>
              ))}
            </View>
          )}

          {aiOn && (
            <View style={styles.aiPill}>
              <Ionicons name="sparkles" size={9} color="#A855F7" />
              <Text style={styles.aiText}>AI</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: '#1F2937',
  },
  thumb: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  liveText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  viewers: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  viewersText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  brand: {
    position: 'absolute', bottom: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    maxWidth: '60%',
  },
  brandText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  priority: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FBBF24', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  priorityText: { color: '#0A0A1A', fontSize: 10, fontWeight: '800' },
  body: { padding: 12, gap: 7 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catTagText: { fontSize: 10, fontWeight: '800' },
  time: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  headline: { fontSize: 15, fontWeight: '700', color: '#F9FAFB', lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  tierText: { fontSize: 9, fontWeight: '800' },
  reporter: { flex: 1, fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  footRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  loc: { fontSize: 11, color: '#6B7280', fontWeight: '600', flexShrink: 1 },
  deptRow: { flexDirection: 'row', gap: 3 },
  deptDot: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  aiPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#A855F722', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  aiText: { fontSize: 9, fontWeight: '800', color: '#A855F7' },
});
