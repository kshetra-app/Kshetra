import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getPartyColor } from '@/lib/constants';
import type { MLAProfile } from '@/lib/data';

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
  const partyColor = getPartyColor(profile.party);

  const termLabel = profile.terms === 1 ? t('mla.term_1')
    : profile.terms === 2 ? t('mla.term_2')
    : profile.terms === 3 ? t('mla.term_3')
    : t('mla.term_n', { n: profile.terms });

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color="#9CA3AF" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{profile.name}</Text>
          <View style={styles.partyRow}>
            <View style={[styles.partyBadge, { backgroundColor: partyColor }]}>
              <Text style={styles.partyText}>{profile.party}</Text>
            </View>
            {profile.age && (
              <Text style={styles.metaText}>{t('mla.age')} {profile.age}</Text>
            )}
            <Text style={styles.metaText}>
              {profile.gender === 'F' ? t('mla.female') : t('mla.male')}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Ionicons name="ribbon" size={16} color="#4F8EF7" />
          <Text style={styles.statValue}>
            {termLabel}
          </Text>
          <Text style={styles.statLabel}>{t('mla.terms')}</Text>
        </View>

        {profile.education && (
          <View style={styles.statItem}>
            <Ionicons name="school" size={16} color="#10B981" />
            <Text style={styles.statValue} numberOfLines={1}>
              {profile.education}
            </Text>
            <Text style={styles.statLabel}>{t('mla.education')}</Text>
          </View>
        )}

        {profile.totalAssets !== undefined && (
          <View style={styles.statItem}>
            <Ionicons name="wallet" size={16} color="#F59E0B" />
            <Text style={styles.statValue}>
              {formatINR(profile.totalAssets)}
            </Text>
            <Text style={styles.statLabel}>{t('mla.assets')}</Text>
          </View>
        )}

        {profile.criminalCases !== undefined && (
          <View style={styles.statItem}>
            <Ionicons
              name={(profile.criminalCases ?? 0) > 0 ? 'warning' : 'checkmark-circle'}
              size={16}
              color={(profile.criminalCases ?? 0) > 0 ? '#EF4444' : '#10B981'}
            />
            <Text
              style={[
                styles.statValue,
                (profile.criminalCases ?? 0) > 0 && styles.warningText,
              ]}
            >
              {profile.criminalCases}
            </Text>
            <Text style={styles.statLabel}>{t('mla.cases')}</Text>
          </View>
        )}
      </View>

      {/* Profession */}
      {profile.profession && (
        <View style={styles.professionRow}>
          <Ionicons name="briefcase" size={14} color="#6B7280" />
          <Text style={styles.professionText}>{profile.profession}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  partyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0A0A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  warningText: {
    color: '#EF4444',
  },
  professionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  professionText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
