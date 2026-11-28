import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, type AlertButton } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, type LanguageCode } from '../i18n';
import { useTheme } from '../lib/theme';

async function openKeyboardSettings() {
  try {
    await Linking.sendIntent('android.settings.INPUT_METHOD_SUBTYPE_SETTINGS');
  } catch {
    await Linking.sendIntent('android.settings.INPUT_METHOD_SETTINGS');
  }
}

export function WritingKeyboardButton({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const label = t('writing.keyboard');

  function showHelp() {
    const buttons: AlertButton[] = [{ text: t('common.ok') }];
    if (Platform.OS === 'android') {
      buttons.unshift({
        text: t('writing.openKeyboardSettings'),
        onPress: () => void openKeyboardSettings().catch(() => {
          Alert.alert(label, t('writing.keyboardHelp'));
        }),
      });
    }
    Alert.alert(label, t('writing.keyboardHelp'), buttons);
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={showHelp}
      style={[styles.control, { borderColor: colors.border }, compact && styles.compact]}>
      <Ionicons name="language-outline" size={18} color={colors.primary} />
      {!compact && <Text style={[styles.text, { color: colors.text }]}>{label}</Text>}
    </Pressable>
  );
}

export function ContentLanguagePicker({ value, onChange }: {
  value: string;
  onChange: (value: LanguageCode) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const selected = LANGUAGES.find((language) => language.code === value);
  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
        onPress={() => setExpanded((open) => !open)} style={[styles.control, { borderColor: colors.border }]}>
        <Text style={[styles.text, { color: colors.text }]}>{t('writing.contentLanguage', { language: selected?.nativeLabel ?? value })}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
      </Pressable>
      {expanded && (
        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled"
          style={[styles.options, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {LANGUAGES.map((language) => (
            <Pressable key={language.code} accessibilityRole="radio"
              accessibilityState={{ checked: language.code === value }} style={styles.option}
              onPress={() => { onChange(language.code); setExpanded(false); }}>
              <Text style={[styles.text, { color: colors.text }]}>{language.nativeLabel}</Text>
              {language.code === value && <Ionicons name="checkmark" size={16} color={colors.primary} />}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  control: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 6, paddingHorizontal: 10, borderWidth: 1, borderRadius: 10 },
  compact: { width: 44, paddingHorizontal: 0, justifyContent: 'center', borderWidth: 0 },
  text: { fontSize: 13, flexShrink: 1 },
  options: { borderWidth: 1, borderRadius: 10, marginTop: 4, maxHeight: 180 },
  option: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingHorizontal: 12 },
});
