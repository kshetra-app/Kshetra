import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PoliticianPortalProfile } from '../lib/politicianPortalTypes';
import { POLITICIAN_TIER_CONFIG } from '../lib/politicianPortalTypes';

interface PoliticianPortalCardProps {
  politician: PoliticianPortalProfile;
  onPress?: () => void;
  compact?: boolean;
}

export default function PoliticianPortalCard({ politician, onPress, compact }: PoliticianPortalCardProps) {
  const { t } = useTranslation();
  const tierConfig = POLITICIAN_TIER_CONFIG[politician.tier];

  if (compact) {
    return (
      <Pressable style={styles.compactCard} onPress={onPress}>
        <View style={[styles.avatar, { borderColor: tierConfig.color }]}>
          <Text style={styles.avatarText}>{politician.displayName.charAt(0)}</Text>
        </View>
        <View style={styles.compactInfo}>
          <Text style={styles.compactName}>{politician.displayName}</Text>
          <Text style={styles.compactMeta}>{politician.party || t('politicianPortal.independent')} · {tierConfig.label}</Text>
        </View>
        {politician.isVerified && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.avatarLarge, { borderColor: tierConfig.color }]}>
          <Text style={styles.avatarLargeText}>{politician.displayName.charAt(0)}</Text>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{politician.displayName}</Text>
            {politician.isVerified && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
          </View>
          <View style={styles.tierRow}>
            <Ionicons name={tierConfig.icon as any} size={14} color={tierConfig.color} />
            <Text style={[styles.tierLabel, { color: tierConfig.color }]}>{tierConfig.label}</Text>
            {politician.party && <Text style={styles.partyLabel}>· {politician.party}</Text>}
          </View>
          <Text style={styles.location}>{politician.districtName}, {politician.stateCode}</Text>
        </View>
      </View>

      <Text style={styles.bio} numberOfLines={2}>{politician.bio}</Text>

      {/* Key Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Ionicons name="people" size={16} color="#3B82F6" />
          <Text style={styles.metricValue}>{politician.followerCount > 1000 ? `${Math.round(politician.followerCount / 1000)}K` : politician.followerCount}</Text>
          <Text style={styles.metricLabel}>{t('common.followers')}</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="chatbubbles" size={16} color="#10B981" />
          <Text style={styles.metricValue}>{politician.responseRate.toFixed(0)}%</Text>
          <Text style={styles.metricLabel}>{t('politicianPortal.responseRate')}</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="warning" size={16} color="#F59E0B" />
          <Text style={styles.metricValue}>{politician.issuesResponded}</Text>
          <Text style={styles.metricLabel}>{t('politicianPortal.issuesHandled')}</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="thumbs-up" size={16} color="#8B5CF6" />
          <Text style={styles.metricValue}>{politician.endorsementCount}</Text>
          <Text style={styles.metricLabel}>{t('civicScoreCard.endorsements')}</Text>
        </View>
      </View>

      {/* Response Time */}
      <View style={styles.responseRow}>
        <Ionicons name="time" size={14} color="#6B7280" />
        <Text style={styles.responseText}>{t('politicianPortal.avgResponseTime', { hours: politician.avgResponseTimeHours.toFixed(1) })}</Text>
      </View>
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
  name: { fontSize: 17, fontWeight: '800', color: '#241814' },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  tierLabel: { fontSize: 12, fontWeight: '700' },
  partyLabel: { fontSize: 12, color: '#6D5549', fontWeight: '600' },
  location: { fontSize: 11, color: '#988275', marginTop: 2 },
  bio: { fontSize: 13, color: '#6D5549', lineHeight: 18, marginBottom: 12 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E8DED1' },
  metric: { alignItems: 'center', gap: 2 },
  metricValue: { fontSize: 15, fontWeight: '800', color: '#241814' },
  metricLabel: { fontSize: 9, color: '#988275', fontWeight: '600' },
  responseRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 8, backgroundColor: '#FBE8E7', borderRadius: 8 },
  responseText: { fontSize: 12, color: '#988275' },
  compactCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E8DED1' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8DED1', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#241814' },
  compactInfo: { flex: 1 },
  compactName: { fontSize: 14, fontWeight: '700', color: '#241814' },
  compactMeta: { fontSize: 11, color: '#988275', marginTop: 1 },
});
