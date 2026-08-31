import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '../lib/constants';
import CandidateAvatar from './CandidateAvatar';
import type { MPProfile } from '../lib/mpTypes';
import { useTheme } from '../lib/theme';

interface MPCardProps {
  profile: MPProfile;
  compact?: boolean;
  onPress?: () => void;
}

function formatINR(val: number): string {
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(1)} Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

import {
  getLocalizedPartyName,
  getLocalizedConstituencyName,
  getLocalizedDetail,
} from '../lib/stateTranslations';

export default function MPCard({ profile, compact, onPress }: MPCardProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const partyColor = getPartyColor(profile.party);

  const houseLabel = profile.house === 'lok_sabha' ? t('parliament.lokSabha') : t('parliament.rajyaSabha');
  const houseColor = profile.house === 'lok_sabha' ? colors.primary : colors.teal;
  const localizedParty = getLocalizedPartyName(profile.party, i18n.language) || profile.party;
  const localizedConstName = profile.constituency
    ? getLocalizedConstituencyName(0, profile.stateCode || '', profile.constituency, i18n.language)
    : '';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
        pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <CandidateAvatar
          name={profile.name}
          party={profile.party}
          size={52}
          photoUrl={profile.photoUrl}
        />
        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{profile.name}</Text>
          {localizedConstName ? (
            <Text style={[styles.constituencyLabel, { color: colors.textMuted }]}>{localizedConstName}</Text>
          ) : null}
          <View style={styles.badgeRow}>
            <View style={[styles.partyBadge, { backgroundColor: partyColor }]}>
              <Text style={styles.partyText}>{localizedParty}</Text>
            </View>
            <View style={[styles.houseBadge, { backgroundColor: houseColor + '20' }]}>
              <Text style={[styles.houseText, { color: houseColor }]}>{houseLabel}</Text>
            </View>
            {profile.isMinister && (
              <View style={[styles.ministerBadge, { backgroundColor: colors.goldLight }]}>
                <Ionicons name="star" size={10} color={colors.gold} />
                <Text style={[styles.ministerText, { color: colors.gold }]}>{t('parliament.mpProfile')}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Minister portfolio */}
      {profile.ministerialPortfolio && (
        <View style={styles.portfolioRow}>
          <Ionicons name="briefcase" size={13} color="#F59E0B" />
          <Text style={styles.portfolioText}>{profile.ministerialPortfolio}</Text>
        </View>
      )}

      {!compact && (
        <>
          {/* Stats */}
          <View style={styles.statsGrid}>
            {profile.age && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.age}</Text>
                <Text style={styles.statLabel}>{t('affidavit.age')}</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.terms}</Text>
              <Text style={styles.statLabel}>{t('parliament.terms')}</Text>
            </View>
            {profile.gender && (
              <View style={styles.statItem}>
                <Ionicons
                  name={profile.gender === 'F' ? 'female' : 'male'}
                  size={14}
                  color={profile.gender === 'F' ? '#EC4899' : '#3B82F6'}
                />
                <Text style={styles.statLabel}>{profile.gender === 'F' ? 'Female' : 'Male'}</Text>
              </View>
            )}
            {profile.totalAssets !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatINR(profile.totalAssets)}</Text>
                <Text style={styles.statLabel}>{t('affidavit.totalAssets')}</Text>
              </View>
            )}
            {profile.criminalCases !== undefined && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, profile.criminalCases > 0 && { color: '#EF4444' }]}>
                  {profile.criminalCases}
                </Text>
                <Text style={styles.statLabel}>{t('affidavit.cases')}</Text>
              </View>
            )}
          </View>

          {/* Parliamentary performance */}
          {(profile.attendancePercent !== undefined || profile.questionsAsked !== undefined) && (
            <View style={styles.perfRow}>
              {profile.attendancePercent !== undefined && (
                <View style={styles.perfItem}>
                  <Ionicons name="checkmark-done" size={13} color="#10B981" />
                  <Text style={styles.perfText}>{profile.attendancePercent}% {t('parliament.attendance')}</Text>
                </View>
              )}
              {profile.questionsAsked !== undefined && (
                <View style={styles.perfItem}>
                  <Ionicons name="help-circle" size={13} color="#4F8EF7" />
                  <Text style={styles.perfText}>{profile.questionsAsked} {t('parliament.questions')}</Text>
                </View>
              )}
              {profile.debatesParticipated !== undefined && (
                <View style={styles.perfItem}>
                  <Ionicons name="chatbubbles" size={13} color="#8B5CF6" />
                  <Text style={styles.perfText}>{profile.debatesParticipated} {t('parliament.debates')}</Text>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1F2937',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  constituencyLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  partyBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  partyText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  houseBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  houseText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ministerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  ministerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  portfolioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  portfolioText: {
    fontSize: 12,
    color: '#6D5549',
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F5EFE4',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#241814',
  },
  statLabel: {
    fontSize: 9,
    color: '#988275',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  perfRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 4,
  },
  perfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  perfText: {
    fontSize: 11,
    color: '#6D5549',
  },
});
