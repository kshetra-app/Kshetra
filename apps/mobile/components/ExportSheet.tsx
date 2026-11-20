import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CivicIssue } from '../lib/civicTypes';
import { exportCivicData } from '../lib/exportCivicData';
import { useTheme } from '../lib/theme';

interface ExportSheetProps {
  visible: boolean;
  onClose: () => void;
  issues: CivicIssue[];
  scopeLabel: string;
  coverage: string;
}

export default function ExportSheet({ visible, onClose, issues, scopeLabel, coverage }: ExportSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [exporting, setExporting] = useState(false);

  async function shareCsv() {
    if (!issues.length || exporting) return;
    setExporting(true);
    try {
      const result = await exportCivicData('csv', {
        issues, scopeLabel, coverage, exportedAt: new Date().toISOString(),
        headlines: [], sentiment: [], tierLabel: '',
      });
      if (!result.success) throw new Error(result.error);
      onClose();
    } catch {
      Alert.alert(t('export.failed'), t('export.errorOccurred'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!exporting) onClose(); }}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('export.title')} · CSV</Text>
          <Text style={{ color: colors.text }}>{scopeLabel}</Text>
          <Text style={{ color: colors.textSecondary }}>{coverage}</Text>
          <Pressable accessibilityRole="button" disabled={!issues.length || exporting}
            style={[styles.action, { backgroundColor: colors.primary, opacity: issues.length ? 1 : 0.5 }]} onPress={() => void shareCsv()}>
            {exporting ? <ActivityIndicator color="#fff" /> :
              <Text style={{ color: '#fff' }}>{t('export.shareCsv', { defaultValue: 'Share CSV' })}</Text>}
          </Pressable>
          <Pressable accessibilityRole="button" disabled={exporting} style={styles.action} onPress={onClose}>
            <Text style={{ color: colors.primary }}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#0007', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  action: { minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
