import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../stores/activeState';
import { isStateSupported } from '../lib/stateRegistry';

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
            {Object.values(STATES).map((state) => {
              const supported = isStateSupported(state.code);
              const isActive = state.code === stateCode;
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
                  {!supported && (
                    <Text style={styles.comingSoon}>Coming Soon</Text>
                  )}
                </Pressable>
              );
            })}
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
});
