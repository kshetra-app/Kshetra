import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { LiveConstituencyResult } from '../lib/electionLiveTypes';
import { COUNTING_STATUS_CONFIG } from '../lib/electionLiveTypes';
import { useTheme } from '../lib/theme';

interface ConstituencyResultCardProps {
  result: LiveConstituencyResult;
  onPress?: () => void;
}

export default function ConstituencyResultCard({ result, onPress }: ConstituencyResultCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const statusConfig = COUNTING_STATUS_CONFIG[result.countingStatus];
  const leader = result.candidates.find((c) => c.isLeading || c.isWinner);
  const isComplete = result.countingStatus === 'result_declared';

  return (
    <Pressable style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }, result.isUpset && styles.upsetCard]} onPress={onPress}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.acName, { color: colors.text }]}>{result.acName}</Text>
          <Text style={[styles.acMeta, { color: colors.textMuted }]}>AC #{result.acNo} · {result.districtName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      {result.isUpset && (
        <View style={styles.upsetBanner}>
          <Ionicons name="flash" size={14} color="#D97706" />
          <Text style={styles.upsetText}>{t('liveElection.upset')} {result.previousWinnerParty} {t('liveElection.lostSeat')}</Text>
        </View>
      )}

      {/* Candidates */}
      {result.candidates.slice(0, 3).map((candidate, idx) => {
        const isTop = idx === 0 || candidate.isLeading || candidate.isWinner;
        return (
          <View key={candidate.name} style={[styles.candidateRow, { borderBottomColor: colors.border }, isTop && { backgroundColor: colors.surfaceElevated, borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -4 }]}>
            <View style={[styles.candidateDot, { backgroundColor: candidate.partyColor }]} />
            <View style={styles.candidateInfo}>
              <View style={styles.candidateNameRow}>
                <Text style={[styles.candidateName, { color: isTop ? colors.text : colors.textSecondary }, isTop && styles.candidateNameTop]}>{candidate.name}</Text>
                {(candidate.isWinner || candidate.isLeading) && (
                  <Ionicons name={candidate.isWinner ? 'trophy' : 'arrow-up'} size={12} color={candidate.isWinner ? colors.gold : colors.success} />
                )}
              </View>
              <Text style={[styles.candidateParty, { color: colors.textMuted }]}>{candidate.party}</Text>
            </View>
            <View style={styles.candidateVotes}>
              <Text style={[styles.voteCount, { color: isTop ? colors.text : colors.textSecondary }, isTop && styles.voteCountTop]}>{candidate.votes.toLocaleString()}</Text>
              <Text style={[styles.votePct, { color: colors.textMuted }]}>{candidate.votePercent.toFixed(1)}%</Text>
            </View>
          </View>
        );
      })}

      {/* Margin + Round */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {isComplete ? t('liveElection.margin') : t('liveElection.lead')}: {result.marginVotes.toLocaleString()} {t('common.votes')}
        </Text>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>{t('liveElection.round')} {result.roundNumber}/{result.totalRounds}</Text>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>{t('liveElection.turnout')}: {result.turnoutPercent}%</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, marginHorizontal: 16, marginVertical: 5, padding: 14, borderWidth: 1 },
  upsetCard: { borderColor: '#D97706' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  acName: { fontSize: 15, fontWeight: '700' },
  acMeta: { fontSize: 11, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  upsetBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F59E0B15', padding: 8, borderRadius: 8, marginBottom: 8 },
  upsetText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  candidateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1 },
  candidateRowTop: {},
  candidateDot: { width: 10, height: 10, borderRadius: 5 },
  candidateInfo: { flex: 1 },
  candidateNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  candidateName: { fontSize: 13, fontWeight: '600' },
  candidateNameTop: { fontWeight: '800' },
  candidateParty: { fontSize: 10 },
  candidateVotes: { alignItems: 'flex-end' },
  voteCount: { fontSize: 13, fontWeight: '600' },
  voteCountTop: { fontWeight: '800' },
  votePct: { fontSize: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  footerText: { fontSize: 10, fontWeight: '600' },
});
