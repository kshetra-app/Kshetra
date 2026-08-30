/**
 * Administrative Hierarchy drill-down screen.
 *
 * Route: /hierarchy/[id]  where id = AC number; uses the active state.
 * Drills Constituency → Mandal → Gram Panchayat → Polling Booth using the
 * pilot hierarchy seed (Telangana ACs 1–5, Andhra Pradesh ACs 1–3).
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/useTheme';
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
  type MandalWithOverlap,
  type GramPanchayat,
} from '../../lib/hierarchyData';
import DataPendingCard from '../../components/DataPendingCard';

type Level = 'mandals' | 'panchayats' | 'booths';

export default function HierarchyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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

  useEffect(() => {
    if (parsedStateCode && parsedStateCode !== 'IN' && parsedStateCode !== stateCodeStore) {
      setStateCode(parsedStateCode);
    }
  }, [parsedStateCode, stateCodeStore, setStateCode]);

  const config = getHierarchyConfig(stateCode);
  const summary = useMemo(() => getConstituencyHierarchySummary(stateCode, acNo), [stateCode, acNo]);
  const constituency = useMemo(
    () => getUnifiedConstituenciesForState(stateCode).find((c) => c.acNo === acNo) ?? null,
    [stateCode, acNo],
  );

  const [level, setLevel] = useState<Level>('mandals');
  const [mandal, setMandal] = useState<MandalWithOverlap | null>(null);
  const [panchayat, setPanchayat] = useState<GramPanchayat | null>(null);

  const mandals = useMemo(() => getMandalsForConstituency(stateCode, acNo), [stateCode, acNo]);
  const panchayats = useMemo(
    () => (mandal ? getPanchayatsForMandal(stateCode, mandal.id) : []),
    [stateCode, mandal],
  );
  const booths = useMemo(() => {
    if (panchayat) return getBoothsForPanchayat(stateCode, panchayat.id);
    return getBoothsForConstituency(stateCode, acNo);
  }, [stateCode, acNo, panchayat]);

  const labels = config?.displayLabels;

  // ─── Data-pending state (zero-fabrication) ───
  // When no verified LGD/CEO pilot seed covers this constituency we show an
  // explicit "Data pending" state — never synthesized drill-down data.
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
        options={{ title: `${constituency?.name ?? t('hierarchy.constituency')} — ${t('hierarchy.hierarchyLabel')}`, headerBackTitle: t('hierarchy.back') }}
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
                <View style={[styles.tag, { backgroundColor: (b.isUrban ? colors.warning : colors.success) + '22' }]}>
                  <Text style={[styles.tagText, { color: b.isUrban ? colors.warning : colors.success }]}>{b.isUrban ? t('hierarchy.urban') : t('hierarchy.rural')}</Text>
                </View>
              </View>
              <View style={styles.boothStats}>
                <Text style={[styles.boothStat, { color: colors.text }]}>{b.totalVoters.toLocaleString('en-IN')} {t('hierarchy.voters')}</Text>
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
    </View>
  );
}

function Stat({ colors, value, label, icon }: { colors: any; value: number; label: string; icon: any }) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
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
