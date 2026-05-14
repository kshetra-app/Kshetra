import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '@/lib/constants';
import { moderateScale as ms } from '@/lib/responsive';

interface ElectionRecord {
  electionYear: number;
  constituencyName: string;
  party: string;
  result: string;
  votesReceived?: number;
  voteShare?: number;
  margin?: number;
  rank?: number;
  totalCandidates?: number;
  runnerUp?: string;
  runnerUpParty?: string;
}

interface Props {
  elections: ElectionRecord[];
}

export default function ElectionHistoryCard({ elections }: Props) {
  if (elections.length === 0) return null;

  const wins = elections.filter(e => e.result === 'won').length;
  const losses = elections.filter(e => e.result === 'lost').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="trophy" size={18} color="#F59E0B" />
        <Text style={styles.title}>Election History</Text>
        <View style={styles.recordBadge}>
          <Text style={styles.recordText}>{wins}W - {losses}L</Text>
        </View>
      </View>

      {/* Win rate bar */}
      <View style={styles.winRateRow}>
        <View style={styles.winRateBar}>
          <View style={[styles.winRateFill, { flex: wins || 0.1 }]} />
          <View style={[styles.lossRateFill, { flex: losses || 0.1 }]} />
        </View>
        <Text style={styles.winRateText}>{Math.round((wins / (elections.length || 1)) * 100)}% win rate</Text>
      </View>

      {/* Timeline */}
      {elections.map((e, idx) => {
        const isWon = e.result === 'won';
        const color = getPartyColor(e.party);
        const isLatest = idx === 0;

        return (
          <View key={`${e.electionYear}-${e.constituencyName}`} style={styles.electionRow}>
            {/* Timeline connector */}
            <View style={styles.timelineCol}>
              <View style={[styles.timelineDot, { backgroundColor: isWon ? '#10B981' : '#EF4444' }]}>
                <Ionicons name={isWon ? 'checkmark' : 'close'} size={10} color="#FFFFFF" />
              </View>
              {idx < elections.length - 1 && <View style={styles.timelineLine} />}
            </View>

            {/* Election details */}
            <View style={[styles.electionCard, isLatest && styles.electionCardLatest]}>
              <View style={styles.electionHeader}>
                <Text style={styles.electionYear}>{e.electionYear}</Text>
                <View style={[styles.resultBadge, { backgroundColor: isWon ? '#10B98120' : '#EF444420' }]}>
                  <Text style={[styles.resultText, { color: isWon ? '#10B981' : '#EF4444' }]}>
                    {isWon ? 'WON' : 'LOST'}
                  </Text>
                </View>
                <View style={[styles.partyChip, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.partyChipText, { color }]}>{e.party}</Text>
                </View>
              </View>

              <Text style={styles.electionConstituency}>{e.constituencyName}</Text>

              {/* Vote stats */}
              <View style={styles.voteRow}>
                {e.votesReceived != null && e.votesReceived > 0 && (
                  <View style={styles.voteItem}>
                    <Text style={styles.voteValue}>{e.votesReceived.toLocaleString()}</Text>
                    <Text style={styles.voteLabel}>votes</Text>
                  </View>
                )}
                {e.voteShare != null && e.voteShare > 0 && (
                  <View style={styles.voteItem}>
                    <Text style={styles.voteValue}>{e.voteShare.toFixed(1)}%</Text>
                    <Text style={styles.voteLabel}>share</Text>
                  </View>
                )}
                {e.margin != null && e.margin > 0 && isWon && (
                  <View style={styles.voteItem}>
                    <Text style={[styles.voteValue, { color: '#10B981' }]}>+{e.margin.toLocaleString()}</Text>
                    <Text style={styles.voteLabel}>margin</Text>
                  </View>
                )}
                {e.rank != null && e.rank > 0 && (
                  <View style={styles.voteItem}>
                    <Text style={styles.voteValue}>#{e.rank}</Text>
                    <Text style={styles.voteLabel}>of {e.totalCandidates || '?'}</Text>
                  </View>
                )}
              </View>

              {/* Runner up */}
              {e.runnerUp && isWon && (
                <Text style={styles.runnerUpText}>
                  vs {e.runnerUp} ({e.runnerUpParty})
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: ms(15),
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  recordBadge: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recordText: {
    fontSize: ms(11),
    fontWeight: '700',
    color: '#F59E0B',
  },
  winRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  winRateBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#1F2937',
  },
  winRateFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  lossRateFill: {
    height: '100%',
    backgroundColor: '#EF4444',
  },
  winRateText: {
    fontSize: ms(10),
    color: '#6B7280',
    fontWeight: '600',
  },
  electionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineCol: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#374151',
    marginVertical: 4,
  },
  electionCard: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  electionCardLatest: {
    borderWidth: 1,
    borderColor: '#374151',
  },
  electionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  electionYear: {
    fontSize: ms(13),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultText: {
    fontSize: ms(9),
    fontWeight: '800',
  },
  partyChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  partyChipText: {
    fontSize: ms(9),
    fontWeight: '700',
  },
  electionConstituency: {
    fontSize: ms(11),
    color: '#9CA3AF',
    marginBottom: 6,
  },
  voteRow: {
    flexDirection: 'row',
    gap: 12,
  },
  voteItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  voteValue: {
    fontSize: ms(12),
    fontWeight: '700',
    color: '#D1D5DB',
  },
  voteLabel: {
    fontSize: ms(9),
    color: '#6B7280',
  },
  runnerUpText: {
    fontSize: ms(10),
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
