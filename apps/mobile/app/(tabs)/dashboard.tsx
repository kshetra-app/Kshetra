import { useState, useMemo } from 'react';
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
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>('issues');
  const [reportVisible, setReportVisible] = useState(false);

  const issues = useCivicStore((s) => s.getFilteredIssues());
  const headlines = useCivicStore((s) => s.headlines);
  const sentimentSorted = useCivicStore((s) => s.getSentimentSorted());
  const topCategories = useCivicStore((s) => s.getTopIssueCategories());
  const toggleUpvote = useCivicStore((s) => s.toggleUpvote);
  const addIssue = useCivicStore((s) => s.addIssue);
  const issueFilter = useCivicStore((s) => s.issueFilter);
  const statusFilter = useCivicStore((s) => s.statusFilter);
  const setIssueFilter = useCivicStore((s) => s.setIssueFilter);
  const setStatusFilter = useCivicStore((s) => s.setStatusFilter);
  const allIssues = useCivicStore((s) => s.issues);

  const issueStats = useMemo(() => {
    const open = allIssues.filter((i) => i.status === 'open').length;
    const inProgress = allIssues.filter((i) => i.status === 'in_progress' || i.status === 'acknowledged').length;
    const resolved = allIssues.filter((i) => i.status === 'resolved' || i.status === 'closed').length;
    const critical = allIssues.filter((i) => i.severity === 'critical').length;
    return { open, inProgress, resolved, critical };
  }, [allIssues]);

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

      {/* Single ScrollView — avoids Fabric crash from conditional ScrollView mount/unmount */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'issues' && (
          <>
            {/* Stats summary */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}>
                <Text style={styles.statValue}>{issueStats.open}</Text>
                <Text style={styles.statLabel}>Open</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
                <Text style={styles.statValue}>{issueStats.inProgress}</Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
                <Text style={styles.statValue}>{issueStats.resolved}</Text>
                <Text style={styles.statLabel}>Resolved</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#EF4444' }]}>
                <Text style={styles.statValue}>{issueStats.critical}</Text>
                <Text style={styles.statLabel}>Critical</Text>
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
                <Text style={styles.emptySubtitle}>Try changing filters or report a new issue</Text>
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
          </>
        )}

        {activeTab === 'sentiment' && (
          <>
            <View style={styles.sentimentHeader}>
              <Ionicons name="pulse" size={18} color="#8B5CF6" />
              <Text style={styles.sentimentTitle}>Constituency Mood Index</Text>
            </View>
            <Text style={styles.sentimentSubtitle}>
              Sorted by sentiment score (most negative first). Based on community post analysis.
            </Text>

            {sentimentSorted.map((item) => (
              <SentimentBar key={item.constituencyId} item={item} />
            ))}

            {/* AI Insights */}
            <AIDashboardSummary
              constituencyName={sentimentSorted[0]?.constituencyName}
              issues={allIssues.map((i) => `${i.title} (${i.category}, ${i.severity})`)}
            />
          </>
        )}

        {activeTab === 'headlines' && (
          <>
            <View style={styles.headlinesHeader}>
              <Ionicons name="newspaper" size={18} color="#3B82F6" />
              <Text style={styles.headlinesTitle}>Latest Headlines</Text>
            </View>
            <Text style={styles.headlinesSubtitle}>
              Telangana political and governance news
            </Text>

            {headlines.map((hl) => (
              <HeadlineCard key={hl.id} headline={hl} />
            ))}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Report Issue Sheet — mount only when needed to avoid Fabric Modal crash */}
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
    gap: 8,
  },
  analyticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F8EF720',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  analyticsButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F8EF7',
  },
  reportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
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
    gap: 5,
  },
  tabActive: {
    backgroundColor: '#4F8EF7',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
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
    gap: 6,
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
    gap: 4,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#111827',
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
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#4B5563',
  },
  sentimentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  sentimentTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sentimentSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  headlinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  headlinesTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headlinesSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  bottomPadding: {
    height: 100,
  },
});
