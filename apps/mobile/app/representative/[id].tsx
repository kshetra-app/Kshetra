/**
 * RepresentativeProfileScreen — unified profile for any local-body office
 * (Mayor, Corporator, Sarpanch, ZPTC/MPTC member, GP ward member …).
 *
 * Interface unification (plan Phase 3): reuses the SAME ProfileHeroCard as the
 * MLA/MP legislator screen via the shared `RepresentativeProfile` shape, plus a
 * Source & Provenance section and honest "Data pending" states — never
 * synthesized data.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/useTheme';
import { formatINR } from '@/lib/legislatorProfileTypes';
import {
  getRepresentativeById,
  getPendingProfile,
} from '@/lib/representativesData';
import { representativeToProfile, type RepresentativeProfile } from '@kshetra/shared';
import ProfileHeroCard from '@/components/legislator/ProfileHeroCard';
import DataPendingCard, { SourceAttributionFooter } from '@/components/DataPendingCard';

export default function RepresentativeProfileScreen() {
  const { id, jurisdiction, office, state } = useLocalSearchParams<{
    id: string;
    jurisdiction?: string;
    office?: string;
    state?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const jurisdictionName = String(jurisdiction ?? '').trim();

  const [profile, setProfile] = useState<RepresentativeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getRepresentativeById(String(id ?? '')).then((rep) => {
      if (!mounted) return;
      if (rep) {
        setProfile(representativeToProfile(rep, jurisdictionName || rep.district || rep.stateCode));
      } else if (office && state) {
        // No verified record → honest data-pending shell (needs office + state hints).
        setProfile(getPendingProfile(office as any, jurisdictionName || 'This seat', String(state), {}));
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [id, jurisdictionName, office, state]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Representative' }} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Representative' }} />
        <View style={styles.center}>
          <Ionicons name="person-circle-outline" size={56} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Profile Not Found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text style={[styles.backBtnText, { color: colors.primary }]}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isPending = profile.dataStatus !== 'verified' || !profile.name;
  const partyLabel = profile.party
    ? profile.partyOfficial ? profile.party : `${profile.party} (unofficial)`
    : '—';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${profile.name || profile.officeLabel} — ${profile.officeLabel}\n${profile.jurisdictionName}, ${profile.stateCode}\n\nExplore on Kshetra`,
      });
    } catch { /* noop */ }
  };

  const handleClaim = () => {
    router.push({
      pathname: '/representative/edit/[id]',
      params: { id: profile.id, office: profile.officeType ?? '', jurisdiction: profile.jurisdictionName },
    } as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: profile.name || profile.officeLabel }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        {isPending ? (
          <>
            <View style={styles.pendingHead}>
              <Ionicons name="person-circle-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.pendingOffice, { color: colors.text }]}>
                {profile.officeLabel}
              </Text>
              <Text style={[styles.pendingJur, { color: colors.textSecondary }]}>
                {profile.jurisdictionName} · {profile.stateCode}
              </Text>
            </View>
            <DataPendingCard
              title={`${profile.officeLabel} record`}
              message="This seat is part of the verified administrative structure, but a confirmed office-holder record is not yet available. We only publish data sourced from official records."
              sourceNote="State Election Commission · Lok Dhaba / data.opencity.in · ECI affidavits · Wikipedia (cited)"
            />
            <Pressable style={[styles.claimBtn, { borderColor: colors.primary }]} onPress={handleClaim}>
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={[styles.claimText, { color: colors.primary }]}>Know this representative? Contribute verified details</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ProfileHeroCard
              fullName={profile.name}
              displayName={profile.name}
              party={profile.party ?? '—'}
              constituency={profile.jurisdictionName}
              district={profile.district ?? ''}
              stateCode={profile.stateCode}
              house={profile.officeLabel}
              photoUrl={profile.photoUrl ?? null}
              gender={profile.gender === 'F' ? 'female' : 'male'}
              age={profile.age ?? null}
              termsServed={profile.terms ?? 1}
              isCurrentMember={profile.isCurrent}
              onSharePress={handleShare}
            />

            {/* Party note for officially non-party polls (e.g. AP panchayats) */}
            {profile.party && !profile.partyOfficial ? (
              <View style={[styles.note, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
                <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
                <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                  This poll is officially non-party. Party ({partyLabel}) is de-facto / unofficial.
                </Text>
              </View>
            ) : null}

            {/* Financials */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Declared Assets</Text>
              {profile.totalAssets != null ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>Total Assets</Text>
                  <Text style={[styles.kvValue, { color: colors.text }]}>{formatINR(profile.totalAssets)}</Text>
                </View>
              ) : (
                <Text style={[styles.pendingInline, { color: colors.textMuted }]}>Assets — data pending</Text>
              )}
              {profile.totalLiabilities != null ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>Total Liabilities</Text>
                  <Text style={[styles.kvValue, { color: colors.text }]}>{formatINR(profile.totalLiabilities)}</Text>
                </View>
              ) : null}
            </View>

            {/* Criminal */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Criminal Record</Text>
              {profile.criminalCases != null ? (
                <Text style={[styles.kvValue, { color: profile.criminalCases > 0 ? colors.danger : colors.success }]}>
                  {profile.criminalCases} declared case{profile.criminalCases === 1 ? '' : 's'}
                </Text>
              ) : (
                <Text style={[styles.pendingInline, { color: colors.textMuted }]}>Criminal record — data pending</Text>
              )}
            </View>

            {/* Contact (crowdsourced over time) */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact</Text>
              {profile.phone ? (
                <Pressable onPress={() => Linking.openURL(`tel:${profile.phone}`)}>
                  <Text style={[styles.link, { color: colors.primary }]}>{profile.phone}</Text>
                </Pressable>
              ) : (
                <Text style={[styles.pendingInline, { color: colors.textMuted }]}>Phone — data pending</Text>
              )}
              {profile.email ? (
                <Pressable onPress={() => Linking.openURL(`mailto:${profile.email}`)}>
                  <Text style={[styles.link, { color: colors.primary }]}>{profile.email}</Text>
                </Pressable>
              ) : (
                <Text style={[styles.pendingInline, { color: colors.textMuted }]}>Email — data pending</Text>
              )}
            </View>

            {/* Source & Provenance */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Source & Provenance</Text>
              {profile.sourceUrl ? (
                <Pressable onPress={() => Linking.openURL(profile.sourceUrl!)}>
                  <Text style={[styles.link, { color: colors.primary }]} numberOfLines={1}>{profile.sourceUrl}</Text>
                </Pressable>
              ) : null}
              <SourceAttributionFooter
                sourceType={typeof profile.sourceType === 'string' ? profile.sourceType : undefined}
                sourceUrl={profile.sourceUrl}
                lastEditedBy={profile.lastEditedBy}
                lastEditedAt={profile.lastEditedAt}
                fingerprintVerified={profile.fingerprintVerified}
              />
            </View>

            <Pressable style={[styles.claimBtn, { borderColor: colors.primary }]} onPress={handleClaim}>
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={[styles.claimText, { color: colors.primary }]}>Suggest an edit (with source)</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  backBtnText: { fontSize: 14, fontWeight: '600' },
  pendingHead: { alignItems: 'center', gap: 4, paddingVertical: 20 },
  pendingOffice: { fontSize: 20, fontWeight: '800' },
  pendingJur: { fontSize: 13 },
  section: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  kvLabel: { fontSize: 13 },
  kvValue: { fontSize: 14, fontWeight: '700' },
  pendingInline: { fontSize: 13, fontStyle: 'italic', paddingVertical: 2 },
  link: { fontSize: 14, fontWeight: '600', paddingVertical: 3 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  noteText: { fontSize: 12, flex: 1, lineHeight: 17 },
  claimBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginTop: 6,
  },
  claimText: { fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
});
