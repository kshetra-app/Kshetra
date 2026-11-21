import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { createURL } from 'expo-linking';
import { CONTENT_PAGE_SIZE } from '@kshetra/shared';
import ComposeSheet from '../../components/ComposeSheet';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
import PostCard from '../../components/PostCard';
import PostDetailModal from '../../components/PostDetailModal';
import { apiClient } from '../../lib/api';
import type { PostSubmission } from '../../lib/api/endpoints/feed';
import { gateContentAction, logContentAction } from '../../lib/contentAccountability';
import type { Post, ReactionType } from '../../lib/feedTypes';
import { ROLE_CONFIG, type UserRole } from '../../lib/moderationTypes';
import { fetchPostsByAuthor, fetchUserProfile, type UserProfileLookup } from '../../lib/supabaseDataService';
import { useTheme } from '../../lib/theme';
import { useAuthStore } from '../../stores/auth';
import { useDMStore } from '../../stores/dmStore';
import { mapSupabasePost, useFeedStore } from '../../stores/feed';

type PageItem = { post: Post } | { submission: PostSubmission };

export default function UserProfileScreen() {
  const { userId, compose } = useLocalSearchParams<{ userId: string; compose?: string }>();
  const viewerId = useAuthStore((state) => state.user?.id);
  return (
    <PersonalPage
      key={JSON.stringify([userId, viewerId])}
      userId={userId}
      viewerId={viewerId}
      openComposer={compose === '1'}
    />
  );
}

