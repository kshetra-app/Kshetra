import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '../../lib/constants';
import { moderateScale as ms } from '../../lib/responsive';
import { useTheme } from '../../lib/theme';
import { getStaticPhoto, getCachedPhoto, getSmartInitials } from '../../lib/candidatePhotos';

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
  netWorth?: number | null;
  liabilities?: number | null;
  votes?: number | null;
  margin?: number | null;
  voteShare?: number | null;
  dob?: string | null;
  rank?: "winner" | "ru1" | "ru2";
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
  netWorth,
  liabilities,
  votes,
  margin,
  voteShare,
  dob,
  rank = "winner",
  onPhotoPress,
  onSharePress,
}: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const partyColor = getPartyColor(party);
  const [imgError, setImgError] = useState(false);

  const effectivePhoto = useMemo(() => {
    const raw = photoUrl || getStaticPhoto(fullName) || getStaticPhoto(displayName) || getCachedPhoto(fullName) || getCachedPhoto(displayName) || null;
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed.startsWith('http') || trimmed.includes('.svg') || trimmed.includes('LokSabha2024/photos/')) return null;
    return trimmed.replace(/^http:\/\//i, 'https://');
  }, [photoUrl, fullName, displayName]);

  const LEGISLATOR_HOUSE_LABELS: Record<string, string> = {
    state_assembly: 'MLA',
    lok_sabha: 'MP (LS)',
    rajya_sabha: 'MP (RS)',
    state_council: 'MLC',
  };
  const rawHouseLabel = LEGISLATOR_HOUSE_LABELS[house] ?? house;
  const houseLabel = getLocalizedRole(rawHouseLabel, i18n.language) || rawHouseLabel;
  const localizedParty = getLocalizedPartyName(party, i18n.language) || party;
  const localizedDistrict = getLocalizedDistrictName(district, i18n.language) || district;
  const localizedState = getLocalizedStateName(stateCode, i18n.language) || stateCode;

  // Clean redundant party labels like "TDP TDP" or "INC INC (Congress)"
  const cleanPartyFull = useMemo(() => {
    const raw = (partyFull || localizedParty || '').trim();
    if (!raw) return '';
    if (raw.toUpperCase() === party.toUpperCase()) return '';
    if (raw.toUpperCase().startsWith(party.toUpperCase() + ' ')) {
      return raw.slice(party.length).trim();
    }
    return raw;
  }, [party, partyFull, localizedParty]);

  // Format Net Worth & Margin for Computed Metrics Pills
  const netWorthStr = useMemo(() => {
    if (netWorth == null) return 'Not available';
    const abs = Math.abs(netWorth);
    if (abs >= 10000000) return `₹${(netWorth / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `₹${(netWorth / 100000).toFixed(1)} L`;
    return `₹${netWorth.toLocaleString()}`;
  }, [netWorth]);

  const marginStr = useMemo(() => {
    if (margin == null) return '—';
    return margin > 0 ? `+${margin.toLocaleString()}` : margin.toLocaleString();
  }, [margin]);

  return (
    <View style={[styles.container, { backgroundColor: '#002B7F', borderColor: '#002B7F' }]}>
      {/* Profile label and share */}
      <View style={styles.topBar}>
        <View style={styles.verifiedPill}>
          <Ionicons name="person-circle-outline" size={12} color="#FDE68A" />
          <Text style={styles.verifiedPillText}>Profile record</Text>
        </View>
        {onSharePress && (
          <Pressable style={styles.shareBtnNavy} onPress={onSharePress} hitSlop={8}>
            <Ionicons name="share-outline" size={18} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Photo with verified badge */}
        <Pressable style={styles.photoContainer} onPress={() => onPhotoPress?.(effectivePhoto)}>
          {!imgError && effectivePhoto ? (
            <Image
              key={effectivePhoto}
              source={{
                uri: effectivePhoto,
                headers: {
                  'User-Agent': 'PoligramApp/1.0 (https://kshetra.app; contact@kshetra.app)',
                },
              }}
              style={styles.photo}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: partyColor + '30', borderColor: partyColor }]}>
              <Text style={[styles.initials, { color: '#FFFFFF' }]}>
                {getSmartInitials(displayName || fullName)}
              </Text>
            </View>
          )}
          <View style={[styles.activeCheckBadge, { backgroundColor: rank === 'winner' ? '#10B981' : (rank === 'ru1' ? '#64748B' : '#B45309') }]}>
            <Ionicons name={rank === 'winner' ? "checkmark" : (rank === 'ru1' ? "medal" : "ribbon")} size={10} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* Name & Identity */}
        <View style={styles.nameSection}>
          <View style={styles.partyBadgeRow}>
            <View style={[styles.partyPillBadge, { backgroundColor: partyColor }]}>
              <Text style={styles.partyPillText}>{party}</Text>
            </View>
            {Boolean(cleanPartyFull) && (
              <Text style={styles.partyFullText} numberOfLines={1}>{cleanPartyFull}</Text>
            )}
          </View>

          <Text style={styles.fullNameNavy} numberOfLines={2}>{displayName}</Text>
          {displayName !== fullName && (
            <Text style={styles.aliasNameNavy} numberOfLines={1}>{fullName}</Text>
          )}
          <Text style={styles.officeSubtitle}>
            {rank === 'winner' || isCurrentMember ? houseLabel : (rank === 'ru1' ? '1st Runner-up' : '2nd Runner-up')} · {constituency} ({localizedDistrict})
          </Text>
        </View>

        {/* 3 Key Computed Metrics Pills (Smart Behind-the-Scenes Math) */}
        <View style={styles.computedMetricsRow}>
          <View style={styles.computedMetricPill}>
            <Text style={styles.computedMetricLabel}>{t('legislator.age', { defaultValue: 'Age' })}</Text>
            <Text style={styles.computedMetricValue}>
              {age != null ? age : '—'} <Text style={styles.computedMetricUnit}>{age != null ? 'Yrs' : ''}</Text>
            </Text>
          </View>
          <View style={styles.computedMetricPill}>
            <Text style={styles.computedMetricLabel}>{t('legislator.netWorth', { defaultValue: 'Net Worth' })}</Text>
            <Text style={[styles.computedMetricValue, { color: '#FDE68A' }]}>
              {netWorthStr}
            </Text>
          </View>
          <View style={styles.computedMetricPill}>
            <Text style={styles.computedMetricLabel}>
              {rank === 'winner'
                ? t('constituency.margin', { defaultValue: 'Margin' })
                : t('constituency.votesPolled', { defaultValue: 'Votes Polled' })}
            </Text>
            <Text style={[styles.computedMetricValue, { color: '#6EE7B7' }]}>
              {rank === 'winner'
                ? marginStr
                : (votes != null && votes > 0
                    ? votes.toLocaleString()
                    : (voteShare != null ? `${voteShare.toFixed(1)}%` : '—'))}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#002B7F',
    backgroundColor: '#002B7F',
    shadowColor: '#002B7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(253, 230, 138, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.3)',
  },
  verifiedPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FDE68A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shareBtnNavy: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  photo: {
    width: ms(84),
    height: ms(84),
    borderRadius: ms(42),
    borderWidth: 3,
    borderColor: '#FDE68A',
  },
  photoPlaceholder: {
    width: ms(84),
    height: ms(84),
    borderRadius: ms(42),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  initials: {
    fontSize: ms(26),
    fontWeight: '900',
  },
  activeCheckBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#002B7F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  partyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  partyPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  partyPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  partyFullText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  fullNameNavy: {
    fontSize: ms(20),
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  aliasNameNavy: {
    fontSize: ms(12),
    color: '#FDE68A',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  officeSubtitle: {
    fontSize: ms(12),
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
  },
  computedMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  computedMetricPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  computedMetricLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  computedMetricValue: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  computedMetricUnit: {
    fontSize: 9.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
