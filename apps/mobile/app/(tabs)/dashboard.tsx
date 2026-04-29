import { useState, useMemo, Component, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCivicStore } from '../../stores/civic';
import IssueCard from '../../components/IssueCard';
import ReportIssueSheet from '../../components/ReportIssueSheet';
import SentimentBar from '../../components/SentimentBar';
import HeadlineCard from '../../components/HeadlineCard';
import { ISSUE_CATEGORY_CONFIG } from '../../lib/civicTypes';
import AIDashboardSummary from '../../components/AIDashboardSummary';
import type { IssueCategory, IssueStatus } from '../../lib/civicTypes';
import { useTranslation } from 'react-i18next';

// ─── Error Boundary to prevent Fabric native crashes ───
class DashboardErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0A0A1A', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="warning" size={48} color="#EF4444" />
          <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700', marginTop: 12 }}>Dashboard Error</Text>
          <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{this.state.error}</Text>
          <Pressable
            style={{ marginTop: 16, backgroundColor: '#4F8EF7', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
            onPress={() => this.setState({ hasError: false, error: '' })}
          >
            <Text style={{ color: '#FFF', fontWeight: '700' }}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

type DashboardTab = 'issues' | 'sentiment' | 'headlines';

const TAB_KEYS: { key: DashboardTab; tKey: string; icon: string }[] = [
  { key: 'issues', tKey: 'dashboard.tabs.issues', icon: 'alert-circle' },
  { key: 'sentiment', tKey: 'dashboard.tabs.sentiment', icon: 'pulse' },
  { key: 'headlines', tKey: 'dashboard.tabs.headlines', icon: 'newspaper' },
];

const STATUS_FILTER_KEYS: { key: IssueStatus | 'all'; tKey: string }[] = [
  { key: 'all', tKey: 'dashboard.statusFilters.all' },
  { key: 'open', tKey: 'dashboard.statusFilters.open' },
  { key: 'acknowledged', tKey: 'dashboard.statusFilters.acknowledged' },
  { key: 'in_progress', tKey: 'dashboard.statusFilters.inProgress' },
  { key: 'resolved', tKey: 'dashboard.statusFilters.resolved' },
];

export default function DashboardScreen() {
  return (
    <DashboardErrorBoundary>
      <DashboardContent />
    </DashboardErrorBoundary>
  );
}

function DashboardContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>('issues');
  const [reportVisible, setReportVisible] = useState(false);

  // Use proper selectors — select raw data, compute in useMemo
  const allIssues = useCivicStore((s) => s.issues);
  const headlines = useCivicStore((s) => s.headlines);
  const sentiment = useCivicStore((s) => s.sentiment);
  const issueFilter = useCivicStore((s) => s.issueFilter);
  const statusFilter = useCivicStore((s) => s.statusFilter);
  const toggleUpvote = useCivicStore((s) => s.toggleUpvote);
  const addIssue = useCivicStore((s) => s.addIssue);
  const setIssueFilter = useCivicStore((s) => s.setIssueFilter);
  const setStatusFilter = useCivicStore((s) => s.setStatusFilter);

  // Derive filtered issues in component (stable references via useMemo)
  const issues = useMemo(() => {
    return allIssues.filter((i) => {
      if (issueFilter !== 'all' && i.category !== issueFilter) return false;
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      return true;
    });
  }, [allIssues, issueFilter, statusFilter]);

  const issueStats = useMemo(() => {
    const open = allIssues.filter((i) => i.status === 'open').length;
    const inProgress = allIssues.filter((i) => i.status === 'in_progress' || i.status === 'acknowledged').length;
    const resolved = allIssues.filter((i) => i.status === 'resolved' || i.status === 'closed').length;
    const critical = allIssues.filter((i) => i.severity === 'critical').length;
    return { open, inProgress, resolved, critical };
  }, [allIssues]);

  const topCategories = useMemo(() => {
    const counts = new Map<IssueCategory, number>();
    for (const issue of allIssues) {
      counts.set(issue.category, (counts.get(issue.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [allIssues]);

  const sentimentSorted = useMemo(() => {
    return [...sentiment].sort((a, b) => a.score - b.score);
  }, [sentiment]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('dashboard.title')}</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.analyticsButton}
            onPress={() => router.push('/(tabs)/intelligence')}
          >
            <Ionicons name="bar-chart" size={15} color="#4F8EF7" />
            <Text style={styles.analyticsButtonText}>{t('dashboard.analytics')}</Text>
          </Pressable>
          {activeTab === 'issues' && (
            <Pressable style={styles.reportButton} onPress={() => setReportVisible(true)}>
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabRow}>
        {TAB_KEYS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={16} color={active ? '#FFFFFF' : '#6B7280'} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t(tab.tKey)}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Single ScrollView */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'issues' && (
          <View style={styles.tabContent}>
            {/* Stats summary */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}>
                <Text style={styles.statValue}>{issueStats.open}</Text>
                <Text style={styles.statLabel}>{t('dashboard.statusFilters.open')}</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
                <Text style={styles.statValue}>{issueStats.inProgress}</Text>
                <Text style={styles.statLabel}>{t('dashboard.statusFilters.inProgress')}</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
                <Text style={styles.statValue}>{issueStats.resolved}</Text>
                <Text style={styles.statLabel}>{t('dashboard.statusFilters.resolved')}</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#EF4444' }]}>
                <Text style={styles.statValue}>{issueStats.critical}</Text>
                <Text style={styles.statLabel}>{t('reportIssue.severityLevels.critical')}</Text>
              </View>
            </View>

            {/* Top issue categories */}
            <View style={styles.topCategoriesRow}>
              {topCategories.slice(0, 5).map(({ category, count }) => {
                const config = ISSUE_CATEGORY_CONFIG[category];
                const active = issueFilter === category;
                return (
                  <Pressable
                    key={category}
                    style={[
                      styles.categoryChip,
                      active && { backgroundColor: config.color + '20', borderColor: config.color + '40' },
                    ]}
                    onPress={() => setIssueFilter(active ? 'all' : category)}
                  >
                    <Ionicons name={config.icon as any} size={12} color={active ? config.color : '#6B7280'} />
                    <Text style={[styles.categoryChipText, active && { color: config.color }]}>
                      {config.label} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Status filter */}
            <View style={styles.statusRow}>
              {STATUS_FILTER_KEYS.map((sf) => {
                const active = statusFilter === sf.key;
                return (
                  <Pressable
                    key={sf.key}
                    style={[styles.statusChip, active && styles.statusChipActive]}
                    onPress={() => setStatusFilter(sf.key)}
                  >
                    <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                      {t(sf.tKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Issue list */}
            {issues.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color="#1F2937" />
                <Text style={styles.emptyTitle}>{t('dashboard.noIssues')}</Text>
              </View>
            ) : (
              issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onUpvote={() => toggleUpvote(issue.id)}
                />
              ))
            )}
          </View>
        )}

        {activeTab === 'sentiment' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pulse" size={18} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>{t('dashboard.sentimentScore')}</Text>
            </View>

            {sentimentSorted.map((item) => (
              <View key={item.constituencyId} style={styles.sentimentItem}>
                <SentimentBar item={item} />
              </View>
            ))}

            <AIDashboardSummary
              constituencyName={sentimentSorted[0]?.constituencyName}
              issues={allIssues.map((i) => `${i.title} (${i.category}, ${i.severity})`)}
            />
          </View>
        )}

        {activeTab === 'headlines' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Ionicons name="newspaper" size={18} color="#3B82F6" />
              <Text style={styles.sectionTitle}>{t('dashboard.tabs.headlines')}</Text>
            </View>

            {headlines.map((hl) => (
              <HeadlineCard key={hl.id} headline={hl} />
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Report Issue Sheet */}
      {reportVisible && (
        <ReportIssueSheet
          visible={reportVisible}
          onClose={() => setReportVisible(false)}
          onSubmit={(issue) => addIssue(issue)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analyticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F8EF720',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  analyticsButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F8EF7',
    marginLeft: 4,
  },
  reportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: '#4F8EF7',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginLeft: 5,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 0,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderLeftWidth: 3,
    marginRight: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },
  topCategoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    marginRight: 6,
    marginBottom: 6,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginLeft: 4,
  },
  statusRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#111827',
    marginRight: 6,
  },
  statusChipActive: {
    backgroundColor: '#4F8EF7',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  sentimentItem: {
    marginHorizontal: 16,
  },
  bottomPadding: {
    height: 100,
  },
});
