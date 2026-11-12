/**
 * Administrative Hierarchy drill-down screen.
 *
 * Route: /hierarchy/[id] where id = AC number; uses the active state.
 * Live builds drill through persisted constituency, local-body, ward, and booth
 * records. Development builds retain the existing pilot seed experience.
 */
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SubConstituencyHierarchyDTO } from '@kshetra/shared';
import { apiClient, ApiError } from '../../lib/api';
import { IS_LIVE_ENVIRONMENT } from '../../lib/environment';
import {
  getBoothsForHierarchyBody,
  getBoothsForHierarchyWard,
  getBoothsWithoutHierarchyBody,
  getBoothsWithoutHierarchyWard,
  getHierarchyBodies,
} from '../../lib/liveHierarchy';
import { useTheme } from '../../lib/useTheme';
import type { ThemeColors } from '../../lib/theme';
import { getPartyColor } from '../../lib/constants';
import { useActiveStateStore } from '../../stores/activeState';
import { getUnifiedConstituenciesForState } from '../../lib/stateDataAdapter';
import {
  getHierarchyConfig,
  getHierarchyLabelsConfig,
  getConstituencyDataStatus,
  getConstituencyHierarchySummary,
  getMandalsForConstituency,
  getPanchayatsForMandal,
  getBoothsForPanchayat,
  getBoothsForConstituency,
  hasCurrentBoothVoterCount,
  type MandalWithOverlap,
  type GramPanchayat,
} from '../../lib/hierarchyData';
import DataPendingCard from '../../components/DataPendingCard';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';

type Level = 'mandals' | 'panchayats' | 'booths';
type LiveHierarchyState = {
  status: 'loading' | 'ready' | 'missing' | 'error';
  data: SubConstituencyHierarchyDTO | null;
};

