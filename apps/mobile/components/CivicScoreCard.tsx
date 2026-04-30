/**
 * CivicScoreCard — Displays a user's civic score breakdown with level badge.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CIVIC_LEVEL_CONFIG,
  type CivicScoreBreakdown,
} from '../lib/aspirantTypes';

interface CivicScoreCardProps {
  score: CivicScoreBreakdown;
  displayName?: string;
}

const SCORE_ITEMS: { key: keyof Omit<CivicScoreBreakdown, 'totalScore' | 'level'>; label: string; icon: string }[] = [
  { key: 'issuesReported', label: 'Issues', icon: 'flag' },
  { key: 'issuesResolved', label: 'Resolved', icon: 'checkmark-circle' },
  { key: 'commentsCount', label: 'Comments', icon: 'chatbubble' },
  { key: 'evidenceSubmitted', label: 'Evidence', icon: 'camera' },
  { key: 'promisesTracked', label: 'Promises', icon: 'eye' },
  { key: 'endorsements', label: 'Endorsements', icon: 'heart' },
  { key: 'modulesCompleted', label: 'Modules', icon: 'school' },
  { key: 'challengesCompleted', label: 'Challenges', icon: 'flash' },
];

export default React.memo(function CivicScoreCard({ score, displayName }: CivicScoreCardProps) {
  const levelConfig = CIVIC_LEVEL_CONFIG[score.level];
  const maxScore = 1000;
  const progressPct = Math.min((score.totalScore / maxScore) * 100, 100);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            {displayName ? `${displayName}'s` : 'Your'} Civic Score
          </Text>
          <View style={[styles.levelBadge, { backgroundColor: levelConfig.color + '20' }]}>
            <Ionicons name={levelConfig.icon as any} size={14} color={levelConfig.color} />
            <Text style={[styles.levelText, { color: levelConfig.color }]}>{levelConfig.label}</Text>
          </View>
        </View>
        <View style={[styles.scoreCircle, { borderColor: levelConfig.color }]}>
          <Text style={[styles.scoreValue, { color: levelConfig.color }]}>{score.totalScore}</Text>
        </View>
      </View>

      {/* Progress to next level */}
      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: levelConfig.color }]} />
        </View>
        <Text style={styles.progressText}>
          {score.totalScore} / {maxScore} to Champion
        </Text>
      </View>

      {/* Breakdown */}
      <View style={styles.breakdown}>
        {SCORE_ITEMS.filter((item) => score[item.key] > 0).map((item) => (
          <View key={item.key} style={styles.breakdownItem}>
            <Ionicons name={item.icon as any} size={14} color="#9CA3AF" />
            <Text style={styles.breakdownLabel}>{item.label}</Text>
            <Text style={styles.breakdownValue}>+{score[item.key]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  levelText: { fontSize: 12, fontWeight: '700' },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: { fontSize: 22, fontWeight: '900' },
  progressSection: { marginBottom: 14 },
  progressTrack: {
    height: 6,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'right',
  },
  breakdown: { gap: 6 },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownLabel: { fontSize: 12, color: '#9CA3AF', flex: 1 },
  breakdownValue: { fontSize: 13, fontWeight: '700', color: '#10B981' },
});
