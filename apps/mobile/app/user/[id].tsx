import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme';
import { useAuthStore } from '../../stores/auth';
import { useFeedStore } from '../../stores/feed';
import { useDMStore } from '../../stores/dmStore';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import UserProfileCard from '../../components/UserProfileCard';

export default function UserPublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentAuthUser = useAuthStore((s) => s.user);

  const isFollowing = useFeedStore((s) => s.isFollowing);
  const followUser = useFeedStore((s) => s.followUser);
  const unfollowUser = useFeedStore((s) => s.unfollowUser);
  const startConversationWithUser = useDMStore((s) => s.startConversationWithUser);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);

  const targetUserId = String(id || '');
  const isSelf = currentAuthUser?.id === targetUserId;
  const following = isFollowing(targetUserId);

  const loadProfile = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);

    if (!isSupabaseConfigured) {
      setProfile({
        user_id: targetUserId,
        display_name: 'Kshetra Citizen',
        role: 'citizen',
        verification_status: 'unverified',
        bio: 'Citizen profile on Kshetra network',
        post_count: 0,
        reputation_score: 10,
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
      } else {
        setProfile({
          user_id: targetUserId,
          display_name: 'Kshetra Member',
          role: 'citizen',
          verification_status: 'unverified',
        });
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleMessagePress = async () => {
    if (!currentAuthUser?.id) {
      Alert.alert(t('auth.loginRequired', { defaultValue: 'Login Required' }), 'Please sign in to send direct messages.');
      return;
    }

    const convId = await startConversationWithUser(
      currentAuthUser.id,
      {
        id: targetUserId,
        displayName: profile?.display_name || 'Member',
        role: profile?.role,
        isVerified: profile?.verification_status === 'verified',
      },
    );

    if (convId) {
      router.push(`/messages/${convId}` as any);
    } else {
      router.push('/messages' as any);
    }
  };

  const handleFollowToggle = async () => {
    if (following) {
      await unfollowUser(targetUserId);
    } else {
      await followUser(targetUserId);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {profile?.display_name || 'Profile'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <UserProfileCard
          displayName={profile?.display_name || 'Kshetra Citizen'}
          role={profile?.role || 'citizen'}
          isVerified={profile?.verification_status === 'verified'}
          bio={profile?.bio}
          avatarUrl={profile?.avatar_url}
          reputation={profile?.reputation_score}
          postsCount={profile?.post_count}
          followersCount={profile?.followers_count}
          followingCount={profile?.following_count}
        />

        {/* Action Buttons */}
        {!isSelf && (
          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.actionBtn,
                styles.followBtn,
                following
                  ? { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }
                  : { backgroundColor: colors.primary },
              ]}
              onPress={handleFollowToggle}
            >
              <Ionicons
                name={following ? 'checkmark' : 'person-add'}
                size={16}
                color={following ? colors.text : '#FFFFFF'}
              />
              <Text style={[styles.actionBtnText, { color: following ? colors.text : '#FFFFFF' }]}>
                {following ? t('common.following', { defaultValue: 'Following' }) : t('common.follow', { defaultValue: 'Follow' })}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.messageBtn, { backgroundColor: colors.primary }]}
              onPress={handleMessagePress}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color="#FFFFFF" />
              <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                {t('common.message', { defaultValue: 'Message' })}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 16, gap: 16 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  followBtn: {},
  messageBtn: {},
  actionBtnText: { fontSize: 14, fontWeight: '700' },
});
