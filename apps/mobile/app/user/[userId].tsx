import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { useFeedStore } from '../../stores/feed';
import { useAuthStore } from '../../stores/auth';
import { useDMStore } from '../../stores/dmStore';
import { fetchUserProfile, fetchPostsByAuthor } from '../../lib/supabaseDataService';
import { ROLE_CONFIG, type UserRole } from '../../lib/moderationTypes';
import PostCard from '../../components/PostCard';
import type { Post } from '../../lib/feedTypes';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
import i18n from '../../i18n';
import { IS_LIVE_ENVIRONMENT } from '../../lib/environment';

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  const currentUserId = useAuthStore((s) => s.user?.id);
  const isFollowing = useFeedStore((s) => s.isFollowing(userId ?? ''));
  const followUser = useFeedStore((s) => s.followUser);
  const unfollowUser = useFeedStore((s) => s.unfollowUser);
  const localPosts = useFeedStore((s) => s.posts);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [profileAvailability, setProfileAvailability] = useState<'available' | 'cached' | 'not_found' | 'unavailable'>('unavailable');
  const [postsAvailability, setPostsAvailability] = useState<'loaded' | 'cached' | 'unavailable'>('loaded');
  const [followLoading, setFollowLoading] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  const isSelf = currentUserId && currentUserId === userId;

  const loadData = async () => {
    if (!userId) {
      setProfileAvailability('not_found');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      // 1. Distinguish a real profile from an empty result and a failed lookup.
      const profileLookup = await fetchUserProfile(userId);
      if (profileLookup.status === 'found') {
        setUserProfile(profileLookup.profile);
        setProfileAvailability('available');
      } else if (profileLookup.status === 'not_found' && !IS_LIVE_ENVIRONMENT) {
        const matchPost = localPosts.find((p) => p.author.id === userId);
        if (matchPost) {
          setUserProfile({
            user_id: userId,
            display_name: matchPost.author.displayName,
            role: 'citizen',
            verification_status: matchPost.author.isVerified ? 'verified' : 'unverified',
            constituency_id: matchPost.constituencyId,
          });
          setProfileAvailability('available');
        } else {
          setUserProfile(null);
          setProfileAvailability('not_found');
        }
      } else if (profileLookup.status === 'not_found') {
        setUserProfile(null);
        setProfileAvailability('not_found');
      } else {
        setProfileAvailability(userProfile?.user_id === userId ? 'cached' : 'unavailable');
      }

      // 2. Fetch posts by this author
      const postsLookup = await fetchPostsByAuthor(userId);
      if (postsLookup.status === 'loaded') {
        const transformed: Post[] = postsLookup.posts.map((p: any) => ({
          id: p.id,
          author: {
            id: p.author_id,
            displayName: p.author_display_name || 'Citizen',
            isVerified: p.author_is_verified ?? false,
            avatarUrl: p.author_avatar_url,
          },
          stateCode: p.state_code,
          constituencyId: p.constituency_id,
          constituencyName: p.constituency_name,
          content: p.content,
          type: p.type ?? 'discussion',
          replyCount: p.reply_count ?? 0,
          reactionCount: p.reaction_count ?? 0,
          isPinned: p.is_pinned ?? false,
          isDeleted: p.is_deleted ?? false,
          language: p.language ?? 'en',
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          hashtags: p.hashtags ?? [],
        }));
        setUserPosts(transformed);
        setPostsAvailability('loaded');
      } else {
        // A matching feed-cache entry is useful offline data, but it is not a
        // successful refresh and must not be described as the complete post list.
        const matched = localPosts.filter((p) => p.author.id === userId);
        setUserPosts(matched);
        setPostsAvailability(matched.length > 0 ? 'cached' : 'unavailable');
      }
    } catch (err) {
      console.warn('Error loading user profile:', err);
      setProfileAvailability(userProfile?.user_id === userId ? 'cached' : 'unavailable');
      const matched = localPosts.filter((p) => p.author.id === userId);
      setUserPosts(matched);
      setPostsAvailability(matched.length > 0 ? 'cached' : 'unavailable');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setUserProfile(null);
    setUserPosts([]);
    setProfileAvailability('unavailable');
    setPostsAvailability('loaded');
    void loadData();
  }, [userId]);

  const handleToggleFollow = async () => {
    if (!userId || isSelf || followLoading) return;
    setFollowLoading(true);
    try {
      const updated = isFollowing
        ? await unfollowUser(userId)
        : await followUser(userId);
      if (!updated) {
        Alert.alert(
          i18n.t('profile.followUpdateFailed', { defaultValue: 'Could not update follow status' }),
          useFeedStore.getState().lastError || i18n.t('common.tryAgain', { defaultValue: 'Please try again.' }),
        );
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const role: UserRole = (userProfile?.role as UserRole) || 'citizen';
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.citizen;
  const isVerified = userProfile?.verification_status === 'verified' || userProfile?.is_verified;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {userProfile?.display_name || 'Profile'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={i18n.t('discovery.screenHelp')}
            onPress={() => setHelpVisible(true)}
            hitSlop={10}
          >
            <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => {
              Share.share({
                message: `Check out ${userProfile?.display_name || 'this profile'} on Poligram!`,
              });
            }}
            hitSlop={10}
          >
            <Ionicons name="share-social-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.textMuted }}>Loading profile...</Text>
        </View>
      ) : profileAvailability === 'not_found' ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="person-remove-outline" size={44} color={colors.textMuted} />
          <Text style={{ marginTop: 12, color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
            {i18n.t('profile.notFound', { defaultValue: 'This profile could not be found.' })}
          </Text>
        </View>
      ) : profileAvailability === 'unavailable' ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={{ marginTop: 12, color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>
            {i18n.t('profile.unavailable', { defaultValue: 'This profile could not be loaded. Check your connection and try again.' })}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => { setRefreshing(true); void loadData(); }}
            style={[styles.followBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
          >
            <Text style={[styles.followBtnText, { color: '#FFFFFF' }]}>{i18n.t('common.retry', { defaultValue: 'Retry' })}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        >
          {profileAvailability === 'cached' && (
            <Text style={{ color: colors.textMuted, fontSize: 12, paddingHorizontal: 16, paddingTop: 12 }}>
              {i18n.t('profile.cachedProfile', { defaultValue: 'Showing saved profile details. The latest profile data could not be refreshed.' })}
            </Text>
          )}

          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {(userProfile?.display_name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                    {userProfile?.display_name || 'Anonymous Citizen'}
                  </Text>
                  {isVerified && (
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  )}
                </View>

                {/* Role Pill */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <View style={[styles.roleBadge, { backgroundColor: roleConfig.color + '20' }]}>
                    <Ionicons name={roleConfig.icon as any} size={12} color={roleConfig.color} />
                    <Text style={[styles.roleText, { color: roleConfig.color }]}>
                      {roleConfig.label}
                    </Text>
                  </View>

                  {userProfile?.constituency_id && (
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                      · {userProfile.constituency_id}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {userProfile?.bio && (
              <Text style={[styles.bioText, { color: colors.text }]}>
                {userProfile.bio}
              </Text>
            )}

            {/* Action Buttons: Follow + Direct Message */}
            {!isSelf && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Pressable
                  style={[
                    styles.followBtn,
                    { flex: 1, marginTop: 0 },
                    isFollowing ? styles.followingBtn : { backgroundColor: colors.primary },
                  ]}
                  onPress={handleToggleFollow}
                  disabled={followLoading}
                >
                  <Ionicons
                    name={isFollowing ? 'checkmark' : 'person-add'}
                    size={16}
                    color={isFollowing ? colors.text : '#fff'}
                  />
                  <Text
                    style={[
                      styles.followBtnText,
                      { color: isFollowing ? colors.text : '#fff' },
                    ]}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.followBtn,
                    { flex: 1, marginTop: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
                  ]}
                  onPress={async () => {
                    const convId = await useDMStore.getState().startConversationWithUser(
                      currentUserId || 'anon',
                      {
                        id: userId ?? '',
                        displayName: userProfile?.display_name || 'Poligram Citizen',
                        role: userProfile?.role,
                        isVerified,
                      },
                    );
                    if (convId) {
                      router.push(`/messages/${convId}` as any);
                    } else {
                      router.push('/messages' as any);
                    }
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                  <Text style={[styles.followBtnText, { color: colors.primary }]}>
                    Message
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Posts Section */}
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Posts ({userPosts.length})
            </Text>

            {postsAvailability === 'cached' && (
              <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>
                {i18n.t('profile.cachedPosts', { defaultValue: 'Showing saved posts. The full post list could not be refreshed.' })}
              </Text>
            )}

            {postsAvailability === 'unavailable' ? (
              <View style={[styles.emptyContainer, { borderColor: colors.border }]}>
                <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
                <Text style={{ marginTop: 8, color: colors.textMuted, textAlign: 'center' }}>
                  {i18n.t('profile.postsUnavailable', { defaultValue: 'Posts could not be loaded. Their absence has not been confirmed.' })}
                </Text>
              </View>
            ) : userPosts.length === 0 ? (
              <View style={[styles.emptyContainer, { borderColor: colors.border }]}>
                <Ionicons name="chatbox-outline" size={40} color={colors.textMuted} />
                <Text style={{ marginTop: 8, color: colors.textMuted }}>No public posts yet.</Text>
              </View>
            ) : (
              userPosts.map((post) => (
                <View key={post.id} style={{ marginBottom: 12 }}>
                  <PostCard post={post} />
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="user-profile"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', maxWidth: '75%' },
  profileCard: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bioText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  followingBtn: {
    backgroundColor: '#E5E7EB',
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
});
