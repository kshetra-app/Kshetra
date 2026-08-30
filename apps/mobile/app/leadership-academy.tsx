/**
 * LeadershipAcademy — Full screen for aspiring leaders.
 * Shows modules grouped by category, civic score, badges, challenges, and aspirant directory.
 */
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useResponsive } from '../lib/responsive';
import { useAspirantStore } from '../stores/aspirant';
import { useTheme } from '../lib/theme';
import CivicScoreCard from '../components/CivicScoreCard';
import CivicBadgeGrid from '../components/CivicBadgeGrid';
import ChallengeCard from '../components/ChallengeCard';
import ModuleDetailModal from '../components/ModuleDetailModal';
import RegisterAspirantModal from '../components/RegisterAspirantModal';
import {
  MODULE_CATEGORY_CONFIG,
  CIVIC_LEVEL_CONFIG,
  type ModuleCategory,
  type LeadershipModule,
  type AspirantProfile,
  type CivicBadge,
  type CivicScoreBreakdown,
  type CommunityChallenge,
  type ChallengeParticipation,
} from '../lib/aspirantTypes';

type AcademyTab = 'modules' | 'challenges' | 'badges' | 'community';

const TAB_KEYS: { key: AcademyTab; tKey: string; icon: string }[] = [
  { key: 'modules', tKey: 'leadershipAcademy.tabs.modules', icon: 'school' },
  { key: 'challenges', tKey: 'leadershipAcademy.tabs.challenges', icon: 'flash' },
  { key: 'badges', tKey: 'leadershipAcademy.badges', icon: 'ribbon' },
  { key: 'community', tKey: 'leadershipAcademy.becomeAspirant', icon: 'people' },
];

