import PodiumHistoryCard from '../../components/PodiumHistoryCard';
import {
  getLatestPodiumForConstituency,
  getHistoricalPodiumForConstituency,
  fetchHistoricalPodiumForConstituency,
  sanitizeContestWithSeed,
  getLocalizedCandidateName,
  type HistoricalPodiumContest,
} from '../../lib/historicalPodiumStore';
import { loadHistoricalResultsForState, getHistoricalResults } from '../../lib/seedDataLoader';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Share, Image, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getPartyColor } from '../../lib/constants';
import CandidateAvatar from '../../components/CandidateAvatar';
import { getStaticPhoto } from '../../lib/candidatePhotos';
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
import ShareableCardModal from '../../components/ShareableCardModal';
import ReportIssueSheet from '../../components/ReportIssueSheet';
import ConstituencyTabBar, { type ConstituencyTab } from '../../components/ConstituencyTabBar';
import PostCard from '../../components/PostCard';
import PollCard from '../../components/PollCard';
import IssueCard from '../../components/IssueCard';
import HeadlineCard from '../../components/HeadlineCard';
import PostDetailModal from '../../components/PostDetailModal';
import ComposeSheet from '../../components/ComposeSheet';
import { getHierarchicalNewsForConstituency } from '../../lib/constituencyNewsService';
import type { Post } from '../../lib/feedTypes';
import PoliticalTimelineCard from '../../components/PoliticalTimelineCard';
import { ConstituencyCardSkeleton, TextSkeleton } from '../../components/SkeletonLoaders';
import { useTheme } from '../../lib/theme';
import { gateContentAction, logContentAction } from '../../lib/contentAccountability';
import {
  getLocalizedStateName,
  getLocalizedDistrictName,
  getLocalizedPartyName,
  getLocalizedReservation,
  getLocalizedConstituencyName,
} from '../../lib/stateTranslations';
import { SequenceGuard } from '../../lib/staleResponseGuard';
import { apiClient } from '../../lib/api';
import type { ConstituencyDetailDTO } from '../../lib/api/endpoints/constituencies';


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

  // ─── Phase W021.5 / Directive 084: Canonical Data Path with SequenceGuard ───
  const [apiDetail, setApiDetail] = useState<ConstituencyDetailDTO | null>(null);
  const [dataSource, setDataSource] = useState<'LIVE_API' | 'OFFLINE_SEED' | 'UNAVAILABLE'>('OFFLINE_SEED');
  const [apiLoading, setApiLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const sequenceGuardRef = useRef(new SequenceGuard<string>());

  useEffect(() => {
    if (!stateCode || isNaN(acNo) || acNo <= 0) {
      setApiLoading(false);
      return;
    }

    const token = sequenceGuardRef.current.startRequest(`${stateCode}-${acNo}`);
    setApiLoading(true);
    setApiError(null);

    apiClient.constituencies.getConstituency(stateCode, acNo)
      .then((detail) => {
        if (token.isStale()) return;
        setApiDetail(detail);
        setDataSource('LIVE_API');
        setApiLoading(false);
      })
      .catch((err) => {
        if (token.isStale()) return;
        const localFound = stateConstituencies.find((c) => c.acNo === acNo);
        if (localFound) {
          setDataSource('OFFLINE_SEED');
        } else {
          setDataSource('UNAVAILABLE');
          setApiError(err?.message || 'Constituency unavailable');
        }
        setApiLoading(false);
      });

    return () => {
      sequenceGuardRef.current.reset();
    };
  }, [stateCode, acNo, stateConstituencies]);

  const effectiveConstituencyName = apiDetail?.name || constituency?.name || '';
  const effectiveDistrict = apiDetail?.district || constituency?.district || '';
  const effectiveReservation = apiDetail?.reservationStatus || constituency?.type || '';
  const effectiveWinnerParty = (constituency?.winnerParty && constituency.winnerParty.trim()) || apiDetail?.recentElection?.winner || apiDetail?.currentParty || '';
  const effectiveWinnerName = (constituency?.winnerName && constituency.winnerName.trim()) || apiDetail?.recentElection?.winnerName || apiDetail?.currentMLA || '';
  const effectiveWinnerVotes = constituency?.winnerVotes ?? apiDetail?.recentElection?.winnerVotes ?? null;
  const effectiveMargin = constituency?.margin ?? apiDetail?.recentElection?.margin ?? null;
  const effectiveRunnerUp = (constituency?.runnerUp && constituency.runnerUp.trim()) || apiDetail?.recentElection?.runnerUp || '';
  const effectiveElectionYear = apiDetail?.recentElection?.electionYear !== undefined
    ? apiDetail.recentElection.electionYear
    : (constituency?.electionYear ?? null);
  const effectiveMarginPercent = apiDetail?.recentElection?.marginPercent ?? null;

  const localizedConstName = constituency
    ? getLocalizedConstituencyName(acNo, stateCode, effectiveConstituencyName, i18n.language, constituency.localName)
    : effectiveConstituencyName;
  const localizedDistrict = getLocalizedDistrictName(effectiveDistrict, i18n.language) || effectiveDistrict;
  const localizedReservation = getLocalizedReservation(effectiveReservation, i18n.language) || effectiveReservation;
  const localizedWinnerParty = getLocalizedPartyName(effectiveWinnerParty, i18n.language) || effectiveWinnerParty;
  const localizedRunnerUp = getLocalizedPartyName(effectiveRunnerUp, i18n.language) || effectiveRunnerUp;

  const [latestPodium, setLatestPodium] = useState(() => {
    return getLatestPodiumForConstituency(stateCode, acNo);
  });
  const [historicalContests, setHistoricalContests] = useState<HistoricalPodiumContest[]>(() => {
    return getHistoricalPodiumForConstituency(stateCode, acNo);
  });
  const [loadingHistory, setLoadingHistory] = useState(false);

  const isGenericCandidate = (name?: string | null) => {
    if (!name) return true;
    const lower = name.trim().toLowerCase();
    return (
      lower.includes('candidate') ||
      lower.includes('runner up') ||
      lower === 'winner' ||
      lower === 'ind' ||
      lower === 'nota' ||
      lower === 'none of the above'
    );
  };

  const seedRuName = constituency?.runnerUpName || (constituency as any)?.runnerUpName2023 || (constituency as any)?.runnerUpName2024 || '';
  let effectiveRunnerUpName = latestPodium?.firstRunnerUp?.name || seedRuName || '';
  if (isGenericCandidate(effectiveRunnerUpName) && !isGenericCandidate(seedRuName)) {
    effectiveRunnerUpName = seedRuName;
  }
  const authoritativeRuName = (!isGenericCandidate(effectiveRunnerUpName) ? effectiveRunnerUpName : null) || (!isGenericCandidate(seedRuName) ? seedRuName : '') || '';

  const demo = useMemo(() => getDemographicsForState(stateCode, acNo), [stateCode, acNo]);
  const mlaProfile = useMemo(() => getMLAProfileForState(stateCode, acNo), [stateCode, acNo]);

  // Canonical authoritative latest podium contest
  const canonicalPodium = useMemo<HistoricalPodiumContest | null>(() => {
    const rawPodium = latestPodium || (historicalContests.length > 0 ? historicalContests[0] : null);
    const cleanCandidate = (candidate: HistoricalPodiumContest['winner']) => {
      if (!candidate || isGenericCandidate(candidate.name) || !candidate.party?.trim()) return null;
      return {
        ...candidate,
        photoUrl: candidate.photoUrl || getStaticPhoto(candidate.name) || undefined,
      };
    };
    const cleanContest = (contest: HistoricalPodiumContest): HistoricalPodiumContest | null => {
      const winner = cleanCandidate(contest.winner);
      if (!winner) return null;
      return {
        ...contest,
        winner,
        firstRunnerUp: cleanCandidate(contest.firstRunnerUp),
        secondRunnerUp: cleanCandidate(contest.secondRunnerUp),
      };
    };

    if (rawPodium && (effectiveElectionYear == null || rawPodium.year >= effectiveElectionYear)) {
      return cleanContest(rawPodium);
    }

    // Build a latest-result summary only from fields present in the result record.
    // Do not infer runner-up votes, total valid votes, vote share, or delimitation.
    const electionRecord = apiDetail?.recentElection;
    const winnerName = (constituency?.winnerName || electionRecord?.winnerName || '').trim();
    const winnerParty = (constituency?.winnerParty || electionRecord?.winner || '').trim();
    if (effectiveElectionYear == null || !winnerName || !winnerParty) return null;

    const optionalNumber = (value: unknown, allowZero = false): number | undefined =>
      typeof value === 'number' && Number.isFinite(value) && (allowZero ? value >= 0 : value > 0)
        ? value
        : undefined;
    const winnerVotes = optionalNumber(effectiveWinnerVotes);
    const margin = optionalNumber(effectiveMargin, true);
    const runnerUpName = !isGenericCandidate(authoritativeRuName) ? authoritativeRuName : '';
    const runnerUpParty = (effectiveRunnerUp || '').trim();
    const runnerUpVotes = optionalNumber((constituency as any)?.runnerUpVotes ?? (electionRecord as any)?.runnerUpVotes);
    const totalValidVotes = optionalNumber((constituency as any)?.totalValidVotes ?? (electionRecord as any)?.totalValidVotes);
    const winnerShare = optionalNumber((constituency as any)?.winnerVoteShare ?? (electionRecord as any)?.winnerVoteShare, true);
    const runnerUpShare = optionalNumber((constituency as any)?.runnerUpVoteShare ?? (electionRecord as any)?.runnerUpVoteShare, true);

    return {
      year: effectiveElectionYear,
      ...(constituency && typeof (constituency as any).delimitationId === 'string'
        ? { delimitationId: (constituency as any).delimitationId }
        : {}),
      ...(totalValidVotes != null ? { totalValidVotes } : {}),
      constituencyName: effectiveConstituencyName,
      ...(margin != null ? { marginWinnerToRunnerUp1: margin } : {}),
      winner: {
        name: winnerName,
        party: winnerParty,
        ...(winnerVotes != null ? { votes: winnerVotes } : {}),
        ...(winnerShare != null ? { voteShare: winnerShare } : {}),
        photoUrl: getStaticPhoto(winnerName) || undefined,
      },
      firstRunnerUp: runnerUpName && runnerUpParty ? {
        name: runnerUpName,
        party: runnerUpParty,
        ...(runnerUpVotes != null ? { votes: runnerUpVotes } : {}),
        ...(runnerUpShare != null ? { voteShare: runnerUpShare } : {}),
        ...(margin != null ? { marginToWinner: margin } : {}),
        photoUrl: getStaticPhoto(runnerUpName) || undefined,
      } : null,
      secondRunnerUp: null,
    };
  }, [
    latestPodium,
    historicalContests,
    effectiveElectionYear,
    effectiveWinnerParty,
    effectiveWinnerName,
    effectiveWinnerVotes,
    effectiveMargin,
    effectiveRunnerUp,
    effectiveRunnerUpName,
    authoritativeRuName,
    effectiveConstituencyName,
    constituency,
  ]);

  const contestToItem = useCallback((contest: HistoricalPodiumContest, sCode: string, acNum: number) => {
    return {
      id: `${sCode}-AC-${acNum}-${contest.year}`,
      state_code: sCode,
      ac_no: acNum,
      year: contest.year,
      delimitation_id: contest.delimitationId,
      total_valid_votes: contest.totalValidVotes,
      winner: contest.winner?.name,
      party: contest.winner?.party,
      winner_name: (!isGenericCandidate(contest.winner?.name) ? contest.winner?.name : null) || contest.winner?.name || undefined,
      winner_party: contest.winner?.party,
      winner_votes: contest.winner?.votes ?? null,
      winner_vote_share: contest.winner?.voteShare ?? null,
      winner_education: contest.winner?.education,
      first_runner_up_name: !isGenericCandidate(contest.firstRunnerUp?.name) ? contest.firstRunnerUp?.name : undefined,
      first_runner_up_party: contest.firstRunnerUp?.party,
      first_runner_up_votes: contest.firstRunnerUp?.votes ?? null,
      first_runner_up_vote_share: contest.firstRunnerUp?.voteShare ?? null,
      margin_winner_to_runner_up_1: contest.marginWinnerToRunnerUp1 ?? contest.firstRunnerUp?.marginToWinner,
      second_runner_up_name: contest.secondRunnerUp?.name,
      second_runner_up_party: contest.secondRunnerUp?.party,
      second_runner_up_votes: contest.secondRunnerUp?.votes ?? null,
      second_runner_up_vote_share: contest.secondRunnerUp?.voteShare ?? null,
      margin_winner_to_runner_up_2: contest.marginWinnerToRunnerUp2 ?? contest.secondRunnerUp?.marginToWinner,
      margin_runner_up_1_to_runner_up_2: contest.marginRunnerUp1ToRunnerUp2 ?? contest.secondRunnerUp?.marginToFirstRunnerUp,
      winner_photo_url: contest.winner?.photoUrl || (contest.winner?.name ? getStaticPhoto(contest.winner.name) : undefined) || undefined,
      first_runner_up_photo_url: contest.firstRunnerUp?.photoUrl || (contest.firstRunnerUp?.name ? getStaticPhoto(contest.firstRunnerUp.name) : undefined) || undefined,
      second_runner_up_photo_url: contest.secondRunnerUp?.photoUrl || (contest.secondRunnerUp?.name ? getStaticPhoto(contest.secondRunnerUp.name) : undefined) || undefined,
      localized_names_json: JSON.stringify({
        winner: contest.winner?.localizedNames,
        ru1: contest.firstRunnerUp?.localizedNames,
        ru2: contest.secondRunnerUp?.localizedNames,
      }),
      localized_parties_json: JSON.stringify({
        winner: contest.winner?.localizedParties,
        ru1: contest.firstRunnerUp?.localizedParties,
        ru2: contest.secondRunnerUp?.localizedParties,
      }),
    } as any;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initial = getLatestPodiumForConstituency(stateCode, acNo);
    if (initial) {
      setLatestPodium(initial);
    }
    const cachedAll = getHistoricalPodiumForConstituency(stateCode, acNo);
    if (cachedAll && cachedAll.length > 0) {
      setHistoricalContests(cachedAll);
    }

    setLoadingHistory(true);
    Promise.all([
      loadHistoricalResultsForState(stateCode).catch(() => {}),
      fetchHistoricalPodiumForConstituency(stateCode, acNo).catch(() => []),
    ]).then(([_, apiContests]) => {
      if (!isMounted) return;
      let contests = (apiContests && apiContests.length > 0)
        ? apiContests
        : getHistoricalPodiumForConstituency(stateCode, acNo);

      if (!contests || contests.length === 0) {
        const sqliteRows = getHistoricalResults(stateCode, acNo);
        if (sqliteRows && sqliteRows.length > 0) {
          contests = sqliteRows.map((r: any) => ({
            year: r.year,
            delimitationId: r.delimitation_id != null ? String(r.delimitation_id) : undefined,
            totalValidVotes: r.total_valid_votes ?? undefined,
            constituencyName: r.constituency_name,
            marginWinnerToRunnerUp1: r.margin_winner_to_runner_up_1,
            marginWinnerToRunnerUp2: r.margin_winner_to_runner_up_2,
            marginRunnerUp1ToRunnerUp2: r.margin_runner_up_1_to_runner_up_2,
            winner: {
              name: r.winner_name || r.winner,
              party: r.winner_party || r.party,
              votes: r.winner_votes,
              voteShare: r.winner_vote_share,
            },
            firstRunnerUp: r.first_runner_up_name ? {
              name: r.first_runner_up_name,
              party: r.first_runner_up_party,
              votes: r.first_runner_up_votes,
              voteShare: r.first_runner_up_vote_share,
              marginToWinner: r.margin_winner_to_runner_up_1,
            } : null,
            secondRunnerUp: r.second_runner_up_name ? {
              name: r.second_runner_up_name,
              party: r.second_runner_up_party,
              votes: r.second_runner_up_votes,
              voteShare: r.second_runner_up_vote_share,
              marginToWinner: r.margin_winner_to_runner_up_2,
              marginToFirstRunnerUp: r.margin_runner_up_1_to_runner_up_2,
            } : null,
          }));
        }
      }

      if (contests && contests.length > 0) {
        const sanitizedList = contests.map((c: any) => sanitizeContestWithSeed(stateCode, acNo, c));
        setHistoricalContests(sanitizedList);
        setLatestPodium(sanitizedList[0]);
      }
      setLoadingHistory(false);
    });
    return () => { isMounted = false; };
  }, [stateCode, acNo]);
  const [activeTab, setActiveTab] = useState<ConstituencyTab>('overview');
  const [reportIssueVisible, setReportIssueVisible] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<{ uri: string | null; name: string; party: string } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
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
    return iss ? `${iss.title}\n\n— via Poligram` : '';
  };

  // Feed store for community posts & polls
  const feedPosts = useFeedStore((s) => s.posts);
  const feedToggleReaction = useFeedStore((s) => s.toggleReaction);
  const feedVotePoll = useFeedStore((s) => s.votePoll);

  const constituencyIssues = useMemo(
    () => civicIssues.filter((i) => i.constituencyName === constituency?.name || i.stateCode === stateCode),
    [civicIssues, constituency, stateCode],
  );

  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [autoFocusReply, setAutoFocusReply] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [newsScopeFilter, setNewsScopeFilter] = useState<'all' | 'constituency' | 'district' | 'state'>('all');

  const constituencyPosts = useMemo(() => {
    const direct = feedPosts.filter((p) => p.constituencyName === constituency?.name || p.constituencyId === `${stateCode}-AC-${constituency?.acNo}`);
    const stateLevel = feedPosts.filter((p) => p.stateCode === stateCode && !p.constituencyName);
    const combined = [...direct, ...stateLevel];
    return combined.length > 0 ? combined : feedPosts.filter((p) => p.stateCode === stateCode || p.stateCode === 'IN');
  }, [feedPosts, constituency, stateCode]);

  const hierarchicalNews = useMemo(() => {
    return getHierarchicalNewsForConstituency(stateCode, constituency, i18n.language);
  }, [stateCode, constituency, i18n.language]);

  const constituencyHeadlines = useMemo(() => {
    if (newsScopeFilter === 'constituency') return hierarchicalNews.constituencyNews;
    if (newsScopeFilter === 'district') return hierarchicalNews.districtNews;
    if (newsScopeFilter === 'state') return hierarchicalNews.stateNews;
    return hierarchicalNews.allNews;
  }, [hierarchicalNews, newsScopeFilter]);

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

  if (!constituency && !apiDetail && apiLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: t('common.loading', { defaultValue: 'Loading...' }),
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.primary,
          }}
        />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <ConstituencyCardSkeleton />
          <ConstituencyCardSkeleton />
          <ConstituencyCardSkeleton />
        </ScrollView>
      </View>
    );
  }

  if (!constituency && !apiDetail) {
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
            {apiError || t('constituency.notFoundDesc')}
          </Text>
        </View>
      </View>
    );
  }

  const partyColor = getPartyColor(effectiveWinnerParty);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: '', // Native header provides back button; in-page hero owns primary title (Batch 6)
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
          <Text style={[styles.acNumber, { color: colors.textMuted }]}>AC #{acNo}</Text>
          <Text style={[styles.name, { color: colors.text }]}>{localizedConstName || effectiveConstituencyName}</Text>
          <Text style={[styles.district, { color: colors.textSecondary }]}>{localizedDistrict} {t('constituency.districtLabel')}</Text>
          <View style={styles.heroActions}>
            <View style={styles.heroBadges}>
              <View style={[styles.typeBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
                <Text style={[styles.typeBadgeText, { color: colors.textSecondary }]}>{localizedReservation}</Text>
              </View>
              <View style={[
                styles.provenancePill,
                {
                  backgroundColor: dataSource === 'LIVE_API' ? '#10B98115' : '#3B82F615',
                  borderColor: dataSource === 'LIVE_API' ? '#10B98140' : '#3B82F640',
                }
              ]}>
                <View style={[
                  styles.provenanceDot,
                  { backgroundColor: dataSource === 'LIVE_API' ? '#10B981' : '#3B82F6' }
                ]} />
                <Text style={[
                  styles.provenanceText,
                  { color: dataSource === 'LIVE_API' ? '#10B981' : '#3B82F6' }
                ]} numberOfLines={1}>
                  {dataSource === 'LIVE_API' ? 'Live API + Seed' : (dataSource === 'OFFLINE_SEED' ? 'Offline Seed' : 'Unavailable')}
                </Text>
              </View>
            </View>
            <View style={styles.heroButtons}>
              <Pressable
                style={[styles.heroButton, { borderColor: colors.goldBorder || colors.border, backgroundColor: colors.surface }]}
                onPress={() => setShowShareModal(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Share Constituency Card"
              >
                <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                style={[styles.heroButton, { borderColor: isFavorite ? '#EF4444' : (colors.goldBorder || colors.border), backgroundColor: colors.surface }]}
                onPress={() => toggleFavorite(acNo)}
                hitSlop={8}
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={19}
                  color={isFavorite ? '#EF4444' : colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Unified Action Row: Set as Home Constituency + Follow ── */}
        <View style={styles.actionRow}>
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
                  acNo: acNo,
                  name: effectiveConstituencyName,
                  district: effectiveDistrict,
                  party: effectiveWinnerParty,
                });
                if (!isFavorite) {
                  toggleFavorite(acNo);
                }
              }
            }}
          >
            <Ionicons
              name={isMyHome ? 'home' : 'home-outline'}
              size={22}
              color={isMyHome ? '#047857' : '#002B7F'}
            />
            <Text
              style={[styles.homeButtonText, isMyHome && styles.homeButtonTextActive]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {isMyHome ? t('constituency.myHome') : t('constituency.setAsHome')}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.followButton,
              isFavorite && styles.followButtonActive,
            ]}
            onPress={() => toggleFavorite(acNo)}
          >
            <Ionicons
              name={isFavorite ? 'checkmark-circle' : 'notifications-outline'}
              size={18}
              color={isFavorite ? '#FFFFFF' : '#002B7F'}
            />
            <Text
              style={[styles.followButtonText, isFavorite && styles.followButtonTextActive]}
              numberOfLines={1}
            >
              {isFavorite ? t('constituency.following', { defaultValue: 'Following' }) : t('constituency.follow', { defaultValue: 'Follow' })}
            </Text>
          </Pressable>
        </View>

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

        {/* Result Card with Winner, Runner-up & 1st Runner-up Profiles */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>
              {canonicalPodium?.year
                ? t('constituency.electionResult', { year: canonicalPodium.year })
                : (effectiveElectionYear ? t('constituency.electionResult', { year: effectiveElectionYear }) : t('constituency.recentElectionResult', { defaultValue: 'Recent Election Result' }))}
            </Text>
            <View style={[styles.provenancePill, { backgroundColor: '#10B98115', borderColor: '#10B98140', paddingVertical: 2, paddingHorizontal: 6 }]}>
              <View style={[styles.provenanceDot, { backgroundColor: '#10B981', width: 5, height: 5 }]} />
              <Text style={[styles.provenanceText, { color: '#10B981', fontSize: 10 }]}>
                Official Podium Results
              </Text>
            </View>
          </View>

          {canonicalPodium ? (
            <PodiumHistoryCard
              item={{
                id: `${stateCode}-AC-${acNo}-${canonicalPodium.year}`,
                state_code: stateCode,
                ac_no: acNo,
                year: canonicalPodium.year,
                delimitation_id: canonicalPodium.delimitationId,
                total_valid_votes: canonicalPodium.totalValidVotes,
                winner: canonicalPodium.winner?.name || effectiveWinnerName,
                party: canonicalPodium.winner?.party || effectiveWinnerParty,
                winner_name: canonicalPodium.winner?.name || effectiveWinnerName,
                winner_party: canonicalPodium.winner?.party || effectiveWinnerParty,
                winner_votes: canonicalPodium.winner?.votes ?? null,
                winner_vote_share: canonicalPodium.winner?.voteShare ?? null,
                winner_education: (canonicalPodium.winner as any)?.education || undefined,
                first_runner_up_name: !isGenericCandidate(canonicalPodium.firstRunnerUp?.name) ? canonicalPodium.firstRunnerUp?.name : undefined,
                first_runner_up_party: canonicalPodium.firstRunnerUp?.party || effectiveRunnerUp || undefined,
                first_runner_up_votes: canonicalPodium.firstRunnerUp?.votes ?? null,
                first_runner_up_vote_share: canonicalPodium.firstRunnerUp?.voteShare ?? null,
                margin_winner_to_runner_up_1: canonicalPodium.marginWinnerToRunnerUp1 ?? null,
                second_runner_up_name: canonicalPodium.secondRunnerUp?.name || undefined,
                second_runner_up_party: canonicalPodium.secondRunnerUp?.party || undefined,
                second_runner_up_votes: canonicalPodium.secondRunnerUp?.votes ?? null,
                second_runner_up_vote_share: canonicalPodium.secondRunnerUp?.voteShare ?? null,
                margin_winner_to_runner_up_2: canonicalPodium.marginWinnerToRunnerUp2 ?? null,
                winner_photo_url: canonicalPodium.winner?.photoUrl || (canonicalPodium.winner?.name ? getStaticPhoto(canonicalPodium.winner.name) : undefined) || undefined,
                first_runner_up_photo_url: canonicalPodium.firstRunnerUp?.photoUrl || (canonicalPodium.firstRunnerUp?.name ? getStaticPhoto(canonicalPodium.firstRunnerUp.name) : undefined) || undefined,
                second_runner_up_photo_url: canonicalPodium.secondRunnerUp?.photoUrl || (canonicalPodium.secondRunnerUp?.name ? getStaticPhoto(canonicalPodium.secondRunnerUp.name) : undefined) || undefined,
                localized_names_json: JSON.stringify({
                  winner: canonicalPodium.winner?.localizedNames,
                  ru1: canonicalPodium.firstRunnerUp?.localizedNames,
                  ru2: canonicalPodium.secondRunnerUp?.localizedNames,
                }),
                localized_parties_json: JSON.stringify({
                  winner: canonicalPodium.winner?.localizedParties,
                  ru1: canonicalPodium.firstRunnerUp?.localizedParties,
                  ru2: canonicalPodium.secondRunnerUp?.localizedParties,
                }),
              } as any}
              isLatest={true}
            />
          ) : (
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <View style={styles.resultLeft}>
                  <CandidateAvatar
                    name={effectiveWinnerName}
                    party={effectiveWinnerParty}
                    size={52}
                    photoUrl={mlaProfile?.photoUrl || undefined}
                    onPress={(uri) => setPhotoViewer({ uri, name: effectiveWinnerName, party: effectiveWinnerParty })}
                  />
                  <View>
                    <Text style={styles.resultParty}>
                      {localizedWinnerParty}
                    </Text>
                    <Text style={styles.resultCandidate}>
                      {getLocalizedCandidateName(effectiveWinnerName, i18n.language) || effectiveWinnerName}
                    </Text>
                  </View>
                </View>
                <View style={styles.resultRight}>
                  <Text style={styles.resultVotes}>
                    {effectiveWinnerVotes != null ? effectiveWinnerVotes.toLocaleString() : 'Not Reported'}
                  </Text>
                  <Text style={styles.resultLabel}>{t('constituency.votes')}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {effectiveMargin != null ? effectiveMargin.toLocaleString() : '—'}
                  </Text>
                  <Text style={styles.statLabel}>{t('constituency.margin')}</Text>
                </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {effectiveRunnerUpName
                        ? `${getLocalizedCandidateName(effectiveRunnerUpName, i18n.language) || effectiveRunnerUpName} (${localizedRunnerUp || effectiveRunnerUp})`
                        : (localizedRunnerUp || effectiveRunnerUp || '—')}
                    </Text>
                    <Text style={styles.statLabel}>{t('constituency.runnerUp')}</Text>
                  </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {effectiveMarginPercent != null ? `${effectiveMarginPercent}%` : '—'}
                  </Text>
                  <Text style={styles.statLabel}>{t('constituency.margin')} %</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* MLA Profile */}
        {(() => {
          const mla = getMLAProfileForState(stateCode, acNo);
          const winnerName = canonicalPodium?.winner?.name || effectiveWinnerName || mla?.name;
          const winnerParty = canonicalPodium?.winner?.party || effectiveWinnerParty || mla?.party;
          if (!winnerName || !winnerParty) return null;

          const effectiveMla = {
            ...(mla || {}),
            acNo,
            name: winnerName,
            party: winnerParty,
            photoUrl: canonicalPodium?.winner?.photoUrl || mla?.photoUrl,
            education: (canonicalPodium?.winner as any)?.education || mla?.education,
            profession: (canonicalPodium?.winner as any)?.profession || mla?.profession,
            criminalCases: (canonicalPodium?.winner as any)?.criminalCases ?? mla?.criminalCases ?? null,
            totalAssets: (canonicalPodium?.winner as any)?.totalAssets ?? mla?.totalAssets,
            totalLiabilities: (canonicalPodium?.winner as any)?.totalLiabilities ?? mla?.totalLiabilities,
            constituencyName: effectiveConstituencyName,
            district: effectiveDistrict,
          };

          const electionYr = canonicalPodium?.year ?? effectiveElectionYear ?? null;

          return (
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>{t('constituency.currentMlaSection')}</Text>
                <View style={[styles.provenancePill, { backgroundColor: '#3B82F615', borderColor: '#3B82F640', paddingVertical: 2, paddingHorizontal: 6 }]}>
                  <View style={[styles.provenanceDot, { backgroundColor: '#3B82F6', width: 5, height: 5 }]} />
                  <Text style={[styles.provenanceText, { color: '#3B82F6', fontSize: 10 }]}>
                    Profile record
                  </Text>
                </View>
              </View>
              <MLACard
                profile={effectiveMla as any}
                onAvatarPress={(uri) => setPhotoViewer({ uri, name: effectiveMla.name, party: effectiveMla.party })}
              />
              {electionYr != null ? <Pressable
                style={styles.fullProfileBtn}
                onPress={() => router.push(`/legislator/MLA_${stateCode}_${electionYr}_${acNo}_W` as any)}
              >
                <Ionicons name="person-circle" size={16} color="#4F8EF7" />
                <Text style={styles.fullProfileBtnText}>{t('constituencyExtended.viewCompleteProfile')}</Text>
                <Ionicons name="chevron-forward" size={14} color="#4F8EF7" />
              </Pressable> : null}
            </View>
          );
        })()}

        {/* Historical Political Data from 1999 to 2026 (Podium Format) */}
        {historicalContests.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time" size={18} color="#002B7F" />
                <Text style={styles.sectionTitle}>
                  Historical Political Data (1999–2026)
                </Text>
              </View>
              <Pressable
                onPress={() => setActiveTab('history')}
                style={[styles.provenancePill, { backgroundColor: '#002B7F15', borderColor: '#002B7F40', paddingVertical: 2, paddingHorizontal: 8 }]}
              >
                <Text style={[styles.provenanceText, { color: '#002B7F', fontSize: 11, fontWeight: '700' }]}>
                  View All ({historicalContests.length})
                </Text>
                <Ionicons name="chevron-forward" size={12} color="#002B7F" />
              </Pressable>
            </View>

            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
              Assembly election podium results with 1st, 2nd, and 3rd place candidates, margins, and vote shares:
            </Text>

            {historicalContests.slice(0, 3).map((contest, idx) => (
              <PodiumHistoryCard
                key={contest.year}
                item={contestToItem(contest, stateCode, acNo)}
                isLatest={idx === 0}
              />
            ))}

            {historicalContests.length > 3 && (
              <Pressable
                style={[styles.expandHistoryBtn, { borderColor: colors.border }]}
                onPress={() => setActiveTab('history')}
              >
                <Text style={[styles.expandHistoryBtnText, { color: colors.primary }]}>
                  Show All {historicalContests.length} Past Elections (1999–{historicalContests[historicalContests.length - 1]?.year || '1999'})
                </Text>
                <Ionicons name="arrow-forward-circle" size={16} color={colors.primary} />
              </Pressable>
            )}
          </View>
        )}

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
        {constituency?.currentParty && constituency.currentParty !== effectiveWinnerParty && (
          <View style={styles.section}>
            <DefectionBadge
              electedParty={effectiveWinnerParty}
              currentParty={constituency.currentParty}
            />
          </View>
        )}

        {/* Trivia strictly filtered to this constituency */}
        {hasFull && (() => {
          const allTrivia = getTriviaForConstituencyInState(stateCode, acNo).filter(
            (ti) => {
              const acContexts = ti.contexts.filter((c) => c.type === 'CONSTITUENCY');
              if (acContexts.length > 0) {
                return acContexts.some((c) => (c as any).acNo === acNo);
              }
              return !ti.contexts.every((c) => c.type === 'GLOBAL');
            },
          );
          const triviaItems = selectFreshTrivia(allTrivia, 5);
          return triviaItems.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('constituency.trivia')}</Text>
              <TriviaCard items={triviaItems} rotateInterval={0} />
            </View>
          ) : null;
        })()}

        {/* Community Sync Callout */}
        <View style={styles.communitySyncCard}>
          <View style={styles.communitySyncHeader}>
            <Ionicons name="chatbubbles" size={20} color="#002B7F" />
            <Text style={styles.communitySyncTitle}>
              {t('constituency.communityPulseTitle', { defaultValue: 'Constituency Civic Forum' })}
            </Text>
          </View>
          <Text style={styles.communitySyncDesc}>
            {t('constituency.communityPulseDesc', { defaultValue: 'Connect with local voters, report civic issues, or view grassroots community discussions for this constituency.' })}
          </Text>
          <View style={styles.communitySyncBtnRow}>
            <Pressable
              style={styles.reportIssueBtn}
              onPress={() => setActiveTab('issues')}
            >
              <Ionicons name="alert-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.reportIssueBtnText}>
                {t('constituencyExtended.reportIssue', { defaultValue: 'Report Issue' })}
              </Text>
            </Pressable>
            <Pressable
              style={styles.discussFeedBtn}
              onPress={() => setActiveTab('news')}
            >
              <Ionicons name="newspaper-outline" size={16} color="#002B7F" />
              <Text style={styles.discussFeedBtnText}>
                {t('constituencyExtended.viewNews', { defaultValue: 'Local News' })}
              </Text>
            </Pressable>
          </View>
        </View>

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

                {/* ── Community Feed Sync Card & Report Issue Action ── */}
                <View style={styles.communitySyncCard}>
                  <View style={styles.communitySyncHeader}>
                    <Ionicons name="chatbubbles" size={20} color="#002B7F" />
                    <Text style={styles.communitySyncTitle}>
                      {t('constituencyExtended.linkedWithCommunityFeed', { defaultValue: 'Linked with Community Feed' })}
                    </Text>
                  </View>
                  <Text style={styles.communitySyncDesc}>
                    {t('constituencyExtended.communityFeedDesc', { defaultValue: 'Issues in this constituency are seamlessly linked with citizen discussions. You can discuss this issue on the community feed or convert a feed post into an official civic issue.' })}
                  </Text>
                  <View style={styles.communitySyncBtnRow}>
                    <Pressable
                      style={styles.reportIssueBtn}
                      onPress={() => setReportIssueVisible(true)}
                    >
                      <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.reportIssueBtnText}>
                        {t('civic.reportIssue', { defaultValue: 'Report an Issue' })}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.discussFeedBtn}
                      onPress={() => router.push('/(tabs)/feed' as any)}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color="#002B7F" />
                      <Text style={styles.discussFeedBtnText}>
                        {t('constituencyExtended.discussFeed', { defaultValue: 'Discuss in Feed' })}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('constituencyExtended.noIssuesReported')}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>{t('constituencyExtended.noIssuesMsg', { defaultValue: 'No civic issues have been reported for this constituency yet. Be the first to report one!' })}</Text>
                <Pressable
                  style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setReportIssueVisible(true)}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyActionBtnText}>
                    {t('civic.reportIssue', { defaultValue: 'Report an Issue' })}
                  </Text>
                </Pressable>
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
                  <View>
                    <Text style={[styles.tabHeaderTitle, { color: colors.text }]}>{t('constituencyExtended.communityPulse')}</Text>
                    <Text style={styles.tabHeaderCount}>{constituencyPosts.length} {constituencyPosts.length === 1 ? t('common.post') : t('common.posts')}</Text>
                  </View>
                  <Pressable
                    style={[styles.newPostHeaderBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setComposeVisible(true)}
                  >
                    <Ionicons name="add-circle" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.newPostHeaderBtnText}>{t('feed.compose', { defaultValue: 'Post' })}</Text>
                  </Pressable>
                </View>
                {constituencyPosts.map((post) => (
                  <View key={post.id}>
                    <PostCard
                      post={post}
                      compact
                      onPress={() => {
                        setDetailPost(post);
                        setAutoFocusReply(false);
                      }}
                      onReply={() => {
                        setDetailPost(post);
                        setAutoFocusReply(true);
                      }}
                      onTagPress={(tag) => {
                        router.push({ pathname: '/(tabs)/feed', params: { hashtag: tag } } as any);
                      }}
                      onReact={async () => {
                        if (!gateContentAction('react_post')) return;
                        const saved = await feedToggleReaction(post.id, 'like');
                        if (!saved) {
                          Alert.alert(t('feed.reactionFailed', { defaultValue: 'Could not update your reaction. Check your connection and try again.' }));
                          return;
                        }
                        logContentAction('react_post', {
                          type: 'post',
                          id: post.id,
                          body: 'like',
                          screenName: 'constituency_detail',
                        });
                      }}
                      onShare={async () => {
                        try {
                          await Share.share({
                            message: `${post.content.slice(0, 200)}${post.content.length > 200 ? '...' : ''}\n\n— via Poligram`,
                          });
                        } catch (_) {}
                      }}
                    />
                    {post.poll && (
                      <View style={{ paddingHorizontal: 16, marginTop: -4, marginBottom: 10 }}>
                        <PollCard
                          poll={post.poll}
                          onVote={(optId) => {
                            if (!gateContentAction('vote_poll')) return;
                            feedVotePoll(post.id, optId);
                            logContentAction('vote_poll', {
                              type: 'poll',
                              id: post.id,
                              body: optId,
                              screenName: 'constituency_detail',
                            });
                          }}
                        />
                      </View>
                    )}
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('constituencyExtended.noDiscussions')}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>{t('constituencyExtended.startConversation', { defaultValue: 'Start a conversation about this constituency on the Community Feed. Posts tagged to this area will appear here.' })}</Text>
                <Pressable
                  style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setComposeVisible(true)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyActionBtnText}>
                    {t('feed.startDiscussion', { defaultValue: 'Start a Discussion on Feed' })}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ═══ TAB: NEWS ═══ */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'news' && (
          <View style={styles.tabContent}>
            {hierarchicalNews.allNews.length > 0 ? (
              <>
                <View style={styles.tabHeader}>
                  <View>
                    <Text style={[styles.tabHeaderTitle, { color: colors.text }]}>{t('constituencyExtended.newsAndHeadlines')}</Text>
                    <Text style={styles.tabHeaderCount}>{hierarchicalNews.allNews.length} {hierarchicalNews.allNews.length === 1 ? t('constituencyExtended.article', { defaultValue: 'article' }) : t('constituencyExtended.articles', { defaultValue: 'articles' })}</Text>
                  </View>
                </View>

                {/* Hierarchy Tier Filter Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsFilterScroll}>
                  <Pressable
                    style={[styles.newsFilterPill, newsScopeFilter === 'all' && styles.newsFilterPillActive]}
                    onPress={() => setNewsScopeFilter('all')}
                  >
                    <Text style={[styles.newsFilterPillText, newsScopeFilter === 'all' && styles.newsFilterPillTextActive]}>
                      {t('common.all', { defaultValue: 'All' })} ({hierarchicalNews.allNews.length})
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.newsFilterPill, newsScopeFilter === 'constituency' && styles.newsFilterPillActive]}
                    onPress={() => setNewsScopeFilter('constituency')}
                  >
                    <Ionicons name="location" size={13} color={newsScopeFilter === 'constituency' ? '#FFFFFF' : '#2563EB'} style={{ marginRight: 4 }} />
                    <Text style={[styles.newsFilterPillText, newsScopeFilter === 'constituency' && styles.newsFilterPillTextActive]}>
                      {localizedConstName} ({hierarchicalNews.constituencyNews.length})
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.newsFilterPill, newsScopeFilter === 'district' && styles.newsFilterPillActive]}
                    onPress={() => setNewsScopeFilter('district')}
                  >
                    <Ionicons name="business" size={13} color={newsScopeFilter === 'district' ? '#FFFFFF' : '#7C3AED'} style={{ marginRight: 4 }} />
                    <Text style={[styles.newsFilterPillText, newsScopeFilter === 'district' && styles.newsFilterPillTextActive]}>
                      {localizedDistrict} ({hierarchicalNews.districtNews.length})
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.newsFilterPill, newsScopeFilter === 'state' && styles.newsFilterPillActive]}
                    onPress={() => setNewsScopeFilter('state')}
                  >
                    <Ionicons name="globe" size={13} color={newsScopeFilter === 'state' ? '#FFFFFF' : '#059669'} style={{ marginRight: 4 }} />
                    <Text style={[styles.newsFilterPillText, newsScopeFilter === 'state' && styles.newsFilterPillTextActive]}>
                      {getLocalizedStateName(stateCode, i18n.language)} ({hierarchicalNews.stateNews.length})
                    </Text>
                  </Pressable>
                </ScrollView>

                {/* News Display by Strict Hierarchy: Constituency -> District -> State */}
                {newsScopeFilter === 'all' ? (
                  <>
                    {/* Tier 1: Constituency */}
                    {hierarchicalNews.constituencyNews.length > 0 && (
                      <View style={styles.newsHierarchySection}>
                        <View style={styles.newsSectionHeaderRow}>
                          <Ionicons name="location" size={15} color="#2563EB" />
                          <Text style={[styles.newsSectionHeaderTitle, { color: colors.text }]}>
                            {localizedConstName} {t('common.scopes.constituency', { defaultValue: 'Constituency News' })}
                          </Text>
                          <Text style={styles.newsSectionCountBadge}>{hierarchicalNews.constituencyNews.length}</Text>
                        </View>
                        {hierarchicalNews.constituencyNews.map((hl) => (
                          <HeadlineCard key={hl.id} headline={hl} />
                        ))}
                      </View>
                    )}

                    {/* Tier 2: District */}
                    {hierarchicalNews.districtNews.length > 0 && (
                      <View style={styles.newsHierarchySection}>
                        <View style={styles.newsSectionHeaderRow}>
                          <Ionicons name="business" size={15} color="#7C3AED" />
                          <Text style={[styles.newsSectionHeaderTitle, { color: colors.text }]}>
                            {localizedDistrict} {t('common.scopes.district', { defaultValue: 'District News' })}
                          </Text>
                          <Text style={styles.newsSectionCountBadge}>{hierarchicalNews.districtNews.length}</Text>
                        </View>
                        {hierarchicalNews.districtNews.map((hl) => (
                          <HeadlineCard key={hl.id} headline={hl} />
                        ))}
                      </View>
                    )}

                    {/* Tier 3: State */}
                    {hierarchicalNews.stateNews.length > 0 && (
                      <View style={styles.newsHierarchySection}>
                        <View style={styles.newsSectionHeaderRow}>
                          <Ionicons name="globe" size={15} color="#059669" />
                          <Text style={[styles.newsSectionHeaderTitle, { color: colors.text }]}>
                            {getLocalizedStateName(stateCode, i18n.language)} {t('common.scopes.state', { defaultValue: 'State News' })}
                          </Text>
                          <Text style={styles.newsSectionCountBadge}>{hierarchicalNews.stateNews.length}</Text>
                        </View>
                        {hierarchicalNews.stateNews.map((hl) => (
                          <HeadlineCard key={hl.id} headline={hl} />
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <View style={{ paddingHorizontal: 16 }}>
                    {constituencyHeadlines.map((hl) => (
                      <HeadlineCard key={hl.id} headline={hl} />
                    ))}
                  </View>
                )}
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

        {/* Per-Constituency Election History (1999–2026 with Winner, 1st & 2nd Runner-up Podiums) */}
        {(() => {
          const rawContests = historicalContests.length > 0
            ? historicalContests.map((c) => contestToItem(c, stateCode, acNo))
            : getHistoryForState(stateCode, acNo).map((e) => ({
                ...e,
                state_code: stateCode,
                ac_no: acNo,
              } as any));

          // Sort descending: newest first down to 1999
          const elections = [...rawContests].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
          const currentParty = constituency?.currentParty ?? effectiveWinnerParty;
          const stronghold = isStrongholdForState(stateCode, acNo, currentParty);
          const normalize = (p: string) => (p === 'TRS' ? 'BRS' : p);

          const party1 = normalize(elections[0]?.winner_party || elections[0]?.party || '');
          const party2 = normalize(elections[1]?.winner_party || elections[1]?.party || '');
          const partyChanged = elections.length >= 2 && party1 && party2 && party1 !== party2;

          return (
            <View style={styles.section}>
              <View style={styles.histSectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="time" size={18} color="#002B7F" />
                  <Text style={styles.sectionTitle}>{t('constituency.constituencyHistory')} (1999–2026)</Text>
                </View>
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

              {elections.map((e, idx) => (
                <PodiumHistoryCard
                  key={e.year}
                  item={e}
                  isLatest={idx === 0}
                />
              ))}
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
          {(canonicalPodium?.year ?? effectiveElectionYear ?? constituency?.electionYear) != null
            ? <AffidavitCard stateCode={stateCode} acNo={acNo} electionYear={(canonicalPodium?.year ?? effectiveElectionYear ?? constituency?.electionYear)!} />
            : <Text style={styles.casteNoticeText}>{t('constituency.noAffidavitYear', { defaultValue: 'Election year is unavailable, so no affidavit record can be matched.' })}</Text>}
        </View>

        {/* AI Analysis */}
        <View style={styles.section}>
          <AIAnalysisCard acNo={acNo} constituencyName={effectiveConstituencyName} stateCode={stateCode} />
        </View>

        </>)}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ═══ TAB: DEMOGRAPHICS (reference data) ═══ */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'demographics' && (<>
          {/* Reference dataset summary; per-record official provenance is not yet attached. */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>
                {t('constituency.demographicReferenceTitle', { defaultValue: 'Constituency Demographic Reference Data' })}
              </Text>
            </View>

            {/* Quick Metrics Cards */}
            {(demo && (demo.totalVoters > 0 || demo.turnout2023 > 0)) || Boolean(localizedReservation) ? (
              <View style={styles.statsRow}>
                {demo && demo.totalVoters > 0 && <View style={styles.statItem}>
                  <Text style={styles.statValue}>{demo.totalVoters.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>{t('constituency.totalVoters', { defaultValue: 'Total Electors' })}</Text>
                </View>}
                {demo && demo.turnout2023 > 0 && <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#047857' }]}>{demo.turnout2023}%</Text>
                  <Text style={styles.statLabel}>{t('constituency.turnout', { defaultValue: 'Voter Turnout' })}</Text>
                </View>}
                {localizedReservation && <View style={styles.statItem}>
                  <Text style={styles.statValue}>{localizedReservation}</Text>
                  <Text style={styles.statLabel}>{t('constituency.reservationStatus', { defaultValue: 'Reservation' })}</Text>
                </View>}
              </View>
            ) : <Text style={styles.casteNoticeText}>{t('constituency.noDemographicData', { defaultValue: 'No constituency demographic figures are available in the current reference dataset.' })}</Text>}

            {/* Gender Distribution */}
            {demo && (demo.maleVoters > 0 || demo.femaleVoters > 0) && <View style={[styles.demoCard, { marginTop: 14 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="people" size={18} color="#002B7F" />
                <Text style={styles.demoSubTitle}>{t('constituency.genderDistribution', { defaultValue: 'Electorate Gender Composition' })}</Text>
              </View>
              <View style={styles.demoRow}>
                <View style={styles.demoItem}>
                  <Text style={styles.demoValue}>
                    {demo.maleVoters > 0 ? `${(demo.maleVoters / 1000).toFixed(1)}K` : '—'}
                  </Text>
                  <Text style={styles.demoLabel}>{t('constituency.male', { defaultValue: 'Male Voters' })}</Text>
                </View>
                <View style={styles.demoItem}>
                  <Text style={styles.demoValue}>
                    {demo.femaleVoters > 0 ? `${(demo.femaleVoters / 1000).toFixed(1)}K` : '—'}
                  </Text>
                  <Text style={styles.demoLabel}>{t('constituency.female', { defaultValue: 'Female Voters' })}</Text>
                </View>
                <View style={styles.demoItem}>
                  <Text style={[styles.demoValue, { color: '#002B7F' }]}>
                    {demo.maleVoters > 0 && demo.femaleVoters > 0 ? `${Math.round((demo.femaleVoters / demo.maleVoters) * 1000)}` : '—'}
                  </Text>
                  <Text style={styles.demoLabel}>{t('constituency.sexRatio', { defaultValue: 'Sex Ratio' })}</Text>
                </View>
              </View>
            </View>}

            {/* Locality & Habitat Distribution (Urban vs Rural) */}
            {demo && demo.urbanPercent > 0 && (
              <View style={[styles.demoCard, { marginTop: 14 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="business" size={18} color="#002B7F" />
                  <Text style={styles.demoSubTitle}>{t('constituency.localityDistribution', { defaultValue: 'Locality & Habitat Distribution' })}</Text>
                </View>
                <View style={styles.demoBarGroup}>
                  <View style={styles.demoBarRow}>
                    <Text style={styles.demoBarLabel}>{t('constituency.urban', { defaultValue: 'Urban' })}</Text>
                    <View style={styles.demoBarTrack}>
                      <View style={[styles.demoBarFill, { width: `${demo.urbanPercent}%`, backgroundColor: '#3B82F6' }]} />
                    </View>
                    <Text style={styles.demoBarValue}>{demo.urbanPercent}%</Text>
                  </View>
                  <View style={styles.demoBarRow}>
                    <Text style={styles.demoBarLabel}>{t('constituency.rural', { defaultValue: 'Rural' })}</Text>
                    <View style={styles.demoBarTrack}>
                      <View style={[styles.demoBarFill, { width: `${Math.max(0, 100 - demo.urbanPercent)}%`, backgroundColor: '#10B981' }]} />
                    </View>
                    <Text style={styles.demoBarValue}>{Math.max(0, 100 - demo.urbanPercent)}%</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Social Composition: SC / ST Official Gazette Roll */}
            {demo && (demo.scPercent > 0 || demo.stPercent > 0) && (
              <View style={[styles.demoCard, { marginTop: 14 }]}>
                <Text style={styles.demoSubTitle}>{t('constituency.socialComposition', { defaultValue: 'Social Composition' })}</Text>
                <View style={styles.demoBarGroup}>
                  <View style={styles.demoBarRow}>
                    <Text style={styles.demoBarLabel}>{t('constituencyExtended.scLabel', { defaultValue: 'SC Electors' })}</Text>
                    <View style={styles.demoBarTrack}>
                      <View style={[styles.demoBarFill, { width: `${demo.scPercent}%`, backgroundColor: '#F59E0B' }]} />
                    </View>
                    <Text style={styles.demoBarValue}>{demo.scPercent}%</Text>
                  </View>
                  <View style={styles.demoBarRow}>
                    <Text style={styles.demoBarLabel}>{t('constituencyExtended.stLabel', { defaultValue: 'ST Electors' })}</Text>
                    <View style={styles.demoBarTrack}>
                      <View style={[styles.demoBarFill, { width: `${demo.stPercent}%`, backgroundColor: '#10B981' }]} />
                    </View>
                    <Text style={styles.demoBarValue}>{demo.stPercent}%</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Dataset limitations */}
            <View style={styles.casteNoticeCard}>
              <View style={styles.casteNoticeHeader}>
                <Ionicons name="information-circle" size={20} color="#002B7F" />
                <Text style={styles.casteNoticeTitle}>
                  {t('constituency.demographicDataNoteTitle', { defaultValue: 'About these figures' })}
                </Text>
              </View>
              <Text style={styles.casteNoticeText}>
                {t('constituency.demographicDataNote', { defaultValue: 'Some figures in the reference dataset are estimates or use older census and electoral roll years. Poligram does not yet show a source and publication date beside every constituency figure; treat these values as context, not as certified current counts.' })}
              </Text>
            </View>
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

      <ShareableCardModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        data={{
          type: 'constituency',
          title: localizedConstName,
          stateCode,
          district: localizedDistrict,
          category: localizedReservation,
          acNo,
          winnerName: effectiveWinnerName,
          winnerParty: effectiveWinnerParty,
          winnerVotes: effectiveWinnerVotes ?? undefined,
          winnerVoteShare: canonicalPodium?.winner?.voteShare ?? undefined,
          runnerUpName: effectiveRunnerUpName || undefined,
          runnerUpParty: effectiveRunnerUp || undefined,
          runnerUpVotes: canonicalPodium?.firstRunnerUp?.votes ?? undefined,
          margin: effectiveMargin ?? undefined,
          turnoutPercent: demo?.turnout2023 != null && demo.turnout2023 > 0 ? demo.turnout2023 : undefined,
          shareUrl: `https://poligram.in/constituency/${stateCode}-AC-${acNo}`,
        }}
      />

      {reportIssueVisible && (
        <ReportIssueSheet
          visible={reportIssueVisible}
          onClose={() => setReportIssueVisible(false)}
          onSubmit={(iss) => addIssue(iss)}
        />
      )}

      {detailPost && (
        <PostDetailModal
          visible={!!detailPost}
          post={detailPost}
          autoFocusReply={autoFocusReply}
          onClose={() => setDetailPost(null)}
        />
      )}

      {composeVisible && (
        <ComposeSheet
          visible={composeVisible}
          onClose={() => setComposeVisible(false)}
          onSubmit={(post) => useFeedStore.getState().addPost(post)}
        />
      )}
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
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  heroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  typeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  heroButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  homeButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  homeButtonActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  homeButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  homeButtonTextActive: {
    color: '#047857',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#002B7F',
    gap: 6,
    minWidth: 90,
  },
  followButtonActive: {
    backgroundColor: '#002B7F',
    borderColor: '#002B7F',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#002B7F',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  followButtonTextActive: {
    color: '#FFFFFF',
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
  newPostHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  newPostHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  newsFilterScroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  newsFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FAF6EE',
    borderWidth: 1,
    borderColor: '#E8DED1',
    marginRight: 8,
  },
  newsFilterPillActive: {
    backgroundColor: '#A8201A',
    borderColor: '#A8201A',
  },
  newsFilterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D5549',
  },
  newsFilterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  newsHierarchySection: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  newsSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  newsSectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  newsSectionCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
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
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 22,
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  provenancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  provenanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  provenanceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  communitySyncCard: {
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  communitySyncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  communitySyncTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#002B7F',
  },
  communitySyncDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
    marginBottom: 14,
  },
  communitySyncBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reportIssueBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#002B7F',
  },
  reportIssueBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  discussFeedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#002B7F',
  },
  discussFeedBtnText: {
    color: '#002B7F',
    fontSize: 13,
    fontWeight: '800',
  },
  casteNoticeCard: {
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  casteNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  casteNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369A1',
    flex: 1,
  },
  casteNoticeText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#334155',
    marginBottom: 12,
  },
  casteNoticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  casteNoticeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  expandHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
  },
  expandHistoryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
