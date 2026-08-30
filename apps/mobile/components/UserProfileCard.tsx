import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VerificationBadge from './VerificationBadge';
import { ROLE_CONFIG, type UserRole } from '../lib/moderationTypes';

interface UserProfileCardProps {
  displayName: string;
  role: UserRole;
  isVerified: boolean;
  avatarUrl?: string | null;
  bio?: string;
  reputation?: number;
  constituencyName?: string | null;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  compact?: boolean;
  onPress?: () => void;
  showStats?: boolean;
}

export default function UserProfileCard({
  displayName,
  role,
  isVerified,
  avatarUrl,
  bio,
  reputation,
  constituencyName,
  postsCount,
  followersCount,
  followingCount,
  compact = false,
  onPress,
  showStats = true,
}: UserProfileCardProps) {
  const { t } = useTranslation();
  const config = ROLE_CONFIG[role];

  if (compact) {
    return (
      <Pressable style={styles.compactContainer} onPress={onPress} disabled={!onPress}>
        <View style={[styles.compactAvatar, { borderColor: config.color + '60' }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.compactAvatarImage} />
          ) : (
            <Ionicons name="person" size={16} color={config.color} />
          )}
        </View>
        <Text style={styles.compactName} numberOfLines={1}>{displayName}</Text>
        <VerificationBadge role={role} isVerified={isVerified} compact />
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.container} onPress={onPress} disabled={!onPress}>
      {/* Avatar + Name */}
      <View style={styles.headerRow}>
        <View style={[styles.avatar, { borderColor: config.color + '60' }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={28} color={config.color} />
          )}
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            <VerificationBadge role={role} isVerified={isVerified} compact />
          </View>
          {constituencyName && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color="#6B7280" />
              <Text style={styles.locationText}>{constituencyName}</Text>
            </View>
          )}
          {bio ? <Text style={styles.bio} numberOfLines={2}>{bio}</Text> : null}
        </View>
      </View>

      {/* Stats */}
      {showStats && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{postsCount ?? 0}</Text>
            <Text style={styles.statLabel}>{t('userProfileCard.posts')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{followersCount ?? 0}</Text>
            <Text style={styles.statLabel}>{t('userProfileCard.followers')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{followingCount ?? 0}</Text>
            <Text style={styles.statLabel}>{t('userProfileCard.following')}</Text>
          </View>
          {reputation !== undefined && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>{reputation}</Text>
                <Text style={styles.statLabel}>{t('userProfileCard.rep')}</Text>
              </View>
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8DED1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#241814',
    flexShrink: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#988275',
  },
  bio: {
    fontSize: 13,
    color: '#6D5549',
    marginTop: 6,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: '#E8DED1',
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#241814',
  },
  statLabel: {
    fontSize: 11,
    color: '#988275',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E8DED1',
  },
  // Compact mode
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8DED1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  compactAvatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  compactName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#241814',
    flexShrink: 1,
  },
});
