import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationsStore } from '../../stores/notifications';
import { DevFeatureSwitcher } from '../../components/DevFeatureSwitcher';
import { useTheme } from '../../lib/theme';

type Tile = { label: string; icon: string; color: string; route: string; badge?: number };

export default function MoreScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const unread = useNotificationsStore((s) => s.unreadCount);
  const [showDevModal, setShowDevModal] = useState(false);

  const go = (route: string) => {
    if (route === '__dev_switches__') {
      setShowDevModal(true);
      return;
    }
    router.push(route as any);
  };
  const tileWidth = (width - 16 * 2 - 12 * 2) / 3;

  const civic: Tile[] = [
    { label: t('more.tiles.civicDashboard', { defaultValue: 'Civic Dashboard' }), icon: 'pulse', color: colors.teal, route: '/dashboard', badge: unread || undefined },
    { label: t('more.tiles.delimitation', { defaultValue: 'Delimitation' }), icon: 'git-branch', color: colors.gold, route: '/delimitation' },
    { label: t('more.tiles.analytics', { defaultValue: 'Analytics' }), icon: 'stats-chart', color: colors.teal, route: '/analytics' },
    { label: t('more.tiles.civicMetrics', { defaultValue: 'Civic Metrics' }), icon: 'bar-chart', color: colors.success, route: '/civic-metrics' },
    { label: t('more.tiles.liveElection', { defaultValue: 'Live Election' }), icon: 'radio', color: colors.primary, route: '/live-election' },
    { label: t('more.tiles.parliament', { defaultValue: 'Parliament' }), icon: 'business', color: colors.gold, route: '/parliament' },
  ];

  const liveExchange: Tile[] = [
    { label: t('more.tiles.goLive', { defaultValue: 'Go Live' }), icon: 'radio', color: colors.primary, route: '/live/go-live' },
    { label: t('more.tiles.kshetraLive', { defaultValue: 'Kshetra Live' }), icon: 'videocam', color: colors.gold, route: '/live' },
    { label: t('more.tiles.deptConsole', { defaultValue: 'Dept. Console' }), icon: 'shield', color: colors.teal, route: '/departments/dashboard' },
    { label: t('more.tiles.moderation', { defaultValue: 'Moderation' }), icon: 'shield-half', color: colors.primary, route: '/live/moderation-queue' },
    { label: t('more.tiles.distribution', { defaultValue: 'Distribution' }), icon: 'share-social', color: colors.teal, route: '/live/distribution' },
    { label: t('more.tiles.devSwitches', { defaultValue: 'Dev Switches' }), icon: 'toggle', color: colors.gold, route: '__dev_switches__' },
  ];

  const account: Tile[] = [
    { label: t('more.tiles.profile', { defaultValue: 'Profile' }), icon: 'person', color: colors.primary, route: '/profile' },
    { label: t('more.tiles.notifications', { defaultValue: 'Notifications' }), icon: 'notifications', color: colors.primary, route: '/notifications', badge: unread || undefined },
    { label: t('more.tiles.settings', { defaultValue: 'Settings' }), icon: 'settings', color: colors.textSecondary, route: '/notification-settings' },
    { label: t('more.tiles.aiAssistant', { defaultValue: 'AI Assistant' }), icon: 'sparkles', color: colors.gold, route: '/ai-chat' },
  ];

  const campaign: Tile[] = [
    { label: t('more.tiles.politicianPortal', { defaultValue: 'Politician Portal' }), icon: 'people', color: colors.gold, route: '/politician-portal' },
    { label: t('more.tiles.becomeAspirant', { defaultValue: 'Become Aspirant' }), icon: 'rocket', color: colors.primary, route: '/become-aspirant' },
    { label: t('more.tiles.campaignManager', { defaultValue: 'Campaign Manager' }), icon: 'megaphone', color: colors.primary, route: '/campaign-manager' },
    { label: t('more.tiles.leadershipAcademy', { defaultValue: 'Leadership Academy' }), icon: 'school', color: colors.gold, route: '/leadership-academy' },
    { label: t('more.tiles.candidateXRay', { defaultValue: 'Candidate X-Ray' }), icon: 'scan', color: colors.teal, route: '/candidate-xray' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('more.title', { defaultValue: t('tabs.more', { defaultValue: 'More' }) })}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('more.subtitle', { defaultValue: 'Everything else, two taps away' })}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Featured: Politicians & Campaign HQ */}
        <Pressable
          style={[styles.featured, { backgroundColor: colors.primary, borderColor: colors.goldBorder || colors.gold, borderWidth: 1 }]}
          onPress={() => go('/politician-portal')}
        >
          <View style={styles.featuredGlow} />
          <View style={styles.featuredLeft}>
            <View style={[styles.featuredIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="megaphone" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featuredTitle}>{t('more.campaignHQTitle', { defaultValue: 'Campaign HQ' })}</Text>
              <Text style={styles.featuredSub}>
                {t('more.campaignHQDesc', { defaultValue: 'Run for office, manage campaigns, reach voters on WhatsApp, SMS & calls' })}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </Pressable>

        <Section title={t('more.sections.politiciansAndCampaign', { defaultValue: 'Politicians & Campaign' })} tiles={campaign} tileWidth={tileWidth} onPress={go} />
        <Section title={t('more.sections.liveMediaExchange', { defaultValue: 'Live Media Exchange' })} tiles={liveExchange} tileWidth={tileWidth} onPress={go} />
        <Section title={t('more.sections.civicAndElections', { defaultValue: 'Civic & Elections' })} tiles={civic} tileWidth={tileWidth} onPress={go} />
        <Section title={t('more.sections.account', { defaultValue: 'Account' })} tiles={account} tileWidth={tileWidth} onPress={go} />
      </ScrollView>

      <DevFeatureSwitcher
        visible={showDevModal}
        onClose={() => setShowDevModal(false)}
      />
    </View>
  );
}

function Section({
  title, tiles, tileWidth, onPress,
}: { title: string; tiles: Tile[]; tileWidth: number; onPress: (r: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Pressable key={tile.route} style={[styles.tile, { width: tileWidth }]} onPress={() => onPress(tile.route)}>
            <View style={[styles.tileIcon, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
              <Ionicons name={tile.icon as any} size={22} color={tile.color} />
              {!!tile.badge && (
                <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
                  <Text style={styles.badgeText}>{tile.badge > 9 ? '9+' : tile.badge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tileLabel, { color: colors.text }]} numberOfLines={2}>{tile.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  featured: {
    marginHorizontal: 16, marginTop: 6, marginBottom: 8,
    borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    overflow: 'hidden',
  },
  featuredGlow: {
    position: 'absolute', top: -40, right: -30, width: 120, height: 120,
    borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)',
  },
  featuredLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  featuredIcon: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  featuredTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  featuredSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2, lineHeight: 16 },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '800', paddingHorizontal: 16, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  tile: { alignItems: 'center', gap: 6 },
  tileIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  tileLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
    borderWidth: 2,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
});
