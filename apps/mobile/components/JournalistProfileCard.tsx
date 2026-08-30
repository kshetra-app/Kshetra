import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { JournalistProfile } from '../lib/journalistTypes';
import { JOURNALIST_TIER_CONFIG, BEAT_CONFIG } from '../lib/journalistTypes';

interface JournalistProfileCardProps {
  journalist: JournalistProfile;
  onPress?: () => void;
  compact?: boolean;
}

export default function JournalistProfileCard({ journalist, onPress, compact }: JournalistProfileCardProps) {
  const { t } = useTranslation();
  const tierConfig = JOURNALIST_TIER_CONFIG[journalist.tier];

  if (compact) {
    return (
      <Pressable style={styles.compactCard} onPress={onPress}>
        <View style={[styles.avatar, { borderColor: tierConfig.color }]}>
          <Text style={styles.avatarText}>{journalist.displayName.charAt(0)}</Text>
        </View>
        <View style={styles.compactInfo}>
          <Text style={styles.compactName}>{journalist.displayName}</Text>
          <Text style={[styles.compactTier, { color: tierConfig.color }]}>{tierConfig.label}</Text>
        </View>
        {journalist.verificationStatus === 'verified' && (
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.avatarLarge, { borderColor: tierConfig.color }]}>
          <Text style={styles.avatarLargeText}>{journalist.displayName.charAt(0)}</Text>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{journalist.displayName}</Text>
            {journalist.verificationStatus === 'verified' && (
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            )}
          </View>
          <View style={styles.tierRow}>
            <Ionicons name={tierConfig.icon as any} size={12} color={tierConfig.color} />
            <Text style={[styles.tierLabel, { color: tierConfig.color }]}>{tierConfig.label}</Text>
          </View>
          {journalist.outletAffiliation && (
            <Text style={styles.outlet}>{journalist.outletAffiliation}{journalist.outletRole ? ` · ${journalist.outletRole}` : ''}</Text>
          )}
        </View>
      </View>

      <Text style={styles.bio} numberOfLines={2}>{journalist.bio}</Text>

      {/* Beats */}
      <View style={styles.beatsRow}>
        {journalist.beats.slice(0, 4).map((beat) => {
          const cfg = BEAT_CONFIG[beat];
          return (
            <View key={beat} style={[styles.beatChip, { backgroundColor: cfg.color + '15' }]}>
              <Ionicons name={cfg.icon as any} size={10} color={cfg.color} />
              <Text style={[styles.beatLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{journalist.totalArticles}</Text>
          <Text style={styles.statLabel}>{t('journalist.articles')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{journalist.totalViews > 1000000 ? `${(journalist.totalViews / 1000000).toFixed(1)}M` : `${Math.round(journalist.totalViews / 1000)}K`}</Text>
          <Text style={styles.statLabel}>{t('journalist.viewsLabel')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>⭐ {journalist.avgRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>{t('journalist.rating')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{journalist.reputation}</Text>
          <Text style={styles.statLabel}>{t('journalist.reputation')}</Text>
        </View>
      </View>

      {/* Badges */}
      {journalist.badges.length > 0 && (
        <View style={styles.badgesRow}>
          {journalist.badges.map((badge) => (
            <View key={badge.id} style={styles.badge}>
              <Ionicons name={badge.icon as any} size={12} color="#F59E0B" />
              <Text style={styles.badgeLabel}>{badge.label}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16, borderWidth: 1, borderColor: '#E8DED1' },
  header: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  avatarLarge: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E8DED1', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  avatarLargeText: { fontSize: 20, fontWeight: '800', color: '#241814' },
  headerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: '800', color: '#241814' },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  tierLabel: { fontSize: 12, fontWeight: '700' },
  outlet: { fontSize: 12, color: '#988275', marginTop: 2 },
  bio: { fontSize: 13, color: '#6D5549', lineHeight: 18, marginBottom: 10 },
  beatsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  beatChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  beatLabel: { fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E8DED1' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '800', color: '#241814' },
  statLabel: { fontSize: 10, color: '#988275', marginTop: 2 },
  badgesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E8DED1' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F59E0B10', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeLabel: { fontSize: 10, fontWeight: '700', color: '#F59E0B' },
  compactCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8DED1' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8DED1', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#241814' },
  compactInfo: { flex: 1 },
  compactName: { fontSize: 14, fontWeight: '700', color: '#241814' },
  compactTier: { fontSize: 11, fontWeight: '600', marginTop: 1 },
});
