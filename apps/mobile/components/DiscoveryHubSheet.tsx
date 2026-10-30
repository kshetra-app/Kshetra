import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import {
  DISCOVERY_GOALS,
  FEATURE_DIRECTORY,
  SCREEN_GUIDES,
  searchDiscoveryCatalog,
  type GoalCard,
  type FeatureDirectoryItem,
  type ScreenGuideEntry,
} from '../lib/discoveryCatalog';

export interface DiscoveryHubSheetProps {
  visible: boolean;
  onClose: () => void;
  sourceScreen?: string;
  initialSection?: 'goals' | 'directory' | 'guide' | 'search';
}

type HubSection = 'goals' | 'directory' | 'guide' | 'search';

const GUIDE_ALIASES: Record<string, string> = {
  'delimitation': 'delimitation_index',
  'delimitation-index': 'delimitation_index',
  'delimitation-impact': 'delimitation_impact',
  'delimitation-simulator': 'delimitation_simulator',
  'delimitation-state': 'delimitation_state',
  'civic-metrics': 'civic_metrics',
  'local-bodies': 'local_bodies',
  'pages': 'pages_leaders',
  'politician-portal': 'politician_portal',
  'live-election': 'live_election',
  'live-player': 'live_player',
  'go-live': 'go_live',
  'live-distribution': 'live_distribution',
  'live-moderation': 'live_moderation_queue',
  'live_moderation': 'live_moderation_queue',
  'live-moderation-queue': 'live_moderation_queue',
  'campaign-manager': 'campaign_manager',
  'issue': 'issue_detail',
  'issue-detail': 'issue_detail',
  'constituency': 'constituency_detail',
  'constituency-detail': 'constituency_detail',
  'legislator': 'legislator_profile',
  'representative': 'representative_profile',
  'representative-edit': 'representative_edit',
  'candidate-xray': 'candidate_xray',
  'user': 'user_profile',
  'user-profile': 'user_profile',
  'edit-profile': 'edit_profile',
  'auth': 'auth_sign_in',
  'auth-signin': 'auth_sign_in',
  'auth_signin': 'auth_sign_in',
  'messages': 'messages_index',
  'messages-thread': 'messages_thread',
  'message-thread': 'messages_thread',
  'notification-settings': 'notification_settings',
  'leadership-academy': 'leadership_academy',
};

