import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../stores/activeState';
import { isStateSupported, getStateData } from '../lib/stateRegistry';
import { usePrefetchState } from '../lib/usePrefetchState';
import { useTheme } from '../lib/theme';
import { getLocalizedStateName } from '../lib/seedTranslations';

export default function StateSwitcher() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const setStateCode = useActiveStateStore((s) => s.setStateCode);
  const currentState = STATES[stateCode];
  const { prefetch } = usePrefetchState();

  const handleSelect = (code: string) => {
    setStateCode(code);
    setVisible(false);
  };

  // Phase 4b: Prefetch on hover/focus
  const handlePressIn = (code: string) => {
    prefetch(code);
  };

  const triggerLabel = stateCode === 'IN'
    ? getLocalizedStateName('IN', i18n.language, 'India')
    : getLocalizedStateName(stateCode, i18n.language, currentState?.name ?? stateCode);

  return (
    <>
      <Pressable style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]} onPress={() => setVisible(true)}>
        <Ionicons name="location" size={14} color={colors.primary} />
        <Text style={[styles.triggerText, { color: colors.text }]}>{triggerLabel}</Text>
        <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('stateSwitcher.selectState')}</Text>
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              <Pressable
                key="IN"
                style={[
                  styles.stateRow,
                  stateCode === 'IN' && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => handleSelect('IN')}
              >
                <View style={styles.stateInfo}>
                  <Text
                    style={[
                      styles.stateName,
                      { color: colors.text },
                      stateCode === 'IN' && { color: colors.primary, fontWeight: '800' },
                    ]}
                  >
                    {t('stateSwitcherExtended.nationalView')}
                  </Text>
                  <Text style={[styles.stateSeats, { color: colors.textMuted }]}>
                    {t('stateSwitcherExtended.statesAndUTs')}
                  </Text>
                </View>
                {stateCode === 'IN' && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </Pressable>

              {Object.values(STATES).map((state) => {
                const supported = isStateSupported(state.code);
                const isActive = state.code === stateCode;
                const data = supported ? getStateData(state.code) : null;
                return (
                  <Pressable
                    key={state.code}
                    style={[
                      styles.stateRow,
                      isActive && { backgroundColor: colors.primaryLight },
                      !supported && styles.stateRowDisabled,
                    ]}
                    onPress={() => supported && handleSelect(state.code)}
                    onPressIn={() => supported && handlePressIn(state.code)}
                    disabled={!supported}
                  >
                    <View style={styles.stateInfo}>
                      <Text
                        style={[
                          styles.stateName,
                          { color: colors.text },
                          isActive && { color: colors.primary, fontWeight: '800' },
                          !supported && { color: colors.textMuted },
                        ]}
                      >
                        {getLocalizedStateName(state.code, i18n.language, state.name)}
                      </Text>
                      <Text style={[styles.stateSeats, { color: colors.textMuted }]}>
                        {state.assemblySeats} {t('stateSwitcher.constituencies')}
                      </Text>
                    </View>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                    {supported && !isActive && (
                      <View style={[
                        styles.statusBadge,
                        data?.hasFullData
                          ? styles.statusFull
                          : styles.statusStub,
                      ]}>
                        <Text style={[styles.statusText, { color: data?.hasFullData ? colors.success : colors.gold }]}>
                          {data?.hasFullData ? t('stateSwitcher.full') : `${data?.loadedCount}/${state.assemblySeats}`}
                        </Text>
                      </View>
                    )}
                    {!supported && (
                      <Text style={styles.comingSoon}>{t('stateSwitcher.comingSoon')}</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    shadowColor: '#2C1810',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  sheet: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
  },
  scrollArea: {
    maxHeight: 480,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  stateRowDisabled: {
    opacity: 0.5,
  },
  stateInfo: {
    flex: 1,
  },
  stateName: {
    fontSize: 15,
    fontWeight: '600',
  },
  stateSeats: {
    fontSize: 12,
    marginTop: 2,
  },
  comingSoon: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusFull: {
    backgroundColor: '#10B98120',
  },
  statusStub: {
    backgroundColor: '#F59E0B20',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
