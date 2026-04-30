import { useState, useMemo, Component, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCivicStore } from '../../stores/civic';
import IssueCard from '../../components/IssueCard';
import ReportIssueSheet from '../../components/ReportIssueSheet';
import ExportSheet from '../../components/ExportSheet';
import SentimentBar from '../../components/SentimentBar';
import HeadlineCard from '../../components/HeadlineCard';
import { ISSUE_CATEGORY_CONFIG } from '../../lib/civicTypes';
import AIDashboardSummary from '../../components/AIDashboardSummary';
import PromiseCard from '../../components/PromiseCard';
import GovernmentReportCard from '../../components/GovernmentReportCard';
import type { IssueCategory, IssueStatus, CivicScope } from '../../lib/civicTypes';
import { useTranslation } from 'react-i18next';
import { useActiveStateStore } from '../../stores/activeState';
import { useMyConstituencyStore } from '../../stores/myConstituency';
import { usePromiseStore } from '../../stores/promises';
import { PROMISE_STATUS_CONFIG, type PromiseStatus as PStatus } from '../../lib/promiseTypes';
import { STATES } from '@kshetra/shared';

const SCOPE_OPTIONS: { key: CivicScope; icon: string; label: string }[] = [
  { key: 'constituency', icon: 'location', label: 'My Constituency' },
  { key: 'state', icon: 'map', label: 'My State' },
  { key: 'national', icon: 'globe', label: 'National' },
];

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

type DashboardTab = 'issues' | 'sentiment' | 'headlines' | 'promises';

