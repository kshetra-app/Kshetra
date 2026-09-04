import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePreferencesStore } from '../../stores/preferences';
import { useFavoritesStore } from '../../stores/favorites';
import { useRecentsStore } from '../../stores/recents';
import { useAuthStore } from '../../stores/auth';
import { useNotificationsStore } from '../../stores/notifications';
import { useUserProfileStore } from '../../stores/userProfile';
import { getPartyColor } from '../../lib/constants';
import UserProfileCard from '../../components/UserProfileCard';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../../stores/activeState';
import { getUnifiedConstituenciesForState } from '../../lib/stateDataAdapter';
import { useResponsive } from '../../lib/responsive';
import { useContributorVerificationStore } from '../../stores/contributorVerification';
import { KYC_STATUS_CONFIG } from '../../lib/contentAccountabilityTypes';
import { useTheme } from '../../lib/theme';
import { DevFeatureSwitcher } from '../../components/DevFeatureSwitcher';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  color?: string;
}

function SettingRow({ icon, label, value, onPress, color = '#2563EB' }: SettingRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      {value && <Text style={[styles.settingValue, { color: colors.textMuted }]}>{value}</Text>}
      {onPress && (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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
  const activeStateCode = useActiveStateStore((s) => s.stateCode);
  const latestElectionYear = (() => {
    const cs = getUnifiedConstituenciesForState(activeStateCode);
    return cs.length > 0 ? cs[0].electionYear : 2023;
  })();

  const { insets } = useResponsive();
  const { colors } = useTheme();
  const [showDevModal, setShowDevModal] = useState(false);
  const kycRecord = useContributorVerificationStore((s) => s.kycRecord);
  const setShowKYCSheet = useContributorVerificationStore((s) => s.setShowKYCSheet);
  const kycStatus = kycRecord?.status ?? null;
  const kycConfig = kycStatus ? KYC_STATUS_CONFIG[kycStatus] : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={[styles.bellButton, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textMuted} />
          {unreadCount > 0 && (
            <View style={[styles.bellBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
        <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
          <Ionicons
            name={user ? 'person-circle' : 'person'}
            size={32}
            color={user ? colors.teal : colors.gold}
          />
        </View>
        {user ? (
          <>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{user.email}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{t('auth.signedIn')}</Text>
            <Pressable
              style={[styles.signInButton, { backgroundColor: colors.danger }]}
              onPress={signOut}
              disabled={loading}
            >
              <Text style={styles.signInText}>
                {loading ? t('auth.signingOut') : t('auth.signOut')}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('auth.guestUser')}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {t('auth.signInToSync')}
            </Text>
            <Pressable
              style={[styles.signInButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/auth/sign-in')}
            >
              <Text style={styles.signInText}>{t('auth.signIn')}</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.notifications')}</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#4F8EF720' }]}>
              <Ionicons name="notifications" size={18} color="#4F8EF7" />
            </View>
            <Text style={styles.settingLabel}>{t('profile.pushNotifications')}</Text>
            <Switch
              value={notifEnabled}
              onValueChange={toggleNotif}
              trackColor={{ false: '#374151', true: '#4F8EF760' }}
              thumbColor={notifEnabled ? '#4F8EF7' : '#6B7280'}
            />
          </View>
          <SettingRow
            icon="mail"
            label={t('profileExtended.notificationCenter')}
            value={unreadCount > 0 ? t('notifications.unread', { count: unreadCount }) : undefined}
            onPress={() => router.push('/notifications')}
            color="#F59E0B"
          />
          <SettingRow
            icon="settings"
            label={t('profileExtended.notificationSettings')}
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
            onPress={() => router.push('/auth/edit-profile' as any)}
          >
            <Ionicons name="create-outline" size={16} color="#4F8EF7" />
            <Text style={styles.editProfileText}>{t('profile.editProfile')}</Text>
          </Pressable>
        </View>
      )}

      {/* Contributor Verification */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profileExtended.contributorStatus')}</Text>
        <View style={styles.card}>
          {kycConfig ? (
            <View style={styles.settingRow}>
              <View style={[styles.settingIcon, { backgroundColor: kycConfig.color + '20' }]}>
                <Ionicons name={kycConfig.icon as any} size={18} color={kycConfig.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{kycConfig.label}</Text>
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                  {kycRecord?.fullLegalName} · {kycRecord?.phoneNumber}
                </Text>
              </View>
              <View style={[{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: kycConfig.color + '20' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: kycConfig.color }}>
                  {kycStatus?.toUpperCase()}
                </Text>
              </View>
            </View>
          ) : (
            <Pressable
              style={styles.settingRow}
              onPress={() => setShowKYCSheet(true)}
            >
              <View style={[styles.settingIcon, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="finger-print" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('profileExtended.verifyToContribute')}</Text>
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                  {t('profileExtended.verifyDesc')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#374151" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
        <View style={styles.card}>
          <View style={styles.languageRow}>
            <LanguageSwitcher />
          </View>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.about')}</Text>
        <View style={styles.card}>
          <SettingRow icon="information-circle" label={t('profile.version')} value="0.1.0" />
          <SettingRow icon="map" label={t('profile.settings')} value={STATES[activeStateCode]?.name ?? activeStateCode} />
          <SettingRow icon="people" label={t('explore.constituencies')} value={String(STATES[activeStateCode]?.assemblySeats ?? '—')} />
          <SettingRow icon="server" label={t('profileExtended.data')} value={`${latestElectionYear} ${t('profileExtended.elections')}`} />
        </View>
      </View>

      {/* Explore Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profileExtended.exploreFeatures')}</Text>
        <View style={styles.card}>
          <SettingRow
            icon="business"
            label={t('profileExtended.parliamentMPs')}
            onPress={() => router.push('/parliament' as any)}
            color="#8B5CF6"
          />
          <SettingRow
            icon="sparkles"
            label={t('profileExtended.aiChatAsk')}
            onPress={() => router.push('/ai-chat' as any)}
            color="#F59E0B"
          />
          <SettingRow
            icon="map"
            label={t('profileExtended.delimitationTracker')}
            onPress={() => router.push('/delimitation' as any)}
            color="#10B981"
          />
          <SettingRow
            icon="person-circle"
            label={t('profileExtended.whatChangesForYou')}
            onPress={() => router.push('/delimitation/my-impact' as any)}
            color="#EF4444"
          />
          <SettingRow
            icon="school"
            label={t('profileExtended.leadershipAcademy')}
            onPress={() => router.push('/leadership-academy' as any)}
            color="#8B5CF6"
          />
          <SettingRow
            icon="rocket"
            label={t('profileExtended.becomeAspirant')}
            onPress={() => router.push('/become-aspirant' as any)}
            color="#06B6D4"
          />
        </View>
      </View>

      {/* Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profileExtended.activity')}</Text>
        <View style={styles.card}>
          <SettingRow
            icon="heart"
            label={t('profile.favorites')}
            value={`${favoriteCount} ${t('profileExtended.saved')}`}
            color="#EF4444"
          />
          <SettingRow
            icon="time"
            label={t('profileExtended.recentlyViewed')}
            value={`${recents.length} ${t('profileExtended.visited')}`}
            color="#F59E0B"
          />
        </View>
      </View>

      {/* Recently Viewed */}
      {recents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('profileExtended.recent')}</Text>
            <Pressable onPress={clearRecents} hitSlop={8}>
              <Text style={styles.clearText}>{t('profileExtended.clear')}</Text>
            </Pressable>
          </View>
          <View style={styles.card}>
            {recents.slice(0, 5).map((r) => (
              <Pressable
                key={r.acNo}
                style={styles.recentRow}
                onPress={() => router.push(`/constituency/${r.stateCode ? `${r.stateCode}-AC-${r.acNo}` : r.acNo}` as any)}
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
        <Text style={styles.sectionTitle}>{t('profileExtended.preferences')}</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="notifications" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.settingLabel}>{t('profile.notifications')}</Text>
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
            <Text style={styles.settingLabel}>{t('profileExtended.hapticFeedback')}</Text>
            <Switch
              value={prefs.hapticFeedback}
              onValueChange={prefs.setHapticFeedback}
              trackColor={{ false: '#374151', true: '#4F8EF7' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="tv" size={18} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{t('profileExtended.broadcastMode')}</Text>
              <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                {t('profileExtended.broadcastDesc')}
              </Text>
            </View>
            <Switch
              value={prefs.broadcastMode}
              onValueChange={prefs.setBroadcastMode}
              trackColor={{ false: '#374151', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="moon" size={18} color="#8B5CF6" />
            </View>
            <Text style={styles.settingLabel}>{t('profileExtended.theme')}</Text>
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
          <SettingRow
            icon="toggle"
            label="Feature Flags & Dev Switches"
            onPress={() => setShowDevModal(true)}
            color="#8B5CF6"
          />
          {(userProfile?.role === 'moderator' || userProfile?.role === 'admin') && (
            <SettingRow
              icon="shield-half"
              label="Content Moderation Queue"
              value="Grievance Officer"
              onPress={() => router.push('/moderation' as any)}
              color="#EC4899"
            />
          )}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.about')}</Text>
        <View style={styles.card}>
          <SettingRow
            icon="shield-checkmark"
            label={t('profileExtended.privacyPolicy')}
            onPress={() => {}}
            color="#10B981"
          />
          <SettingRow
            icon="document-text"
            label={t('profileExtended.termsOfService')}
            onPress={() => {}}
            color="#6B7280"
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.footer}
        onPress={() => setShowDevModal(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.footerBrand, { color: colors.primary }]}>{t('common.appName')}</Text>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {t('profileExtended.tagline')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Ionicons name="settings-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.footerVersion, { color: colors.textMuted }]}>
            {t('profileExtended.versionPhase')} • Tap for Dev Switches
          </Text>
        </View>
      </TouchableOpacity>

      <DevFeatureSwitcher
        visible={showDevModal}
        onClose={() => setShowDevModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8BC7E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#A8201A',
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
    backgroundColor: '#F5EFE4',
    borderWidth: 2,
    borderColor: '#D8BC7E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#241814',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6D5549',
    marginTop: 4,
    marginBottom: 16,
  },
  signInButton: {
    backgroundColor: '#A8201A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
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
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 14,
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
    fontWeight: '600',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
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
    fontWeight: '600',
  },
  recentMeta: {
    fontSize: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  themeOptionActive: {},
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerBrand: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 4,
  },
  footerText: {
    fontSize: 12,
    marginTop: 4,
  },
  footerVersion: {
    fontSize: 11,
    marginTop: 2,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
  },
  languageRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
