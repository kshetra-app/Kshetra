import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type MapColorMode = 'party' | 'margin' | 'reservation';

interface MapColorToggleProps {
  mode: MapColorMode;
  onModeChange: (mode: MapColorMode) => void;
}

const MODES: { key: MapColorMode; icon: string; label: string }[] = [
  { key: 'party', icon: 'flag', label: 'Party' },
  { key: 'margin', icon: 'bar-chart', label: 'Margin' },
  { key: 'reservation', icon: 'people', label: 'Type' },
];

export default function MapColorToggle({ mode, onModeChange }: MapColorToggleProps) {
  return (
    <View style={styles.container}>
      {MODES.map((m) => {
        const active = mode === m.key;
        return (
          <Pressable
            key={m.key}
            style={[styles.button, active && styles.buttonActive]}
            onPress={() => onModeChange(m.key)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
