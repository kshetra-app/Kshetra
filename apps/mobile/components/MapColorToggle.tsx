import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type MapColorMode = 'party' | 'margin' | 'reservation' | 'population' | 'literacy' | 'turnout';

interface MapColorToggleProps {
  mode: MapColorMode;
  onModeChange: (mode: MapColorMode) => void;
}

const PRIMARY_MODES: { key: MapColorMode; icon: string; label: string }[] = [
  { key: 'party', icon: 'flag', label: 'Party' },
  { key: 'margin', icon: 'bar-chart', label: 'Margin' },
  { key: 'reservation', icon: 'people', label: 'Type' },
];

const DATA_MODES: { key: MapColorMode; icon: string; label: string }[] = [
  { key: 'population', icon: 'body', label: 'Population' },
  { key: 'literacy', icon: 'school', label: 'Literacy' },
  { key: 'turnout', icon: 'checkmark-circle', label: 'Turnout' },
];

export default function MapColorToggle({ mode, onModeChange }: MapColorToggleProps) {
  const [expanded, setExpanded] = useState(false);
  const isDataMode = DATA_MODES.some((m) => m.key === mode);

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {PRIMARY_MODES.map((m) => {
          const active = mode === m.key;
          return (
            <Pressable
              key={m.key}
              style={[styles.button, active && styles.buttonActive]}
              onPress={() => { onModeChange(m.key); setExpanded(false); }}
            >
              <Ionicons
                name={m.icon as any}
                size={14}
                color={active ? '#FFFFFF' : '#6B7280'}
              />
              <Text style={[styles.label, active && styles.labelActive]}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.button, (expanded || isDataMode) && styles.buttonData]}
          onPress={() => setExpanded((v) => !v)}
        >
          <Ionicons
            name="analytics"
            size={14}
            color={(expanded || isDataMode) ? '#10B981' : '#6B7280'}
          />
          <Text style={[styles.label, (expanded || isDataMode) && styles.labelData]}>
            Data
          </Text>
        </Pressable>
      </View>
      {expanded && (
        <View style={styles.dataRow}>
          {DATA_MODES.map((m) => {
            const active = mode === m.key;
            return (
              <Pressable
                key={m.key}
                style={[styles.button, active && styles.buttonData]}
                onPress={() => { onModeChange(m.key); setExpanded(false); }}
              >
                <Ionicons
                  name={m.icon as any}
                  size={13}
                  color={active ? '#10B981' : '#6B7280'}
                />
                <Text style={[styles.label, active && styles.labelData]}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 3,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  dataRow: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  buttonActive: {
    backgroundColor: '#4F8EF7',
  },
  buttonData: {
    backgroundColor: '#10B98120',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  labelActive: {
    color: '#FFFFFF',
  },
  labelData: {
    color: '#10B981',
  },
});
