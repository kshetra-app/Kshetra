/**
 * RepresentativeProfileScreen — unified profile for any local-body office
 * (Mayor, Corporator, Sarpanch, ZPTC/MPTC member, GP ward member …).
 *
 * Interface unification (plan Phase 3): reuses the SAME ProfileHeroCard as the
 * MLA/MP legislator screen via the shared `RepresentativeProfile` shape, plus a
 * Source & Provenance section and honest "Data pending" states — never
 * synthesized data.
 */
import { useTranslation as useScreenTranslation } from 'react-i18next';
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
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
import i18n from '../../i18n';

export default function RepresentativeProfileScreen() {
  const { t: translateScreenLabel } = useScreenTranslation();
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
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [helpVisible, setHelpVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError(false);
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
    }).catch(() => {
      if (!mounted) return;
      setRep(null);
      setProfile(null);
      setLoadError(true);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [id, jurisdictionName, office, retry, state]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: translateScreenLabel('additionalScreenLabels.representative.profile') }} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: translateScreenLabel('additionalScreenLabels.representative.profile') }} />
        <View style={styles.center}>
          <Ionicons name="person-circle-outline" size={56} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {loadError
              ? i18n.t('representative.profileLoadError', { defaultValue: 'Could not load this election record.' })
              : i18n.t('representative.profileNotFound')}
          </Text>
          <Pressable style={styles.backBtn} onPress={() => loadError ? setRetry((value) => value + 1) : router.back()}>
            <Ionicons name={loadError ? 'refresh' : 'arrow-back'} size={18} color={colors.primary} />
            <Text style={[styles.backBtnText, { color: colors.primary }]}>
              {loadError ? i18n.t('common.retry', { defaultValue: 'Retry' }) : i18n.t('common.back')}
            </Text>
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
        message: `${profile.name || profile.officeLabel} — ${profile.officeLabel}\n${profile.jurisdictionName}, ${profile.stateCode}\n\nExplore on Poligram`,
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
      <Stack.Screen
        options={{
          title: profile.name || profile.officeLabel,
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
              title={translateScreenLabel("screenLabels.representative.value1Record", { value1: profile.officeLabel })}
              message="This seat is part of the administrative structure, but confirmed election records are being compiled from official sources."
              sourceNote="State Election Commission"
            />
          </>
        ) : (
          <>
            <ProfileHeroCard
              fullName={profile.name}
              displayName={profile.name}
              party={profile.party ?? (profile.partyOfficial ? '' : 'Non-Party')}
              constituency={profile.jurisdictionName}
              district={profile.district ?? ''}
              stateCode={profile.stateCode}
              house={profile.officeLabel}
              photoUrl={profile.photoUrl ?? null}
              allowUnverifiedPhotoFallback={false}
              gender={profile.gender === 'F' ? 'female' : profile.gender === 'M' ? 'male' : ''}
              age={profile.age ?? null}
              isCurrentMember={profile.isCurrent}
              onSharePress={handleShare}
            />

            {/* Party note for officially non-party polls (e.g. AP/TS panchayats) */}
            {profile.party && !profile.partyOfficial ? (
              <View style={[styles.note, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
                <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
                <Text style={[styles.noteText, { color: colors.textSecondary }]}>{translateScreenLabel("screenLabels.representative.thisPollIsOfficiallyNonPartyPartyAffiliation", { value1: partyLabel })}</Text>
              </View>
            ) : null}

            {/* Verified Election & Mandate Details */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{i18n.t('representative.electionDetails')}</Text>
              
              <View style={styles.kvRow}>
                <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>{i18n.t('representative.designation')}</Text>
                <Text style={[styles.kvValue, { color: colors.text }]}>{profile.officeLabel}</Text>
              </View>

              {rep?.gramPanchayat ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>{i18n.t('representative.gramPanchayat')}</Text>
                  <Text style={[styles.kvValue, { color: colors.text }]}>{rep.gramPanchayat}</Text>
                </View>
              ) : null}

              {rep?.wardNo ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>{i18n.t('representative.wardNumber')}</Text>
                  <Text style={[styles.kvValue, { color: colors.text }]}>{translateScreenLabel("screenLabels.representative.wardValue1", { value1: rep.wardNo })}</Text>
                </View>
              ) : null}

              {rep?.mandal ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>{i18n.t('representative.mandalBlock')}</Text>
                  <Text style={[styles.kvValue, { color: colors.text }]}>{rep.mandal}</Text>
                </View>
              ) : null}

              {rep?.district ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>{i18n.t('representative.district')}</Text>
                  <Text style={[styles.kvValue, { color: colors.text }]}>{rep.district}</Text>
                </View>
              ) : null}

              <View style={styles.kvRow}>
                <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>{i18n.t('representative.state')}</Text>
                <Text style={[styles.kvValue, { color: colors.text }]}>
                  {profile.stateCode === 'TS' ? translateScreenLabel("localBodies.telanganaName") : profile.stateCode === 'AP' ? translateScreenLabel("localBodies.andhraPradeshName") : profile.stateCode}
                </Text>
              </View>

              {rep?.reservation ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>{i18n.t('representative.seatReservation')}</Text>
                  <Text style={[styles.kvValue, { color: colors.primary, fontWeight: '800' }]}>{rep.reservation}</Text>
                </View>
              ) : null}

              {rep?.electionYear ? (
                <View style={styles.kvRow}>
                  <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>{i18n.t('representative.electionYear')}</Text>
                  <Text style={[styles.kvValue, { color: colors.text }]}>{rep.electionYear}</Text>
                </View>
              ) : null}

              <View style={styles.kvRow}>
                <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>{i18n.t('representative.status')}</Text>
                <Text style={[styles.kvValue, { color: '#10B981', fontWeight: '800' }]}>{i18n.t('representative.officiallyElected')}</Text>
              </View>

              <View style={styles.kvRow}>
                <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>{i18n.t('representative.partyStatus')}</Text>
                <Text style={[styles.kvValue, { color: colors.text }]}>
                  {rep?.party
                    ? `${rep.party}${rep.partyOfficial ? '' : ' (Unofficial / De-facto)'}`
                    : translateScreenLabel("screenLabels.representative.officiallyNonPartyStatePanchayatiRajAct")}
                </Text>
              </View>
            </View>

            {/* Financials (only if declared) */}
            {(profile.totalAssets != null || profile.totalLiabilities != null) && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{i18n.t('representative.declaredAssets')}</Text>
                {profile.totalAssets != null && (
                  <View style={styles.kvRow}>
                    <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>{i18n.t('representative.totalAssets')}</Text>
                    <Text style={[styles.kvValue, { color: colors.text }]}>{formatINR(profile.totalAssets)}</Text>
                  </View>
                )}
                {profile.totalLiabilities != null && (
                  <View style={styles.kvRow}>
                    <Text style={[styles.kvLabel, { color: colors.textSecondary }]}>{i18n.t('representative.totalLiabilities')}</Text>
                    <Text style={[styles.kvValue, { color: colors.text }]}>{formatINR(profile.totalLiabilities)}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Criminal Record (only if declared) */}
            {profile.criminalCases != null && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{i18n.t('representative.criminalRecord')}</Text>
                <Text style={[styles.kvValue, { color: profile.criminalCases > 0 ? colors.danger : colors.success }]}>{translateScreenLabel("screenLabels.representative.value1DeclaredCaseValue2", { value1: profile.criminalCases, value2: profile.criminalCases === 1 ? '' : 's' })}</Text>
              </View>
            )}

            {/* Contact (only if present) */}
            {(profile.phone || profile.email) && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{i18n.t('representative.contact')}</Text>
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
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{i18n.t('representative.officialSource')}</Text>
              <Text style={[styles.secSourceText, { color: colors.textSecondary }]}>
                {profile.stateCode === 'AP'
                  ? translateScreenLabel("screenLabels.representative.officialElectionResultsFromAndhraPradeshState")
                  : translateScreenLabel("screenLabels.representative.officialElectionResultsFromTelanganaStateElection")}
              </Text>
              {profile.sourceUrl ? (
                <Pressable style={styles.sourceBtn} onPress={() => Linking.openURL(profile.sourceUrl!)}>
                  <Ionicons name="open-outline" size={14} color={colors.primary} />
                  <Text style={[styles.link, { color: colors.primary }]} numberOfLines={1}>
                    {translateScreenLabel("screenLabels.representative.verifyOnStateElectionCommissionPortal")}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <Pressable style={[styles.claimBtn, { borderColor: colors.primary }]} onPress={handleClaim}>
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={[styles.claimText, { color: colors.primary }]}>{translateScreenLabel("screenLabels.representative.suggestAnEditWithSource")}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="representative"
      />
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
