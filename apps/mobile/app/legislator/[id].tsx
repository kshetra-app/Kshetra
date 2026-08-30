/**
 * LegislatorProfileScreen — The complete, immersive profile view for any MLA/MP/MLC.
 * Builds profile from existing MLA Profile data + Affidavit store.
 * Dynamically fits all device sizes via useResponsive() and safe area insets.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Linking } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '../../lib/responsive';
import { useAffidavitStore } from '../../stores/affidavits';
import { getMLAProfileForState, getTimelineForState } from '../../lib/stateDataDispatcher';
import { getUnifiedConstituenciesForState } from '../../lib/stateDataAdapter';
import ProfileHeroCard from '../../components/legislator/ProfileHeroCard';
import FinancialBreakdownCard from '../../components/legislator/FinancialBreakdownCard';
import CriminalRecordCard from '../../components/legislator/CriminalRecordCard';
import PerformanceCard from '../../components/legislator/PerformanceCard';
import RedFlagsBanner from '../../components/legislator/RedFlagsBanner';
import DefectionJourneyCard from '../../components/legislator/DefectionJourneyCard';
import { useTheme } from '../../lib/theme';


export default function LegislatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { contentPaddingBottom } = useResponsive();

  // Parse ID: format is "MLA_TS_2023_Kodangal_65"
  const idStr = String(id || '');
  const parts = idStr.split('_');
  const stateCode = parts[1] || 'TS';
  const electionYear = parseInt(parts[2] || '2023', 10);
  const acNo = parseInt(parts[parts.length - 1] || '0', 10);

  // All data access is wrapped in try-catch useMemo to prevent crashes
  const { mla, constituency, winnerAffidavit, financialRecords, redFlags, dataCompleteness } = useMemo(() => {
    try {
      const _mla = getMLAProfileForState(stateCode, acNo) ?? null;
      const _allConst = getUnifiedConstituenciesForState(stateCode) || [];
      const _constituency = _allConst.find(c => c.acNo === acNo) ?? null;

      const _store = useAffidavitStore.getState();
      const _winnerAffidavit = _store.getWinnerAffidavit(stateCode, acNo, electionYear);

      // Financial records
      let _financialRecords: any[] = [];
      if (_winnerAffidavit) {
        _financialRecords = [
          {
            year: electionYear,
            movableAssets: (_winnerAffidavit.selfMovableAssets || 0) + (_winnerAffidavit.spouseMovableAssets || 0),
            immovableAssets: (_winnerAffidavit.selfImmovableAssets || 0) + (_winnerAffidavit.spouseImmovableAssets || 0),
            totalAssets: _winnerAffidavit.totalAssets || 0,
            liabilities: _winnerAffidavit.totalLiabilities || 0,
            netWorth: (_winnerAffidavit.totalAssets || 0) - (_winnerAffidavit.totalLiabilities || 0),
          },
        ];
      }

      // Red flags calculation
      const _redFlags: { type: string; severity: string; description: string; value?: string }[] = [];
      if (_winnerAffidavit) {
        if (_winnerAffidavit.criminalCases > 0) {
          _redFlags.push({
            type: 'multiple_cases',
            severity: 'warning',
            description: `${_winnerAffidavit.criminalCases} criminal case${_winnerAffidavit.criminalCases > 1 ? 's' : ''} declared in affidavit`,
          });
        }
        if (_winnerAffidavit.seriousCriminalCases > 0) {
          _redFlags.push({
            type: 'serious_criminal_cases',
            severity: 'critical',
            description: `${_winnerAffidavit.seriousCriminalCases} serious IPC charge${_winnerAffidavit.seriousCriminalCases > 1 ? 's' : ''}`,
          });
        }
        if ((_winnerAffidavit.totalLiabilities || 0) > (_winnerAffidavit.totalAssets || 0) && (_winnerAffidavit.totalAssets || 0) > 0) {
          _redFlags.push({
            type: 'zero_liability_anomaly',
            severity: 'warning',
            description: 'Liabilities exceed declared assets',
          });
        }
      }

      // Data completeness score (0-100)
      let score = 0;
      if (_mla) score += 40;
      if (_winnerAffidavit) score += 40;
      if (_constituency) score += 20;

      return {
        mla: _mla,
        constituency: _constituency,
        winnerAffidavit: _winnerAffidavit,
        financialRecords: _financialRecords,
        redFlags: _redFlags,
        dataCompleteness: score,
      };
    } catch (e) {
      console.error('[LegislatorProfile] Data load error:', e);
      return { mla: null, constituency: null, winnerAffidavit: null, financialRecords: [], redFlags: [], dataCompleteness: 0 };
    }
  }, [stateCode, acNo, electionYear]);

  // Fall through — need at least MLA or constituency data
  if (!mla && !constituency) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Legislator Profile', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.primary }} />
        <View style={styles.center}>
          <Ionicons name="person-circle" size={56} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Profile Not Found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Could not find data for AC #{acNo}</Text>
          <Pressable style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderWidth: 1 }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const name = mla?.name || constituency?.winnerName || 'Unknown';
  const party = mla?.party || constituency?.winnerParty || '—';
  const constName = mla?.constituencyName || constituency?.name || '';
  const district = constituency?.district || '';
  const gender = mla?.gender === 'F' ? 'female' : 'male';
  const age = winnerAffidavit?.age || mla?.age || null;
  const terms = mla?.terms || 1;
  const photoUrl = mla?.photoUrl || null;
  const constType = constituency?.type || 'GEN';

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


  const handleShare = async () => {
    try {
      await Share.share({
        message: `${name} (${party})\n${constName}, ${district}\nMLA · ${terms} term${terms > 1 ? 's' : ''}\n\nExplore on Kshetra`,
      });
    } catch (_) {}
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
          photoUrl={photoUrl}
          gender={gender}
          age={age}
          termsServed={terms}
          isCurrentMember={true}
          reservationType={constType.toLowerCase()}
          onSharePress={handleShare}
        />

        {/* Red Flags */}
        {redFlags.length > 0 && (
          <RedFlagsBanner flags={redFlags} />
        )}

        {/* Data Completeness */}
        <View style={styles.completenessRow}>
          <View style={styles.completenessBar}>
            <View style={[styles.completenessFill, { width: `${dataCompleteness}%` }]} />
          </View>
          <Text style={styles.completenessText}>{dataCompleteness}% verified</Text>
        </View>

        {/* Section Navigation Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navChips}>
          <NavChip icon="wallet" label="Finances" color="#4F8EF7" />
          <NavChip icon="alert-circle" label="Criminal" color="#EF4444" />
          <NavChip icon="bar-chart" label="Performance" color="#8B5CF6" />
          <NavChip icon="school" label="Education" color="#10B981" />
        </ScrollView>

        {/* Defection Journey Card */}
        {constituency && (constituency.currentParty !== constituency.winnerParty || defectionEvent) && (
          <DefectionJourneyCard
            electedParty={constituency.winnerParty}
            currentParty={constituency.currentParty}
            defectionEvent={defectionEvent || undefined}
          />
        )}

        {/* Financial Disclosure */}
        <FinancialBreakdownCard records={financialRecords} />


        {/* Criminal Record */}
        <CriminalRecordCard
          totalCases={winnerAffidavit?.criminalCases || mla?.criminalCases || 0}
          seriousCases={winnerAffidavit?.seriousCriminalCases || 0}
          convictions={0}
          caseDetails={(winnerAffidavit?.caseDetails || []).map(c => ({
            caseNo: c.caseNo,
            court: c.court,
            ipcSections: c.ipcSections,
            status: c.status,
          }))}
        />

        {/* Legislative Performance (placeholder — data from PRS) */}
        <PerformanceCard
          questionsAsked={0}
          debatesParticipated={0}
          privateMemberBills={0}
          attendancePercent={0}
        />

        {/* Education & Profession */}
        {(winnerAffidavit || mla?.education) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="school" size={18} color="#10B981" />
              <Text style={styles.sectionTitle}>Education & Profession</Text>
            </View>
            <View style={styles.infoGrid}>
              <InfoRow label="Education" value={formatEducation(winnerAffidavit?.education || mla?.education)} />
              <InfoRow label="Profession" value={winnerAffidavit?.profession || mla?.profession || '—'} />
              {mla?.gender && <InfoRow label="Gender" value={mla.gender === 'F' ? 'Female' : 'Male'} />}
              {mla?.maritalStatus && <InfoRow label="Marital Status" value={mla.maritalStatus} />}
              {mla?.dob && <InfoRow label="Date of Birth" value={mla.dob} />}
              {mla?.phone && <InfoRow label="Contact" value={mla.phone} />}
            </View>
          </View>
        )}

        {/* Election Info */}
        {constituency && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy" size={18} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Election {electionYear}</Text>
            </View>
            <View style={styles.infoGrid}>
              <InfoRow label="Constituency" value={`#${acNo} ${constName}`} />
              <InfoRow label="Votes Received" value={constituency.winnerVotes.toLocaleString()} />
              <InfoRow label="Margin" value={`${constituency.margin.toLocaleString()} votes`} />
              <InfoRow label="Runner Up" value={constituency.runnerUp} />
              <InfoRow label="Type" value={constType} />
              {constituency.currentParty !== constituency.winnerParty && (
                <InfoRow label="Current Party" value={constituency.currentParty} />
              )}
            </View>
          </View>
        )}

        {/* Disclaimer */}
        {winnerAffidavit && (
          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
            Data sourced from candidate self-declarations filed with the Election Commission of India.
            Figures are approximations from MyNeta/ADR summaries. Always verify with official records.
          </Text>
        )}

        {/* Sources */}
        <View style={[styles.sourcesSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.sourcesTitle, { color: colors.textMuted }]}>Data Sources</Text>
          <View style={styles.sourceChips}>
            <View style={[styles.sourceChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}>
              <View style={[styles.sourceChipDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.sourceChipText, { color: colors.textSecondary }]}>MLA Profiles (Seed)</Text>
            </View>
            {winnerAffidavit && (
              <View style={[styles.sourceChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}>
                <View style={[styles.sourceChipDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.sourceChipText, { color: colors.textSecondary }]}>MyNeta Affidavit</Text>
              </View>
            )}
            <View style={[styles.sourceChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}>
              <View style={[styles.sourceChipDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.sourceChipText, { color: colors.textSecondary }]}>ECI Results</Text>
            </View>
          </View>
          {winnerAffidavit?.sourceUrl && (
            <Pressable style={styles.sourceLink} onPress={handleSourceLink}>
              <Ionicons name="open-outline" size={14} color={colors.primary} />
              <Text style={[styles.sourceLinkText, { color: colors.primary }]}>View Full Affidavit on MyNeta</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
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
