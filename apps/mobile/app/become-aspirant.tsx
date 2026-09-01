/**
 * BecomeAspirant — focused screen for the "Become an Aspirant" flow.
 *
 * This is intentionally separate from the Leadership Academy (which holds the
 * learning modules). Here the user creates/owns a civic aspirant profile,
 * sees their civic score & badges, browses fellow aspirants, and can jump to
 * the Academy to learn. No learning-module content lives on this screen.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../lib/responsive';
import { useAspirantStore } from '../stores/aspirant';
import CivicScoreCard from '../components/CivicScoreCard';
import CivicBadgeGrid from '../components/CivicBadgeGrid';
import RegisterAspirantModal from '../components/RegisterAspirantModal';
import {
  CIVIC_LEVEL_CONFIG,
  type AspirantProfile,
  type CivicBadge,
  type CivicScoreBreakdown,
} from '../lib/aspirantTypes';
import { useTheme } from '../lib/theme';

export default function BecomeAspirantScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const [registerVisible, setRegisterVisible] = useState(false);

  const profile = useAspirantStore((s: any) => s.profile) as AspirantProfile | null;
  const badges = useAspirantStore((s: any) => s.badges) as CivicBadge[];
  const getCivicScore = useAspirantStore((s: any) => s.getCivicScore) as () => CivicScoreBreakdown | null;
  const publicAspirants = useAspirantStore((s: any) => s.publicAspirants) as AspirantProfile[];
  const endorseAspirant = useAspirantStore((s: any) => s.endorseAspirant) as (id: string) => void;
  const endorsedIds = useAspirantStore((s: any) => s.endorsedIds) as string[];

  const civicScore = getCivicScore();
  const { insets } = useResponsive();

  const benefits = [
    { icon: 'trophy', title: t('becomeAspirant.benefits.scoreTitle', { defaultValue: 'Build a civic score' }), sub: t('becomeAspirant.benefits.scoreSub', { defaultValue: 'Earn points for learning, engagement & community work.' }) },
    { icon: 'ribbon', title: t('becomeAspirant.benefits.badgeTitle', { defaultValue: 'Unlock badges' }), sub: t('becomeAspirant.benefits.badgeSub', { defaultValue: 'Showcase verified milestones on your public profile.' }) },
    { icon: 'people', title: t('becomeAspirant.benefits.endorseTitle', { defaultValue: 'Get endorsed' }), sub: t('becomeAspirant.benefits.endorseSub', { defaultValue: 'Let citizens in your constituency back your candidacy.' }) },
    { icon: 'megaphone', title: t('becomeAspirant.benefits.goalTitle', { defaultValue: 'Declare your goal' }), sub: t('becomeAspirant.benefits.goalSub', { defaultValue: 'Tell voters which seat and election year you aim for.' }) },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('becomeAspirant.screenTitle', { defaultValue: 'Become an Aspirant' }),
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
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('becomeAspirant.headerTitle', { defaultValue: 'Civic Aspirants' })}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {t('becomeAspirant.headerSubtitle', { defaultValue: 'Build credentials, earn endorsements' })}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {civicScore ? (
            <>
              {/* Registered: show civic score + badges */}
              <CivicScoreCard score={civicScore} displayName={profile?.displayName} />

              <View style={styles.profileMetaCard}>
                <Ionicons name="rocket" size={18} color="#06B6D4" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileMetaName}>{profile?.displayName}</Text>
                  {profile?.targetConstituencyName ? (
                    <Text style={styles.profileMetaSub}>
                      {t('becomeAspirant.aspiringIn', { seat: profile.targetConstituencyName, year: profile.targetElectionYear, defaultValue: `Aspiring · ${profile.targetConstituencyName} · ${profile.targetElectionYear}` })}
                    </Text>
                  ) : (
                    <Text style={styles.profileMetaSub}>
                      {t('becomeAspirant.profileActive', { defaultValue: 'Civic aspirant profile active' })}
                    </Text>
                  )}
                </View>
              </View>

              <Text style={styles.sectionTitle}>{t('becomeAspirant.yourBadges', { defaultValue: 'Your Badges' })}</Text>
              <Text style={styles.sectionSub}>
                {t('becomeAspirant.earnedLocked', { earned: badges.length, locked: 13 - badges.length, defaultValue: `${badges.length} earned · ${13 - badges.length} locked` })}
              </Text>
              <CivicBadgeGrid earned={badges} />
            </>
          ) : (
            <>
              {/* Not registered: hero + benefits + CTA */}
              <View style={styles.hero}>
                <View style={styles.heroIcon}>
                  <Ionicons name="rocket" size={30} color="#06B6D4" />
                </View>
                <Text style={styles.heroTitle}>{t('becomeAspirant.heroTitle', { defaultValue: 'Step up for your community' })}</Text>
                <Text style={styles.heroSub}>
                  {t('becomeAspirant.heroSub', { defaultValue: 'Build your verified civic record and earn community trust before seeking election.' })}
                </Text>
              </View>

              <View style={styles.benefits}>
                {benefits.map((b) => (
                  <View key={b.title} style={styles.benefitRow}>
                    <View style={styles.benefitIcon}>
                      <Ionicons name={b.icon as any} size={18} color="#06B6D4" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.benefitTitle}>{b.title}</Text>
                      <Text style={styles.benefitSub}>{b.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <Pressable style={styles.cta} onPress={() => setRegisterVisible(true)}>
                <Ionicons name="rocket" size={18} color="#FFFFFF" />
                <Text style={styles.ctaText}>{t('becomeAspirant.registerCTA', { defaultValue: 'Register as Aspirant' })}</Text>
              </Pressable>
            </>
          )}

          {/* Learn link → Leadership Academy (kept separate) */}
          <Pressable style={styles.learnLink} onPress={() => router.push('/leadership-academy' as any)}>
            <Ionicons name="school" size={16} color="#8B5CF6" />
            <Text style={styles.learnLinkText}>Want to learn first? Open Leadership Academy</Text>
            <Ionicons name="chevron-forward" size={16} color="#6B7280" />
          </Pressable>

          {/* Community of aspirants */}
          <View style={styles.communityHeader}>
            <Ionicons name="people" size={18} color="#8B5CF6" />
            <Text style={styles.communityTitle}>Fellow Aspirants</Text>
          </View>
          {publicAspirants.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={44} color="#1F2937" />
              <Text style={styles.emptyText}>No public aspirants yet — be the first!</Text>
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
                      <Text style={styles.aspirantScoreLabel}>Score</Text>
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
                      {isEndorsed ? 'Endorsed' : 'Endorse'}
                    </Text>
                    <Text style={styles.endorseCount}>· {asp.communityEndorsements}</Text>
                  </Pressable>
                </View>
              );
            })
          )}

          <View style={{ height: Math.max(insets.bottom, 20) + 40 }} />
        </View>
      </ScrollView>

      {/* Registration modal */}
      <RegisterAspirantModal
        visible={registerVisible}
        onClose={() => setRegisterVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '800' },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  // Hero
  hero: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  heroIcon: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
  },
  heroTitle: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  heroSub: { fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },
  // Benefits
  benefits: { marginTop: 14, gap: 10 },
  benefitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 12,
    borderWidth: 1,
  },
  benefitIcon: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  benefitTitle: { fontSize: 14, fontWeight: '800' },
  benefitSub: { fontSize: 12, marginTop: 2 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 15, marginTop: 18,
  },
  ctaText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  // Registered profile meta
  profileMetaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 14, marginTop: 12,
    borderWidth: 1,
  },
  profileMetaName: { fontSize: 15, fontWeight: '800' },
  profileMetaSub: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 20 },
  sectionSub: { fontSize: 12, marginTop: 2, marginBottom: 10 },
  // Learn link
  learnLink: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 14, marginTop: 18,
    borderWidth: 1,
  },
  learnLinkText: { flex: 1, fontSize: 13, fontWeight: '700' },
  // Community
  communityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 12 },
  communityTitle: { fontSize: 17, fontWeight: '700' },
  aspirantCard: {
    borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1,
  },
  aspirantRow: { flexDirection: 'row', alignItems: 'center' },
  aspirantAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
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
  endorseBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 10, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1,
  },
  endorseBtnDone: {},
  endorseText: { fontSize: 12, fontWeight: '700' },
  endorseCount: { fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, fontWeight: '700', marginTop: 8 },
});
