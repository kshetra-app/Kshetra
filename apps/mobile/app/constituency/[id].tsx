import { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Share } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '@/lib/constants';
import { TELANGANA_CONSTITUENCIES, TELANGANA_ELECTION_HISTORY, getMLAProfile, getTriviaForConstituency, getConstituencyHistory, isPartyStronghold } from '@/lib/data';
import { useFavoritesStore } from '../../stores/favorites';
import { useRecentsStore } from '../../stores/recents';
import MLACard from '../../components/MLACard';
import TriviaCard from '../../components/TriviaCard';
import DefectionBadge from '../../components/DefectionBadge';

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
            <View style={styles.heroButtons}>
              <Pressable
                style={styles.heroButton}
                onPress={async () => {
                  try {
                    await Share.share({
                      message: `${constituency.name} (AC #${constituency.acNo})\n${constituency.district} District · ${constituency.type}\nWinner: ${constituency.winnerName2023} (${constituency.winner2023})\nMargin: ${constituency.margin2023.toLocaleString()} votes\n\nExplore more on Kshetra`,
                    });
                  } catch (_) {}
                }}
                hitSlop={8}
              >
                <Ionicons name="share-outline" size={20} color="#6B7280" />
              </Pressable>
              <Pressable
                style={styles.heroButton}
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

        {/* Defection Alert */}
        {constituency.currentParty && constituency.currentParty !== constituency.winner2023 && (
          <View style={styles.section}>
            <DefectionBadge
              electedParty={constituency.winner2023}
              currentParty={constituency.currentParty}
            />
          </View>
        )}

        {/* Trivia */}
        {(() => {
          const triviaItems = getTriviaForConstituency(acNo).filter(
            (t) => !t.contexts.every((c) => c.type === 'GLOBAL'),
          );
          return triviaItems.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Did You Know?</Text>
              <TriviaCard items={triviaItems} rotateInterval={0} />
            </View>
          ) : null;
        })()}

        {/* Per-Constituency Election History — 2014 / 2018 / 2023 */}
        {(() => {
          const history = getConstituencyHistory(acNo);
          const currentParty = constituency.currentParty ?? constituency.winner2023;
          const stronghold = isPartyStronghold(acNo, currentParty);
          const normalize = (p: string) => (p === 'TRS' ? 'BRS' : p);

          const elections = [
            history.ac2014 ? { year: 2014, winner: history.ac2014.winner, party: history.ac2014.party } : null,
            history.ac2018 ? { year: 2018, winner: history.ac2018.winner, party: history.ac2018.party } : null,
            { year: 2023, winner: constituency.winnerName2023, party: constituency.winner2023 },
          ].filter(Boolean) as { year: number; winner: string; party: string }[];

          // Check if party changed between elections
          const partyChanged = elections.length >= 2 &&
            normalize(elections[elections.length - 1].party) !== normalize(elections[elections.length - 2].party);

          return (
            <View style={styles.section}>
              <View style={styles.histSectionHeader}>
                <Text style={styles.sectionTitle}>Constituency History</Text>
                {stronghold && (
                  <View style={styles.strongholdBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                    <Text style={styles.strongholdText}>Stronghold</Text>
                  </View>
                )}
                {partyChanged && !stronghold && (
                  <View style={styles.swingBadge}>
                    <Ionicons name="swap-horizontal" size={12} color="#F59E0B" />
                    <Text style={styles.swingText}>Swing Seat</Text>
                  </View>
                )}
              </View>

              {elections.map((e, idx) => {
                const isCurrent = idx === elections.length - 1;
                const prevParty = idx > 0 ? normalize(elections[idx - 1].party) : null;
                const flipped = prevParty !== null && normalize(e.party) !== prevParty;

                return (
                  <View
                    key={e.year}
                    style={[
                      styles.histCard,
                      isCurrent && styles.histCardCurrent,
                    ]}
                  >
                    <View style={styles.histCardLeft}>
                      <Text style={[styles.histYear, isCurrent && styles.histYearCurrent]}>
                        {e.year}
                      </Text>
                      {isCurrent && (
                        <Text style={styles.histCurrentLabel}>Current</Text>
                      )}
                    </View>
                    <View style={styles.histCardCenter}>
                      <View style={styles.histPartyRow}>
                        <View
                          style={[
                            styles.histPartyDot,
                            { backgroundColor: getPartyColor(e.party === 'TRS' ? 'BRS' : e.party) },
                          ]}
                        />
                        <Text style={styles.histPartyName}>{e.party}</Text>
                        {flipped && (
                          <View style={styles.histFlipBadge}>
                            <Ionicons name="arrow-forward" size={10} color="#F59E0B" />
                          </View>
                        )}
                      </View>
                      <Text style={styles.histWinnerName} numberOfLines={1}>
                        {e.winner}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })()}

        {/* State-level election overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Telangana Assembly Overview</Text>
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

        {/* Demographics placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demographics</Text>
          <View style={styles.placeholder}>
            <Ionicons name="people" size={32} color="#4B5563" />
            <Text style={styles.placeholderText}>
              Population, literacy, urban/rural split — coming soon
            </Text>
          </View>
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
  heroButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  heroButton: {
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
  // ─── Per-constituency history ───
  histSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  strongholdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  strongholdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  swingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  swingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  histCard: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    alignItems: 'center',
  },
  histCardCurrent: {
    borderWidth: 1,
    borderColor: '#4F8EF740',
    backgroundColor: '#111827',
  },
  histCardLeft: {
    width: 54,
    marginRight: 14,
    alignItems: 'center',
  },
  histYear: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6B7280',
  },
  histYearCurrent: {
    color: '#4F8EF7',
  },
  histCurrentLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4F8EF7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  histCardCenter: {
    flex: 1,
  },
  histPartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  histPartyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  histPartyName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  histFlipBadge: {
    backgroundColor: '#F59E0B20',
    borderRadius: 4,
    padding: 2,
  },
  histWinnerName: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
