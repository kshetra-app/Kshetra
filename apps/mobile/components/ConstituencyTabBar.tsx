import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

export type ConstituencyTab =
  | 'overview'
  | 'issues'
  | 'pulse'
  | 'news'
  | 'history'
  | 'xray'
  | 'results'
  | 'affidavits'
  | 'demographics';

interface TabDef {
  key: ConstituencyTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'constituencyTabBar.results', icon: 'trophy' },
  { key: 'issues', label: 'constituencyTabBar.issues', icon: 'alert-circle' },
  { key: 'news', label: 'constituencyTabBar.news', icon: 'newspaper' },
  { key: 'xray', label: 'constituencyTabBar.affidavits', icon: 'scale' },
  { key: 'demographics', label: 'constituencyTabBar.demographics', icon: 'people' },
];

interface ConstituencyTabBarProps {
  activeTab: ConstituencyTab;
  onTabChange: (tab: ConstituencyTab) => void;
  issueBadge?: number;
  pulseBadge?: number;
  newsBadge?: number;
}

export default function ConstituencyTabBar({
  activeTab,
  onTabChange,
  issueBadge,
  pulseBadge,
  newsBadge,
}: ConstituencyTabBarProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const tabPositions = useRef<Partial<Record<ConstituencyTab, number>>>({});
  const selected = activeTab === 'results' ? 'overview' : activeTab === 'affidavits' ? 'xray' : activeTab;

  const getBadge = useCallback(
    (key: ConstituencyTab) => {
      if (key === 'issues') return issueBadge;
      if (key === 'pulse') return pulseBadge;
      if (key === 'news') return newsBadge;
      return undefined;
    },
    [issueBadge, pulseBadge, newsBadge],
  );

  useEffect(() => {
    const x = tabPositions.current[selected];
    if (x !== undefined) scrollRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  }, [selected]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderBottomColor: isDark ? colors.border : '#E2E8F0' }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator
        keyboardShouldPersistTaps="handled"
        accessibilityRole="tablist"
        contentContainerStyle={styles.scrollContent}
      >
        {TABS.map((tab) => {
          const isActive = selected === tab.key;
          const badge = getBadge(tab.key);

          return (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                { maxWidth: Math.max(width - 32, 120) },
                isActive
                  ? styles.tabActive
                  : [styles.tabInactive, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: isDark ? '#334155' : '#E2E8F0' }],
              ]}
              onPress={() => onTabChange(tab.key)}
              onLayout={(event) => {
                const x = event.nativeEvent.layout.x;
                tabPositions.current[tab.key] = x;
                if (isActive) scrollRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: false });
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              hitSlop={4}
            >
              <Ionicons
                name={(isActive ? tab.icon : (`${tab.icon}-outline` as any))}
                size={16}
                color={isActive ? '#FFFFFF' : (isDark ? '#94A3B8' : '#475569')}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? '#FFFFFF' : (isDark ? '#E2E8F0' : '#1E293B') },
                  isActive && styles.tabLabelActive,
                ]}
                adjustsFontSizeToFit={false}
              >
                {t(tab.label, tab.key)}
              </Text>
              {badge !== undefined && badge > 0 && (
                <View style={[styles.badge, { backgroundColor: isActive ? '#F59E0B' : '#EF4444' }]}>
                  <Text style={styles.badgeText}>
                    {badge > 99 ? '99+' : badge}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#002B7F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8.5,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  tabActive: {
    backgroundColor: '#002B7F', // Ashoka Chakra Navy Blue
    borderColor: '#002B7F',
    shadowColor: '#002B7F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabInactive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  tabLabel: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  tabLabelActive: {
    fontWeight: '900',
    color: '#FFFFFF',
  },
  badge: {
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
