import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AD_FORMAT_CONFIG } from '../../lib/campaignTypes';
import { useTheme } from '../../lib/theme';
import { useCampaignStore } from '../../stores/campaign';

export default function CampaignAds() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [paidForBy, setPaidForBy] = useState('');
  const [disclosureText, setDisclosureText] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const campaign = useCampaignStore((state) => state.campaigns.find((item) => item.id === state.selectedCampaignId));
  const ads = useCampaignStore((state) => state.ads.filter((ad) => ad.campaignId === state.selectedCampaignId));
  const adsLoading = useCampaignStore((state) => state.adsLoading);
  const adsAvailable = useCampaignStore((state) => state.adsAvailable);
  const adsError = useCampaignStore((state) => state.adsError);
  const fetchAds = useCampaignStore((state) => state.fetchAds);
  const createAd = useCampaignStore((state) => state.createAd);

  const resetForm = () => {
    setName('');
    setHeadline('');
    setBody('');
    setPaidForBy('');
    setDisclosureText('');
    setFormError(null);
  };

  const saveDraft = async () => {
    if (!campaign) {
      setFormError(t('campaignManager.noCampaignForAds', { defaultValue: 'Create or select a campaign first.' }));
      return;
    }
    if (!name.trim() || !headline.trim() || !paidForBy.trim() || !disclosureText.trim()) {
      setFormError(t('campaignManager.adDraftRequired', { defaultValue: 'Enter a name, headline, sponsor, and disclosure.' }));
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await createAd({
        format: 'promoted_post',
        name: name.trim(),
        headline: headline.trim(),
        body: body.trim(),
        paidForBy: paidForBy.trim(),
        disclosureText: disclosureText.trim(),
      });
      resetForm();
      setModalVisible(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('common.tryAgain', { defaultValue: 'Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>{t('campaignManager.adDraftsTitle', { defaultValue: 'Ad creative drafts' })}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {campaign?.name || t('campaignManager.noCampaignForAds', { defaultValue: 'Create or select a campaign first.' })}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('campaignManager.createAdDraft', { defaultValue: 'Create ad draft' })}
          style={[styles.addButton, { backgroundColor: colors.primary }, !campaign && styles.disabled]}
          onPress={() => setModalVisible(true)}
          disabled={!campaign}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>{t('common.create', { defaultValue: 'Create' })}</Text>
        </Pressable>
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          {t('campaignManager.adDraftOnlyNote', { defaultValue: 'Drafts are saved to this campaign. Review, audience targeting, billing, and ad delivery are not connected yet.' })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {!campaign ? (
          <Notice icon="briefcase-outline" message={t('campaignManager.noCampaignForAds', { defaultValue: 'Create or select a campaign first.' })} colors={colors} />
        ) : adsLoading ? (
          <View style={styles.notice}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>{t('common.loading', { defaultValue: 'Loading ad drafts…' })}</Text>
          </View>
        ) : adsError ? (
          <View style={styles.notice}>
            <Ionicons name="alert-circle-outline" size={18} color="#B45309" />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>{adsError}</Text>
            <Pressable accessibilityRole="button" onPress={() => fetchAds(campaign.id)}>
              <Text style={[styles.retry, { color: colors.primary }]}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
            </Pressable>
          </View>
        ) : adsAvailable && ads.length === 0 ? (
          <Notice icon="megaphone-outline" message={t('campaignManager.noAdDrafts', { defaultValue: 'There are no ad drafts for this campaign yet.' })} colors={colors} />
        ) : null}

        {ads.map((ad) => (
          <View key={ad.id} style={[styles.adCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.adHeader}>
              <View style={styles.formatRow}>
                <Ionicons name="megaphone-outline" size={15} color={colors.primary} />
                <Text style={[styles.formatText, { color: colors.primary }]}>{AD_FORMAT_CONFIG[ad.format].label}</Text>
              </View>
              <Text style={styles.status}>{ad.status.toUpperCase()}</Text>
            </View>
            <Text style={[styles.adName, { color: colors.text }]}>{ad.name}</Text>
            <Text style={[styles.adHeadline, { color: colors.textSecondary }]}>{ad.headline}</Text>
            {ad.body ? <Text style={[styles.adBody, { color: colors.textSecondary }]} numberOfLines={3}>{ad.body}</Text> : null}
            <Text style={[styles.sponsor, { color: colors.textSecondary }]}>
              {t('campaignManager.paidBy', { defaultValue: 'Paid for by' })}: {ad.paidForBy}
            </Text>
            <Text style={[styles.disclosure, { color: colors.textSecondary }]}>{ad.disclosureText}</Text>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('campaignManager.createAdDraft', { defaultValue: 'Create ad draft' })}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.close', { defaultValue: 'Close' })} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.campaignLabel, { color: colors.textSecondary }]}>{campaign?.name}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Field label={t('campaignManager.adName', { defaultValue: 'Draft name' })} value={name} onChangeText={setName} colors={colors} />
              <Field label={t('campaignManager.adHeadline', { defaultValue: 'Headline' })} value={headline} onChangeText={setHeadline} colors={colors} />
              <Field label={t('campaignManager.adBody', { defaultValue: 'Message (optional)' })} value={body} onChangeText={setBody} colors={colors} multiline />
              <Field label={t('campaignManager.paidBy', { defaultValue: 'Paid for by' })} value={paidForBy} onChangeText={setPaidForBy} colors={colors} />
              <Field label={t('campaignManager.adDisclosure', { defaultValue: 'Disclosure text' })} value={disclosureText} onChangeText={setDisclosureText} colors={colors} multiline />
              <Text style={[styles.formNote, { color: colors.textSecondary }]}>
                {t('campaignManager.adDraftOnlyNote', { defaultValue: 'Drafts are saved to this campaign. Review, audience targeting, billing, and ad delivery are not connected yet.' })}
              </Text>
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
              <Pressable
                accessibilityRole="button"
                style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.disabled]}
                onPress={saveDraft}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>{t('campaignManager.saveAdDraft', { defaultValue: 'Save draft' })}</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }, multiline && styles.multiline]}
        placeholder={label}
        placeholderTextColor={colors.textSecondary}
        maxLength={multiline ? 4000 : 300}
      />
    </View>
  );
}

function Notice({ icon, message, colors }: { icon: React.ComponentProps<typeof Ionicons>['name']; message: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.notice}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={[styles.noticeText, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 3 },
  addButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 12 },
  addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  infoBox: { flexDirection: 'row', gap: 8, marginHorizontal: 16, padding: 11, borderRadius: 10, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
  listContent: { paddingVertical: 8, paddingBottom: 24 },
  notice: { minHeight: 90, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginHorizontal: 16, padding: 16 },
  noticeText: { flexShrink: 1, fontSize: 13, textAlign: 'center' },
  retry: { fontSize: 13, fontWeight: '700' },
  adCard: { marginHorizontal: 16, marginVertical: 6, padding: 14, borderRadius: 14, borderWidth: 1 },
  adHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  formatRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  formatText: { fontSize: 11, fontWeight: '700' },
  status: { overflow: 'hidden', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#6B728020', color: '#6B7280', fontSize: 10, fontWeight: '800' },
  adName: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  adHeadline: { fontSize: 13, fontWeight: '600' },
  adBody: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  sponsor: { fontSize: 11, marginTop: 10, fontWeight: '600' },
  disclosure: { fontSize: 11, marginTop: 4 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' },
  modalCard: { maxHeight: '92%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  campaignLabel: { fontSize: 12, marginTop: 4, marginBottom: 14 },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  multiline: { minHeight: 90, paddingTop: 10 },
  formNote: { fontSize: 12, lineHeight: 17, marginTop: 3, marginBottom: 10 },
  errorText: { color: '#B91C1C', fontSize: 12, marginBottom: 10 },
  saveButton: { minHeight: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginTop: 4 },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
