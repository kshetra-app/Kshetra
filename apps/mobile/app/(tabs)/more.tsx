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

type Tile = { label: string; icon: string; color: string; route: string; badge?: number };

export default function MoreScreen() {
  const { t } = useTranslation();
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
    { label: 'Civic Dashboard', icon: 'pulse', color: '#4F8EF7', route: '/dashboard', badge: unread || undefined },
    { label: 'Delimitation', icon: 'git-branch', color: '#F59E0B', route: '/delimitation' },
    { label: 'Analytics', icon: 'stats-chart', color: '#38BDF8', route: '/analytics' },
    { label: 'Civic Metrics', icon: 'bar-chart', color: '#10B981', route: '/civic-metrics' },
    { label: 'Live Election', icon: 'radio', color: '#F97316', route: '/live-election' },
    { label: 'Parliament', icon: 'business', color: '#818CF8', route: '/parliament' },
  ];

  const liveExchange: Tile[] = [
    { label: 'Go Live', icon: 'radio', color: '#EF4444', route: '/live/go-live' },
    { label: 'Kshetra Live', icon: 'videocam', color: '#F97316', route: '/live' },
    { label: 'Dept. Console', icon: 'shield', color: '#3B82F6', route: '/departments/dashboard' },
    { label: 'Moderation', icon: 'shield-half', color: '#8B5CF6', route: '/live/moderation-queue' },
    { label: 'Distribution', icon: 'share-social', color: '#14B8A6', route: '/live/distribution' },
    { label: 'Dev Switches', icon: 'toggle', color: '#10B981', route: '__dev_switches__' },
  ];

  const account: Tile[] = [
    { label: 'Profile', icon: 'person', color: '#4F8EF7', route: '/profile' },
    { label: 'Notifications', icon: 'notifications', color: '#EF4444', route: '/notifications', badge: unread || undefined },
    { label: 'Settings', icon: 'settings', color: '#9CA3AF', route: '/notification-settings' },
    { label: 'AI Assistant', icon: 'sparkles', color: '#A855F7', route: '/ai-chat' },
  ];

  const campaign: Tile[] = [
    { label: 'Politician Portal', icon: 'people', color: '#8B5CF6', route: '/politician-portal' },
    { label: 'Become Aspirant', icon: 'rocket', color: '#EC4899', route: '/become-aspirant' },
    { label: 'Campaign Manager', icon: 'megaphone', color: '#EF4444', route: '/campaign-manager' },
    { label: 'Leadership Academy', icon: 'school', color: '#F59E0B', route: '/leadership-academy' },
    { label: 'Candidate X-Ray', icon: 'scan', color: '#14B8A6', route: '/candidate-xray' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>{t('tabs.more', { defaultValue: 'More' })}</Text>
        <Text style={styles.subtitle}>Everything else, two taps away</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Featured: Politicians & Campaign HQ */}
        <Pressable style={styles.featured} onPress={() => go('/politician-portal')}>
          <View style={styles.featuredGlow} />
          <View style={styles.featuredLeft}>
            <View style={styles.featuredIcon}>
              <Ionicons name="megaphone" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featuredTitle}>Campaign HQ</Text>
              <Text style={styles.featuredSub}>
                Run for office, manage campaigns, reach voters on WhatsApp, SMS & calls
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </Pressable>

        <Section title="Politicians & Campaign" tiles={campaign} tileWidth={tileWidth} onPress={go} />
        <Section title="Live Media Exchange" tiles={liveExchange} tileWidth={tileWidth} onPress={go} />
        <Section title="Civic & Elections" tiles={civic} tileWidth={tileWidth} onPress={go} />
        <Section title="Account" tiles={account} tileWidth={tileWidth} onPress={go} />
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
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Pressable key={tile.route} style={[styles.tile, { width: tileWidth }]} onPress={() => onPress(tile.route)}>
            <View style={[styles.tileIcon, { backgroundColor: tile.color + '20' }]}>
              <Ionicons name={tile.icon as any} size={22} color={tile.color} />
              {!!tile.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tile.badge > 9 ? '9+' : tile.badge}</Text>
                </View>
              )}
            </View>
            <Text style={styles.tileLabel} numberOfLines={2}>{tile.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 2 },
  featured: {
    marginHorizontal: 16, marginTop: 6, marginBottom: 8,
    backgroundColor: '#7C3AED', borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    overflow: 'hidden',
  },
  featuredGlow: {
    position: 'absolute', top: -40, right: -30, width: 120, height: 120,
    borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)',
  },
  featuredLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  featuredIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  featuredTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  featuredSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2, lineHeight: 16 },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#9CA3AF', paddingHorizontal: 16, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  tile: { alignItems: 'center', gap: 6 },
  tileIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  tileLabel: { fontSize: 11, fontWeight: '700', color: '#D1D5DB', textAlign: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#0A0A1A',
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
});
