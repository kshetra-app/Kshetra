import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getPartyColor } from '../lib/constants';
import CandidateAvatar from './CandidateAvatar';
import type { MLAProfile } from '../lib/data';
import { useTheme } from '../lib/theme';

/** Format INR amounts in lakhs/crores */
function formatINR(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

interface MLACardProps {
  profile: MLAProfile;
}

export default function MLACard({ profile }: MLACardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const partyColor = getPartyColor(profile.party);

  const termLabel = profile.terms === 1 ? t('mla.term_1')
    : profile.terms === 2 ? t('mla.term_2')
    : profile.terms === 3 ? t('mla.term_3')
    : t('mla.term_n', { n: profile.terms });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <CandidateAvatar
          name={profile.name}
          party={profile.party}
          size={52}
          photoUrl={profile.photoUrl}
        />
        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: colors.text }]}>{profile.name}</Text>
          {profile.constituencyName && (
            <Text style={[styles.constituencyLabel, { color: colors.textMuted }]}>AC #{profile.acNo} · {profile.constituencyName}</Text>
          )}
          <View style={styles.partyRow}>
            <View style={[styles.partyBadge, { backgroundColor: partyColor }]}>
              <Text style={styles.partyText}>{profile.party}</Text>
            </View>
            {profile.age && (
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{t('mla.age')} {profile.age}</Text>
            )}
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {profile.gender === 'F' ? t('mla.female') : t('mla.male')}
            </Text>
            {profile.maritalStatus && (
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>· {profile.maritalStatus}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Personal Details Row */}
      {(profile.education || profile.profession || profile.dob) && (
        <View style={styles.detailsRow}>
          {profile.education && (
            <View style={styles.detailItem}>
              <Ionicons name="school" size={13} color={colors.primary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>{profile.education}</Text>
            </View>
          )}
          {profile.profession && (
            <View style={styles.detailItem}>
              <Ionicons name="briefcase" size={13} color={colors.textMuted} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>{profile.profession}</Text>
            </View>
          )}
          {profile.dob && (
            <View style={styles.detailItem}>
              <Ionicons name="calendar" size={13} color={colors.gold} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>DOB: {profile.dob}</Text>
            </View>
          )}
        </View>
      )}

      {/* Stats Grid */}
      <View style={[styles.statsGrid, { backgroundColor: colors.surfaceElevated }]}>
        <View style={styles.statItem}>
          <Ionicons name="ribbon" size={16} color={colors.gold} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {termLabel}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('mla.terms')}</Text>
        </View>

        {profile.totalAssets !== undefined && (
          <View style={styles.statItem}>
            <Ionicons name="wallet" size={16} color={colors.gold} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatINR(profile.totalAssets)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('mla.assets')}</Text>
          </View>
        )}

        {profile.criminalCases !== undefined && (
          <View style={styles.statItem}>
            <Ionicons
              name={(profile.criminalCases ?? 0) > 0 ? "alert-circle" : "shield-checkmark"}
              size={16}
              color={(profile.criminalCases ?? 0) > 0 ? colors.danger : colors.success}
            />
            <Text
              style={[
                styles.statValue,
                { color: colors.text },
                (profile.criminalCases ?? 0) > 0 && { color: colors.danger },
              ]}
            >
              {profile.criminalCases}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('mla.cases')}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8DED1',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6D5549',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#241814',
    marginBottom: 2,
  },
  constituencyLabel: {
    fontSize: 11,
    color: '#988275',
    marginBottom: 3,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  partyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  partyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#241814',
  },
  metaText: {
    fontSize: 12,
    color: '#6D5549',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6D5549',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F5EFE4',
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#241814',
  },
  statLabel: {
    fontSize: 10,
    color: '#988275',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  warningText: {
    color: '#EF4444',
  },
});
