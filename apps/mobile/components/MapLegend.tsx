import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getPartyColor } from '@/lib/constants';
import { PARTY_CONFIG, STATES } from '@kshetra/shared';
import { getUnifiedConstituenciesForState } from '@/lib/stateDataAdapter';
import type { MapColorMode } from './MapColorToggle';

/** Build party legend dynamically from a state's seed data, sorted by seat count */
function buildPartyLegend(stateCode: string): { party: string; label: string; seats: number }[] {
  if (stateCode.toUpperCase() === 'IN') {
    const counts = new Map<string, number>();
    for (const state of Object.values(STATES)) {
      const p = state.rulingParty;
      if (p) {
        counts.set(p, (counts.get(p) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([party, statesRuled]) => ({
        party,
        label: (PARTY_CONFIG as Record<string, { name: string }>)[party]?.name ?? party,
        seats: statesRuled,
      }));
  }

  const constituencies = getUnifiedConstituenciesForState(stateCode);
  if (constituencies.length === 0) return [];

  const counts = new Map<string, number>();
  for (const c of constituencies) {
    const p = c.currentParty || c.winnerParty;
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8) // top 8 parties max
    .map(([party, seats]) => ({
      party,
      label: (PARTY_CONFIG as Record<string, { name: string }>)[party]?.name ?? party,
      seats,
    }));
}

const MARGIN_LEGEND = [
  { color: '#14532D', label: '> 50,000' },
  { color: '#22C55E', label: '20,000 – 50,000' },
  { color: '#FDE047', label: '5,000 – 20,000' },
  { color: '#F97316', label: '1,000 – 5,000' },
  { color: '#EF4444', label: '< 1,000 (razor thin)' },
];

const RESERVATION_LEGEND = [
  { color: '#4F8EF7', label: 'General (GEN)' },
  { color: '#F59E0B', label: 'Scheduled Caste (SC)' },
  { color: '#10B981', label: 'Scheduled Tribe (ST)' },
];

const BATTLEGROUND_LEGEND = [
  { color: '#DC2626', label: 'Critical Margin (< 2,000)' },
  { color: '#F59E0B', label: 'Competitive (2,000 – 5,000)' },
  { color: '#10B981', label: 'Safe Seat (>= 5,000)' },
];

const SWING_LEGEND = [
  { color: '#8B5CF6', label: 'Swing Seat (Party Switched)' },
  { color: '#10B981', label: 'Retained Seat (Same Party)' },
  { color: '#9CA3AF', label: 'No History Available' },
];

const GRADIENT_LEGENDS: Record<string, { title: string; low: string; high: string; lowLabel: string; highLabel: string }> = {
  population: { title: 'Population Density', low: '#1E3A5F', high: '#4F8EF7', lowLabel: 'Low', highLabel: 'High' },
  literacy:   { title: 'Literacy Rate', low: '#7F1D1D', high: '#22C55E', lowLabel: 'Low', highLabel: 'High' },
  turnout:    { title: 'Voter Turnout', low: '#374151', high: '#8B5CF6', lowLabel: 'Low', highLabel: 'High' },
};

interface MapLegendProps {
  colorMode?: MapColorMode;
  stateCode?: string;
}

export default function MapLegend({ colorMode = 'party', stateCode = 'TS' }: MapLegendProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const partyLegend = useMemo(() => buildPartyLegend(stateCode), [stateCode]);

  const renderContent = () => {
    if (colorMode === 'margin') {
      return (
        <>
          <Text style={styles.panelTitle}>{t('mapLegend.victoryMargin')}</Text>
          {MARGIN_LEGEND.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={styles.partyName}>{item.label}</Text>
            </View>
          ))}
        </>
      );
    }

    if (colorMode === 'reservation') {
      return (
        <>
          <Text style={styles.panelTitle}>{t('mapLegend.constituencyType')}</Text>
          {RESERVATION_LEGEND.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={styles.partyName}>{item.label}</Text>
            </View>
          ))}
        </>
      );
    }

    if (colorMode === 'battleground') {
      return (
        <>
          <Text style={styles.panelTitle}>{t('mapLegend.battlegrounds', 'Battlegrounds')}</Text>
          {BATTLEGROUND_LEGEND.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={styles.partyName}>{item.label}</Text>
            </View>
          ))}
        </>
      );
    }

    if (colorMode === 'swing') {
      return (
        <>
          <Text style={styles.panelTitle}>{t('mapLegend.swingSeats', 'Swing Seats')}</Text>
          {SWING_LEGEND.map((item) => (
            <View key={item.label} style={styles.row}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              <Text style={styles.partyName}>{item.label}</Text>
            </View>
          ))}
        </>
      );
    }

    const gradient = GRADIENT_LEGENDS[colorMode];
    if (gradient) {
      return (
        <>
          <Text style={styles.panelTitle}>{gradient.title}</Text>
          <View style={styles.gradientRow}>
            <Text style={styles.gradientLabel}>{gradient.lowLabel}</Text>
            <View style={[styles.gradientBar, { backgroundColor: gradient.low }]}>
              <View style={[styles.gradientBarHalf, { backgroundColor: gradient.high }]} />
            </View>
            <Text style={styles.gradientLabel}>{gradient.highLabel}</Text>
          </View>
        </>
      );
    }

    // Default: party legend (dynamic per state)
    return (
      <>
        <Text style={styles.panelTitle}>{t('mapLegend.partyColors')}</Text>
        {partyLegend.map((item) => (
          <View key={item.party} style={styles.row}>
            <View style={[styles.colorDot, { backgroundColor: getPartyColor(item.party) }]} />
            <Text style={styles.partyCode}>{item.party}</Text>
            <Text style={styles.partyName} numberOfLines={1}>
              {item.label} ({stateCode.toUpperCase() === 'IN' ? `${item.seats} ${item.seats === 1 ? 'state' : 'states'}` : item.seats})
            </Text>
          </View>
        ))}
      </>
    );
  };

  const screenHeight = Dimensions.get('window').height;
  const maxPanelHeight = screenHeight * 0.45;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.toggle}
        onPress={() => setExpanded((v) => !v)}
      >
        <Ionicons name="color-palette" size={16} color="#FFFFFF" />
        {!expanded && <Text style={styles.toggleText}>{t('mapLegend.legend')}</Text>}
        {expanded && <Ionicons name="chevron-down" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />}
      </Pressable>

      {expanded && (
        <View style={[styles.panel, { maxHeight: maxPanelHeight }]}>
          <ScrollView showsVerticalScrollIndicator={true} nestedScrollEnabled>
            {renderContent()}
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={[styles.colorDot, styles.selectedDot]} />
              <Text style={styles.partyCode}>{t('mapLegend.selected')}</Text>
            </View>
            <View style={styles.row}>
              <View style={[styles.colorDot, styles.favDot]} />
              <Text style={styles.partyCode}>{t('mapLegend.favourite')}</Text>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 130,
    left: 12,
    maxWidth: Dimensions.get('window').width * 0.65,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 6,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  panel: {
    marginTop: 8,
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 12,
    padding: 12,
    minWidth: 200,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  selectedDot: {
    backgroundColor: '#FFD700',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  favDot: {
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  partyCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D1D5DB',
    width: 44,
  },
  partyName: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  gradientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  gradientBar: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  gradientBarHalf: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    borderRadius: 6,
  },
  gradientLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 6,
  },
});
