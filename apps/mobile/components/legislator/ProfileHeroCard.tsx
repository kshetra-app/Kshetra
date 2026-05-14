import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '@/lib/constants';
import { moderateScale as ms } from '@/lib/responsive';

interface Props {
  fullName: string;
  displayName: string;
  party: string;
  partyFull?: string;
  constituency: string;
  district: string;
  stateCode: string;
  house: string;
  photoUrl: string | null;
  gender: string;
  age: number | null;
  termsServed: number;
  isCabinetMinister?: boolean;
  isChiefMinister?: boolean;
  isCurrentMember?: boolean;
  reservationType?: string;
  onPhotoPress?: (uri: string | null) => void;
  onSharePress?: () => void;
}

export default function ProfileHeroCard({
  fullName,
  displayName,
  party,
  partyFull,
  constituency,
  district,
  stateCode,
  house,
  photoUrl,
  gender,
  age,
  termsServed,
  isCabinetMinister,
  isChiefMinister,
  isCurrentMember,
  reservationType,
  onPhotoPress,
  onSharePress,
}: Props) {
  const partyColor = getPartyColor(party);
  const houseLabel = house === 'state_assembly' ? 'MLA' : house === 'lok_sabha' ? 'MP (LS)' : house === 'rajya_sabha' ? 'MP (RS)' : 'MLC';
  const genderIcon = gender === 'female' ? 'woman' : 'man';

  return (
    <View style={styles.container}>
      {/* Party color accent background */}
      <View style={[styles.gradient, { backgroundColor: partyColor + '15' }]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Photo */}
        <Pressable style={styles.photoContainer} onPress={() => onPhotoPress?.(photoUrl)}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: partyColor + '30' }]}>
              <Text style={[styles.initials, { color: partyColor }]}>
                {fullName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          {/* Status indicator */}
          {isCurrentMember && (
            <View style={styles.activeIndicator} />
          )}
        </Pressable>

        {/* Name & Title */}
        <View style={styles.nameSection}>
          <Text style={styles.fullName} numberOfLines={2}>{displayName}</Text>
          {displayName !== fullName && (
            <Text style={styles.aliasName} numberOfLines={1}>{fullName}</Text>
          )}
        </View>

        {/* Badges Row */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: partyColor + '25', borderColor: partyColor + '50' }]}>
            <Text style={[styles.badgeText, { color: partyColor }]}>{party}</Text>
          </View>
          <View style={[styles.badge, styles.houseBadge]}>
            <Text style={styles.houseBadgeText}>{houseLabel}</Text>
          </View>
          {reservationType && reservationType !== 'general' && (
            <View style={[styles.badge, styles.resBadge]}>
              <Text style={styles.resBadgeText}>{reservationType.toUpperCase()}</Text>
            </View>
          )}
          {isChiefMinister && (
            <View style={[styles.badge, styles.cmBadge]}>
              <Ionicons name="star" size={10} color="#F59E0B" />
              <Text style={styles.cmBadgeText}>CM</Text>
            </View>
          )}
          {isCabinetMinister && !isChiefMinister && (
            <View style={[styles.badge, styles.minBadge]}>
              <Ionicons name="briefcase" size={10} color="#8B5CF6" />
              <Text style={styles.minBadgeText}>Minister</Text>
            </View>
          )}
        </View>

        {/* Constituency */}
        <View style={styles.constituencyRow}>
          <Ionicons name="location" size={14} color="#9CA3AF" />
          <Text style={styles.constituencyText}>{constituency}, {district}</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{age ?? '—'}</Text>
            <Text style={styles.statLabel}>Age</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{termsServed}</Text>
            <Text style={styles.statLabel}>{termsServed === 1 ? 'Term' : 'Terms'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Ionicons name={genderIcon as any} size={16} color="#9CA3AF" />
            <Text style={styles.statLabel}>{gender === 'female' ? 'Female' : 'Male'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stateCode}</Text>
            <Text style={styles.statLabel}>State</Text>
          </View>
        </View>
      </View>

      {/* Share button */}
      {onSharePress && (
        <Pressable style={styles.shareBtn} onPress={onSharePress} hitSlop={8}>
          <Ionicons name="share-outline" size={20} color="#9CA3AF" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#111827',
    marginHorizontal: 16,
    marginTop: 8,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  photo: {
    width: ms(88),
    height: ms(88),
    borderRadius: ms(44),
    borderWidth: 3,
    borderColor: '#1F2937',
  },
  photoPlaceholder: {
    width: ms(88),
    height: ms(88),
    borderRadius: ms(44),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1F2937',
  },
  initials: {
    fontSize: ms(28),
    fontWeight: '800',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#111827',
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  fullName: {
    fontSize: ms(22),
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  aliasName: {
    fontSize: ms(12),
    color: '#6B7280',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 4,
  },
  badgeText: {
    fontSize: ms(11),
    fontWeight: '700',
  },
  houseBadge: {
    backgroundColor: '#1F293740',
    borderColor: '#374151',
  },
  houseBadgeText: {
    fontSize: ms(11),
    fontWeight: '700',
    color: '#D1D5DB',
  },
  resBadge: {
    backgroundColor: '#F59E0B15',
    borderColor: '#F59E0B40',
  },
  resBadgeText: {
    fontSize: ms(10),
    fontWeight: '800',
    color: '#F59E0B',
  },
  cmBadge: {
    backgroundColor: '#F59E0B15',
    borderColor: '#F59E0B40',
  },
  cmBadgeText: {
    fontSize: ms(10),
    fontWeight: '800',
    color: '#F59E0B',
  },
  minBadge: {
    backgroundColor: '#8B5CF615',
    borderColor: '#8B5CF640',
  },
  minBadgeText: {
    fontSize: ms(10),
    fontWeight: '700',
    color: '#8B5CF6',
  },
  constituencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  constituencyText: {
    fontSize: ms(13),
    color: '#9CA3AF',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A1A80',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: ms(15),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: ms(10),
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#374151',
  },
  shareBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
