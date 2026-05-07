import { View, Text, StyleSheet, ScrollView, Switch, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationsStore } from '../stores/notifications';
import type { AlertCategory } from '../lib/notifications';

interface NotifToggle {
  category: AlertCategory;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const NOTIFICATION_TYPES: NotifToggle[] = [
  {
    category: 'election_results',
    label: 'Election Results',
    description: 'Get notified when election results are declared',
    icon: 'trophy',
    color: '#F59E0B',
  },
  {
    category: 'constituency_updates',
    label: 'Constituency Updates',
    description: 'Updates about your followed constituencies',
    icon: 'location',
    color: '#4F8EF7',
  },
  {
    category: 'civic_issue',
    label: 'Civic Issues',
    description: 'New issues, status changes, and MLA responses near you',
    icon: 'megaphone',
    color: '#EF4444',
  },
  {
    category: 'promise_update',
    label: 'Promise Tracker',
    description: 'Promise status changes and milestone updates',
    icon: 'checkmark-done',
    color: '#10B981',
  },
  {
    category: 'delimitation_alert',
    label: 'Delimitation Alerts',
    description: 'Boundary changes, gazette notifications, commission updates',
    icon: 'resize',
    color: '#F97316',
  },
  {
    category: 'analytics_insight',
    label: 'Analytics Insights',
    description: 'New data-driven insights about your state',
    icon: 'stats-chart',
    color: '#8B5CF6',
  },
  {
    category: 'community_activity',
    label: 'Community',
    description: 'Replies, mentions, and community challenge updates',
    icon: 'people',
    color: '#06B6D4',
  },
  {
    category: 'new_state_added',
    label: 'New State Data',
    description: 'When new state data becomes available',
    icon: 'map',
    color: '#10B981',
  },
  {
    category: 'app_updates',
    label: 'App Updates',
    description: 'New features and improvements',
    icon: 'sparkles',
    color: '#8B5CF6',
  },
];

export default function NotificationSettingsScreen() {
  const enabled = useNotificationsStore((s) => s.enabled);
  const toggleEnabled = useNotificationsStore((s) => s.toggleEnabled);
  const categories = useNotificationsStore((s) => s.categories);
  const toggleCategory = useNotificationsStore((s) => s.toggleCategory);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notification Settings',
          headerStyle: { backgroundColor: '#0A0A1A' },
          headerTintColor: '#FFFFFF',
        }}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Master toggle */}
        <View style={styles.masterSection}>
          <View style={styles.masterRow}>
            <View style={styles.masterIcon}>
              <Ionicons name="notifications" size={24} color="#4F8EF7" />
            </View>
            <View style={styles.masterInfo}>
              <Text style={styles.masterTitle}>Push Notifications</Text>
              <Text style={styles.masterSubtitle}>
                {enabled ? 'Notifications are enabled' : 'All notifications are disabled'}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={toggleEnabled}
              trackColor={{ false: '#374151', true: '#4F8EF760' }}
              thumbColor={enabled ? '#4F8EF7' : '#6B7280'}
            />
          </View>
        </View>

        {/* Category toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          <View style={styles.card}>
            {NOTIFICATION_TYPES.map((notif, idx) => (
              <View
                key={notif.category}
                style={[
                  styles.categoryRow,
                  idx === NOTIFICATION_TYPES.length - 1 && styles.lastRow,
                ]}
              >
                <View style={[styles.categoryIcon, { backgroundColor: notif.color + '20' }]}>
                  <Ionicons name={notif.icon} size={18} color={notif.color} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryLabel, !enabled && styles.disabledText]}>
                    {notif.label}
                  </Text>
                  <Text style={styles.categoryDesc}>{notif.description}</Text>
                </View>
                <Switch
                  value={categories[notif.category] && enabled}
                  onValueChange={() => toggleCategory(notif.category)}
                  disabled={!enabled}
                  trackColor={{ false: '#374151', true: notif.color + '60' }}
                  thumbColor={categories[notif.category] && enabled ? notif.color : '#6B7280'}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={16} color="#4B5563" />
          <Text style={styles.infoText}>
            Notification preferences are stored locally. When you sign in, they will sync to your account.
          </Text>
        </View>
        <View style={{ height: Math.max(insets.bottom, 20) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  masterSection: {
    marginBottom: 28,
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
  },
  masterIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F8EF720',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  masterInfo: {
    flex: 1,
  },
  masterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  masterSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 14,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  disabledText: {
    color: '#4B5563',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 40,
  },
  infoText: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
    lineHeight: 16,
  },
});
