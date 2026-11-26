import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  Switch,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../../stores/activeState';
import StateSwitcher from '../../components/StateSwitcher';
import type { AspirantProfile } from '../../lib/aspirantTypes';
import { isAspirantMetricAvailable } from '../../lib/aspirantTypes';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
import { useAspirantStore } from '../../stores/aspirant';
import { useAuthStore } from '../../stores/auth';
import { fetchVerifiedPoliticians, type VerifiedPoliticianProfile } from '../../lib/supabaseDataService';
import { useConstituencyDirectory } from '../../lib/useConstituencyDirectory';
import {
  getLocalizedConstituencyName,
  getLocalizedDistrictName,
  getLocalizedPartyName,
  getLocalizedStateName,
} from '../../lib/stateTranslations';
import { getLocalizedCandidateName } from '../../lib/historicalPodiumStore';
import RegisterAspirantModal from '../../components/RegisterAspirantModal';
import CivicScoreCard from '../../components/CivicScoreCard';
import CivicBadgeGrid from '../../components/CivicBadgeGrid';
import LeaderProfileModal from '../../components/LeaderProfileModal';

type PageTab = 'aspirants' | 'politicians' | 'my_page';
type VerifiedProfilesResult =
  | { stateCode: string; status: 'loading' | 'error' }
  | { stateCode: string; status: 'ready'; profiles: VerifiedPoliticianProfile[] };

