import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LiveConstituencyResult } from '../lib/electionLiveTypes';
import { COUNTING_STATUS_CONFIG } from '../lib/electionLiveTypes';

interface ConstituencyResultCardProps {
  result: LiveConstituencyResult;
  onPress?: () => void;
}

export default function ConstituencyResultCard({ result, onPress }: ConstituencyResultCardProps) {
  const statusConfig = COUNTING_STATUS_CONFIG[result.countingStatus];
  const leader = result.candidates.find((c) => c.isLeading || c.isWinner);
  const isComplete = result.countingStatus === 'result_declared';

  return (
    <Pressable style={[styles.card, result.isUpset && styles.upsetCard]} onPress={onPress}>
      <View style={styles.header}>
        <View>
          <Text style={styles.acName}>{result.acName}</Text>
          <Text style={styles.acMeta}>AC #{result.acNo} · {result.districtName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      {result.isUpset && (
        <View style={styles.upsetBanner}>
          <Ionicons name="flash" size={14} color="#F59E0B" />
          <Text style={styles.upsetText}>UPSET — {result.previousWinnerParty} lost this seat!</Text>
        </View>
      )}

      {/* Candidates */}
      {result.candidates.slice(0, 3).map((candidate, idx) => {
        const isTop = idx === 0 || candidate.isLeading || candidate.isWinner;
        return (
          <View key={candidate.name} style={[styles.candidateRow, isTop && styles.candidateRowTop]}>
            <View style={[styles.candidateDot, { backgroundColor: candidate.partyColor }]} />
            <View style={styles.candidateInfo}>
              <View style={styles.candidateNameRow}>
                <Text style={[styles.candidateName, isTop && styles.candidateNameTop]}>{candidate.name}</Text>
                {(candidate.isWinner || candidate.isLeading) && (
                  <Ionicons name={candidate.isWinner ? 'trophy' : 'arrow-up'} size={12} color={candidate.isWinner ? '#F59E0B' : '#10B981'} />
                )}
              </View>
              <Text style={styles.candidateParty}>{candidate.party}</Text>
            </View>
            <View style={styles.candidateVotes}>
              <Text style={[styles.voteCount, isTop && styles.voteCountTop]}>{candidate.votes.toLocaleString()}</Text>
              <Text style={styles.votePct}>{candidate.votePercent.toFixed(1)}%</Text>
            </View>
          </View>
        );
      })}

      {/* Margin + Round */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isComplete ? 'Margin' : 'Lead'}: {result.marginVotes.toLocaleString()} votes
        </Text>
        <Text style={styles.footerText}>Round {result.roundNumber}/{result.totalRounds}</Text>
        <Text style={styles.footerText}>Turnout: {result.turnoutPercent}%</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16, marginVertical: 5, padding: 14, borderWidth: 1, borderColor: '#1F2937' },
  upsetCard: { borderColor: '#F59E0B40' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  acName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  acMeta: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  upsetBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F59E0B15', padding: 8, borderRadius: 8, marginBottom: 8 },
  upsetText: { fontSize: 11, fontWeight: '700', color: '#F59E0B' },
  candidateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1F293740' },
  candidateRowTop: { backgroundColor: '#0D111780', borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -4 },
  candidateDot: { width: 10, height: 10, borderRadius: 5 },
  candidateInfo: { flex: 1 },
  candidateNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  candidateName: { fontSize: 13, fontWeight: '600', color: '#D1D5DB' },
  candidateNameTop: { fontWeight: '800', color: '#FFFFFF' },
  candidateParty: { fontSize: 10, color: '#6B7280' },
  candidateVotes: { alignItems: 'flex-end' },
  voteCount: { fontSize: 13, fontWeight: '600', color: '#D1D5DB' },
  voteCountTop: { fontWeight: '800', color: '#FFFFFF' },
  votePct: { fontSize: 10, color: '#6B7280' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1F2937' },
  footerText: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
});
