/**
 * Parliament Screen — Shows Lok Sabha/Rajya Sabha MPs, party strength at centre,
 * state-wise parliamentary representation, and interactive MP profiles.
 */
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getPartyColor } from '../../lib/constants';
import { useResponsive } from '../../lib/responsive';
import {
  ALL_MP_PROFILES,
  STATE_PARLIAMENTARY_SUMMARIES,
  getMPsByState,
  getAllianceStrength,
  type MPProfile,
} from '../../lib/data';
import MPCard from '../../components/MPCard';
import CandidateAvatar from '../../components/CandidateAvatar';
import { useActiveStateStore } from '../../stores/activeState';
import { useTheme } from '../../lib/theme';

type TabType = 'overview' | 'lok_sabha' | 'rajya_sabha';

const POPULAR_STATES = [
  { code: 'IN', label: 'All India (National)' },
  { code: 'TS', label: 'Telangana' },
  { code: 'AP', label: 'Andhra Pradesh' },
  { code: 'UP', label: 'Uttar Pradesh' },
  { code: 'MH', label: 'Maharashtra' },
  { code: 'WB', label: 'West Bengal' },
  { code: 'BR', label: 'Bihar' },
  { code: 'TN', label: 'Tamil Nadu' },
  { code: 'KA', label: 'Karnataka' },
  { code: 'KL', label: 'Kerala' },
  { code: 'GJ', label: 'Gujarat' },
  { code: 'RJ', label: 'Rajasthan' },
  { code: 'MP', label: 'Madhya Pradesh' },
  { code: 'AS', label: 'Assam' },
  { code: 'PB', label: 'Punjab' },
  { code: 'OD', label: 'Odisha' },
  { code: 'JH', label: 'Jharkhand' },
  { code: 'DL', label: 'Delhi' },
];

function formatINR(val?: number): string {
  if (!val || val === 0) return '₹0';
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(2)} Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(1)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

function formatPartyName(party: string): string {
  const map: Record<string, string> = {
    'J': 'JD(U)',
    'SUBT': 'SS(UBT)',
    'SHS': 'Shiv Sena',
    'NCPSP': 'NCP(SP)',
    'NCP': 'NCP',
    'LJPV': 'LJPRV',
    'AIMM': 'AIMIM',
    'JP': 'JMM',
    'AP': 'AJSU',
    'C': 'CPI(ML)L',
    'CPIM': 'CPI(M)',
    'HAMS': 'HAM(S)',
    'ADS': 'Apna Dal (S)',
    'VTPP': 'VPP',
    'ASPKR': 'ASP(KR)',
  };
  return map[party] || party;
}

