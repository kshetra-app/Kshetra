import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps } from 'react-native';
import { useTheme } from '../lib/theme';

export function PartyAction({
  label, onPress, disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, { borderColor: colors.border, backgroundColor: colors.surface, opacity: disabled ? 0.5 : 1 }]}
    >
      <Text style={{ fontWeight: '700', color: colors.primary }}>{label}</Text>
    </Pressable>
  );
}

export function PartyField(props: TextInputProps & { accessibilityLabel: string }) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      {...props}
      style={[styles.input, { borderColor: colors.border, color: colors.text }, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 46, borderWidth: 1, borderRadius: 12, padding: 12, justifyContent: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, padding: 12, textAlignVertical: 'top' },
});
