/**
 * ChallengeCard — Displays a community challenge with progress and join action.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CHALLENGE_CATEGORY_CONFIG,
  type CommunityChallenge,
  type ChallengeParticipation,
} from '../lib/aspirantTypes';

interface ChallengeCardProps {
  challenge: CommunityChallenge;
  participation?: ChallengeParticipation;
  onJoin?: () => void;
}

export default React.memo(function ChallengeCard({ challenge, participation, onJoin }: ChallengeCardProps) {
  const { t } = useTranslation();
  const catConfig = CHALLENGE_CATEGORY_CONFIG[challenge.category];
  const isJoined = !!participation;
  const isComplete = participation?.completed ?? false;
  const progressPct = participation
    ? Math.min((participation.progress / challenge.targetCount) * 100, 100)
    : 0;

  return (
    <View style={[styles.card, isComplete && styles.cardComplete]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: catConfig.color + '20' }]}>
          <Ionicons name={catConfig.icon as any} size={12} color={catConfig.color} />
          <Text style={[styles.categoryText, { color: catConfig.color }]}>{catConfig.label}</Text>
        </View>
        <View style={styles.pointsBadge}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={styles.pointsText}>{challenge.points} {t('challengeCard.points')}</Text>
        </View>
      </View>

      {/* Title + Description */}
      <Text style={styles.title}>{challenge.title}</Text>
      <Text style={styles.description} numberOfLines={2}>{challenge.description}</Text>

      {/* Progress (if joined) */}
      {isJoined && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {participation!.progress} / {challenge.targetCount}
            </Text>
            <Text style={[styles.progressPercent, isComplete && { color: '#10B981' }]}>
              {isComplete ? t('challengeCard.completed') : `${progressPct.toFixed(0)}%`}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPct}%`,
                  backgroundColor: isComplete ? '#10B981' : catConfig.color,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* State tag */}
      {challenge.stateCode && (
        <View style={styles.stateTag}>
          <Ionicons name="location" size={10} color="#6B7280" />
          <Text style={styles.stateText}>{challenge.stateCode} {t('challengeCard.only')}</Text>
        </View>
      )}

      {/* Action */}
      {!isJoined && (
        <Pressable style={[styles.joinButton, { backgroundColor: catConfig.color }]} onPress={onJoin}>
          <Ionicons name="flash" size={14} color="#FFFFFF" />
          <Text style={styles.joinText}>{t('challengeCard.takeChallenge')}</Text>
        </Pressable>
      )}

      {isComplete && (
        <View style={styles.completeBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.completeText}>{t('challengeCard.challengeComplete')}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 10,
  },
  cardComplete: {
    borderColor: '#10B98140',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  categoryText: { fontSize: 11, fontWeight: '700' },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointsText: { fontSize: 12, fontWeight: '800', color: '#F59E0B' },
  title: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  description: { fontSize: 12, color: '#9CA3AF', lineHeight: 18, marginBottom: 10 },
  progressSection: { marginBottom: 10 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  progressPercent: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  progressTrack: {
    height: 6,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  stateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  stateText: { fontSize: 10, color: '#6B7280' },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  joinText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B98120',
    borderRadius: 8,
    paddingVertical: 8,
  },
  completeText: { fontSize: 13, fontWeight: '700', color: '#10B981' },
});
