import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
import { tapLight } from '../../lib/haptics';

interface HubItem {
  label: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
  badge?: number;
}

export default function MoreScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const unread = useNotificationsStore((s) => s.unreadCount);
  const [showDevModal, setShowDevModal] = useState(false);
  const [showDiscoveryHub, setShowDiscoveryHub] = useState(false);

  const go = (route: string) => {
    tapLight();
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

  // 1. Civic & Electoral Architecture
  const civicItems: HubItem[] = [
    {
      label: t('more.tiles.civicDashboard', { defaultValue: 'Civic Dashboard' }),
      subtitle: t('discovery.features.dashboard.desc', { defaultValue: 'Constituency analytics & status' }),
      icon: 'pulse',
      color: colors.teal || '#14B8A6',
      route: '/dashboard',
      badge: unread || undefined,
    },
    {
      label: t('more.tiles.delimitation', { defaultValue: 'Delimitation' }),
      subtitle: t('discovery.features.delimitation.desc', { defaultValue: 'Seat projections & boundaries' }),
      icon: 'git-branch',
      color: colors.gold || '#C5A059',
      route: '/delimitation',
    },
    {
      label: t('more.tiles.liveElection', { defaultValue: 'Live Election' }),
      subtitle: t('discovery.features.liveElection.desc', { defaultValue: 'Real-time booth results & tally' }),
      icon: 'radio',
      color: colors.primary || '#3B82F6',
      route: '/live-election',
    },
    {
      label: t('tabs.intelligence', { defaultValue: 'Intelligence' }),
      subtitle: t('discovery.features.intelligence.desc', { defaultValue: 'Political analytics & trends' }),
      icon: 'analytics',
      color: colors.teal || '#14B8A6',
      route: '/intelligence',
    },
    {
      label: t('profileExtended.parliamentMPs', { defaultValue: 'Parliament' }),
      subtitle: t('discovery.features.parliament.desc', { defaultValue: 'Lok Sabha & Rajya Sabha MPs' }),
      icon: 'business',
      color: colors.gold || '#C5A059',
      route: '/parliament',
    },
    {
      label: t('discovery.features.localBodies.title', { defaultValue: 'Local Bodies' }),
      subtitle: t('discovery.features.localBodies.desc', { defaultValue: 'Gram Panchayats & Wards' }),
      icon: 'git-network',
      color: colors.primary || '#3B82F6',
      route: '/local-bodies',
    },
  ];

  // 2. Leadership & Representation (Zero duplication: Pages & Leaders is featured above)
  const leadershipItems: HubItem[] = [
    {
      label: t('more.tiles.campaignManager', { defaultValue: 'Campaign Manager' }),
      subtitle: t('discovery.features.campaignManager.desc', { defaultValue: 'Voter outreach & operations' }),
      icon: 'megaphone',
      color: colors.teal || '#14B8A6',
      route: '/campaign-manager',
    },
    {
      label: t('more.tiles.leadershipAcademy', { defaultValue: 'Leadership Academy' }),
      subtitle: t('discovery.features.leadershipAcademy.desc', { defaultValue: 'Civic courses & certification' }),
      icon: 'school',
      color: colors.gold || '#C5A059',
      route: '/leadership-academy',
    },
    {
      label: t('discovery.features.politicianPortal.title', { defaultValue: 'Politician Portal' }),
      subtitle: t('discovery.features.politicianPortal.desc', { defaultValue: 'Elected leader tools' }),
      icon: 'briefcase',
      color: colors.primary || '#3B82F6',
      route: '/politician-portal',
    },
    {
      label: t('more.tiles.candidateXRay', { defaultValue: 'Candidate X-Ray' }),
      subtitle: t('discovery.features.candidateXRay.desc', { defaultValue: 'Affidavits & wealth verification' }),
      icon: 'scan',
      color: colors.teal || '#14B8A6',
      route: '/candidate-xray',
    },
  ];

  // 3. Media & Broadcasting
  const mediaItems: HubItem[] = [
    {
      label: t('more.tiles.kshetraLive', { defaultValue: 'Poligram Live' }),
      subtitle: t('discovery.features.live.desc', { defaultValue: 'Broadcast streams & debriefs' }),
      icon: 'videocam',
      color: colors.primary || '#3B82F6',
      route: '/live',
    },
    {
      label: t('discovery.features.newsroom.title', { defaultValue: 'Newsroom' }),
      subtitle: t('discovery.features.newsroom.desc', { defaultValue: 'Journalist workspace & dispatch' }),
      icon: 'mic',
      color: colors.teal || '#14B8A6',
      route: '/journalist',
    },
    {
      label: t('tabs.shorts', { defaultValue: 'Shorts' }),
      subtitle: t('discovery.features.shorts.desc', { defaultValue: 'Bite-sized political clips' }),
      icon: 'play-circle',
      color: colors.gold || '#C5A059',
      route: '/shorts',
    },
  ];

  // 4. Tools, Messages & Account (Consolidated notifications)
  const accountItems: HubItem[] = [
    {
      label: t('more.tiles.aiAssistant', { defaultValue: 'AI Assistant' }),
      subtitle: t('discovery.features.aiChat.desc', { defaultValue: 'Civic intelligence & Q&A' }),
      icon: 'sparkles',
      color: colors.gold || '#C5A059',
      route: '/ai-chat',
    },
    {
      label: t('more.tiles.profile', { defaultValue: 'Profile' }),
      subtitle: t('discovery.features.profile.desc', { defaultValue: 'Preferences, bio & settings' }),
      icon: 'person',
      color: colors.primary || '#3B82F6',
      route: '/profile',
    },
    {
      label: t('profile.notifications', { defaultValue: 'Notifications' }),
      subtitle: t('profileExtended.notificationSettings', { defaultValue: 'Alerts & notification preferences' }),
      icon: 'notifications',
      color: colors.teal || '#14B8A6',
      route: '/notifications',
      badge: unread || undefined,
    },
    {
      label: t('discovery.features.messages.title', { defaultValue: 'Messages' }),
      subtitle: t('discovery.features.messages.desc', { defaultValue: 'Direct civic messaging' }),
      icon: 'mail',
      color: colors.primary || '#3B82F6',
      route: '/messages',
    },
    {
      label: t('more.tiles.moderation', { defaultValue: 'Moderation Queue' }),
      subtitle: t('discovery.features.moderation.desc', { defaultValue: 'Community guidelines review' }),
      icon: 'shield-half',
      color: colors.teal || '#14B8A6',
      route: '/moderation',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('more.title', { defaultValue: t('tabs.more', { defaultValue: 'More' }) })}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t('more.subtitle', { defaultValue: 'Civic directory, media & account tools' })}
            </Text>
          </View>
          <Pressable
            style={[
              styles.helpTrigger,
              { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
            ]}
            onPress={() => {
              tapLight();
              setShowDiscoveryHub(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('discovery.hubTitle', { defaultValue: 'Discovery Hub' })}
          >
            <Ionicons name="sparkles-outline" size={17} color={colors.gold || colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}
      >
        {/* Featured Card: Pages & Leaders (Single Canonical Entry) */}
        <Pressable
          style={[
            styles.featuredCard,
            { backgroundColor: colors.primary, borderColor: colors.goldBorder || colors.gold },
          ]}
          onPress={() => go('/pages')}
        >
          <View style={styles.featuredGlow} />
          <View style={styles.featuredContent}>
            <View style={[styles.featuredIconWrap, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featuredTitle}>
                {t('more.pagesHQTitle', { defaultValue: 'Pages & Leaders' })}
              </Text>
              <Text style={styles.featuredSub}>
                {t('more.pagesHQDesc', { defaultValue: 'Discover civic aspirants, representatives, manifestos & campaigns' })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* 1. Civic & Electoral Section */}
        <GroupedSection
          title={t('discovery.categories.civic', { defaultValue: 'Civic & Electoral' })}
          items={civicItems}
          onPress={go}
        />

        {/* 2. Leadership & Campaigns Section */}
        <GroupedSection
          title={t('discovery.categories.leadership', { defaultValue: 'Leadership & Campaigns' })}
          items={leadershipItems}
          onPress={go}
        />

        {/* 3. Media & Broadcasting Section */}
        <GroupedSection
          title={t('discovery.categories.media', { defaultValue: 'Community & Media' })}
          items={mediaItems}
          onPress={go}
        />

        {/* 4. Tools, Messages & Account Section */}
        <GroupedSection
          title={t('discovery.categories.tools', { defaultValue: 'Account & Services' })}
          items={accountItems}
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

function GroupedSection({
  title,
  items,
  onPress,
}: {
  title: string;
  items: HubItem[];
  onPress: (r: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
      <View
        style={[
          styles.cardContainer,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <Pressable
              key={item.route}
              style={[
                styles.rowItem,
                !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border + '60' },
              ]}
              onPress={() => onPress(item.route)}
            >
              <View style={[styles.rowIconWrap, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>

              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{item.label}</Text>
                {item.subtitle && (
                  <Text style={[styles.rowSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                )}
              </View>

              <View style={styles.rowRight}>
                {item.badge ? (
                  <View style={[styles.badgePill, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  helpTrigger: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  featuredCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  featuredGlow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  featuredContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featuredIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  featuredSub: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    lineHeight: 15,
  },
  sectionWrap: {
    marginBottom: 14,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingLeft: 4,
  },
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  rowSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgePill: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
