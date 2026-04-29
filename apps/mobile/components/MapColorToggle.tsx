import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export type MapColorMode = 'party' | 'margin' | 'reservation' | 'population' | 'literacy' | 'turnout';

interface MapColorToggleProps {
  mode: MapColorMode;
  onModeChange: (mode: MapColorMode) => void;
}

const PRIMARY_MODES: { key: MapColorMode; icon: string; tKey: string }[] = [
  { key: 'party', icon: 'flag', tKey: 'map.colorModes.party' },
  { key: 'margin', icon: 'bar-chart', tKey: 'map.colorModes.margin' },
  { key: 'reservation', icon: 'people', tKey: 'map.colorModes.reservation' },
];

const DATA_MODES: { key: MapColorMode; icon: string; tKey: string }[] = [
  { key: 'population', icon: 'body', tKey: 'map.colorModes.population' },
  { key: 'literacy', icon: 'school', tKey: 'map.colorModes.literacy' },
  { key: 'turnout', icon: 'checkmark-circle', tKey: 'map.colorModes.turnout' },
];

export default function MapColorToggle({ mode, onModeChange }: MapColorToggleProps) {
  const { t } = useTranslation();
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
                {t(m.tKey)}
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
            {t('map.colorModes.data', 'Data')}
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
                  {t(m.tKey)}
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
    marginBottom: 3,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 3,
  },
  dataRow: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 3,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 2,
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
