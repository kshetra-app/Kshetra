import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPartyColor } from '@/lib/constants';
import type { MapColorMode } from './MapColorToggle';

const PARTY_LEGEND = [
  { party: 'INC', label: 'Indian National Congress' },
  { party: 'BRS', label: 'Bharat Rashtra Samithi' },
  { party: 'BJP', label: 'Bharatiya Janata Party' },
  { party: 'AIMIM', label: 'AIMIM' },
  { party: 'TDP', label: 'Telugu Desam Party' },
  { party: 'IND', label: 'Independent' },
];

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

const GRADIENT_LEGENDS: Record<string, { title: string; low: string; high: string; lowLabel: string; highLabel: string }> = {
  population: { title: 'Population Density', low: '#1E3A5F', high: '#4F8EF7', lowLabel: 'Low', highLabel: 'High' },
  literacy:   { title: 'Literacy Rate', low: '#7F1D1D', high: '#22C55E', lowLabel: 'Low', highLabel: 'High' },
  turnout:    { title: 'Voter Turnout', low: '#374151', high: '#8B5CF6', lowLabel: 'Low', highLabel: 'High' },
};

interface MapLegendProps {
  colorMode?: MapColorMode;
}

export default function MapLegend({ colorMode = 'party' }: MapLegendProps) {
  const [expanded, setExpanded] = useState(false);

  const renderContent = () => {
    if (colorMode === 'margin') {
      return (
        <>
          <Text style={styles.panelTitle}>Victory Margin</Text>
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
          <Text style={styles.panelTitle}>Constituency Type</Text>
          {RESERVATION_LEGEND.map((item) => (
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

    // Default: party legend
    return (
      <>
        <Text style={styles.panelTitle}>Party Colors</Text>
        {PARTY_LEGEND.map((item) => (
          <View key={item.party} style={styles.row}>
            <View style={[styles.colorDot, { backgroundColor: getPartyColor(item.party) }]} />
            <Text style={styles.partyCode}>{item.party}</Text>
            <Text style={styles.partyName} numberOfLines={1}>{item.label}</Text>
          </View>
        ))}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.toggle}
        onPress={() => setExpanded((v) => !v)}
      >
        <Ionicons name="color-palette" size={16} color="#FFFFFF" />
        {!expanded && <Text style={styles.toggleText}>Legend</Text>}
      </Pressable>

      {expanded && (
        <View style={styles.panel}>
          {renderContent()}
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={[styles.colorDot, styles.selectedDot]} />
            <Text style={styles.partyCode}>Selected</Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.colorDot, styles.favDot]} />
            <Text style={styles.partyCode}>Favourite</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 180,
    left: 12,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
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
