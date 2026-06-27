import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export type MapColorMode = 'party' | 'margin' | 'reservation' | 'population' | 'literacy' | 'turnout' | 'battleground' | 'swing';

interface MapColorToggleProps {
  mode: MapColorMode;
  onModeChange: (mode: MapColorMode) => void;
}

const PRIMARY_MODES: { key: MapColorMode; icon: string; tKey: string; fallbackText: string }[] = [
  { key: 'party', icon: 'flag', tKey: 'map.colorModes.party', fallbackText: 'Party' },
  { key: 'margin', icon: 'bar-chart', tKey: 'map.colorModes.margin', fallbackText: 'Margin' },
  { key: 'reservation', icon: 'people', tKey: 'map.colorModes.reservation', fallbackText: 'Reservation' },
];

const DATA_MODES: { key: MapColorMode; icon: string; tKey: string; fallbackText: string }[] = [
  { key: 'population', icon: 'body', tKey: 'map.colorModes.population', fallbackText: 'Population' },
  { key: 'literacy', icon: 'school', tKey: 'map.colorModes.literacy', fallbackText: 'Literacy' },
  { key: 'turnout', icon: 'checkmark-circle', tKey: 'map.colorModes.turnout', fallbackText: 'Turnout' },
  { key: 'battleground', icon: 'shield-half', tKey: 'map.colorModes.battleground', fallbackText: 'Battlegrounds' },
  { key: 'swing', icon: 'shuffle', tKey: 'map.colorModes.swing', fallbackText: 'Swings' },
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
                {t(m.tKey, m.fallbackText)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.button, (expanded || isDataMode) && styles.buttonDataSelected]}
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
                style={[styles.subButton, active && styles.buttonData]}
                onPress={() => { onModeChange(m.key); setExpanded(false); }}
              >
                <Ionicons
                  name={m.icon as any}
                  size={12}
                  color={active ? '#10B981' : '#6B7280'}
                />
                <Text style={[styles.subLabel, active && styles.labelData]}>
                  {t(m.tKey, m.fallbackText)}
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
    alignSelf: 'flex-start',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 3,
  },
  dataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 3,
    marginTop: 4,
    maxWidth: 320,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 2,
  },
  subButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 2,
    marginBottom: 2,
  },
  buttonActive: {
    backgroundColor: '#4F8EF7',
  },
  buttonDataSelected: {
    backgroundColor: '#10B98120',
  },
  buttonData: {
    backgroundColor: '#10B98135',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginLeft: 4,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginLeft: 3,
  },
  labelActive: {
    color: '#FFFFFF',
  },
  labelData: {
    color: '#10B981',
  },
});
