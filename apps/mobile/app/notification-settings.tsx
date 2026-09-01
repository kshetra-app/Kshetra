import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, Switch, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationsStore } from '../stores/notifications';
import type { AlertCategory } from '../lib/notifications';
import { useTheme } from '../lib/theme';

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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const enabled = useNotificationsStore((s) => s.enabled);
  const toggleEnabled = useNotificationsStore((s) => s.toggleEnabled);
  const categories = useNotificationsStore((s) => s.categories);
  const toggleCategory = useNotificationsStore((s) => s.toggleCategory);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('notificationSettings.title', { defaultValue: 'Notification Settings' }),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
        }}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Master toggle */}
        <View style={styles.masterSection}>
          <View style={[styles.masterRow, { backgroundColor: colors.surface, borderColor: (colors as any).goldBorder || colors.border, borderWidth: 1 }]}>
            <View style={[styles.masterIcon, { backgroundColor: (colors as any).goldLight || '#4F8EF720' }]}>
              <Ionicons
                name={enabled ? 'notifications' : 'notifications-off'}
                size={24}
                color={enabled ? colors.primary : '#6B7280'}
              />
            </View>
            <View style={styles.masterInfo}>
              <Text style={[styles.masterTitle, { color: colors.text }]}>
                {t('notificationSettings.allowNotifications', { defaultValue: 'Allow Notifications' })}
              </Text>
              <Text style={[styles.masterSubtitle, { color: colors.textMuted }]}>
                {enabled ? t('notificationSettings.receivingUpdates', { defaultValue: 'Receiving updates' }) : t('notificationSettings.paused', { defaultValue: 'All notifications paused' })}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={toggleEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Category toggles */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            {t('notificationSettings.typesHeader', { defaultValue: 'NOTIFICATION TYPES' })}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: (colors as any).goldBorder || colors.border, borderWidth: 1 }]}>
            {NOTIFICATION_TYPES.map((notif, idx) => (
              <View
                key={notif.category}
                style={[
                  styles.categoryRow,
                  { borderBottomColor: colors.border },
                  idx === NOTIFICATION_TYPES.length - 1 && styles.lastRow,
                ]}
              >
                <View style={[styles.categoryIcon, { backgroundColor: notif.color + '20' }]}>
                  <Ionicons name={notif.icon} size={18} color={notif.color} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryLabel, { color: colors.text }, !enabled && { color: colors.textMuted }]}>
                    {t(`notificationSettings.types.${notif.category}.label`, { defaultValue: notif.label })}
                  </Text>
                  <Text style={[styles.categoryDesc, { color: colors.textMuted }]}>
                    {t(`notificationSettings.types.${notif.category}.description`, { defaultValue: notif.description })}
                  </Text>
                </View>
                <Switch
                  value={categories[notif.category] && enabled}
                  onValueChange={() => toggleCategory(notif.category)}
                  disabled={!enabled}
                  trackColor={{ false: colors.border, true: notif.color }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            {t('notificationSettings.infoText', { defaultValue: 'Notifications are sent for critical updates only. You can adjust per-constituency alerts from the constituency page.' })}
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
    borderRadius: 16,
    padding: 16,
  },
  masterIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  },
  masterSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 0.5,
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
  },
  categoryDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  disabledText: {},
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 40,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});
