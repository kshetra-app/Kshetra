/**
 * LeadershipAcademy — Full screen for aspiring leaders.
 * Shows modules grouped by category, civic score, badges, challenges, and aspirant directory.
 */
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useAspirantStore } from '../stores/aspirant';
import CivicScoreCard from '../components/CivicScoreCard';
import CivicBadgeGrid from '../components/CivicBadgeGrid';
import ChallengeCard from '../components/ChallengeCard';
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

const TABS: { key: AcademyTab; label: string; icon: string }[] = [
  { key: 'modules', label: 'Learn', icon: 'school' },
  { key: 'challenges', label: 'Challenges', icon: 'flash' },
  { key: 'badges', label: 'Badges', icon: 'ribbon' },
  { key: 'community', label: 'Aspirants', icon: 'people' },
];

export default function LeadershipAcademyScreen() {
  const [activeTab, setActiveTab] = useState<AcademyTab>('modules');
  const profile = useAspirantStore((s: any) => s.profile) as AspirantProfile | null;
  const modules = useAspirantStore((s: any) => s.modules) as LeadershipModule[];
  const badges = useAspirantStore((s: any) => s.badges) as CivicBadge[];
  const getCivicScore = useAspirantStore((s: any) => s.getCivicScore) as () => CivicScoreBreakdown | null;
  const getCompletedModules = useAspirantStore((s: any) => s.getCompletedModules) as () => string[];
  const getActiveChallenges = useAspirantStore((s: any) => s.getActiveChallenges) as () => CommunityChallenge[];
  const startModule = useAspirantStore((s: any) => s.startModule) as (id: string) => void;
  const joinChallenge = useAspirantStore((s: any) => s.joinChallenge) as (id: string) => void;
  const challengeProgress = useAspirantStore((s: any) => s.challengeProgress) as ChallengeParticipation[];
  const publicAspirants = useAspirantStore((s: any) => s.publicAspirants) as AspirantProfile[];

  const civicScore = getCivicScore();
  const completedModuleIds = getCompletedModules();
  const activeChallenges = getActiveChallenges();

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

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Leadership Academy',
          headerStyle: { backgroundColor: '#0A0A1A' },
          headerTintColor: '#FFFFFF',
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leadership Academy</Text>
        <Text style={styles.headerSubtitle}>Learn. Engage. Lead.</Text>
      </View>

      {/* Civic Score (if registered) */}
      {civicScore && (
        <View style={styles.scoreSection}>
          <CivicScoreCard score={civicScore} displayName={profile?.displayName} />
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={15} color={active ? '#FFFFFF' : '#6B7280'} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
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
                    <Text style={styles.moduleGroupCount}>{mods.length} modules</Text>
                  </View>
                  {mods.map((mod) => {
                    const isCompleted = completedModuleIds.includes(mod.id);
                    return (
                      <Pressable
                        key={mod.id}
                        style={[styles.moduleCard, isCompleted && styles.moduleCardComplete]}
                        onPress={() => startModule(mod.id)}
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
                            {mod.durationMinutes} min · {mod.contentType} · {mod.difficulty}
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
                <Text style={styles.emptyText}>No active challenges</Text>
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
              {badges.length} earned · {13 - badges.length} locked
            </Text>
            <CivicBadgeGrid earned={badges} />
          </View>
        )}

        {/* COMMUNITY TAB */}
        {activeTab === 'community' && (
          <View style={styles.tabContent}>
            <View style={styles.communityHeader}>
              <Ionicons name="people" size={18} color="#8B5CF6" />
              <Text style={styles.communityTitle}>Aspiring Leaders</Text>
            </View>
            {publicAspirants.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={48} color="#1F2937" />
                <Text style={styles.emptyText}>No public aspirants yet</Text>
              </View>
            ) : (
              publicAspirants.map((asp) => {
                const levelConfig = CIVIC_LEVEL_CONFIG[
                  asp.civicScore >= 1000 ? 'champion' :
                  asp.civicScore >= 600 ? 'leader' :
                  asp.civicScore >= 300 ? 'advocate' :
                  asp.civicScore >= 100 ? 'contributor' : 'observer'
                ];
                return (
                  <View key={asp.id} style={styles.aspirantCard}>
                    <View style={[styles.aspirantAvatar, { backgroundColor: levelConfig.color + '30' }]}>
                      <Ionicons name={levelConfig.icon as any} size={20} color={levelConfig.color} />
                    </View>
                    <View style={styles.aspirantInfo}>
                      <Text style={styles.aspirantName}>{asp.displayName}</Text>
                      <Text style={styles.aspirantBio} numberOfLines={1}>{asp.bio}</Text>
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
                      <Text style={styles.aspirantScoreLabel}>Score</Text>
                      <Text style={styles.aspirantEndorsements}>
                        {asp.communityEndorsements} endorsements
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  scoreSection: { paddingHorizontal: 16, marginBottom: 12 },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 4,
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
  tabActive: { backgroundColor: '#4F8EF7' },
  tabLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
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
  moduleGroupCount: { fontSize: 11, color: '#6B7280' },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  moduleCardComplete: { borderColor: '#10B98140' },
  moduleLeft: { marginRight: 10 },
  moduleInfo: { flex: 1 },
  moduleTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  moduleMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  premiumBadge: {
    backgroundColor: '#F59E0B20',
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
  communityTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  aspirantCard: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
    alignItems: 'center',
  },
  aspirantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aspirantInfo: { flex: 1 },
  aspirantName: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  aspirantBio: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  aspirantMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  aspirantTarget: { fontSize: 10, color: '#6B7280' },
  levelTag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  levelTagText: { fontSize: 9, fontWeight: '700' },
  aspirantScore: { alignItems: 'center', marginLeft: 8 },
  aspirantScoreValue: { fontSize: 18, fontWeight: '900' },
  aspirantScoreLabel: { fontSize: 9, color: '#6B7280', fontWeight: '600' },
  aspirantEndorsements: { fontSize: 9, color: '#6B7280', marginTop: 2 },
  // Badges
  badgeHeader: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  // Empty
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 8 },
});
