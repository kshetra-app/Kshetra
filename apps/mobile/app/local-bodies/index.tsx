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
import { useTheme } from '@/lib/useTheme';
import { getPartyColor } from '@/lib/constants';
import { getHierarchyConfig } from '@/lib/hierarchyData';
import { useActiveStateStore } from '../../stores/activeState';
import {
  getLocalBodyDistricts,
  getLocalBodyMandals,
  getLocalBodyGPs,
  getGpNode,
  getUpperTierStatus,
  useHasRepresentativeData,
  type DistrictSummary,
  type MandalSummary,
  type GpNode,
} from '@/lib/representativesData';
import type { Representative } from '@kshetra/shared';

type Level = 'districts' | 'mandals' | 'gps' | 'gp';

export default function LocalBodiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const stateName = getHierarchyConfig(stateCode)?.stateName ?? stateCode;

  const [level, setLevel] = useState<Level>('districts');
  const [district, setDistrict] = useState<DistrictSummary | null>(null);
  const [mandal, setMandal] = useState<MandalSummary | null>(null);
  const [gpKey, setGpKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useHasRepresentativeData(stateCode); // warms the availability cache
  const [upperTier, setUpperTier] = useState({
    mptc: { available: false, note: '' },
    zptc: { available: false, note: '' },
  });
  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [mandals, setMandals] = useState<MandalSummary[]>([]);
  const [gps, setGps] = useState<GpNode[]>([]);
  const [gpNode, setGpNode] = useState<GpNode | null>(null);

  // Load districts + upper-tier status when the state changes.
  useEffect(() => {
    let mounted = true;
    setDistrictsLoading(true);
    getLocalBodyDistricts(stateCode).then((d) => {
      if (mounted) { setDistricts(d); setDistrictsLoading(false); }
    });
    getUpperTierStatus(stateCode).then((u) => { if (mounted) setUpperTier(u); });
    return () => { mounted = false; };
  }, [stateCode]);

  useEffect(() => {
    let mounted = true;
    if (district) getLocalBodyMandals(stateCode, district.districtKey).then((r) => { if (mounted) setMandals(r); });
    else setMandals([]);
    return () => { mounted = false; };
  }, [stateCode, district]);

  useEffect(() => {
    let mounted = true;
    if (district && mandal) getLocalBodyGPs(stateCode, district.districtKey, mandal.mandalKey).then((r) => { if (mounted) setGps(r); });
    else setGps([]);
    return () => { mounted = false; };
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

  // ── Loading state (districts still resolving from SQLite) ──
  if (districtsLoading) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: 'Local Bodies' }} />
        <View style={s.emptyWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.emptyMsg}>Loading {stateName} local bodies…</Text>
        </View>
      </View>
    );
  }

  // ── Empty state (no rural data for this state, e.g. Andhra Pradesh) ──
  if (districts.length === 0) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: 'Local Bodies' }} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
          <View style={s.emptyWrap}>
            <Ionicons name="home-outline" size={44} color={colors.textMuted} />
            <Text style={s.emptyTitle}>{stateName}</Text>
            <Text style={s.emptyMsg}>
              Verified gram-panchayat representatives for {stateName} are being ingested from the
              State Election Commission. We only display data confirmed from official sources.
            </Text>
            <Text style={s.sourceNote}>Source: State Election Commission KYR portal</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  const placeholder =
    level === 'districts' ? 'Search districts' :
    level === 'mandals' ? 'Search mandals' :
    level === 'gps' ? 'Search gram panchayats' : '';

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: `${stateName} — Local Bodies` }} />

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
        {/* DISTRICTS */}
        {level === 'districts' && (
          <>
            {/* Upper-tier (MPTC / ZPTC) status banner */}
            {(!upperTier.mptc.available || !upperTier.zptc.available) && (
              <View style={[s.tierBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
                <Ionicons name="time-outline" size={18} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.tierTitle, { color: colors.text }]}>MPTC & ZPTC — {upperTier.mptc.note || 'Elections to be conducted'}</Text>
                  <Text style={[s.tierSub, { color: colors.textSecondary }]}>
                    Mandal & Zilla Parishad territorial constituency polls have not been held/published yet.
                    Only Gram Panchayat–tier results (Sarpanch & Ward members) are available.
                  </Text>
                </View>
              </View>
            )}

            {filteredDistricts.map((d) => (
              <Pressable key={d.districtKey} onPress={() => goMandals(d)} style={s.card}>
                <View style={s.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{d.name}</Text>
                    <Text style={s.cardSub}>{d.gpCount.toLocaleString('en-IN')} GPs · {d.sarpanchCount.toLocaleString('en-IN')} sarpanches · {d.wardCount.toLocaleString('en-IN')} ward members</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </Pressable>
            ))}
          </>
        )}

        {/* MANDALS */}
        {level === 'mandals' && filteredMandals.map((m) => (
          <Pressable key={m.mandalKey} onPress={() => goGps(m)} style={s.card}>
            <View style={s.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{m.name}</Text>
                <Text style={s.cardSub}>{m.gpCount.toLocaleString('en-IN')} gram panchayats</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
        ))}

        {/* GRAM PANCHAYATS */}
        {level === 'gps' && filteredGps.map((g) => (
          <Pressable key={g.key} onPress={() => goGp(g)} style={s.card}>
            <View style={s.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{g.gramPanchayat}</Text>
                <Text style={s.cardSub}>
                  {g.sarpanch ? `Sarpanch: ${g.sarpanch.name}` : 'Sarpanch — data pending'}
                  {g.wards.length ? ` · ${g.wards.length} wards` : ''}
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

        {/* GP DETAIL — Sarpanch + Ward members */}
        {level === 'gp' && gpNode && (
          <>
            <Text style={s.sectionLabel}>SARPANCH</Text>
            {gpNode.sarpanch ? (
              <RepRow colors={colors} rep={gpNode.sarpanch} title={gpNode.sarpanch.name}
                subtitle={`Sarpanch · ${gpNode.gramPanchayat}${gpNode.sarpanch.reservation ? ` · ${gpNode.sarpanch.reservation}` : ''}`}
                onPress={() => openRep(gpNode.sarpanch!, gpNode.gramPanchayat)} />
            ) : (
              <View style={s.pendingRow}><Text style={s.pendingText}>Sarpanch — data pending</Text></View>
            )}

            <Text style={[s.sectionLabel, { marginTop: 18 }]}>WARD MEMBERS ({gpNode.wards.length})</Text>
            {gpNode.wards.length === 0 ? (
              <View style={s.pendingRow}><Text style={s.pendingText}>Ward members — data pending</Text></View>
            ) : gpNode.wards.map((w) => (
              <RepRow key={w.id} colors={colors} rep={w} title={w.name}
                subtitle={`Ward ${w.wardNo ?? '?'}${w.reservation ? ` · ${w.reservation}` : ''}`}
                badge={`W${w.wardNo ?? ''}`}
                onPress={() => openRep(w, `${gpNode.gramPanchayat} · Ward ${w.wardNo ?? ''}`)} />
            ))}

            <Text style={s.footer}>
              Source: Telangana State Election Commission — Know Your Public Representative (Rural).
              Gram Panchayat polls are officially non-party.
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
        <Text style={s.repName}>{title || 'Data pending'}</Text>
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
    pendingRow: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14 },
    pendingText: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
    emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    emptyMsg: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, paddingHorizontal: 12 },
    sourceNote: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
    footer: { fontSize: 11, color: colors.textMuted, marginTop: 20, lineHeight: 16 },
  });
}
