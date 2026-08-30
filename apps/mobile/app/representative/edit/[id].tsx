/**
 * RepresentativeEditScreen — "Claim & verify" / suggest-an-edit flow (Phase 4).
 *
 * A KYC-verified citizen proposes corrections to a local-body representative
 * with a mandatory source citation. The submission is fingerprinted (CCA/KYC)
 * and queued for moderation via `representative_edits`.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../lib/useTheme';
import { getRepresentativeById } from '../../../lib/representativesData';
import type { Representative } from '@kshetra/shared';
import { submitRepresentativeEdit } from '../../../lib/representativeEdits';
import { gateContentAction } from '../../../lib/contentAccountability';
import { useContributorVerificationStore } from '../../../stores/contributorVerification';

const EDITABLE_FIELDS: { key: string; label: string; keyboard?: 'default' | 'phone-pad' | 'email-address' | 'url' }[] = [
  { key: 'name', label: 'Full name' },
  { key: 'party', label: 'Party (leave blank if non-party)' },
  { key: 'phone', label: 'Phone', keyboard: 'phone-pad' },
  { key: 'email', label: 'Email', keyboard: 'email-address' },
  { key: 'photoUrl', label: 'Photo URL', keyboard: 'url' },
];

export default function RepresentativeEditScreen() {
  const { id, office, jurisdiction } = useLocalSearchParams<{ id: string; office?: string; jurisdiction?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [rep, setRep] = useState<Representative | null>(null);

  const kyc = useContributorVerificationStore((s) => s.kycRecord);
  const editorVerified = kyc?.status === 'verified';

  const [values, setValues] = useState<Record<string, string>>({
    name: '', party: '', phone: '', email: '', photoUrl: '',
  });

  // Load the current record (async from SQLite) and seed the form once.
  useEffect(() => {
    let mounted = true;
    getRepresentativeById(String(id ?? '')).then((r) => {
      if (!mounted) return;
      setRep(r);
      if (r) {
        setValues({
          name: r.name ?? '',
          party: r.party ?? '',
          phone: r.phone ?? '',
          email: r.email ?? '',
          photoUrl: r.photoUrl ?? '',
        });
      }
    });
    return () => { mounted = false; };
  }, [id]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [citation, setCitation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }));

  const buildDiff = (): Record<string, { from: unknown; to: unknown }> => {
    const original: Record<string, unknown> = {
      name: rep?.name ?? '',
      party: rep?.party ?? '',
      phone: rep?.phone ?? '',
      email: rep?.email ?? '',
      photoUrl: rep?.photoUrl ?? '',
    };
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const { key } of EDITABLE_FIELDS) {
      const to = values[key]?.trim() ?? '';
      const from = (original[key] as string) ?? '';
      if (to !== from) diff[key] = { from: from || null, to: to || null };
    }
    return diff;
  };

  const handleSubmit = async () => {
    const diff = buildDiff();
    if (Object.keys(diff).length === 0) {
      Alert.alert('No changes', 'Edit at least one field before submitting.');
      return;
    }
    if (!sourceUrl.trim()) {
      Alert.alert('Source required', 'A source link or citation is required for every edit (zero-fabrication policy).');
      return;
    }

    // Gate behind KYC verification (shows KYC sheet if not verified).
    const allowed = gateContentAction('add_evidence');
    if (!allowed) return;

    setSubmitting(true);
    try {
      const result = await submitRepresentativeEdit({
        representativeId: String(id ?? ''),
        editorUserId: kyc?.userId,
        editorKycVerified: !!editorVerified,
        sourceType: 'crowdsourced',
        sourceUrl: sourceUrl.trim(),
        citation: citation.trim() || undefined,
        diff,
      });

      if (result.success) {
        Alert.alert(
          'Thank you',
          result.queued
            ? 'Your contribution has been submitted for moderation. Verified edits appear with source attribution.'
            : 'Your contribution was captured and will sync for moderation when online.',
          [{ text: 'Done', onPress: () => router.back() }],
        );
      } else {
        Alert.alert('Submission failed', result.error ?? 'Please try again later.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Contribute Details' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <View style={[styles.banner, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '40' }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
          <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
            {office ? `${office} · ` : ''}{jurisdiction ?? ''}{'\n'}
            Every edit requires a verifiable source and is fingerprinted for accountability. Edits are moderated before publishing.
          </Text>
        </View>

        {EDITABLE_FIELDS.map((f) => (
          <View key={f.key} style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{f.label}</Text>
            <TextInput
              value={values[f.key]}
              onChangeText={(v) => setField(f.key, v)}
              keyboardType={f.keyboard ?? 'default'}
              autoCapitalize={f.key === 'email' || f.key === 'photoUrl' ? 'none' : 'words'}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            />
          </View>
        ))}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Source link (required)</Text>
          <TextInput
            value={sourceUrl}
            onChangeText={setSourceUrl}
            keyboardType="url"
            autoCapitalize="none"
            placeholder="https://tsec.gov.in/... or news / gazette URL"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Citation / note (optional)</Text>
          <TextInput
            value={citation}
            onChangeText={setCitation}
            multiline
            placeholder="e.g. TSEC Know-Your-Representative page, published 2020-12-04"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.multiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          />
        </View>

        <Pressable
          disabled={submitting}
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
          onPress={handleSubmit}
        >
          <Ionicons name="send" size={16} color="#FFF" />
          <Text style={styles.submitText}>{submitting ? 'Submitting…' : 'Submit for moderation'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  bannerText: { fontSize: 12, flex: 1, lineHeight: 17 },
  fieldWrap: { marginBottom: 12 },
  label: { fontSize: 12.5, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  submitText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
