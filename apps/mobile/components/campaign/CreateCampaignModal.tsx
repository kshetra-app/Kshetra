import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CAMPAIGN_TYPE_CONFIG, type CampaignType } from '../../lib/campaignTypes';
import { useTheme } from '../../lib/theme';
import { useCampaignStore } from '../../stores/campaign';

interface CreateCampaignModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCampaignModal({ visible, onClose, onCreated }: CreateCampaignModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const createCampaign = useCampaignStore((state) => state.createCampaign);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [type, setType] = useState<CampaignType>('awareness');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setDescription('');
    setStateCode('');
    setStartDate('');
    setEndDate('');
    setBudget('');
    setType('awareness');
  }, [visible]);

  const handleCreate = async () => {
    const normalizedState = stateCode.trim().toUpperCase();
    const parsedBudget = budget.trim() ? Number(budget) : undefined;
    const validDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    };

    if (!name.trim() || !/^[A-Z]{2}$/.test(normalizedState) || !validDate(startDate) || !validDate(endDate)) {
      Alert.alert(
        t('common.checkDetails', { defaultValue: 'Check campaign details' }),
        t('campaignManager.campaignRequiredFields', { defaultValue: 'Enter a name, a two-letter state code, and valid dates in YYYY-MM-DD format.' }),
      );
      return;
    }
    if (endDate < startDate) {
      Alert.alert(
        t('common.checkDetails', { defaultValue: 'Check campaign details' }),
        t('campaignManager.campaignDateOrder', { defaultValue: 'The end date must be on or after the start date.' }),
      );
      return;
    }
    if (budget.trim() && (!Number.isFinite(parsedBudget) || (parsedBudget as number) < 0)) {
      Alert.alert(
        t('common.checkDetails', { defaultValue: 'Check campaign details' }),
        t('campaignManager.campaignBudgetInvalid', { defaultValue: 'Enter a valid non-negative budget, or leave it blank.' }),
      );
      return;
    }

    setSaving(true);
    try {
      await createCampaign({
        name: name.trim(),
        description: description.trim(),
        type,
        stateCode: normalizedState,
        startDate,
        endDate,
        totalBudgetINR: parsedBudget,
      });
      onClose();
      onCreated();
    } catch (error) {
      Alert.alert(
        t('campaignManager.campaignNotSaved', { defaultValue: 'Campaign not saved' }),
        error instanceof Error ? error.message : t('common.tryAgain', { defaultValue: 'Please try again.' }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('campaignManager.createCampaign', { defaultValue: 'Create a campaign' })}
            </Text>
            <Pressable accessibilityLabel={t('common.close', { defaultValue: 'Close' })} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.text }]}>{t('campaignManager.campaignName', { defaultValue: 'Campaign name' })}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              maxLength={120}
              placeholder={t('campaignManager.campaignNamePlaceholder', { defaultValue: 'Name this campaign' })}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }]}>{t('campaignManager.campaignType', { defaultValue: 'Campaign type' })}</Text>
            <View style={styles.typeGrid}>
              {(Object.keys(CAMPAIGN_TYPE_CONFIG) as CampaignType[]).map((campaignType) => {
                const selected = type === campaignType;
                return (
                  <Pressable
                    key={campaignType}
                    onPress={() => setType(campaignType)}
                    style={[
                      styles.typeOption,
                      { borderColor: selected ? colors.primary : colors.border },
                      selected && { backgroundColor: `${colors.primary}12` },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text style={{ color: selected ? colors.primary : colors.text, fontSize: 12, fontWeight: '700' }}>
                      {t(`campaignManager.campaignTypes.${campaignType}`, { defaultValue: CAMPAIGN_TYPE_CONFIG[campaignType].label })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>{t('campaignManager.descriptionOptional', { defaultValue: 'Description (optional)' })}</Text>
            <TextInput
              style={[styles.input, styles.multiline, { color: colors.text, borderColor: colors.border }]}
              value={description}
              onChangeText={setDescription}
              maxLength={2000}
              multiline
              textAlignVertical="top"
              placeholder={t('campaignManager.descriptionPlaceholder', { defaultValue: 'What is this campaign about?' })}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }]}>{t('campaignManager.stateCode', { defaultValue: 'State code' })}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={stateCode}
              onChangeText={(value) => setStateCode(value.replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase())}
              maxLength={2}
              autoCapitalize="characters"
              placeholder="TS"
              placeholderTextColor={colors.textSecondary}
            />

            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={[styles.label, { color: colors.text }]}>{t('campaignManager.startDate', { defaultValue: 'Start date' })}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.label, { color: colors.text }]}>{t('campaignManager.endDate', { defaultValue: 'End date' })}</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>{t('campaignManager.budgetOptional', { defaultValue: 'Budget in INR (optional)' })}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
              placeholder={t('campaignManager.budgetNotSet', { defaultValue: 'Leave blank if not set' })}
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.note, { color: colors.textSecondary }]}>
              {t('campaignManager.campaignDraftNote', { defaultValue: 'This creates a draft record. It does not publish ads or schedule outreach.' })}
            </Text>
            <Pressable
              style={[styles.createButton, { backgroundColor: colors.primary }, saving && styles.disabledButton]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                <Text style={styles.createButtonText}>{t('campaignManager.saveCampaignDraft', { defaultValue: 'Save campaign draft' })}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' },
  sheet: { maxHeight: '92%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  multiline: { minHeight: 72 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeOption: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  note: { fontSize: 12, lineHeight: 17, marginTop: 14 },
  createButton: { minHeight: 46, marginTop: 16, marginBottom: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  createButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  disabledButton: { opacity: 0.65 },
});
