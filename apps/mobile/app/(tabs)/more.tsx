import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationsStore } from '../../stores/notifications';
import { useAuthStore } from '../../stores/auth';
import { selectOwnedUnreadCount } from '../../lib/notificationInboxOwnership';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
import { useTheme } from '../../lib/theme';
import { tapLight } from '../../lib/haptics';
import {
  getFeaturedMoreItem,
  getMoreMenuSections,
  type FeatureDirectoryItem,
} from '../../lib/discoveryCatalog';

export default function MoreScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const unread = useNotificationsStore((s) => selectOwnedUnreadCount(s, userId));
  const [showDiscoveryHub, setShowDiscoveryHub] = useState(false);

  const featuredPagesAndLeaders = getFeaturedMoreItem();
  const moreSections = getMoreMenuSections().map(({ category, items }) => ({
    key: category,
    title: t(`discovery.categories.${category}`, { defaultValue: 'More' }),
    items,
  }));

  const go = (item: FeatureDirectoryItem) => {
    tapLight();
    router.push(item.route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.rowTextWrap}>
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
        {featuredPagesAndLeaders && (
          <Pressable
            accessibilityRole="button"
            style={[
              styles.featuredCard,
              { backgroundColor: colors.primary, borderColor: colors.goldBorder || colors.gold },
            ]}
            onPress={() => go(featuredPagesAndLeaders)}
          >
            <View style={styles.featuredGlow} />
            <View style={styles.featuredContent}>
              <View
                style={[styles.featuredIconWrap, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
              >
                <Ionicons name="people" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featuredTitle}>{t(featuredPagesAndLeaders.titleKey)}</Text>
                <Text style={styles.featuredSub}>{t(featuredPagesAndLeaders.descKey)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
        )}

        {moreSections.map((section) => (
          <GroupedSection
            key={section.key}
            title={section.title}
            items={section.items}
            onPress={go}
            unread={unread}
          />
        ))}
      </ScrollView>

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
  unread,
}: {
  title: string;
  items: FeatureDirectoryItem[];
  onPress: (item: FeatureDirectoryItem) => void;
  unread: number;
}) {
  const { t } = useTranslation();
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
          const subtitle = t(item.descKey, { defaultValue: '' });
          const badge = item.id === 'notifications' && unread > 0 ? unread : undefined;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              style={[
                styles.rowItem,
                !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border + '60' },
              ]}
              onPress={() => onPress(item)}
            >
              <View style={[styles.rowIconWrap, { backgroundColor: item.color + '15' }]}>
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={item.color}
                />
              </View>

              <View style={styles.rowTextWrap}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>{t(item.titleKey)}</Text>
                {subtitle ? (
                  <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
                ) : null}
              </View>

              <View style={styles.rowRight}>
                {badge ? (
                  <View style={[styles.badgePill, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
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
    gap: 12,
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
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    textAlignVertical: 'center',
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
