import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useResponsive } from '../../lib/responsive';
import { useTheme } from '../../lib/theme';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
import { useCampaignStore } from '../../stores/campaign';

import GrassrootsOverview from '../../components/campaign/GrassrootsOverview';
import SimplifiedOutreach from '../../components/campaign/SimplifiedOutreach';
import GrassrootsBooths from '../../components/campaign/GrassrootsBooths';
import GrassrootsWorkers from '../../components/campaign/GrassrootsWorkers';
import CampaignAds from '../../components/campaign/CampaignAds';
import CreateCampaignModal from '../../components/campaign/CreateCampaignModal';

export type MainCampaignTab = 'overview' | 'outreach' | 'booths' | 'workers' | 'ads';

interface TabItem {
  key: MainCampaignTab;
  icon: string;
  labelKey: string;
  defaultLabel: string;
}

const TABS: TabItem[] = [
  { key: 'overview', icon: 'home', labelKey: 'campaignManager.tabs.overview', defaultLabel: 'Overview' },
  { key: 'outreach', icon: 'megaphone', labelKey: 'campaignManager.tabs.outreach', defaultLabel: 'Reach Voters' },
  { key: 'booths', icon: 'location', labelKey: 'campaignManager.tabs.booths', defaultLabel: 'Booths' },
  { key: 'workers', icon: 'people', labelKey: 'campaignManager.tabs.workers', defaultLabel: 'Cadre' },
  { key: 'ads', icon: 'megaphone', labelKey: 'campaignManager.tabs.ads', defaultLabel: 'Ads' },
];

export default function CampaignManagerScreen() {
  const { t } = useTranslation();
  const { insets } = useResponsive();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState<MainCampaignTab>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [createCampaignVisible, setCreateCampaignVisible] = useState(false);

  const loadCampaignWorkspace = useCampaignStore((s) => s.loadCampaignWorkspace);

  useEffect(() => {
    loadCampaignWorkspace();
  }, [loadCampaignWorkspace]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCampaignWorkspace().finally(() => setRefreshing(false));
  }, [loadCampaignWorkspace]);

  const onCampaignCreated = useCallback(() => {
    loadCampaignWorkspace();
  }, [loadCampaignWorkspace]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('campaignManager.screenTitle', { defaultValue: 'Campaign Command Center' }),
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '800', fontSize: 17 },
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Pressable
                accessibilityLabel={t('campaignManager.createCampaign', { defaultValue: 'Create a campaign' })}
                accessibilityRole="button"
                style={{ padding: 4 }}
                onPress={() => setCreateCampaignVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              </Pressable>
              <Pressable
                accessibilityLabel={t('common.refresh', { defaultValue: 'Refresh campaign data' })}
                accessibilityRole="button"
                style={{ padding: 4 }}
                onPress={onRefresh}
                disabled={refreshing}
              >
                {refreshing
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="refresh" size={20} color={colors.primary} />}
              </Pressable>
              <Pressable
                accessibilityLabel={t('discovery.pageHelp.openHelp', { defaultValue: 'Page Help' })}
                style={{ padding: 4 }}
                onPress={() => setHelpVisible(true)}
              >
                <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
              </Pressable>
            </View>
          ),
        }}
      />

      {/* ─── 4 Clear Top Navigation Tabs ─── */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.tabItem,
                isActive && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={(isActive ? tab.icon : `${tab.icon}-outline`) as any}
                size={20}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.primary : colors.textSecondary },
                  isActive && { fontWeight: '800' },
                ]}
                numberOfLines={1}
              >
                {t(tab.labelKey, { defaultValue: tab.defaultLabel })}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ─── Active Tab Content ─── */}
      <View style={styles.content}>
        {activeTab === 'overview' && <GrassrootsOverview onNavigateTab={setActiveTab} />}
        {activeTab === 'outreach' && <SimplifiedOutreach />}
        {activeTab === 'booths' && <GrassrootsBooths />}
        {activeTab === 'workers' && <GrassrootsWorkers />}
        {activeTab === 'ads' && <CampaignAds />}
      </View>

      {/* Bottom spacer for insets */}
      <View style={{ height: insets.bottom }} />

      <CreateCampaignModal
        visible={createCampaignVisible}
        onClose={() => setCreateCampaignVisible(false)}
        onCreated={onCampaignCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});
