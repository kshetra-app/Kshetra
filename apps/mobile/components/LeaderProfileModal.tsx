import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Share,
  TextInput,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AspirantProfile } from '../lib/aspirantTypes';
import { useFeedStore } from '../stores/feed';
import { useAuthStore } from '../stores/auth';
import { useAspirantStore } from '../stores/aspirant';
import { useDMStore } from '../stores/dmStore';
import PostCard from './PostCard';
import type { Post } from '../lib/feedTypes';
import { IS_LIVE_ENVIRONMENT } from '../lib/environment';
import { fetchUserFollowerCount } from '../lib/supabaseDataService';
import {
  canManageLeaderProfile,
  getLeaderProfilePosts,
} from '../lib/leaderProfileTruth';

interface LeaderProfileModalProps {
  visible: boolean;
  aspirant: AspirantProfile | null;
  onClose: () => void;
  isOwner?: boolean;
}

type LeaderSubTab = 'posts' | 'profile' | 'vision' | 'initiatives' | 'values' | 'studio';

export default function LeaderProfileModal({
  visible,
  aspirant,
  onClose,
  isOwner = false,
}: LeaderProfileModalProps) {
  const { t, i18n } = useTranslation();
  const isTelugu = i18n.language === 'te';
  const unavailableLabel = t('constituency.dataUnavailable', { defaultValue: 'Unavailable' });
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeSubTab, setActiveSubTab] = useState<LeaderSubTab>('posts');
  const [newPostText, setNewPostText] = useState('');
  const [votedPolls, setVotedPolls] = useState<Record<string, number>>({});
  const [visionVotes, setVisionVotes] = useState<Record<string, number>>({});
  const [volunteerJoined, setVolunteerJoined] = useState(false);
  const [liveFollowerCount, setLiveFollowerCount] = useState<number | null>(null);

  const authUser = useAuthStore((s) => s.user);
  const feedPosts = useFeedStore((s) => s.posts);
  const addFeedPost = useFeedStore((s) => s.addPost);
  const followUser = useFeedStore((s) => s.followUser);
  const unfollowUser = useFeedStore((s) => s.unfollowUser);
  const isFollowing = useFeedStore((s) =>
    s.isFollowing(aspirant?.userId || ''),
  );
  const endorseAspirant = useAspirantStore((s) => s.endorseAspirant);
  const endorsedIds = useAspirantStore((s) => s.endorsedIds);

  const isUserOwner = useMemo(
    () => canManageLeaderProfile(aspirant, authUser?.id, isOwner, IS_LIVE_ENVIRONMENT),
    [isOwner, authUser?.id, aspirant],
  );

  const isEndorsed = aspirant ? endorsedIds.includes(aspirant.id) : false;

  useEffect(() => {
    let active = true;
    setLiveFollowerCount(null);

    if (!IS_LIVE_ENVIRONMENT || !visible || !aspirant?.userId) {
      return () => {
        active = false;
      };
    }

    void fetchUserFollowerCount(aspirant.userId).then((count) => {
      if (active) setLiveFollowerCount(count);
    });

    return () => {
      active = false;
    };
  }, [aspirant?.userId, isFollowing, visible]);

  // Filter posts created by this aspirant/leader
  const leaderPosts = useMemo(
    () => getLeaderProfilePosts(feedPosts, aspirant, IS_LIVE_ENVIRONMENT),
    [feedPosts, aspirant],
  );

  // Seed posts are limited to non-live previews; production shows only stored posts.
  const effectivePosts: Post[] = useMemo(() => {
    if (leaderPosts.length > 0) return leaderPosts;
    if (!aspirant || IS_LIVE_ENVIRONMENT) return [];
    const authorId = aspirant.userId || aspirant.id;
    const authorName = aspirant.displayName;
    const constName = aspirant.targetConstituencyName || 'Constituency';

    if (isTelugu) {
      return [
        {
          id: `post-seed-${aspirant.id}-1`,
          author: {
            id: authorId,
            displayName: authorName,
            avatarUrl: aspirant.avatarUrl,
            isVerified: true,
          },
          stateCode: aspirant.stateCode || 'TS',
          constituencyId: aspirant.targetConstituencyAcNo ? `${aspirant.stateCode}-AC-${aspirant.targetConstituencyAcNo}` : undefined,
          constituencyName: constName,
          content: `ఈరోజు ${constName} మండల పరిధిలోని రైతులతో సమావేశమై సాగునీటి సరఫరా మరియు ధాన్యం కొనుగోలు కేంద్రాల సమస్యలపై చర్చించడం జరిగింది. సమస్యల పరిష్కారం కోసం ఉన్నతాధికారుల దృష్టికి తీసుకెళ్తామని హామీ ఇచ్చాము.`,
          type: 'field_update' as any,
          replyCount: 18,
          reactionCount: 245,
          isPinned: true,
          isDeleted: false,
          language: 'te',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          hashtags: [constName.replace(/\s+/g, ''), 'రైతుసంక్షేమం', 'క్షేత్రసేవ'],
        },
        {
          id: `post-seed-${aspirant.id}-2`,
          author: {
            id: authorId,
            displayName: authorName,
            avatarUrl: aspirant.avatarUrl,
            isVerified: true,
          },
          stateCode: aspirant.stateCode || 'TS',
          constituencyId: aspirant.targetConstituencyAcNo ? `${aspirant.stateCode}-AC-${aspirant.targetConstituencyAcNo}` : undefined,
          constituencyName: constName,
          content: `${constName} పట్టణంలోని ప్రధాన రహదారి గుంతల మరమ్మత్తులపై మున్సిపల్ అధికారులకు వినతిపత్రం సమర్పించాము. త్వరలోనే పనులు ప్రారంభిస్తామని స్పష్టం చేశారు.`,
          type: 'civic' as any,
          replyCount: 9,
          reactionCount: 132,
          isPinned: false,
          isDeleted: false,
          language: 'te',
          createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 28).toISOString(),
          hashtags: [constName.replace(/\s+/g, ''), 'మౌలికవసతులు'],
        },
      ];
    }
    return [
      {
        id: `post-seed-${aspirant.id}-1`,
        author: {
          id: authorId,
          displayName: authorName,
          avatarUrl: aspirant.avatarUrl,
          isVerified: true,
        },
        stateCode: aspirant.stateCode || 'TS',
        constituencyId: aspirant.targetConstituencyAcNo ? `${aspirant.stateCode}-AC-${aspirant.targetConstituencyAcNo}` : undefined,
        constituencyName: constName,
        content: `Met with local farmers and community leaders in ${constName} today to inspect irrigation canals and discuss direct procurement center operations. Committed to resolving their grievances promptly with authorities.`,
        type: 'field_update' as any,
        replyCount: 18,
        reactionCount: 245,
        isPinned: true,
        isDeleted: false,
        language: 'en',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        hashtags: [constName.replace(/\s+/g, ''), 'FarmersFirst', 'FieldService'],
      },
      {
        id: `post-seed-${aspirant.id}-2`,
        author: {
          id: authorId,
          displayName: authorName,
          avatarUrl: aspirant.avatarUrl,
          isVerified: true,
        },
        stateCode: aspirant.stateCode || 'TS',
        constituencyId: aspirant.targetConstituencyAcNo ? `${aspirant.stateCode}-AC-${aspirant.targetConstituencyAcNo}` : undefined,
        constituencyName: constName,
        content: `Submitted an official memorandum regarding bypass road resurfacing and municipal drainage repairs in ${constName}. Authorities have committed to expedited field inspection this week.`,
        type: 'civic' as any,
        replyCount: 9,
        reactionCount: 132,
        isPinned: false,
        isDeleted: false,
        language: 'en',
        createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 28).toISOString(),
        hashtags: [constName.replace(/\s+/g, ''), 'CivicAction', 'Infrastructure'],
      },
    ];
  }, [leaderPosts, aspirant, isTelugu]);

  // Bilingual strings resolution
  const effectiveMotto = useMemo(() => {
    if (IS_LIVE_ENVIRONMENT) return aspirant?.motto || '';
    if (aspirant?.motto) {
      if (!isTelugu && /[\u0C00-\u0C7F]/.test(aspirant.motto)) {
        return 'Serving with integrity, transparency, and accountability for every citizen.';
      }
      return aspirant.motto;
    }
    return isTelugu ? 'ప్రజాసేవలో పారదర్శకత, అంకితభావం' : 'Dedicated to transparent, accountable public service';
  }, [aspirant, isTelugu]);

  const effectiveBio = useMemo(() => {
    if (IS_LIVE_ENVIRONMENT) return aspirant?.bio || '';
    if (aspirant?.bio) {
      if (!isTelugu && /[\u0C00-\u0C7F]/.test(aspirant.bio)) {
        return `Civic leader and public advocate active in ${aspirant.targetConstituencyName || 'the constituency'}. Dedicated to local development, youth empowerment, and grievance resolution.`;
      }
      return aspirant.bio;
    }
    return isTelugu
      ? 'స్థానిక సమస్యల పరిష్కారం, యువత ఉపాధి మరియు మౌలిక వసతుల కల్పన కోసం అంకితభావంతో పనిచేస్తున్న ప్రజా నాయకుడు.'
      : 'Dedicated to community development, civic grievance resolution, and transparent governance.';
  }, [aspirant, isTelugu]);

  const effectiveJourneyBio = useMemo(() => {
    if (IS_LIVE_ENVIRONMENT) return aspirant?.journeyBio || '';
    if (aspirant?.journeyBio) {
      if (!isTelugu && /[\u0C00-\u0C7F]/.test(aspirant.journeyBio)) {
        return `${aspirant.displayName} has completed over 10 years of grassroots service across the villages and wards of this constituency. Through continuous town halls, medical camps, and civic grievance resolution, they have built trusted public goodwill.`;
      }
      return aspirant.journeyBio;
    }
    return isTelugu
      ? `${aspirant?.displayName || 'నాయకుడు'} గారు నియోజకవర్గ సమగ్ర అభివృద్ధి కోసం కృషి చేస్తున్నారు. గ్రామీణ తాగునీటి సాధన మరియు మహిళా సాధికారత ఉద్యమాల్లో చురుగ్గా పాల్గొన్నారు.`
      : `${aspirant?.displayName || 'This leader'} has dedicated over a decade to grassroots public service in the constituency, championing student scholarships, free medical camps, and infrastructure development.`;
  }, [aspirant, isTelugu]);

  const defaultPledges = useMemo(() => {
    if (IS_LIVE_ENVIRONMENT) return [];
    if (isTelugu) {
      return [
        { id: 'vis-1', title: 'మంచినీటి పైప్‌లైన్ మరియు తాగునీటి భద్రత', desc: 'ప్రతి గ్రామానికి శుద్ధి చేసిన తాగునీరు మరియు ఆర్వో ప్లాంట్ల నిరంతర నిర్వహణ.', supportCount: 1420 },
        { id: 'vis-2', title: 'రైతు మార్కెట్ యార్డు ఆధునీకరణ & మద్దతు ధర', desc: 'మిర్చి, పత్తి రైతులకు కోల్డ్ స్టోరేజ్ సౌకర్యం మరియు డిజిటల్ వేలం వ్యవస్థ.', supportCount: 1180 },
        { id: 'vis-3', title: 'ప్రాథమిక ఆరోగ్య కేంద్రాల అప్‌గ్రేడేషన్', desc: 'మండల స్థాయి పీహెచ్‌సీలలో 24/7 అత్యవసర సేవలు, ఆక్సిజన్ పడకలు.', supportCount: 954 },
      ];
    }
    return [
      { id: 'vis-1', title: 'Piped Clean Drinking Water for Every Household', desc: 'Time-bound mission to provide 24/7 clean piped water infrastructure across all habitations.', supportCount: 1420 },
      { id: 'vis-2', title: 'Youth Skill Centers & Local Employment Creation', desc: 'Establishing modern skill development institutes and connecting educated youth to manufacturing and IT hubs.', supportCount: 1180 },
      { id: 'vis-3', title: 'Modernization of Primary Health Centers (PHCs)', desc: '24/7 emergency care, full physician staffing, and equipped ambulances for rural and town centers.', supportCount: 954 },
    ];
  }, [isTelugu]);

  const pollData = useMemo(() => {
    if (IS_LIVE_ENVIRONMENT) return null;
    if (isTelugu) {
      return {
        question: `${aspirant?.targetConstituencyName || 'నియోజకవర్గం'}లో వచ్చే ఆర్థిక సంవత్సరంలో అత్యవసరంగా చేపట్టాల్సిన మొదటి ప్రాజెక్ట్ ఏది అని మీరు భావిస్తున్నారు?`,
        options: [
          { id: 'opt-1', label: '1. మంచినీటి పైప్‌లైన్ విస్తరణ', pct: 62, votes: 1412 },
          { id: 'opt-2', label: '2. బైపాస్ రోడ్డు గుంతల మరమ్మత్తు', pct: 24, votes: 546 },
          { id: 'opt-3', label: '3. ప్రభుత్వ ఆసుపత్రి అప్‌గ్రేడేషన్', pct: 14, votes: 318 },
        ],
        footerNote: 'మొత్తం ఓట్లు: 2,276 · పోల్ ముగియడానికి ఇంకా 2 రోజులు ఉంది',
      };
    }
    return {
      question: `Which priority infrastructure project should be undertaken first in ${aspirant?.targetConstituencyName || 'this constituency'}?`,
      options: [
        { id: 'opt-1', label: '1. Drinking water pipeline expansion & household taps', pct: 62, votes: 1412 },
        { id: 'opt-2', label: '2. Bypass road repair & streetlight modernization', pct: 24, votes: 546 },
        { id: 'opt-3', label: '3. Primary Health Center (PHC) & hospital upgrade', pct: 14, votes: 318 },
      ],
      footerNote: 'Total Votes: 2,276 · 2 days remaining',
    };
  }, [isTelugu, aspirant]);

  const displayedInitiatives = useMemo(() => {
    if (aspirant?.fieldInitiatives) return aspirant.fieldInitiatives;
    if (IS_LIVE_ENVIRONMENT) return [];
    return [
      { id: 'init-1', title: 'రెంటచింతల ప్రాథమిక పాఠశాలలో మంచినీటి ఆర్వో ప్లాంట్ పునరుద్ధరణ', desc: 'మూతపడిన ఆర్వో ప్లాంట్‌ను పంచాయతీ అధికారులతో మరమ్మతులు చేయించి 350 మంది విద్యార్థులకు తాగునీరు అందించాము.', date: '2026-11-01', isResolved: true },
      { id: 'init-2', title: 'మాచర్ల బైపాస్ రోడ్డు గుంతల మరమ్మత్తు ప్రచారం', desc: 'ప్రమాదకర గుంతలపై ఆర్‌అండ్‌బీ అధికారులతో 4 కిలోమీటర్ల మేర తాత్కాలిక ప్యాచ్ వర్క్ పూర్తి చేయించాము.', date: '2026-10-24', isResolved: true },
    ];
  }, [aspirant]);

  const displayedPledges = aspirant?.visionPledges ?? defaultPledges;

  if (!aspirant) return null;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `View ${aspirant.displayName}'s profile on Poligram: https://poligram.app/aspirant/${aspirant.id}`,
      });
    } catch {
      // dismissed
    }
  };

  const handleFollowToggle = async () => {
    if (!aspirant.userId || authUser?.id === aspirant.userId) {
      Alert.alert(unavailableLabel);
      return;
    }
    const stateCode = aspirant.stateCode.trim().toUpperCase();
    const succeeded = isFollowing
      ? await unfollowUser(aspirant.userId, stateCode || undefined, null)
      : await followUser(aspirant.userId, stateCode || undefined, null);
    if (!succeeded) {
      Alert.alert(useFeedStore.getState().lastError || unavailableLabel);
    }
  };

  const handleEndorse = async () => {
    try {
      await endorseAspirant(aspirant.id, authUser?.id);
    } catch (error) {
      Alert.alert(error instanceof Error ? error.message : unavailableLabel);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostText.trim()) return;
    if (IS_LIVE_ENVIRONMENT && (!authUser?.id || authUser.id !== aspirant.userId)) {
      Alert.alert(isTelugu ? 'దయచేసి సైన్ ఇన్ చేయండి' : 'Sign in before publishing a post.');
      return;
    }
    const stateCode = aspirant.stateCode.trim().toUpperCase();
    if (IS_LIVE_ENVIRONMENT && !/^[A-Z]{2}$/.test(stateCode)) {
      Alert.alert(unavailableLabel);
      return;
    }
    const newPost: Post = {
      id: `post-${Date.now()}`,
      author: {
        id: authUser?.id || aspirant.userId || 'current-user',
        displayName: aspirant.displayName,
        avatarUrl: aspirant.avatarUrl,
        isVerified: false,
      },
      stateCode: stateCode || (IS_LIVE_ENVIRONMENT ? '' : 'IN'),
      constituencyId: stateCode && aspirant.targetConstituencyAcNo
        ? `${stateCode}-AC-${aspirant.targetConstituencyAcNo}`
        : undefined,
      constituencyName: aspirant.targetConstituencyName,
      content: newPostText.trim(),
      type: 'discussion',
      replyCount: 0,
      reactionCount: 1,
      isPinned: false,
      isDeleted: false,
      language: i18n.language.split('-')[0] || 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hashtags: [aspirant.targetConstituencyName?.replace(/\s+/g, '') || 'CivicLeader'],
    };
    const outcome = await addFeedPost(newPost);
    if (outcome === 'failed') {
      Alert.alert(useFeedStore.getState().lastError || unavailableLabel);
      return;
    }
    setNewPostText('');
    Alert.alert(isTelugu ? 'పోస్ట్' : 'Post', outcome === 'queued'
      ? (isTelugu ? 'కనెక్షన్ అందుబాటులోకి వచ్చినప్పుడు పోస్ట్ పంపబడుతుంది.' : 'Your post will be sent when the connection is available.')
      : outcome === 'local'
        ? (isTelugu ? 'ఇది స్థానిక ప్రివ్యూ మాత్రమే; ప్రచురించబడలేదు.' : 'This is a local preview; it was not published.')
        : (isTelugu ? 'పోస్ట్ ప్రచురించబడింది.' : 'Your post was published.'));
  };

  const handleVotePoll = (pollId: string, optIndex: number) => {
    setVotedPolls((prev) => ({ ...prev, [pollId]: optIndex }));
  };

  const handleSupportVision = (pledgeId: string) => {
    setVisionVotes((prev) => ({
      ...prev,
      [pledgeId]: (prev[pledgeId] || 0) + 1,
    }));
  };

  const handleVolunteer = () => {
    setVolunteerJoined(true);
    Alert.alert(
      'ధన్యవాదాలు!',
      `${aspirant.displayName} ప్రచార వాలంటీర్‌గా మీరు చేరారు. బూత్-స్థాయి పౌర సేవా కార్యకలాపాల కోసం త్వరలో మిమ్మల్ని సంప్రదిస్తారు.`
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* ═══ Top Navy Banner Header ═══ */}
        <View style={styles.topBanner}>
          <View style={styles.bannerRow}>
            <Pressable
              style={styles.circleBtn}
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>

            {/* Live Status Pill */}
            {(!IS_LIVE_ENVIRONMENT || aspirant.liveStatus) && (
              <View style={[styles.liveStatusPill, IS_LIVE_ENVIRONMENT && { backgroundColor: '#475569' }]}>
                {!IS_LIVE_ENVIRONMENT && <View style={styles.livePulseDot} />}
                <Text style={styles.liveStatusText} numberOfLines={1}>
                  {aspirant.liveStatus ? aspirant.liveStatus.replace('క్షేత్ర పర్యటన: ', '') : t('pages.inFieldTour', { defaultValue: 'క్షేత్ర పర్యటనలో ఉన్నారు' })}
                </Text>
              </View>
            )}

            <Pressable
              style={styles.circleBtn}
              onPress={handleShare}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Share"
            >
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Motto */}
          {effectiveMotto ? (
            <Text style={styles.mottoText} numberOfLines={1}>
              {effectiveMotto}
            </Text>
          ) : null}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══ Leader Identity Section ═══ */}
          <View style={styles.identityCard}>
            <View style={styles.avatarRow}>
              {/* Avatar with Verified Ring */}
              <View style={styles.avatarContainer}>
                {aspirant.avatarUrl ? (
                  <Image source={{ uri: aspirant.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <View style={[styles.avatarImg, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarLetter}>
                      {aspirant.displayName.charAt(0)}
                    </Text>
                  </View>
                )}
                {!IS_LIVE_ENVIRONMENT && (
                  <View style={styles.verifiedCheckBadge}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                )}
              </View>

              {/* Primary Actions: Follow & Endorse */}
              <View style={styles.topActionsRow}>
                {!isUserOwner && (
                  <>
                    <Pressable
                      style={[styles.primaryActionPill, styles.followPill]}
                      onPress={handleFollowToggle}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.follow', { defaultValue: 'Follow' })}
                    >
                      <Ionicons name="notifications-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.followPillText}>
                        {isFollowing ? '✓ ' : ''}{t('common.follow', { defaultValue: 'Follow' })}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.primaryActionPill,
                        isEndorsed ? styles.endorsedPillActive : styles.endorsePill,
                      ]}
                      onPress={handleEndorse}
                      disabled={isEndorsed}
                      accessibilityRole="button"
                      accessibilityLabel={isEndorsed
                        ? t('pages.endorsed', { defaultValue: 'Endorsed' })
                        : t('civicScoreCard.endorsements')}
                    >
                      <Ionicons
                        name={isEndorsed ? 'checkmark-circle' : 'thumbs-up'}
                        size={16}
                        color={isEndorsed ? '#10B981' : '#002B7F'}
                      />
                      <Text style={[styles.endorsePillText, isEndorsed && styles.endorsedPillTextActive]}>
                        {isEndorsed
                          ? t('pages.endorsed', { defaultValue: 'Endorsed' })
                          : `+5 ${t('civicScoreCard.endorsements')}`}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>

            {/* Name & Titles */}
            <View style={styles.namesBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{aspirant.displayName}</Text>
                {!IS_LIVE_ENVIRONMENT && <Ionicons name="checkmark-circle" size={18} color="#0284C7" />}
              </View>

              <View style={styles.metaBadgeRow}>
                <View style={styles.acBadge}>
                  <Text style={styles.acBadgeText}>
                    {aspirant.targetConstituencyAcNo
                      ? `🎯 AC #${aspirant.targetConstituencyAcNo} ${aspirant.targetConstituencyName || ''}`
                      : '🎯 Civic Leader'}
                  </Text>
                </View>
                <View style={styles.partyBadge}>
                  <Text style={styles.partyBadgeText}>
                    {aspirant.isIndependent ? 'స్వతంత్ర అభ్యర్థి (IND)' : (aspirant.partyAffiliation || 'Aspirant')}
                  </Text>
                </View>
              </View>

              {/* Live Status Description Box */}
              {(!IS_LIVE_ENVIRONMENT || aspirant.liveStatus) && (
                <View style={styles.liveBoxContainer}>
                  <View style={[styles.liveBoxDot, IS_LIVE_ENVIRONMENT && { backgroundColor: '#94A3B8' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.liveBoxTitle}>
                      {t('pages.liveStatus', { defaultValue: isTelugu ? 'లైవ్ స్టేటస్' : 'Live Status' })}: {aspirant.liveStatus || (isTelugu ? 'నియోజకవర్గ ప్రజా సంబంధాల్లో ఉన్నారు' : 'Active in constituency outreach Sabhas')}
                    </Text>
                    <Text style={styles.liveBoxSub}>
                      {aspirant.liveStatusTime || (IS_LIVE_ENVIRONMENT ? unavailableLabel : (isTelugu ? '1 గంట క్రితం' : '1 hr ago'))}{!IS_LIVE_ENVIRONMENT && ` · ${isTelugu ? 'అధికారిక ఫీల్డ్ అప్‌డేట్' : 'Verified Field Update'}`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Bio */}
              {effectiveBio ? <Text style={styles.bioText}>{effectiveBio}</Text> : null}
            </View>

            {/* ═══ Public Metrics Bar (Strictly Public) ═══ */}
            <View style={styles.publicMetricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricCardLabel}>{t('common.followers')}</Text>
                <Text style={styles.metricCardValue}>
                  {IS_LIVE_ENVIRONMENT
                    ? (liveFollowerCount?.toLocaleString('en-IN') ?? unavailableLabel)
                    : (aspirant.communityEndorsements > 1000
                      ? `${(aspirant.communityEndorsements * 9).toLocaleString('en-IN')}`
                      : '38.4K')}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricCardLabel}>{t('civicScoreCard.endorsements')}</Text>
                <Text style={[styles.metricCardValue, { color: '#047857' }]}>
                  {aspirant.communityEndorsements.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricCardLabel}>{t('civicScoreCard.title')}</Text>
                <Text style={[styles.metricCardValue, { color: '#002B7F' }]}>
                  {aspirant.civicScore} <Text style={{ fontSize: 11, color: '#D97706' }}>★</Text>
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricCardLabel}>{t('civicScoreCard.resolved')}</Text>
                <Text style={[styles.metricCardValue, { color: '#4F46E5' }]}>
                  {aspirant.issuesResolved}
                </Text>
              </View>
            </View>
          </View>

          {/* ═══ 5 Dignified Sub-Tabs Rail ═══ */}
          <View style={styles.subTabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabsScroll}>
              {/* Tab 1: Posts & Activity */}
              <Pressable
                style={[styles.subTabPill, activeSubTab === 'posts' && styles.subTabPillActive]}
                onPress={() => setActiveSubTab('posts')}
              >
                <Ionicons name="newspaper" size={15} color={activeSubTab === 'posts' ? '#FFFFFF' : '#475569'} />
                <Text style={[styles.subTabPillText, activeSubTab === 'posts' && styles.subTabPillTextActive]}>
                  {t('pages.tabPosts', { defaultValue: 'పోస్ట్‌లు & యాక్టివిటీ' })}
                </Text>
              </Pressable>

              {/* Tab 2: Profile & Journey */}
              <Pressable
                style={[styles.subTabPill, activeSubTab === 'profile' && styles.subTabPillActive]}
                onPress={() => setActiveSubTab('profile')}
              >
                <Ionicons name="person" size={15} color={activeSubTab === 'profile' ? '#FFFFFF' : '#475569'} />
                <Text style={[styles.subTabPillText, activeSubTab === 'profile' && styles.subTabPillTextActive]}>
                  {t('pages.tabProfile', { defaultValue: 'పరిచయం & ప్రస్థానం' })}
                </Text>
              </Pressable>

              {/* Tab 3: Vision & Manifesto */}
              <Pressable
                style={[styles.subTabPill, activeSubTab === 'vision' && styles.subTabPillActive]}
                onPress={() => setActiveSubTab('vision')}
              >
                <Ionicons name="clipboard" size={15} color={activeSubTab === 'vision' ? '#FFFFFF' : '#475569'} />
                <Text style={[styles.subTabPillText, activeSubTab === 'vision' && styles.subTabPillTextActive]}>
                  {t('pages.tabVision', { defaultValue: 'విజన్ & ప్రణాళిక' })}
                </Text>
              </Pressable>

              {/* Tab 4: Field Initiatives */}
              <Pressable
                style={[styles.subTabPill, activeSubTab === 'initiatives' && styles.subTabPillActive]}
                onPress={() => setActiveSubTab('initiatives')}
              >
                <Ionicons name="flash" size={15} color={activeSubTab === 'initiatives' ? '#FFFFFF' : '#475569'} />
                <Text style={[styles.subTabPillText, activeSubTab === 'initiatives' && styles.subTabPillTextActive]}>
                  {t('pages.tabInitiatives', { defaultValue: 'క్షేత్ర సేవా రికార్డు' })}
                </Text>
              </Pressable>

              {/* Tab 5: Values & Disclosures */}
              <Pressable
                style={[styles.subTabPill, activeSubTab === 'values' && styles.subTabPillActive]}
                onPress={() => setActiveSubTab('values')}
              >
                <Ionicons name="scale" size={15} color={activeSubTab === 'values' ? '#FFFFFF' : '#475569'} />
                <Text style={[styles.subTabPillText, activeSubTab === 'values' && styles.subTabPillTextActive]}>
                  {t('pages.tabValues', { defaultValue: 'నైతిక విలువలు & హామీ' })}
                </Text>
              </Pressable>

              {/* Gated Studio Tab (Only for Owner / Admin) */}
              {isUserOwner && (
                <Pressable
                  style={[styles.subTabPill, styles.subTabStudioPill, activeSubTab === 'studio' && styles.subTabStudioPillActive]}
                  onPress={() => setActiveSubTab('studio')}
                >
                  <Ionicons name="lock-closed" size={15} color={activeSubTab === 'studio' ? '#FFFFFF' : '#92400E'} />
                  <Text style={[styles.subTabStudioText, activeSubTab === 'studio' && { color: '#FFFFFF' }]}>
                    {t('pages.tabStudio', { defaultValue: 'స్టూడియో (ప్రైవేట్)' })}
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </View>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 1: POSTS & ACTIVITY                                          */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'posts' && (
            <View style={styles.tabSection}>
              {/* Post Composer for the candidate */}
              {isUserOwner && (
                <View style={styles.composerCard}>
                  <Text style={styles.composerHeading}>
                    {t('pages.postUpdate', { defaultValue: 'నియోజకవర్గ ప్రజలతో తాజా సమాచారాన్ని పంచుకోండి' })}
                  </Text>
                  <TextInput
                    style={styles.composerInput}
                    placeholder={t('pages.postPlaceholder', { defaultValue: 'ఈరోజు క్షేత్రస్థాయి పరిశీలన లేదా మీ ఆలోచనలను పంచుకోండి...' })}
                    placeholderTextColor="#94A3B8"
                    value={newPostText}
                    onChangeText={setNewPostText}
                    multiline
                  />
                  <View style={styles.composerFooter}>
                    <Pressable style={styles.composerPublishBtn} onPress={handleCreatePost}>
                      <Text style={styles.composerPublishText}>
                        {t('pages.postBtn', { defaultValue: 'పోస్ట్ చేయండి' })}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Render Leader's Verified Field Posts & Activity */}
              {effectivePosts.map((post) => (
                <View key={post.id} style={{ marginBottom: 12 }}>
                  <PostCard post={post} />
                </View>
              ))}

              {/* The local poll preview is not a production poll service. */}
              {pollData && (
              <View style={styles.pollCard}>
                <View style={styles.pollHeaderRow}>
                  <View style={styles.avatarImgSmall}>
                    <Text style={{ fontWeight: '800', color: '#002B7F', fontSize: 13 }}>
                      {aspirant.displayName.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.pollAuthorName}>{aspirant.displayName}</Text>
                    <Text style={styles.pollCategoryLabel}>
                      {t('pages.citizenPoll', { defaultValue: isTelugu ? '📊 ప్రజాభిప్రాయ సేకరణ (Citizen Poll)' : '📊 Citizen Poll' })}
                    </Text>
                  </View>
                </View>

                <Text style={styles.pollQuestion}>
                  {pollData.question}
                </Text>

                <View style={styles.pollOptionsContainer}>
                  {pollData.options.map((opt, idx) => {
                    const isSelected = votedPolls['leader-poll-1'] === idx;
                    return (
                      <Pressable
                        key={opt.id}
                        style={[styles.pollOptionBtn, isSelected && styles.pollOptionBtnSelected]}
                        onPress={() => handleVotePoll('leader-poll-1', idx)}
                      >
                        <View style={[styles.pollProgressFill, { width: `${opt.pct}%` }]} />
                        <View style={styles.pollOptionContentRow}>
                          <Text style={[styles.pollOptionText, isSelected && { fontWeight: '800', color: '#002B7F' }]}>
                            {opt.label}
                          </Text>
                          <Text style={styles.pollOptionPctText}>
                            {opt.pct}% ({opt.votes + (isSelected ? 1 : 0)})
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.pollFooterNote}>
                  {pollData.footerNote}
                </Text>
              </View>
              )}
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 2: PROFILE & JOURNEY                                         */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'profile' && (
            <View style={styles.tabSection}>
              <View style={styles.contentBlockCard}>
                <View style={styles.blockTitleRow}>
                  <Text style={styles.blockTitle}>
                    🌱 {t('pages.tabProfile', { defaultValue: 'పరిచయం & ప్రస్థానం' })}
                  </Text>
                  {!IS_LIVE_ENVIRONMENT && (
                    <View style={styles.verifiedBadgePill}>
                      <Text style={styles.verifiedBadgePillText}>ECI Verified</Text>
                    </View>
                  )}
                </View>
                {effectiveJourneyBio ? <Text style={styles.paragraphText}>{effectiveJourneyBio}</Text> : null}
              </View>

              {!IS_LIVE_ENVIRONMENT && <View style={styles.contentBlockCard}>
                <Text style={styles.blockTitle}>🎓 {isTelugu ? 'విద్యార్హతలు & నేపథ్యం' : 'Education & Grassroots Background'}</Text>
                <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.timelineHeading}>{isTelugu ? 'పోస్ట్ గ్రాడ్యుయేషన్ (MA Public Policy)' : 'Post Graduation (MA Public Policy)'}</Text>
                    <Text style={styles.timelineSub}>{isTelugu ? 'ఉస్మానియా విశ్వవిద్యాలయం · ప్రథమ శ్రేణి' : 'Osmania University · Distinction'}</Text>
                  </View>
                </View>
                <View style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.timelineHeading}>{isTelugu ? 'గ్రామీణ ప్రజా ఉద్యమం' : 'Grassroots Civic Action Committee'}</Text>
                    <Text style={styles.timelineSub}>{isTelugu ? 'పల్నాడు తాగునీటి పోరాట కమిటీ కన్వీనర్ (2018 - ప్రస్తుతం)' : 'Water Security & Youth Convenor (2018 - Present)'}</Text>
                  </View>
                </View>
              </View>}
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 3: VISION & MANIFESTO                                        */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'vision' && (
            <View style={styles.tabSection}>
              <View style={styles.contentBlockCard}>
                <Text style={styles.blockTitle}>
                  📋 {t('pages.tabVision', { defaultValue: isTelugu ? 'విజన్ & ప్రణాళిక' : 'Vision & Manifesto' })}
                </Text>
                <Text style={styles.paragraphText}>
                  {IS_LIVE_ENVIRONMENT
                    ? unavailableLabel
                    : (isTelugu ? 'నియోజకవర్గ భవిష్యత్తు కోసం రూపొందించిన స్పష్టమైన ప్రజా ఎజెండా. ప్రతి అంశంపై పౌరులు తమ ప్రాధాన్యతను మద్దతు ద్వారా తెలపవచ్చు:' : 'A clear public agenda for the future of this constituency. Citizens can vote to prioritize initiatives:')}
                </Text>
              </View>

              {displayedPledges.length === 0 && (
                <Text style={styles.paragraphText}>{unavailableLabel}</Text>
              )}
              {displayedPledges.map((pledge) => {
                const addVotes = visionVotes[pledge.id] || 0;
                return (
                  <View key={pledge.id} style={styles.pledgeCard}>
                    <Text style={styles.pledgeTitle}>{pledge.title}</Text>
                    <Text style={styles.pledgeDesc}>{pledge.desc}</Text>
                    {!IS_LIVE_ENVIRONMENT && <View style={styles.pledgeFooterRow}>
                      <Pressable
                        style={[styles.pledgeSupportBtn, addVotes > 0 && styles.pledgeSupportBtnActive]}
                        onPress={() => handleSupportVision(pledge.id)}
                      >
                        <Ionicons name="thumbs-up" size={14} color={addVotes > 0 ? '#10B981' : '#002B7F'} />
                        <Text style={[styles.pledgeSupportText, addVotes > 0 && { color: '#10B981' }]}>
                          {t('pages.agreeWithVision', { defaultValue: isTelugu ? 'మద్దతు తెలపండి' : 'Support Vision' })} ({pledge.supportCount + addVotes})
                        </Text>
                      </Pressable>
                    </View>}
                  </View>
                );
              })}
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 4: FIELD INITIATIVES                                         */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'initiatives' && (
            <View style={styles.tabSection}>
              <View style={styles.contentBlockCard}>
                <Text style={styles.blockTitle}>
                  ⚡ {t('pages.tabInitiatives', { defaultValue: 'క్షేత్ర సేవా రికార్డు' })}
                </Text>
                <Text style={styles.paragraphText}>
                  {IS_LIVE_ENVIRONMENT ? unavailableLabel : 'నియోజకవర్గంలో నేరుగా పరిష్కరించిన ప్రజా సమస్యలు మరియు క్షేత్రస్థాయి ఫలితాలు:'}
                </Text>
              </View>

              {displayedInitiatives.length === 0 && (
                <Text style={styles.paragraphText}>{unavailableLabel}</Text>
              )}
              {displayedInitiatives.map((init) => (
                <View key={init.id} style={styles.initiativeCard}>
                  <View style={styles.initiativeTopRow}>
                    {init.isResolved && (
                      <View style={styles.resolvedBadgePill}>
                        <Ionicons name="checkmark-circle" size={13} color="#047857" />
                        <Text style={styles.resolvedBadgeText}>
                          {t('pages.civicScoreCard.resolved', { defaultValue: isTelugu ? 'పరిష్కరించబడింది' : 'Resolved' })}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.initiativeDate}>{init.date}</Text>
                  </View>
                  <Text style={styles.initiativeTitle}>{init.title}</Text>
                  <Text style={styles.initiativeDesc}>{init.desc}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 5: VALUES & DISCLOSURES                                      */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'values' && (
            <View style={styles.tabSection}>
              {IS_LIVE_ENVIRONMENT ? (
                <View style={styles.contentBlockCard}>
                  <Text style={styles.paragraphText}>{unavailableLabel}</Text>
                </View>
              ) : <View style={styles.contentBlockCard}>
                <Text style={styles.blockTitle}>
                  ⚖️ {t('pages.tabValues', { defaultValue: 'నైతిక విలువలు & హామీ' })}
                </Text>
                <Text style={styles.paragraphText}>
                  రాజకీయాల్లో పూర్తి పారదర్శకత, జవాబుదారీతనం మరియు స్వచ్ఛంద ప్రమాణాలు:
                </Text>
              </View>}

              {!IS_LIVE_ENVIRONMENT && <>
              <View style={styles.disclosureGrid}>
                <View style={[styles.disclosureCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <Text style={{ fontSize: 24, textAlign: 'center', marginBottom: 4 }}>🛡️</Text>
                  <Text style={[styles.disclosureCardTitle, { color: '#065F46' }]}>
                    {t('pages.cleanAffidavit', { defaultValue: '100% క్లీన్ అఫిడవిట్' })}
                  </Text>
                  <Text style={[styles.disclosureCardSub, { color: '#047857' }]}>
                    {t('pages.noCriminalCases', { defaultValue: 'ఎలాంటి క్రిమినల్ కేసులు లేవు' })}
                  </Text>
                </View>

                <View style={[styles.disclosureCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Text style={{ fontSize: 24, textAlign: 'center', marginBottom: 4 }}>📖</Text>
                  <Text style={[styles.disclosureCardTitle, { color: '#1E40AF' }]}>
                    {t('pages.assetDeclaration', { defaultValue: 'బహిరంగ ఆస్తుల ప్రకటన' })}
                  </Text>
                  <Text style={[styles.disclosureCardSub, { color: '#2563EB' }]}>
                    {t('pages.form26Verified', { defaultValue: 'స్వచ్ఛంద Form 26 ప్రకటన' })}
                  </Text>
                </View>
              </View>

              <View style={styles.charterCard}>
                <Text style={styles.charterTitle}>
                  📜 {t('pages.accountabilityCharter', { defaultValue: isTelugu ? 'ప్రజా జవాబుదారీ హామీ' : 'Accountability & Integrity Charter' })}
                </Text>
                <Text style={styles.charterText}>
                  {isTelugu
                    ? 'నేను భారత రాజ్యాంగానికి, ప్రజాస్వామ్య విలువలకి కట్టుబడి ఉంటానని, ప్రతి పౌరుడి సమస్యలకు నిష్పక్షపాతంగా సమాధానం ఇస్తానని మరియు ప్రజాధనాన్ని పారదర్శకంగా వినియోగిస్తానని ప్రతినబూనుతున్నాను.'
                    : 'I solemnly pledge to uphold the Constitution of India, maintain zero tolerance for corruption, ensure total transparency in public expenditure, and remain accessible and accountable to every citizen.'}
                </Text>
              </View>
              </>}
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PRIVATE TAB: LEADER ANALYTICS STUDIO (Candidate/Admin Only)    */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeSubTab === 'studio' && isUserOwner && (
            <View style={styles.tabSection}>
              <View style={styles.privateNoticeBox}>
                <Ionicons name="lock-closed" size={16} color="#92400E" />
                <Text style={styles.privateNoticeText}>
                  {t('pages.privateAnalyticsNotice', {
                    defaultValue: isTelugu
                      ? 'ఈ సెక్షన్ గోప్యమైనది — కేవలం అభ్యర్థి/నాయకుడు మరియు ప్లాట్‌ఫారమ్ అడ్మిన్ టీమ్‌కి మాత్రమే కనిపిస్తుంది.'
                      : 'This section is private — strictly visible only to the candidate and platform analytics team.',
                  })}
                </Text>
              </View>

              <View style={styles.contentBlockCard}>
                <Text style={styles.blockTitle}>
                  📊 {t('pages.boothCoverage', { defaultValue: isTelugu ? 'నియోజకవర్గ బూత్ కవరేజ్' : 'Constituency Booth Coverage' })}
                </Text>
                <View style={styles.studioGrid}>
                  <View style={styles.studioStatBox}>
                    <Text style={styles.studioStatLabel}>{isTelugu ? 'బూత్ రీచ్' : 'Booth Reach'}</Text>
                    <Text style={styles.studioStatVal}>
                      {aspirant.privateTelemetry?.boothCoverageText?.trim() || unavailableLabel}
                    </Text>
                    <Text style={styles.studioStatSub}>
                      {aspirant.privateTelemetry?.grassrootsReachPercent != null
                        ? `${aspirant.privateTelemetry.grassrootsReachPercent}% ${isTelugu ? 'గ్రాస్‌రూట్స్ రీచ్' : 'Grassroots reach'}`
                        : unavailableLabel}
                    </Text>
                  </View>

                  <View style={styles.studioStatBox}>
                    <Text style={styles.studioStatLabel}>{isTelugu ? 'స్పందన సమయం' : 'Response Time'}</Text>
                    <Text style={[styles.studioStatVal, { color: '#047857' }]}>
                      {aspirant.privateTelemetry?.avgResponseHours != null
                        ? `${aspirant.privateTelemetry.avgResponseHours} ${isTelugu ? 'గంటలు' : 'Hours'}`
                        : unavailableLabel}
                    </Text>
                    <Text style={styles.studioStatSub}>
                      {aspirant.privateTelemetry?.responseRatePercent != null
                        ? `${aspirant.privateTelemetry.responseRatePercent}% ${isTelugu ? 'విజ్ఞప్తులకు సమాధానం' : 'inquiries answered'}`
                        : unavailableLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.studioEngagementRow}>
                  <Text style={styles.studioEngagementLabel}>
                    {t('pages.profileViews', { defaultValue: isTelugu ? '30-రోజుల ప్రొఫైల్ వీక్షణలు' : '30-Day Profile Views' })}:
                  </Text>
                  <Text style={styles.studioEngagementVal}>
                    {aspirant.privateTelemetry?.profileViews30Days != null
                      ? aspirant.privateTelemetry.profileViews30Days.toLocaleString('en-IN')
                      : unavailableLabel}
                  </Text>
                </View>

                <View style={styles.studioEngagementRow}>
                  <Text style={styles.studioEngagementLabel}>
                    {t('pages.pendingCitizenRequests', { defaultValue: isTelugu ? 'పెండింగ్‌లో ఉన్న పౌర విజ్ఞప్తులు' : 'Pending Citizen Inquiries' })}:
                  </Text>
                  <Text style={[styles.studioEngagementVal, { color: '#D97706' }]}>
                    {aspirant.privateTelemetry?.pendingRequestsCount != null
                      ? `${aspirant.privateTelemetry.pendingRequestsCount} ${isTelugu ? 'విజ్ఞప్తులు' : 'Requests'}`
                      : unavailableLabel}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 90 }} />
        </ScrollView>

        {/* ═══ Fixed Bottom Engagement Dock ═══ */}
        <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            style={styles.dockPrimaryBtn}
            onPress={async () => {
              const currentUserId = authUser?.id;
              if (!currentUserId) {
                Alert.alert(isTelugu ? 'దయచేసి సైన్ ఇన్ చేయండి' : 'Sign in to message this profile.');
                return;
              }
              if (IS_LIVE_ENVIRONMENT && !aspirant.userId) {
                Alert.alert(unavailableLabel);
                return;
              }
              onClose();
              const candidateUserId = aspirant.userId || aspirant.id;
              const convId = await useDMStore.getState().startConversationWithUser(
                currentUserId,
                {
                  id: candidateUserId,
                  displayName: aspirant.displayName,
                  role: 'aspirant',
                  isVerified: false,
                },
              );
              if (convId) {
                router.push(`/messages/${convId}` as any);
              } else {
                router.push('/messages' as any);
              }
            }}
          >
            <Ionicons name="chatbubbles" size={17} color="#FFFFFF" />
            <Text style={styles.dockPrimaryText}>
              {t('pages.directMessage', { defaultValue: isTelugu ? 'సమస్యను నేరుగా తెలపండి' : 'Message Candidate' })}
            </Text>
          </Pressable>

          {!IS_LIVE_ENVIRONMENT && (
            <Pressable
              style={[styles.dockSecondaryBtn, volunteerJoined && styles.dockSecondaryBtnActive]}
              onPress={handleVolunteer}
            >
              <Ionicons name="people" size={17} color={volunteerJoined ? '#047857' : '#002B7F'} />
              <Text style={[styles.dockSecondaryText, volunteerJoined && { color: '#047857' }]}>
                {volunteerJoined ? (isTelugu ? 'వాలంటీర్ ✓' : 'Volunteer ✓') : t('pages.volunteer', { defaultValue: isTelugu ? 'వాలంటీర్' : 'Volunteer' })}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBanner: {
    backgroundColor: '#002B7F',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    maxWidth: '65%',
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  liveStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mottoText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  identityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#002B7F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    position: 'relative',
    marginTop: -26,
  },
  avatarImg: {
    width: 74,
    height: 74,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#0F172A',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#002B7F',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  verifiedCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#002B7F',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
  },
  followPill: {
    backgroundColor: '#002B7F',
  },
  followPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  endorsePill: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  endorsePillText: {
    color: '#002B7F',
    fontSize: 12,
    fontWeight: '800',
  },
  endorsedPillActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  endorsedPillTextActive: {
    color: '#047857',
  },
  namesBlock: {
    marginTop: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  acBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  acBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  partyBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  partyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  liveBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    gap: 8,
  },
  liveBoxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveBoxTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  liveBoxSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
    marginTop: 1,
  },
  bioText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
    marginTop: 8,
  },
  publicMetricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricCardLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metricCardValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  subTabsContainer: {
    marginBottom: 10,
  },
  subTabsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  subTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  subTabPillActive: {
    backgroundColor: '#002B7F',
    borderColor: '#002B7F',
  },
  subTabPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  subTabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  subTabStudioPill: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  subTabStudioPillActive: {
    backgroundColor: '#D97706',
    borderColor: '#B45309',
  },
  subTabStudioText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#92400E',
  },
  tabSection: {
    gap: 10,
  },
  composerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 8,
  },
  composerHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#002B7F',
  },
  composerInput: {
    fontSize: 12,
    color: '#0F172A',
    minHeight: 52,
    textAlignVertical: 'top',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  composerToolIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  composerIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  composerPublishBtn: {
    backgroundColor: '#002B7F',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  composerPublishText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  emptyFeedBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  emptyFeedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  pollCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 8,
  },
  pollHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImgSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#002B7F',
  },
  pollAuthorName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  pollCategoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  pollQuestion: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
  },
  pollOptionsContainer: {
    gap: 6,
    marginTop: 4,
  },
  pollOptionBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    position: 'relative',
    height: 38,
    justifyContent: 'center',
  },
  pollOptionBtnSelected: {
    borderColor: '#002B7F',
  },
  pollProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 43, 127, 0.12)',
  },
  pollOptionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    zIndex: 1,
  },
  pollOptionText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  pollOptionPctText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#002B7F',
  },
  pollFooterNote: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  contentBlockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  verifiedBadgePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  paragraphText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#334155',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#002B7F',
    marginTop: 4,
  },
  timelineHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineSub: {
    fontSize: 11,
    color: '#64748B',
  },
  pledgeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  pledgeTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  pledgeDesc: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#475569',
  },
  pledgeFooterRow: {
    marginTop: 4,
    flexDirection: 'row',
  },
  pledgeSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pledgeSupportBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  pledgeSupportText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#002B7F',
  },
  initiativeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  initiativeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resolvedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  resolvedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  initiativeDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  initiativeTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  initiativeDesc: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#475569',
  },
  disclosureGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  disclosureCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  disclosureCardTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  disclosureCardSub: {
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  charterCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  charterTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  charterText: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#475569',
  },
  privateNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
  },
  privateNoticeText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 15,
  },
  studioGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  studioStatBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  studioStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  studioStatVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#002B7F',
    marginTop: 2,
  },
  studioStatSub: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#047857',
    marginTop: 2,
  },
  studioEngagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  studioEngagementLabel: {
    fontSize: 11,
    color: '#475569',
  },
  studioEngagementVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  dockPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#002B7F',
    borderRadius: 12,
    paddingVertical: 11,
  },
  dockPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  dockSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  dockSecondaryBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  dockSecondaryText: {
    color: '#002B7F',
    fontSize: 12.5,
    fontWeight: '800',
  },
});
