import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Keyboard } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/useTheme';
import { getPartyColor } from '../../lib/constants';
import { getHierarchyConfig } from '../../lib/hierarchyData';
import { useActiveStateStore } from '../../stores/activeState';
import StateSwitcher from '../../components/StateSwitcher';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
import {
  getLocalBodyDistricts,
  getLocalBodyMandals,
  getLocalBodyGPs,
  getLocalBodyMptcs,
  getLocalBodyZptcs,
  getLocalBodyCoverage,
  hasRepresentativeData,
  type DistrictSummary,
  type MandalSummary,
  type GpNode,
} from '../../lib/representativesData';
import type { Representative } from '@kshetra/shared';

type Level = 'districts' | 'mandals' | 'gps' | 'gp';

export default function LocalBodiesScreen() {
  const activeState = useActiveStateStore((state) => state.stateCode);
  const stateCode = !activeState || activeState === 'IN' ? 'TS' : activeState;
  return <LocalBodiesDirectory key={stateCode} stateCode={stateCode} />;
}

function LocalBodiesDirectory({ stateCode }: { stateCode: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const setStateCode = useActiveStateStore((s) => s.setStateCode);
  const stateName = getHierarchyConfig(stateCode)?.stateName ?? stateCode;

  const [level, setLevel] = useState<Level>('districts');
  const [district, setDistrict] = useState<DistrictSummary | null>(null);
  const [mandal, setMandal] = useState<MandalSummary | null>(null);
  const [gpNode, setGpNode] = useState<GpNode | null>(null);
  const [query, setQuery] = useState('');
  const [helpVisible, setHelpVisible] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(hasRepresentativeData(stateCode));
  const [retry, setRetry] = useState(0);
  const [electionYear, setElectionYear] = useState<number>();
  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [mandals, setMandals] = useState<MandalSummary[]>([]);
  const [gps, setGps] = useState<GpNode[]>([]);
  const [mptcs, setMptcs] = useState<Representative[]>([]);
  const [zptcs, setZptcs] = useState<Representative[]>([]);

  useEffect(() => {
    if (!hasRepresentativeData(stateCode) || level === 'gp') return;
    let active = true;
    setLoading(true);
    setLoadError(false);

    async function load() {
      try {
        if (level === 'districts') {
          const [items, coverage] = await Promise.all([
            getLocalBodyDistricts(stateCode),
            getLocalBodyCoverage(stateCode),
          ]);
          if (active) {
            setDistricts(items);
            setElectionYear(coverage.electionYear);
          }
        } else if (level === 'mandals' && district) {
          const [items, members] = await Promise.all([
            getLocalBodyMandals(stateCode, district.districtKey),
            getLocalBodyZptcs(stateCode, district.districtKey),
          ]);
          if (active) {
            setMandals(items);
            setZptcs(members);
          }
        } else if (level === 'gps' && district && mandal) {
          const [items, members] = await Promise.all([
            getLocalBodyGPs(stateCode, district.districtKey, mandal.mandalKey),
            getLocalBodyMptcs(stateCode, district.districtKey, mandal.mandalKey),
          ]);
          if (active) {
            setGps(items);
            setMptcs(members);
          }
        }
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [district, level, mandal, retry, stateCode]);

  const filteredDistricts = useMemo(() => filterByName(districts, query, (d) => d.name), [districts, query]);
  const filteredMandals = useMemo(() => filterByName(mandals, query, (m) => m.name), [mandals, query]);
  const filteredGps = useMemo(() => filterByName(gps, query, (g) => g.gramPanchayat), [gps, query]);

  const goDistricts = () => { setLevel('districts'); setDistrict(null); setMandal(null); setGpNode(null); setQuery(''); };
  const goMandals = (d: DistrictSummary) => { setMandals([]); setZptcs([]); setDistrict(d); setMandal(null); setGpNode(null); setQuery(''); setLevel('mandals'); };
  const goGps = (m: MandalSummary) => { setGps([]); setMptcs([]); setMandal(m); setGpNode(null); setQuery(''); setLevel('gps'); };
  const goGp = (g: GpNode) => { setGpNode(g); setQuery(''); setLevel('gp'); };

  const openRep = (rep: Representative, jurisdictionName: string) => {
    router.push({
      pathname: '/representative/[id]',
      params: { id: rep.id, jurisdiction: jurisdictionName, office: rep.officeType, state: rep.stateCode },
    } as any);
  };

  const s = makeStyles(colors);

  // ── State directory selector (e.g. for national 'IN' or states without data) ──
  if (!hasRepresentativeData(stateCode)) {
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
            <Text style={[s.selectorTitle, { color: colors.text }]}>{t('localBodies.directoryTitle', { defaultValue: 'Local Bodies Directory' })}</Text>
            <Text style={[s.selectorMsg, { color: colors.textSecondary }]}>
              {t('localBodies.selectElectionState', { defaultValue: 'Choose Andhra Pradesh or Telangana to browse local election results.' })}
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
                    <Text style={[s.verifiedPillText, { color: '#10B981' }]}>{t('localBodies.verifiedTsec', { defaultValue: 'Verified TSEC' })}</Text>
                  </View>
                </View>
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
                    <Text style={[s.verifiedPillText, { color: '#10B981' }]}>{t('localBodies.verifiedApsec', { defaultValue: 'Verified APSEC' })}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>

            <View style={s.stateSwitcherRow}>
              <Text style={[s.stateSwitcherHint, { color: colors.textMuted }]}>{t('localBodies.chooseAnotherState', { defaultValue: 'Or choose another state:' })}</Text>
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
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                accessibilityLabel={t('discovery.pageHelp.openHelp', { defaultValue: 'Page Help' })}
                style={{ padding: 4 }}
                onPress={() => setHelpVisible(true)}
              >
                <Ionicons name="help-circle-outline" size={20} color={colors.text} />
              </Pressable>
              <StateSwitcher />
            </View>
          ),
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
            {t('localBodies.telangana', { defaultValue: 'Telangana' })}
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
            {t('localBodies.andhraPradesh', { defaultValue: 'Andhra Pradesh' })}
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
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
            blurOnSubmit={false}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      )}

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
      >
        {loading && <ActivityIndicator color={colors.primary} />}
        {!loading && loadError && (
          <View style={s.emptyWrap}>
            <Text style={s.emptyMsg}>
              {t('localBodies.resultsLoadError', { defaultValue: 'Could not load these election results.' })}
            </Text>
            <Pressable style={[s.retryBtn, { backgroundColor: colors.primary }]} onPress={() => setRetry((value) => value + 1)}>
              <Text style={s.retryBtnText}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
            </Pressable>
          </View>
        )}
        {!loading && !loadError && (
          <>
        {/* DISTRICTS LEVEL */}
        {level === 'districts' && (
          <>
            {electionYear !== undefined && (
              <Text style={s.sectionLabel}>
                {t('localBodies.returnsYear', { year: electionYear, defaultValue: '{{year}} local election results' })}
              </Text>
            )}
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

        {level === 'mandals' && !query && zptcs.length > 0 && (
          <View style={{ marginBottom: 18 }}>
            <Text style={s.sectionLabel}>
              {t('localBodies.zptcMembers', { defaultValue: 'ZILLA PARISHAD (ZPTC)' })}
            </Text>
            {zptcs.map((member) => (
              <RepRow
                key={member.id}
                colors={colors}
                rep={member}
                title={member.name}
                subtitle={member.constituency ?? district?.name ?? ''}
                badge="ZPTC"
                onPress={() => openRep(member, member.constituency ?? district?.name ?? stateName)}
              />
            ))}
          </View>
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
            {!query && mptcs.length > 0 && (
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
          </>
        )}
      </ScrollView>

      {/* Contextual Guidance */}
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="local-bodies"
      />
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
