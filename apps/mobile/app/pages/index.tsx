import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { useAspirantStore } from '../../stores/aspirant';
import { useAuthStore } from '../../stores/auth';
import { useUserProfileStore } from '../../stores/userProfile';
import { canCreatePage } from '../../lib/pageGating';
import { fetchVerifiedPoliticians } from '../../lib/supabaseDataService';
import RegisterAspirantModal from '../../components/RegisterAspirantModal';
import CivicScoreCard from '../../components/CivicScoreCard';
import CivicBadgeGrid from '../../components/CivicBadgeGrid';

type PageTab = 'aspirants' | 'politicians' | 'my_page';

export default function PagesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<PageTab>(() => {
    if (tab === 'my_page' || tab === 'aspirants' || tab === 'politicians') {
      return tab;
    }
    return 'aspirants';
  });
  const [refreshing, setRefreshing] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [verifiedPoliticians, setVerifiedPoliticians] = useState<any[]>([]);
  const [loadingPoliticians, setLoadingPoliticians] = useState(false);

  const authUser = useAuthStore((s) => s.user);
  const userProfile = useUserProfileStore((s) => s.profile);

  // Aspirant store
  const aspirantProfile = useAspirantStore((s) => s.profile);
  const publicAspirants = useAspirantStore((s) => s.publicAspirants);
  const getCivicScore = useAspirantStore((s) => s.getCivicScore);
  const badges = useAspirantStore((s) => s.badges);
  const endorseAspirant = useAspirantStore((s) => s.endorseAspirant);
  const endorsedIds = useAspirantStore((s) => s.endorsedIds);
  const hydrateAspirants = useAspirantStore((s) => s.hydrateAspirants);

  const loadPoliticians = useCallback(async () => {
    setLoadingPoliticians(true);
    const data = await fetchVerifiedPoliticians();
    setVerifiedPoliticians(data ?? []);
    setLoadingPoliticians(false);
  }, []);

  useEffect(() => {
    hydrateAspirants();
    loadPoliticians();
  }, [hydrateAspirants, loadPoliticians]);

  useEffect(() => {
    if (tab === 'my_page' || tab === 'aspirants' || tab === 'politicians') {
      setActiveTab(tab);
    }
  }, [tab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([hydrateAspirants(), loadPoliticians()]);
    setRefreshing(false);
  }, [hydrateAspirants, loadPoliticians]);

  const userCanCreate = canCreatePage(userProfile?.role);
  const civicScore = getCivicScore();

  const handleInviteEndorsements = useCallback(async () => {
    try {
      await Share.share({
        message: `Support my civic journey as an aspirant on Kshetra! Check out my profile and endorse my vision for ${aspirantProfile?.targetConstituencyName || 'our community'}: https://kshetra.app/aspirant/${aspirantProfile?.id || ''}`,
      });
    } catch {
      // User cancelled or share dismissed
    }
  }, [aspirantProfile]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('pages.screenTitle', { defaultValue: 'Pages & Leaders' }),
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
        }}
      />

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[
            styles.tab,
            activeTab === 'aspirants' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('aspirants')}
        >
          <Ionicons
            name={activeTab === 'aspirants' ? 'rocket' : 'rocket-outline'}
            size={18}
            color={activeTab === 'aspirants' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'aspirants' ? colors.primary : colors.textMuted },
            ]}
          >
            {t('pages.tabAspirants', { defaultValue: 'Civic Aspirants' })}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            activeTab === 'politicians' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('politicians')}
        >
          <Ionicons
            name={activeTab === 'politicians' ? 'people' : 'people-outline'}
            size={18}
            color={activeTab === 'politicians' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'politicians' ? colors.primary : colors.textMuted },
            ]}
          >
            {t('pages.tabPoliticians', { defaultValue: 'Representatives' })}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            activeTab === 'my_page' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('my_page')}
        >
          <Ionicons
            name={activeTab === 'my_page' ? 'person-circle' : 'person-circle-outline'}
            size={18}
            color={activeTab === 'my_page' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'my_page' ? colors.primary : colors.textMuted },
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
                onPress={() => {
                  if (aspirantProfile) {
                    setActiveTab('my_page'); // go view the existing profile, don't reopen the create form
                  } else {
                    setRegisterVisible(true);
                  }
                }}
              >
                <Text style={styles.btnRegisterText}>
                  {aspirantProfile ? t('pages.viewProfile', { defaultValue: 'My Profile' }) : t('pages.becomeAspirant', { defaultValue: 'Join Directory' })}
                </Text>
              </Pressable>
            </View>

            {/* Aspirants Directory */}
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              {t('pages.verifiedAspirants', { defaultValue: 'Verified Civic Aspirants' })} ({publicAspirants.length})
            </Text>

            {publicAspirants.map((asp) => {
              const isEndorsed = endorsedIds.includes(asp.id);
              return (
                <View key={asp.id} style={[styles.aspirantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.aspirantTopRow}>
                    <View style={[styles.aspirantAvatar, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                        {asp.displayName.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.aspirantName, { color: colors.text }]}>{asp.displayName}</Text>
                      <Text style={[styles.aspirantSeat, { color: colors.textMuted }]}>
                        {asp.targetConstituencyName ? `Aiming for ${asp.targetConstituencyName} · ${asp.targetElectionYear}` : 'Civic Candidate'}
                      </Text>
                    </View>
                    <View style={[styles.scoreBadge, { backgroundColor: '#F0FDF4' }]}>
                      <Ionicons name="trophy" size={12} color="#16A34A" />
                      <Text style={styles.scoreText}>{asp.civicScore} pts</Text>
                    </View>
                  </View>

                  {asp.bio ? (
                    <Text style={[styles.aspirantBio, { color: colors.textSecondary }]} numberOfLines={2}>
                      {asp.bio}
                    </Text>
                  ) : null}

                  <View style={styles.aspirantStatsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>{asp.issuesReported}</Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>Issues</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>{asp.communityEndorsements}</Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>Endorsements</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>{asp.modulesCompleted}</Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>Modules</Text>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable
                      style={[
                        styles.btnEndorse,
                        isEndorsed
                          ? { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }
                          : { backgroundColor: colors.primary },
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
                </View>
              );
            })}
          </View>
        )}

        {/* ─── TAB 2: POLITICIANS & REPRESENTATIVES ─── */}
        {activeTab === 'politicians' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              {t('pages.registeredPoliticians', { defaultValue: 'Registered Representatives & Parties' })}
            </Text>
            {verifiedPoliticians.length > 0 ? (
              verifiedPoliticians.map((p) => (
                <View
                  key={p.id || p.user_id}
                  style={[styles.aspirantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.aspirantTopRow}>
                    <View style={[styles.aspirantAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.avatarInitial, { color: '#FFFFFF' }]}>
                        {(p.display_name || 'R').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.aspirantName, { color: colors.text }]}>{p.display_name}</Text>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginLeft: 4 }} />
                      </View>
                      <Text style={[styles.aspirantSeat, { color: colors.textMuted }]}>
                        {p.constituency ? `${p.constituency} · ` : ''}{p.state || t('pages.verifiedOfficial', { defaultValue: 'Verified Representative' })}
                      </Text>
                    </View>
                  </View>
                  {p.bio ? (
                    <Text style={[styles.aspirantBio, { color: colors.textSecondary }]} numberOfLines={2}>
                      {p.bio}
                    </Text>
                  ) : null}
                  <View style={styles.cardActions}>
                    <Pressable
                      style={[styles.btnEndorse, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => router.push(`/user/${p.user_id}` as any)}
                    >
                      <Ionicons name="person-outline" size={14} color="#FFFFFF" />
                      <Text style={[styles.btnEndorseText, { color: '#FFFFFF' }]}>
                        {t('pages.viewProfile', { defaultValue: 'View Profile' })}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.createPromptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="shield-checkmark-outline" size={44} color={colors.textMuted} />
                <Text style={[styles.promptTitle, { color: colors.text }]}>
                  {t('pages.noPoliticiansTitle', { defaultValue: 'No Verified Representatives Yet' })}
                </Text>
                <Text style={[styles.promptDesc, { color: colors.textMuted }]}>
                  {t('pages.noPoliticiansDesc', {
                    defaultValue: 'Official elected representatives and verified party leaders will appear here once authenticated on Kshetra. Real public figures require KYC verification.',
                  })}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ─── TAB 3: MY PAGE ─── */}
        {activeTab === 'my_page' && (
          <View style={styles.tabContent}>
            {aspirantProfile || userCanCreate ? (
              <>
                {aspirantProfile ? (
                  <>
                    {civicScore ? (
                      <CivicScoreCard score={civicScore} displayName={aspirantProfile.displayName} />
                    ) : null}
                    <View style={[styles.profileMetaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Ionicons name="rocket" size={20} color="#06B6D4" />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.profileMetaName, { color: colors.text }]}>{aspirantProfile.displayName}</Text>
                        <Text style={[styles.profileMetaSub, { color: colors.textMuted }]}>
                          {aspirantProfile.targetConstituencyName
                            ? `Civic Candidate · ${aspirantProfile.targetConstituencyName} (${aspirantProfile.targetElectionYear})`
                            : 'Civic Aspirant Profile Active'}
                        </Text>
                      </View>
                    </View>
                    <CivicBadgeGrid earned={badges} />

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

                      {/* Action 3: Invite Endorsement */}
                      <Pressable
                        style={[styles.nextStepItem, { borderTopColor: colors.border }]}
                        onPress={handleInviteEndorsements}
                      >
                        <View style={[styles.nextStepIconWrap, { backgroundColor: '#10B98115' }]}>
                          <Ionicons name="people-outline" size={20} color="#10B981" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.nextStepItemTitle, { color: colors.text }]}>
                            {t('pages.actionEndorse', { defaultValue: 'Invite Your First Endorsement' })}
                          </Text>
                          <Text style={[styles.nextStepItemDesc, { color: colors.textMuted }]}>
                            {t('pages.actionEndorseDesc', { defaultValue: 'Share your civic profile with voters to unlock the Community Champion badge.' })}
                          </Text>
                        </View>
                        <Ionicons name="share-social-outline" size={16} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <View style={[styles.createPromptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="create-outline" size={40} color={colors.primary} />
                    <Text style={[styles.promptTitle, { color: colors.text }]}>
                      {t('pages.claimPageTitle', { defaultValue: 'Launch Your Official Page' })}
                    </Text>
                    <Text style={[styles.promptDesc, { color: colors.textSecondary }]}>
                      {t('pages.claimPageDesc', {
                        defaultValue: 'You are eligible to create an official candidate or public representative page on Kshetra.',
                      })}
                    </Text>
                    <Pressable
                      style={[styles.btnActionPrimary, { backgroundColor: colors.primary }]}
                      onPress={() => setRegisterVisible(true)}
                    >
                      <Text style={styles.btnActionPrimaryText}>
                        {t('pages.createPageBtn', { defaultValue: 'Create Official Page' })}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.createPromptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.promptTitle, { color: colors.text }]}>
                  {t('pages.citizenAccount', { defaultValue: 'Citizen Profile' })}
                </Text>
                <Text style={[styles.promptDesc, { color: colors.textSecondary }]}>
                  {t('pages.citizenAccountDesc', {
                    defaultValue: 'Page creation is available to Candidates, Aspirants, Parties, and Journalists. Want to run for office in your constituency?',
                  })}
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

      <RegisterAspirantModal
        visible={registerVisible}
        onClose={() => setRegisterVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  heroCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  heroDesc: { fontSize: 12, lineHeight: 17 },
  btnRegister: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
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
  cardActions: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end' },
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
  createPromptCard: {
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  promptTitle: { fontSize: 17, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  promptDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 18 },
  btnActionPrimary: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnActionPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
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
