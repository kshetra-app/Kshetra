import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import type { Poll } from '../lib/feedTypes';

interface PollCardProps {
  poll: Poll;
  onVote: (optionId: string) => void;
}

const BAR_COLORS = ['#A8201A', '#C5A059', '#145C68', '#D97706', '#2E7D32'];

export default function PollCard({ poll, onVote }: PollCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const hasVoted = !!poll.userVotedOptionId;
  const showResults = hasVoted || poll.isClosed;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}>
      {/* Question */}
      <View style={styles.questionRow}>
        <Ionicons name="stats-chart" size={16} color={colors.gold} style={{ marginRight: 8, marginTop: 2 }} />
        <Text style={[styles.question, { color: colors.text }]}>{poll.question}</Text>
      </View>

      {/* Options */}
      <View style={styles.options}>
        {poll.options.map((option, idx) => {
          const pct = poll.totalVotes > 0
            ? Math.round((option.voteCount / poll.totalVotes) * 100)
            : 0;
          const isSelected = poll.userVotedOptionId === option.id;
          const barColor = BAR_COLORS[idx % BAR_COLORS.length];

          return (
            <Pressable
              key={option.id}
              style={[
                styles.option,
                { backgroundColor: colors.background, borderColor: colors.border },
                isSelected && { borderColor: colors.primary, borderWidth: 1.5 },
              ]}
              onPress={() => !showResults && onVote(option.id)}
              disabled={showResults}
            >
              {showResults && (
                <View
                  style={[
                    styles.optionBar,
                    { width: `${pct}%`, backgroundColor: barColor + '20' },
                  ]}
                />
              )}
              <View style={styles.optionContent}>
                <View style={styles.optionLeft}>
                  {!showResults && (
                    <View style={[styles.radio, { borderColor: colors.textMuted }]} />
                  )}
                  {showResults && isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color={barColor} style={{ marginRight: 8 }} />
                  )}
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: colors.text },
                      isSelected && { fontWeight: '700', color: colors.primary },
                      !showResults && { marginLeft: 8 },
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
                {showResults && (
                  <Text style={[styles.optionPct, { color: barColor }]}>
                    {pct}%
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Footer info */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          {poll.totalVotes} {t('feed.votes', 'votes')}
        </Text>
        <Text style={[styles.footerDot, { color: colors.textMuted }]}>·</Text>
        {poll.isClosed ? (
          <Text style={styles.closedText}>{t('feed.pollClosed', 'Poll closed')}</Text>
        ) : (
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            {hasVoted ? t('feed.voted', 'Voted') : t('feed.tapToVote', 'Tap to vote')}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  question: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  options: {
    gap: 8,
  },
  option: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
  },
  optionBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 10,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  optionLabel: {
    fontSize: 13,
    flex: 1,
  },
  optionPct: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerDot: {
    fontSize: 12,
    marginHorizontal: 6,
  },
  closedText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },
});