function PersonalPage({
  userId,
  viewerId,
  openComposer,
}: {
  userId: string;
  viewerId?: string;
  openComposer: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isSelf = Boolean(viewerId && viewerId === userId);
  const isFollowing = useFeedStore((state) => state.isFollowing(userId));
  const [profile, setProfile] = useState<Extract<UserProfileLookup, { status: 'found' }>['profile'] | null>(null);
  const [profileStatus, setProfileStatus] = useState<UserProfileLookup['status']>('unavailable');
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsFailed, setPostsFailed] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followingLoaded, setFollowingLoaded] = useState(false);
  const [composeVisible, setComposeVisible] = useState(isSelf && openComposer);
  const [editingPost, setEditingPost] = useState<Post>();
  const [detail, setDetail] = useState<{ post: Post; reply: boolean } | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'submissions'>('posts');
  const [submissions, setSubmissions] = useState<PostSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsFailed, setSubmissionsFailed] = useState(false);
  const [nextSubmissionOffset, setNextSubmissionOffset] = useState<number | null>(null);
  const requestId = useRef(0);
  const submissionsRequestId = useRef(0);
  const reactionWrites = useRef(new Set<string>());

  const loadPage = useCallback(async (offset = 0, replacePage = false) => {
    const request = ++requestId.current;
    setLoading(offset === 0);
    setLoadingMore(offset > 0);
    setPostsFailed(false);

    const [profileResult, timeline] = await Promise.all([
      offset === 0 ? fetchUserProfile(userId) : Promise.resolve(null),
      fetchPostsByAuthor(userId, CONTENT_PAGE_SIZE + 1, offset, viewerId),
    ]);
    if (request !== requestId.current) return;

    if (profileResult) {
      setProfileStatus(profileResult.status);
      if (profileResult.status === 'found') setProfile(profileResult.profile);
      if (profileResult.status === 'not_found') setProfile(null);
    }
    if (timeline.status === 'loaded') {
      const page = timeline.posts.slice(0, CONTENT_PAGE_SIZE).map(mapSupabasePost);
      setPosts((current) => {
        const retained = replacePage
          ? [...current.slice(0, offset), ...page, ...current.slice(offset + CONTENT_PAGE_SIZE)]
          : offset === 0 ? page : [...current, ...page];
        return [...new Map(retained.map((post) => [post.id, post])).values()];
      });
      if (!replacePage) {
        setNextOffset(timeline.posts.length > CONTENT_PAGE_SIZE ? offset + CONTENT_PAGE_SIZE : null);
      }
      setDetail((current) => {
        const updated = current && page.find((post) => post.id === current.post.id);
        return updated ? { ...current, post: updated } : current;
      });
    } else {
      setPostsFailed(true);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [userId, viewerId]);

  const loadSubmissions = useCallback(async (offset = 0) => {
    if (!isSelf) return;
    const request = ++submissionsRequestId.current;
    setSubmissionsLoading(true);
    setSubmissionsFailed(false);
    try {
      const page = await apiClient.feed.listMySubmissions(offset);
      if (request !== submissionsRequestId.current || useAuthStore.getState().user?.id !== viewerId) return;
      setSubmissions((current) => offset === 0
        ? page.submissions
        : [...new Map([...current, ...page.submissions].map((submission) => [submission.id, submission])).values()]);
      setNextSubmissionOffset(page.nextOffset);
    } catch {
      if (request === submissionsRequestId.current) setSubmissionsFailed(true);
    } finally {
      if (request === submissionsRequestId.current) setSubmissionsLoading(false);
    }
  }, [isSelf, viewerId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadPage();
    void loadSubmissions();
    if (viewerId && !isSelf) {
      void useFeedStore.getState().hydrateFollowing().then((loaded) => {
        if (active) setFollowingLoaded(loaded);
      });
    }
    return () => {
      active = false;
      requestId.current++;
      submissionsRequestId.current++;
    };
  }, [loadPage, loadSubmissions, viewerId, isSelf]));

  const refreshPost = useCallback((change: 'updated' | 'deleted') => {
    if (!detail || change === 'deleted') {
      if (detail) setPosts((current) => current.filter((post) => post.id !== detail.post.id));
      void loadPage();
      return;
    }
    const offset = Math.floor(Math.max(0, posts.findIndex((post) => post.id === detail.post.id)) / CONTENT_PAGE_SIZE) * CONTENT_PAGE_SIZE;
    void loadPage(offset, true);
  }, [detail, loadPage, posts]);

  const changeReaction = async (post: Post, reaction: ReactionType) => {
    if (reactionWrites.current.has(post.id) || !gateContentAction('react_post')) return;
    reactionWrites.current.add(post.id);
    try {
      const saved = await useFeedStore.getState().toggleReaction(post.id, reaction, post);
      if (!saved) {
        Alert.alert(t('feed.reactionFailed', { defaultValue: 'Could not update your reaction. Please try again.' }));
        return;
      }
      void logContentAction('react_post', { type: 'post', id: post.id, body: reaction, screenName: 'personal_page' });
      setPosts((current) => current.map((item) => item.id === post.id
        ? {
            ...item,
            userReaction: post.userReaction === reaction ? undefined : reaction,
            reactionCount: Math.max(0, item.reactionCount + (post.userReaction === reaction ? -1 : post.userReaction ? 0 : 1)),
          }
        : item));
    } finally {
      reactionWrites.current.delete(post.id);
    }
  };

  const openEditor = (post: Post) => {
    setDetail(null);
    setEditingPost(post);
    setComposeVisible(true);
  };

  const confirmDelete = (post: Post) => {
    if (!gateContentAction('delete_post')) return;
    Alert.alert(t('postCard.deleteConfirm'), t('postCard.deleteConfirmBody'), [
      { text: t('postCard.cancel'), style: 'cancel' },
      {
        text: t('postCard.delete'),
        style: 'destructive',
        onPress: async () => {
          if (!(await useFeedStore.getState().deletePost(post.id, post))) {
            Alert.alert(t('feed.deleteFailed', { defaultValue: 'Could not delete this post. Please try again.' }));
            return;
          }
          void logContentAction('delete_post', { type: 'post', id: post.id, screenName: 'personal_page' });
          setPosts((current) => current.filter((item) => item.id !== post.id));
          void loadPage();
        },
      },
    ]);
  };

  const changeFollow = async () => {
    if (!viewerId) {
      router.push('/auth/sign-in');
      return;
    }
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const store = useFeedStore.getState();
      if (!followingLoaded && !(await store.hydrateFollowing())) {
        Alert.alert(t('profile.followUpdateFailed', { defaultValue: 'Could not update follow status' }));
        return;
      }
      setFollowingLoaded(true);
      const updated = store.isFollowing(userId) ? await store.unfollowUser(userId) : await store.followUser(userId);
      if (!updated) {
        Alert.alert(t('profile.followUpdateFailed', { defaultValue: 'Could not update follow status' }));
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const name = typeof profile?.display_name === 'string' ? profile.display_name : t('profile.title', { defaultValue: 'Profile' });
  const avatarUrl = typeof profile?.avatar_url === 'string' ? profile.avatar_url : undefined;
  const bio = typeof profile?.bio === 'string' ? profile.bio : null;
  const role = (profile?.role as UserRole) || 'citizen';
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.citizen;
  const verified = profile?.verification_status === 'verified';
  const showSubmissions = isSelf && activeTab === 'submissions';
  const items: PageItem[] = showSubmissions
    ? submissions.map((submission) => ({ submission }))
    : posts.map((post) => ({ post }));

  const openConversation = async () => {
    if (!viewerId) {
      router.push('/auth/sign-in');
      return;
    }
    const id = await useDMStore.getState().startConversationWithUser(viewerId, {
      id: userId,
      displayName: name,
      role,
      isVerified: verified,
    });
    if (id) router.push(`/messages/${id}`);
    else Alert.alert(t('profile.messageUnavailable', { defaultValue: 'Could not open a conversation. Please try again.' }));
  };

  const renderAction = (
    label: string,
    icon: React.ComponentProps<typeof Ionicons>['name'],
    onPress: () => void,
    primary = false,
    disabled = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, {
        backgroundColor: primary ? colors.primary : colors.surface,
        borderColor: primary ? colors.primary : colors.border,
        opacity: disabled ? 0.55 : 1,
      }]}
    >
      <Ionicons name={icon} size={18} color={primary ? '#FFFFFF' : colors.primary} />
      <Text style={[styles.actionText, { color: primary ? '#FFFFFF' : colors.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 6, borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {isSelf ? t('pages.tabMyPage') : name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('discovery.screenHelp')}
          onPress={() => setHelpVisible(true)}
          style={styles.iconButton}
        >
          <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {!profile ? (
        <View style={styles.status}>
          {loading ? <ActivityIndicator color={colors.primary} /> : (
            <>
              <Ionicons name={profileStatus === 'not_found' ? 'person-outline' : 'cloud-offline-outline'} size={36} color={colors.textMuted} />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {profileStatus === 'not_found'
                  ? t('profile.notFound', { defaultValue: 'This profile could not be found.' })
                  : t('profile.unavailable', { defaultValue: 'Could not load the profile. Check your connection and try again.' })}
              </Text>
              {isSelf && renderAction(t('profile.editProfile'), 'create-outline', () => router.push('/edit-profile'))}
              {profileStatus !== 'not_found' && renderAction(t('common.retry'), 'refresh', () => void loadPage())}
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => 'post' in item ? item.post.id : item.submission.id}
          contentContainerStyle={[styles.timeline, { paddingBottom: insets.bottom + 24 }]}
          refreshing={showSubmissions ? submissionsLoading : loading}
          onRefresh={() => { void loadPage(); void loadSubmissions(); }}
          ListHeaderComponent={(
            <>
              <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.heroAccent, { backgroundColor: colors.primary }]} />
                <View style={styles.heroBody}>
                  <View style={styles.identityRow}>
                    {avatarUrl
                      ? <Image source={avatarUrl} style={[styles.avatar, { backgroundColor: colors.primaryLight }]} contentFit="cover" />
                      : (
                        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                          <Text style={[styles.avatarLetter, { color: colors.primary }]}>{name.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                    <View style={styles.identity}>
                      <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
                      {verified && (
                        <View style={styles.verifiedRow}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                          <Text style={{ color: colors.textSecondary }}>{t('profile.verified', { defaultValue: 'Verified' })}</Text>
                        </View>
                      )}
                      {role !== 'citizen' && <Text style={{ color: colors.textSecondary }}>{roleConfig.label}</Text>}
                    </View>
                  </View>
                  {!!bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{bio}</Text>}
                  {typeof profile.constituency_id === 'string' && (
                    <Text style={{ color: colors.textSecondary }}>{profile.constituency_id}</Text>
                  )}
                  {profileStatus === 'unavailable' && (
                    <Text style={{ color: colors.textMuted }}>{t('profile.cachedProfile', { defaultValue: 'Could not refresh the profile.' })}</Text>
                  )}
                  <View style={styles.actions}>
                    {isSelf ? (
                      <>
                        {renderAction(t('profile.createPost', { defaultValue: 'Create post' }), 'add-circle-outline', () => setComposeVisible(true), true)}
                        {renderAction(t('profile.editProfile'), 'create-outline', () => router.push('/edit-profile'))}
                      </>
                    ) : (
                      <>
                        {renderAction(
                          isFollowing ? t('common.following') : t('common.follow'),
                          isFollowing ? 'checkmark' : 'person-add-outline',
                          () => void changeFollow(),
                          !isFollowing,
                          followLoading,
                        )}
                        {renderAction(t('profile.message', { defaultValue: 'Message' }), 'chatbubble-outline', () => void openConversation())}
                      </>
                    )}
                    {renderAction(t('common.share', { defaultValue: 'Share' }), 'share-social-outline', () => {
                      void Share.share({ message: `${name}\n${createURL(`/user/${encodeURIComponent(userId)}`)}` }).catch(() => {});
                    })}
                  </View>
                </View>
              </View>
              {isSelf ? (
                <View style={[styles.actions, styles.timelineTabs]}>
                  {(['posts', 'submissions'] as const).map((tab) => (
                    <Pressable
                      key={tab}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: activeTab === tab }}
                      onPress={() => { setActiveTab(tab); if (tab === 'submissions') void loadSubmissions(); }}
                      style={[styles.action, { borderColor: activeTab === tab ? colors.primary : colors.border, backgroundColor: activeTab === tab ? colors.primaryLight : colors.surface }]}
                    >
                      <Text style={[styles.actionText, { color: activeTab === tab ? colors.primary : colors.text }]}>
                        {t(tab === 'posts' ? 'profile.posts' : 'profile.submissions')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.posts')}</Text>}
            </>
          )}
          renderItem={({ item }) => 'submission' in item ? (
            <View style={[styles.submission, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.actionText, { color: item.submission.reviewStatus === 'rejected' ? colors.danger : colors.primary }]}>
                {t(item.submission.reviewStatus === 'rejected' ? 'profile.submissionRejected' : 'profile.submissionPending')}
              </Text>
              <Text style={{ color: colors.text, lineHeight: 21 }}>{item.submission.content}</Text>
            </View>
          ) : (
            <PostCard
              post={item.post}
              isOwner={isSelf}
              onPress={() => setDetail({ post: item.post, reply: false })}
              onReact={(reaction) => void changeReaction(item.post, reaction)}
              onReply={() => setDetail({ post: item.post, reply: true })}
              onShare={() => void Share.share({ message: item.post.content }).catch(() => {})}
              onEdit={isSelf ? () => openEditor(item.post) : undefined}
              onDelete={isSelf ? () => confirmDelete(item.post) : undefined}
            />
          )}
          ListEmptyComponent={!(showSubmissions ? submissionsLoading || submissionsFailed : loading || postsFailed) ? (
            <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="chatbox-ellipses-outline" size={28} color={colors.textMuted} />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {t(showSubmissions ? 'profile.noSubmissions' : 'profile.noPublicPosts')}
              </Text>
            </View>
          ) : null}
          ListFooterComponent={(
            showSubmissions ? (
              <View style={styles.footer}>
                {submissionsLoading ? <ActivityIndicator color={colors.primary} /> : null}
                {submissionsFailed && renderAction(t('profile.submissionsUnavailable'), 'refresh', () => void loadSubmissions())}
                {nextSubmissionOffset !== null && !submissionsLoading && !submissionsFailed && (
                  renderAction(t('profile.olderPosts'), 'chevron-down', () => void loadSubmissions(nextSubmissionOffset))
                )}
              </View>
            ) : <>
              {postsFailed && (
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                  {t('profile.postsUnavailable', { defaultValue: 'Could not load the latest posts.' })}
                </Text>
              )}
              {loadingMore ? <ActivityIndicator color={colors.primary} /> : (nextOffset !== null || postsFailed) && !loading ? (
                <View style={styles.footer}>
                  {renderAction(
                    postsFailed ? t('common.retry') : t('profile.olderPosts', { defaultValue: 'Load older posts' }),
                    postsFailed ? 'refresh' : 'chevron-down',
                    () => void loadPage(postsFailed ? 0 : nextOffset ?? 0),
                  )}
                </View>
              ) : null}
            </>
          )}
        />
      )}
      {isSelf && profile && composeVisible && (
        <ComposeSheet
          visible
          onClose={() => { setComposeVisible(false); setEditingPost(undefined); }}
          editPost={editingPost}
          onSubmit={async (post) => {
            const result = await useFeedStore.getState().addPost(post);
            if (result === 'synced' || result === 'pending' || result === 'rejected') {
              void loadPage();
              void loadSubmissions();
            }
            return result;
          }}
          onEditSubmit={async (postId, content) => {
            const result = await useFeedStore.getState().editPost(postId, content, editingPost);
            if (result === 'pending') setPosts((current) => current.filter((post) => post.id !== postId));
            if (result) { void loadPage(); void loadSubmissions(); }
            return result;
          }}
        />
      )}
      {detail && (
        <PostDetailModal
          visible
          post={detail.post}
          autoFocusReply={detail.reply}
          onClose={() => setDetail(null)}
          onEditPost={isSelf ? openEditor : undefined}
          onPostChanged={refreshPost}
        />
      )}
      <DiscoveryHubSheet visible={helpVisible} onClose={() => setHelpVisible(false)} sourceScreen="user-profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10 },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 17 },
  iconButton: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  timeline: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  hero: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  heroAccent: { height: 5 },
  heroBody: { padding: 18, gap: 16 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  identity: { flex: 1, gap: 4 },
  name: { fontSize: 22, fontWeight: '800' },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 27, fontWeight: '800' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  bio: { fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, maxWidth: '100%' },
  actionText: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 20 },
  timelineTabs: { marginTop: 16 },
  submission: { padding: 16, borderWidth: 1, borderRadius: 14, gap: 8, marginBottom: 8 },
  status: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  statusText: { textAlign: 'center' },
  empty: { alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 20 },
  footer: { alignItems: 'center', marginVertical: 12 },
});
