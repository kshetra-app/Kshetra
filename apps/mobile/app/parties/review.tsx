import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PartyAction, PartyField } from '../../components/PartyActions';
import { listPartyClaims, reviewPartyClaim, type ClaimStatus } from '../../lib/partyRegistry';
import { useTheme } from '../../lib/theme';

type Claim = Awaited<ReturnType<typeof listPartyClaims>>['claims'][number];
type Decision = Exclude<ClaimStatus, 'pending'>;

export default function PartyClaimReviewScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(false);
    void listPartyClaims(offset).then((result) => {
      if (!current) return;
      setClaims((previous) => offset ? [...previous, ...result.claims] : result.claims);
      setNextOffset(result.nextOffset);
    }).catch(() => { if (current) setError(true); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [offset, revision]);

  const save = useCallback(async (claimId: string, decision: Decision) => {
    setSaving(true);
    try {
      await reviewPartyClaim(claimId, decision, note);
      setNote('');
      setSelected(null);
      setOffset(0);
      setRevision((previous) => previous + 1);
    } catch (err) {
      Alert.alert(t('common.error', { defaultValue: 'Error' }), err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }, [note, t]);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.screen}>
      <Stack.Screen options={{ headerShown: true, title: t('partyRegistry.review', { defaultValue: 'Review official Page claims' }) }} />
      {claims.map((claim) => (
        <View key={claim.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.heading, { color: colors.text }]}>{claim.political_organizations.name}</Text>
          <Text selectable style={{ color: colors.textMuted }}>{claim.claimant_id}</Text>
          <Text style={{ color: colors.text }}>{claim.authority_summary}</Text>
          <Text selectable style={{ color: colors.textMuted }}>{claim.evidence_url}</Text>
          <PartyAction label={t('partyRegistry.openEvidence', { defaultValue: 'Open submitted evidence' })}
            onPress={() => void Linking.openURL(claim.evidence_url)} />
          {selected !== claim.id ? (
            <PartyAction label={claim.status === 'approved'
              ? t('partyRegistry.manageVerification', { defaultValue: 'Manage verification' })
              : t('partyRegistry.recordDecision', { defaultValue: 'Record review decision' })}
              onPress={() => { setSelected(claim.id); setNote(''); }} />
          ) : (
            <>
              <Text style={{ color: colors.textMuted }}>{t('partyRegistry.independentCheck', { defaultValue: 'Confirm the party’s authority through an independent official contact before approving.' })}</Text>
              <PartyField accessibilityLabel={t('partyRegistry.reviewNote', { defaultValue: 'Verification notes' })}
                placeholder={t('partyRegistry.reviewNote', { defaultValue: 'Verification notes' })}
                value={note} onChangeText={setNote} multiline maxLength={1600} />
              {(claim.status === 'approved' ? (['revoked'] as const) : (['approved', 'rejected'] as const)).map((decision) => (
                <PartyAction key={decision} label={t('partyRegistry.decision.' + decision, { defaultValue: decision })}
                  disabled={saving || note.trim().length < 20} onPress={() => void save(claim.id, decision)} />
              ))}
            </>
          )}
        </View>
      ))}
      {loading && <ActivityIndicator color={colors.primary} />}
      {!loading && error && <PartyAction label={t('partyRegistry.retryClaims', { defaultValue: 'Could not load claims. Retry' })}
        onPress={() => setRevision(revision + 1)} />}
      {!loading && !error && nextOffset !== null && (
        <PartyAction label={t('partyRegistry.moreClaims', { defaultValue: 'Load more claims' })} onPress={() => setOffset(nextOffset)} />
      )}
      {!loading && !error && claims.length === 0 && (
        <Text style={{ color: colors.textMuted }}>{t('partyRegistry.noClaims', { defaultValue: 'No party Page claims to review.' })}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 14 },
  card: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  heading: { fontSize: 19, fontWeight: '700' },
});
