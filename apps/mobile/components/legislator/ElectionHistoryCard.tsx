import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '../../lib/constants';
import { moderateScale as ms } from '../../lib/responsive';
import { useTheme } from '../../lib/theme';

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
  const { colors } = useTheme();
  if (elections.length === 0) return null;

  const wins = elections.filter(e => e.result === 'won').length;
  const losses = elections.filter(e => e.result === 'lost').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="trophy" size={18} color="#D97706" />
        <Text style={[styles.title, { color: colors.text }]}>Election History</Text>
        <View style={[styles.recordBadge, { backgroundColor: colors.goldLight, borderColor: colors.goldBorder, borderWidth: 1 }]}>
          <Text style={[styles.recordText, { color: colors.gold }]}>{wins}W - {losses}L</Text>
        </View>
      </View>

      {/* Win rate bar */}
      <View style={styles.winRateRow}>
        <View style={[styles.winRateBar, { backgroundColor: colors.surfaceElevated }]}>
          <View style={[styles.winRateFill, { flex: wins || 0.1, backgroundColor: colors.success }]} />
          <View style={[styles.lossRateFill, { flex: losses || 0.1, backgroundColor: colors.danger }]} />
        </View>
        <Text style={[styles.winRateText, { color: colors.textMuted }]}>{Math.round((wins / (elections.length || 1)) * 100)}% win rate</Text>
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
              <View style={[styles.timelineDot, { backgroundColor: isWon ? colors.success : colors.danger }]}>
                <Ionicons name={isWon ? 'checkmark' : 'close'} size={10} color="#FFFFFF" />
              </View>
              {idx < elections.length - 1 && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
            </View>

            {/* Election details */}
            <View style={[styles.electionCard, { backgroundColor: colors.surfaceElevated, borderColor: isLatest ? colors.goldBorder || colors.border : colors.border, borderWidth: 1 }]}>
              <View style={styles.electionHeader}>
                <Text style={[styles.electionYear, { color: colors.text }]}>{e.electionYear}</Text>
                <View style={[styles.resultBadge, { backgroundColor: isWon ? '#10B98120' : '#EF444420' }]}>
                  <Text style={[styles.resultText, { color: isWon ? colors.success : colors.danger }]}>
                    {isWon ? 'WON' : 'LOST'}
                  </Text>
                </View>
                <View style={[styles.partyChip, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.partyChipText, { color }]}>{e.party}</Text>
                </View>
              </View>

              <Text style={[styles.electionConstituency, { color: colors.textSecondary }]}>{e.constituencyName}</Text>

              {/* Vote stats */}
              <View style={styles.voteRow}>
                {e.votesReceived != null && e.votesReceived > 0 && (
                  <View style={styles.voteItem}>
                    <Text style={[styles.voteValue, { color: colors.text }]}>{e.votesReceived.toLocaleString()}</Text>
                    <Text style={[styles.voteLabel, { color: colors.textMuted }]}>votes</Text>
                  </View>
                )}
                {e.voteShare != null && e.voteShare > 0 && (
                  <View style={styles.voteItem}>
                    <Text style={[styles.voteValue, { color: colors.text }]}>{e.voteShare.toFixed(1)}%</Text>
                    <Text style={[styles.voteLabel, { color: colors.textMuted }]}>share</Text>
                  </View>
                )}
                {e.margin != null && e.margin > 0 && isWon && (
                  <View style={styles.voteItem}>
                    <Text style={[styles.voteValue, { color: colors.success }]}>+{e.margin.toLocaleString()}</Text>
                    <Text style={[styles.voteLabel, { color: colors.textMuted }]}>margin</Text>
                  </View>
                )}
              </View>

              {/* Runner up */}
              {e.runnerUp && (
                <Text style={[styles.runnerUpText, { color: colors.textMuted }]}>
                  {isWon ? 'Defeated' : 'Lost to'} {e.runnerUp} {e.runnerUpParty ? `(${e.runnerUpParty})` : ''}
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
    flex: 1,
  },
  recordBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  recordText: {
    fontSize: ms(11),
    fontWeight: '700',
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
  },
  winRateFill: {
    height: '100%',
  },
  lossRateFill: {
    height: '100%',
  },
  winRateText: {
    fontSize: ms(10),
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
    marginVertical: 4,
  },
  electionCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  electionCardLatest: {},
  electionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  electionYear: {
    fontSize: ms(13),
    fontWeight: '800',
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
  },
  voteLabel: {
    fontSize: ms(9),
  },
  runnerUpText: {
    fontSize: ms(10),
    marginTop: 4,
    fontStyle: 'italic',
  },
});
