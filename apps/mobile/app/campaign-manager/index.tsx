import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useResponsive } from '../../lib/responsive';
import { useTheme } from '../../lib/theme';
import { useCampaignStore } from '../../stores/campaign';
import { IS_PRODUCTION, IS_STAGING } from '../../lib/environment';

import GrassrootsOverview from '../../components/campaign/GrassrootsOverview';
import SimplifiedOutreach from '../../components/campaign/SimplifiedOutreach';
import GrassrootsBooths from '../../components/campaign/GrassrootsBooths';
import GrassrootsWorkers from '../../components/campaign/GrassrootsWorkers';

export type MainCampaignTab = 'overview' | 'outreach' | 'booths' | 'workers';

const IS_LIVE_ENVIRONMENT = IS_PRODUCTION || IS_STAGING;

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
];

export default function CampaignManagerScreen() {
  const { t } = useTranslation();
  const { insets } = useResponsive();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState<MainCampaignTab>('overview');
  const fetchPricing = useCampaignStore((s) => s.fetchPricing);

  useEffect(() => {
    if (!IS_LIVE_ENVIRONMENT) fetchPricing();
  }, [fetchPricing]);

  if (IS_LIVE_ENVIRONMENT) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: t('campaignManager.screenTitle', { defaultValue: 'Campaign Command Center' }),
            headerShown: true,
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.primary,
            headerTitleStyle: { fontWeight: '800', fontSize: 17 },
          }}
        />
        <View style={[styles.unavailableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={30} color={colors.primary} />
          <Text style={[styles.unavailableTitle, { color: colors.text }]}>Campaign tools are not connected to verified live data yet</Text>
          <Text style={[styles.unavailableBody, { color: colors.textSecondary }]}>Campaign records, voter counts, budgets, ad performance, and outreach delivery are unavailable in this environment. Payment and broadcast actions are disabled; no funds will be charged and no messages will be sent.</Text>
        </View>
        <View style={{ height: insets.bottom }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('campaignManager.screenTitle', { defaultValue: 'Campaign Command Center' }),
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '800', fontSize: 17 },
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
      </View>

      {/* Bottom spacer for insets */}
      <View style={{ height: insets.bottom }} />
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
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  unavailableCard: {
    margin: 20,
    padding: 20,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  unavailableTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  unavailableBody: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
