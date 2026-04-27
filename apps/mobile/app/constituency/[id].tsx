import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '@/lib/constants';
import { TELANGANA_CONSTITUENCIES } from '../../../../data/seed/telangana-constituencies';
import { TELANGANA_ELECTION_HISTORY } from '../../../../data/seed/telangana-election-history';
import { useFavoritesStore } from '../../stores/favorites';
import { useRecentsStore } from '../../stores/recents';
import { getMLAProfile } from '../../../../data/seed/telangana-mla-profiles';
import MLACard from '../../components/MLACard';

export default function ConstituencyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const acNo = parseInt(id, 10);
  const constituency = TELANGANA_CONSTITUENCIES.find((c) => c.acNo === acNo);
  const isFavorite = useFavoritesStore((s) => s.isFavorite(acNo));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const addRecent = useRecentsStore((s) => s.addRecent);

  useEffect(() => {
    if (constituency) {
      addRecent({
        acNo: constituency.acNo,
        name: constituency.name,
        district: constituency.district,
        party: constituency.winner2023,
      });
    }
  }, [constituency, addRecent]);

  if (!constituency) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>
            Constituency #{id} not found
          </Text>
        </View>
      </View>
    );
  }

  const partyColor = getPartyColor(constituency.winner2023);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: constituency.name,
          headerStyle: { backgroundColor: '#0A0A1A' },
          headerTintColor: '#FFFFFF',
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.acNumber}>AC #{constituency.acNo}</Text>
          <Text style={styles.name}>{constituency.name}</Text>
          <Text style={styles.district}>{constituency.district} District</Text>
          <View style={styles.heroActions}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{constituency.type}</Text>
            </View>
            <Pressable
              style={styles.favoriteButton}
              onPress={() => toggleFavorite(acNo)}
              hitSlop={8}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? '#EF4444' : '#6B7280'}
              />
            </Pressable>
          </View>
        </View>

        {/* 2023 Result Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2023 Election Result</Text>
          <View style={styles.resultCard}>
            <View style={styles.resultRow}>
              <View style={styles.resultLeft}>
                <View
                  style={[styles.partyDot, { backgroundColor: partyColor }]}
                />
                <View>
                  <Text style={styles.resultParty}>
                    {constituency.winner2023}
                  </Text>
                  <Text style={styles.resultCandidate}>
                    {constituency.winnerName2023}
                  </Text>
                </View>
              </View>
              <View style={styles.resultRight}>
                <Text style={styles.resultVotes}>
                  {constituency.winnerVotes2023.toLocaleString()}
                </Text>
                <Text style={styles.resultLabel}>votes</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {constituency.margin2023.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Margin</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {constituency.runnerUp2023}
                </Text>
                <Text style={styles.statLabel}>Runner-up</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {(
                    (constituency.margin2023 /
                      constituency.winnerVotes2023) *
                    100
                  ).toFixed(1)}
                  %
                </Text>
                <Text style={styles.statLabel}>Margin %</Text>
              </View>
            </View>
          </View>
        </View>

        {/* MLA Profile */}
        {(() => {
          const mla = getMLAProfile(acNo);
          return mla ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current MLA</Text>
              <MLACard profile={mla} />
            </View>
          ) : null;
        })()}

        {/* Placeholder sections for future */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demographics</Text>
          <View style={styles.placeholder}>
            <Ionicons name="people" size={32} color="#4B5563" />
            <Text style={styles.placeholderText}>
              Population, literacy, urban/rural split — coming soon
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Telangana Election History</Text>
          {TELANGANA_ELECTION_HISTORY.map((election) => {
            const winnerParty = election.partyResults.reduce(
              (prev, curr) => (curr.seatsWon > prev.seatsWon ? curr : prev),
            );
            return (
              <View key={election.year} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyYear}>{election.year}</Text>
                  <View
                    style={[
                      styles.historyWinnerBadge,
                      { backgroundColor: getPartyColor(winnerParty.party) + '30' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyWinnerText,
                        { color: getPartyColor(winnerParty.party) },
                      ]}
                    >
                      {winnerParty.party} {winnerParty.seatsWon}
                    </Text>
                  </View>
                </View>
                {election.notes && (
                  <Text style={styles.historyNotes}>{election.notes}</Text>
                )}
                <View style={styles.historyBars}>
                  {election.partyResults
                    .filter((p) => p.seatsWon > 0)
                    .sort((a, b) => b.seatsWon - a.seatsWon)
                    .map((p) => (
                      <View key={p.party} style={styles.historyBarRow}>
                        <Text style={styles.historyBarLabel}>{p.party}</Text>
                        <View style={styles.historyBarTrack}>
                          <View
                            style={[
                              styles.historyBarFill,
                              {
                                width: `${(p.seatsWon / 119) * 100}%`,
                                backgroundColor: getPartyColor(p.party),
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.historyBarValue}>{p.seatsWon}</Text>
                      </View>
                    ))}
                </View>
                {election.turnout && (
                  <Text style={styles.historyTurnout}>
                    Turnout: {election.turnout}%
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  acNumber: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  district: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 4,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  typeBadge: {
    backgroundColor: '#1F2937',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  resultParty: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultCandidate: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  resultRight: {
    alignItems: 'flex-end',
  },
  resultVotes: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#1F2937',
    marginVertical: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  placeholder: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  historyCard: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyYear: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  historyWinnerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyWinnerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyNotes: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  historyBars: {
    gap: 6,
  },
  historyBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyBarLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    width: 44,
  },
  historyBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#1F2937',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  historyBarFill: {
    height: 8,
    borderRadius: 4,
  },
  historyBarValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    width: 28,
    textAlign: 'right',
  },
  historyTurnout: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 10,
    textAlign: 'right',
  },
});
