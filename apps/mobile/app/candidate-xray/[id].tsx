/**
 * CandidateXRay — DEPRECATED: Redirects to Legislator Profile.
 * This screen previously showed affidavit data. All that content is now part of
 * the unified Legislator Profile screen (app/legislator/[id].tsx).
 * Kept as a redirect for backwards-compatible deep links.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAffidavitStore } from '../../stores/affidavits';
import { useTheme } from '../../lib/theme';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
import i18n from '../../i18n';

export default function CandidateXRayRedirect() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const affidavits = useAffidavitStore((s) => s.affidavits);
  const [helpVisible, setHelpVisible] = useState(false);

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
        <Stack.Screen
          options={{
            title: 'Candidate X-Ray',
            headerRight: () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={i18n.t('discovery.screenHelp')}
                style={{ padding: 6, marginRight: 8 }}
                onPress={() => setHelpVisible(true)}
              >
                <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <Ionicons name="search-outline" size={44} color={colors.textMuted} />
        <Text style={[styles.titleText, { color: colors.text, marginTop: 12 }]}>Candidate record not found</Text>
        <Text style={[styles.text, { color: colors.textMuted, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }]}>
          Affidavit profiles have been consolidated into Legislator Profiles.
        </Text>
        <Pressable
          style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, marginTop: 16 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '600', marginLeft: 6 }}>{i18n.t('common.back')}</Text>
        </Pressable>
        <DiscoveryHubSheet
          visible={helpVisible}
          onClose={() => setHelpVisible(false)}
          sourceScreen="candidate-xray"
        />
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
  titleText: { fontSize: 16, fontWeight: '700' },
  text: { fontSize: 14 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
