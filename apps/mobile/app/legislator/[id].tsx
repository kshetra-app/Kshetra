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


export default function LegislatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
        const candidateAffs = _store.getAffidavitsForCandidate(_winnerAffidavit.candidateName) || [];
        _financialRecords = candidateAffs.map(a => ({
          electionYear: a.electionYear,
          selfMovableAssets: a.selfMovableAssets || 0,
          selfImmovableAssets: a.selfImmovableAssets || 0,
          spouseMovableAssets: a.spouseMovableAssets || 0,
          spouseImmovableAssets: a.spouseImmovableAssets || 0,
          dependentsAssets: 0,
          totalAssets: a.totalAssets || 0,
          totalLiabilities: a.totalLiabilities || 0,
          netWorth: (a.totalAssets || 0) - (a.totalLiabilities || 0),
          selfIncome: a.selfIncome || 0,
          spouseIncome: a.spouseIncome || 0,
        }));
      }

      // Red flags
      let _redFlags: any[] = [];
      if (_winnerAffidavit) {
        try {
          const flags = _store.getRedFlags(_winnerAffidavit.id) || [];
          _redFlags = flags.map(f => ({
            type: f.type || 'unknown',
            severity: f.severity === 'critical' ? 'critical' : f.severity === 'warning' ? 'warning' : 'info',
            description: f.description || '',
          }));
        } catch { _redFlags = []; }
      }

      // Completeness
      let fields = 0, filled = 0;
      if (_mla) {
        fields += 8;
        if (_mla.name) filled++;
        if (_mla.party) filled++;
        if (_mla.gender) filled++;
        if (_mla.terms) filled++;
        if (_mla.age) filled++;
        if (_mla.education) filled++;
        if (_mla.profession) filled++;
        if (_mla.photoUrl) filled++;
      }
      if (_winnerAffidavit) { fields += 6; filled += 6; }
      const _dataCompleteness = fields > 0 ? Math.round((filled / fields) * 100) : 30;

      return {
        mla: _mla,
        constituency: _constituency,
        winnerAffidavit: _winnerAffidavit,
        financialRecords: _financialRecords,
        redFlags: _redFlags,
        dataCompleteness: _dataCompleteness,
      };
    } catch (e) {
      console.error('[LegislatorProfile] Data load error:', e);
      return { mla: null, constituency: null, winnerAffidavit: null, financialRecords: [], redFlags: [], dataCompleteness: 0 };
    }
  }, [stateCode, acNo, electionYear]);

  // Fall through — need at least MLA or constituency data
  if (!mla && !constituency) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Legislator Profile', headerStyle: { backgroundColor: '#0A0A1A' }, headerTintColor: '#FFF' }} />
        <View style={styles.center}>
          <Ionicons name="person-circle" size={56} color="#374151" />
          <Text style={styles.emptyTitle}>Profile Not Found</Text>
          <Text style={styles.emptySubtitle}>Could not find data for AC #{acNo}</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="#4F8EF7" />
            <Text style={styles.backButtonText}>Go Back</Text>
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
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: name,
          headerStyle: { backgroundColor: '#0A0A1A' },
          headerTintColor: '#FFFFFF',
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
          <Text style={styles.disclaimer}>
            Data sourced from candidate self-declarations filed with the Election Commission of India.
            Figures are approximations from MyNeta/ADR summaries. Always verify with official records.
          </Text>
        )}

        {/* Sources */}
        <View style={styles.sourcesSection}>
          <Text style={styles.sourcesTitle}>Data Sources</Text>
          <View style={styles.sourceChips}>
            <View style={styles.sourceChip}>
              <View style={styles.sourceChipDot} />
              <Text style={styles.sourceChipText}>MLA Profiles (Seed)</Text>
            </View>
            {winnerAffidavit && (
              <View style={styles.sourceChip}>
                <View style={styles.sourceChipDot} />
                <Text style={styles.sourceChipText}>MyNeta Affidavit</Text>
              </View>
            )}
            <View style={styles.sourceChip}>
              <View style={styles.sourceChipDot} />
              <Text style={styles.sourceChipText}>ECI Results</Text>
            </View>
          </View>
          {winnerAffidavit?.sourceUrl && (
            <Pressable style={styles.sourceLink} onPress={handleSourceLink}>
              <Ionicons name="open-outline" size={14} color="#4F8EF7" />
              <Text style={styles.sourceLinkText}>View Full Affidavit on MyNeta</Text>
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
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
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
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 14,
    color: '#4F8EF7',
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
    backgroundColor: '#1F2937',
    overflow: 'hidden',
  },
  completenessFill: {
    height: '100%',
    backgroundColor: '#4F8EF7',
    borderRadius: 2,
  },
  completenessText: {
    fontSize: 10,
    color: '#6B7280',
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
    backgroundColor: '#0A0A1A',
  },
  navChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
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
    color: '#FFFFFF',
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
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#D1D5DB',
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
    backgroundColor: '#F59E0B',
    marginTop: 4,
  },
  eventInfo: {
    flex: 1,
  },
  eventDate: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  eventDesc: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  sourcesSection: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  sourcesTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
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
    backgroundColor: '#1F2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  sourceChipText: {
    fontSize: 10,
    color: '#D1D5DB',
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
    color: '#4F8EF7',
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 11,
    color: '#4B5563',
    textAlign: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  lastUpdated: {
    fontSize: 10,
    color: '#4B5563',
    marginTop: 4,
  },
});
