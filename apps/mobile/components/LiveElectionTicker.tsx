import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LiveElectionState, LivePartyTally } from '../lib/electionLiveTypes';
import { ELECTION_PHASE_CONFIG } from '../lib/electionLiveTypes';

interface LiveElectionTickerProps {
  election: LiveElectionState;
  onPress?: () => void;
}

function PartyTallyBar({ tally, totalSeats }: { tally: LivePartyTally; totalSeats: number }) {
  const pct = totalSeats > 0 ? (tally.total / totalSeats) * 100 : 0;
  return (
    <View style={styles.tallyRow}>
      <View style={styles.tallyInfo}>
        <View style={[styles.partyDot, { backgroundColor: tally.partyColor }]} />
        <Text style={styles.partyName}>{tally.party}</Text>
      </View>
      <View style={styles.tallyBarContainer}>
        <View style={[styles.tallyBar, { width: `${Math.min(pct, 100)}%`, backgroundColor: tally.partyColor }]} />
      </View>
      <View style={styles.tallyNumbers}>
        <Text style={[styles.tallyWon, { color: tally.partyColor }]}>{tally.won}</Text>
        <Text style={styles.tallyLeading}>+{tally.leading}</Text>
        <Text style={styles.tallyTotal}>={tally.total}</Text>
        <Text style={[styles.tallyChange, { color: tally.change >= 0 ? '#10B981' : '#EF4444' }]}>
          {tally.change >= 0 ? '↑' : '↓'}{Math.abs(tally.change)}
        </Text>
      </View>
    </View>
  );
}

export default function LiveElectionTicker({ election, onPress }: LiveElectionTickerProps) {
  const { t } = useTranslation();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const phaseConfig = ELECTION_PHASE_CONFIG[election.phase];

  useEffect(() => {
    if (election.isLive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [election.isLive]);

  const majority = Math.ceil(election.totalSeats / 2);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {election.isLive && (
            <View style={styles.liveBadge}>
              <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
              <Text style={styles.liveText}>{t('liveElection.live')}</Text>
            </View>
          )}
          <View style={[styles.phaseBadge, { backgroundColor: phaseConfig.color + '20' }]}>
            <Ionicons name={phaseConfig.icon as any} size={12} color={phaseConfig.color} />
            <Text style={[styles.phaseText, { color: phaseConfig.color }]}>{phaseConfig.label}</Text>
          </View>
        </View>
        <Text style={styles.seats}>{election.resultsDeclared}/{election.totalSeats} {t('liveElection.declared')}</Text>
      </View>

      <Text style={styles.electionName}>{election.electionName}</Text>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${election.countingProgress}%` }]} />
        </View>
        <Text style={styles.progressText}>{election.countingProgress}% {t('liveElection.countingComplete')} · {t('liveElection.majority')}: {majority}</Text>
      </View>

      {/* Party tallies */}
      <View style={styles.tallies}>
        {election.partyWise.slice(0, 5).map((t) => (
          <PartyTallyBar key={t.party} tally={t} totalSeats={election.totalSeats} />
        ))}
      </View>

      {/* Turnout + Last Updated */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="people" size={12} color="#6B7280" />
          <Text style={styles.footerText}>{t('liveElection.turnout')}: {election.overallTurnout}%</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="time" size={12} color="#6B7280" />
          <Text style={styles.footerText}>{t('liveElection.updated')}: {new Date(election.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111827', borderRadius: 16, marginHorizontal: 16, marginVertical: 8, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerLeft: { flexDirection: 'row', gap: 6 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF444420', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  liveText: { fontSize: 10, fontWeight: '900', color: '#EF4444' },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  phaseText: { fontSize: 10, fontWeight: '700' },
  seats: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  electionName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  progressSection: { marginBottom: 12 },
  progressBar: { height: 6, backgroundColor: '#1F2937', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: '#4F8EF7', borderRadius: 3 },
  progressText: { fontSize: 11, color: '#6B7280' },
  tallies: { gap: 6, marginBottom: 10 },
  tallyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tallyInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 50 },
  partyDot: { width: 8, height: 8, borderRadius: 4 },
  partyName: { fontSize: 11, fontWeight: '700', color: '#D1D5DB' },
  tallyBarContainer: { flex: 1, height: 8, backgroundColor: '#1F2937', borderRadius: 4, overflow: 'hidden' },
  tallyBar: { height: '100%', borderRadius: 4 },
  tallyNumbers: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 90, justifyContent: 'flex-end' },
  tallyWon: { fontSize: 12, fontWeight: '800' },
  tallyLeading: { fontSize: 10, color: '#6B7280' },
  tallyTotal: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  tallyChange: { fontSize: 10, fontWeight: '700', marginLeft: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1F2937' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, color: '#6B7280' },
});