export default function PagesScreen() {
  const { t, i18n } = useTranslation();
  const unavailableLabel = t('constituency.dataUnavailable', { defaultValue: 'Unavailable' });
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<PageTab>(() => {
    if (tab === 'my_page' || tab === 'aspirants' || tab === 'politicians') {
      return tab;
    }
    return 'politicians';
  });
  const [refreshing, setRefreshing] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [verifiedProfiles, setVerifiedProfiles] = useState<VerifiedProfilesResult>();
  const politiciansRequestSequence = useRef(0);
  const [selectedAspirant, setSelectedAspirant] = useState<AspirantProfile | null>(null);
  const [myPageModalVisible, setMyPageModalVisible] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);

  const stateCode = useActiveStateStore((s) => s.stateCode);
  const {
    constituencies: stateSeats,
    status: directoryStatus,
    refresh: refreshDirectory,
  } = useConstituencyDirectory(stateCode);
  const stateRepresentatives = useMemo(
    () =>
      stateSeats.filter(
        (constituency) =>
          Boolean(constituency.currentMLA?.trim()) &&
          constituency.officeholderStatus !== 'VACANT',
      ),
    [stateSeats],
  );
  const stateNameFor = (code: string) =>
    getLocalizedStateName(code, i18n.language) ??
    (STATES as Record<string, { name: string }>)[code]?.name ??
    code;
  const visibleProfiles = verifiedProfiles?.stateCode === stateCode ? verifiedProfiles : undefined;

  const authUser = useAuthStore((s) => s.user);

  // Aspirant store
  const storedAspirant = useAspirantStore((s) => s.profile);
  const aspirantProfile = authUser && storedAspirant?.userId === authUser.id ? storedAspirant : null;
  const setProfileVisibility = useAspirantStore((s) => s.setProfileVisibility);
  const aspirantProfileStatus = useAspirantStore((s) => s.profileStatus);
  const publicAspirants = useAspirantStore((s) => s.publicAspirants);
  const publicAspirantsStatus = useAspirantStore((s) => s.publicAspirantsStatus);
  const getCivicScore = useAspirantStore((s) => s.getCivicScore);
  const badges = useAspirantStore((s) => s.badges);
  const endorseAspirant = useAspirantStore((s) => s.endorseAspirant);
  const endorsedIds = useAspirantStore((s) => s.endorsedIds);
  const hydrateAspirants = useAspirantStore((s) => s.hydrateAspirants);
  const hydrateAspirantProfile = useAspirantStore((s) => s.hydrateAspirantProfile);
  const hydrateAcademyBadges = useAspirantStore((s) => s.hydrateAcademyBadges);
  const academyBadgesStatus = useAspirantStore((s) => s.academyBadgesStatus);

  const loadPoliticians = useCallback(async () => {
    const requestSequence = ++politiciansRequestSequence.current;
    setVerifiedProfiles({ stateCode, status: 'loading' });
    const data = await fetchVerifiedPoliticians(stateCode === 'IN' ? undefined : stateCode);
    if (requestSequence !== politiciansRequestSequence.current) return;
    setVerifiedProfiles(data === null
      ? { stateCode, status: 'error' }
      : { stateCode, status: 'ready', profiles: data });
  }, [stateCode]);

  useEffect(() => {
    hydrateAspirants();
    hydrateAspirantProfile();
    hydrateAcademyBadges();
  }, [hydrateAspirants, hydrateAspirantProfile, hydrateAcademyBadges, authUser?.id]);

  useEffect(() => {
    void loadPoliticians();
  }, [loadPoliticians, authUser?.id]);

  useEffect(() => {
    if (tab === 'my_page' || tab === 'aspirants' || tab === 'politicians') {
      setActiveTab(tab);
    }
  }, [tab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      refreshDirectory();
      await Promise.all([
        hydrateAspirants(),
        hydrateAspirantProfile(),
        hydrateAcademyBadges(),
        loadPoliticians(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [hydrateAspirants, hydrateAspirantProfile, hydrateAcademyBadges, loadPoliticians, refreshDirectory]);

  const civicScore = getCivicScore();

  const changeVisibility = async (isPublic: boolean) => {
    if (savingVisibility) return;
    setSavingVisibility(true);
    try {
      if (!(await setProfileVisibility(isPublic))) {
        Alert.alert(t('pages.visibilitySaveFailed', { defaultValue: 'Could not save directory visibility. Please try again.' }));
      }
    } finally {
      setSavingVisibility(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <Stack.Screen
        options={{
          title: t('pages.screenTitle', { defaultValue: 'Pages & Leaders' }),
          headerShown: true,
          headerStyle: { backgroundColor: '#002B7F' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '900', color: '#FFFFFF', fontSize: 17 },
          headerRight: () => (
            <Pressable
              accessibilityLabel={t('discovery.pageHelp.openHelp', { defaultValue: 'Page Help' })}
              style={{ padding: 6, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
              onPress={() => setHelpVisible(true)}
            >
              <Ionicons name="help-circle-outline" size={20} color="#FFFFFF" />
            </Pressable>
          ),
        }}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/parties')}
        style={{ minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' }}
      >
        <Text style={{ color: '#002B7F', fontWeight: '700' }}>{t('partyRegistry.title', { defaultValue: 'Political parties' })}</Text>
      </Pressable>

      {/* Tabs in Navy Blue & White */}
      <View style={[styles.tabBar, { backgroundColor: '#FFFFFF', borderBottomColor: '#E2E8F0' }]}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'aspirants' }}
          style={[
            styles.tab,
            activeTab === 'aspirants' && { borderBottomColor: '#002B7F', borderBottomWidth: 2.5 },
          ]}
          onPress={() => setActiveTab('aspirants')}
        >
          <Ionicons
            name={activeTab === 'aspirants' ? 'rocket' : 'rocket-outline'}
            size={18}
            color={activeTab === 'aspirants' ? '#002B7F' : '#64748B'}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'aspirants' ? '#002B7F' : '#64748B', fontWeight: activeTab === 'aspirants' ? '900' : '600' },
            ]}
          >
            {t('pages.tabAspirants', { defaultValue: 'Civic Aspirants' })}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'politicians' }}
          style={[
            styles.tab,
            activeTab === 'politicians' && { borderBottomColor: '#002B7F', borderBottomWidth: 2.5 },
          ]}
          onPress={() => setActiveTab('politicians')}
        >
          <Ionicons
            name={activeTab === 'politicians' ? 'people' : 'people-outline'}
            size={18}
            color={activeTab === 'politicians' ? '#002B7F' : '#64748B'}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'politicians' ? '#002B7F' : '#64748B', fontWeight: activeTab === 'politicians' ? '900' : '600' },
            ]}
          >
            {t('pages.tabPoliticians', { defaultValue: 'Representatives' })}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'my_page' }}
          style={[
            styles.tab,
            activeTab === 'my_page' && { borderBottomColor: '#002B7F', borderBottomWidth: 2.5 },
          ]}
          onPress={() => setActiveTab('my_page')}
        >
          <Ionicons
            name={activeTab === 'my_page' ? 'person-circle' : 'person-circle-outline'}
            size={18}
            color={activeTab === 'my_page' ? '#002B7F' : '#64748B'}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'my_page' ? '#002B7F' : '#64748B', fontWeight: activeTab === 'my_page' ? '900' : '600' },
            ]}
          >
            {t('pages.tabMyPage', { defaultValue: 'My Page' })}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ─── TAB 1: ASPIRANTS ─── */}
        {activeTab === 'aspirants' && (
          <View style={styles.tabContent}>
            {/* Banner */}
            <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroTitle, { color: colors.text }]}>
                  {t('pages.aspirantsHeroTitle', { defaultValue: 'Emerging Civic Leaders' })}
                </Text>
                <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
                  {t('pages.aspirantsHeroDesc', {
                    defaultValue: 'Discover and endorse citizens running for upcoming local and assembly elections.',
                  })}
                </Text>
              </View>
              <Pressable
                style={[styles.btnRegister, { backgroundColor: colors.primary }]}
                onPress={() => setActiveTab('my_page')}
              >
                <Text style={styles.btnRegisterText}>
                  {aspirantProfile ? t('pages.aspirantProfileTitle') : t('pages.registerAsAspirantBtn')}
                </Text>
              </Pressable>
            </View>

            {/* Aspirants Directory */}
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              {t('pages.tabAspirants')}
            </Text>

            {(publicAspirantsStatus === 'idle' || publicAspirantsStatus === 'loading') && (
              <View style={[styles.emptyDirectoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.aspirantBio, { color: colors.textSecondary }]}>
                  {t('leadershipAcademy.loadingAspirants', { defaultValue: 'Loading public aspirants…' })}
                </Text>
              </View>
            )}

            {publicAspirantsStatus === 'error' && (
              <View style={[styles.emptyDirectoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="cloud-offline-outline" size={28} color={colors.textMuted} />
                <Text style={[styles.aspirantBio, { color: colors.textSecondary }]}>
                  {t('leadershipAcademy.aspirantsUnavailable', { defaultValue: 'The public aspirant directory is unavailable right now.' })}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.btnActionPrimary, { backgroundColor: colors.primary }]}
                  onPress={() => void hydrateAspirants()}
                >
                  <Text style={styles.btnActionPrimaryText}>{t('common.retry')}</Text>
                </Pressable>
              </View>
            )}

            {publicAspirantsStatus === 'ready' && publicAspirants.length === 0 && (
              <View style={[styles.emptyDirectoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="people-outline" size={28} color={colors.primary} />
                <Text style={[styles.aspirantBio, { color: colors.textSecondary }]}>
                  {t('pages.noPublicAspirants')}
                </Text>
              </View>
            )}

            {publicAspirantsStatus === 'ready' && publicAspirants.map((asp) => {
              const isEndorsed = endorsedIds.includes(asp.id);
              return (
                <Pressable
                  key={asp.id}
                  style={[styles.aspirantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setSelectedAspirant(asp)}
                >
                  <View style={styles.aspirantTopRow}>
                    <View style={[styles.aspirantAvatar, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                        {asp.displayName.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.aspirantName, { color: colors.text }]}>{asp.displayName}</Text>
                      <Text style={[styles.aspirantSeat, { color: colors.textMuted }]}>
                        {asp.targetConstituencyName
                          ? t('pages.aimingFor', {
                              constituency: asp.targetConstituencyName,
                              year: asp.targetElectionYear,
                              defaultValue: `Aiming for ${asp.targetConstituencyName} · ${asp.targetElectionYear}`,
                            })
                          : t('pages.civicCandidate', { defaultValue: 'Civic Candidate' })}
                      </Text>
                    </View>
                    <View style={[styles.scoreBadge, { backgroundColor: '#F0FDF4' }]}>
                      <Ionicons name="trophy" size={12} color="#16A34A" />
                      <Text style={styles.scoreText}>
                        {isAspirantMetricAvailable(asp, 'civicScore')
                          ? `${asp.civicScore} ${t('pages.pts', { defaultValue: 'pts' })}`
                          : unavailableLabel}
                      </Text>
                    </View>
                  </View>

                  {asp.bio ? (
                    <Text style={[styles.aspirantBio, { color: colors.textSecondary }]} numberOfLines={2}>
                      {asp.bio}
                    </Text>
                  ) : null}

                  <View style={styles.aspirantStatsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {isAspirantMetricAvailable(asp, 'issuesReported') ? asp.issuesReported : unavailableLabel}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                        {t('pages.issues', { defaultValue: 'Issues' })}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {isAspirantMetricAvailable(asp, 'communityEndorsements')
                          ? asp.communityEndorsements
                          : unavailableLabel}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                        {t('pages.endorsements', { defaultValue: 'Endorsements' })}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {isAspirantMetricAvailable(asp, 'modulesCompleted') ? asp.modulesCompleted : unavailableLabel}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                        {t('pages.modules', { defaultValue: 'Modules' })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable
                      style={[styles.btnViewPage, { borderColor: '#002B7F' }]}
                      onPress={() => setSelectedAspirant(asp)}
                    >
                      <Ionicons name="document-text-outline" size={14} color="#002B7F" />
                      <Text style={[styles.btnViewPageText, { color: '#002B7F' }]}>
                        {t('pages.viewPage', { defaultValue: 'View Page' })}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.btnEndorse,
                        isEndorsed
                          ? { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }
                          : { backgroundColor: '#002B7F' },
                      ]}
                      onPress={() => endorseAspirant(asp.id, authUser?.id)}
                      disabled={isEndorsed}
                    >
                      <Ionicons
                        name={isEndorsed ? 'checkmark-circle' : 'thumbs-up'}
                        size={14}
                        color={isEndorsed ? '#16A34A' : '#FFFFFF'}
                      />
                      <Text
                        style={[
                          styles.btnEndorseText,
                          { color: isEndorsed ? '#16A34A' : '#FFFFFF' },
                        ]}
                      >
                        {isEndorsed
                          ? t('pages.endorsed', { defaultValue: 'Endorsed' })
                          : t('pages.endorse', { defaultValue: 'Endorse Candidate' })}
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ─── TAB 2: POLITICIANS & REPRESENTATIVES ─── */}
        {activeTab === 'politicians' && (
          <View style={styles.tabContent}>
            <View style={{ marginBottom: 12, gap: 8 }}>
              <Text style={[styles.sectionHeading, { color: colors.text, marginBottom: 0 }]}>
                {t('pages.registeredPoliticians', { defaultValue: 'Elected Representatives & Leaders' })}
              </Text>
              <StateSwitcher />
            </View>

            {stateCode === 'IN' ? (
              <View style={[styles.emptyDirectoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="map-outline" size={24} color={colors.primary} />
                <Text style={[styles.aspirantBio, { color: colors.textSecondary }]}>
                  {t('pages.selectStateForRepresentatives', {
                    defaultValue: 'Select a state to see its current representative directory.',
                  })}
                </Text>
              </View>
            ) : directoryStatus === 'LOADING' ? (
              <View style={[styles.emptyDirectoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.aspirantBio, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
              </View>
            ) : directoryStatus === 'UNAVAILABLE' ? (
              <Pressable
                style={[styles.emptyDirectoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                accessibilityRole="button"
                onPress={refreshDirectory}
              >
                <Text style={[styles.aspirantBio, { color: colors.textSecondary }]}>{t('pages.currentRepresentativesUnavailable')}</Text>
                <Text style={[styles.btnViewPageText, { color: colors.primary }]}>{t('common.retry')}</Text>
              </Pressable>
            ) : stateRepresentatives.length === 0 ? (
              <View style={[styles.emptyDirectoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
                <Text style={[styles.aspirantBio, { color: colors.textSecondary }]}>
                  {t('pages.noCurrentRepresentatives', {
                    state: stateNameFor(stateCode),
                  })}
                </Text>
                <Pressable
                  style={[styles.btnViewPage, { borderColor: colors.primary }]}
                  onPress={() => router.push('/(tabs)/explore' as any)}
                  accessibilityRole="button"
                >
                  <Ionicons name="search-outline" size={14} color={colors.primary} />
                  <Text style={[styles.btnViewPageText, { color: colors.primary }]}>
                    {t('pages.browseConstituencies', { defaultValue: 'Browse constituencies' })}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ marginBottom: 16 }}>
                {directoryStatus === 'STALE_DATABASE_RECORDS' && (
                  <Text style={[styles.aspirantBio, { color: colors.textSecondary }]}>
                    {t('civicMetrics.showingSavedRecords')}
                  </Text>
                )}
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t('pages.sittingMlas', { defaultValue: 'Sitting MLAs & Officials' })} ({stateRepresentatives.length})
                </Text>
                {stateRepresentatives.map((c) => {
                  const repName = getLocalizedCandidateName(c.currentMLA?.trim(), i18n.language);
                  const partyName = getLocalizedPartyName(c.currentParty, i18n.language);
                  const constituencyName = getLocalizedConstituencyName(c.acNo, c.stateCode, c.name, i18n.language);
                  const districtName = getLocalizedDistrictName(c.district, i18n.language);
                  const legislatorId = `${c.stateCode}-AC-${c.acNo}`;
                  return (
                    <Pressable
                      key={c.acNo}
                      accessibilityRole="button"
                      style={[styles.aspirantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => router.push(`/legislator/${legislatorId}` as any)}
                    >
                      <View style={styles.aspirantTopRow}>
                        <View style={[styles.aspirantAvatar, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.avatarInitial, { color: '#FFFFFF' }]}>
                            {repName.charAt(0)}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.aspirantName, { color: colors.text }]}>{repName}</Text>
                          <Text style={[styles.aspirantSeat, { color: colors.textMuted }]}>
                            {constituencyName}{districtName ? ` · ${districtName}` : ''}
                          </Text>
                        </View>
                        {partyName ? (
                          <View style={[styles.scoreBadge, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.scoreText, { color: colors.primary, fontWeight: '800' }]}>
                              {partyName}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.cardActions}>
                        <View
                          style={[styles.btnEndorse, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        >
                          <Ionicons name="document-text-outline" size={14} color="#FFFFFF" />
                          <Text style={[styles.btnEndorseText, { color: '#FFFFFF' }]}>
                            {t('pages.viewDossier', { defaultValue: 'View Dossier & Track Record' })}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {(!visibleProfiles || visibleProfiles.status === 'loading') && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.textMuted }}>{t('common.loading')}</Text>
              </View>
            )}

            {visibleProfiles?.status === 'error' && (
              <Pressable
                style={[styles.emptyDirectoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => void loadPoliticians()}
                accessibilityRole="button"
              >
                <Ionicons name="cloud-offline-outline" size={24} color={colors.textMuted} />
                <Text style={[styles.aspirantBio, { color: colors.textSecondary }]}>
                  {t('pages.verifiedProfilesUnavailable', {
                    defaultValue: 'Verified leader profiles could not be loaded.',
                  })}
                </Text>
                <Text style={[styles.btnViewPageText, { color: colors.primary }]}>{t('common.retry')}</Text>
              </Pressable>
            )}

            {visibleProfiles?.status === 'ready' && visibleProfiles.profiles.length > 0 && (
              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t('pages.verifiedLeaders')}
                </Text>
                {visibleProfiles.profiles.map((p) => (
                  <Pressable
                    key={p.user_id}
                    accessibilityRole="button"
                    style={[styles.aspirantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => router.push(`/user/${p.user_id}` as any)}
                  >
                    <View style={styles.aspirantTopRow}>
                      <View style={[styles.aspirantAvatar, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.avatarInitial, { color: '#FFFFFF' }]}>
                          {p.display_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.aspirantName, { color: colors.text, flexShrink: 1 }]}>{p.display_name}</Text>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginLeft: 4 }} />
                        </View>
                        {p.state_code && (
                          <Text style={[styles.aspirantSeat, { color: colors.textMuted }]}>{stateNameFor(p.state_code)}</Text>
                        )}
                      </View>
                    </View>
                    {p.bio ? (
                      <Text style={[styles.aspirantBio, { color: colors.textSecondary }]} numberOfLines={2}>
                        {p.bio}
                      </Text>
                    ) : null}
                    <View style={styles.cardActions}>
                      <View
                        style={[styles.btnEndorse, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      >
                        <Ionicons name="person-outline" size={14} color="#FFFFFF" />
                        <Text style={[styles.btnEndorseText, { color: '#FFFFFF' }]}>
                          {t('pages.viewProfile', { defaultValue: 'View Profile' })}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── TAB 3: MY PAGE ─── */}
        {activeTab === 'my_page' && (
          <View style={styles.tabContent}>
            <View style={[styles.personalPageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.personalPageIntro}>
                <Ionicons name="person-circle-outline" size={38} color={colors.primary} />
                <View style={styles.personalPageText}>
                  <Text style={[styles.profileMetaName, { color: colors.text }]}>{t('pages.personalPageTitle')}</Text>
                  <Text style={[styles.personalPageDescription, { color: colors.textSecondary }]}>{t('pages.personalPageDescription')}</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                style={[styles.btnActionPrimary, { backgroundColor: colors.primary }]}
                onPress={() => authUser ? router.push({ pathname: '/user/[userId]', params: { userId: authUser.id } }) : router.push('/auth/sign-in')}
              >
                <Text style={styles.btnActionPrimaryText}>{authUser ? t('pages.openMyPage') : t('auth.signIn')}</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
            {!authUser ? null : aspirantProfileStatus === 'loading' ? (
              <View style={[styles.createPromptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.promptDesc, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
              </View>
            ) : aspirantProfileStatus === 'error' ? (
              <View style={[styles.createPromptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.promptDesc, { color: colors.textSecondary }]}>
                  {t('pages.aspirantProfileUnavailable', { defaultValue: 'Your aspirant profile could not be loaded.' })}
                </Text>
                <Pressable style={[styles.btnActionPrimary, { backgroundColor: colors.primary }]} onPress={() => void hydrateAspirantProfile()}>
                  <Text style={styles.btnActionPrimaryText}>{t('common.retry')}</Text>
                </Pressable>
              </View>
            ) : aspirantProfile ? (
              <>
                    <Text style={[styles.sectionHeading, { color: colors.text }]}>{t('pages.aspirantProfileTitle')}</Text>
                    {civicScore ? (
                      <CivicScoreCard score={civicScore} displayName={aspirantProfile.displayName} />
                    ) : (
                      <Text style={{ color: colors.textMuted, marginBottom: 12 }}>{unavailableLabel}</Text>
                    )}
                    <View style={[styles.profileMetaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Ionicons name="rocket" size={20} color="#002B7F" />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.profileMetaName, { color: colors.text }]}>{aspirantProfile.displayName}</Text>
                        <Text style={[styles.profileMetaSub, { color: colors.textMuted }]}>
                          {aspirantProfile.targetConstituencyName
                            ? t('pages.candidateForYear', {
                                constituency: aspirantProfile.targetConstituencyName,
                                year: aspirantProfile.targetElectionYear,
                                defaultValue: `Candidate for ${aspirantProfile.targetConstituencyName} (${aspirantProfile.targetElectionYear})`,
                              })
                            : t('pages.aspirantProfileActive', { defaultValue: 'Civic Aspirant Profile Active' })}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.visibilityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.personalPageText}>
                        <Text style={[styles.profileMetaName, { color: colors.text }]}>{t('aspirantReg.listInDirectory')}</Text>
                        <Text style={[styles.personalPageDescription, { color: colors.textSecondary }]}>
                          {aspirantProfile.isPublic ? t('pages.aspirantListed') : t('pages.aspirantPrivate')}
                        </Text>
                      </View>
                      {savingVisibility && <ActivityIndicator color={colors.primary} />}
                      <Switch
                        accessibilityLabel={t('aspirantReg.listInDirectory')}
                        disabled={savingVisibility}
                        value={Boolean(aspirantProfile.isPublic)}
                        onValueChange={(value) => void changeVisibility(value)}
                      />
                    </View>

                    {/* Launch Full Leader Dossier & Studio */}
                    <Pressable
                      style={[styles.btnOpenDossier, { backgroundColor: '#002B7F' }]}
                      onPress={() => setMyPageModalVisible(true)}
                    >
                      <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                      <Text style={styles.btnOpenDossierText}>
                        {t('pages.openAspirantProfile')}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </Pressable>

                    {academyBadgesStatus === 'loading' ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : academyBadgesStatus === 'error' ? (
                      <Pressable onPress={() => void hydrateAcademyBadges()}>
                        <Text style={[styles.promptDesc, { color: colors.textSecondary }]}>
                          {t('pages.badgesUnavailable', { defaultValue: 'Badges could not be loaded. Tap to retry.' })}
                        </Text>
                      </Pressable>
                    ) : (
                      <CivicBadgeGrid earned={badges} />
                    )}

                    {/* Next Steps Card (FIX-14) */}
                    <View style={[styles.nextStepsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.nextStepsHeader}>
                        <Ionicons name="sparkles" size={18} color="#F59E0B" />
                        <Text style={[styles.nextStepsTitle, { color: colors.text }]}>
                          {t('pages.nextStepsTitle', { defaultValue: 'Next Steps to Level Up' })}
                        </Text>
                      </View>
                      <Text style={[styles.nextStepsSubtitle, { color: colors.textSecondary }]}>
                        {t('pages.nextStepsSubtitle', {
                          defaultValue: 'Complete concrete civic actions to earn badges, grow your score, and build grassroots support.',
                        })}
                      </Text>

                      {/* Action 1: Leadership Academy */}
                      <Pressable
                        style={[styles.nextStepItem, { borderTopColor: colors.border }]}
                        onPress={() => router.push('/leadership-academy' as any)}
                      >
                        <View style={[styles.nextStepIconWrap, { backgroundColor: '#8B5CF615' }]}>
                          <Ionicons name="school-outline" size={20} color="#8B5CF6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.nextStepItemTitle, { color: colors.text }]}>
                            {t('pages.actionAcademy', { defaultValue: 'Start Leadership Academy' })}
                          </Text>
                          <Text style={[styles.nextStepItemDesc, { color: colors.textMuted }]}>
                            {t('pages.actionAcademyDesc', { defaultValue: 'Complete election modules to unlock Scholar & Strategist badges.' })}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </Pressable>

                      {/* Action 2: Report Civic Issue */}
                      <Pressable
                        style={[styles.nextStepItem, { borderTopColor: colors.border }]}
                        onPress={() => router.push('/(tabs)/dashboard' as any)}
                      >
                        <View style={[styles.nextStepIconWrap, { backgroundColor: '#EF444415' }]}>
                          <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.nextStepItemTitle, { color: colors.text }]}>
                            {t('pages.actionReport', { defaultValue: 'Report a Civic Issue' })}
                          </Text>
                          <Text style={[styles.nextStepItemDesc, { color: colors.textMuted }]}>
                            {t('pages.actionReportDesc', { defaultValue: 'Report grassroots issues in your constituency to earn the Civic Advocate badge.' })}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </Pressable>

                    </View>
              </>
            ) : (
              <View style={[styles.createPromptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="flag-outline" size={32} color={colors.primary} />
                <Text style={[styles.promptTitle, { color: colors.text }]}>
                  {t('pages.aspirantProfileTitle')}
                </Text>
                <Text style={[styles.promptDesc, { color: colors.textSecondary }]}>
                  {t('pages.aspirantOptInDescription')}
                </Text>
                <Pressable
                  style={[styles.btnActionPrimary, { backgroundColor: colors.primary }]}
                  onPress={() => setRegisterVisible(true)}
                >
                  <Text style={styles.btnActionPrimaryText}>
                    {t('pages.registerAsAspirantBtn', { defaultValue: 'Register as Civic Aspirant' })}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View style={{ height: insets.bottom + 100 }} />
      </ScrollView>

      {registerVisible && authUser && (
        <RegisterAspirantModal key={authUser.id} visible onClose={() => setRegisterVisible(false)} />
      )}

      {/* Contextual Guidance */}
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="pages"
      />

      {/* Interactive Leader Dossier & Activity Modal */}
      <LeaderProfileModal
        visible={!!selectedAspirant || Boolean(myPageModalVisible && aspirantProfile)}
        aspirant={selectedAspirant || aspirantProfile}
        onClose={() => {
          setSelectedAspirant(null);
          setMyPageModalVisible(false);
        }}
        isOwner={myPageModalVisible || (selectedAspirant ? authUser?.id === selectedAspirant.userId : false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  personalPageCard: { padding: 16, borderRadius: 18, borderWidth: 1, gap: 14, marginBottom: 16 },
  personalPageIntro: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personalPageText: { flex: 1, gap: 5 },
  personalPageDescription: { fontSize: 14, lineHeight: 20 },
  visibilityCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabLabel: {
    minWidth: 0,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  heroCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  heroTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  heroDesc: { fontSize: 12, lineHeight: 17 },
  btnRegister: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: '100%',
  },
  btnRegisterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  sectionHeading: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  aspirantCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  aspirantTopRow: { flexDirection: 'row', alignItems: 'center' },
  aspirantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '800' },
  aspirantName: { fontSize: 15, fontWeight: '700' },
  aspirantSeat: { fontSize: 12, marginTop: 2 },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },
  aspirantBio: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  aspirantStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    marginTop: 8,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  cardActions: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  btnViewPage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnViewPageText: { fontSize: 12, fontWeight: '700' },
  modalContainer: { flex: 1 },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalHeaderTitle: { fontSize: 16, fontWeight: '800' },
  modalScrollContent: { padding: 16, paddingBottom: 60 },
  modalHeroCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 14,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalAvatarInitial: { fontSize: 26, fontWeight: '900' },
  modalName: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  pillTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 6,
  },
  pillTargetText: { fontSize: 12, fontWeight: '700' },
  modalBio: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  modalSectionCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  scoreTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  scoreValue: { fontSize: 16, fontWeight: '800' },
  scoreLabel: { fontSize: 11 },
  metricsGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, borderTopWidth: 0.5, borderColor: '#CBD5E1' },
  metricBox: { alignItems: 'center' },
  metricNumber: { fontSize: 16, fontWeight: '800' },
  metricTitle: { fontSize: 11, marginTop: 2 },
  modalActionButtons: { gap: 10, marginTop: 8 },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  primaryActionText: { fontSize: 14, fontWeight: '800' },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryActionText: { fontSize: 13, fontWeight: '700' },
  btnEndorse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnEndorseText: { fontSize: 12, fontWeight: '700' },
  profileMetaCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  profileMetaName: { fontSize: 15, fontWeight: '700' },
  profileMetaSub: { fontSize: 12, marginTop: 2 },
  btnOpenDossier: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#002B7F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  btnOpenDossierText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  createPromptCard: {
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyDirectoryCard: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'flex-start',
  },
  promptTitle: { fontSize: 17, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  promptDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 18 },
  btnActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnActionPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  nextStepsCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  nextStepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  nextStepsTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  nextStepsSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  nextStepIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  nextStepItemDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
});