export default function LeadershipAcademyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<AcademyTab>('modules');
  const [selectedModule, setSelectedModule] = useState<LeadershipModule | null>(null);
  const [registerVisible, setRegisterVisible] = useState(false);
  const profile = useAspirantStore((s: any) => s.profile) as AspirantProfile | null;
  const modules = useAspirantStore((s: any) => s.modules) as LeadershipModule[];
  const badges = useAspirantStore((s: any) => s.badges) as CivicBadge[];
  const getCivicScore = useAspirantStore((s: any) => s.getCivicScore) as () => CivicScoreBreakdown | null;
  const getCompletedModules = useAspirantStore((s: any) => s.getCompletedModules) as () => string[];
  const getActiveChallenges = useAspirantStore((s: any) => s.getActiveChallenges) as () => CommunityChallenge[];
  const startModule = useAspirantStore((s: any) => s.startModule) as (id: string) => void;
  const completeModule = useAspirantStore((s: any) => s.completeModule) as (id: string, quizScore?: number) => void;
  const joinChallenge = useAspirantStore((s: any) => s.joinChallenge) as (id: string) => void;
  const challengeProgress = useAspirantStore((s: any) => s.challengeProgress) as ChallengeParticipation[];
  const publicAspirants = useAspirantStore((s: any) => s.publicAspirants) as AspirantProfile[];
  const endorseAspirant = useAspirantStore((s: any) => s.endorseAspirant) as (id: string) => void;
  const endorsedIds = useAspirantStore((s: any) => s.endorsedIds) as string[];

  const civicScore = getCivicScore();
  const completedModuleIds = getCompletedModules();
  const activeChallenges = getActiveChallenges();

  const openModule = (mod: LeadershipModule) => {
    startModule(mod.id);
    setSelectedModule(mod);
  };

  // Group modules by category
  const moduleGroups = useMemo(() => {
    const groups = new Map<ModuleCategory, LeadershipModule[]>();
    for (const m of modules) {
      const arr = groups.get(m.category) || [];
      arr.push(m);
      groups.set(m.category, arr);
    }
    return Array.from(groups.entries());
  }, [modules]);

  const { insets } = useResponsive();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('leadershipAcademy.title'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
        }}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('leadershipAcademy.title')}</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted, marginLeft: 34 }]}>{t('leadershipAcademy.subtitle')}</Text>
      </View>

      {/* Civic Score (if registered) */}
      {civicScore ? (
        <View style={styles.scoreSection}>
          <CivicScoreCard score={civicScore} displayName={profile?.displayName} />
        </View>
      ) : (
        <Pressable style={styles.registerCta} onPress={() => setRegisterVisible(true)}>
          <View style={styles.registerIcon}>
            <Ionicons name="rocket" size={20} color="#06B6D4" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.registerTitle}>{t('leadershipAcademy.becomeAspirant')}</Text>
            <Text style={styles.registerSub}>{t('leadershipAcademy.aspirantDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
        </Pressable>
      )}

      {/* Tab bar */}
      <View style={styles.tabRow}>
        {TAB_KEYS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={15} color={active ? '#FFFFFF' : '#6B7280'} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t(tab.tKey)}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* MODULES TAB */}
        {activeTab === 'modules' && (
          <View style={styles.tabContent}>
            {moduleGroups.map(([category, mods]) => {
              const catConfig = MODULE_CATEGORY_CONFIG[category];
              return (
                <View key={category} style={styles.moduleGroup}>
                  <View style={styles.moduleGroupHeader}>
                    <Ionicons name={catConfig.icon as any} size={16} color={catConfig.color} />
                    <Text style={[styles.moduleGroupTitle, { color: catConfig.color }]}>
                      {catConfig.label}
                    </Text>
                    <Text style={styles.moduleGroupCount}>{t('leadershipAcademy.moduleCount', { count: mods.length })}</Text>
                  </View>
                  {mods.map((mod) => {
                    const isCompleted = completedModuleIds.includes(mod.id);
                    return (
                      <Pressable
                        key={mod.id}
                        style={[styles.moduleCard, isCompleted && styles.moduleCardComplete]}
                        onPress={() => openModule(mod)}
                      >
                        <View style={styles.moduleLeft}>
                          <Ionicons
                            name={isCompleted ? 'checkmark-circle' : 'play-circle'}
                            size={20}
                            color={isCompleted ? '#10B981' : catConfig.color}
                          />
                        </View>
                        <View style={styles.moduleInfo}>
                          <Text style={styles.moduleTitle}>{mod.title}</Text>
                          <Text style={styles.moduleMeta}>
                            {mod.durationMinutes} {t('leadershipAcademy.min')} · {mod.contentType} · {mod.difficulty}
                          </Text>
                        </View>
                        {mod.isPremium && (
                          <View style={styles.premiumBadge}>
                            <Ionicons name="diamond" size={10} color="#F59E0B" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}

        {/* CHALLENGES TAB */}
        {activeTab === 'challenges' && (
          <View style={styles.tabContent}>
            {activeChallenges.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="flash-outline" size={48} color="#1F2937" />
                <Text style={styles.emptyText}>{t('leadershipAcademy.noActiveChallenges')}</Text>
              </View>
            ) : (
              activeChallenges.map((ch) => (
                <ChallengeCard
                  key={ch.id}
                  challenge={ch}
                  participation={challengeProgress.find((cp) => cp.challengeId === ch.id)}
                  onJoin={() => joinChallenge(ch.id)}
                />
              ))
            )}
          </View>
        )}

        {/* BADGES TAB */}
        {activeTab === 'badges' && (
          <View style={styles.tabContent}>
            <Text style={styles.badgeHeader}>
              {badges.length} {t('leadershipAcademy.earned')} · {13 - badges.length} {t('leadershipAcademy.locked')}
            </Text>
            <CivicBadgeGrid earned={badges} />
          </View>
        )}

        {/* COMMUNITY TAB */}
        {activeTab === 'community' && (
          <View style={styles.tabContent}>
            <View style={styles.communityHeader}>
              <Ionicons name="people" size={18} color="#8B5CF6" />
              <Text style={styles.communityTitle}>{t('leadershipAcademy.aspiringLeaders')}</Text>
            </View>
            {publicAspirants.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={48} color="#1F2937" />
                <Text style={styles.emptyText}>{t('leadershipAcademy.noPublicAspirants')}</Text>
              </View>
            ) : (
              publicAspirants.map((asp) => {
                const levelConfig = CIVIC_LEVEL_CONFIG[
                  asp.civicScore >= 1000 ? 'champion' :
                  asp.civicScore >= 600 ? 'leader' :
                  asp.civicScore >= 300 ? 'advocate' :
                  asp.civicScore >= 100 ? 'contributor' : 'observer'
                ];
                const isEndorsed = endorsedIds.includes(asp.id);
                return (
                  <View key={asp.id} style={styles.aspirantCard}>
                    <View style={styles.aspirantRow}>
                      <View style={[styles.aspirantAvatar, { backgroundColor: levelConfig.color + '30' }]}>
                        <Ionicons name={levelConfig.icon as any} size={20} color={levelConfig.color} />
                      </View>
                      <View style={styles.aspirantInfo}>
                        <Text style={styles.aspirantName}>{asp.displayName}</Text>
                        <Text style={styles.aspirantBio} numberOfLines={2}>{asp.bio}</Text>
                        <View style={styles.aspirantMeta}>
                          {asp.targetConstituencyName && (
                            <Text style={styles.aspirantTarget}>
                              {asp.targetConstituencyName} · {asp.targetElectionYear}
                            </Text>
                          )}
                          <View style={[styles.levelTag, { backgroundColor: levelConfig.color + '20' }]}>
                            <Text style={[styles.levelTagText, { color: levelConfig.color }]}>
                              {levelConfig.label}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.aspirantScore}>
                        <Text style={[styles.aspirantScoreValue, { color: levelConfig.color }]}>
                          {asp.civicScore}
                        </Text>
                        <Text style={styles.aspirantScoreLabel}>{t('leadershipAcademy.civicScore')}</Text>
                      </View>
                    </View>
                    <Pressable
                      style={[styles.endorseBtn, isEndorsed && styles.endorseBtnDone]}
                      onPress={() => !isEndorsed && endorseAspirant(asp.id)}
                      disabled={isEndorsed}
                    >
                      <Ionicons
                        name={isEndorsed ? 'heart' : 'heart-outline'}
                        size={15}
                        color={isEndorsed ? '#EF4444' : '#9CA3AF'}
                      />
                      <Text style={[styles.endorseText, isEndorsed && { color: '#EF4444' }]}>
                        {isEndorsed ? t('leadershipAcademy.endorsed') : t('leadershipAcademy.endorse')}
                      </Text>
                      <Text style={styles.endorseCount}>· {asp.communityEndorsements}</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: Math.max(insets.bottom, 20) + 40 }} />
      </ScrollView>

      {/* Module reader */}
      <ModuleDetailModal
        visible={!!selectedModule}
        module={selectedModule}
        isCompleted={selectedModule ? completedModuleIds.includes(selectedModule.id) : false}
        onClose={() => setSelectedModule(null)}
        onComplete={(quizScore?: number) => {
          if (selectedModule) completeModule(selectedModule.id, quizScore);
          setSelectedModule(null);
        }}
      />

      {/* Aspirant registration */}
      <RegisterAspirantModal
        visible={registerVisible}
        onClose={() => setRegisterVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  scoreSection: { paddingHorizontal: 16, marginBottom: 12 },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  tabActive: {},
  tabLabel: { fontSize: 12, fontWeight: '700' },
  tabLabelActive: { color: '#FFFFFF' },
  scroll: { flex: 1 },
  tabContent: { paddingHorizontal: 16 },
  // Modules
  moduleGroup: { marginBottom: 20 },
  moduleGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  moduleGroupTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  moduleGroupCount: { fontSize: 11 },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
  },
  moduleCardComplete: { borderColor: '#10B98140' },
  moduleLeft: { marginRight: 10 },
  moduleInfo: { flex: 1 },
  moduleTitle: { fontSize: 13, fontWeight: '700' },
  moduleMeta: { fontSize: 11, marginTop: 2 },
  premiumBadge: {
    borderRadius: 6,
    padding: 4,
  },
  // Community
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  communityTitle: { fontSize: 17, fontWeight: '700' },
  aspirantCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  aspirantRow: { flexDirection: 'row', alignItems: 'center' },
  endorseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  endorseBtnDone: {},
  endorseText: { fontSize: 12, fontWeight: '700' },
  endorseCount: { fontSize: 11 },
  // Register CTA
  registerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  registerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerTitle: { fontSize: 15, fontWeight: '800' },
  registerSub: { fontSize: 12, marginTop: 2 },
  aspirantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aspirantInfo: { flex: 1 },
  aspirantName: { fontSize: 14, fontWeight: '800' },
  aspirantBio: { fontSize: 11, marginTop: 2 },
  aspirantMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  aspirantTarget: { fontSize: 10 },
  levelTag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  levelTagText: { fontSize: 9, fontWeight: '700' },
  aspirantScore: { alignItems: 'center', marginLeft: 8 },
  aspirantScoreValue: { fontSize: 18, fontWeight: '900' },
  aspirantScoreLabel: { fontSize: 9, fontWeight: '600' },
  aspirantEndorsements: { fontSize: 9, marginTop: 2 },
  // Badges
  badgeHeader: { fontSize: 13, marginBottom: 12 },
  // Empty
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '700', marginTop: 8 },
});
