import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Poll } from '../lib/feedTypes';

interface PollCardProps {
  poll: Poll;
  onVote: (optionId: string) => void;
}

const BAR_COLORS = ['#4F8EF7', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

export default function PollCard({ poll, onVote }: PollCardProps) {
  const hasVoted = !!poll.userVotedOptionId;
  const showResults = hasVoted || poll.isClosed;

  return (
    <View style={styles.container}>
      {/* Question */}
      <View style={styles.questionRow}>
        <Ionicons name="stats-chart" size={16} color="#8B5CF6" />
        <Text style={styles.question}>{poll.question}</Text>
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
                isSelected && styles.optionSelected,
              ]}
              onPress={() => !showResults && onVote(option.id)}
              disabled={showResults}
            >
              {showResults && (
                <View
                  style={[
                    styles.optionBar,
                    { width: `${pct}%`, backgroundColor: barColor + '30' },
                  ]}
                />
              )}
              <View style={styles.optionContent}>
                <View style={styles.optionLeft}>
                  {!showResults && (
                    <View style={styles.radio} />
                  )}
                  {showResults && isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color={barColor} />
                  )}
                  <Text style={[styles.optionLabel, isSelected && { color: barColor }]}>
                    {option.label}
                  </Text>
                </View>
                {showResults && (
                  <Text style={[styles.optionPct, { color: barColor }]}>{pct}%</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {poll.totalVotes.toLocaleString()} vote{poll.totalVotes !== 1 ? 's' : ''}
        </Text>
        {poll.isClosed && (
          <>
            <Text style={styles.footerDot}>·</Text>
            <Text style={styles.closedText}>Closed</Text>
          </>
        )}
        {poll.expiresAt && !poll.isClosed && (
          <>
            <Text style={styles.footerDot}>·</Text>
            <Text style={styles.footerText}>
              Ends {new Date(poll.expiresAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0D1117',
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#8B5CF620',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  question: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  options: {
    gap: 6,
  },
  option: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#374151',
  },
  optionSelected: {
    borderColor: '#4F8EF7',
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
    gap: 8,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4B5563',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D1D5DB',
    flex: 1,
  },
  optionPct: {
    fontSize: 14,
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
    color: '#6B7280',
    fontWeight: '600',
  },
  footerDot: {
    fontSize: 12,
    color: '#374151',
    marginHorizontal: 6,
  },
  closedText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },
});
