import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useElectionLiveStore } from '../../stores/electionLive';
import InvestorMetricCard from '../../components/InvestorMetricCard';
import FlywheelVisualization from '../../components/FlywheelVisualization';
import MoatShowcase from '../../components/MoatShowcase';
import { useTheme } from '../../lib/theme';

type Tab = 'metrics' | 'flywheel' | 'moat' | 'unit_economics';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'metrics', label: 'Metrics', icon: 'analytics' },
  { key: 'flywheel', label: 'Flywheel', icon: 'refresh' },
  { key: 'moat', label: 'Moat', icon: 'shield' },
  { key: 'unit_economics', label: 'Unit Econ', icon: 'calculator' },
];

export default function InvestorDemoScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('metrics');
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();

  const investorMetrics = useElectionLiveStore((s) => s.getInvestorMetrics());
  const flywheelSteps = useElectionLiveStore((s) => s.getFlywheelSteps());
  const moatData = useElectionLiveStore((s) => s.getMoatData());
  const dauMetrics = useElectionLiveStore((s) => s.getDAUMetrics());
  const unitEconomics = useElectionLiveStore((s) => s.getUnitEconomics());

  const engagementMetrics = investorMetrics.filter((m) => m.category === 'engagement');
  const growthMetrics = investorMetrics.filter((m) => m.category === 'growth');
  const revenueMetrics = investorMetrics.filter((m) => m.category === 'revenue');
  const dataMoatMetrics = investorMetrics.filter((m) => m.category === 'data_moat');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Investor Demo', headerShown: true, headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.primary }} />

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { borderBottomColor: colors.border }]} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tab,
              { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 },
              activeTab === tab.key && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={(activeTab === tab.key ? tab.icon : `${tab.icon}-outline`) as any} size={16} color={activeTab === tab.key ? '#FFFFFF' : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: colors.textSecondary }, activeTab === tab.key && { color: '#FFFFFF', fontWeight: '700' }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {activeTab === 'metrics' && (
          <>
            {/* Hero stats */}
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>Kshetra by the Numbers</Text>
              <Text style={styles.heroSubtitle}>India's first constituency-level political intelligence platform</Text>
              <View style={styles.heroRow}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroValue}>{dauMetrics.dau > 1000 ? `${Math.round(dauMetrics.dau / 1000)}K` : dauMetrics.dau}</Text>
                  <Text style={styles.heroLabel}>DAU</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroValue}>{dauMetrics.mau > 1000000 ? `${(dauMetrics.mau / 1000000).toFixed(1)}M` : `${Math.round(dauMetrics.mau / 1000)}K`}</Text>
                  <Text style={styles.heroLabel}>MAU</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroValue}>{dauMetrics.avgSessionMinutes}m</Text>
                  <Text style={styles.heroLabel}>Avg Session</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroValue}>{dauMetrics.growthRate}%</Text>
                  <Text style={styles.heroLabel}>MoM Growth</Text>
                </View>
              </View>
            </View>

            {/* Engagement */}
            <Text style={styles.sectionTitle}>Engagement</Text>
            <View style={styles.metricGrid}>
              {engagementMetrics.map((m) => <InvestorMetricCard key={m.id} metric={m} />)}
            </View>

            {/* Growth */}
            <Text style={styles.sectionTitle}>Growth</Text>
            <View style={styles.metricGrid}>
              {growthMetrics.map((m) => <InvestorMetricCard key={m.id} metric={m} />)}
            </View>

            {/* Revenue */}
            <Text style={styles.sectionTitle}>Revenue</Text>
            <View style={styles.metricGrid}>
              {revenueMetrics.map((m) => <InvestorMetricCard key={m.id} metric={m} />)}
            </View>

            {/* Data Moat */}
            <Text style={styles.sectionTitle}>Data Moat</Text>
            <View style={styles.metricGrid}>
              {dataMoatMetrics.map((m) => <InvestorMetricCard key={m.id} metric={m} />)}
            </View>

            {/* Retention */}
            <View style={styles.retentionCard}>
              <Text style={styles.retentionTitle}>Retention Curve</Text>
              <View style={styles.retentionRow}>
                <View style={styles.retentionItem}>
                  <Text style={styles.retentionValue}>{(dauMetrics.retentionD1 * 100).toFixed(0)}%</Text>
                  <Text style={styles.retentionLabel}>D1</Text>
                </View>
                <Ionicons name="arrow-forward" size={14} color="#6B7280" />
                <View style={styles.retentionItem}>
                  <Text style={styles.retentionValue}>{(dauMetrics.retentionD7 * 100).toFixed(0)}%</Text>
                  <Text style={styles.retentionLabel}>D7</Text>
                </View>
                <Ionicons name="arrow-forward" size={14} color="#6B7280" />
                <View style={styles.retentionItem}>
                  <Text style={styles.retentionValue}>{(dauMetrics.retentionD30 * 100).toFixed(0)}%</Text>
                  <Text style={styles.retentionLabel}>D30</Text>
                </View>
              </View>
              <Text style={styles.retentionNote}>DAU/MAU Ratio: {(dauMetrics.dauMauRatio * 100).toFixed(1)}% — indicates sticky daily usage</Text>
            </View>

            {/* Top Features */}
            <View style={styles.featuresCard}>
              <Text style={styles.featuresTitle}>Top Features by Usage</Text>
              {dauMetrics.topFeatures.map((f) => (
                <View key={f.feature} style={styles.featureRow}>
                  <Text style={styles.featureName}>{f.feature}</Text>
                  <View style={styles.featureBar}>
                    <View style={[styles.featureBarFill, { width: `${f.usagePercent}%` }]} />
                  </View>
                  <Text style={styles.featurePct}>{f.usagePercent}%</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {activeTab === 'flywheel' && (
          <FlywheelVisualization steps={flywheelSteps} />
        )}

        {activeTab === 'moat' && (
          <MoatShowcase moats={moatData} />
        )}

        {activeTab === 'unit_economics' && (
          <View style={styles.unitEconCard}>
            <Text style={styles.unitEconTitle}>Unit Economics</Text>
            <View style={styles.unitEconGrid}>
              <View style={styles.unitEconItem}>
                <Text style={styles.unitEconValue}>₹{unitEconomics.ltv}</Text>
                <Text style={styles.unitEconLabel}>LTV</Text>
              </View>
              <View style={styles.unitEconItem}>
                <Text style={styles.unitEconValue}>₹{unitEconomics.cac}</Text>
                <Text style={styles.unitEconLabel}>CAC</Text>
              </View>
              <View style={styles.unitEconItem}>
                <Text style={[styles.unitEconValue, { color: '#10B981' }]}>{unitEconomics.ltvToCacRatio}x</Text>
                <Text style={styles.unitEconLabel}>LTV:CAC</Text>
              </View>
              <View style={styles.unitEconItem}>
                <Text style={styles.unitEconValue}>{unitEconomics.paybackMonths}mo</Text>
                <Text style={styles.unitEconLabel}>Payback</Text>
              </View>
            </View>
            <View style={styles.unitEconDivider} />
            <View style={styles.unitEconGrid}>
              <View style={styles.unitEconItem}>
                <Text style={styles.unitEconValue}>{(unitEconomics.grossMargin * 100).toFixed(0)}%</Text>
                <Text style={styles.unitEconLabel}>Gross Margin</Text>
              </View>
              <View style={styles.unitEconItem}>
                <Text style={styles.unitEconValue}>₹{(unitEconomics.monthlyBurnRate / 100000).toFixed(0)}L</Text>
                <Text style={styles.unitEconLabel}>Monthly Burn</Text>
              </View>
              <View style={styles.unitEconItem}>
                <Text style={[styles.unitEconValue, { color: unitEconomics.monthsOfRunway > 12 ? '#10B981' : '#EF4444' }]}>{unitEconomics.monthsOfRunway}mo</Text>
                <Text style={styles.unitEconLabel}>Runway</Text>
              </View>
              <View style={styles.unitEconItem}>
                <Text style={styles.unitEconValue}>{(unitEconomics.breakEvenUsers / 1000).toFixed(0)}K</Text>
                <Text style={styles.unitEconLabel}>Break-even</Text>
              </View>
            </View>
            <View style={styles.unitEconDivider} />
            <View style={styles.perUserRow}>
              <Text style={styles.perUserLabel}>Revenue per User</Text>
              <Text style={styles.perUserValue}>₹{unitEconomics.revenuePerUser}/mo</Text>
            </View>
            <View style={styles.perUserRow}>
              <Text style={styles.perUserLabel}>Cost per User</Text>
              <Text style={styles.perUserValue}>₹{unitEconomics.costPerUser}/mo</Text>
            </View>
            <View style={styles.perUserRow}>
              <Text style={styles.perUserLabel}>Contribution Margin</Text>
              <Text style={[styles.perUserValue, { color: '#10B981' }]}>₹{(unitEconomics.revenuePerUser - unitEconomics.costPerUser).toFixed(1)}/mo</Text>
            </View>
          </View>
        )}

        <View style={{ height: insets.bottom + 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { maxHeight: 48, borderBottomWidth: 1 },
  tabBarContent: { paddingHorizontal: 12, gap: 4, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabActive: {},
  tabLabel: { fontSize: 12, fontWeight: '600' },
  tabLabelActive: { fontWeight: '700' },
  content: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  heroCard: { borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 20, borderWidth: 1 },
  heroTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  heroSubtitle: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-around' },
  heroStat: { alignItems: 'center' },
  heroValue: { fontSize: 24, fontWeight: '900' },
  heroLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 16, justifyContent: 'space-between' },
  retentionCard: { borderRadius: 16, marginHorizontal: 16, marginTop: 16, padding: 16, borderWidth: 1 },
  retentionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  retentionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  retentionItem: { alignItems: 'center' },
  retentionValue: { fontSize: 24, fontWeight: '900' },
  retentionLabel: { fontSize: 11, fontWeight: '700' },
  retentionNote: { fontSize: 11, textAlign: 'center', marginTop: 10 },
  featuresCard: { borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 16, borderWidth: 1 },
  featuresTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  featureName: { fontSize: 11, width: 100 },
  featureBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  featureBarFill: { height: '100%', borderRadius: 4 },
  featurePct: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
  unitEconCard: { borderRadius: 16, margin: 16, padding: 20, borderWidth: 1 },
  unitEconTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  unitEconGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  unitEconItem: { alignItems: 'center' },
  unitEconValue: { fontSize: 20, fontWeight: '900' },
  unitEconLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  unitEconDivider: { height: 1, marginVertical: 14 },
  perUserRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  perUserLabel: { fontSize: 13 },
  perUserValue: { fontSize: 14, fontWeight: '700' },
});
