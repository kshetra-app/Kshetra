/**
 * LegislatorProfileScreen — The complete, immersive profile view for any MLA/MP/MLC.
 * Builds profile from existing MLA Profile data + Affidavit store.
 * Dynamically fits all device sizes via useResponsive() and safe area insets.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Linking } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '../../lib/responsive';
import { useAffidavitStore } from '../../stores/affidavits';
import { getMLAProfileForState, getTimelineForState } from '../../lib/stateDataDispatcher';
import { getUnifiedConstituenciesForState } from '../../lib/stateDataAdapter';
import {
  getCandidatePodiumDetail,
  getHistoricalPodiumForConstituency,
  fetchHistoricalPodiumForConstituency,
  getLocalizedCandidateName,
  getLocalizedPartyName,
  calculateTermsServed,
} from '../../lib/historicalPodiumStore';
import PodiumHistoryCard from '../../components/PodiumHistoryCard';
import { useActiveStateStore } from '../../stores/activeState';
import { getCanonicalElectionYear } from '../../lib/canonicalElections';
import { loadHistoricalResultsForState } from '../../lib/seedDataLoader';
import { IS_LIVE_ENVIRONMENT } from '../../lib/environment';
import ProfileHeroCard from '../../components/legislator/ProfileHeroCard';
import FinancialBreakdownCard from '../../components/legislator/FinancialBreakdownCard';
import CriminalRecordCard from '../../components/legislator/CriminalRecordCard';
import RedFlagsBanner from '../../components/legislator/RedFlagsBanner';
import DefectionJourneyCard from '../../components/legislator/DefectionJourneyCard';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
import PhotoViewerModal from '../../components/PhotoViewerModal';
import ShareableCardModal from '../../components/ShareableCardModal';
import { useTheme } from '../../lib/theme';
import { getStaticPhoto, getCanonicalCandidateName } from '../../lib/candidatePhotos';
import i18n from '../../i18n';


export default function LegislatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { contentPaddingBottom } = useResponsive();
  const [helpVisible, setHelpVisible] = useState(false);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [photoViewerUri, setPhotoViewerUri] = useState<string | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'bio' | 'assets' | 'legal' | 'elections'>('bio');

  // Parse ID: handles formats like:
  // - "MLA_TS_2023_Kodangal_65"
  // - "MLA_TS_2023_65_RU1"
  // - "MLA_TS_2023_65_RU2"
  // - "MLA_TS_2023_65_W"
  // - "MLA_TS_2023_65"
  // - "MLA_TS_65"
  // - "TS-AC-65"
  // - "65"
  const idStr = String(id || '').trim();
  const activeStateCode = useActiveStateStore.getState().stateCode || '';
  let parsedStateCode = activeStateCode;
  let parsedElectionYear: number | null = null;
  let parsedAcNo = 0;
  let parsedRank: 'winner' | 'ru1' | 'ru2' = 'winner';

  if (/_RU1$/i.test(idStr)) {
    parsedRank = 'ru1';
  } else if (/_RU2$/i.test(idStr)) {
    parsedRank = 'ru2';
  } else if (/_W$/i.test(idStr)) {
    parsedRank = 'winner';
  }

  const cleanId = idStr.replace(/_(?:RU1|RU2|W)$/i, '');

  if (cleanId.includes('-AC-')) {
    const segs = cleanId.split('-AC-');
    parsedStateCode = segs[0].toUpperCase();
    parsedAcNo = parseInt(segs[1], 10) || 0;
  } else if (cleanId.startsWith('MLA_')) {
    const segs = cleanId.split('_');
    parsedStateCode = segs[1] ? segs[1].toUpperCase() : parsedStateCode;
    if (segs.length >= 4) {
      const possibleYear = parseInt(segs[2], 10);
      if (!isNaN(possibleYear) && possibleYear >= 1950 && possibleYear <= 2030) {
        parsedElectionYear = possibleYear;
      }
      parsedAcNo = parseInt(segs[segs.length - 1], 10) || 0;
    } else if (segs.length === 3) {
      parsedAcNo = parseInt(segs[2], 10) || 0;
    }
  } else if (cleanId.includes('_') || cleanId.includes('-')) {
    const parts = cleanId.split(/[_-]/);
    if (parts.length >= 2) {
      if (isNaN(Number(parts[0]))) {
        parsedStateCode = parts[0].toUpperCase();
        parsedAcNo = parseInt(parts[1], 10) || 0;
      } else {
        parsedAcNo = parseInt(parts[0], 10) || 0;
      }
    }
  } else {
    parsedAcNo = parseInt(cleanId, 10) || 0;
  }

  const stateCode = parsedStateCode;
  const acNo = parsedAcNo;

  const [, setPodiumTick] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  React.useEffect(() => {
    let active = true;
    if (acNo > 0) {
      Promise.all([
        ...(IS_LIVE_ENVIRONMENT ? [] : [loadHistoricalResultsForState(stateCode).catch(() => {})]),
        fetchHistoricalPodiumForConstituency(stateCode, acNo).catch(() => []),
      ]).then(() => {
        if (active) {
          setPodiumTick((t) => t + 1);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [stateCode, acNo]);

  // All data access is wrapped in try-catch useMemo to prevent crashes
  const { mla, constituency, winnerAffidavit, financialRecords, redFlags, electionYear, podiumDetail, podiumContest, isSamePersonAsSittingMLA } = useMemo(() => {
    try {
      const _allConst = getUnifiedConstituenciesForState(stateCode) || [];
      const _constituency = _allConst.find(c => c.acNo === acNo) ?? null;
      const effectiveYear = parsedElectionYear ?? _constituency?.electionYear ?? null;

      // Check historical podium contest
      const { candidate: _podiumCand, contest: _podiumContest } = effectiveYear != null
        ? getCandidatePodiumDetail(stateCode, acNo, effectiveYear, parsedRank)
        : { candidate: null, contest: null };

      const isWinnerRank = parsedRank === 'winner';
      let rawMla = isWinnerRank ? (getMLAProfileForState(stateCode, acNo) ?? null) : null;
      const sittingWinnerName = _constituency?.winnerName || rawMla?.name || '';
      const candPodiumName = _podiumCand?.name || '';
      const selectedWinnerName = candPodiumName || (effectiveYear == null
        ? rawMla?.name || _constituency?.winnerName || ''
        : (effectiveYear === _constituency?.electionYear ? _constituency?.winnerName || '' : ''));
      const normalizePersonName = (value: string) => getCanonicalCandidateName(value).trim().toLowerCase();
      const isSamePerson = isWinnerRank && Boolean(selectedWinnerName && sittingWinnerName)
        && normalizePersonName(selectedWinnerName) === normalizePersonName(sittingWinnerName);

      let _mla = isSamePerson ? rawMla : null;
      if (_podiumCand) {
        if (isWinnerRank && isSamePerson) {
          _mla = {
            ...(_mla || {}),
            acNo,
            name: _podiumCand.name || _mla?.name || _constituency?.winnerName || '',
            party: _podiumCand.party || _mla?.party || _constituency?.winnerParty || '',
            gender: _mla?.gender,
            terms: _mla?.terms,
            photoUrl: _podiumCand.photoUrl || _mla?.photoUrl || undefined,
            age: _podiumCand.age ?? _mla?.age ?? undefined,
            education: _podiumCand.education || _mla?.education || undefined,
            profession: _podiumCand.profession || _mla?.profession || undefined,
            criminalCases: _podiumCand.criminalCases ?? _mla?.criminalCases ?? null,
            totalAssets: _podiumCand.totalAssets ?? _mla?.totalAssets ?? undefined,
            totalLiabilities: _podiumCand.totalLiabilities ?? _mla?.totalLiabilities ?? undefined,
            constituencyName: _podiumContest?.constituencyName || _constituency?.name,
            district: _constituency?.district,
            sourceUrl: _podiumCand.affidavitUrl || _mla?.sourceUrl || undefined,
          } as any;
        } else {
          // Historical Winner (different person than sitting MLA) or Non-winner candidate — NEVER inherit incumbent MLA's photo, affidavits or flags
          const candGender = (_podiumCand as any).sex === 'F' ? 'F' : ((_podiumCand as any).sex === 'M' ? 'M' : undefined);
          _mla = {
            acNo,
            name: _podiumCand.name || '',
            party: _podiumCand.party || '',
            gender: candGender,
            terms: undefined,
            photoUrl: _podiumCand.photoUrl || getStaticPhoto(_podiumCand.name) || undefined,
            age: _podiumCand.age ?? undefined,
            education: _podiumCand.education || undefined,
            profession: _podiumCand.profession || undefined,
            criminalCases: _podiumCand.criminalCases ?? null,
            totalAssets: _podiumCand.totalAssets ?? undefined,
            totalLiabilities: _podiumCand.totalLiabilities ?? undefined,
            constituencyName: _podiumContest?.constituencyName || _constituency?.name,
            district: _constituency?.district,
            sourceUrl: _podiumCand.affidavitUrl || undefined,
          } as any;
        }
      }

      const _store = useAffidavitStore.getState();
      const _winnerAffidavit = (isWinnerRank && isSamePerson && effectiveYear != null)
        ? _store.getWinnerAffidavit(stateCode, acNo, effectiveYear)
        : null;

      // Financial records matching FinancialRecord interface in FinancialBreakdownCard
      let _financialRecords: any[] = [];
      if (_winnerAffidavit) {
        const hasBoth = _winnerAffidavit.totalAssets != null && _winnerAffidavit.totalLiabilities != null;
        _financialRecords = [
          {
            electionYear: _winnerAffidavit.electionYear ?? effectiveYear,
            selfMovableAssets: _winnerAffidavit.selfMovableAssets,
            selfImmovableAssets: _winnerAffidavit.selfImmovableAssets,
            spouseMovableAssets: _winnerAffidavit.spouseMovableAssets,
            spouseImmovableAssets: _winnerAffidavit.spouseImmovableAssets,
            dependentsAssets: (_winnerAffidavit as any).dependentsAssets,
            totalAssets: _winnerAffidavit.totalAssets,
            totalLiabilities: _winnerAffidavit.totalLiabilities,
            netWorth: hasBoth ? (_winnerAffidavit.totalAssets! - _winnerAffidavit.totalLiabilities!) : null,
            selfIncome: _winnerAffidavit.selfIncome,
            spouseIncome: _winnerAffidavit.spouseIncome,
          },
        ];
      } else if (_podiumCand && (_podiumCand.totalAssets != null || _podiumCand.totalLiabilities != null)) {
        const assets = _podiumCand.totalAssets ?? null;
        const liab = _podiumCand.totalLiabilities ?? null;
        _financialRecords = [
          {
            electionYear: effectiveYear,
            totalAssets: assets,
            totalLiabilities: liab,
            netWorth: assets != null && liab != null ? assets - liab : null,
          },
        ];
      }

      // Red flags calculation — strictly candidate-specific
      const _redFlags: { type: string; severity: string; description: string; value?: string }[] = [];
      const targetCriminalCases = isWinnerRank && isSamePerson
        ? (_winnerAffidavit?.criminalCases ?? _podiumCand?.criminalCases ?? _mla?.criminalCases ?? null)
        : (_podiumCand?.criminalCases ?? null);
      if (targetCriminalCases != null && targetCriminalCases > 0) {
        _redFlags.push({
          type: 'multiple_cases',
          severity: 'warning',
          description: `${targetCriminalCases} criminal case${targetCriminalCases > 1 ? 's' : ''} declared in election affidavit`,
        });
      }

      return {
        mla: _mla,
        constituency: _constituency,
        winnerAffidavit: _winnerAffidavit,
        financialRecords: _financialRecords,
        redFlags: _redFlags,
        electionYear: effectiveYear,
        podiumDetail: _podiumCand,
        podiumContest: _podiumContest,
        isSamePersonAsSittingMLA: Boolean(isSamePerson),
      };
    } catch (e) {
      console.error('[LegislatorProfile] Data load error:', e);
      return { mla: null, constituency: null, winnerAffidavit: null, financialRecords: [], redFlags: [], electionYear: parsedElectionYear ?? null, podiumDetail: null, podiumContest: null, isSamePersonAsSittingMLA: false };
    }
  }, [stateCode, acNo, parsedElectionYear, parsedRank]);

  // Fall through — need at least MLA or constituency data
  if (!mla && !constituency) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Legislator Profile', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.primary }} />
        <View style={styles.center}>
          <Ionicons name="person-circle" size={56} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{i18n.t('legislator.profileNotFound')}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Could not find data for AC #{acNo}</Text>
          <Pressable style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>{i18n.t('common.back')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isWinner = parsedRank === 'winner';
  const isGeneric = (str?: string | null) => {
    if (!str) return true;
    const l = str.trim().toLowerCase();
    return l.includes('candidate') || l.includes('runner up') || l === 'winner' || l === 'ind' || l === 'nota' || l === 'none of the above';
  };
  const seedRuName = (constituency as any)?.runnerUpName || (constituency as any)?.runnerUpName2024 || (constituency as any)?.runnerUpName2023 || '';
  const cleanSeedRuName = !isGeneric(seedRuName) ? seedRuName : null;

  const rawName = isWinner
    ? (mla?.name || (isSamePersonAsSittingMLA ? constituency?.winnerName : null) || '')
    : ((!isGeneric(podiumDetail?.name) ? podiumDetail?.name : null) || cleanSeedRuName || '');

  const rawParty = podiumDetail?.party || mla?.party || (isWinner && isSamePersonAsSittingMLA ? constituency?.winnerParty : '') || '';
  let name = rawName && podiumDetail && !isGeneric(podiumDetail.name)
    ? (getLocalizedCandidateName(podiumDetail, i18n.language) || rawName)
    : (rawName ? (getLocalizedCandidateName(rawName, i18n.language) || rawName) : 'Candidate data unavailable');
  if (!isWinner && isGeneric(name) && cleanSeedRuName) {
    name = cleanSeedRuName;
  }
  const party = rawParty
    ? (podiumDetail
      ? (getLocalizedPartyName(podiumDetail, i18n.language) || rawParty)
      : (getLocalizedPartyName(rawParty, i18n.language) || rawParty))
    : '—';
  const constName = mla?.constituencyName || constituency?.name || '';
  const district = constituency?.district || '';
  const gender = (podiumDetail as any)?.sex === 'F'
    ? 'female'
    : (podiumDetail as any)?.sex === 'M'
      ? 'male'
      : (isSamePersonAsSittingMLA && mla?.gender ? (mla.gender === 'F' ? 'female' : 'male') : '—');
  const age = podiumDetail?.age ?? (isSamePersonAsSittingMLA ? (winnerAffidavit?.age ?? mla?.age) : null) ?? null;
  const terms = electionYear != null && rawName ? (calculateTermsServed(rawName, stateCode, acNo, electionYear) ?? 0) : 0;
  const photoUrl = podiumDetail?.photoUrl || getStaticPhoto(rawName) || getStaticPhoto(name) || (cleanSeedRuName ? getStaticPhoto(cleanSeedRuName) : null) || (isSamePersonAsSittingMLA ? mla?.photoUrl : null);
  const constType = constituency?.type || '—';

  const defectionEvent = useMemo(() => {
    try {
      const events = getTimelineForState(stateCode, acNo);
      return events.find(e => 
        e.memberNames.some(m => m.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(m.toLowerCase()))
      ) ?? null;
    } catch {
      return null;
    }
  }, [stateCode, acNo, name]);


  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleSourceLink = () => {
    if (winnerAffidavit?.sourceUrl) Linking.openURL(winnerAffidavit.sourceUrl);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: name,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerShadowVisible: false,
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: contentPaddingBottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <ProfileHeroCard
          fullName={name}
          displayName={name}
          party={party}
          constituency={constName}
          district={district}
          stateCode={stateCode}
          house="state_assembly"
          photoUrl={photoUrl || null}
          gender={gender}
          age={age}
          termsServed={terms}
          isCurrentMember={isSamePersonAsSittingMLA}
          rank={parsedRank}
          reservationType={constType.toLowerCase()}
          netWorth={
            isSamePersonAsSittingMLA
              ? (financialRecords[0]?.netWorth ?? (mla?.totalAssets != null && mla?.totalLiabilities != null ? mla.totalAssets - mla.totalLiabilities : null))
              : (financialRecords[0]?.netWorth ?? null)
          }
          liabilities={
            isSamePersonAsSittingMLA
              ? (financialRecords[0]?.totalLiabilities ?? mla?.totalLiabilities ?? null)
              : (financialRecords[0]?.totalLiabilities ?? null)
          }
          votes={
            podiumDetail?.votes ??
            (isSamePersonAsSittingMLA
              ? (constituency?.winnerVotes || (constituency as any)?.votes || null)
              : null)
          }
          margin={
            parsedRank === 'winner'
              ? (podiumContest?.marginWinnerToRunnerUp1 ?? (isSamePersonAsSittingMLA ? (constituency?.margin ?? null) : null))
              : null
          }
          voteShare={podiumDetail?.voteShare ?? null}
          dob={isSamePersonAsSittingMLA ? (winnerAffidavit as any)?.dob : null}
          onPhotoPress={(uri) => {
            setPhotoViewerUri(uri);
            setPhotoViewerVisible(true);
          }}
          onSharePress={handleShare}
        />

        {/* Red Flags */}
        {redFlags.length > 0 && (
          <RedFlagsBanner flags={redFlags} />
        )}

        {/* ── 4-Segmented Pill Navigation (Bio, Assets, Legal, Elections) ── */}
        <View style={styles.tabBarContainer}>
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tabButton, activeProfileTab === 'bio' && styles.tabButtonActive]}
              onPress={() => setActiveProfileTab('bio')}
            >
              <Ionicons
                name="person"
                size={14}
                color={activeProfileTab === 'bio' ? '#FFFFFF' : '#475569'}
              />
              <Text
                style={[styles.tabButtonText, activeProfileTab === 'bio' && styles.tabButtonTextActive]}
                numberOfLines={1}
              >
                {i18n.t('legislator.tabBio', { defaultValue: 'Bio' })}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabButton, activeProfileTab === 'assets' && styles.tabButtonActive]}
              onPress={() => setActiveProfileTab('assets')}
            >
              <Ionicons
                name="wallet"
                size={14}
                color={activeProfileTab === 'assets' ? '#FFFFFF' : '#475569'}
              />
              <Text
                style={[styles.tabButtonText, activeProfileTab === 'assets' && styles.tabButtonTextActive]}
                numberOfLines={1}
              >
                {i18n.t('legislator.tabAssets', { defaultValue: 'Assets' })}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabButton, activeProfileTab === 'legal' && styles.tabButtonActive]}
              onPress={() => setActiveProfileTab('legal')}
            >
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={activeProfileTab === 'legal' ? '#FFFFFF' : '#475569'}
              />
              <Text
                style={[styles.tabButtonText, activeProfileTab === 'legal' && styles.tabButtonTextActive]}
                numberOfLines={1}
              >
                {i18n.t('legislator.tabLegal', { defaultValue: 'Legal' })}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabButton, activeProfileTab === 'elections' && styles.tabButtonActive]}
              onPress={() => setActiveProfileTab('elections')}
            >
              <Ionicons
                name="trophy"
                size={14}
                color={activeProfileTab === 'elections' ? '#FFFFFF' : '#475569'}
              />
              <Text
                style={[styles.tabButtonText, activeProfileTab === 'elections' && styles.tabButtonTextActive]}
                numberOfLines={1}
              >
                {i18n.t('legislator.tabElections', { defaultValue: 'Elections' })}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── TAB CONTENT: BIO ── */}
        {activeProfileTab === 'bio' && (
          <>
            {/* Defection Journey Card */}
            {constituency && (constituency.currentParty !== constituency.winnerParty || defectionEvent) && (
              <DefectionJourneyCard
                electedParty={constituency.winnerParty}
                currentParty={constituency.currentParty}
                defectionEvent={defectionEvent || undefined}
              />
            )}

            {/* Education & Profession */}
            {((isSamePersonAsSittingMLA && (winnerAffidavit || mla?.education)) || (podiumDetail?.education || podiumDetail?.profession)) && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="school" size={18} color="#002B7F" />
                  <Text style={styles.sectionTitle}>{i18n.t('legislator.educationProfession')}</Text>
                </View>
                <View style={styles.infoGrid}>
                  <InfoRow label="Education" value={formatEducation((isSamePersonAsSittingMLA ? (winnerAffidavit?.education || mla?.education) : podiumDetail?.education) || undefined)} />
                  <InfoRow label="Profession" value={isSamePersonAsSittingMLA ? (winnerAffidavit?.profession || mla?.profession || '—') : (podiumDetail?.profession || '—')} />
                  {isSamePersonAsSittingMLA && mla?.gender && <InfoRow label="Gender" value={mla.gender === 'F' ? 'Female' : 'Male'} />}
                  {isSamePersonAsSittingMLA && mla?.maritalStatus && <InfoRow label="Marital Status" value={mla.maritalStatus} />}
                  {isSamePersonAsSittingMLA && mla?.dob && <InfoRow label="Date of Birth" value={mla.dob} />}
                  {isSamePersonAsSittingMLA && mla?.phone && <InfoRow label="Contact" value={mla.phone} />}
                </View>
              </View>
            )}

            {/* Legislative Assembly Term */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="business" size={18} color="#002B7F" />
                <Text style={styles.sectionTitle}>Assembly Term & Status</Text>
              </View>
              <View style={styles.infoGrid}>
                <InfoRow label="Constituency" value={`#${acNo} ${constName}`} />
                <InfoRow label="State" value={stateCode} />
                <InfoRow
                  label="Term"
                  value={
                    isWinner
                      ? (isSamePersonAsSittingMLA
                          ? (terms > 1 ? `${terms} Terms Incumbent` : (terms === 1 ? '1st Term Incumbent' : 'Term history unavailable'))
                          : (electionYear != null
                            ? (terms > 1 ? `${terms} Terms Elected (${electionYear} Winner)` : `${electionYear} Elected Winner`)
                            : 'Election year unavailable'))
                      : (parsedRank === 'ru1' ? '1st Runner-up Candidate' : '2nd Runner-up Candidate')
                  }
                />
                <InfoRow label="Category" value={constType} />
              </View>
            </View>

            {/* Statutory Form 26 Affidavit Disclaimer for Pre-2004 or Unverified Elections */}
            {electionYear != null && electionYear < 2004 ? (
              <View style={[styles.sectionCard, { backgroundColor: '#F8FAFC', borderColor: colors.border }]}>
                <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
                  Statutory Form 26 sworn affidavits were instituted by the Election Commission of India starting with the 2004 elections. Sworn asset and criminal disclosures were not legally mandated for the {electionYear} election term.
                </Text>
              </View>
            ) : (!winnerAffidavit && podiumDetail?.totalAssets == null && (
              <View style={[styles.sectionCard, { backgroundColor: '#F8FAFC', borderColor: colors.border }]}>
                <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
                  {electionYear != null
                    ? `Affidavit and asset disclosures for this representative are not available for the ${electionYear} election in the connected records.`
                    : 'The election year is unavailable, so a matching affidavit record cannot be selected.'}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* ── TAB CONTENT: ASSETS (FORM 26 SWORN FINANCIALS) ── */}
        {activeProfileTab === 'assets' && (
          <FinancialBreakdownCard records={financialRecords} />
        )}

        {/* ── TAB CONTENT: LEGAL (FORM 26 SWORN DISCLOSURES) ── */}
        {activeProfileTab === 'legal' && (
          <CriminalRecordCard
            totalCases={isWinner
              ? (winnerAffidavit?.criminalCases ?? mla?.criminalCases ?? podiumDetail?.criminalCases ?? null)
              : (podiumDetail?.criminalCases ?? null)}
            seriousCases={isWinner ? (winnerAffidavit?.seriousCriminalCases ?? null) : null}
            convictions={null}
            caseDetails={isWinner ? (winnerAffidavit?.caseDetails || []).map(c => ({
              caseNo: c.caseNo,
              court: c.court,
              ipcSections: c.ipcSections,
              status: c.status,
            })) : []}
          />
        )}

        {/* ── TAB CONTENT: ELECTIONS (OFFICIAL ECI RESULTS & 1999–2026 ARCHIVE) ── */}
        {activeProfileTab === 'elections' && (() => {
          const pastContests = getHistoricalPodiumForConstituency(stateCode, acNo);
          const isSelectedSittingElection = isSamePersonAsSittingMLA && electionYear != null && constituency?.electionYear === electionYear;
          const hasSelectedResult = Boolean(podiumDetail || isSelectedSittingElection);
          const candVotes = podiumDetail?.votes ?? (isSelectedSittingElection ? constituency?.winnerVotes : null);
          const candShare = podiumDetail?.voteShare;
          const candMargin = parsedRank === 'winner'
            ? (podiumContest?.marginWinnerToRunnerUp1 ?? (isSelectedSittingElection ? constituency?.margin ?? null : null))
            : (podiumDetail?.marginToWinner != null ? -podiumDetail.marginToWinner : null);

          return (
            <View style={{ gap: 12 }}>
              {/* Candidate Performance in Selected Election */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="trophy" size={18} color="#002B7F" />
                  <Text style={styles.sectionTitle}>{electionYear != null ? `${electionYear} Election Performance` : 'Election Performance'}</Text>
                </View>
                <View style={styles.infoGrid}>
                  <InfoRow label="Constituency" value={`#${acNo} ${constName}`} />
                  <InfoRow
                    label="Podium Rank"
                    value={
                      !hasSelectedResult
                        ? 'Result unavailable'
                        : parsedRank === 'winner'
                        ? '🥇 1st Place (Winner)'
                        : parsedRank === 'ru1'
                        ? '🥈 2nd Place (1st Runner-up)'
                        : '🥉 3rd Place (2nd Runner-up)'
                    }
                  />
                  <InfoRow
                    label="Votes Polled"
                    value={
                      candVotes != null
                        ? `${candVotes.toLocaleString()} ${candShare != null ? '(' + candShare.toFixed(1) + '%)' : ''}`
                        : 'Not Reported'
                    }
                  />
                  <InfoRow
                    label={parsedRank === 'winner' ? 'Victory Margin' : 'Vote Share'}
                    value={
                      parsedRank === 'winner'
                        ? (candMargin != null && candMargin > 0 ? `+${candMargin.toLocaleString()} votes` : '—')
                        : (candShare != null ? `${candShare.toFixed(1)}%` : '—')
                    }
                  />
                  <InfoRow label="Type" value={constType} />
                  {constituency?.currentParty && constituency.currentParty !== constituency.winnerParty && (
                    <InfoRow label="Current Party" value={constituency.currentParty} />
                  )}
                </View>
              </View>

              {/* Complete Historical Political Data (1999–2026) */}
              {pastContests.length > 0 && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="time" size={18} color="#002B7F" />
                    <Text style={styles.sectionTitle}>
                      Constituency Election History
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                    Full election cycles for #{acNo} {constName}. Tap any candidate to view their profile dossier.
                  </Text>
                  {pastContests.map((contest, idx) => (
                    <PodiumHistoryCard
                      key={contest.year}
                      item={{
                        id: `${stateCode}-AC-${acNo}-${contest.year}`,
                        state_code: stateCode,
                        ac_no: acNo,
                        year: contest.year,
                        delimitation_id: contest.delimitationId,
                        total_valid_votes: contest.totalValidVotes,
                        winner: contest.winner?.name,
                        party: contest.winner?.party,
                        winner_name: contest.winner?.name,
                        winner_party: contest.winner?.party,
                        winner_votes: contest.winner?.votes,
                        winner_vote_share: contest.winner?.voteShare,
                        winner_education: contest.winner?.education,
                        first_runner_up_name: contest.firstRunnerUp?.name,
                        first_runner_up_party: contest.firstRunnerUp?.party,
                        first_runner_up_votes: contest.firstRunnerUp?.votes,
                        first_runner_up_vote_share: contest.firstRunnerUp?.voteShare,
                        margin_winner_to_runner_up_1: contest.marginWinnerToRunnerUp1 ?? contest.firstRunnerUp?.marginToWinner,
                        second_runner_up_name: contest.secondRunnerUp?.name,
                        second_runner_up_party: contest.secondRunnerUp?.party,
                        second_runner_up_votes: contest.secondRunnerUp?.votes,
                        second_runner_up_vote_share: contest.secondRunnerUp?.voteShare,
                        margin_winner_to_runner_up_2: contest.marginWinnerToRunnerUp2 ?? contest.secondRunnerUp?.marginToWinner,
                        margin_runner_up_1_to_runner_up_2: contest.marginRunnerUp1ToRunnerUp2 ?? contest.secondRunnerUp?.marginToFirstRunnerUp,
                        winner_photo_url: contest.winner?.photoUrl,
                        first_runner_up_photo_url: contest.firstRunnerUp?.photoUrl,
                        second_runner_up_photo_url: contest.secondRunnerUp?.photoUrl,
                      } as any}
                      isLatest={idx === 0}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })()}

        {/* Disclaimer / Disclosure Status */}
        {winnerAffidavit ? (
          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
            {i18n.t('legislator.dataDisclaimer')}
          </Text>
        ) : (
          <View style={{ marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 12, lineHeight: 16, color: colors.textMuted }}>
              {electionYear != null
                ? `Affidavit and asset disclosures are not available for the ${electionYear} election in the connected records.`
                : 'No election year is attached to this profile, so a matching affidavit record cannot be selected.'}
            </Text>
          </View>
        )}

        {/* Sources */}
        <View style={[styles.sourcesSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.sourcesTitle, { color: colors.textMuted }]}>{i18n.t('legislator.dataSources')}</Text>
          {winnerAffidavit?.sourceUrl && (
            <Pressable style={styles.sourceLink} onPress={handleSourceLink}>
              <Ionicons name="open-outline" size={14} color={colors.primary} />
              <Text style={[styles.sourceLinkText, { color: colors.primary }]}>{i18n.t('legislator.viewOnMyNeta')}</Text>
            </Pressable>
          )}
          {!winnerAffidavit?.sourceUrl && (
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
              Source citation is not attached to this record.
            </Text>
          )}
        </View>
      </ScrollView>
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="legislator"
      />
      <PhotoViewerModal
        visible={photoViewerVisible}
        imageUri={photoViewerUri}
        name={name}
        party={party}
        subtitle={`${constName}${district ? `, ${district}` : ''} · MLA`}
        onClose={() => setPhotoViewerVisible(false)}
      />
      <ShareableCardModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        data={{
          type: 'legislator',
          title: name,
          subtitle: `${constName}${district ? `, ${district}` : ''}`,
          stateCode,
          district,
          acNo,
          winnerName: name,
          winnerParty: party,
          terms,
          photoUrl: photoUrl,
          education: winnerAffidavit?.education ?? undefined,
          criminalCases: winnerAffidavit?.criminalCases ?? undefined,
          totalAssets: winnerAffidavit?.totalAssets ?? undefined,
          shareUrl: `https://poligram.in/legislator/${id}`,
        }}
      />
    </View>
  );
}

function formatEducation(edu: string | undefined): string {
  if (!edu) return '—';
  const map: Record<string, string> = {
    illiterate: 'Illiterate', '5th_pass': '5th Pass', '8th_pass': '8th Pass',
    '10th_pass': '10th Pass', '12th_pass': '12th Pass', graduate: 'Graduate',
    post_graduate: 'Post Graduate', doctorate: 'Doctorate', professional: 'Professional',
    others: 'Others',
  };
  return map[edu] || edu;
}

function NavChip({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={[styles.navChip, { borderColor: color + '40' }]}>
      <Ionicons name={icon as any} size={12} color={color} />
      <Text style={[styles.navChipText, { color }]}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
  },
  completenessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
  },
  completenessBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  completenessFill: {
    height: '100%',
    borderRadius: 2,
  },
  completenessText: {
    fontSize: 10,
    fontWeight: '600',
  },
  tabBarContainer: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  tabButtonActive: {
    backgroundColor: '#002B7F',
    shadowColor: '#002B7F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  navChips: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  navChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  navChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoGrid: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  eventRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
    marginTop: 4,
  },
  eventInfo: {
    flex: 1,
  },
  eventDate: {
    fontSize: 10,
    fontWeight: '600',
  },
  eventDesc: {
    fontSize: 12,
  },
  sourcesSection: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  sourcesTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  sourceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sourceChipText: {
    fontSize: 10,
    fontWeight: '500',
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  sourceLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  lastUpdated: {
    fontSize: 10,
    marginTop: 4,
  },
});
