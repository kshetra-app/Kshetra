import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNotificationsStore } from '../../stores/notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { moderateScale } from '../../lib/responsive';
import { usePreferencesStore } from '../../stores/preferences';
import { useActiveStateStore } from '../../stores/activeState';
import { useTheme } from '../../lib/theme';
import { useFeatureFlags } from '../../lib/featureFlags';

type TabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
};

function TabIcon({ name, color, size }: TabIconProps) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const flags = useFeatureFlags();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const insets = useSafeAreaInsets();
  const mapOnlyMode = useActiveStateStore((s) => s.mapOnlyMode);
  const broadcastMode = usePreferencesStore((s) => s.broadcastMode);

  // Adapt tab bar to device: bottom inset covers gesture bar / soft nav
  const tabBarPaddingBottom = Math.max(insets.bottom, 6);
  const tabBarHeight = 56 + tabBarPaddingBottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.goldBorder || colors.border,
          borderTopWidth: 1.5,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 6,
          display: (mapOnlyMode || broadcastMode) ? 'none' : 'flex',
          elevation: 10,
          shadowColor: colors.shadowColor || '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: moderateScale(10),
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.map'),
          href: flags.enableMap ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="map" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          href: flags.enableExploreSearch ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="search" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t('tabs.community', { defaultValue: 'Community' }),
          href: (flags.enableFeed || flags.enableShortsTab || flags.enableLiveTab) ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="chatbubbles" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: t('tabs.news', { defaultValue: 'News' }),
          href: flags.enableNewsTab ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="newspaper" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more', { defaultValue: 'More' }),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="grid" color={color} size={size} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10, fontWeight: '700' },
        }}
      />
      {/* Standalone routes hidden from tab bar but preserved for direct navigation */}
      <Tabs.Screen name="feed" options={{ href: null }} />
      <Tabs.Screen name="live" options={{ href: null }} />
      <Tabs.Screen name="shorts" options={{ href: null }} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="intelligence" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
