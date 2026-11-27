import { useCallback, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/auth';
import { useUserProfileStore } from '../../stores/userProfile';
import { useLiveExchangeStore } from '../../stores/liveExchange';
import { useActiveStateStore } from '../../stores/activeState';
import { useContributorVerificationStore } from '../../stores/contributorVerification';
import { gateContentAction } from '../../lib/contentAccountability';
import { hydrateContributorKYC } from '../../lib/contributorKycService';
import {
  ISSUE_CATEGORY_CONFIG,
  type AccreditationTier,
  type IssueCategory,
} from '../../lib/lmxTypes';
import { canAccessLive } from '../../lib/pageGating';
import { useTheme } from '../../lib/theme';
import { apiClient } from '../../lib/api';
import { API_BASE_URL } from '../../lib/constants';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';

const CATEGORIES: IssueCategory[] = [
  'general',
  'civic',
  'breaking_news',
  'traffic',
  'weather',
  'emergency',
];

export default function GoLiveScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const profile = useUserProfileStore((state) => state.profile);
  const userId = user?.id;
  const verificationState = useContributorVerificationStore((state) =>
    state.ownerUserId === userId ? state.kycLoadState : 'idle',
  );
  const isVerified = useContributorVerificationStore(
    (state) => state.ownerUserId === userId && state.kycRecord?.status === 'verified',
  );
  const stateCode = useActiveStateStore((state) => state.stateCode);
  const startLiveEvent = useLiveExchangeStore((state) => state.startLiveEvent);
  const access = canAccessLive(
    profile?.id === userId ? profile?.role : undefined,
    isVerified ? 'verified' : undefined,
    Boolean(user?.email_confirmed_at),
  );
  const [available, setAvailable] = useState<boolean | null>(null);
  const [category, setCategory] = useState<IssueCategory>('general');
  const [tags, setTags] = useState('');
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const processing = useRef(false);
  const studioLink = useRef<{ href: string; ownerId: string } | null>(null);

  const refreshAvailability = useCallback(async () => {
    setAvailable(null);
    try {
      const { data } = await apiClient.get<{ publishAvailable: boolean }>('/api/v1/lmx/status', {
        authPolicy: 'public',
      });
      setAvailable(data.publishAvailable === true);
    } catch {
      setAvailable(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshAvailability();
      if (userId) void hydrateContributorKYC(userId);
    }, [refreshAvailability, userId]),
  );

  const canOpen =
    available === true && access.allowed && Boolean(user) && verificationState === 'ready';

  async function openStudio() {
    if (!canOpen || !user || processing.current) return;
    if (!gateContentAction('go_live')) return;
    processing.current = true;
    setOpening(true);
    setError(null);
    try {
      if (studioLink.current?.ownerId !== user.id) {
        const tier: AccreditationTier = profile?.role === 'journalist' ? 'accredited' : 'citizen';
        const event = await startLiveEvent({
          reporterId: user.id,
          reporterName: profile?.displayName || t('common.guest'),
          accreditationTier: tier,
          issueCategory: category,
          tags: tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
            .slice(0, 8),
          language: i18n.language,
          stateCode,
          visibilityMode: 'public',
          alertDepartments: [],
          affiliationId: null,
        });
        if (!event?.studioUrl) throw new Error('The server did not create a studio session');
        const url = new URL(event.studioUrl);
        if (
          url.origin !== new URL(API_BASE_URL).origin ||
          !/^\/api\/v1\/lmx\/studio\/[a-f0-9-]{36}$/.test(url.pathname) ||
          !url.hash
        ) {
          throw new Error('The server returned an invalid studio link');
        }
        studioLink.current = { href: url.href, ownerId: user.id };
      }
      if (useAuthStore.getState().user?.id !== user.id) return;
      await Linking.openURL(studioLink.current.href);
      studioLink.current = null;
      if (router.canGoBack()) router.back();
    } catch {
      setError(
        t('lmx.goLiveScreen.createFailed', {
          defaultValue:
            'The broadcast studio could not be opened. Check your connection and try again.',
        }),
      );
    } finally {
      processing.current = false;
      setOpening(false);
    }
  }

  const blockedMessage = !user
    ? t('lmx.goLiveScreen.signInRequired', { defaultValue: 'Sign in to start a broadcast.' })
    : access.reason === 'unverified_email'
      ? t('lmx.goLiveScreen.emailRequired', {
          defaultValue: 'Confirm your email address to broadcast.',
        })
      : access.reason === 'unverified'
        ? t('lmx.goLiveScreen.verificationRequired', {
            defaultValue: 'Verify your contributor profile to broadcast.',
          })
        : t('lmx.goLiveScreen.roleRequired', {
            defaultValue:
              'Live broadcasting is available to verified candidates, parties and journalists.',
          });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back', { defaultValue: 'Back' })}
          style={styles.iconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={25} color={colors.primary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{t('lmx.goLiveScreen.title')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('discovery.pageHelp.openHelp')}
          style={styles.iconButton}
          onPress={() => setHelpVisible(true)}
        >
          <Ionicons name="help-circle-outline" size={23} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {available === null ? (
          <Text accessibilityRole="text" style={{ color: colors.text }}>
            {t('common.loading')}
          </Text>
        ) : !available ? (
          <>
            <Text accessibilityRole="alert" style={{ color: colors.text }}>
              {t('lmx.goLiveScreen.mediaPlaneUnavailable', {
                defaultValue: 'Broadcasting is temporarily unavailable.',
              })}
            </Text>
            <Pressable accessibilityRole="button" style={styles.tap} onPress={refreshAvailability}>
              <Text style={[styles.label, { color: colors.primary }]}>{t('common.refresh')}</Text>
            </Pressable>
          </>
        ) : userId && (verificationState === 'idle' || verificationState === 'loading') ? (
          <Text style={{ color: colors.text }}>{t('kycSheet.checkingStatus')}</Text>
        ) : userId && verificationState === 'unavailable' ? (
          <>
            <Text accessibilityRole="alert" style={{ color: colors.text }}>
              {t('kycSheet.statusUnavailable')}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.tap}
              onPress={() => void hydrateContributorKYC(userId)}
            >
              <Text style={[styles.label, { color: colors.primary }]}>{t('common.retry')}</Text>
            </Pressable>
          </>
        ) : !canOpen ? (
          <>
            <Text style={{ color: colors.text }}>{blockedMessage}</Text>
            {!user || access.reason === 'unverified' ? (
              <Pressable
                accessibilityRole="button"
                style={styles.tap}
                onPress={() => router.push(user ? '/verification' : '/auth/sign-in')}
              >
                <Text style={[styles.label, { color: colors.primary }]}>
                  {user
                    ? t('auth.getVerified', { defaultValue: 'Get verified' })
                    : t('auth.signIn')}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('lmx.goLiveScreen.category')}
            </Text>
            <View style={styles.options}>
              {CATEGORIES.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: category === item }}
                  disabled={opening}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.option,
                    { borderColor: category === item ? colors.primary : colors.border },
                  ]}
                >
                  <Text style={{ color: category === item ? colors.primary : colors.text }}>
                    {t(ISSUE_CATEGORY_CONFIG[item].labelKey)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder={t('lmx.goLiveScreen.tagsLabel', {
                defaultValue: 'Tags (optional, comma-separated)',
              })}
              placeholderTextColor={colors.textMuted}
              value={tags}
              onChangeText={setTags}
              maxLength={160}
              editable={!opening}
            />
            <Text style={{ color: colors.textSecondary }}>
              {t('lmx.goLiveScreen.browserStudio', {
                defaultValue:
                  'Allow camera and microphone access in the browser. Keep the studio open while broadcasting.',
              })}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {t('lmx.goLiveScreen.reviewBeforePublic', {
                defaultValue: 'Your broadcast appears in Live after a reviewer approves it.',
              })}
            </Text>
            {error && (
              <Text accessibilityRole="alert" style={{ color: colors.text }}>
                {error}
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {canOpen && (
        <View
          style={[styles.footer, { paddingBottom: insets.bottom + 12, borderColor: colors.border }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: opening, busy: opening }}
            style={[styles.submit, { backgroundColor: colors.primary, opacity: opening ? 0.6 : 1 }]}
            onPress={openStudio}
            disabled={opening}
          >
            <Text style={styles.submitLabel}>
              {opening
                ? t('common.loading')
                : t('lmx.goLiveScreen.openStudio', { defaultValue: 'Open broadcast studio' })}
            </Text>
          </Pressable>
        </View>
      )}
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="live-go-live"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  iconButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '800' },
  form: { padding: 18, gap: 16 },
  label: { fontSize: 15, fontWeight: '700' },
  tap: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footer: { paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1 },
  submit: {
    minHeight: 48,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLabel: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
});
