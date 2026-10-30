import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationsStore } from '../../stores/notifications';
import { DevFeatureSwitcher } from '../../components/DevFeatureSwitcher';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
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
  const [showDiscoveryHub, setShowDiscoveryHub] = useState(false);

  const go = (route: string) => {
    if (route === '__dev_switches__') {
      setShowDevModal(true);
      return;
    }
    if (route === '/candidate-xray') {
      Alert.alert(
        t('more.tiles.candidateXRay', { defaultValue: 'Candidate X-Ray' }),
        t('discovery.features.candidateXRay.notice', {
          defaultValue:
            'Candidate X-Ray is an affidavit and criminal/wealth scanner. Please select a candidate from Legislator Profiles, Representatives, or Election results to inspect their verified records.',
        }),
      );
      return;
    }
    router.push(route as any);
  };
  const tileWidth = (width - 16 * 2 - 12 * 2) / 3;

  const civic: Tile[] = [
    { label: t('more.tiles.civicDashboard', { defaultValue: 'Civic Dashboard' }), icon: 'pulse', color: colors.teal, route: '/dashboard', badge: unread || undefined },
    { label: t('more.tiles.delimitation', { defaultValue: 'Delimitation' }), icon: 'git-branch', color: colors.gold, route: '/delimitation' },
    { label: t('more.tiles.liveElection', { defaultValue: 'Live Election' }), icon: 'radio', color: colors.primary, route: '/live-election' },
    { label: t('tabs.intelligence', { defaultValue: 'Intelligence' }), icon: 'analytics', color: colors.teal, route: '/intelligence' },
    { label: t('profileExtended.parliamentMPs', { defaultValue: 'Parliament' }), icon: 'business', color: colors.gold, route: '/parliament' },
    { label: t('discovery.features.localBodies.title', { defaultValue: 'Local Bodies' }), icon: 'git-network', color: colors.primary, route: '/local-bodies' },
  ];

  const media: Tile[] = [
    { label: t('more.tiles.kshetraLive', { defaultValue: 'Poligram Live' }), icon: 'videocam', color: colors.primary, route: '/live' },
    { label: t('discovery.features.newsroom.title', { defaultValue: 'Newsroom' }), icon: 'mic', color: colors.teal, route: '/journalist' },
    { label: t('tabs.shorts', { defaultValue: 'Shorts' }), icon: 'play-circle', color: colors.gold, route: '/shorts' },
  ];

  const campaign: Tile[] = [
    { label: t('more.pagesHQTitle', { defaultValue: 'Pages & Leaders' }), icon: 'people', color: colors.primary, route: '/pages' },
    { label: t('more.tiles.campaignManager', { defaultValue: 'Campaign Manager' }), icon: 'megaphone', color: colors.teal, route: '/campaign-manager' },
    { label: t('more.tiles.leadershipAcademy', { defaultValue: 'Leadership Academy' }), icon: 'school', color: colors.gold, route: '/leadership-academy' },
    { label: t('discovery.features.politicianPortal.title', { defaultValue: 'Politician Portal' }), icon: 'briefcase', color: colors.primary, route: '/politician-portal' },
    { label: t('more.tiles.candidateXRay', { defaultValue: 'Candidate X-Ray' }), icon: 'scan', color: colors.teal, route: '/candidate-xray' },
  ];

  const account: Tile[] = [
    { label: t('more.tiles.aiAssistant', { defaultValue: 'AI Assistant' }), icon: 'sparkles', color: colors.gold, route: '/ai-chat' },
    { label: t('more.tiles.profile', { defaultValue: 'Profile' }), icon: 'person', color: colors.primary, route: '/profile' },
    { label: t('profile.notifications', { defaultValue: 'Notifications' }), icon: 'notifications', color: colors.teal, route: '/notifications', badge: unread || undefined },
    { label: t('profileExtended.notificationSettings', { defaultValue: 'Notification Settings' }), icon: 'settings', color: colors.gold, route: '/notification-settings' },
    { label: t('discovery.features.messages.title', { defaultValue: 'Messages' }), icon: 'mail', color: colors.primary, route: '/messages' },
    { label: t('more.tiles.moderation', { defaultValue: 'Moderation Queue' }), icon: 'shield-half', color: colors.teal, route: '/moderation' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('more.title', { defaultValue: t('tabs.more', { defaultValue: 'More' }) })}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t('more.subtitle', { defaultValue: 'Everything else, organized and discoverable' })}
            </Text>
          </View>
          <Pressable
            style={[styles.helpTrigger, { backgroundColor: colors.surfaceElevated || colors.surface, borderColor: colors.border }]}
            onPress={() => setShowDiscoveryHub(true)}
            accessibilityRole="button"
            accessibilityLabel={t('discovery.hubTitle', { defaultValue: 'Discovery Hub' })}
          >
            <Ionicons name="compass-outline" size={18} color={colors.gold || colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Discovery Pathway Hero Card */}
        <Pressable
          style={[styles.discoveryBanner, { backgroundColor: colors.surfaceElevated || colors.surface, borderColor: colors.goldBorder || colors.border }]}
          onPress={() => setShowDiscoveryHub(true)}
        >
          <View style={[styles.discoveryIconWrap, { backgroundColor: (colors.gold || '#C5A059') + '20' }]}>
            <Ionicons name="sparkles" size={20} color={colors.gold || '#C5A059'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.discoveryTitle, { color: colors.text }]}>
              {t('discovery.goalsHeading', { defaultValue: 'What would you like to do?' })}
            </Text>
            <Text style={[styles.discoverySub, { color: colors.textMuted }]}>
              {t('discovery.hubSubtitle', { defaultValue: 'Explore goal-oriented civic journeys and page guides' })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>

        {/* Featured: Pages & Leaders */}
        <Pressable
          style={[styles.featured, { backgroundColor: colors.primary, borderColor: colors.goldBorder || colors.gold, borderWidth: 1 }]}
          onPress={() => go('/pages')}
        >
          <View style={styles.featuredGlow} />
          <View style={styles.featuredLeft}>
            <View style={[styles.featuredIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featuredTitle}>{t('more.pagesHQTitle', { defaultValue: 'Pages & Leaders' })}</Text>
              <Text style={styles.featuredSub}>
                {t('more.pagesHQDesc', { defaultValue: 'Discover civic aspirants, elected representatives, manifestos and campaigns' })}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </Pressable>

        <Section
          title={t('discovery.categories.civic', { defaultValue: 'Civic & Representation' })}
          tiles={civic}
          tileWidth={tileWidth}
          onPress={go}
        />
        <Section
          title={t('discovery.categories.media', { defaultValue: 'Community & Media' })}
          tiles={media}
          tileWidth={tileWidth}
          onPress={go}
        />
        <Section
          title={t('discovery.categories.leadership', { defaultValue: 'Leadership & Campaigns' })}
          tiles={campaign}
          tileWidth={tileWidth}
          onPress={go}
        />
        <Section
          title={t('discovery.categories.tools', { defaultValue: 'Tools & Account' })}
          tiles={account}
          tileWidth={tileWidth}
          onPress={go}
        />
      </ScrollView>

      <DevFeatureSwitcher
        visible={showDevModal}
        onClose={() => setShowDevModal(false)}
      />

      <DiscoveryHubSheet
        visible={showDiscoveryHub}
        onClose={() => setShowDiscoveryHub(false)}
        sourceScreen="more"
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
  helpTrigger: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  discoveryBanner: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
  },
  discoveryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoveryTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  discoverySub: {
    fontSize: 11,
    marginTop: 1,
  },
  featured: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 8,
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
