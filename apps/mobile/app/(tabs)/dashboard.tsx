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
import { useResponsive } from '../../lib/responsive';
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

  // Stores — select raw state, never call methods inside selectors
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

  // Promise store — select raw arrays, derive in useMemo
  const allPromises = usePromiseStore((s) => s.promises);
  const toggleFollowPromise = usePromiseStore((s) => s.toggleFollowPromise);
  const getReportCard = usePromiseStore((s) => s.getReportCard);

  const statePromises = useMemo(
    () => allPromises.filter((p) => p.stateCode === stateCode),
    [allPromises, stateCode],
  );

  const constituencyId = myHome ? `${stateCode}-AC-${myHome.acNo}` : undefined;

  // Scope-filtered data — derive in useMemo from raw arrays
  const { issues, headlines, sentiment } = useMemo(() => {
    let filteredIssues = allIssues;
    let filteredHeadlines = allHeadlines;
    let filteredSentiment = allSentiment;

    if (scopeFilter === 'constituency' && constituencyId) {
      filteredIssues = allIssues.filter((i) => i.constituencyId === constituencyId);
      filteredHeadlines = allHeadlines.filter((h) => h.constituencyId === constituencyId);
      filteredSentiment = allSentiment.filter((s) => s.constituencyId === constituencyId);
    } else if (scopeFilter === 'state') {
      filteredIssues = allIssues.filter((i) => i.stateCode === stateCode);
      filteredHeadlines = allHeadlines.filter((h) => h.stateCode === stateCode);
      filteredSentiment = allSentiment.filter((s) => s.constituencyId.startsWith(stateCode));
    }

    // Apply issue filters
    if (issueFilter && issueFilter !== 'all') {
      filteredIssues = filteredIssues.filter((i) => i.category === issueFilter);
    }
    if (statusFilter && statusFilter !== 'all') {
      filteredIssues = filteredIssues.filter((i) => i.status === statusFilter);
    }

    return { issues: filteredIssues, headlines: filteredHeadlines, sentiment: filteredSentiment };
  }, [allIssues, allHeadlines, allSentiment, scopeFilter, stateCode, constituencyId, issueFilter, statusFilter]);

  // Scope label
  const scopeLabel = useMemo(() => {
    if (scopeFilter === 'constituency' && myHome) return myHome.name;
    if (scopeFilter === 'state') return (STATES as Record<string, { name: string }>)[stateCode]?.name ?? stateCode;
    return 'All India';
  }, [scopeFilter, stateCode, myHome]);

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

  const { insets } = useResponsive();

  return (
    <View style={styles.container}>
      {/* ── Compact Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.headerTitle}>{t('dashboard.title')}</Text>
          <View style={styles.scopeIndicator}>
            <Ionicons name="funnel" size={10} color="#6B7280" />
            <Text style={styles.scopeIndicatorText}>
              {scopeLabel} · {issues.length} item{issues.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton} onPress={() => setExportVisible(true)}>
            <Ionicons name="download-outline" size={18} color="#10B981" />
          </Pressable>
          {activeTab === 'issues' && (
            <Pressable style={styles.reportButton} onPress={() => setReportVisible(true)}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Scope Toggle (horizontal scroll) ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scopeScroll} contentContainerStyle={styles.scopeScrollContent}>
        {SCOPE_OPTIONS.map((opt) => {
          const active = scopeFilter === opt.key;
          const disabled = opt.key === 'constituency' && !myHome;
          return (
            <Pressable
              key={opt.key}
              style={[styles.scopeChip, active && styles.scopeChipActive, disabled && styles.scopeChipDisabled]}
              onPress={() => !disabled && setScopeFilter(opt.key)}
            >
              <Ionicons name={opt.icon as any} size={12} color={active ? '#FFF' : disabled ? '#374151' : '#9CA3AF'} />
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
      </ScrollView>

      {/* ── Tab Bar ── */}
      <View style={styles.tabRow}>
        {TAB_KEYS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={15} color={active ? '#FFF' : '#6B7280'} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t(tab.tKey)}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Content ── */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Delimitation Hub Entry Point */}
        <Pressable style={styles.delimBanner} onPress={() => router.push('/delimitation' as any)}>
          <View style={styles.delimBannerLeft}>
            <View style={styles.delimIconWrap}>
              <Ionicons name="map" size={18} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.delimBannerTitle}>Delimitation Tracker</Text>
              <Text style={styles.delimBannerSub}>How will boundary changes affect you?</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#374151" />
        </Pressable>

        {/* Election Analytics Entry Point */}
        <Pressable style={[styles.delimBanner, { borderColor: '#4F8EF730' }]} onPress={() => router.push('/analytics' as any)}>
          <View style={styles.delimBannerLeft}>
            <View style={[styles.delimIconWrap, { backgroundColor: '#4F8EF720' }]}>
              <Ionicons name="stats-chart" size={18} color="#4F8EF7" />
            </View>
            <View>
              <Text style={styles.delimBannerTitle}>Election Analytics</Text>
              <Text style={styles.delimBannerSub}>Swing seats, party strength, district heatmaps</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#374151" />
        </Pressable>

        {/* Quick Nav: Gold Standard Pillars */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: 12, marginBottom: 8 }} contentContainerStyle={{ gap: 8 }}>
          {[
            { label: 'Newsroom', icon: 'newspaper', color: '#3B82F6', route: '/journalist' },
            { label: 'Politicians', icon: 'people', color: '#8B5CF6', route: '/politician-portal' },
            { label: 'Campaigns', icon: 'flag', color: '#EF4444', route: '/campaign-manager' },
            { label: 'Civic Metrics', icon: 'bar-chart', color: '#10B981', route: '/civic-metrics' },
            { label: 'Live Election', icon: 'radio', color: '#F59E0B', route: '/live-election' },
            { label: 'Investor Demo', icon: 'rocket', color: '#EC4899', route: '/investor-demo' },
          ].map((item) => (
            <Pressable
              key={item.route}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: item.color + '15', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: item.color + '30' }}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons name={item.icon as any} size={16} color={item.color} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: item.color }}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {activeTab === 'issues' && (
          <View style={styles.tabContent}>
            {/* Compact stats row */}
            <View style={styles.statsRow}>
              {[
                { value: issueStats.open, label: t('dashboard.statusFilters.open'), color: '#3B82F6' },
                { value: issueStats.inProgress, label: 'In Progress', color: '#F59E0B' },
                { value: issueStats.resolved, label: t('dashboard.statusFilters.resolved'), color: '#10B981' },
                { value: issueStats.critical, label: 'Critical', color: '#EF4444' },
              ].map((stat) => (
                <View key={stat.label} style={[styles.statCard, { borderLeftColor: stat.color }]}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Category + Status filters (single scrollable row) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterScrollContent}>
              {STATUS_FILTER_KEYS.map((sf) => {
                const active = statusFilter === sf.key;
                return (
                  <Pressable
                    key={sf.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setStatusFilter(sf.key)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {t(sf.tKey)}
                    </Text>
                  </Pressable>
                );
              })}
              <View style={styles.filterDivider} />
              {topCategories.slice(0, 5).map(({ category, count }) => {
                const config = ISSUE_CATEGORY_CONFIG[category];
                const active = issueFilter === category;
                return (
                  <Pressable
                    key={category}
                    style={[styles.filterChip, active && { backgroundColor: config.color + '20', borderColor: config.color + '40' }]}
                    onPress={() => setIssueFilter(active ? 'all' : category)}
                  >
                    <Ionicons name={config.icon as any} size={11} color={active ? config.color : '#6B7280'} />
                    <Text style={[styles.filterChipText, active && { color: config.color }]}>
                      {config.label} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#10B98118',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  scopeScroll: {
    maxHeight: 36,
    marginBottom: 6,
  },
  scopeScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#111827',
    gap: 4,
  },
  scopeChipActive: {
    backgroundColor: '#4F8EF7',
  },
  scopeChipDisabled: {
    opacity: 0.35,
  },
  scopeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  scopeChipTextActive: {
    color: '#FFFFFF',
  },
  scopeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  scopeIndicatorText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#4F8EF7',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
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
    marginBottom: 10,
    gap: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderLeftWidth: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 1,
  },
  filterScroll: {
    maxHeight: 36,
    marginBottom: 10,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 6,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#4F8EF7',
    borderColor: '#4F8EF7',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#374151',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
  },
  sentimentItem: {
    marginHorizontal: 16,
  },
  bottomPadding: {
    height: 100,
  },
  delimBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#F59E0B20',
  },
  delimBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  delimIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F59E0B18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  delimBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  delimBannerSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 1,
  },
});
