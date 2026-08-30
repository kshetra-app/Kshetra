import { useState, useMemo, Component, useEffect, type ReactNode } from 'react';
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
import { useTheme } from '../../lib/theme';

const SCOPE_OPTIONS: { key: CivicScope; icon: string; tKey: string }[] = [
  { key: 'constituency', icon: 'location', tKey: 'common.scopes.myConstituency' },
  { key: 'state', icon: 'map', tKey: 'common.scopes.myState' },
  { key: 'national', icon: 'globe', tKey: 'common.scopes.national' },
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
        <View style={{ flex: 1, backgroundColor: '#FAF6EE', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="warning" size={48} color="#A8201A" />
          <Text style={{ color: '#16100E', fontSize: 18, fontWeight: '700', marginTop: 12 }}>Dashboard Error</Text>
          <Text style={{ color: '#5C554E', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{this.state.error}</Text>
          <Pressable
            style={{ marginTop: 16, backgroundColor: '#A8201A', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
            onPress={() => this.setState({ hasError: false, error: '' })}
          >
            <Text style={{ color: '#FAF6EE', fontWeight: '700' }}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

type DashboardTab = 'issues' | 'sentiment' | 'promises';

const TAB_KEYS: { key: DashboardTab; tKey: string; icon: string }[] = [
  { key: 'issues', tKey: 'dashboard.tabs.issues', icon: 'alert-circle' },
  { key: 'promises', tKey: 'dashboard.tabs.promises', icon: 'ribbon' },
  { key: 'sentiment', tKey: 'dashboard.tabs.sentiment', icon: 'pulse' },
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
  const { colors } = useTheme();
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

  const constituencyId = myHome ? `${stateCode}-AC-${myHome.acNo}` : undefined;

  useEffect(() => {
    if (stateCode === 'IN') {
      if (scopeFilter === 'state' || scopeFilter === 'constituency') {
        setScopeFilter('national');
      }
    }
  }, [stateCode, scopeFilter, setScopeFilter]);

  // Strict scope demarcation for promises: each level shows ONLY its own content.
  const scopedPromises = useMemo(() => {
    if (scopeFilter === 'constituency') {
      return myHome
        ? allPromises.filter((p) => p.stateCode === stateCode && p.constituencyAcNo === myHome.acNo)
        : [];
    }
    if (scopeFilter === 'national') {
      return allPromises.filter((p) => p.stateCode === 'NATIONAL');
    }
    return allPromises.filter((p) => p.stateCode === stateCode && p.constituencyAcNo == null);
  }, [allPromises, scopeFilter, stateCode, myHome]);

  const reportCard = useMemo(() => {
    const rulingParty = stateCode === 'AP' ? 'TDP' : stateCode === 'KA' ? 'INC' : stateCode === 'MH' ? 'BJP' : 'INC';
    if (scopeFilter === 'constituency' && myHome) {
      return getReportCard(stateCode, myHome.party || rulingParty, 2023);
    }
    if (scopeFilter === 'state' && stateCode !== 'IN') {
      return getReportCard(stateCode, rulingParty, 2023);
    }
    return getReportCard('TS', 'INC', 2023);
  }, [getReportCard, scopeFilter, stateCode, myHome]);

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
    return t('common.scopes.allIndia');
  }, [scopeFilter, stateCode, myHome, t]);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Compact Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('dashboard.title')}</Text>
          <View style={styles.scopeIndicator}>
            <Ionicons name="funnel" size={10} color={colors.textMuted} />
            <Text style={[styles.scopeIndicatorText, { color: colors.textMuted }]}>
              {scopeLabel} · {issues.length} {issues.length !== 1 ? t('common.items') : t('common.item')}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]} onPress={() => setExportVisible(true)}>
            <Ionicons name="download-outline" size={18} color={colors.teal} />
          </Pressable>
          {activeTab === 'issues' && (
            <Pressable style={[styles.reportButton, { backgroundColor: colors.primary }]} onPress={() => setReportVisible(true)}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Scope Toggle (horizontal scroll) ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scopeScroll} contentContainerStyle={styles.scopeScrollContent}>
        {SCOPE_OPTIONS.map((opt) => {
          const active = scopeFilter === opt.key;
          const disabled = (opt.key === 'constituency' && !myHome) || (stateCode === 'IN' && (opt.key === 'state' || opt.key === 'constituency'));
          return (
            <Pressable
              key={opt.key}
              style={[
                styles.scopeChip,
                { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
                disabled && styles.scopeChipDisabled,
              ]}
              onPress={() => !disabled && setScopeFilter(opt.key)}
            >
              <Ionicons
                name={opt.icon as any}
                size={12}
                color={active ? '#FFF' : disabled ? colors.textMuted : colors.textSecondary}
              />
              <Text
                style={[
                  styles.scopeChipText,
                  { color: colors.textSecondary },
                  active && styles.scopeChipTextActive,
                  disabled && { color: colors.textMuted },
                ]}
              >
                {opt.key === 'state'
                  ? (STATES as Record<string, { name: string }>)[stateCode]?.name ?? stateCode
                  : opt.key === 'constituency' && myHome
                    ? myHome.name
                    : t(opt.tKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Tab Bar ── */}
      <View style={[styles.tabRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
        {TAB_KEYS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, active && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={15} color={active ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.tabLabel, { color: colors.textSecondary }, active && styles.tabLabelActive]}>{t(tab.tKey)}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Content ── */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Election Analytics Entry Point */}
        <Pressable
          style={[styles.delimBanner, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}
          onPress={() => router.push('/analytics' as any)}
        >
          <View style={styles.delimBannerLeft}>
            <View style={[styles.delimIconWrap, { backgroundColor: colors.goldLight }]}>
              <Ionicons name="stats-chart" size={18} color={colors.gold} />
            </View>
            <View>
              <Text style={[styles.delimBannerTitle, { color: colors.text }]}>{t('dashboardExtended.electionAnalytics')}</Text>
              <Text style={[styles.delimBannerSub, { color: colors.textMuted }]}>{t('dashboardExtended.electionAnalyticsDesc')}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>

        {/* Quick Nav: Gold Standard Pillars */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: 12, marginBottom: 8 }} contentContainerStyle={{ gap: 8 }}>
          {[
            { tKey: 'dashboardExtended.civicMetrics', icon: 'bar-chart', color: colors.teal, route: '/civic-metrics' },
            { tKey: 'dashboardExtended.liveElection', icon: 'radio', color: colors.primary, route: '/live-election' },
            { tKey: 'dashboardExtended.investorDemo', icon: 'rocket', color: colors.gold, route: '/investor-demo' },
          ].map((item) => (
            <Pressable
              key={item.route}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.surface,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.goldBorder || colors.border,
              }}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons name={item.icon as any} size={16} color={item.color} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{t(item.tKey)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {activeTab === 'issues' && (
          <View style={styles.tabContent}>
            {/* Compact stats row */}
            <View style={styles.statsRow}>
              {[
                { value: issueStats.open, label: t('dashboard.statusFilters.open'), color: colors.primary },
                { value: issueStats.inProgress, label: t('dashboardExtended.inProgress'), color: colors.gold },
                { value: issueStats.resolved, label: t('dashboard.statusFilters.resolved'), color: colors.teal },
                { value: issueStats.critical, label: t('dashboardExtended.critical'), color: colors.danger },
              ].map((stat) => (
                <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface, borderLeftColor: stat.color, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
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
            {/* Report Card (top party) — only at state scope where aggregation is meaningful */}
            {scopeFilter === 'state' && scopedPromises.length > 0 && (() => {
              const topParty = scopedPromises.reduce((acc, p) => {
                acc[p.party] = (acc[p.party] ?? 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const party = Object.entries(topParty).sort((a, b) => b[1] - a[1])[0]?.[0];
              if (!party) return null;
              const year = scopedPromises.find((p) => p.party === party)?.electionYear ?? 2023;
              const card = getReportCard(stateCode, party, year);
              return <GovernmentReportCard data={card} />;
            })()}

            {/* Promise list */}
            {scopedPromises.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="ribbon-outline" size={48} color="#1F2937" />
                <Text style={styles.emptyTitle}>{t('dashboardExtended.noPromisesTracked')}</Text>
              </View>
            ) : (
              scopedPromises.map((promise) => (
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8BC7E',
    gap: 4,
  },
  scopeChipActive: {
    backgroundColor: '#A8201A',
    borderColor: '#A8201A',
  },
  scopeChipDisabled: {
    opacity: 0.35,
  },
  scopeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D5549',
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
    color: '#8E7B6F',
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E8DED1',
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
    backgroundColor: '#A8201A',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D5549',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#E8DED1',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#241814',
  },
  statLabel: {
    fontSize: 9,
    color: '#8E7B6F',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DED1',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#A8201A',
    borderColor: '#A8201A',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D5549',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E8DED1',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6D5549',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#D8BC7E',
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
    backgroundColor: '#F9F4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  delimBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#241814',
  },
  delimBannerSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E7B6F',
    marginTop: 1,
  },
});
