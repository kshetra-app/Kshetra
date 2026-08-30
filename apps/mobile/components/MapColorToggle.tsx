import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';

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
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const isDataMode = DATA_MODES.some((m) => m.key === mode);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
        {PRIMARY_MODES.map((m) => {
          const active = mode === m.key;
          return (
            <Pressable
              key={m.key}
              style={[styles.button, active && { backgroundColor: colors.primary }]}
              onPress={() => { onModeChange(m.key); setExpanded(false); }}
            >
              <Ionicons
                name={m.icon as any}
                size={14}
                color={active ? '#FFFFFF' : colors.textSecondary}
              />
              <Text style={[styles.label, { color: active ? '#FFFFFF' : colors.textSecondary }, active && styles.labelActive]}>
                {t(m.tKey, m.fallbackText)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.button, (expanded || isDataMode) && { backgroundColor: colors.tealLight || '#145C6820' }]}
          onPress={() => setExpanded((v) => !v)}
        >
          <Ionicons
            name="analytics"
            size={14}
            color={(expanded || isDataMode) ? colors.teal : colors.textSecondary}
          />
          <Text style={[styles.label, { color: (expanded || isDataMode) ? colors.teal : colors.textSecondary }]}>
            {t('map.colorModes.data', 'Data')}
          </Text>
        </Pressable>
      </View>
      {expanded && (
        <View style={[styles.dataRow, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
          {DATA_MODES.map((m) => {
            const active = mode === m.key;
            return (
              <Pressable
                key={m.key}
                style={[styles.subButton, active && { backgroundColor: colors.tealLight || '#145C6820' }]}
                onPress={() => { onModeChange(m.key); setExpanded(false); }}
              >
                <Ionicons
                  name={m.icon as any}
                  size={12}
                  color={active ? colors.teal : colors.textSecondary}
                />
                <Text style={[styles.subLabel, { color: active ? colors.teal : colors.textSecondary }]}>
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
    borderRadius: 10,
    padding: 3,
    shadowColor: '#2C1810',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 10,
    padding: 4,
    marginTop: 4,
    maxWidth: 320,
    shadowColor: '#2C1810',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
  labelActive: {
    fontWeight: '800',
  },
});
