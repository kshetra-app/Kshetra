import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNotificationsStore } from '../../stores/notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { moderateScale } from '../../lib/responsive';
import { usePreferencesStore } from '../../stores/preferences';
import { useActiveStateStore } from '../../stores/activeState';

const ACTIVE_COLOR = '#4F8EF7';
const INACTIVE_COLOR = '#6B7280';
const TAB_BG = '#0A0A1A';

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
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopColor: '#1F2937',
          borderTopWidth: 0.5,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 6,
          display: (mapOnlyMode || broadcastMode) ? 'none' : 'flex',
        },
        tabBarLabelStyle: {
          fontSize: moderateScale(10),
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.map'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="map" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('tabs.explore'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="search" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: t('tabs.feed'),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="chatbubbles" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: t('tabs.news', { defaultValue: 'News' }),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="newspaper" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="shorts"
        options={{
          title: t('tabs.shorts', { defaultValue: 'Shorts' }),
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="play-circle" color={color} size={size} />
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
      {/* Hidden from the bar but still reachable via the More hub / navigation */}
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="intelligence" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
