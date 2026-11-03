import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import {
  LANGUAGES,
  setLanguage,
  getCurrentLanguage,
  type LanguageCode,
} from '../i18n';

interface LanguageSwitcherProps {
  compact?: boolean;
}

export default function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<LanguageCode>(getCurrentLanguage());

  React.useEffect(() => {
    setCurrent(getCurrentLanguage());
  }, [i18n.language]);

  const handleSelect = async (code: LanguageCode) => {
    await setLanguage(code);
    setCurrent(code);
    setVisible(false);
  };

  const currentLang = LANGUAGES.find((l) => l.code === current);

  return (
    <>
      <Pressable
        style={[
          styles.trigger,
          { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border },
          compact && styles.compactTrigger,
        ]}
        onPress={() => setVisible(true)}
      >
        <Ionicons name="language" size={compact ? 14 : 16} color={colors.primary} />
        <Text
          style={[styles.triggerText, { color: colors.text }, compact && styles.compactTriggerText]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {currentLang?.nativeLabel ?? 'English'}
        </Text>
        <Ionicons name="chevron-down" size={compact ? 10 : 12} color={colors.textMuted} />
      </Pressable>

      {visible && (
        <Modal
          visible={visible}
          transparent
          animationType="fade"
          onRequestClose={() => setVisible(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
            <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('language.title')}</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>{t('language.subtitle')}</Text>

              <ScrollView
                style={styles.langList}
                showsVerticalScrollIndicator={true}
                bounces={false}
              >
                {LANGUAGES.map((lang) => {
                  const isActive = lang.code === current;
                  return (
                    <Pressable
                      key={lang.code}
                      style={[
                        styles.langRow,
                        isActive && { backgroundColor: colors.primaryLight },
                      ]}
                      onPress={() => handleSelect(lang.code)}
                    >
                      <View style={styles.langInfo}>
                        <Text
                          style={[
                            styles.langNative,
                            { color: colors.text },
                            isActive && { color: colors.primary, fontWeight: '800' },
                          ]}
                        >
                          {lang.nativeLabel}
                        </Text>
                        <Text style={[styles.langEnglish, { color: colors.textMuted }]}>{lang.label}</Text>
                      </View>
                      {isActive && (
                        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
    maxWidth: 110,
    shadowColor: '#2C1810',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactTrigger: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
    maxWidth: 95,
  },
  triggerText: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 70,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  compactTriggerText: {
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 60,
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    borderWidth: 1,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  langList: {
    maxHeight: 400,
    flexGrow: 0,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  sheetSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    includeFontPadding: false,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  langInfo: {
    flex: 1,
  },
  langNative: {
    fontSize: 16,
    fontWeight: '700',
    includeFontPadding: false,
  },
  langEnglish: {
    fontSize: 12,
    marginTop: 2,
    includeFontPadding: false,
  },
});
