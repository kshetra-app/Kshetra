import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme';
import { useCampaignStore } from '../../stores/campaign';
import type { BoothStrategy } from '../../lib/campaignTypes';

type BoothFilter = 'all' | 'unassigned' | 'critical' | 'strong';

export default function GrassrootsBooths() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [filter, setFilter] = useState<BoothFilter>('unassigned');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooth, setSelectedBooth] = useState<BoothStrategy | null>(null);

  // Form states for in-charge assignment
  const [inchargeName, setInchargeName] = useState('');
  const [inchargePhone, setInchargePhone] = useState('');
  const [isCheckingUser, setIsCheckingUser] = useState(false);
  const [kshetraCheckResult, setKshetraCheckResult] = useState<{ isKshetraUser: boolean; displayName?: string } | null>(null);

  const booths = useCampaignStore((s) => s.booths);
  const assignBoothIncharge = useCampaignStore((s) => s.assignBoothIncharge);
  const checkKshetraUser = useCampaignStore((s) => s.checkKshetraUser);

  // Counts
  const unassignedCount = booths.filter((b) => !b.agentPhone).length;
  const criticalCount = booths.filter((b) => b.priority === 'critical' || b.priority === 'high').length;
  const strongCount = booths.filter((b) => b.supportEstimate >= 65).length;

  const filteredBooths = React.useMemo(() => {
    if (filter === 'unassigned') return booths.filter((b) => !b.agentPhone);
    if (filter === 'critical') return booths.filter((b) => b.priority === 'critical' || b.priority === 'high');
    if (filter === 'strong') return booths.filter((b) => b.supportEstimate >= 65);
    return booths;
  }, [booths, filter]);

  // Open modal
  const openAssignModal = (booth: BoothStrategy) => {
    setSelectedBooth(booth);
    setInchargeName(booth.agentName || '');
    setInchargePhone(booth.agentPhone || '');
    setKshetraCheckResult(booth.isKshetraUser ? { isKshetraUser: true, displayName: booth.agentName } : null);
    setModalVisible(true);
  };

  // Check if phone belongs to Kshetra user
  const handlePhoneBlur = async () => {
    if (inchargePhone.length >= 10) {
      setIsCheckingUser(true);
      const res = await checkKshetraUser(inchargePhone);
      setIsCheckingUser(false);
      setKshetraCheckResult(res);
      if (res.displayName && !inchargeName) {
        setInchargeName(res.displayName);
      }
    }
  };

  // Save in-charge assignment
  const handleSaveIncharge = async () => {
    if (!selectedBooth) return;
    if (!inchargeName.trim() || !inchargePhone.trim()) {
      Alert.alert(t('common.error', { defaultValue: 'Missing Details' }), t('campaignManager.enterNameAndPhone', { defaultValue: 'Please enter in-charge name and phone number.' }));
      return;
    }

    const isUser = kshetraCheckResult?.isKshetraUser ?? false;
    await assignBoothIncharge(selectedBooth.id, inchargeName.trim(), inchargePhone.trim(), isUser);
    setModalVisible(false);

    if (!isUser) {
      Alert.alert(
        t('campaignManager.inviteToKshetraTitle', { defaultValue: 'In-charge Appointed' }),
        t('campaignManager.inviteToKshetraDesc', {
          defaultValue: 'This worker is not yet registered on Kshetra. Invite them via WhatsApp so they can access the voter list and booth survey tool?',
        }),
        [
          { text: t('common.later', { defaultValue: 'Later' }), style: 'cancel' },
          {
            text: t('campaignManager.sendWhatsAppInvite', { defaultValue: 'Send WhatsApp Invite' }),
            onPress: () => {
              const text = `Namaste ${inchargeName}, you have been appointed as the In-charge for Polling Booth #${selectedBooth.boothNumber}. Please download Kshetra to view your booth voter list: https://kshetra.app/download`;
              Linking.openURL(`whatsapp://send?phone=91${inchargePhone.replace(/\D/g, '').slice(-10)}&text=${encodeURIComponent(text)}`).catch(() => {});
            },
          },
        ],
      );
    }
  };

  // Call In-charge
  const handleCallIncharge = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`).catch(() => {});
  };

  // WhatsApp In-charge
  const handleWhatsAppIncharge = (phone?: string, boothNo?: string) => {
    if (!phone) return;
    const text = `Namaste, checking ground status for Polling Booth #${boothNo || ''}. Any updates on canvassing?`;
    Linking.openURL(`whatsapp://send?phone=91${phone.replace(/\D/g, '').slice(-10)}&text=${encodeURIComponent(text)}`).catch(() => {});
  };

  return (
    <View style={styles.container}>
      {/* ─── Filter Chips ─── */}
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterBtn, filter === 'unassigned' && styles.filterBtnActive]}
          onPress={() => setFilter('unassigned')}
        >
          <Text style={[styles.filterBtnText, filter === 'unassigned' && styles.filterBtnTextActive]}>
            ⚠️ {t('campaignManager.filterUnassigned', { defaultValue: 'No In-charge ({{count}})', count: unassignedCount })}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterBtn, filter === 'critical' && styles.filterBtnActive]}
          onPress={() => setFilter('critical')}
        >
          <Text style={[styles.filterBtnText, filter === 'critical' && styles.filterBtnTextActive]}>
            🔴 {t('campaignManager.filterCritical', { defaultValue: 'Weak / Focus ({{count}})', count: criticalCount })}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterBtn, filter === 'strong' && styles.filterBtnActive]}
          onPress={() => setFilter('strong')}
        >
          <Text style={[styles.filterBtnText, filter === 'strong' && styles.filterBtnTextActive]}>
            🟢 {t('campaignManager.filterStrong', { defaultValue: 'Stronghold ({{count}})', count: strongCount })}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterBtnText, filter === 'all' && styles.filterBtnTextActive]}>
            {t('campaignManager.filterAll', { defaultValue: 'All ({{count}})', count: booths.length })}
          </Text>
        </Pressable>
      </View>

      {/* ─── Booth Cards List ─── */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredBooths.map((b) => {
          const hasIncharge = !!b.agentPhone;

          return (
            <View
              key={b.id}
              style={[
                styles.boothCard,
                { backgroundColor: colors.surface, borderColor: hasIncharge ? colors.border : '#FCA5A5' },
              ]}
            >
              {/* Header: Booth No & Landmark */}
              <View style={styles.boothHeader}>
                <View style={styles.boothNumberPill}>
                  <Text style={styles.boothNumberText}>#{b.boothNumber}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.boothName, { color: colors.text }]}>{b.boothName}</Text>
                  <Text style={[styles.boothMeta, { color: colors.textSecondary }]}>
                    Ward #{b.wardNo || 1} · {b.totalVoters.toLocaleString('en-IN')} Voters · Target: {b.targetVotes}
                  </Text>
                </View>
                <View
                  style={[
                    styles.supportBadge,
                    {
                      backgroundColor:
                        b.supportEstimate >= 65 ? '#DCFCE7' : b.supportEstimate >= 50 ? '#FEF3C7' : '#FEE2E2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.supportBadgeText,
                      {
                        color:
                          b.supportEstimate >= 65 ? '#166534' : b.supportEstimate >= 50 ? '#92400E' : '#991B1B',
                      },
                    ]}
                  >
                    {b.supportEstimate}%
                  </Text>
                </View>
              </View>

              {/* In-Charge Section */}
              <View
                style={[
                  styles.inchargeBox,
                  { backgroundColor: hasIncharge ? '#F9FAFB' : '#FFF1F2' },
                ]}
              >
                {hasIncharge ? (
                  <View style={styles.inchargeRow}>
                    <View style={styles.inchargeInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.inchargeName}>{b.agentName}</Text>
                        {b.isKshetraUser && (
                          <View style={styles.kshetraBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                            <Text style={styles.kshetraBadgeText}>Kshetra</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.inchargePhone}>{b.agentPhone}</Text>
                    </View>

                    {/* Action buttons: Call & WhatsApp */}
                    <View style={styles.actionBtnGroup}>
                      <Pressable
                        style={styles.callBtn}
                        onPress={() => handleCallIncharge(b.agentPhone)}
                      >
                        <Ionicons name="call" size={16} color="#FFFFFF" />
                        <Text style={styles.btnActionText}>
                          {t('campaignManager.call', { defaultValue: 'Call' })}
                        </Text>
                      </Pressable>

                      <Pressable
                        style={styles.whatsAppIconBtn}
                        onPress={() => handleWhatsAppIncharge(b.agentPhone, b.boothNumber)}
                      >
                        <Ionicons name="logo-whatsapp" size={18} color="#10B981" />
                      </Pressable>

                      <Pressable
                        style={styles.editBtn}
                        onPress={() => openAssignModal(b)}
                      >
                        <Ionicons name="pencil" size={16} color="#6B7280" />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.unassignedRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.unassignedText}>
                        {t('campaignManager.noInchargeAssigned', { defaultValue: '⚠️ No Booth In-charge Appointed' })}
                      </Text>
                      <Text style={styles.unassignedHint}>
                        {t('campaignManager.appointToTrack', { defaultValue: 'Appoint a worker to manage canvassing' })}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.assignBtn}
                      onPress={() => openAssignModal(b)}
                    >
                      <Ionicons name="person-add" size={14} color="#FFFFFF" />
                      <Text style={styles.assignBtnText}>
                        {t('campaignManager.assignInchargeBtn', { defaultValue: 'Appoint' })}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {b.notes ? (
                <Text style={[styles.boothNotes, { color: colors.textSecondary }]}>
                  📝 {b.notes}
                </Text>
              ) : null}
            </View>
          );
        })}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ─── Modal: Appoint Booth In-charge ─── */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('campaignManager.appointInchargeModalTitle', { defaultValue: 'Appoint Booth In-charge' })}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {selectedBooth?.boothName} (#{selectedBooth?.boothNumber})
            </Text>

            {/* Mobile Phone Input */}
            <Text style={[styles.modalInputLabel, { color: colors.text }]}>
              {t('campaignManager.workerPhone', { defaultValue: 'Worker Mobile Phone (10 digits)' })}
            </Text>
            <View style={styles.phoneInputRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1, color: colors.text, borderColor: colors.border }]}
                placeholder="9848012345"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={inchargePhone}
                onChangeText={setInchargePhone}
                onBlur={handlePhoneBlur}
              />
              <Pressable style={styles.checkBtn} onPress={handlePhoneBlur}>
                {isCheckingUser ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.checkBtnText}>Check</Text>
                )}
              </Pressable>
            </View>

            {/* Kshetra Check Badge */}
            {kshetraCheckResult && (
              <View
                style={[
                  styles.checkResultBox,
                  { backgroundColor: kshetraCheckResult.isKshetraUser ? '#DCFCE7' : '#FEF3C7' },
                ]}
              >
                <Ionicons
                  name={kshetraCheckResult.isKshetraUser ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={kshetraCheckResult.isKshetraUser ? '#166534' : '#92400E'}
                />
                <Text
                  style={[
                    styles.checkResultText,
                    { color: kshetraCheckResult.isKshetraUser ? '#166534' : '#92400E' },
                  ]}
                >
                  {kshetraCheckResult.isKshetraUser
                    ? t('campaignManager.verifiedKshetraUser', { defaultValue: '✓ Registered Kshetra User' })
                    : t('campaignManager.notYetOnKshetra', { defaultValue: 'Not registered on Kshetra yet (Will send WhatsApp invite)' })}
                </Text>
              </View>
            )}

            {/* In-charge Name */}
            <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 12 }]}>
              {t('campaignManager.workerName', { defaultValue: 'Full Name' })}
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. Ramesh Goud"
              placeholderTextColor="#9CA3AF"
              value={inchargeName}
              onChangeText={setInchargeName}
            />

            <Pressable style={styles.btnSaveIncharge} onPress={handleSaveIncharge}>
              <Text style={styles.btnSaveInchargeText}>
                {t('campaignManager.saveInchargeBtn', { defaultValue: 'Confirm & Assign In-charge' })}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 12,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterBtnActive: { backgroundColor: '#1F2937', borderColor: '#1F2937' },
  filterBtnText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  filterBtnTextActive: { color: '#FFFFFF' },
  boothCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
  },
  boothHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  boothNumberPill: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  boothNumberText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  boothName: { fontSize: 14, fontWeight: '800', lineHeight: 18 },
  boothMeta: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  supportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  supportBadgeText: { fontSize: 12, fontWeight: '800' },
  inchargeBox: {
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  inchargeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inchargeInfo: { flex: 1 },
  inchargeName: { fontSize: 13, fontWeight: '800', color: '#1F2937' },
  inchargePhone: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  kshetraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  kshetraBadgeText: { fontSize: 9, fontWeight: '800', color: '#166534' },
  actionBtnGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnActionText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  whatsAppIconBtn: {
    padding: 6,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
  },
  editBtn: {
    padding: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  unassignedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unassignedText: { fontSize: 13, fontWeight: '800', color: '#DC2626' },
  unassignedHint: { fontSize: 11, color: '#B91C1C', marginTop: 1 },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assignBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  boothNotes: { fontSize: 11, fontStyle: 'italic', marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modalSub: { fontSize: 12, marginTop: 2, marginBottom: 14 },
  modalInputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  phoneInputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  checkBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 10,
  },
  checkBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  checkResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkResultText: { fontSize: 11, fontWeight: '700', flex: 1 },
  btnSaveIncharge: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  btnSaveInchargeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
