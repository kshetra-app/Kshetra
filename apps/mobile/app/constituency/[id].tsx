import { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Share, Image } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getPartyColor, getCandidatePhotoUrl } from '@/lib/constants';
import {
  getMLAProfileForState,
  getDemographicsForState,
  getHistoryForState,
  isStrongholdForState,
  getElectionHistoryForState,
  hasFullDataForState,
} from '@/lib/stateDataDispatcher';
import { getTriviaForConstituencyInState } from '@/lib/stateTriviaAdapter';
import { getUnifiedConstituenciesForState, type UnifiedConstituency } from '@/lib/stateDataAdapter';
import { STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../../stores/activeState';
import { useFavoritesStore } from '../../stores/favorites';
import { useRecentsStore } from '../../stores/recents';
import { useMyConstituencyStore } from '../../stores/myConstituency';
import MLACard from '../../components/MLACard';
import TriviaCard from '../../components/TriviaCard';
import DefectionBadge from '../../components/DefectionBadge';
import AIAnalysisCard from '../../components/AIAnalysisCard';
import AffidavitCard from '../../components/AffidavitCard';

export default function ConstituencyDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const acNo = parseInt(id, 10);
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const insets = useSafeAreaInsets();
  const hasFull = hasFullDataForState(stateCode);

  /** Look up constituency from the active state's unified data */
  const stateConstituencies = useMemo(
    () => getUnifiedConstituenciesForState(stateCode),
    [stateCode],
  );
  const constituency = useMemo(
    () => stateConstituencies.find((c) => c.acNo === acNo) ?? null,
    [stateConstituencies, acNo],
  );

  const isFavorite = useFavoritesStore((s) => s.isFavorite(acNo));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const addRecent = useRecentsStore((s) => s.addRecent);
  const myHome = useMyConstituencyStore((s) => s.home);
  const setHome = useMyConstituencyStore((s) => s.setHome);
  const clearHome = useMyConstituencyStore((s) => s.clearHome);
  const isMyHome = myHome?.acNo === acNo;

  useEffect(() => {
    if (constituency) {
      addRecent({
        acNo: constituency.acNo,
        name: constituency.name,
        district: constituency.district,
        party: constituency.winnerParty,
      });
    }
  }, [constituency, addRecent]);

  if (!constituency) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: t('constituency.notFound') }} />
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>
            {t('constituency.notFoundMsg', { id })}
          </Text>
        </View>
      </View>
    );
  }

  const partyColor = getPartyColor(constituency.winnerParty);

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 80 }]}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.acNumber}>AC #{constituency.acNo}</Text>
          <Text style={styles.name}>{constituency.name}</Text>
          <Text style={styles.district}>{constituency.district} {t('constituency.districtLabel')}</Text>
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
                      message: `${constituency.name} (AC #${constituency.acNo})\n${constituency.district} District · ${constituency.type}\nWinner: ${constituency.winnerName} (${constituency.winnerParty})\nMargin: ${constituency.margin.toLocaleString()} votes\n\nExplore more on Kshetra`,
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

        {/* Set as My Constituency */}
        <Pressable
          style={[
            styles.homeButton,
            isMyHome && styles.homeButtonActive,
          ]}
          onPress={() => {
            if (isMyHome) {
              clearHome();
            } else {
              setHome({
                acNo: constituency.acNo,
                name: constituency.name,
                district: constituency.district,
                party: constituency.winnerParty,
              });
            }
          }}
        >
          <Ionicons
            name={isMyHome ? 'home' : 'home-outline'}
            size={18}
            color={isMyHome ? '#10B981' : '#6B7280'}
          />
          <Text style={[styles.homeButtonText, isMyHome && styles.homeButtonTextActive]}>
            {isMyHome ? t('constituency.myHome') : t('constituency.setAsHome')}
          </Text>
        </Pressable>

        {/* 2023 Result Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('constituency.electionResult', { year: constituency.electionYear })}</Text>
          <View style={styles.resultCard}>
            <View style={styles.resultRow}>
              <View style={styles.resultLeft}>
                <View style={[styles.resultAvatarWrap, { borderColor: partyColor }]}>
                  <Image
                    source={{ uri: getCandidatePhotoUrl(constituency.winnerName, constituency.winnerParty, 96) }}
                    style={styles.resultAvatar}
                  />
                </View>
                <View>
                  <Text style={styles.resultParty}>
                    {constituency.winnerParty}
                  </Text>
                  <Text style={styles.resultCandidate}>
                    {constituency.winnerName}
                  </Text>
                </View>
              </View>
              <View style={styles.resultRight}>
                <Text style={styles.resultVotes}>
                  {constituency.winnerVotes.toLocaleString()}
                </Text>
                <Text style={styles.resultLabel}>{t('constituency.votes')}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {constituency.margin.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>{t('constituency.margin')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {constituency.runnerUp}
                </Text>
                <Text style={styles.statLabel}>{t('constituency.runnerUp')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {(
                    (constituency.margin /
                      (constituency.winnerVotes || 1)) *
                    100
                  ).toFixed(1)}
                  %
                </Text>
                <Text style={styles.statLabel}>{t('constituency.margin')} %</Text>
              </View>
            </View>
          </View>
        </View>

        {/* MLA Profile */}
        {hasFull && (() => {
          const mla = getMLAProfileForState(stateCode, acNo);
          return mla ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('constituency.currentMlaSection')}</Text>
              <MLACard profile={mla} />
            </View>
          ) : null;
        })()}

        {/* Defection Alert */}
        {constituency.currentParty && constituency.currentParty !== constituency.winnerParty && (
          <View style={styles.section}>
            <DefectionBadge
              electedParty={constituency.winnerParty}
              currentParty={constituency.currentParty}
            />
          </View>
        )}

        {/* Trivia */}
        {hasFull && (() => {
          const triviaItems = getTriviaForConstituencyInState(stateCode, acNo).filter(
            (ti) => !ti.contexts.every((c) => c.type === 'GLOBAL'),
          );
          return triviaItems.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('constituency.trivia')}</Text>
              <TriviaCard items={triviaItems} rotateInterval={0} />
            </View>
          ) : null;
        })()}

        {/* Per-Constituency Election History */}
        {hasFull && (() => {
          const pastElections = getHistoryForState(stateCode, acNo);
          const currentParty = constituency.currentParty ?? constituency.winnerParty;
          const stronghold = isStrongholdForState(stateCode, acNo, currentParty);
          const normalize = (p: string) => (p === 'TRS' ? 'BRS' : p);

          const elections = [
            ...pastElections,
            { year: constituency.electionYear, winner: constituency.winnerName, party: constituency.winnerParty },
          ];

          // Check if party changed between elections
          const partyChanged = elections.length >= 2 &&
            normalize(elections[elections.length - 1].party) !== normalize(elections[elections.length - 2].party);

          return (
            <View style={styles.section}>
              <View style={styles.histSectionHeader}>
                <Text style={styles.sectionTitle}>{t('constituency.constituencyHistory')}</Text>
                {stronghold && (
                  <View style={styles.strongholdBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                    <Text style={styles.strongholdText}>{t('constituency.stronghold')}</Text>
                  </View>
                )}
                {partyChanged && !stronghold && (
                  <View style={styles.swingBadge}>
                    <Ionicons name="swap-horizontal" size={12} color="#F59E0B" />
                    <Text style={styles.swingText}>{t('constituency.swingSeat')}</Text>
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
                        <Text style={styles.histCurrentLabel}>{t('constituency.current')}</Text>
                      )}
                    </View>
                    <View style={styles.histCardCenter}>
                      <View style={styles.histPartyRow}>
                        <View style={[styles.histAvatarWrap, { borderColor: getPartyColor(e.party === 'TRS' ? 'BRS' : e.party) }]}>
                          <Image
                            source={{ uri: getCandidatePhotoUrl(e.winner, e.party, 64) }}
                            style={styles.histAvatar}
                          />
                        </View>
                        <View>
                          <View style={styles.histPartyInner}>
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
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })()}

        {/* State-level election overview */}
        {hasFull && (() => {
          const stateHistory = getElectionHistoryForState(stateCode);
          if (stateHistory.length === 0) return null;
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('constituency.assemblyOverview', { stateName: STATES[stateCode]?.name ?? stateCode })}</Text>
              {stateHistory.map((election) => {
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
                                    width: `${(p.seatsWon / (election.totalSeats || 1)) * 100}%`,
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
                        {t('constituency.turnout')}: {election.turnout}%
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })()}

        {/* Demographics */}
        {hasFull && (() => {
          const demo = getDemographicsForState(stateCode, acNo);
          if (!demo) return null;
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('constituency.demographicsSection')}</Text>
              <View style={styles.demoCard}>
                <View style={styles.demoRow}>
                  <View style={styles.demoItem}>
                    <Ionicons name="people" size={18} color="#4F8EF7" />
                    <Text style={styles.demoValue}>{(demo.population / 1000).toFixed(0)}K</Text>
                    <Text style={styles.demoLabel}>{t('constituency.populationLabel')}</Text>
                  </View>
                  <View style={styles.demoItem}>
                    <Ionicons name="document-text" size={18} color="#10B981" />
                    <Text style={styles.demoValue}>{demo.literacy}%</Text>
                    <Text style={styles.demoLabel}>{t('constituency.literacyLabel')}</Text>
                  </View>
                  <View style={styles.demoItem}>
                    <Ionicons name="business" size={18} color="#F59E0B" />
                    <Text style={styles.demoValue}>{demo.urbanPercent}%</Text>
                    <Text style={styles.demoLabel}>{t('constituency.urbanLabel')}</Text>
                  </View>
                  <View style={styles.demoItem}>
                    <Ionicons name="map" size={18} color="#8B5CF6" />
                    <Text style={styles.demoValue}>{demo.areaSqKm}</Text>
                    <Text style={styles.demoLabel}>{t('constituency.areaSqKm')}</Text>
                  </View>
                </View>

                <View style={styles.demoDivider} />

                <Text style={styles.demoSubTitle}>{t('constituency.voterProfile', { year: constituency.electionYear })}</Text>
                <View style={styles.demoRow}>
                  <View style={styles.demoItem}>
                    <Text style={styles.demoValue}>{(demo.totalVoters / 1000).toFixed(0)}K</Text>
                    <Text style={styles.demoLabel}>{t('constituency.totalVoters')}</Text>
                  </View>
                  <View style={styles.demoItem}>
                    <Text style={styles.demoValue}>{demo.turnout2023}%</Text>
                    <Text style={styles.demoLabel}>{t('constituency.turnoutLabel')}</Text>
                  </View>
                  <View style={styles.demoItem}>
                    <Text style={styles.demoValue}>{(demo.maleVoters / 1000).toFixed(0)}K</Text>
                    <Text style={styles.demoLabel}>{t('constituency.male')}</Text>
                  </View>
                  <View style={styles.demoItem}>
                    <Text style={styles.demoValue}>{(demo.femaleVoters / 1000).toFixed(0)}K</Text>
                    <Text style={styles.demoLabel}>{t('constituency.female')}</Text>
                  </View>
                </View>

                <View style={styles.demoDivider} />

                <Text style={styles.demoSubTitle}>{t('constituency.socialComposition')}</Text>
                <View style={styles.demoBarGroup}>
                  <View style={styles.demoBarRow}>
                    <Text style={styles.demoBarLabel}>SC</Text>
                    <View style={styles.demoBarTrack}>
                      <View style={[styles.demoBarFill, { width: `${demo.scPercent}%`, backgroundColor: '#F59E0B' }]} />
                    </View>
                    <Text style={styles.demoBarValue}>{demo.scPercent}%</Text>
                  </View>
                  <View style={styles.demoBarRow}>
                    <Text style={styles.demoBarLabel}>ST</Text>
                    <View style={styles.demoBarTrack}>
                      <View style={[styles.demoBarFill, { width: `${demo.stPercent}%`, backgroundColor: '#10B981' }]} />
                    </View>
                    <Text style={styles.demoBarValue}>{demo.stPercent}%</Text>
                  </View>
                  <View style={styles.demoBarRow}>
                    <Text style={styles.demoBarLabel}>Urban</Text>
                    <View style={styles.demoBarTrack}>
                      <View style={[styles.demoBarFill, { width: `${demo.urbanPercent}%`, backgroundColor: '#4F8EF7' }]} />
                    </View>
                    <Text style={styles.demoBarValue}>{demo.urbanPercent}%</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.demoDisclaimer}>{t('constituency.demoDisclaimer')}</Text>
            </View>
          );
        })()}

        {/* Candidate Transparency — Affidavit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Candidate Transparency</Text>
          <AffidavitCard stateCode={stateCode} acNo={acNo} electionYear={constituency.electionYear} />
        </View>

        {/* AI Analysis */}
        <View style={styles.section}>
          <AIAnalysisCard acNo={acNo} constituencyName={constituency.name} stateCode={stateCode} />
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
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    gap: 8,
  },
  homeButtonActive: {
    backgroundColor: '#10B98120',
    borderColor: '#10B98140',
  },
  homeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  homeButtonTextActive: {
    color: '#10B981',
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
  resultAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
    marginRight: 12,
  },
  resultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  demoCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
  },
  demoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  demoItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  demoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  demoLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  demoDivider: {
    height: 1,
    backgroundColor: '#1F2937',
    marginVertical: 12,
  },
  demoSubTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  demoBarGroup: {
    gap: 8,
  },
  demoBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoBarLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    width: 44,
  },
  demoBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#1F2937',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  demoBarFill: {
    height: 8,
    borderRadius: 4,
  },
  demoBarValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    width: 40,
    textAlign: 'right',
  },
  demoDisclaimer: {
    fontSize: 10,
    color: '#4B5563',
    fontStyle: 'italic',
    textAlign: 'right',
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
    gap: 8,
    marginBottom: 4,
  },
  histAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
  },
  histAvatar: {
    width: 29,
    height: 29,
    borderRadius: 14.5,
  },
  histPartyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  histPartyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
