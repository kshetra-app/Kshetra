import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getPartyColor, getCandidatePhotoUrl } from '@/lib/constants';
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

  const photoUri = getCandidatePhotoUrl(profile.name, profile.party, 104, profile.photoUrl);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { borderColor: partyColor }]}>
          <Image
            source={{ uri: photoUri }}
            style={styles.avatarImage}
          />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{profile.name}</Text>
          {profile.constituencyName && (
            <Text style={styles.constituencyLabel}>AC #{profile.acNo} · {profile.constituencyName}</Text>
          )}
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
            {profile.maritalStatus && (
              <Text style={styles.metaText}>· {profile.maritalStatus}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Personal Details Row */}
      {(profile.education || profile.profession || profile.dob) && (
        <View style={styles.detailsRow}>
          {profile.education && (
            <View style={styles.detailItem}>
              <Ionicons name="school" size={13} color="#10B981" />
              <Text style={styles.detailText}>{profile.education}</Text>
            </View>
          )}
          {profile.profession && (
            <View style={styles.detailItem}>
              <Ionicons name="briefcase" size={13} color="#6B7280" />
              <Text style={styles.detailText}>{profile.profession}</Text>
            </View>
          )}
          {profile.dob && (
            <View style={styles.detailItem}>
              <Ionicons name="calendar" size={13} color="#8B5CF6" />
              <Text style={styles.detailText}>DOB: {profile.dob}</Text>
            </View>
          )}
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Ionicons name="ribbon" size={16} color="#4F8EF7" />
          <Text style={styles.statValue}>
            {termLabel}
          </Text>
          <Text style={styles.statLabel}>{t('mla.terms')}</Text>
        </View>

        {profile.totalAssets !== undefined && (
          <View style={styles.statItem}>
            <Ionicons name="wallet" size={16} color="#F59E0B" />
            <Text style={styles.statValue}>
              {formatINR(profile.totalAssets)}
            </Text>
            <Text style={styles.statLabel}>{t('mla.assets')}</Text>
          </View>
        )}

        {profile.totalLiabilities !== undefined && (
          <View style={styles.statItem}>
            <Ionicons name="card" size={16} color="#F97316" />
            <Text style={styles.statValue}>
              {formatINR(profile.totalLiabilities)}
            </Text>
            <Text style={styles.statLabel}>Liabilities</Text>
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
    marginBottom: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1F2937',
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
    color: '#9CA3AF',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  constituencyLabel: {
    fontSize: 11,
    color: '#6B7280',
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
    color: '#FFFFFF',
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
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
    color: '#D1D5DB',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0A0A1A',
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
});
