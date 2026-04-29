import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  LANGUAGES,
  setLanguage,
  getCurrentLanguage,
  type LanguageCode,
} from '../i18n';

export default function LanguageSwitcher() {
  const { t } = useTranslation();
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
      <Pressable style={styles.trigger} onPress={() => setVisible(true)}>
        <Ionicons name="language" size={16} color="#4F8EF7" />
        <Text style={styles.triggerText}>{currentLang?.nativeLabel ?? 'English'}</Text>
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
            <Text style={styles.sheetTitle}>{t('language.title')}</Text>
            <Text style={styles.sheetSubtitle}>{t('language.subtitle')}</Text>

            {LANGUAGES.map((lang) => {
              const isActive = lang.code === current;
              return (
                <Pressable
                  key={lang.code}
                  style={[styles.langRow, isActive && styles.langRowActive]}
                  onPress={() => handleSelect(lang.code)}
                >
                  <View style={styles.langInfo}>
                    <Text style={[styles.langNative, isActive && styles.langNativeActive]}>
                      {lang.nativeLabel}
                    </Text>
                    <Text style={styles.langEnglish}>{lang.label}</Text>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={22} color="#4F8EF7" />
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
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
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
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  langRowActive: {
    backgroundColor: '#4F8EF720',
  },
  langInfo: {
    flex: 1,
  },
  langNative: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  langNativeActive: {
    color: '#4F8EF7',
  },
  langEnglish: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
