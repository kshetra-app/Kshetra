/**
 * Local Bodies browser — drill-down for verified rural local-body reps.
 *
 * District → Mandal → Gram Panchayat → (Sarpanch + Ward members), sourced from
 * the bundled TSEC-KYR seed via lib/representativesData. MPTC & ZPTC show an
 * honest "elections to be conducted" note (2025 polls were postponed).
 *
 * Route: /local-bodies  (uses the active state).
 * Reached from the Explore tab quick-nav and the map bottom sheet.
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/useTheme';
import { getPartyColor } from '../../lib/constants';
import { getHierarchyConfig } from '../../lib/hierarchyData';
import { useActiveStateStore } from '../../stores/activeState';
import StateSwitcher from '../../components/StateSwitcher';
import {
  getLocalBodyDistricts,
  getLocalBodyMandals,
  getLocalBodyGPs,
  getGpNode,
  getLocalBodyMptcs,
  getUpperTierStatus,
  useHasRepresentativeData,
  type DistrictSummary,
  type MandalSummary,
  type GpNode,
} from '../../lib/representativesData';
import type { Representative } from '@kshetra/shared';

type Level = 'districts' | 'mandals' | 'gps' | 'gp';

export default function LocalBodiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rawStateCode = useActiveStateStore((s) => s.stateCode);
  const setStateCode = useActiveStateStore((s) => s.setStateCode);
  // Default National 'IN' to 'TS' so local body data is immediately populated
  const stateCode = (rawStateCode === 'IN' || !rawStateCode) ? 'TS' : rawStateCode;
  const stateName = getHierarchyConfig(stateCode)?.stateName ?? stateCode;

  const [level, setLevel] = useState<Level>('districts');
  const [district, setDistrict] = useState<DistrictSummary | null>(null);
  const [mandal, setMandal] = useState<MandalSummary | null>(null);
  const [gpKey, setGpKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);

  useHasRepresentativeData(stateCode); // warms the availability cache
  const [upperTier, setUpperTier] = useState({
    mptc: { available: false, note: '' },
    zptc: { available: false, note: '' },
  });
  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [mandals, setMandals] = useState<MandalSummary[]>([]);
  const [gps, setGps] = useState<GpNode[]>([]);
  const [mptcs, setMptcs] = useState<Representative[]>([]);
  const [gpNode, setGpNode] = useState<GpNode | null>(null);

  // Load districts + upper-tier status when the state changes.
  useEffect(() => {
    let mounted = true;
    setDistrictsLoading(true);
    setLoadError(null);
    getLocalBodyDistricts(stateCode)
      .then((d) => {
        if (mounted) {
          setDistricts(d);
          setDistrictsLoading(false);
        }
      })
      .catch((err) => {
        console.error('[LocalBodies] Error loading districts:', err);
        if (mounted) {
          setLoadError(err?.message ?? 'Failed to load local body records');
          setDistrictsLoading(false);
        }
      });
    getUpperTierStatus(stateCode).then((u) => {
      if (mounted) setUpperTier(u);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, [stateCode]);

  useEffect(() => {
    let mounted = true;
    if (district) getLocalBodyMandals(stateCode, district.districtKey).then((r) => { if (mounted) setMandals(r); });
    else setMandals([]);
    return () => { mounted = false; };
  }, [stateCode, district]);

  useEffect(() => {
    let mounted = true;
    if (district && mandal) {
      getLocalBodyGPs(stateCode, district.districtKey, mandal.mandalKey).then((r) => {
        if (mounted) setGps(r);
      });
      getLocalBodyMptcs(stateCode, district.districtKey, mandal.mandalKey).then((r) => {
        if (mounted) setMptcs(r);
      });
    } else {
      setGps([]);
      setMptcs([]);
    }
    return () => {
      mounted = false;
    };
  }, [stateCode, district, mandal]);

  useEffect(() => {
    let mounted = true;
    if (district && gpKey) getGpNode(stateCode, district.districtKey, gpKey).then((r) => { if (mounted) setGpNode(r); });
    else setGpNode(null);
    return () => { mounted = false; };
  }, [stateCode, district, gpKey]);

  const filteredDistricts = useMemo(() => filterByName(districts, query, (d) => d.name), [districts, query]);
  const filteredMandals = useMemo(() => filterByName(mandals, query, (m) => m.name), [mandals, query]);
  const filteredGps = useMemo(() => filterByName(gps, query, (g) => g.gramPanchayat), [gps, query]);

  const goDistricts = () => { setLevel('districts'); setDistrict(null); setMandal(null); setGpKey(null); setQuery(''); };
  const goMandals = (d: DistrictSummary) => { setDistrict(d); setMandal(null); setGpKey(null); setQuery(''); setLevel('mandals'); };
  const goGps = (m: MandalSummary) => { setMandal(m); setGpKey(null); setQuery(''); setLevel('gps'); };
  const goGp = (g: GpNode) => { setGpKey(g.key); setQuery(''); setLevel('gp'); };

  const openRep = (rep: Representative, jurisdictionName: string) => {
    router.push({
      pathname: '/representative/[id]',
      params: { id: rep.id, jurisdiction: jurisdictionName, office: rep.officeType, state: rep.stateCode },
    } as any);
  };

  const s = makeStyles(colors);

  // ── Error state with user retry ──
  if (loadError) {
    return (
      <View style={s.container}>
        <Stack.Screen
          options={{
            title: t('localBodies.screenTitle', { defaultValue: 'Local Bodies' }),
            headerRight: () => <StateSwitcher />,
          }}
        />
        <View style={s.centerWrap}>
          <Ionicons name="alert-circle" size={48} color={colors.gold} />
          <Text style={[s.selectorTitle, { color: colors.text, marginTop: 12 }]}>Database Initializing</Text>
          <Text style={[s.selectorMsg, { color: colors.textSecondary }]}>
            The bundled local bodies database (137 MB, 224,780 official records) is being loaded into device storage.
          </Text>
          <Pressable
            style={[s.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setDistrictsLoading(true);
              setLoadError(null);
              getLocalBodyDistricts(stateCode)
                .then((d) => {
                  setDistricts(d);
                  setDistrictsLoading(false);
                })
                .catch((e) => {
                  setLoadError(e?.message ?? 'Failed to initialize database');
                  setDistrictsLoading(false);
                });
            }}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={s.retryBtnText}>Retry Loading Database</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Loading state (districts still resolving from SQLite) ──
  if (districtsLoading) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: t('localBodies.screenTitle', { defaultValue: 'Local Bodies' }) }} />
        <View style={s.emptyWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.emptyMsg}>{t('localBodies.loadingState', { state: stateName, defaultValue: `Loading ${stateName} local bodies…` })}</Text>
        </View>
      </View>
    );
  }

  // ── State directory selector (e.g. for national 'IN' or states without data) ──
  if (districts.length === 0) {
    return (
      <View style={s.container}>
        <Stack.Screen
          options={{
            title: t('localBodies.screenTitle', { defaultValue: 'Local Bodies' }),
            headerRight: () => <StateSwitcher />,
          }}
        />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
          <View style={s.selectorCardWrap}>
            <View style={[s.selectorIconWrap, { backgroundColor: colors.goldLight, borderColor: colors.goldBorder || colors.border }]}>
              <Ionicons name="business" size={32} color={colors.gold} />
            </View>
            <Text style={[s.selectorTitle, { color: colors.text }]}>Local Bodies Directory</Text>
            <Text style={[s.selectorMsg, { color: colors.textSecondary }]}>
              {stateCode === 'IN'
                ? 'Official rural local body election records (Sarpanch, Ward Members, MPTC & ZPTC) are verified and available for the following states. Select a state to explore:'
                : `Official gram-panchayat records for ${stateName} are undergoing ingestion from the State Election Commission. Select one of the available states below to explore its complete verified hierarchy:`}
            </Text>

            <Pressable
              style={[s.stateLaunchCard, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}
              onPress={() => setStateCode('TS')}
            >
              <View style={[s.stateBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[s.stateBadgeText, { color: colors.primary }]}>TS</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.stateLaunchTitleRow}>
                  <Text style={[s.stateLaunchTitle, { color: colors.text }]}>Telangana</Text>
                  <View style={[s.verifiedPill, { backgroundColor: '#10B98118', borderColor: '#10B98150' }]}>
                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    <Text style={[s.verifiedPillText, { color: '#10B981' }]}>Verified TSEC</Text>
                  </View>
                </View>
                <Text style={[s.stateLaunchSubtitle, { color: colors.textSecondary }]}>31 Districts · 12,705 Gram Panchayats</Text>
                <Text style={[s.stateLaunchDesc, { color: colors.textMuted }]}>72,134 verified Sarpanch & Ward Member records</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>

            <Pressable
              style={[s.stateLaunchCard, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, marginTop: 12 }]}
              onPress={() => setStateCode('AP')}
            >
              <View style={[s.stateBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[s.stateBadgeText, { color: colors.primary }]}>AP</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.stateLaunchTitleRow}>
                  <Text style={[s.stateLaunchTitle, { color: colors.text }]}>Andhra Pradesh</Text>
                  <View style={[s.verifiedPill, { backgroundColor: '#10B98118', borderColor: '#10B98150' }]}>
                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    <Text style={[s.verifiedPillText, { color: '#10B981' }]}>Verified APSEC</Text>
                  </View>
                </View>
                <Text style={[s.stateLaunchSubtitle, { color: colors.textSecondary }]}>13 Districts · 13,079 Gram Panchayats</Text>
                <Text style={[s.stateLaunchDesc, { color: colors.textMuted }]}>152,646 verified Sarpanch, Ward, MPTC & ZPTC records</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>

            <View style={s.stateSwitcherRow}>
              <Text style={[s.stateSwitcherHint, { color: colors.textMuted }]}>Or choose another state:</Text>
              <StateSwitcher />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  const placeholder =
    level === 'districts' ? t('localBodies.searchDistricts', { defaultValue: 'Search districts' }) :
    level === 'mandals' ? t('localBodies.searchMandals', { defaultValue: 'Search mandals' }) :
    level === 'gps' ? t('localBodies.searchGps', { defaultValue: 'Search gram panchayats' }) : '';

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: `${stateName} — ${t('localBodies.screenTitle', { defaultValue: 'Local Bodies' })}`,
          headerRight: () => <StateSwitcher />,
        }}
      />

      {/* State Switcher Bar: 1-tap toggle between Telangana and Andhra Pradesh */}
      <View style={[s.stateTabsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[
            s.stateTabBtn,
            stateCode === 'TS' && [s.stateTabBtnActive, { borderColor: colors.primary, backgroundColor: colors.primary + '14' }],
          ]}
          onPress={() => {
            setStateCode('TS');
            goDistricts();
          }}
        >
          <Text style={[s.stateTabBtnText, { color: stateCode === 'TS' ? colors.primary : colors.textSecondary }]}>
            Telangana (31 Districts)
          </Text>
          {stateCode === 'TS' && <View style={[s.activeDot, { backgroundColor: colors.primary }]} />}
        </Pressable>

        <Pressable
          style={[
            s.stateTabBtn,
            stateCode === 'AP' && [s.stateTabBtnActive, { borderColor: colors.primary, backgroundColor: colors.primary + '14' }],
          ]}
          onPress={() => {
            setStateCode('AP');
            goDistricts();
          }}
        >
          <Text style={[s.stateTabBtnText, { color: stateCode === 'AP' ? colors.primary : colors.textSecondary }]}>
            Andhra Pradesh (15 Districts)
          </Text>
          {stateCode === 'AP' && <View style={[s.activeDot, { backgroundColor: colors.primary }]} />}
        </Pressable>
      </View>

      {/* Breadcrumb */}
      <View style={[s.breadcrumbBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.breadcrumb}>
          <Crumb colors={colors} label={stateName} active={level === 'districts'} onPress={goDistricts} />
          {district && (
            <>
              <Chevron colors={colors} />
              <Crumb colors={colors} label={district.name} active={level === 'mandals'} onPress={() => goMandals(district)} />
            </>
          )}
          {mandal && (
            <>
              <Chevron colors={colors} />
              <Crumb colors={colors} label={mandal.name} active={level === 'gps'} onPress={() => goGps(mandal)} />
            </>
          )}
          {gpNode && (
            <>
              <Chevron colors={colors} />
              <Crumb colors={colors} label={gpNode.gramPanchayat} active={level === 'gp'} />
            </>
          )}
        </ScrollView>
      </View>

      {/* Search (list levels only) */}
      {level !== 'gp' && (
        <View style={s.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        {/* DISTRICTS LEVEL */}
        {level === 'districts' && (
          <>
            {/* Status Banner */}
            {upperTier.mptc.available && upperTier.zptc.available ? (
              <View style={[s.tierBanner, { backgroundColor: '#10B98112', borderColor: '#10B98135' }]}>
                <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={[s.tierTitle, { color: colors.text }]}>Verified 3-Tier Panchayati Raj Dataset</Text>
                  <Text style={[s.tierSub, { color: colors.textSecondary }]}>
                    Complete official results for Gram Panchayats (Sarpanches & Ward Members), Mandal Parishad (MPTC), and Zilla Parishad (ZPTC).
                  </Text>
                </View>
              </View>
            ) : (!upperTier.mptc.available || !upperTier.zptc.available) ? (
              <View style={[s.tierBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.tierTitle, { color: colors.text }]}>Gram Panchayat Tier Active</Text>
                  <Text style={[s.tierSub, { color: colors.textSecondary }]}>
                    Verified official results for Gram Panchayat representatives (Sarpanch & Ward members). MPTC/ZPTC elections were postponed by the State Election Commission.
                  </Text>
                </View>
              </View>
            ) : null}

            {filteredDistricts.map((d) => (
              <Pressable key={d.districtKey} onPress={() => goMandals(d)} style={s.card}>
                <View style={s.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{d.name}</Text>
                    <Text style={s.cardSub}>
                      {d.gpCount.toLocaleString('en-IN')} {t('localBodies.gps', { defaultValue: 'GPs' })} · {d.sarpanchCount.toLocaleString('en-IN')} {t('localBodies.sarpanches', { defaultValue: 'sarpanches' })} · {d.wardCount.toLocaleString('en-IN')} {t('localBodies.wardMembers', { defaultValue: 'ward members' })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </Pressable>
            ))}
          </>
        )}

        {/* MANDALS LEVEL */}
        {level === 'mandals' && filteredMandals.map((m) => (
          <Pressable key={m.mandalKey} onPress={() => goGps(m)} style={s.card}>
            <View style={s.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{m.name}</Text>
                <Text style={s.cardSub}>{m.gpCount.toLocaleString('en-IN')} {t('localBodies.gramPanchayats', { defaultValue: 'gram panchayats' })}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
        ))}

        {/* GRAM PANCHAYATS LEVEL */}
        {level === 'gps' && (
          <>
            {/* MPTC section for this mandal if present */}
            {mptcs.length > 0 && (
              <View style={{ marginBottom: 18 }}>
                <Text style={s.sectionLabel}>
                  MANDAL PARISHAD TERRITORIAL CONSTITUENCY (MPTC) ({mptcs.length})
                </Text>
                {mptcs.map((m) => (
                  <RepRow
                    key={m.id}
                    colors={colors}
                    rep={m}
                    title={m.name}
                    subtitle={`${m.constituency ? `${m.constituency} Territorial Constituency · ` : ''}${mandal?.name ?? ''}${m.reservation ? ` · ${m.reservation}` : ''}`}
                    badge="MPTC"
                    onPress={() => openRep(m, `${m.constituency || mandal?.name || ''} MPTC`)}
                  />
                ))}
              </View>
            )}

            <Text style={s.sectionLabel}>GRAM PANCHAYATS ({filteredGps.length})</Text>
            {filteredGps.map((g) => (
              <Pressable key={g.key} onPress={() => goGp(g)} style={s.card}>
                <View style={s.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{g.gramPanchayat}</Text>
                    <Text style={s.cardSub}>
                      {g.sarpanch ? `${t('localBodies.sarpanch', { defaultValue: 'Sarpanch' })}: ${g.sarpanch.name}` : ''}
                      {g.sarpanch && g.wards.length ? ' · ' : ''}
                      {g.wards.length ? `${g.wards.length} ${t('localBodies.wards', { defaultValue: 'wards' })}` : ''}
                    </Text>
                  </View>
                  {g.sarpanch?.reservation ? (
                    <View style={[s.resBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[s.resText, { color: colors.primary }]}>{g.sarpanch.reservation}</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </Pressable>
            ))}
          </>
        )}

        {/* GP DETAIL LEVEL — Sarpanch + Ward members */}
        {level === 'gp' && gpNode && (
          <>
            {gpNode.sarpanch && (
              <>
                <Text style={s.sectionLabel}>{t('localBodies.sarpanch', { defaultValue: 'SARPANCH' }).toUpperCase()}</Text>
                <RepRow
                  colors={colors}
                  rep={gpNode.sarpanch}
                  title={gpNode.sarpanch.name}
                  subtitle={`${t('localBodies.sarpanch', { defaultValue: 'Sarpanch' })} · ${gpNode.gramPanchayat}${gpNode.sarpanch.reservation ? ` · ${gpNode.sarpanch.reservation}` : ''}`}
                  badge="GP"
                  onPress={() => openRep(gpNode.sarpanch!, gpNode.gramPanchayat)}
                />
              </>
            )}

            {gpNode.wards.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { marginTop: gpNode.sarpanch ? 18 : 0 }]}>
                  {t('localBodies.wardMembers', { defaultValue: 'WARD MEMBERS' }).toUpperCase()} ({gpNode.wards.length})
                </Text>
                {gpNode.wards.map((w) => (
                  <RepRow
                    key={w.id}
                    colors={colors}
                    rep={w}
                    title={w.name}
                    subtitle={`${t('localBodies.ward', { defaultValue: 'Ward' })} ${w.wardNo ?? ''}${w.reservation ? ` · ${w.reservation}` : ''}`}
                    badge={`W${w.wardNo ?? ''}`}
                    onPress={() => openRep(w, `${gpNode.gramPanchayat} · ${t('localBodies.ward', { defaultValue: 'Ward' })} ${w.wardNo ?? ''}`)}
                  />
                ))}
              </>
            )}

            <Text style={s.footer}>
              {stateCode === 'AP'
                ? 'Source: Andhra Pradesh State Election Commission (APSEC) — Official local body election results. Gram Panchayat polls are officially non-party.'
                : 'Source: Telangana State Election Commission (TSEC) — Know Your Public Representative (Rural). Gram Panchayat polls are officially non-party.'}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function filterByName<T>(items: T[], query: string, getName: (t: T) => string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((it) => getName(it).toLowerCase().includes(q));
}

function Crumb({ colors, label, active, onPress }: { colors: any; label: string; active: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={active} style={{ maxWidth: 160 }}>
      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: active ? colors.text : colors.primary }}>{label}</Text>
    </Pressable>
  );
}
function Chevron({ colors }: { colors: any }) {
  return <Ionicons name="chevron-forward" size={13} color={colors.textMuted} style={{ marginHorizontal: 4 }} />;
}

function RepRow({ colors, rep, title, subtitle, badge, onPress }: {
  colors: any; rep: Representative; title: string; subtitle: string; badge?: string; onPress: () => void;
}) {
  const s = makeStyles(colors);
  const party = rep.party;
  return (
    <Pressable onPress={onPress} style={s.repRow}>
      {badge ? (
        <View style={[s.wardBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[s.wardBadgeText, { color: colors.primary }]}>{badge}</Text>
        </View>
      ) : (
        <Ionicons name="person-circle-outline" size={30} color={colors.textMuted} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.repName}>{title}</Text>
        <Text style={s.repSub}>{subtitle}</Text>
      </View>
      {party ? (
        <View style={[s.partyBadge, { backgroundColor: getPartyColor(party) + '22', borderColor: getPartyColor(party) }]}>
          <Text style={[s.partyText, { color: getPartyColor(party) }]}>{party}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    breadcrumbBar: { borderBottomWidth: 1, paddingVertical: 10 },
    breadcrumb: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 0, paddingHorizontal: 12, height: 42, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    searchInput: { flex: 1, color: colors.text, fontSize: 14, height: 42 },
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    resBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    resText: { fontSize: 10, fontWeight: '800' },
    tierBanner: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 },
    tierTitle: { fontSize: 13, fontWeight: '800' },
    tierSub: { fontSize: 11, marginTop: 3, lineHeight: 15 },
    sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
    repRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
    repName: { fontSize: 14, fontWeight: '700', color: colors.text },
    repSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    wardBadge: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    wardBadgeText: { fontSize: 12, fontWeight: '800' },
    partyBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    partyText: { fontSize: 10, fontWeight: '800' },
    emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    emptyMsg: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, paddingHorizontal: 12 },
    sourceNote: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
    footer: { fontSize: 11, color: colors.textMuted, marginTop: 20, lineHeight: 16 },

    // State Selector styles
    selectorCardWrap: { alignItems: 'center', paddingTop: 20 },
    selectorIconWrap: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    selectorTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
    selectorMsg: { fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: 16, marginBottom: 20 },
    stateLaunchCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, width: '100%' },
    stateBadge: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    stateBadgeText: { fontSize: 16, fontWeight: '800' },
    stateLaunchTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stateLaunchTitle: { fontSize: 16, fontWeight: '800' },
    verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
    verifiedPillText: { fontSize: 10, fontWeight: '700' },
    stateLaunchSubtitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    stateLaunchDesc: { fontSize: 11, marginTop: 2 },
    stateSwitcherRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
    stateSwitcherHint: { fontSize: 13, fontWeight: '600' },
    stateTabsBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
    stateTabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
    stateTabBtnActive: { borderWidth: 1 },
    stateTabBtnText: { fontSize: 12, fontWeight: '700' },
    activeDot: { width: 6, height: 6, borderRadius: 3 },
    centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 16 },
    retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  });
}
