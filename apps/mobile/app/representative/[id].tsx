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
import { useTheme } from '../../lib/useTheme';
import { formatINR } from '../../lib/legislatorProfileTypes';
import {
  getRepresentativeById,
  getPendingProfile,
} from '../../lib/representativesData';
import { representativeToProfile, type RepresentativeProfile, type Representative } from '@kshetra/shared';
import ProfileHeroCard from '../../components/legislator/ProfileHeroCard';
import DataPendingCard, { SourceAttributionFooter } from '../../components/DataPendingCard';

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

  const [rep, setRep] = useState<Representative | null>(null);
  const [profile, setProfile] = useState<RepresentativeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getRepresentativeById(String(id ?? '')).then((repData) => {
      if (!mounted) return;
      if (repData) {
        setRep(repData);
        setProfile(representativeToProfile(repData, jurisdictionName || repData.district || repData.stateCode));
      } else if (office && state) {
        setRep(null);
        setProfile(getPendingProfile(office as any, jurisdictionName || 'This seat', String(state), {}));
      } else {
        setRep(null);
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
              message="This seat is part of the administrative structure, but confirmed election records are being compiled from official sources."
              sourceNote="State Election Commission"
            />
          </>
        ) : (
          <>
            <ProfileHeroCard
              fullName={profile.name}
              displayName={profile.name}
              party={profile.party ?? (profile.partyOfficial ? 'Independent' : 'Non-Party')}
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

            {/* Party note for officially non-party polls (e.g. AP/TS panchayats) */}
            {profile.party && !profile.partyOfficial ? (
              <View style={[styles.note, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
                <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
                <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                  This poll is officially non-party. Party affiliation ({partyLabel}) is de-facto / unofficial.
                </Text>
              </View>
            ) : null}

            {/* Verified Election & Mandate Details */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Election & Mandate Details</Text>
              
              <View style={styles.kvRow}>
                <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>Designation</Text>
                <Text style={[styles.kvValue, { color: colors.text }]}>{profile.officeLabel}</Text>
              </View>

              {rep?.gramPanchayat ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>Gram Panchayat</Text>
                  <Text style={[styles.kvValue, { color: colors.text }]}>{rep.gramPanchayat}</Text>
                </View>
              ) : null}

              {rep?.wardNo ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>Ward Number</Text>
                  <Text style={[styles.kvValue, { color: colors.text }]}>Ward {rep.wardNo}</Text>
                </View>
              ) : null}

              {rep?.mandal ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>Mandal / Block</Text>
                  <Text style={[styles.kvValue, { color: colors.text }]}>{rep.mandal}</Text>
                </View>
              ) : null}

              {rep?.district ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>District</Text>
                  <Text style={[styles.kvValue, { color: colors.text }]}>{rep.district}</Text>
                </View>
              ) : null}

              <View style={styles.kvRow}>
                <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>State</Text>
                <Text style={[styles.kvValue, { color: colors.text }]}>
                  {profile.stateCode === 'TS' ? 'Telangana' : profile.stateCode === 'AP' ? 'Andhra Pradesh' : profile.stateCode}
                </Text>
              </View>

              {rep?.reservation ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>Seat Reservation</Text>
                  <Text style={[styles.kvValue, { color: colors.primary, fontWeight: '800' }]}>{rep.reservation}</Text>
                </View>
              ) : null}

              {rep?.electionYear ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>Election Year</Text>
                  <Text style={[styles.kvValue, { color: colors.text }]}>{rep.electionYear}</Text>
                </View>
              ) : null}

              <View style={styles.kvRow}>
                <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>Status</Text>
                <Text style={[styles.kvValue, { color: '#10B981', fontWeight: '800' }]}>Officially Elected Winner</Text>
              </View>

              <View style={styles.kvRow}>
                <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>Party Status</Text>
                <Text style={[styles.kvValue, { color: colors.text }]}>
                  {rep?.party
                    ? `${rep.party}${rep.partyOfficial ? '' : ' (Unofficial / De-facto)'}`
                    : 'Officially Non-Party (State Panchayati Raj Act)'}
                </Text>
              </View>
            </View>

            {/* Financials (only if declared) */}
            {(profile.totalAssets != null || profile.totalLiabilities != null) && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Declared Assets</Text>
                {profile.totalAssets != null && (
                  <View style={styles.kvRow}>
                    <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>Total Assets</Text>
                    <Text style={[styles.kvValue, { color: colors.text }]}>{formatINR(profile.totalAssets)}</Text>
                  </View>
                )}
                {profile.totalLiabilities != null && (
                  <View style={styles.kvRow}>
                    <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>Total Liabilities</Text>
                    <Text style={[styles.kvValue, { color: colors.text }]}>{formatINR(profile.totalLiabilities)}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Criminal Record (only if declared) */}
            {profile.criminalCases != null && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Criminal Record</Text>
                <Text style={[styles.kvValue, { color: profile.criminalCases > 0 ? colors.danger : colors.success }]}>
                  {profile.criminalCases} declared case{profile.criminalCases === 1 ? '' : 's'}
                </Text>
              </View>
            )}

            {/* Contact (only if present) */}
            {(profile.phone || profile.email) && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact</Text>
                {profile.phone && (
                  <Pressable onPress={() => Linking.openURL(`tel:${profile.phone}`)}>
                    <Text style={[styles.link, { color: colors.primary }]}>{profile.phone}</Text>
                  </Pressable>
                )}
                {profile.email && (
                  <Pressable onPress={() => Linking.openURL(`mailto:${profile.email}`)}>
                    <Text style={[styles.link, { color: colors.primary }]}>{profile.email}</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Source & Provenance */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Official Source & Verification</Text>
              <Text style={[styles.secSourceText, { color: colors.textSecondary }]}>
                {profile.stateCode === 'AP'
                  ? 'Official Election Results from Andhra Pradesh State Election Commission (APSEC)'
                  : 'Official Election Results from Telangana State Election Commission (TSEC) — Know Your Representative (KYR)'}
              </Text>
              {profile.sourceUrl ? (
                <Pressable style={styles.sourceBtn} onPress={() => Linking.openURL(profile.sourceUrl!)}>
                  <Ionicons name="open-outline" size={14} color={colors.primary} />
                  <Text style={[styles.link, { color: colors.primary }]} numberOfLines={1}>
                    Verify on State Election Commission Portal
                  </Text>
                </Pressable>
              ) : null}
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
  secSourceText: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  sourceBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  claimBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginTop: 6,
  },
  claimText: { fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
});
