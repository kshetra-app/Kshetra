/**
 * CandidateXRay — DEPRECATED: Redirects to Legislator Profile.
 * This screen previously showed affidavit data. All that content is now part of
 * the unified Legislator Profile screen (app/legislator/[id].tsx).
 * Kept as a redirect for backwards-compatible deep links.
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useAffidavitStore } from '../../stores/affidavits';
import { useTheme } from '../../lib/theme';

export default function CandidateXRayRedirect() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const affidavits = useAffidavitStore((s) => s.affidavits);

  const affidavit = useMemo(() => affidavits.find((a) => a.id === id) ?? null, [affidavits, id]);

  useEffect(() => {
    if (affidavit) {
      const legislatorId = `MLA_${affidavit.stateCode}_${affidavit.electionYear}_${affidavit.constituencyName || 'AC'}_${affidavit.acNo}`;
      router.replace(`/legislator/${legislatorId}` as any);
    }
  }, [affidavit, router]);

  if (!affidavit) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Redirecting...' }} />
        <Text style={[styles.text, { color: colors.textMuted }]}>Profile not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Redirecting...' }} />
      <Text style={[styles.text, { color: colors.textMuted }]}>Loading profile...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 14 },
});
