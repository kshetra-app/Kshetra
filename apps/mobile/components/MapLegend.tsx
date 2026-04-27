import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PARTY_COLORS, getPartyColor } from '@/lib/constants';

const LEGEND_ITEMS = [
  { party: 'INC', label: 'Indian National Congress' },
  { party: 'BRS', label: 'Bharat Rashtra Samithi' },
  { party: 'BJP', label: 'Bharatiya Janata Party' },
  { party: 'AIMIM', label: 'All India Majlis-e-Ittehadul Muslimeen' },
  { party: 'TDP', label: 'Telugu Desam Party' },
  { party: 'IND', label: 'Independent' },
];

export default function MapLegend() {
  const [expanded, setExpanded] = useState(false);

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
          <Text style={styles.panelTitle}>Party Colors</Text>
          {LEGEND_ITEMS.map((item) => (
            <View key={item.party} style={styles.row}>
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: getPartyColor(item.party) },
                ]}
              />
              <Text style={styles.partyCode}>{item.party}</Text>
              <Text style={styles.partyName} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          ))}
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
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 6,
  },
});
