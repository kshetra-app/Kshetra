import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '../../lib/constants';
import { moderateScale as ms } from '../../lib/responsive';
import { useTheme } from '../../lib/theme';

import { useTranslation } from 'react-i18next';
import {
  getLocalizedPartyName,
  getLocalizedStateName,
  getLocalizedDistrictName,
  getLocalizedRole,
  getLocalizedReservation,
} from '../../lib/stateTranslations';

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
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const partyColor = getPartyColor(party);
  // Known legislator houses map to short labels; any other value (e.g. a
  // local-body office label like 'Mayor', 'Corporator', 'Sarpanch', 'ZPTC
  // Member') is displayed verbatim so the SAME hero card renders every tier.
  const LEGISLATOR_HOUSE_LABELS: Record<string, string> = {
    state_assembly: 'MLA',
    lok_sabha: 'MP (LS)',
    rajya_sabha: 'MP (RS)',
    state_council: 'MLC',
  };
  const rawHouseLabel = LEGISLATOR_HOUSE_LABELS[house] ?? house;
  const houseLabel = getLocalizedRole(rawHouseLabel, i18n.language) || rawHouseLabel;
  const genderIcon = gender === 'female' ? 'woman' : 'man';
  const localizedParty = getLocalizedPartyName(party, i18n.language) || party;
  const localizedDistrict = getLocalizedDistrictName(district, i18n.language) || district;
  const localizedState = getLocalizedStateName(stateCode, i18n.language) || stateCode;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}>
      {/* Party color accent background */}
      <View style={[styles.gradient, { backgroundColor: partyColor + '12' }]} />

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
          <Text style={[styles.fullName, { color: colors.text }]} numberOfLines={2}>{displayName}</Text>
          {displayName !== fullName && (
            <Text style={[styles.aliasName, { color: colors.textSecondary }]} numberOfLines={1}>{fullName}</Text>
          )}
        </View>

        {/* Badges Row */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: partyColor + '20', borderColor: partyColor + '50' }]}>
            <Text style={[styles.badgeText, { color: partyColor }]}>{localizedParty}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.surfaceElevated, borderColor: colors.goldBorder || colors.border }]}>
            <Text style={[styles.houseBadgeText, { color: colors.textSecondary }]}>{houseLabel}</Text>
          </View>
          {reservationType && reservationType !== 'general' && (
            <View style={[styles.badge, styles.resBadge]}>
              <Text style={styles.resBadgeText}>{getLocalizedReservation(reservationType, i18n.language)}</Text>
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
              <Ionicons name="briefcase" size={10} color={colors.primary} />
              <Text style={[styles.minBadgeText, { color: colors.primary }]}>{t('common.minister', { defaultValue: 'Minister' })}</Text>
            </View>
          )}
        </View>

        {/* Constituency */}
        <View style={styles.constituencyRow}>
          <Ionicons name="location" size={14} color={colors.primary} />
          <Text style={[styles.constituencyText, { color: colors.textSecondary }]}>{constituency}, {localizedDistrict}</Text>
        </View>

        {/* Quick Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>{age ?? '—'}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('mla.age')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>{termsServed}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{termsServed === 1 ? t('mla.term_1') : t('mla.term_n', { n: termsServed })}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Ionicons name={genderIcon as any} size={16} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{gender === 'female' ? t('mla.female') : t('mla.male')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>{localizedState}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('common.state', { defaultValue: 'State' })}</Text>
          </View>
        </View>
      </View>

      {/* Share button */}
      {onSharePress && (
        <Pressable style={[styles.shareBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]} onPress={onSharePress} hitSlop={8}>
          <Ionicons name="share-outline" size={20} color={colors.text} />
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
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
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
    borderColor: '#C5A059',
  },
  photoPlaceholder: {
    width: ms(88),
    height: ms(88),
    borderRadius: ms(44),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#C5A059',
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
    borderColor: '#FAF6EE',
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  fullName: {
    fontSize: ms(22),
    fontWeight: '800',
    textAlign: 'center',
  },
  aliasName: {
    fontSize: ms(12),
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
    gap: 4,
  },
  badgeText: {
    fontSize: ms(11),
    fontWeight: '700',
  },
  houseBadge: {},
  houseBadgeText: {
    fontSize: ms(11),
    fontWeight: '700',
  },
  resBadge: {
    backgroundColor: '#F59E0B15',
    borderColor: '#F59E0B40',
  },
  resBadgeText: {
    fontSize: ms(10),
    fontWeight: '800',
    color: '#D97706',
  },
  cmBadge: {
    backgroundColor: '#F59E0B15',
    borderColor: '#F59E0B40',
  },
  cmBadgeText: {
    fontSize: ms(10),
    fontWeight: '800',
    color: '#D97706',
  },
  minBadge: {
    backgroundColor: '#A8201A15',
    borderColor: '#A8201A40',
  },
  minBadgeText: {
    fontSize: ms(10),
    fontWeight: '700',
  },
  constituencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  constituencyText: {
    fontSize: ms(13),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  statLabel: {
    fontSize: ms(10),
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  shareBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
