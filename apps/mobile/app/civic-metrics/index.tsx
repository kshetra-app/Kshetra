import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCivicMetricsStore } from '../../stores/civicMetrics';
import BudgetCard from '../../components/BudgetCard';
import BillCard from '../../components/BillCard';
import SchemeCard from '../../components/SchemeCard';
import ProjectCard from '../../components/ProjectCard';
import { useActiveStateStore } from '../../stores/activeState';
import { useTheme } from '../../lib/theme';
import {
  getCivicMetricsEmptyState,
  getConfirmedMetricTotal,
  type CivicMetricsLoadStatus,
} from '../../lib/civicMetricsDisplay';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';

type Tab = 'budget' | 'bills' | 'schemes' | 'projects' | 'rti' | 'hearings';

const TAB_KEYS: { key: Tab; i18nKey: string; icon: string }[] = [
  { key: 'budget', i18nKey: 'civicMetrics.tabs.budget', icon: 'wallet' },
  { key: 'bills', i18nKey: 'civicMetrics.tabs.bills', icon: 'document-text' },
  { key: 'schemes', i18nKey: 'civicMetrics.tabs.schemes', icon: 'gift' },
  { key: 'projects', i18nKey: 'civicMetrics.tabs.projects', icon: 'construct' },
  { key: 'rti', i18nKey: 'civicMetrics.tabs.rti', icon: 'search' },
  { key: 'hearings', i18nKey: 'civicMetrics.tabs.hearings', icon: 'calendar' },
];

function getWebUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function CivicMetricsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('budget');
  const [helpVisible, setHelpVisible] = useState(false);
  const activeState = useActiveStateStore((s) => s.stateCode) || 'TS';

  const store = useCivicMetricsStore();
  const loadBudgetSummary = useCivicMetricsStore((s) => s.loadBudgetSummary);
  const loadBillsByState = useCivicMetricsStore((s) => s.loadBillsByState);
  const loadSchemesByState = useCivicMetricsStore((s) => s.loadSchemesByState);
  const loadProjectsByState = useCivicMetricsStore((s) => s.loadProjectsByState);
  const loadPublicRTIs = useCivicMetricsStore((s) => s.loadPublicRTIs);
  const loadHearingsByState = useCivicMetricsStore((s) => s.loadHearingsByState);
  const billLoadStatus = useCivicMetricsStore((s) =>
    s.billLoadStateCode === activeState ? s.billLoadStatus : 'loading',
  );
  const billTotal = useCivicMetricsStore((s) =>
    s.billLoadStateCode === activeState
      ? getConfirmedMetricTotal(s.billLoadStatus, s.billTotal)
      : null,
  );
  const billPage = useCivicMetricsStore((s) => s.billLoadStateCode === activeState ? s.billPage : 0);
  const schemeLoadStatus = useCivicMetricsStore((s) =>
    s.schemeLoadStateCode === activeState ? s.schemeLoadStatus : 'loading',
  );
  const schemeTotal = useCivicMetricsStore((s) =>
    s.schemeLoadStateCode === activeState
      ? getConfirmedMetricTotal(s.schemeLoadStatus, s.schemeTotal)
      : null,
  );
  const schemePage = useCivicMetricsStore((s) => s.schemeLoadStateCode === activeState ? s.schemePage : 0);
  const projectLoadStatus = useCivicMetricsStore((s) =>
    s.projectLoadStateCode === activeState ? s.projectLoadStatus : 'loading',
  );
  const projectTotal = useCivicMetricsStore((s) =>
    s.projectLoadStateCode === activeState
      ? getConfirmedMetricTotal(s.projectLoadStatus, s.projectTotal)
      : null,
  );
  const projectPage = useCivicMetricsStore((s) => s.projectLoadStateCode === activeState ? s.projectPage : 0);
  const rtiLoadStatus = useCivicMetricsStore((s) =>
    s.rtiLoadStateCode === activeState ? s.rtiLoadStatus : 'loading',
  );
  const rtiTotal = useCivicMetricsStore((s) =>
    s.rtiLoadStateCode === activeState
      ? getConfirmedMetricTotal(s.rtiLoadStatus, s.rtiTotal)
      : null,
  );
  const budgetLoadStatus = useCivicMetricsStore((s) =>
    s.budgetLoadStateCode === activeState ? s.budgetLoadStatus : 'loading',
  );
  const hearingLoadStatus = useCivicMetricsStore((s) =>
    s.hearingLoadStateCode === activeState ? s.hearingLoadStatus : 'loading',
  );
  const hearingTotal = useCivicMetricsStore((s) =>
    s.hearingLoadStateCode === activeState
      ? getConfirmedMetricTotal(s.hearingLoadStatus, s.hearingTotal)
      : null,
  );
  const hearingPage = useCivicMetricsStore((s) =>
    s.hearingLoadStateCode === activeState ? s.hearingPage : 0,
  );
  useFocusEffect(useCallback(() => {
    void loadBudgetSummary(activeState);
    void loadBillsByState(activeState);
    void loadSchemesByState(activeState);
    void loadProjectsByState(activeState);
    void loadPublicRTIs(activeState);
    void loadHearingsByState(activeState);
  }, [activeState, loadBudgetSummary, loadBillsByState, loadSchemesByState, loadProjectsByState, loadPublicRTIs, loadHearingsByState]));

  const budgetSummary = useMemo(() => store.getBudgetSummary(activeState), [store, activeState]);
  const bills = useMemo(() => store.getBillsByState(activeState), [store, activeState]);
  const activeBills = useMemo(() => bills.filter((b) => !['enacted', 'lapsed', 'withdrawn'].includes(b.status)), [bills]);
  const schemes = useMemo(() => store.getSchemesByState(activeState), [store, activeState]);
  const projects = useMemo(() => store.getProjectsByState(activeState), [store, activeState]);
  const publicRTIs = useMemo(() => store.getPublicRTIs(activeState), [store, activeState]);
  const hearings = useMemo(() => store.getUpcomingHearings(activeState), [store, activeState]);

  const noConnectedData = t('civicMetrics.noConnectedData', {
    defaultValue: 'Verified records are not available from a connected source yet.',
  });
  const renderListEmptyState = (
    status: CivicMetricsLoadStatus,
    emptyMessage: string,
    retry: () => void,
  ) => {
    const emptyState = getCivicMetricsEmptyState(status);
    return (
      <>
        <Text style={styles.emptyText}>
          {emptyState === 'loading'
            ? t('common.loading')
            : emptyState === 'unavailable'
              ? noConnectedData
              : emptyMessage}
        </Text>
        {emptyState === 'unavailable' && (
          <Pressable accessibilityRole="button" onPress={retry}>
            <Text style={[styles.emptyText, { color: colors.primary }]}>{t('common.retry')}</Text>
          </Pressable>
        )}
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={colors.statusBar} />

      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('civicMetrics.screenTitle')}</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>{t('civicMetrics.screenSubtitle')}</Text>
        </View>
        <Pressable
          accessibilityLabel={t('discovery.pageHelp.openHelp', { defaultValue: 'Page Help' })}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1, marginLeft: 8 }]}
          onPress={() => setHelpVisible(true)}
        >
          <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { borderBottomColor: colors.border }]} contentContainerStyle={styles.tabBarContent}>
        {TAB_KEYS.map((tab) => (
          <Pressable 
            key={tab.key} 
            style={[
              styles.tab, 
              { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 },
              activeTab === tab.key && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]} 
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={(activeTab === tab.key ? tab.icon : `${tab.icon}-outline`) as any} size={15} color={activeTab === tab.key ? '#FFFFFF' : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: colors.textSecondary }, activeTab === tab.key && { color: '#FFFFFF', fontWeight: '700' }]}>{t(tab.i18nKey)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'budget' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('civicMetrics.stateBudgetOverview')}</Text>
            {budgetLoadStatus === 'loading' ? (
              <View style={styles.empty}><Text style={styles.emptyText}>{t('common.loading')}</Text></View>
            ) : budgetSummary ? <BudgetCard summary={budgetSummary} /> : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {budgetLoadStatus === 'error' ? noConnectedData : t('civicMetrics.noBudgetData')}
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'bills' && (
          <>
            {bills.length ? (
              <>
                <Text style={styles.sectionTitle}>
                  {t('civicMetrics.activeBillsLabel', { defaultValue: 'Active Bills & Legislation' })}
                </Text>
                {billLoadStatus === 'error' && <Text style={styles.emptyText}>{noConnectedData}</Text>}
                {activeBills.map((b) => <BillCard key={b.id} bill={b} onSupport={() => store.supportBill(b.id)} onOppose={() => store.opposeBill(b.id)} />)}
                {billTotal !== null && billPage * 50 < billTotal && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={billLoadStatus === 'loading'}
                    onPress={() => void store.loadMoreBillsByState(activeState)}
                    style={styles.empty}
                  >
                    <Text style={styles.emptyText}>
                      {billLoadStatus === 'loading' ? t('common.loading') : t('common.more')}
                    </Text>
                  </Pressable>
                )}
              </>
            ) : (
              <View style={styles.empty}>
                {renderListEmptyState(billLoadStatus, t('common.noResults'), () => {
                  void loadBillsByState(activeState);
                })}
              </View>
            )}
          </>
        )}

        {activeTab === 'schemes' && (
          <>
            {schemes.length ? (
              <>
                <Text style={styles.sectionTitle}>
                  {schemeTotal === null
                    ? t('civicMetrics.governmentSchemesLabel', { defaultValue: 'Government Schemes & Welfare' })
                    : t('civicMetrics.governmentSchemes', { count: schemeTotal })}
                </Text>
                {schemeLoadStatus === 'error' && <Text style={styles.emptyText}>{noConnectedData}</Text>}
                {schemes.map((s) => <SchemeCard key={s.id} scheme={s} />)}
                {schemeTotal !== null && schemePage * 50 < schemeTotal && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={schemeLoadStatus === 'loading'}
                    onPress={() => void store.loadMoreSchemesByState(activeState)}
                    style={styles.empty}
                  >
                    <Text style={styles.emptyText}>
                      {schemeLoadStatus === 'loading' ? t('common.loading') : t('common.more')}
                    </Text>
                  </Pressable>
                )}
              </>
            ) : (
              <View style={styles.empty}>
                {renderListEmptyState(schemeLoadStatus, t('common.noResults'), () => {
                  void loadSchemesByState(activeState);
                })}
              </View>
            )}
          </>
        )}

        {activeTab === 'projects' && (
          <>
            {projects.length ? (
              <>
                <Text style={styles.sectionTitle}>
                  {projectTotal === null
                    ? t('civicMetrics.developmentProjectsLabel', { defaultValue: 'Infrastructure & Development Projects' })
                    : t('civicMetrics.developmentProjects', { count: projectTotal })}
                </Text>
                {projectLoadStatus === 'error' && <Text style={styles.emptyText}>{noConnectedData}</Text>}
                {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
                {projectTotal !== null && projectPage * 50 < projectTotal && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={projectLoadStatus === 'loading'}
                    onPress={() => void store.loadMoreProjectsByState(activeState)}
                    style={styles.empty}
                  >
                    <Text style={styles.emptyText}>
                      {projectLoadStatus === 'loading' ? t('common.loading') : t('common.more')}
                    </Text>
                  </Pressable>
                )}
              </>
            ) : (
              <View style={styles.empty}>
                {renderListEmptyState(projectLoadStatus, t('common.noResults'), () => {
                  void loadProjectsByState(activeState);
                })}
              </View>
            )}
          </>
        )}

        {activeTab === 'rti' && (
          <>
            {publicRTIs.length ? <>
            <Text style={styles.sectionTitle}>
              {rtiTotal === null
                ? t('civicMetrics.publicRTIRequestsLabel', { defaultValue: 'Public RTI Requests' })
                : t('civicMetrics.publicRTIRequests', { count: rtiTotal })}
            </Text>
            {rtiLoadStatus === 'error' && <Text style={styles.emptyText}>{noConnectedData}</Text>}
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
                {r.responseText && <Text style={styles.rtiResponse} numberOfLines={2}>{t('civicMetrics.response', { text: r.responseText })}</Text>}
                <View style={styles.rtiFooter}>
                  <Pressable style={styles.rtiUpvote} onPress={() => store.upvoteRTI(r.id)}>
                    <Ionicons name="arrow-up" size={14} color="#4F8EF7" />
                    <Text style={styles.rtiUpvoteText}>{r.upvotes}</Text>
                  </Pressable>
                  <Text style={styles.rtiViews}>{t('civicMetrics.views', { count: r.views })}</Text>
                  <Text style={styles.rtiDate}>
                    {r.filedDate ? t('civicMetrics.filed', { date: r.filedDate }) : t('common.dataUnavailable')}
                  </Text>
                </View>
              </View>
            ))}
            {rtiTotal !== null && publicRTIs.length < rtiTotal && (
              <Pressable
                accessibilityRole="button"
                disabled={rtiLoadStatus === 'loading'}
                onPress={() => void store.loadMorePublicRTIs(activeState)}
                style={styles.empty}
              >
                <Text style={styles.emptyText}>
                  {rtiLoadStatus === 'loading' ? t('common.loading') : t('common.more')}
                </Text>
              </Pressable>
            )}
            </> : (
              <View style={styles.empty}>
                {renderListEmptyState(rtiLoadStatus, t('common.noResults'), () => {
                  void loadPublicRTIs(activeState);
                })}
              </View>
            )}
          </>
        )}

        {activeTab === 'hearings' && (
          <>
            {hearings.length ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {hearingTotal === null
                    ? t('civicMetrics.publicHearingsLabel', { defaultValue: 'Public hearings' })
                    : t('civicMetrics.publicHearings', { count: hearingTotal })}
                </Text>
                {hearingLoadStatus === 'error' && <Text style={styles.emptyText}>{noConnectedData}</Text>}
                {hearings.map((hearing) => {
                  const registrationUrl = hearing.isOpen ? getWebUrl(hearing.registrationUrl) : null;
                  return (
                    <View
                      key={hearing.id}
                      style={[styles.hearingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Text style={[styles.hearingTitle, { color: colors.text }]}>{hearing.title}</Text>
                      <Text style={[styles.hearingMeta, { color: colors.textSecondary }]}>
                        {hearing.organizer} · {hearing.districtName}, {hearing.stateCode}
                      </Text>
                      <Text style={[styles.hearingMeta, { color: colors.textSecondary }]}>
                        {hearing.venue} · {hearing.date} · {hearing.time}
                      </Text>
                      {hearing.description ? (
                        <Text style={[styles.hearingDescription, { color: colors.textSecondary }]}>
                          {hearing.description}
                        </Text>
                      ) : null}
                      {registrationUrl ? (
                        <Pressable
                          accessibilityRole="link"
                          onPress={() => void Linking.openURL(registrationUrl).catch(() => undefined)}
                          style={styles.hearingRegister}
                        >
                          <Text style={[styles.hearingRegisterText, { color: colors.primary }]}>
                            {t('civicMetrics.registerForHearing')}
                          </Text>
                          <Ionicons name="open-outline" size={14} color={colors.primary} />
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
                {hearingTotal !== null && hearings.length < hearingTotal && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={hearingLoadStatus === 'loading'}
                    onPress={() => void store.loadMoreHearingsByState(activeState)}
                    style={styles.empty}
                  >
                    <Text style={styles.emptyText}>
                      {hearingLoadStatus === 'loading' ? t('common.loading') : t('common.more')}
                    </Text>
                  </Pressable>
                )}
              </>
            ) : (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {getCivicMetricsEmptyState(hearingLoadStatus) === 'loading'
                    ? t('common.loading')
                    : getCivicMetricsEmptyState(hearingLoadStatus) === 'unavailable'
                      ? noConnectedData
                      : t('civicMetrics.noUpcomingHearings')}
                </Text>
                {getCivicMetricsEmptyState(hearingLoadStatus) === 'unavailable' && (
                  <Pressable accessibilityRole="button" onPress={() => void loadHearingsByState(activeState)}>
                    <Text style={[styles.emptyText, { color: colors.primary }]}>{t('common.retry')}</Text>
                  </Pressable>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Contextual Guidance */}
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="civic-metrics"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  headerSub: { fontSize: 11, fontWeight: '600' },
  tabBar: { maxHeight: 48, borderBottomWidth: 1 },
  tabBarContent: { paddingHorizontal: 12, gap: 4, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  tabActive: {},
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabLabelActive: { fontWeight: '700' },
  content: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14 },
  rtiCard: { borderRadius: 14, marginHorizontal: 16, marginVertical: 5, padding: 14, borderWidth: 1 },
  rtiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  rtiSubject: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  rtiStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rtiStatusText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  rtiDept: { fontSize: 11, marginBottom: 6 },
  rtiQuestion: { fontSize: 12, lineHeight: 17, marginBottom: 6 },
  rtiResponse: { fontSize: 12, lineHeight: 17, marginBottom: 6, fontStyle: 'italic' },
  rtiFooter: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 8, borderTopWidth: 1 },
  rtiUpvote: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rtiUpvoteText: { fontSize: 12, fontWeight: '700' },
  rtiViews: { fontSize: 11 },
  rtiDate: { fontSize: 11, marginLeft: 'auto' },
  hearingCard: { borderRadius: 14, marginHorizontal: 16, marginVertical: 5, padding: 14, borderWidth: 1 },
  hearingTitle: { fontSize: 14, fontWeight: '700', marginBottom: 5 },
  hearingMeta: { fontSize: 11, lineHeight: 16 },
  hearingDescription: { fontSize: 12, lineHeight: 17, marginTop: 7 },
  hearingRegister: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  hearingRegisterText: { fontSize: 12, fontWeight: '700' },
});
