import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

export type ConstituencyTab =
  | 'overview'
  | 'issues'
  | 'pulse'
  | 'news'
  | 'history'
  | 'xray';

interface TabDef {
  key: ConstituencyTab;
  label: string;
  icon: string;
  badge?: number;
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'constituencyTabBar.overview', icon: 'home' },
  { key: 'issues', label: 'constituencyTabBar.issues', icon: 'warning' },
  { key: 'pulse', label: 'constituencyTabBar.pulse', icon: 'chatbubbles' },
  { key: 'news', label: 'constituencyTabBar.news', icon: 'newspaper' },
  { key: 'history', label: 'constituencyTabBar.history', icon: 'time' },
  { key: 'xray', label: 'constituencyTabBar.xray', icon: 'document-text' },
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
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const getBadge = useCallback(
    (key: ConstituencyTab) => {
      if (key === 'issues') return issueBadge;
      if (key === 'pulse') return pulseBadge;
      if (key === 'news') return newsBadge;
      return undefined;
    },
    [issueBadge, pulseBadge, newsBadge],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const badge = getBadge(tab.key);

          return (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                { backgroundColor: isActive ? colors.primaryLight : colors.surface, borderColor: isActive ? colors.primary : colors.border },
              ]}
              onPress={() => onTabChange(tab.key)}
              hitSlop={4}
            >
              <Ionicons
                name={(isActive ? tab.icon : `${tab.icon}-outline`) as any}
                size={16}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.textSecondary }, isActive && styles.tabLabelActive]}>
                {t(tab.label)}
              </Text>
              {badge !== undefined && badge > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
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
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 6,
    paddingVertical: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  badge: {
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