export default function DiscoveryHubSheet({
  visible,
  onClose,
  sourceScreen = 'map',
  initialSection = 'goals',
}: DiscoveryHubSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    insets = useSafeAreaInsets();
  } catch {
    // Graceful fallback for test environments or unmounted providers
  }

  const [activeSection, setActiveSection] = useState<HubSection>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');

  const currentGuide = useMemo<ScreenGuideEntry | undefined>(() => {
    const key = sourceScreen;
    const normalized = key.replace(/-/g, '_');
    const alias = GUIDE_ALIASES[key] || GUIDE_ALIASES[normalized];
    return SCREEN_GUIDES[key] || SCREEN_GUIDES[normalized] || (alias ? SCREEN_GUIDES[alias] : undefined) || SCREEN_GUIDES['map'];
  }, [sourceScreen]);

  const searchResults = useMemo(() => {
    return searchDiscoveryCatalog(searchQuery, t);
  }, [searchQuery, t]);

  const handleNavigate = useCallback(
    (item: FeatureDirectoryItem | GoalCard) => {
      const route = 'targetRoute' in item ? item.targetRoute : (item as FeatureDirectoryItem).route;
      const isDynamic = 'isDynamic' in item && Boolean((item as FeatureDirectoryItem).isDynamic);

      if (!route || isDynamic) {
        // Safe fail-closed: do not navigate to unresolved dynamic routes
        return;
      }

      onClose();
      setTimeout(() => {
        router.push(route as any);
      }, 100);
    },
    [onClose, router],
  );

  const categories = useMemo(() => {
    const civic = FEATURE_DIRECTORY.filter((f) => f.category === 'civic');
    const media = FEATURE_DIRECTORY.filter((f) => f.category === 'media');
    const leadership = FEATURE_DIRECTORY.filter((f) => f.category === 'leadership');
    const tools = FEATURE_DIRECTORY.filter((f) => f.category === 'tools');
    return [
      { key: 'civic', label: t('discovery.categories.civic', { defaultValue: 'Civic & Representation' }), items: civic },
      { key: 'media', label: t('discovery.categories.media', { defaultValue: 'Community & Media' }), items: media },
      { key: 'leadership', label: t('discovery.categories.leadership', { defaultValue: 'Leadership & Campaigns' }), items: leadership },
      { key: 'tools', label: t('discovery.categories.tools', { defaultValue: 'Tools & Account' }), items: tools },
    ];
  }, [t]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} accessibilityLabel="Dismiss" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated || colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Sheet Handle */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {t('discovery.hubTitle', { defaultValue: 'POLIGRAM Discovery & Guide' })}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                {t('discovery.hubSubtitle', { defaultValue: 'Explore goals, all features, and page guidance' })}
              </Text>
            </View>
            <Pressable
              style={[styles.closeButton, { backgroundColor: colors.border + '40' }]}
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.close', { defaultValue: 'Close' })}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Navigation Tabs */}
          <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
            <TabButton
              label={t('discovery.tabs.goals', { defaultValue: 'Goals' })}
              icon="flag"
              active={activeSection === 'goals'}
              onPress={() => setActiveSection('goals')}
              color={colors.primary}
            />
            <TabButton
              label={t('discovery.tabs.directory', { defaultValue: 'Features' })}
              icon="grid"
              active={activeSection === 'directory'}
              onPress={() => setActiveSection('directory')}
              color={colors.primary}
            />
            <TabButton
              label={t('discovery.tabs.guide', { defaultValue: 'Page Help' })}
              icon="help-circle"
              active={activeSection === 'guide'}
              onPress={() => setActiveSection('guide')}
              color={colors.primary}
            />
            <TabButton
              label={t('common.search', { defaultValue: 'Search' })}
              icon="search"
              active={activeSection === 'search'}
              onPress={() => setActiveSection('search')}
              color={colors.primary}
            />
          </View>

          {/* Content Area */}
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* GOALS SECTION */}
            {activeSection === 'goals' && (
              <View style={styles.sectionWrap}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>
                  {t('discovery.goalsHeading', { defaultValue: 'What would you like to do?' })}
                </Text>
                <View style={styles.goalsGrid}>
                  {DISCOVERY_GOALS.map((goal) => (
                    <Pressable
                      key={goal.id}
                      style={[
                        styles.goalCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleNavigate(goal)}
                      accessibilityRole="button"
                      accessibilityLabel={t(goal.titleKey, { defaultValue: goal.id })}
                    >
                      <View style={[styles.goalIconWrap, { backgroundColor: goal.color + '15' }]}>
                        <Ionicons name={goal.icon as any} size={22} color={goal.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.goalTitle, { color: colors.text }]}>
                          {t(goal.titleKey, { defaultValue: goal.id })}
                        </Text>
                        <Text style={[styles.goalDesc, { color: colors.textMuted }]} numberOfLines={2}>
                          {t(goal.descKey, { defaultValue: '' })}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* DIRECTORY SECTION */}
            {activeSection === 'directory' && (
              <View style={styles.sectionWrap}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>
                  {t('discovery.directoryHeading', { defaultValue: 'Feature Directory' })}
                </Text>
                {categories.map((cat) => (
                  <View key={cat.key} style={styles.categoryBlock}>
                    <Text style={[styles.categoryTitle, { color: colors.gold || colors.primary }]}>
                      {cat.label}
                    </Text>
                    <View style={styles.featureList}>
                      {cat.items.map((item) => {
                        const isDynamic = !!item.isDynamic;
                        return (
                          <Pressable
                            key={item.id}
                            style={[
                              styles.featureRow,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                opacity: isDynamic ? 0.75 : 1,
                              },
                            ]}
                            onPress={() => !isDynamic && handleNavigate(item)}
                            accessibilityRole="button"
                            accessibilityLabel={t(item.titleKey, { defaultValue: item.id })}
                          >
                            <View style={[styles.featureIconWrap, { backgroundColor: item.color + '20' }]}>
                              <Ionicons name={item.icon as any} size={18} color={item.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={styles.featureTitleRow}>
                                <Text style={[styles.featureTitle, { color: colors.text }]}>
                                  {t(item.titleKey, { defaultValue: item.id })}
                                </Text>
                                {isDynamic && (
                                  <View style={[styles.badge, { backgroundColor: colors.border }]}>
                                    <Text style={[styles.badgeText, { color: colors.textMuted }]}>
                                      {t('discovery.selectEntityRequired', { defaultValue: 'Select entity' })}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.featureDesc, { color: colors.textMuted }]} numberOfLines={1}>
                                {t(item.descKey, { defaultValue: '' })}
                              </Text>
                            </View>
                            {!isDynamic ? (
                              <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                            ) : (
                              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* PAGE HELP / CONTEXTUAL GUIDE */}
            {activeSection === 'guide' && (
              <View style={styles.sectionWrap}>
                <View style={styles.guideHeader}>
                  <View style={[styles.guideBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="compass" size={16} color={colors.primary} />
                    <Text style={[styles.guideBadgeText, { color: colors.primary }]}>
                      {t('discovery.currentScreen', { defaultValue: 'Current Screen' })}
                    </Text>
                  </View>
                  <Text style={[styles.guideTitle, { color: colors.text }]}>
                    {t(currentGuide?.titleKey || 'discovery.guides.map.title', { defaultValue: 'Page Guide' })}
                  </Text>
                  <Text style={[styles.guidePurpose, { color: colors.textSecondary }]}>
                    {t(currentGuide?.purposeKey || 'discovery.guides.map.purpose', { defaultValue: '' })}
                  </Text>
                </View>

                {/* Steps */}
                <View style={[styles.guideCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.guideSubheading, { color: colors.text }]}>
                    {t('discovery.howToUse', { defaultValue: 'How to use this screen:' })}
                  </Text>
                  {currentGuide?.stepsKeys.map((stepKey, idx) => (
                    <View key={stepKey} style={styles.stepRow}>
                      <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                        <Text style={styles.stepNumberText}>{idx + 1}</Text>
                      </View>
                      <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                        {t(stepKey, { defaultValue: '' })}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Caveat if available */}
                {currentGuide?.caveatKey && (
                  <View style={[styles.caveatCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
                    <Ionicons name="shield-checkmark" size={16} color="#D97706" />
                    <Text style={[styles.caveatText, { color: colors.text }]}>
                      {t(currentGuide.caveatKey, { defaultValue: 'Data provenance and civic trust are verified.' })}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* SEARCH SECTION */}
            {activeSection === 'search' && (
              <View style={styles.sectionWrap}>
                <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="search" size={16} color={colors.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder={t('discovery.searchPlaceholder', { defaultValue: 'Search features, goals, or help...' })}
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus={true}
                    clearButtonMode="while-editing"
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>

                {searchResults.features.length === 0 && searchResults.goals.length === 0 && searchResults.guides.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="help-buoy-outline" size={36} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      {t('common.noResults', { defaultValue: 'No results found' })}
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {searchResults.goals.length > 0 && (
                      <View>
                        <Text style={[styles.subGroupHeading, { color: colors.textMuted }]}>
                          {t('discovery.matchedGoals', { defaultValue: 'Matched Goals' })}
                        </Text>
                        {searchResults.goals.map((g) => (
                          <Pressable
                            key={g.id}
                            style={[styles.searchResultRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => handleNavigate(g)}
                          >
                            <Ionicons name={g.icon as any} size={16} color={g.color} />
                            <Text style={[styles.searchResultText, { color: colors.text }]}>
                              {t(g.titleKey, { defaultValue: g.id })}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}

                    {searchResults.features.length > 0 && (
                      <View>
                        <Text style={[styles.subGroupHeading, { color: colors.textMuted }]}>
                          {t('discovery.matchedFeatures', { defaultValue: 'Matched Features' })}
                        </Text>
                        {searchResults.features.map((f) => (
                          <Pressable
                            key={f.id}
                            style={[styles.searchResultRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => !f.isDynamic && handleNavigate(f)}
                          >
                            <Ionicons name={f.icon as any} size={16} color={f.color} />
                            <Text style={[styles.searchResultText, { color: colors.text }]}>
                              {t(f.titleKey, { defaultValue: f.id })}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
  color,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      style={[styles.tabButton, active && { borderBottomColor: color, borderBottomWidth: 2 }]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Ionicons name={icon} size={15} color={active ? color : '#6B7280'} />
      <Text style={[styles.tabButtonLabel, { color: active ? color : '#6B7280', fontWeight: active ? '700' : '500' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  tabButtonLabel: {
    fontSize: 12,
  },
  contentScroll: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionWrap: {
    gap: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  goalsGrid: {
    gap: 8,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  goalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  goalDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  categoryBlock: {
    marginBottom: 14,
    gap: 6,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  featureList: {
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  featureDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  guideHeader: {
    gap: 4,
    marginBottom: 4,
  },
  guideBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    marginBottom: 4,
  },
  guideBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  guidePurpose: {
    fontSize: 13,
    lineHeight: 18,
  },
  guideCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  guideSubheading: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  caveatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  caveatText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  subGroupHeading: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 4,
  },
  searchResultText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
});
