import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BroadcastPoll, BroadcastPollOption } from '@kshetra/shared';

interface Props {
  poll: BroadcastPoll;
  onVote: (optionId: string) => void;
  isVoting?: boolean;
}

export const BroadcastPollCard: React.FC<Props> = ({ poll, onVote, isVoting = false }) => {
  const hasVoted = poll.hasVoted || poll.status === 'CLOSED';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="stats-chart" size={16} color="#3B82F6" />
          <Text style={styles.livePollLabel}>
            {poll.status === 'ACTIVE' ? 'LIVE AUDIENCE POLL' : 'POLL RESULTS'}
          </Text>
        </View>
        <Text style={styles.voteCount}>{poll.totalVotes} votes</Text>
      </View>

      <Text style={styles.questionText}>{poll.question}</Text>

      <View style={styles.optionsList}>
        {poll.options.map((option: BroadcastPollOption) => {
          const percent = option.percentage ?? 0;
          return (
            <Pressable
              key={option.id}
              style={[
                styles.optionButton,
                hasVoted && styles.optionVotedButton,
              ]}
              disabled={hasVoted || isVoting}
              onPress={() => onVote(option.id)}
            >
              {hasVoted && (
                <View
                  style={[
                    styles.percentageBar,
                    { width: `${percent}%` },
                  ]}
                />
              )}
              <View style={styles.optionContent}>
                <Text style={styles.optionText}>{option.optionText}</Text>
                {hasVoted && (
                  <Text style={styles.percentageText}>{percent}%</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {isVoting && (
        <View style={styles.votingOverlay}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.votingText}>Submitting anonymous ballot...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePollLabel: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  voteCount: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  questionText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  optionsList: {
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
  },
  optionVotedButton: {
    borderColor: '#475569',
  },
  percentageBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  optionText: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '600',
  },
  percentageText: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '700',
  },
  votingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  votingText: {
    color: '#94A3B8',
    fontSize: 12,
  },
});
