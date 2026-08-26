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

export default function LanguageSwitcher() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<LanguageCode>(getCurrentLanguage());

  const handleSelect = async (code: LanguageCode) => {
    await setLanguage(code);
    setCurrent(code);
    setVisible(false);
  };

  const currentLang = LANGUAGES.find((l) => l.code === current);

  return (
    <>
      <Pressable
        style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setVisible(true)}
      >
        <Ionicons name="language" size={16} color={colors.primary} />
        <Text style={[styles.triggerText, { color: colors.text }]}>{currentLang?.nativeLabel ?? 'English'}</Text>
        <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
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
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
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
  },
  sheetSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
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
  },
  langEnglish: {
    fontSize: 12,
    marginTop: 2,
  },
});
