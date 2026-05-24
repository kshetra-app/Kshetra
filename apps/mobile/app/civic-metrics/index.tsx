import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCivicMetricsStore } from '../../stores/civicMetrics';
import BudgetCard from '../../components/BudgetCard';
import AttendanceCard from '../../components/AttendanceCard';
import BillCard from '../../components/BillCard';
import SchemeCard from '../../components/SchemeCard';
import ProjectCard from '../../components/ProjectCard';
import { useActiveStateStore } from '../../stores/activeState';

type Tab = 'budget' | 'attendance' | 'bills' | 'schemes' | 'projects' | 'rti';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'budget', label: 'Budget', icon: 'wallet' },
  { key: 'attendance', label: 'Attendance', icon: 'checkbox' },
  { key: 'bills', label: 'Bills', icon: 'document-text' },
  { key: 'schemes', label: 'Schemes', icon: 'gift' },
  { key: 'projects', label: 'Projects', icon: 'construct' },
  { key: 'rti', label: 'RTI', icon: 'search' },
];

export default function CivicMetricsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('budget');
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const activeState = useActiveStateStore((s) => s.stateCode);

  const budgetSummary = useCivicMetricsStore((s) => s.getBudgetSummary(activeState || 'TS'));
  const attendance = useCivicMetricsStore((s) => s.getAttendanceForState(activeState || 'TS'));
  const bills = useCivicMetricsStore((s) => s.getBillsByState(activeState || undefined));
  const activeBills = useCivicMetricsStore((s) => s.getActiveBills());
  const schemes = useCivicMetricsStore((s) => s.getSchemesByState(activeState || undefined));
  const projects = useCivicMetricsStore((s) => s.getProjectsByState(activeState || 'TS'));
  const publicRTIs = useCivicMetricsStore((s) => s.getPublicRTIs());
  const upvoteRTI = useCivicMetricsStore((s) => s.upvoteRTI);
  const supportBill = useCivicMetricsStore((s) => s.supportBill);
  const opposeBill = useCivicMetricsStore((s) => s.opposeBill);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Civic Metrics', headerShown: true, headerStyle: { backgroundColor: '#0A0A1A' }, headerTintColor: '#FFFFFF' }} />

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab) => (
          <Pressable key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={(activeTab === tab.key ? tab.icon : `${tab.icon}-outline`) as any} size={14} color={activeTab === tab.key ? '#4F8EF7' : '#6B7280'} />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F8EF7" />}>
        {activeTab === 'budget' && (
          <>
            <Text style={styles.sectionTitle}>State Budget Overview</Text>
            {budgetSummary ? <BudgetCard summary={budgetSummary} /> : (
              <View style={styles.empty}><Text style={styles.emptyText}>No budget data for this state yet</Text></View>
            )}
          </>
        )}

        {activeTab === 'attendance' && (
          <>
            <Text style={styles.sectionTitle}>Legislator Attendance ({attendance.length})</Text>
            {attendance.map((a) => (
              <AttendanceCard key={`${a.legislatorId}-${a.sessionYear}`} attendance={a} />
            ))}
          </>
        )}

        {activeTab === 'bills' && (
          <>
            <Text style={styles.sectionTitle}>Active Bills ({activeBills.length})</Text>
            {bills.map((b) => (
              <BillCard key={b.id} bill={b} onSupport={() => supportBill(b.id)} onOppose={() => opposeBill(b.id)} />
            ))}
          </>
        )}

        {activeTab === 'schemes' && (
          <>
            <Text style={styles.sectionTitle}>Government Schemes ({schemes.length})</Text>
            {schemes.map((s) => (
              <SchemeCard key={s.id} scheme={s} />
            ))}
          </>
        )}

        {activeTab === 'projects' && (
          <>
            <Text style={styles.sectionTitle}>Development Projects ({projects.length})</Text>
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </>
        )}

        {activeTab === 'rti' && (
          <>
            <Text style={styles.sectionTitle}>Public RTI Requests ({publicRTIs.length})</Text>
            {publicRTIs.map((r) => (
              <View key={r.id} style={styles.rtiCard}>
                <View style={styles.rtiHeader}>
                  <Text style={styles.rtiSubject}>{r.subject}</Text>
                  <View style={[styles.rtiStatus, { backgroundColor: r.status === 'information_received' ? '#10B98120' : '#3B82F620' }]}>
                    <Text style={[styles.rtiStatusText, { color: r.status === 'information_received' ? '#10B981' : '#3B82F6' }]}>{r.status.replace(/_/g, ' ')}</Text>
                  </View>
                </View>
                <Text style={styles.rtiDept}>{r.department} · {r.stateCode}</Text>
                <Text style={styles.rtiQuestion} numberOfLines={2}>{r.questionText}</Text>
                {r.responseText && <Text style={styles.rtiResponse} numberOfLines={2}>Response: {r.responseText}</Text>}
                <View style={styles.rtiFooter}>
                  <Pressable style={styles.rtiUpvote} onPress={() => upvoteRTI(r.id)}>
                    <Ionicons name="arrow-up" size={14} color="#4F8EF7" />
                    <Text style={styles.rtiUpvoteText}>{r.upvotes}</Text>
                  </Pressable>
                  <Text style={styles.rtiViews}>{r.views} views</Text>
                  <Text style={styles.rtiDate}>Filed: {r.filedDate}</Text>
                </View>
              </View>
            ))}
          </>
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
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#111827' },
  tabActive: { backgroundColor: '#4F8EF715', borderWidth: 1, borderColor: '#4F8EF740' },
  tabLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  tabLabelActive: { color: '#4F8EF7', fontWeight: '700' },
  content: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#6B7280' },
  rtiCard: { backgroundColor: '#111827', borderRadius: 14, marginHorizontal: 16, marginVertical: 5, padding: 14, borderWidth: 1, borderColor: '#1F2937' },
  rtiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  rtiSubject: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', flex: 1, marginRight: 8 },
  rtiStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rtiStatusText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  rtiDept: { fontSize: 11, color: '#6B7280', marginBottom: 6 },
  rtiQuestion: { fontSize: 12, color: '#9CA3AF', lineHeight: 17, marginBottom: 6 },
  rtiResponse: { fontSize: 12, color: '#10B981', lineHeight: 17, marginBottom: 6, fontStyle: 'italic' },
  rtiFooter: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1F2937' },
  rtiUpvote: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rtiUpvoteText: { fontSize: 12, fontWeight: '700', color: '#4F8EF7' },
  rtiViews: { fontSize: 11, color: '#6B7280' },
  rtiDate: { fontSize: 11, color: '#6B7280', marginLeft: 'auto' },
});
