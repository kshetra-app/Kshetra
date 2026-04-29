import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Linking,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePreferencesStore } from '../../stores/preferences';
import { useFavoritesStore } from '../../stores/favorites';
import { useRecentsStore } from '../../stores/recents';
import { useAuthStore } from '../../stores/auth';
import { useNotificationsStore } from '../../stores/notifications';
import { useUserProfileStore } from '../../stores/userProfile';
import { getPartyColor } from '@/lib/constants';
import UserProfileCard from '../../components/UserProfileCard';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  color?: string;
}

function SettingRow({ icon, label, value, onPress, color = '#4F8EF7' }: SettingRowProps) {
  return (
    <Pressable style={styles.settingRow} onPress={onPress} disabled={!onPress}>
      <View style={[styles.settingIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color="#374151" />
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const prefs = usePreferencesStore();
  const favoriteCount = useFavoritesStore((s) => s.favoriteIds.length);
  const recents = useRecentsStore((s) => s.recents);
  const clearRecents = useRecentsStore((s) => s.clearRecents);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const loading = useAuthStore((s) => s.loading);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const notifEnabled = useNotificationsStore((s) => s.enabled);
  const toggleNotif = useNotificationsStore((s) => s.toggleEnabled);
  const userProfile = useUserProfileStore((s) => s.profile);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.bellButton}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color="#9CA3AF" />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
        <View style={styles.avatar}>
          <Ionicons
            name={user ? 'person-circle' : 'person'}
            size={32}
            color={user ? '#10B981' : '#4F8EF7'}
          />
        </View>
        {user ? (
          <>
            <Text style={styles.headerTitle}>{user.email}</Text>
            <Text style={styles.headerSubtitle}>Signed in</Text>
            <Pressable
              style={[styles.signInButton, styles.signOutButton]}
              onPress={signOut}
              disabled={loading}
            >
              <Text style={styles.signInText}>
                {loading ? 'Signing out...' : 'Sign Out'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.headerTitle}>Guest User</Text>
            <Text style={styles.headerSubtitle}>
              Sign in to sync favourites across devices
            </Text>
            <Pressable
              style={styles.signInButton}
              onPress={() => router.push('/auth/sign-in')}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#4F8EF720' }]}>
              <Ionicons name="notifications" size={18} color="#4F8EF7" />
            </View>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Switch
              value={notifEnabled}
              onValueChange={toggleNotif}
              trackColor={{ false: '#374151', true: '#4F8EF760' }}
              thumbColor={notifEnabled ? '#4F8EF7' : '#6B7280'}
            />
          </View>
          <SettingRow
            icon="mail"
            label="Notification Center"
            value={unreadCount > 0 ? `${unreadCount} unread` : 'None'}
            onPress={() => router.push('/notifications')}
            color="#F59E0B"
          />
          <SettingRow
            icon="settings"
            label="Notification Settings"
            onPress={() => router.push('/notification-settings')}
            color="#8B5CF6"
          />
        </View>
      </View>

      {/* User Profile Card */}
      {userProfile && (
        <View style={styles.section}>
          <UserProfileCard
            displayName={userProfile.displayName}
            role={userProfile.role}
            isVerified={userProfile.isVerified}
            avatarUrl={userProfile.avatarUrl}
            bio={userProfile.bio}
            reputation={userProfile.reputation}
            constituencyName={userProfile.homeConstituencyName}
            postsCount={userProfile.postsCount}
            followersCount={userProfile.followersCount}
            followingCount={userProfile.followingCount}
          />
          <Pressable
            style={styles.editProfileButton}
            onPress={() => router.push('/edit-profile')}
          >
            <Ionicons name="create-outline" size={16} color="#4F8EF7" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </Pressable>
        </View>
      )}

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.card}>
          <SettingRow icon="information-circle" label="Version" value="0.1.0" />
          <SettingRow icon="map" label="State" value="Telangana" />
          <SettingRow icon="people" label="Constituencies" value="119" />
          <SettingRow icon="server" label="Data" value="2023 Elections" />
        </View>
      </View>

      {/* Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.card}>
          <SettingRow
            icon="heart"
            label="Favourites"
            value={`${favoriteCount} saved`}
            color="#EF4444"
          />
          <SettingRow
            icon="time"
            label="Recently Viewed"
            value={`${recents.length} visited`}
            color="#F59E0B"
          />
        </View>
      </View>

      {/* Recently Viewed */}
      {recents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <Pressable onPress={clearRecents} hitSlop={8}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>
          <View style={styles.card}>
            {recents.slice(0, 5).map((r) => (
              <Pressable
                key={r.acNo}
                style={styles.recentRow}
                onPress={() => router.push(`/constituency/${r.acNo}`)}
              >
                <View
                  style={[
                    styles.recentDot,
                    { backgroundColor: getPartyColor(r.party) },
                  ]}
                />
                <View style={styles.recentInfo}>
                  <Text style={styles.recentName}>{r.name}</Text>
                  <Text style={styles.recentMeta}>
                    #{r.acNo} · {r.district}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#374151" />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="notifications" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Switch
              value={prefs.notificationsEnabled}
              onValueChange={prefs.setNotificationsEnabled}
              trackColor={{ false: '#374151', true: '#4F8EF7' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="phone-portrait" size={18} color="#8B5CF6" />
            </View>
            <Text style={styles.settingLabel}>Haptic Feedback</Text>
            <Switch
              value={prefs.hapticFeedback}
              onValueChange={prefs.setHapticFeedback}
              trackColor={{ false: '#374151', true: '#4F8EF7' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="moon" size={18} color="#8B5CF6" />
            </View>
            <Text style={styles.settingLabel}>Theme</Text>
            <View style={styles.themePicker}>
              {(['dark', 'light', 'system'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  style={[
                    styles.themeOption,
                    prefs.theme === mode && styles.themeOptionActive,
                  ]}
                  onPress={() => prefs.setTheme(mode)}
                >
                  <Ionicons
                    name={mode === 'dark' ? 'moon' : mode === 'light' ? 'sunny' : 'phone-portrait'}
                    size={14}
                    color={prefs.theme === mode ? '#4F8EF7' : '#6B7280'}
                  />
                </Pressable>
              ))}
            </View>
          </View>
          <SettingRow
            icon="language"
            label="Language"
            value={prefs.language === 'en' ? 'English' : prefs.language === 'hi' ? 'Hindi' : 'Telugu'}
            color="#10B981"
          />
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <SettingRow
            icon="shield-checkmark"
            label="Privacy Policy"
            onPress={() => {}}
            color="#10B981"
          />
          <SettingRow
            icon="document-text"
            label="Terms of Service"
            onPress={() => {}}
            color="#6B7280"
          />
          <SettingRow
            icon="logo-github"
            label="Source Code"
            onPress={() => Linking.openURL('https://github.com')}
            color="#9CA3AF"
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerBrand}>KSHETRA</Text>
        <Text style={styles.footerText}>
          India's Political Intelligence Platform
        </Text>
        <Text style={styles.footerVersion}>v0.1.0 · Phase 1</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  bellButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
  },
  signInButton: {
    backgroundColor: '#4F8EF7',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  signOutButton: {
    backgroundColor: '#EF4444',
  },
  signInText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 14,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginLeft: 4,
    marginRight: 4,
  },
  clearText: {
    fontSize: 13,
    color: '#4F8EF7',
    fontWeight: '600',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
  },
  recentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  recentMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  themePicker: {
    flexDirection: 'row',
    gap: 6,
  },
  themeOption: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeOptionActive: {
    backgroundColor: '#4F8EF720',
    borderWidth: 1.5,
    borderColor: '#4F8EF7',
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerBrand: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4F8EF7',
    letterSpacing: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#374151',
    marginTop: 4,
  },
  footerVersion: {
    fontSize: 11,
    color: '#1F2937',
    marginTop: 2,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: '#4F8EF710',
    borderRadius: 12,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F8EF7',
  },
});
