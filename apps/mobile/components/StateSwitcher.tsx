import { useState, useMemo } from 'react';
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

export default function StateSwitcher() {
  const [visible, setVisible] = useState(false);
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const setStateCode = useActiveStateStore((s) => s.setStateCode);
  const currentState = STATES[stateCode];

  const handleSelect = (code: string) => {
    setStateCode(code);
    setVisible(false);
  };

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setVisible(true)}>
        <Ionicons name="location" size={14} color="#4F8EF7" />
        <Text style={styles.triggerText}>{currentState?.name ?? stateCode}</Text>
        <Ionicons name="chevron-down" size={12} color="#6B7280" />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select State</Text>
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              {Object.values(STATES).map((state) => {
                const supported = isStateSupported(state.code);
                const isActive = state.code === stateCode;
                const data = supported ? getStateData(state.code) : null;
                return (
                  <Pressable
                    key={state.code}
                    style={[
                      styles.stateRow,
                      isActive && styles.stateRowActive,
                      !supported && styles.stateRowDisabled,
                    ]}
                    onPress={() => supported && handleSelect(state.code)}
                    disabled={!supported}
                  >
                    <View style={styles.stateInfo}>
                      <Text
                        style={[
                          styles.stateName,
                          isActive && styles.stateNameActive,
                          !supported && styles.stateNameDisabled,
                        ]}
                      >
                        {state.name}
                      </Text>
                      <Text style={styles.stateSeats}>
                        {state.assemblySeats} constituencies
                      </Text>
                    </View>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={20} color="#4F8EF7" />
                    )}
                    {supported && !isActive && (
                      <View style={[
                        styles.statusBadge,
                        data?.hasFullData
                          ? styles.statusFull
                          : styles.statusStub,
                      ]}>
                        <Text style={styles.statusText}>
                          {data?.hasFullData ? 'Full' : `${data?.loadedCount}/${state.assemblySeats}`}
                        </Text>
                      </View>
                    )}
                    {!supported && (
                      <Text style={styles.comingSoon}>Coming Soon</Text>
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
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  sheet: {
    backgroundColor: '#111827',
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
    color: '#FFFFFF',
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
  stateRowActive: {
    backgroundColor: '#4F8EF720',
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
    color: '#FFFFFF',
  },
  stateNameActive: {
    color: '#4F8EF7',
  },
  stateNameDisabled: {
    color: '#6B7280',
  },
  stateSeats: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  comingSoon: {
    fontSize: 11,
    color: '#F59E0B',
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
    color: '#9CA3AF',
  },
});
