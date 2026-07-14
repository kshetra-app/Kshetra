import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const scrollRef = useRef<ScrollView>(null);
  const tabRefs = useRef<Record<string, number>>({});

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
    <View style={styles.container}>
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
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onTabChange(tab.key)}
              hitSlop={4}
            >
              <Ionicons
                name={(isActive ? tab.icon : `${tab.icon}-outline`) as any}
                size={16}
                color={isActive ? '#4F8EF7' : '#6B7280'}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {t(tab.label)}
              </Text>
              {badge !== undefined && badge > 0 && (
                <View style={styles.badge}>
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
    borderBottomColor: '#1F2937',
    backgroundColor: '#0A0A1A',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 4,
    paddingVertical: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  tabActive: {
    backgroundColor: '#4F8EF715',
    borderColor: '#4F8EF740',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabLabelActive: {
    color: '#4F8EF7',
    fontWeight: '700',
  },
  badge: {
    backgroundColor: '#EF4444',
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
