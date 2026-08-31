import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Share, Image } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getPartyColor } from '../../lib/constants';
import CandidateAvatar from '../../components/CandidateAvatar';
import {
  getMLAProfileForState,
  getDemographicsForState,
  getHistoryForState,
  isStrongholdForState,
  getElectionHistoryForState,
  hasFullDataForState,
  getTimelineForState,
} from '../../lib/stateDataDispatcher';
import { getTriviaForConstituencyInState } from '../../lib/stateTriviaAdapter';
import { getUnifiedConstituenciesForState, type UnifiedConstituency } from '../../lib/stateDataAdapter';
import { hasHierarchyData } from '../../lib/hierarchyData';
import { selectFreshTrivia } from '../../lib/triviaSelector';
import { useSeedDataWithLoading } from '../../lib/useSeedDataWithLoading';
import { STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../../stores/activeState';
import { useFavoritesStore } from '../../stores/favorites';
import { useRecentsStore } from '../../stores/recents';
import { useMyConstituencyStore } from '../../stores/myConstituency';
import { useFeedStore } from '../../stores/feed';
import { useCivicStore } from '../../stores/civic';
import MLACard from '../../components/MLACard';
import TriviaCard from '../../components/TriviaCard';
import DefectionBadge from '../../components/DefectionBadge';
import AIAnalysisCard from '../../components/AIAnalysisCard';
import AffidavitCard from '../../components/AffidavitCard';
import PhotoViewerModal from '../../components/PhotoViewerModal';
import ConstituencyTabBar, { type ConstituencyTab } from '../../components/ConstituencyTabBar';
import PostCard from '../../components/PostCard';
import PollCard from '../../components/PollCard';
import IssueCard from '../../components/IssueCard';
import HeadlineCard from '../../components/HeadlineCard';
import PoliticalTimelineCard from '../../components/PoliticalTimelineCard';
import { ConstituencyCardSkeleton, TextSkeleton } from '../../components/SkeletonLoaders';
import { useTheme } from '../../lib/theme';
import {
  getLocalizedStateName,
  getLocalizedDistrictName,
  getLocalizedPartyName,
  getLocalizedReservation,
  getLocalizedConstituencyName,
} from '../../lib/stateTranslations';


export default function ConstituencyDetailScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const stateCodeStore = useActiveStateStore((s) => s.stateCode);
  const setStateCode = useActiveStateStore((s) => s.setStateCode);

  const { parsedStateCode, parsedAcNo } = useMemo(() => {
    let sCode = stateCodeStore;
    let aNo = parseInt(id, 10);
    if (id && typeof id === 'string' && id.includes('-AC-')) {
      const parts = id.split('-AC-');
      sCode = parts[0].toUpperCase();
      aNo = parseInt(parts[1], 10);
    }
    return { parsedStateCode: sCode, parsedAcNo: aNo };
  }, [id, stateCodeStore]);

  const stateCode = parsedStateCode;
  const acNo = parsedAcNo;
  const insets = useSafeAreaInsets();
  const hasFull = hasFullDataForState(stateCode);

  useEffect(() => {
    if (parsedStateCode && parsedStateCode !== 'IN' && parsedStateCode !== stateCodeStore) {
      setStateCode(parsedStateCode);
    }
  }, [parsedStateCode, stateCodeStore, setStateCode]);

  // ─── Phase 4: Loading states for seed data ───
  const { loading: seedDataLoading } = useSeedDataWithLoading(stateCode);

  /** Look up constituency from the active state's unified data */
  const stateConstituencies = useMemo(
    () => getUnifiedConstituenciesForState(stateCode),
    [stateCode],
  );
  const constituency = useMemo(
    () => stateConstituencies.find((c) => c.acNo === acNo) ?? null,
    [stateConstituencies, acNo],
  );

  const localizedConstName = constituency
    ? getLocalizedConstituencyName(constituency.acNo, stateCode, constituency.name, i18n.language, constituency.localName)
    : '';
  const localizedDistrict = constituency
    ? getLocalizedDistrictName(constituency.district, i18n.language) || constituency.district
    : '';
  const localizedReservation = constituency
    ? getLocalizedReservation(constituency.type, i18n.language) || constituency.type
    : '';
  const localizedWinnerParty = constituency
    ? getLocalizedPartyName(constituency.winnerParty, i18n.language) || constituency.winnerParty
    : '';
  const localizedRunnerUp = constituency
    ? getLocalizedPartyName(constituency.runnerUp, i18n.language) || constituency.runnerUp
    : '';

  const [activeTab, setActiveTab] = useState<ConstituencyTab>('overview');
  const [photoViewer, setPhotoViewer] = useState<{ uri: string | null; name: string; party: string } | null>(null);
  const isFavorite = useFavoritesStore((s) => s.isFavorite(acNo));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const addRecent = useRecentsStore((s) => s.addRecent);
  const isHome = useMyConstituencyStore((s) => s.isHome(acNo));
  const isMyHome = isHome;
  const setHome = useMyConstituencyStore((s) => s.setHome);
  const clearHome = useMyConstituencyStore((s) => s.clearHome);
  const scrollRef = useRef<ScrollView>(null);

  // Civic store for issues tab
  const civicIssues = useCivicStore((s) => s.issues);
  const civicHeadlines = useCivicStore((s) => s.headlines);
  const addIssue = useCivicStore((s) => s.addIssue);
  const civicToggleUpvote = useCivicStore((s) => s.toggleUpvote);
  const civicToggleFollow = useCivicStore((s) => s.toggleFollow);
  const civicShareIssue = (issueId: string) => {
    const iss = civicIssues.find((i) => i.id === issueId);
    return iss ? `${iss.title}\n\n— via Kshetra` : '';
  };

  // Feed store for community posts & polls
  const feedPosts = useFeedStore((s) => s.posts);
  const feedToggleReaction = useFeedStore((s) => s.toggleReaction);
  const feedVotePoll = useFeedStore((s) => s.votePoll);

  const constituencyIssues = useMemo(
    () => civicIssues.filter((i) => i.constituencyName === constituency?.name || i.stateCode === stateCode),
    [civicIssues, constituency, stateCode],
  );

  const constituencyPosts = useMemo(
    () => feedPosts.filter((p) => p.constituencyName === constituency?.name || p.stateCode === stateCode),
    [feedPosts, constituency, stateCode],
  );

  const constituencyHeadlines = useMemo(
    () => civicHeadlines.filter((h) => (constituency ? h.constituencyId === `${stateCode}-AC-${constituency.acNo}` : false) || h.stateCode === stateCode),
    [civicHeadlines, constituency, stateCode],
  );

  const [issueFilter, setIssueFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [reportSheetVisible, setReportSheetVisible] = useState(false);

  // ─── Scroll ref for tab changes ───
  const handleTabChange = useCallback((tab: ConstituencyTab) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  useEffect(() => {
    if (constituency) {
      addRecent({
        acNo: constituency.acNo,
        name: constituency.name,
        district: constituency.district,
        party: constituency.winnerParty,
        stateCode: stateCode,
      });
    }
  }, [constituency, addRecent, stateCode]);

  if (!constituency) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: t('constituency.notFoundTitle'),
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.primary,
          }}
        />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {t('constituency.notFoundDesc')}
          </Text>
        </View>
      </View>
    );
  }

  const partyColor = getPartyColor(constituency.winnerParty);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: constituency.name,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
        }}
      />
      {/* Phase 4: Show skeleton while seed data loads */}
      {seedDataLoading && hasFull && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <ConstituencyCardSkeleton />
          <ConstituencyCardSkeleton />
          <ConstituencyCardSkeleton />
        </ScrollView>
      )}

      {!seedDataLoading && (
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 80 }]}
      >
        {/* Hero */}
        <View style={[styles.hero, { borderBottomColor: colors.border }]}>
          <Text style={[styles.acNumber, { color: colors.textMuted }]}>AC #{constituency.acNo}</Text>
          <Text style={[styles.name, { color: colors.text }]}>{localizedConstName || constituency.name}</Text>
          <Text style={[styles.district, { color: colors.textSecondary }]}>{localizedDistrict} {t('constituency.districtLabel')}</Text>
          <View style={styles.heroActions}>
            <View style={[styles.typeBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
              <Text style={[styles.typeBadgeText, { color: colors.textSecondary }]}>{localizedReservation}</Text>
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

        {/* Follow Constituency */}
        <Pressable
          style={[
            styles.followButton,
            isFavorite && styles.followButtonActive,
          ]}
          onPress={() => toggleFavorite(acNo)}
        >
          <Ionicons
            name={isFavorite ? 'notifications' : 'notifications-outline'}
            size={18}
            color={isFavorite ? '#4F8EF7' : '#6B7280'}
          />
          <Text style={[styles.followButtonText, isFavorite && styles.followButtonTextActive]}>
            {isFavorite ? t('constituencyExtended.followingConstituency') : t('constituencyExtended.followConstituency')}
          </Text>
          {isFavorite && (
            <Ionicons name="checkmark-circle" size={16} color="#4F8EF7" />
          )}
        </Pressable>

        {/* ═══ Tab Bar ═══ */}
        <ConstituencyTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          issueBadge={constituencyIssues.length}
          pulseBadge={constituencyPosts.length}
          newsBadge={constituencyHeadlines.length}
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ═══ TAB: OVERVIEW ═══ */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (<>

        {/* 2023 Result Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('constituency.electionResult', { year: constituency.electionYear })}</Text>
          <View style={styles.resultCard}>
            <View style={styles.resultRow}>
              <View style={styles.resultLeft}>
                <CandidateAvatar
                  name={constituency.winnerName}
                  party={constituency.winnerParty}
                  size={52}
                  onPress={(uri) => setPhotoViewer({ uri, name: constituency.winnerName, party: constituency.winnerParty })}
                />
                <View>
                  <Text style={styles.resultParty}>
                    {localizedWinnerParty}
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
                  {localizedRunnerUp}
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
              <Pressable
                style={styles.fullProfileBtn}
                onPress={() => router.push(`/legislator/MLA_${stateCode}_${constituency.electionYear}_${constituency.name}_${constituency.acNo}` as any)}
              >
                <Ionicons name="person-circle" size={16} color="#4F8EF7" />
                <Text style={styles.fullProfileBtnText}>{t('constituencyExtended.viewCompleteProfile')}</Text>
                <Ionicons name="chevron-forward" size={14} color="#4F8EF7" />
              </Pressable>
            </View>
          ) : null;
        })()}

        {/* Administrative Hierarchy drill-down (Booth → Panchayat → Mandal) */}
        {hasHierarchyData(stateCode, acNo) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('constituencyExtended.administrativeHierarchy')}</Text>
            <Pressable
              style={styles.fullProfileBtn}
              onPress={() => router.push(`/hierarchy/${stateCode}-AC-${acNo}` as any)}
            >
              <Ionicons name="git-branch" size={16} color="#4F8EF7" />
              <Text style={styles.fullProfileBtnText}>{t('constituencyExtended.exploreHierarchy')}</Text>
              <Ionicons name="chevron-forward" size={14} color="#4F8EF7" />
            </Pressable>
          </View>
        )}

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
          const allTrivia = getTriviaForConstituencyInState(stateCode, acNo).filter(
            (ti) => !ti.contexts.every((c) => c.type === 'GLOBAL'),
          );
          const triviaItems = selectFreshTrivia(allTrivia, 5);
          return triviaItems.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('constituency.trivia')}</Text>
              <TriviaCard items={triviaItems} rotateInterval={0} />
            </View>
          ) : null;
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
                    <Text style={styles.demoBarLabel}>{t('constituencyExtended.scLabel')}</Text>
                    <View style={styles.demoBarTrack}>
                      <View style={[styles.demoBarFill, { width: `${demo.scPercent}%`, backgroundColor: '#F59E0B' }]} />
                    </View>
                    <Text style={styles.demoBarValue}>{demo.scPercent}%</Text>
                  </View>
                  <View style={styles.demoBarRow}>
                    <Text style={styles.demoBarLabel}>{t('constituencyExtended.stLabel')}</Text>
                    <View style={styles.demoBarTrack}>
                      <View style={[styles.demoBarFill, { width: `${demo.stPercent}%`, backgroundColor: '#10B981' }]} />
                    </View>
                    <Text style={styles.demoBarValue}>{demo.stPercent}%</Text>
                  </View>
                  <View style={styles.demoBarRow}>
                    <Text style={styles.demoBarLabel}>{t('constituencyExtended.urbanLabel')}</Text>
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

        </>)}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ═══ TAB: ISSUES ═══ */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'issues' && (
          <View style={styles.tabContent}>
            {constituencyIssues.length > 0 ? (
              <>
                <View style={styles.tabHeader}>
                  <Text style={styles.tabHeaderTitle}>{t('constituencyExtended.civicIssues')}</Text>
                  <Text style={styles.tabHeaderCount}>{constituencyIssues.length} {constituencyIssues.length === 1 ? t('constituencyExtended.issue') : t('constituencyExtended.issues')}</Text>
                </View>
                {/* Issue summary stats */}
                <View style={styles.issueStatsRow}>
                  {(['open', 'in_progress', 'resolved'] as const).map((status) => {
                    const count = constituencyIssues.filter((i) => i.status === status).length;
                    const statusColors = { open: '#3B82F6', in_progress: '#F59E0B', resolved: '#10B981' };
                    const labels = { open: t('constituencyExtended.issueStatus.open'), in_progress: t('constituencyExtended.issueStatus.inProgress'), resolved: t('constituencyExtended.issueStatus.resolved') };
                    return (
                      <View key={status} style={styles.issueStatItem}>
                        <Text style={[styles.issueStatValue, { color: statusColors[status] }]}>{count}</Text>
                        <Text style={styles.issueStatLabel}>{labels[status]}</Text>
                      </View>
                    );
                  })}
                </View>
                {constituencyIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onUpvote={() => civicToggleUpvote(issue.id)}
                    onPress={() => router.push(`/issue/${issue.id}` as any)}
                    onFollow={() => civicToggleFollow(issue.id)}
                    onShare={async () => {
                      const text = civicShareIssue(issue.id);
                      if (text) try { await Share.share({ message: text }); } catch (_) {}
                    }}
                  />
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color="#374151" />
                <Text style={styles.emptyTitle}>{t('constituencyExtended.noIssuesReported')}</Text>
                <Text style={styles.emptySubtitle}>{t('constituencyExtended.noIssuesMsg', { defaultValue: 'No civic issues have been reported for this constituency yet. Be the first to report one!' })}</Text>
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ═══ TAB: PULSE ═══ */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'pulse' && (
          <View style={styles.tabContent}>
            {constituencyPosts.length > 0 ? (
              <>
                <View style={styles.tabHeader}>
                  <Text style={styles.tabHeaderTitle}>{t('constituencyExtended.communityPulse')}</Text>
                  <Text style={styles.tabHeaderCount}>{constituencyPosts.length} {constituencyPosts.length === 1 ? t('common.post') : t('common.posts')}</Text>
                </View>
                {constituencyPosts.map((post) => (
                  <View key={post.id}>
                    <PostCard
                      post={post}
                      compact
                      onReact={() => feedToggleReaction(post.id, 'like')}
                      onShare={async () => {
                        try {
                          await Share.share({
                            message: `${post.content.slice(0, 200)}${post.content.length > 200 ? '...' : ''}\n\n— via Kshetra`,
                          });
                        } catch (_) {}
                      }}
                    />
                    {post.poll && (
                      <View style={{ paddingHorizontal: 16, marginTop: -4, marginBottom: 10 }}>
                        <PollCard
                          poll={post.poll}
                          onVote={(optId) => feedVotePoll(post.id, optId)}
                        />
                      </View>
                    )}
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color="#374151" />
                <Text style={styles.emptyTitle}>{t('constituencyExtended.noDiscussions')}</Text>
                <Text style={styles.emptySubtitle}>{t('constituencyExtended.startConversation', { defaultValue: 'Start a conversation about this constituency on the Feed tab. Posts tagged to this area will appear here.' })}</Text>
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ═══ TAB: NEWS ═══ */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'news' && (
          <View style={styles.tabContent}>
            {constituencyHeadlines.length > 0 ? (
              <>
                <View style={styles.tabHeader}>
                  <Text style={styles.tabHeaderTitle}>{t('constituencyExtended.newsAndHeadlines')}</Text>
                  <Text style={styles.tabHeaderCount}>{constituencyHeadlines.length} {constituencyHeadlines.length === 1 ? t('constituencyExtended.article', { defaultValue: 'article' }) : t('constituencyExtended.articles', { defaultValue: 'articles' })}</Text>
                </View>
                <View style={{ paddingHorizontal: 16 }}>
                  {constituencyHeadlines.map((hl) => (
                    <HeadlineCard key={hl.id} headline={hl} />
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={48} color="#374151" />
                <Text style={styles.emptyTitle}>{t('constituencyExtended.noLocalNews', { defaultValue: 'No Local News' })}</Text>
                <Text style={styles.emptySubtitle}>{t('constituencyExtended.noNewsMsg', { defaultValue: 'No news articles are currently tagged to this constituency. Check back later or view state-level news in the Dashboard.' })}</Text>
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ═══ TAB: HISTORY ═══ */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (<>

        {/* Per-Constituency Election History (moved from overview) */}
        {hasFull && (() => {
          const pastElections = getHistoryForState(stateCode, acNo);
          const currentParty = constituency.currentParty ?? constituency.winnerParty;
          const stronghold = isStrongholdForState(stateCode, acNo, currentParty);
          const normalize = (p: string) => (p === 'TRS' ? 'BRS' : p);

          const elections = [
            ...pastElections,
            { year: constituency.electionYear, winner: constituency.winnerName, party: constituency.winnerParty },
          ];

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
                        <CandidateAvatar
                          name={e.winner}
                          party={e.party === 'TRS' ? 'BRS' : e.party}
                          size={36}
                        />
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

        {/* Political Events Timeline */}
        {(() => {
          const events = getTimelineForState(stateCode, acNo);
          if (events.length === 0) return null;
          return (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('constituency.politicalEvents', 'Political Events')}</Text>
              {events.map(event => (
                <PoliticalTimelineCard key={event.id} event={event} />
              ))}
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

        </>)}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ═══ TAB: X-RAY ═══ */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'xray' && (<>

        {/* Candidate Transparency — Affidavit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('constituencyExtended.candidateTransparency')}</Text>
          <AffidavitCard stateCode={stateCode} acNo={acNo} electionYear={constituency.electionYear} />
        </View>

        {/* AI Analysis */}
        <View style={styles.section}>
          <AIAnalysisCard acNo={acNo} constituencyName={constituency.name} stateCode={stateCode} />
        </View>

        </>)}

      </ScrollView>
      )}

      <PhotoViewerModal
        visible={!!photoViewer}
        imageUri={photoViewer?.uri ?? null}
        name={photoViewer?.name ?? ''}
        party={photoViewer?.party ?? ''}
        subtitle={constituency ? `${constituency.name} · ${constituency.district}` : undefined}
        onClose={() => setPhotoViewer(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
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
  },
  acNumber: {
    fontSize: 13,
    fontWeight: '600',
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  district: {
    fontSize: 15,
    marginTop: 4,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  typeBadge: {
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  homeButtonActive: {},
  homeButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  homeButtonTextActive: {},
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FAF6EE',
    borderWidth: 1,
    borderColor: '#D8BC7E',
    gap: 8,
  },
  followButtonActive: {
    backgroundColor: '#A8201A15',
    borderColor: '#A8201A40',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6D5549',
  },
  followButtonTextActive: {
    color: '#A8201A',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#241814',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D8BC7E',
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
    backgroundColor: '#F5EFE4',
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
    color: '#241814',
  },
  resultCandidate: {
    fontSize: 13,
    color: '#6D5549',
    marginTop: 2,
  },
  resultRight: {
    alignItems: 'flex-end',
  },
  resultVotes: {
    fontSize: 20,
    fontWeight: '800',
    color: '#241814',
  },
  resultLabel: {
    fontSize: 11,
    color: '#8E7B6F',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8DED1',
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
    color: '#241814',
  },
  statLabel: {
    fontSize: 11,
    color: '#8E7B6F',
    marginTop: 4,
  },
  demoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D8BC7E',
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
    color: '#241814',
    marginTop: 4,
  },
  demoLabel: {
    fontSize: 10,
    color: '#8E7B6F',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  demoDivider: {
    height: 1,
    backgroundColor: '#E8DED1',
    marginVertical: 12,
  },
  demoSubTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D5549',
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
    color: '#6D5549',
    width: 44,
  },
  demoBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F5EFE4',
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
    color: '#8E7B6F',
    width: 40,
    textAlign: 'right',
  },
  demoDisclaimer: {
    fontSize: 10,
    color: '#8E7B6F',
    fontStyle: 'italic',
    textAlign: 'right',
    marginTop: 8,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D8BC7E',
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
    color: '#241814',
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
    color: '#6D5549',
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
    color: '#6D5549',
    width: 44,
  },
  historyBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F5EFE4',
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
    color: '#8E7B6F',
    width: 28,
    textAlign: 'right',
  },
  historyTurnout: {
    fontSize: 11,
    color: '#8E7B6F',
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
    color: '#D97706',
  },
  histCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8BC7E',
  },
  histCardCurrent: {
    borderWidth: 1,
    borderColor: '#A8201A',
    backgroundColor: '#FAF6EE',
  },
  histCardLeft: {
    width: 54,
    marginRight: 14,
    alignItems: 'center',
  },
  histYear: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6D5549',
  },
  histYearCurrent: {
    color: '#A8201A',
  },
  histCurrentLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A8201A',
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
  fullProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: '#4F8EF710',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4F8EF730',
  },
  fullProfileBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F8EF7',
  },
  // ─── Tab content styles ───
  tabContent: {
    paddingTop: 16,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  tabHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabHeaderCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  issueStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F5EFE4',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  issueStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  issueStatValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  issueStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
});