export default function ParliamentScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const activeAppState = useActiveStateStore((s) => s.stateCode);

  // Normalize state code
  const initialScope = (activeAppState === 'TG' || activeAppState === 'TS') ? 'TS' : (activeAppState || 'IN');
  const [selectedScope, setSelectedScope] = useState<string>(initialScope);
  const [tab, setTab] = useState<TabType>('overview');
  const [showAllParties, setShowAllParties] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPartyFilter, setSelectedPartyFilter] = useState<string>('ALL');
  const [selectedMP, setSelectedMP] = useState<MPProfile | null>(null);

  const isNational = selectedScope === 'IN' || selectedScope === 'ALL';

  // Alliance Strength at Centre (NDA 266, INDIA 217, Others 60 = 543)
  const allianceMap = useMemo(() => getAllianceStrength(), []);
  const ndaStrength   = { total: allianceMap['NDA'] ?? 0, lokSabha: allianceMap['NDA'] ?? 0, rajyaSabha: 0 };
  const indiaStrength = { total: allianceMap['INDIA'] ?? 0, lokSabha: allianceMap['INDIA'] ?? 0, rajyaSabha: 0 };
  const othersStrength = { total: allianceMap['Others'] ?? 0, lokSabha: allianceMap['Others'] ?? 0, rajyaSabha: 0 };

  // MPs for current scope
  const scopeMPs = useMemo(() => {
    return getMPsByState(selectedScope);
  }, [selectedScope]);

  const lokSabhaMPs = useMemo(() => scopeMPs.filter((m) => m.house === 'lok_sabha'), [scopeMPs]);
  const rajyaSabhaMPs = useMemo(() => scopeMPs.filter((m) => m.house === 'rajya_sabha'), [scopeMPs]);

  // All 54 parties in Parliament with both LS and RS counts
  const allPartiesStrength = useMemo(() => {
    const pMap = new Map<string, { party: string; lokSabhaSeats: number; rajyaSabhaSeats: number; totalSeats: number }>();
    for (const mp of ALL_MP_PROFILES) {
      const p = mp.party || 'IND';
      const cur = pMap.get(p) || { party: p, lokSabhaSeats: 0, rajyaSabhaSeats: 0, totalSeats: 0 };
      if (mp.house === 'lok_sabha') cur.lokSabhaSeats++;
      else if (mp.house === 'rajya_sabha') cur.rajyaSabhaSeats++;
      cur.totalSeats = cur.lokSabhaSeats + cur.rajyaSabhaSeats;
      pMap.set(p, cur);
    }
    return Array.from(pMap.values()).sort((a, b) => {
      if (b.lokSabhaSeats !== a.lokSabhaSeats) return b.lokSabhaSeats - a.lokSabhaSeats;
      return b.totalSeats - a.totalSeats;
    });
  }, []);

  // Total LS seats tally across all parties
  const totalLSTally = useMemo(() => {
    return allPartiesStrength.reduce((sum, p) => sum + p.lokSabhaSeats, 0);
  }, [allPartiesStrength]);

  // State Summary (if state view)
  const stateSummary = useMemo(() => {
    if (isNational) return null;
    const rec = STATE_PARLIAMENTARY_SUMMARIES[selectedScope] || { ls: lokSabhaMPs.length, rs: rajyaSabhaMPs.length, total: scopeMPs.length };
    
    const partyMap = new Map<string, { lokSabha: number; rajyaSabha: number }>();
    for (const mp of scopeMPs) {
      const cur = partyMap.get(mp.party) || { lokSabha: 0, rajyaSabha: 0 };
      if (mp.house === 'lok_sabha') cur.lokSabha++;
      else if (mp.house === 'rajya_sabha') cur.rajyaSabha++;
      partyMap.set(mp.party, cur);
    }
    const partyWise = Array.from(partyMap.entries())
      .map(([party, counts]) => ({ party, ...counts }))
      .sort((a, b) => (b.lokSabha + b.rajyaSabha) - (a.lokSabha + a.rajyaSabha));

    const stateObj = POPULAR_STATES.find(s => s.code === selectedScope);

    return {
      stateCode: selectedScope,
      stateName: stateObj ? stateObj.label : selectedScope,
      lokSabhaSeats: rec.ls,
      rajyaSabhaSeats: rec.rs,
      partyWise,
    };
  }, [isNational, selectedScope, scopeMPs, lokSabhaMPs.length, rajyaSabhaMPs.length]);

  // Filtered Lok Sabha MPs
  const filteredLokSabhaMPs = useMemo(() => {
    let list = lokSabhaMPs;
    if (selectedPartyFilter !== 'ALL') {
      list = list.filter(m => m.party === selectedPartyFilter);
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.constituency && m.constituency.toLowerCase().includes(q)) ||
        m.party.toLowerCase().includes(q) ||
        m.stateCode.toLowerCase().includes(q)
      );
    }
    return list;
  }, [lokSabhaMPs, selectedPartyFilter, searchQuery]);

  // Filtered Rajya Sabha MPs
  const filteredRajyaSabhaMPs = useMemo(() => {
    let list = rajyaSabhaMPs;
    if (selectedPartyFilter !== 'ALL') {
      list = list.filter(m => m.party === selectedPartyFilter);
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.party.toLowerCase().includes(q) ||
        m.stateCode.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rajyaSabhaMPs, selectedPartyFilter, searchQuery]);

  const { insets } = useResponsive();

  const displayedParties = showAllParties ? allPartiesStrength : allPartiesStrength.slice(0, 15);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('parliament.screenTitle')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {isNational ? '18th Lok Sabha (543) & Rajya Sabha (142)' : `${stateSummary?.stateName || selectedScope} Parliamentary Delegation`}
          </Text>
        </View>
      </View>

      {/* Scope Selector (All India / States) */}
      <View style={[styles.scopeBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopeScroll}>
          {POPULAR_STATES.map((s) => {
            const isSelected = selectedScope === s.code;
            return (
              <Pressable
                key={s.code}
                style={[
                  styles.scopeChip,
                  { backgroundColor: isSelected ? colors.primary : colors.surfaceElevated, borderColor: isSelected ? colors.primary : colors.border },
                ]}
                onPress={() => {
                  setSelectedScope(s.code);
                  setSelectedPartyFilter('ALL');
                }}
              >
                <Text style={[styles.scopeChipText, { color: isSelected ? '#FFFFFF' : colors.textSecondary }]}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        {(['overview', 'lok_sabha', 'rajya_sabha'] as TabType[]).map((tabKey) => (
          <Pressable
            key={tabKey}
            style={[
              styles.tabBtn,
              { backgroundColor: tab === tabKey ? colors.primary : colors.surfaceElevated, borderColor: tab === tabKey ? colors.primary : colors.border, borderWidth: 1 },
            ]}
            onPress={() => {
              setTab(tabKey);
              setSearchQuery('');
              setSelectedPartyFilter('ALL');
            }}
          >
            <Text style={[styles.tabText, { color: tab === tabKey ? '#FFFFFF' : colors.textSecondary }, tab === tabKey && styles.tabTextActive]}>
              {tabKey === 'overview'
                ? t('parliament.tabOverview')
                : tabKey === 'lok_sabha'
                ? `${t('parliament.tabLokSabha')} (${lokSabhaMPs.length})`
                : `${t('parliament.tabRajyaSabha')} (${rajyaSabhaMPs.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search Bar for Lok Sabha & Rajya Sabha */}
      {tab !== 'overview' && (
        <View style={[styles.searchBarContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={tab === 'lok_sabha' ? t('parliament.searchLokSabhaPlaceholder', { defaultValue: 'Search 543 MPs by name, constituency, or party…' }) : t('parliament.searchRajyaSabhaPlaceholder', { defaultValue: 'Search Rajya Sabha MPs by name or party…' })}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 80 }]}>
        {tab === 'overview' && (
          <>
            {/* Alliance Strength at Centre */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('parliament.allianceStrength', { defaultValue: 'Alliance Strength at Centre' })}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                {t('parliament.majorityMark', { count: 272, total: 543, defaultValue: 'Majority Mark: 272 / 543' })}
              </Text>
            </View>

            <View style={styles.allianceRow}>
              <View style={[styles.allianceCard, { backgroundColor: colors.surface, borderLeftColor: '#F97316', borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={styles.allianceName}>{t('parliament.ndaAlliance', { defaultValue: 'NDA' })}</Text>
                <Text style={[styles.allianceSeats, { color: colors.text }]}>{ndaStrength.total}</Text>
                <Text style={[styles.allianceSub, { color: colors.textMuted }]}>{t('parliament.lokSabhaSeats', { defaultValue: 'Lok Sabha Seats' })}</Text>
                <View style={[styles.statusPill, { backgroundColor: '#10B98120' }]}>
                  <Text style={[styles.statusPillText, { color: '#10B981' }]}>{t('parliament.rulingAlliance', { defaultValue: 'RULING ALLIANCE' })}</Text>
                </View>
              </View>

              <View style={[styles.allianceCard, { backgroundColor: colors.surface, borderLeftColor: '#3B82F6', borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={styles.allianceName}>{t('parliament.indiaAlliance', { defaultValue: 'I.N.D.I.A' })}</Text>
                <Text style={[styles.allianceSeats, { color: colors.text }]}>{indiaStrength.total}</Text>
                <Text style={[styles.allianceSub, { color: colors.textMuted }]}>{t('parliament.lokSabhaSeats', { defaultValue: 'Lok Sabha Seats' })}</Text>
                <View style={[styles.statusPill, { backgroundColor: '#3B82F620' }]}>
                  <Text style={[styles.statusPillText, { color: '#3B82F6' }]}>{t('parliament.oppositionAlliance', { defaultValue: 'OPPOSITION' })}</Text>
                </View>
              </View>

              <View style={[styles.allianceCard, { backgroundColor: colors.surface, borderLeftColor: '#6B7280', borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={styles.allianceName}>{t('parliament.othersAlliance', { defaultValue: 'Others' })}</Text>
                <Text style={[styles.allianceSeats, { color: colors.text }]}>{othersStrength.total}</Text>
                <Text style={[styles.allianceSub, { color: colors.textMuted }]}>{t('parliament.lokSabhaSeats', { defaultValue: 'Lok Sabha Seats' })}</Text>
                <View style={[styles.statusPill, { backgroundColor: '#6B728020' }]}>
                  <Text style={[styles.statusPillText, { color: '#6B7280' }]}>{t('parliament.independentRegional', { defaultValue: 'INDEPENDENT/REGIONAL' })}</Text>
                </View>
              </View>
            </View>

            {/* State Parliamentary Summary (if in state mode) */}
            {stateSummary && (
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('parliament.stateParliamentSeats', { state: stateSummary.stateName, defaultValue: `${stateSummary.stateName} — Parliament Seats` })}
                </Text>
                <View style={[styles.stateSummaryCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                  <View style={styles.stateSummaryRow}>
                    <View style={styles.stateSumItem}>
                      <Text style={[styles.stateSumVal, { color: colors.primary }]}>{stateSummary.lokSabhaSeats}</Text>
                      <Text style={[styles.stateSumLabel, { color: colors.textMuted }]}>{t('parliament.lokSabha', { defaultValue: 'Lok Sabha' })}</Text>
                    </View>
                    <View style={styles.stateSumItem}>
                      <Text style={[styles.stateSumVal, { color: colors.teal }]}>{stateSummary.rajyaSabhaSeats}</Text>
                      <Text style={[styles.stateSumLabel, { color: colors.textMuted }]}>{t('parliament.rajyaSabha', { defaultValue: 'Rajya Sabha' })}</Text>
                    </View>
                    <View style={styles.stateSumItem}>
                      <Text style={[styles.stateSumVal, { color: colors.text }]}>{stateSummary.lokSabhaSeats + stateSummary.rajyaSabhaSeats}</Text>
                      <Text style={[styles.stateSumLabel, { color: colors.textMuted }]}>{t('parliament.totalMPs', { defaultValue: 'Total MPs' })}</Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <Text style={[styles.subSectionTitle, { color: colors.textSecondary }]}>{t('parliament.partyDistributionIn', { state: stateSummary.stateName, defaultValue: `Party Distribution in ${stateSummary.stateName}:` })}</Text>
                  {stateSummary.partyWise.map((pw) => (
                    <View key={pw.party} style={[styles.statePartyRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.partyDot, { backgroundColor: getPartyColor(pw.party) }]} />
                      <Text style={[styles.statePartyName, { color: colors.text }]}>{formatPartyName(pw.party)}</Text>
                      <Text style={[styles.statePartyCount, { color: colors.textSecondary }]}>
                        LS: {pw.lokSabha} · RS: {pw.rajyaSabha} · Total: {pw.lokSabha + pw.rajyaSabha}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* National Parties in Parliament — Full Tally (543 Lok Sabha) */}
            <View style={{ marginTop: 20 }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('parliament.topParties', { defaultValue: 'All Parties in Parliament' })}
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                  {t('parliament.totalLsSeatsTally', { count: totalLSTally, total: 543, defaultValue: `Total LS Seats: ${totalLSTally} / 543` })}
                </Text>
              </View>

              <View style={[styles.tableHeader, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={[styles.thParty, { color: colors.textSecondary }]}>{t('parliament.thParty', { defaultValue: 'Party' })}</Text>
                <Text style={[styles.thNum, { color: colors.textSecondary }]}>{t('parliament.thLokSabha', { defaultValue: 'Lok Sabha' })}</Text>
                <Text style={[styles.thNum, { color: colors.textSecondary }]}>{t('parliament.thRajyaSabha', { defaultValue: 'Rajya Sabha' })}</Text>
                <Text style={[styles.thTotal, { color: colors.textSecondary }]}>{t('parliament.thTotal', { defaultValue: 'Total' })}</Text>
              </View>

              {displayedParties.map((p) => (
                <View key={p.party} style={[styles.partyTableRow, { backgroundColor: colors.surface, borderColor: colors.border, borderBottomWidth: 1 }]}>
                  <View style={styles.partyNameCol}>
                    <View style={[styles.partyDot, { backgroundColor: getPartyColor(p.party) }]} />
                    <Text style={[styles.partyNameText, { color: colors.text }]} numberOfLines={1}>
                      {formatPartyName(p.party)}
                    </Text>
                  </View>
                  <Text style={[styles.tdNum, { color: p.lokSabhaSeats > 0 ? colors.primary : colors.textMuted }]}>
                    {p.lokSabhaSeats}
                  </Text>
                  <Text style={[styles.tdNum, { color: p.rajyaSabhaSeats > 0 ? colors.teal : colors.textMuted }]}>
                    {p.rajyaSabhaSeats}
                  </Text>
                  <Text style={[styles.tdTotal, { color: colors.text }]}>
                    {p.totalSeats}
                  </Text>
                </View>
              ))}

              <Pressable
                style={[styles.showMoreBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setShowAllParties(!showAllParties)}
              >
                <Text style={[styles.showMoreText, { color: colors.primary }]}>
                  {showAllParties ? t('parliament.showTop15', { defaultValue: 'Show Top 15 Parties' }) : t('parliament.viewAllParties', { count: allPartiesStrength.length, defaultValue: `View All ${allPartiesStrength.length} Constituent Parties (includes YSRCP, BRS, TDP…)` })}
                </Text>
                <Ionicons name={showAllParties ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
              </Pressable>
            </View>
          </>
        )}

        {tab === 'lok_sabha' && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {isNational ? t('parliament.lokSabhaMPsCount', { count: filteredLokSabhaMPs.length, total: 543, defaultValue: `18th Lok Sabha MPs (${filteredLokSabhaMPs.length} of 543)` }) : t('parliament.stateLokSabhaCount', { state: stateSummary?.stateName || selectedScope, count: filteredLokSabhaMPs.length, defaultValue: `Lok Sabha MPs — ${stateSummary?.stateName || selectedScope} (${filteredLokSabhaMPs.length})` })}
              </Text>
            </View>

            {filteredLokSabhaMPs.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                <Ionicons name="people-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('parliament.noMPsMatch', { defaultValue: 'No MPs match your search or filter.' })}
                </Text>
              </View>
            ) : (
              filteredLokSabhaMPs.map((mp) => (
                <View key={mp.id} style={{ marginBottom: 12 }}>
                  <MPCard
                    profile={mp}
                    onPress={() => setSelectedMP(mp)}
                  />
                </View>
              ))
            )}
          </>
        )}

        {tab === 'rajya_sabha' && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {isNational ? t('parliament.rajyaSabhaMPsCount', { count: filteredRajyaSabhaMPs.length, total: 142, defaultValue: `Rajya Sabha MPs (${filteredRajyaSabhaMPs.length} of 142)` }) : t('parliament.stateRajyaSabhaCount', { state: stateSummary?.stateName || selectedScope, count: filteredRajyaSabhaMPs.length, defaultValue: `Rajya Sabha MPs — ${stateSummary?.stateName || selectedScope} (${filteredRajyaSabhaMPs.length})` })}
              </Text>
            </View>

            {filteredRajyaSabhaMPs.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                <Ionicons name="people-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {t('parliament.noRajyaSabhaMatch', { defaultValue: 'No Rajya Sabha MPs match your query.' })}
                </Text>
              </View>
            ) : (
              filteredRajyaSabhaMPs.map((mp) => (
                <View key={mp.id} style={{ marginBottom: 12 }}>
                  <MPCard
                    profile={mp}
                    onPress={() => setSelectedMP(mp)}
                  />
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Interactive MP Profile Detail Modal */}
      {selectedMP && (
        <Modal
          visible={!!selectedMP}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedMP(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              {/* Modal Drag Handle & Close */}
              <View style={styles.modalHeader}>
                <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
                <Pressable onPress={() => setSelectedMP(null)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
                {/* Hero Header */}
                <View style={styles.modalHero}>
                  <CandidateAvatar
                    name={selectedMP.name}
                    party={selectedMP.party}
                    size={72}
                    photoUrl={selectedMP.photoUrl}
                  />
                  <Text style={[styles.modalName, { color: colors.text }]}>{selectedMP.name}</Text>
                  <Text style={[styles.modalConstituency, { color: colors.textSecondary }]}>
                    {selectedMP.constituency ? `${selectedMP.constituency}, ${selectedMP.stateCode}` : selectedMP.stateCode}
                  </Text>
                  
                  <View style={styles.badgeRow}>
                    <View style={[styles.partyBadge, { backgroundColor: getPartyColor(selectedMP.party) }]}>
                      <Text style={styles.partyBadgeText}>{formatPartyName(selectedMP.party)}</Text>
                    </View>
                    <View style={[styles.houseBadge, { backgroundColor: selectedMP.house === 'lok_sabha' ? colors.primaryLight : colors.tealLight || '#E0F2FE' }]}>
                      <Text style={[styles.houseBadgeText, { color: selectedMP.house === 'lok_sabha' ? colors.primary : colors.teal }]}>
                        {selectedMP.house === 'lok_sabha' ? 'Lok Sabha (18th)' : 'Rajya Sabha'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Key Metrics Grid */}
                <View style={[styles.metricsGrid, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}>
                  <View style={styles.metricCell}>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{t('parliament.termsElected', { defaultValue: 'Terms Elected' })}</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{selectedMP.terms || 1}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{t('parliament.age', { defaultValue: 'Age' })}</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>{selectedMP.age ? `${selectedMP.age} yrs` : 'N/A'}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{t('parliament.criminalCases', { defaultValue: 'Criminal Cases' })}</Text>
                    <Text style={[styles.metricValue, { color: (selectedMP.criminalCases ?? 0) > 0 ? '#EF4444' : '#10B981' }]}>
                      {selectedMP.criminalCases ?? 0}
                    </Text>
                  </View>
                </View>

                {/* Financial Summary */}
                <View style={[styles.detailSection, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>{t('parliament.declaredFinancials', { defaultValue: 'Declared Financials (Affidavit)' })}</Text>
                  <View style={styles.financialRow}>
                    <View style={styles.financialCol}>
                      <Text style={[styles.financialLabel, { color: colors.textMuted }]}>{t('parliament.totalAssets', { defaultValue: 'Total Assets' })}</Text>
                      <Text style={[styles.financialVal, { color: colors.gold || '#B45309' }]}>
                        {formatINR(selectedMP.totalAssets)}
                      </Text>
                    </View>
                    <View style={styles.financialCol}>
                      <Text style={[styles.financialLabel, { color: colors.textMuted }]}>{t('parliament.liabilities', { defaultValue: 'Liabilities' })}</Text>
                      <Text style={[styles.financialVal, { color: '#EF4444' }]}>
                        {formatINR(selectedMP.totalLiabilities)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Performance Metrics */}
                {(selectedMP.attendancePercent !== undefined || selectedMP.questionsAsked !== undefined || selectedMP.debatesParticipated !== undefined) && (
                  <View style={[styles.detailSection, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>{t('parliament.trackRecord', { defaultValue: 'Parliamentary Track Record' })}</Text>
                    <View style={styles.perfRow}>
                      {selectedMP.attendancePercent !== undefined && (
                        <View style={styles.perfCol}>
                          <Text style={[styles.perfVal, { color: colors.primary }]}>{selectedMP.attendancePercent}%</Text>
                          <Text style={[styles.perfLabel, { color: colors.textMuted }]}>{t('parliament.attendance', { defaultValue: 'Attendance' })}</Text>
                        </View>
                      )}
                      {selectedMP.questionsAsked !== undefined && (
                        <View style={styles.perfCol}>
                          <Text style={[styles.perfVal, { color: '#3B82F6' }]}>{selectedMP.questionsAsked}</Text>
                          <Text style={[styles.perfLabel, { color: colors.textMuted }]}>{t('parliament.questionsAsked', { defaultValue: 'Questions Asked' })}</Text>
                        </View>
                      )}
                      {selectedMP.debatesParticipated !== undefined && (
                        <View style={styles.perfCol}>
                          <Text style={[styles.perfVal, { color: '#8B5CF6' }]}>{selectedMP.debatesParticipated}</Text>
                          <Text style={[styles.perfLabel, { color: colors.textMuted }]}>{t('parliament.debates', { defaultValue: 'Debates' })}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Personal & Education */}
                <View style={[styles.detailSection, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>{t('parliament.background', { defaultValue: 'Background' })}</Text>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoKey, { color: colors.textMuted }]}>{t('parliament.education', { defaultValue: 'Education:' })}</Text>
                    <Text style={[styles.infoVal, { color: colors.text }]}>{selectedMP.education || 'Not Specified'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoKey, { color: colors.textMuted }]}>{t('parliament.profession', { defaultValue: 'Profession:' })}</Text>
                    <Text style={[styles.infoVal, { color: colors.text }]}>{selectedMP.profession || 'Public Service'}</Text>
                  </View>
                </View>

                {/* Source Verification Link */}
                {selectedMP.sourceUrl && (
                  <Pressable
                    style={[styles.sourceLinkBtn, { backgroundColor: colors.primaryLight }]}
                    onPress={() => Linking.openURL(selectedMP.sourceUrl!)}
                  >
                    <Ionicons name="open-outline" size={16} color={colors.primary} />
                    <Text style={[styles.sourceLinkText, { color: colors.primary }]}>{t('parliament.viewOfficialAffidavit', { defaultValue: 'View Official Affidavit on MyNeta / Sansad' })}</Text>
                  </Pressable>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSubtitle: { fontSize: 11, marginTop: 1, fontWeight: '500' },

  scopeBar: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  scopeScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  scopeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  scopeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '800',
  },

  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },

  allianceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  allianceCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  allianceName: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  allianceSeats: { fontSize: 24, fontWeight: '900' },
  allianceSub: { fontSize: 9, marginTop: 1, marginBottom: 6 },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: { fontSize: 8, fontWeight: '800' },

  stateSummaryCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  stateSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stateSumItem: { alignItems: 'center' },
  stateSumVal: { fontSize: 22, fontWeight: '900' },
  stateSumLabel: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  divider: { height: 1, marginVertical: 12 },
  subSectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  statePartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  statePartyName: { flex: 1, fontSize: 13, fontWeight: '600' },
  statePartyCount: { fontSize: 12, fontWeight: '700' },

  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  thParty: { flex: 1, fontSize: 11, fontWeight: '700' },
  thNum: { width: 75, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  thTotal: { width: 50, textAlign: 'right', fontSize: 11, fontWeight: '700' },

  partyTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 3,
  },
  partyNameCol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  partyDot: { width: 10, height: 10, borderRadius: 5 },
  partyNameText: { fontSize: 13, fontWeight: '700' },
  tdNum: { width: 75, textAlign: 'center', fontSize: 13, fontWeight: '700' },
  tdTotal: { width: 50, textAlign: 'right', fontSize: 14, fontWeight: '800' },

  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 6,
  },
  showMoreText: { fontSize: 12, fontWeight: '700' },

  emptyContainer: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  emptyText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingBottom: 30,
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalCloseBtn: {
    position: 'absolute',
    right: 16,
    top: 10,
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalHero: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  modalConstituency: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  partyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  partyBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  houseBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  houseBadgeText: { fontSize: 11, fontWeight: '800' },

  metricsGrid: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  metricCell: { alignItems: 'center' },
  metricLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  metricValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },

  detailSection: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  detailSectionTitle: { fontSize: 13, fontWeight: '800', marginBottom: 10 },
  financialRow: { flexDirection: 'row', justifyContent: 'space-between' },
  financialCol: { flex: 1 },
  financialLabel: { fontSize: 11, fontWeight: '600' },
  financialVal: { fontSize: 16, fontWeight: '900', marginTop: 2 },

  perfRow: { flexDirection: 'row', justifyContent: 'space-around' },
  perfCol: { alignItems: 'center' },
  perfVal: { fontSize: 18, fontWeight: '900' },
  perfLabel: { fontSize: 11, marginTop: 2 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoKey: { fontSize: 12, fontWeight: '600' },
  infoVal: { fontSize: 12, fontWeight: '700' },

  sourceLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  sourceLinkText: { fontSize: 12, fontWeight: '700' },
});