export default function HierarchyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const stateCodeStore = useActiveStateStore((s) => s.stateCode);
  const setStateCode = useActiveStateStore((s) => s.setStateCode);

  const { parsedStateCode, parsedAcNo } = useMemo(() => {
    let sCode = stateCodeStore;
    let aNo = parseInt(id, 10);
    if (id && typeof id === 'string' && id.includes('-AC-')) {
      const parts = id.split('-AC-');
      sCode = parts[0].toUpperCase();
      aNo = parseInt(parts[1], 10);
    }
    return { parsedStateCode: sCode, parsedAcNo: aNo };
  }, [id, stateCodeStore]);

  const stateCode = parsedStateCode;
  const acNo = parsedAcNo;
  const [liveHierarchy, setLiveHierarchy] = useState<LiveHierarchyState>({ status: 'loading', data: null });
  const [liveReloadToken, setLiveReloadToken] = useState(0);
  const [liveBodyKey, setLiveBodyKey] = useState<string | null>(null);
  const [liveWardKey, setLiveWardKey] = useState<string | null>(null);

  useEffect(() => {
    if (parsedStateCode && parsedStateCode !== 'IN' && parsedStateCode !== stateCodeStore) {
      setStateCode(parsedStateCode);
    }
  }, [parsedStateCode, stateCodeStore, setStateCode]);

  useEffect(() => {
    if (!IS_LIVE_ENVIRONMENT) return;
    if (!stateCode || stateCode === 'IN' || !Number.isInteger(acNo) || acNo <= 0) {
      setLiveHierarchy({ status: 'missing', data: null });
      return;
    }
    let active = true;
    setLiveHierarchy({ status: 'loading', data: null });
    void apiClient.constituencies.getHierarchy(stateCode, acNo).then((data) => {
      if (active) setLiveHierarchy({ status: 'ready', data });
    }).catch((error: unknown) => {
      if (!active) return;
      const apiErrorCode =
        error instanceof ApiError &&
        typeof error.data === 'object' &&
        error.data !== null &&
        'code' in error.data
          ? error.data.code
          : null;
      setLiveHierarchy({
        status: apiErrorCode === 'HIERARCHY_NOT_FOUND' ? 'missing' : 'error',
        data: null,
      });
    });
    return () => { active = false; };
  }, [stateCode, acNo, liveReloadToken]);

  useEffect(() => {
    setLiveBodyKey(null);
    setLiveWardKey(null);
  }, [stateCode, acNo]);

  const config = IS_LIVE_ENVIRONMENT ? null : getHierarchyConfig(stateCode);
  const summary = useMemo(
    () => (IS_LIVE_ENVIRONMENT ? null : getConstituencyHierarchySummary(stateCode, acNo)),
    [stateCode, acNo],
  );
  const constituency = useMemo(
    () =>
      IS_LIVE_ENVIRONMENT
        ? null
        : getUnifiedConstituenciesForState(stateCode).find((c) => c.acNo === acNo) ?? null,
    [stateCode, acNo],
  );
  const liveData = liveHierarchy.data;
  const liveBodies = useMemo(() => (liveData ? getHierarchyBodies(liveData) : []), [liveData]);
  const liveSelectedBody = liveBodies.find((body) => body.key === liveBodyKey) ?? null;
  const liveSelectedWard =
    liveSelectedBody?.wards.find((ward) => ward.internalId === liveWardKey) ?? null;
  const liveBodyBooths = useMemo(
    () => (liveData && liveSelectedBody ? getBoothsForHierarchyBody(liveData, liveSelectedBody) : []),
    [liveData, liveSelectedBody],
  );
  const liveWardBooths = useMemo(
    () =>
      liveData && liveSelectedBody && liveSelectedWard
        ? getBoothsForHierarchyWard(liveData, liveSelectedBody, liveSelectedWard)
        : [],
    [liveData, liveSelectedBody, liveSelectedWard],
  );
  const liveBoothsWithoutWard = useMemo(
    () =>
      liveData && liveSelectedBody
        ? getBoothsWithoutHierarchyWard(liveData, liveSelectedBody)
        : [],
    [liveData, liveSelectedBody],
  );
  const liveBoothsWithoutBody = useMemo(
    () => (liveData ? getBoothsWithoutHierarchyBody(liveData) : []),
    [liveData],
  );

  const [level, setLevel] = useState<Level>('mandals');
  const [mandal, setMandal] = useState<MandalWithOverlap | null>(null);
  const [panchayat, setPanchayat] = useState<GramPanchayat | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);

  const mandals = useMemo(
    () => (IS_LIVE_ENVIRONMENT ? [] : getMandalsForConstituency(stateCode, acNo)),
    [stateCode, acNo],
  );
  const panchayats = useMemo(
    () => (!IS_LIVE_ENVIRONMENT && mandal ? getPanchayatsForMandal(stateCode, mandal.id) : []),
    [stateCode, mandal],
  );
  const booths = useMemo(() => {
    if (IS_LIVE_ENVIRONMENT) return [];
    if (panchayat) return getBoothsForPanchayat(stateCode, panchayat.id);
    return getBoothsForConstituency(stateCode, acNo);
  }, [stateCode, acNo, panchayat]);

  const labels = config?.displayLabels;

  // ─── Data-pending state (zero-fabrication) ───
  // Live builds use the persisted API above; the remaining pending state is
  // for development builds without verified pilot seed coverage.
  if (IS_LIVE_ENVIRONMENT) {
    const liveBooths = liveData?.pollingBooths ?? [];
    const liveConstituency = liveData?.constituency;
    const atBodyList = !liveSelectedBody;
    const atWardList = !!liveSelectedBody && !liveSelectedWard;
    const bodyTitle = liveSelectedBody?.name ?? liveConstituency?.name ?? `AC ${acNo}`;

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: `${liveConstituency?.name ?? t('hierarchy.constituency')} — ${t('hierarchy.hierarchyLabel')}`,
            headerBackTitle: t('hierarchy.back'),
            headerRight: () => (
              <Pressable
                accessibilityLabel={t('discovery.pageHelp.openHelp', { defaultValue: 'Page Help' })}
                style={{ padding: 4 }}
                onPress={() => setHelpVisible(true)}
              >
                <Ionicons name="help-circle-outline" size={20} color={colors.text} />
              </Pressable>
            ),
          }}
        />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
          <View style={styles.pendingHeader}>
            <Ionicons name="git-branch-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {bodyTitle}
            </Text>
          </View>

          {liveHierarchy.status === 'loading' ? (
            <View style={{ paddingVertical: 28, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.note, { color: colors.textSecondary, marginTop: 10 }]}>
                {t('common.loading')}
              </Text>
            </View>
          ) : liveHierarchy.status === 'error' ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.note, { color: colors.textSecondary }]}>
                {t('common.error')}
              </Text>
              <Pressable onPress={() => setLiveReloadToken((token) => token + 1)} style={{ marginTop: 12 }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {t('common.retry')}
                </Text>
              </Pressable>
            </View>
          ) : liveHierarchy.status === 'missing' || !liveData ? (
            <DataPendingCard
              title={`${t('hierarchy.constituency')} records`}
              message={t('hierarchy.noDataAvailable')}
              sourceNote="Persisted constituency geography records"
            />
          ) : liveBodies.length === 0 && liveBooths.length === 0 ? (
            <DataPendingCard
              title={`${t('hierarchy.constituency')} records`}
              message={t('hierarchy.noDataAvailable')}
              sourceNote="Persisted constituency geography records"
            />
          ) : (
            <>
              <View style={[styles.breadcrumbContainer, { borderBottomColor: colors.border }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.breadcrumb}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => { setLiveBodyKey(null); setLiveWardKey(null); }}
                    disabled={atBodyList}
                    style={styles.crumb}
                  >
                    <Text style={[styles.crumbText, { color: atBodyList ? colors.text : colors.primary }]}>
                      {liveConstituency?.name ?? `AC ${acNo}`}
                    </Text>
                  </Pressable>
                  {liveSelectedBody ? (
                    <>
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setLiveWardKey(null)}
                        disabled={atWardList}
                        style={styles.crumb}
                      >
                        <Text style={[styles.crumbText, { color: atWardList ? colors.text : colors.primary }]}>
                          {liveSelectedBody.name}
                        </Text>
                      </Pressable>
                    </>
                  ) : null}
                  {liveSelectedWard ? (
                    <>
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                      <Text numberOfLines={1} style={[styles.crumbText, { color: colors.text }]}>
                        {liveSelectedWard.name || `${t('hierarchy.ward')} ${liveSelectedWard.wardNo}`}
                      </Text>
                    </>
                  ) : null}
                </ScrollView>
              </View>

              {atBodyList ? (
                <>
                  <View style={styles.summaryRow}>
                    <Stat colors={colors} value={liveData.urbanLocalBodies.length} label={t('hierarchy.urban')} icon="business" />
                    <Stat colors={colors} value={liveData.gramPanchayats.length} label={t('hierarchy.rural')} icon="home" />
                    <Stat colors={colors} value={liveBooths.length} label={t('hierarchy.booths')} icon="location" />
                  </View>
                  {liveBodies.map((body) => {
                    const bodyBooths = getBoothsForHierarchyBody(liveData, body);
                    const bodyKind = body.kind === 'ulb' ? t('hierarchy.urban') : t('hierarchy.rural');
                    return (
                      <Pressable
                        key={body.key}
                        accessibilityRole="button"
                        onPress={() => { setLiveBodyKey(body.key); setLiveWardKey(null); }}
                        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <View style={styles.cardHead}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>{body.name}</Text>
                            {body.localName ? <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{body.localName}</Text> : null}
                            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                              {bodyKind} · {body.wards.length} {t('hierarchy.wards')} · {bodyBooths.length} {t('hierarchy.booths')}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </View>
                      </Pressable>
                    );
                  })}
                  {liveBoothsWithoutBody.length > 0 ? (
                    <View style={{ marginTop: 10 }}>
                      <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 8 }]}>
                        {t('hierarchy.unassigned', { defaultValue: 'Booths without a linked local body' })}
                      </Text>
                      {liveBoothsWithoutBody.map((booth) => (
                        <LiveBoothCard
                          key={booth.id}
                          booth={booth}
                          colors={colors}
                          voterLabel={t('hierarchy.voters')}
                          registeredVotersLabel={t('hierarchy.registeredVoters')}
                        />
                      ))}
                    </View>
                  ) : null}
                  {liveBodies.length === 0 && liveBooths.length > 0 ? (
                    <DataPendingCard
                      title={`${t('hierarchy.booth')} records`}
                      message={t('hierarchy.noDataAvailable')}
                      sourceNote="Persisted constituency geography records; local-body links were not resolved"
                    />
                  ) : null}
                </>
              ) : atWardList && liveSelectedBody ? (
                <>
                  {liveSelectedBody.wards.map((ward) => {
                    const wardBooths = getBoothsForHierarchyWard(liveData, liveSelectedBody, ward);
                    return (
                      <Pressable
                        key={ward.internalId}
                        accessibilityRole="button"
                        onPress={() => setLiveWardKey(ward.internalId)}
                        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <View style={styles.cardHead}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>
                              {ward.name || `${t('hierarchy.ward')} ${ward.wardNo}`}
                            </Text>
                            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                              {t('hierarchy.ward')} {ward.wardNo} · {wardBooths.length} {t('hierarchy.booths')}
                              {ward.reservation ? ` · ${ward.reservation}` : ''}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        </View>
                      </Pressable>
                    );
                  })}
                  {liveBoothsWithoutWard.length > 0 ? (
                    <View style={{ marginTop: 10 }}>
                      <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 8 }]}>
                        {t('hierarchy.unassigned', { defaultValue: 'Booths without a linked ward' })}
                      </Text>
                      {liveBoothsWithoutWard.map((booth) => (
                        <LiveBoothCard
                          key={booth.id}
                          booth={booth}
                          colors={colors}
                          voterLabel={t('hierarchy.voters')}
                          registeredVotersLabel={t('hierarchy.registeredVoters')}
                        />
                      ))}
                    </View>
                  ) : null}
                  {liveSelectedBody.wards.length === 0 && liveBodyBooths.length === 0 ? (
                    <Text style={[styles.note, { color: colors.textSecondary }]}>{t('hierarchy.noBoothSamples')}</Text>
                  ) : null}
                </>
              ) : liveSelectedBody && liveSelectedWard ? (
                liveWardBooths.length === 0 ? (
                  <Text style={[styles.note, { color: colors.textSecondary }]}>{t('hierarchy.noBoothSamples')}</Text>
                ) : (
                  liveWardBooths.map((booth) => (
                    <LiveBoothCard
                      key={booth.id}
                      booth={booth}
                      colors={colors}
                      voterLabel={t('hierarchy.voters')}
                      registeredVotersLabel={t('hierarchy.registeredVoters')}
                    />
                  ))
                )
              ) : null}
            </>
          )}
        </ScrollView>
        <DiscoveryHubSheet
          visible={helpVisible}
          onClose={() => setHelpVisible(false)}
          sourceScreen="hierarchy"
        />
      </View>
    );
  }

  const dataStatus = getConstituencyDataStatus(stateCode, acNo);
  if (dataStatus !== 'verified' || !config || !summary || summary.mandalCount === 0) {
    const labelCfg = getHierarchyLabelsConfig(stateCode);
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: t('hierarchy.screenTitle'), headerBackTitle: t('hierarchy.back') }} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
          <View style={styles.pendingHeader}>
            <Ionicons name="git-branch-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {constituency?.name ?? `AC ${acNo}`}
            </Text>
          </View>
          <DataPendingCard
            title={`${labelCfg.displayLabels.mandal} → ${labelCfg.displayLabels.panchayat} → ${labelCfg.displayLabels.booth} drill-down`}
            message={`Verified booth-level structure for ${labelCfg.stateName} is being ingested from the Local Government Directory (LGD) and the Chief Electoral Officer. We only display data confirmed from official sources.`}
            sourceNote="LGD (lgdirectory.gov.in) · CEO booth rolls · State Election Commission"
          />
        </ScrollView>
      </View>
    );
  }

  const goMandals = () => { setLevel('mandals'); setMandal(null); setPanchayat(null); };
  const goPanchayats = (m: MandalWithOverlap) => { setMandal(m); setPanchayat(null); setLevel('panchayats'); };
  const goBooths = (p: GramPanchayat) => { setPanchayat(p); setLevel('booths'); };

  const Crumb = ({ label, active, onPress }: { label: string; active: boolean; onPress?: () => void }) => (
    <Pressable onPress={onPress} disabled={active} style={styles.crumb}>
      <Text numberOfLines={1} style={[styles.crumbText, { color: active ? colors.text : colors.primary }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: `${constituency?.name ?? t('hierarchy.constituency')} — ${t('hierarchy.hierarchyLabel')}`,
          headerBackTitle: t('hierarchy.back'),
          headerRight: () => (
            <Pressable
              accessibilityLabel={t('discovery.pageHelp.openHelp', { defaultValue: 'Page Help' })}
              style={{ padding: 4 }}
              onPress={() => setHelpVisible(true)}
            >
              <Ionicons name="help-circle-outline" size={20} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      {/* Breadcrumb */}
      <View style={[styles.breadcrumbContainer, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.breadcrumb}
        >
          <Crumb label={constituency?.name ?? `AC ${acNo}`} active={level === 'mandals'} onPress={goMandals} />
          {mandal && (
            <>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginHorizontal: 2 }} />
              <Crumb label={mandal.name} active={level === 'panchayats'} onPress={() => goPanchayats(mandal)} />
            </>
          )}
          {panchayat && (
            <>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginHorizontal: 2 }} />
              <Crumb label={panchayat.name} active={level === 'booths'} />
            </>
          )}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        {/* Summary (only at top level) */}
        {level === 'mandals' && (
          <View style={[styles.summaryRow]}>
            <Stat colors={colors} value={summary.mandalCount} label={`${labels?.mandal ?? 'Mandal'}s`} icon="map" />
            <Stat colors={colors} value={summary.panchayatCount} label={`${labels?.panchayat ?? 'GP'}s`} icon="home" />
            <Stat colors={colors} value={summary.boothCount} label={`${labels?.booth ?? 'Booth'}s`} icon="business" />
          </View>
        )}

        {/* MANDALS */}
        {level === 'mandals' && mandals.map((m) => (
          <Pressable key={m.id} onPress={() => goPanchayats(m)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{m.name}</Text>
                <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                  {labels?.mandal ?? t('hierarchy.mandal')} · {m.totalGPs} {labels?.panchayat ?? t('hierarchy.gp')}s
                  {m.totalPopulation ? ` · ${m.totalPopulation.toLocaleString('en-IN')} ${t('hierarchy.pop')}` : ''}
                </Text>
              </View>
              <View style={[styles.pct, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.pctText, { color: colors.primary }]}>{m.overlapPercentage}%</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
        ))}

        {/* PANCHAYATS */}
        {level === 'panchayats' && (
          panchayats.length === 0 ? (
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              {t('hierarchy.noPanchayatSamples', { panchayat: labels?.panchayat ?? t('hierarchy.panchayat'), mandal: labels?.mandal ?? t('hierarchy.mandalLower') })}
            </Text>
          ) : panchayats.map((p) => (
            <Pressable key={p.id} onPress={() => goBooths(p)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{p.name}</Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                    {t('hierarchy.villages', { count: p.totalVillages })}
                    {p.totalVoters ? ` · ${p.totalVoters.toLocaleString('en-IN')} ${t('hierarchy.voters')}` : ''}
                  </Text>
                </View>
                {p.sarpanchParty ? (
                  <View style={[styles.partyBadge, { backgroundColor: getPartyColor(p.sarpanchParty) + '22', borderColor: getPartyColor(p.sarpanchParty) }]}>
                    <Text style={[styles.partyText, { color: getPartyColor(p.sarpanchParty) }]}>{p.sarpanchParty}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
              {p.sarpanchName ? (
                <Text style={[styles.sarpanch, { color: colors.textMuted }]}>
                  {labels?.sarpanch ?? t('hierarchy.sarpanch')}: {p.sarpanchName}
                </Text>
              ) : null}
            </Pressable>
          ))
        )}

        {/* BOOTHS */}
        {level === 'booths' && (
          booths.length === 0 ? (
            <Text style={[styles.note, { color: colors.textSecondary }]}>{t('hierarchy.noBoothSamples')}</Text>
          ) : booths.map((b) => (
            <View key={b.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHead}>
                <View style={[styles.boothNo, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.boothNoText, { color: colors.primary }]}>{b.boothNumber}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{b.nameEn}</Text>
                  {b.nameTe ? <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{b.nameTe}</Text> : null}
                </View>
                {b.historical ? (
                  <View style={[styles.tag, { backgroundColor: colors.textMuted + '22' }]}>
                    <Text style={[styles.tagText, { color: colors.textMuted }]}>
                      {t('mapExtended.boothHistorical', { year: b.sourceYear ?? '—' })}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.tag, { backgroundColor: (b.isUrban ? colors.warning : colors.success) + '22' }]}>
                    <Text style={[styles.tagText, { color: b.isUrban ? colors.warning : colors.success }]}>
                      {b.isUrban ? t('hierarchy.urban') : t('hierarchy.rural')}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.boothStats}>
                {hasCurrentBoothVoterCount(b) ? (
                  <Text style={[styles.boothStat, { color: colors.text }]}>
                    {b.totalVoters.toLocaleString('en-IN')} {t('hierarchy.voters')}
                  </Text>
                ) : (
                  <Text style={[styles.boothStatMuted, { color: colors.textMuted }]}>
                    {t('hierarchy.registeredVoters')}: —
                  </Text>
                )}
                {b.maleVoters != null ? <Text style={[styles.boothStatMuted, { color: colors.textMuted }]}>M {b.maleVoters.toLocaleString('en-IN')}</Text> : null}
                {b.femaleVoters != null ? <Text style={[styles.boothStatMuted, { color: colors.textMuted }]}>F {b.femaleVoters.toLocaleString('en-IN')}</Text> : null}
                {b.location ? <Text style={[styles.boothStatMuted, { color: colors.textMuted }]}>{b.location.latitude.toFixed(3)}, {b.location.longitude.toFixed(3)}</Text> : null}
              </View>
            </View>
          ))
        )}

        <Text style={[styles.footer, { color: colors.textMuted }]}>
          {t('hierarchy.footer', { stateName: config.stateName })}
        </Text>
      </ScrollView>

      {/* Contextual Guidance */}
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="hierarchy"
      />
    </View>
  );
}

function Stat({ colors, value, label, icon }: {
  colors: ThemeColors;
  value: number;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function LiveBoothCard({
  booth,
  colors,
  voterLabel,
  registeredVotersLabel,
}: {
  booth: SubConstituencyHierarchyDTO['pollingBooths'][number];
  colors: ThemeColors;
  voterLabel: string;
  registeredVotersLabel: string;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHead}>
        <View style={[styles.boothNo, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.boothNoText, { color: colors.primary }]}>{booth.boothNumber}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {booth.boothName || booth.pollingStationName || '—'}
          </Text>
          {booth.pollingStationName && booth.pollingStationName !== booth.boothName ? (
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{booth.pollingStationName}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.boothStats}>
        {booth.totalVoters !== null && booth.totalVoters > 0 ? (
          <Text style={[styles.boothStat, { color: colors.text }]}>
            {booth.totalVoters.toLocaleString('en-IN')} {voterLabel}
          </Text>
        ) : (
          <Text style={[styles.boothStatMuted, { color: colors.textMuted }]}>
            {registeredVotersLabel}: —
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  pendingHeader: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  breadcrumbContainer: { borderBottomWidth: StyleSheet.hairlineWidth },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 4 },
  crumb: { maxWidth: 140 },
  crumbText: { fontSize: 13, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 3 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600' },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 12.5, marginTop: 2 },
  pct: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pctText: { fontSize: 12, fontWeight: '700' },
  partyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  partyText: { fontSize: 11, fontWeight: '800' },
  sarpanch: { fontSize: 12, marginTop: 8 },
  boothNo: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  boothNoText: { fontSize: 14, fontWeight: '800' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: '700' },
  boothStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  boothStat: { fontSize: 13, fontWeight: '700' },
  boothStatMuted: { fontSize: 12.5 },
  note: { fontSize: 13, textAlign: 'center', paddingVertical: 24, lineHeight: 19 },
  footer: { fontSize: 11, lineHeight: 16, marginTop: 16, fontStyle: 'italic' },
});