const TAB_KEYS: { key: DashboardTab; tKey: string; icon: string }[] = [
  { key: 'issues', tKey: 'dashboard.tabs.issues', icon: 'alert-circle' },
  { key: 'promises', tKey: 'dashboard.tabs.promises', icon: 'ribbon' },
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
  const [exportVisible, setExportVisible] = useState(false);

  // Stores
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const myHome = useMyConstituencyStore((s) => s.home);
  const scopeFilter = useCivicStore((s) => s.scopeFilter);
  const setScopeFilter = useCivicStore((s) => s.setScopeFilter);
  const issueFilter = useCivicStore((s) => s.issueFilter);
  const statusFilter = useCivicStore((s) => s.statusFilter);
  const allIssues = useCivicStore((s) => s.issues);
  const allHeadlines = useCivicStore((s) => s.headlines);
  const allSentiment = useCivicStore((s) => s.sentiment);
  const toggleUpvote = useCivicStore((s) => s.toggleUpvote);
  const toggleFollow = useCivicStore((s) => s.toggleFollow);
  const shareIssue = useCivicStore((s) => s.shareIssue);
  const addIssue = useCivicStore((s) => s.addIssue);
  const setIssueFilter = useCivicStore((s) => s.setIssueFilter);
  const setStatusFilter = useCivicStore((s) => s.setStatusFilter);
  const getFilteredByScope = useCivicStore((s) => s.getFilteredByScope);

  // Promise store
  const statePromises = usePromiseStore((s) => s.getPromisesForState)(stateCode);
  const toggleFollowPromise = usePromiseStore((s) => s.toggleFollowPromise);
  const getReportCard = usePromiseStore((s) => s.getReportCard);

  const constituencyId = myHome ? `${stateCode}-AC-${myHome.acNo}` : undefined;

  // Scope-filtered data (issues, headlines, sentiment all respect the scope)
  const { issues: scopedIssues, headlines, sentiment } = useMemo(
    () => getFilteredByScope(stateCode, constituencyId),
    [getFilteredByScope, stateCode, constituencyId, scopeFilter, issueFilter, statusFilter],
  );

  // Scope label for header
  const scopeLabel = useMemo(() => {
    if (scopeFilter === 'constituency' && myHome) return myHome.name;
    if (scopeFilter === 'state') return (STATES as Record<string, { name: string }>)[stateCode]?.name ?? stateCode;
    return 'All India';
  }, [scopeFilter, stateCode, myHome]);

  const issues = scopedIssues;

  const issueStats = useMemo(() => {
    const open = issues.filter((i) => i.status === 'open').length;
    const inProgress = issues.filter((i) => i.status === 'in_progress' || i.status === 'acknowledged').length;
    const resolved = issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length;
    const critical = issues.filter((i) => i.severity === 'critical').length;
    return { open, inProgress, resolved, critical };
  }, [issues]);

  const topCategories = useMemo(() => {
    const counts = new Map<IssueCategory, number>();
    for (const issue of issues) {
      counts.set(issue.category, (counts.get(issue.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [issues]);

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
          <Pressable style={styles.exportButton} onPress={() => setExportVisible(true)}>
            <Ionicons name="download-outline" size={18} color="#10B981" />
          </Pressable>
          {activeTab === 'issues' && (
            <Pressable style={styles.reportButton} onPress={() => setReportVisible(true)}>
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Scope toggle */}
      <View style={styles.scopeRow}>
        {SCOPE_OPTIONS.map((opt) => {
          const active = scopeFilter === opt.key;
          const disabled = opt.key === 'constituency' && !myHome;
          return (
            <Pressable
              key={opt.key}
              style={[styles.scopeChip, active && styles.scopeChipActive, disabled && styles.scopeChipDisabled]}
              onPress={() => !disabled && setScopeFilter(opt.key)}
            >
              <Ionicons name={opt.icon as any} size={13} color={active ? '#FFFFFF' : disabled ? '#374151' : '#9CA3AF'} />
              <Text style={[styles.scopeChipText, active && styles.scopeChipTextActive, disabled && { color: '#374151' }]}>
                {opt.key === 'state'
                  ? (STATES as Record<string, { name: string }>)[stateCode]?.name ?? stateCode
                  : opt.key === 'constituency' && myHome
                    ? myHome.name
                    : opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Scope indicator */}
      <View style={styles.scopeIndicator}>
        <Ionicons name="funnel" size={12} color="#6B7280" />
        <Text style={styles.scopeIndicatorText}>
          Showing {scopeLabel} • {issues.length} issue{issues.length !== 1 ? 's' : ''}
        </Text>
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
                  onFollow={() => toggleFollow(issue.id)}
                  onShare={async () => {
                    const text = shareIssue(issue.id);
                    try { await Share.share({ message: text }); } catch (_) {}
                  }}
                  onPress={() => router.push(`/issue/${issue.id}` as any)}
                />
              ))
            )}
          </View>
        )}

        {activeTab === 'promises' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Ionicons name="ribbon" size={18} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Promise Tracker</Text>
            </View>

            {/* Report Card (top party) */}
            {statePromises.length > 0 && (() => {
              const topParty = statePromises.reduce((acc, p) => {
                acc[p.party] = (acc[p.party] ?? 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const party = Object.entries(topParty).sort((a, b) => b[1] - a[1])[0]?.[0];
              if (!party) return null;
              const year = statePromises.find((p) => p.party === party)?.electionYear ?? 2023;
              const card = getReportCard(stateCode, party, year);
              return <GovernmentReportCard data={card} />;
            })()}

            {/* Promise list */}
            {statePromises.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="ribbon-outline" size={48} color="#1F2937" />
                <Text style={styles.emptyTitle}>No promises tracked yet</Text>
              </View>
            ) : (
              statePromises.map((promise) => (
                <PromiseCard
                  key={promise.id}
                  promise={promise}
                  onFollow={() => toggleFollowPromise(promise.id)}
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
              issues={issues.map((i) => `${i.title} (${i.category}, ${i.severity})`)}
            />
          </View>
        )}

        {activeTab === 'headlines' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Ionicons name="newspaper" size={18} color="#3B82F6" />
              <Text style={styles.sectionTitle}>{t('dashboard.tabs.headlines')}</Text>
            </View>

            {headlines.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={48} color="#1F2937" />
                <Text style={styles.emptyTitle}>No headlines at this scope</Text>
              </View>
            ) : (
              headlines.map((hl) => (
                <HeadlineCard key={hl.id} headline={hl} />
              ))
            )}
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

      {/* Export Sheet */}
      <ExportSheet
        visible={exportVisible}
        onClose={() => setExportVisible(false)}
        filteredIssues={issues}
        allIssues={allIssues}
        filteredHeadlines={headlines}
        allHeadlines={allHeadlines}
        filteredSentiment={sentiment}
        allSentiment={allSentiment}
        scopeLabel={scopeLabel}
      />
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
  exportButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
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
  scopeRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 6,
    gap: 6,
  },
  scopeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#111827',
    gap: 4,
  },
  scopeChipActive: {
    backgroundColor: '#4F8EF7',
  },
  scopeChipDisabled: {
    opacity: 0.4,
  },
  scopeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  scopeChipTextActive: {
    color: '#FFFFFF',
  },
  scopeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 4,
  },
  scopeIndicatorText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
});
