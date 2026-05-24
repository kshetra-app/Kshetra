import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useElectionLiveStore } from '../../stores/electionLive';
import InvestorMetricCard from '../../components/InvestorMetricCard';
import FlywheelVisualization from '../../components/FlywheelVisualization';
import MoatShowcase from '../../components/MoatShowcase';

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
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Investor Demo', headerShown: true, headerStyle: { backgroundColor: '#0A0A1A' }, headerTintColor: '#FFFFFF' }} />

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab) => (
          <Pressable key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={(activeTab === tab.key ? tab.icon : `${tab.icon}-outline`) as any} size={16} color={activeTab === tab.key ? '#4F8EF7' : '#6B7280'} />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
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
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  tabBar: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  tabBarContent: { paddingHorizontal: 12, gap: 4, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111827' },
  tabActive: { backgroundColor: '#4F8EF715', borderWidth: 1, borderColor: '#4F8EF740' },
  tabLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabLabelActive: { color: '#4F8EF7', fontWeight: '700' },
  content: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  heroCard: { backgroundColor: '#111827', borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 20, borderWidth: 1, borderColor: '#4F8EF730' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },
  heroSubtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-around' },
  heroStat: { alignItems: 'center' },
  heroValue: { fontSize: 24, fontWeight: '900', color: '#4F8EF7' },
  heroLabel: { fontSize: 10, color: '#6B7280', fontWeight: '700', marginTop: 2 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 16, justifyContent: 'space-between' },
  retentionCard: { backgroundColor: '#111827', borderRadius: 16, marginHorizontal: 16, marginTop: 16, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  retentionTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  retentionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  retentionItem: { alignItems: 'center' },
  retentionValue: { fontSize: 24, fontWeight: '900', color: '#4F8EF7' },
  retentionLabel: { fontSize: 11, color: '#6B7280', fontWeight: '700' },
  retentionNote: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 10 },
  featuresCard: { backgroundColor: '#111827', borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  featuresTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  featureName: { fontSize: 11, color: '#D1D5DB', width: 100 },
  featureBar: { flex: 1, height: 8, backgroundColor: '#1F2937', borderRadius: 4, overflow: 'hidden' },
  featureBarFill: { height: '100%', backgroundColor: '#4F8EF7', borderRadius: 4 },
  featurePct: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', width: 36, textAlign: 'right' },
  unitEconCard: { backgroundColor: '#111827', borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: '#1F2937' },
  unitEconTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 16 },
  unitEconGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  unitEconItem: { alignItems: 'center' },
  unitEconValue: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  unitEconLabel: { fontSize: 10, color: '#6B7280', fontWeight: '700', marginTop: 2 },
  unitEconDivider: { height: 1, backgroundColor: '#1F2937', marginVertical: 14 },
  perUserRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  perUserLabel: { fontSize: 13, color: '#9CA3AF' },
  perUserValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
