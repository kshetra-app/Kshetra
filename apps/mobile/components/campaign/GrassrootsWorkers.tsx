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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme';
import { useCampaignStore } from '../../stores/campaign';
import type { VolunteerRole } from '../../lib/campaignTypes';

export default function GrassrootsWorkers() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<VolunteerRole>('booth_agent');
  const [newBooth, setNewBooth] = useState('');

  const volunteers = useCampaignStore((s) => s.volunteers);
  const addCadre = useCampaignStore((s) => s.addCadre);
  const checkKshetraUser = useCampaignStore((s) => s.checkKshetraUser);

  const filteredVolunteers = React.useMemo(() => {
    if (!searchQuery.trim()) return volunteers;
    const q = searchQuery.toLowerCase();
    return volunteers.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.phone.includes(q) ||
        v.assignedBooths.some((b) => b.includes(q)),
    );
  }, [volunteers, searchQuery]);

  // Handle Call
  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\D/g, '')}`).catch(() => {});
  };

  // Handle WhatsApp
  const handleWhatsApp = (phone: string, name: string) => {
    const text = `Namaste ${name}, greeting from your campaign team. Please share your daily voter canvassing update.`;
    Linking.openURL(`whatsapp://send?phone=91${phone.replace(/\D/g, '').slice(-10)}&text=${encodeURIComponent(text)}`).catch(() => {});
  };

  // Save new worker
  const handleSaveWorker = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert(t('common.error', { defaultValue: 'Required Fields' }), t('campaignManager.enterWorkerDetails', { defaultValue: 'Please enter worker name and phone number.' }));
      return;
    }

    const userCheck = await checkKshetraUser(newPhone.trim());
    await addCadre({
      name: newName.trim(),
      phone: newPhone.trim(),
      role: newRole,
      assignedBooths: newBooth.trim() ? [newBooth.trim()] : [],
      isKshetraUser: userCheck.isKshetraUser,
    });

    setModalVisible(false);
    setNewName('');
    setNewPhone('');
    setNewBooth('');

    if (!userCheck.isKshetraUser) {
      Alert.alert(
        t('campaignManager.inviteToKshetraTitle', { defaultValue: 'Worker Added' }),
        t('campaignManager.inviteToKshetraDesc', {
          defaultValue: 'Invite this worker to Kshetra so they can see voter lists and log daily door-to-door visits?',
        }),
        [
          { text: t('common.later', { defaultValue: 'Later' }), style: 'cancel' },
          {
            text: t('campaignManager.sendWhatsAppInvite', { defaultValue: 'Send WhatsApp Invite' }),
            onPress: () => {
              const text = `Namaste ${newName}, you have been enrolled into our campaign team on Kshetra. Download the app to view your voter list: https://kshetra.app/download`;
              Linking.openURL(`whatsapp://send?phone=91${newPhone.replace(/\D/g, '').slice(-10)}&text=${encodeURIComponent(text)}`).catch(() => {});
            },
          },
        ],
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── Search & Add Row ─── */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('campaignManager.searchWorkerPlaceholder', { defaultValue: 'Search by name, phone or booth #...' })}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </View>

        <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="person-add" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>
            {t('campaignManager.addWorker', { defaultValue: 'Add Cadre' })}
          </Text>
        </Pressable>
      </View>

      {/* ─── Volunteer List ─── */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredVolunteers.map((v) => (
          <View
            key={v.id}
            style={[styles.workerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.workerMainRow}>
              {/* Avatar Icon */}
              <View style={[styles.avatarBox, { backgroundColor: v.isKshetraUser ? '#DCFCE7' : '#F3F4F6' }]}>
                <Ionicons
                  name={v.role === 'booth_agent' ? 'location' : v.role === 'coordinator' ? 'flag' : 'walk'}
                  size={20}
                  color={v.isKshetraUser ? '#166534' : '#6B7280'}
                />
              </View>

              {/* Info */}
              <View style={styles.workerInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.workerName, { color: colors.text }]}>{v.name}</Text>
                  {v.isKshetraUser && (
                    <View style={styles.kshetraBadge}>
                      <Ionicons name="checkmark-circle" size={11} color="#10B981" />
                      <Text style={styles.kshetraBadgeText}>Kshetra User</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.workerRole, { color: colors.textSecondary }]}>
                  {v.role === 'booth_agent'
                    ? t('campaignManager.roleBoothAgent', { defaultValue: 'Booth In-charge' })
                    : v.role === 'coordinator'
                    ? t('campaignManager.roleCoordinator', { defaultValue: 'Ward Coordinator' })
                    : t('campaignManager.roleCanvasser', { defaultValue: 'Ground Canvasser' })}
                  {v.assignedBooths.length > 0 ? ` · Booth #${v.assignedBooths.join(', #')}` : ''}
                </Text>
                <Text style={styles.workerPhoneText}>{v.phone}</Text>
              </View>

              {/* Action Buttons: 1-Tap Call and WhatsApp */}
              <View style={styles.actionRow}>
                <Pressable style={styles.btnCall} onPress={() => handleCall(v.phone)}>
                  <Ionicons name="call" size={16} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  style={styles.btnWhatsApp}
                  onPress={() => handleWhatsApp(v.phone, v.name)}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#10B981" />
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ─── Modal: Add Worker ─── */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('campaignManager.registerCadreTitle', { defaultValue: 'Register Ground Cadre' })}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>
              {t('campaignManager.workerName', { defaultValue: 'Worker Full Name' })}
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. B. Srinivas"
              placeholderTextColor="#9CA3AF"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>
              {t('campaignManager.workerPhone', { defaultValue: 'Mobile Phone (10 digits)' })}
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="98480xxxxx"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={newPhone}
              onChangeText={setNewPhone}
            />

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>
              {t('campaignManager.assignBoothOptional', { defaultValue: 'Assigned Polling Booth # (Optional)' })}
            </Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 004"
              placeholderTextColor="#9CA3AF"
              value={newBooth}
              onChangeText={setNewBooth}
            />

            <Pressable style={styles.btnSaveWorker} onPress={handleSaveWorker}>
              <Text style={styles.btnSaveWorkerText}>
                {t('campaignManager.saveCadreBtn', { defaultValue: 'Save & Enroll Worker' })}
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
  searchRow: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 8, paddingHorizontal: 6, fontSize: 13 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  workerCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  workerMainRow: { flexDirection: 'row', alignItems: 'center' },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  workerInfo: { flex: 1 },
  workerName: { fontSize: 14, fontWeight: '800' },
  kshetraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  kshetraBadgeText: { fontSize: 9, fontWeight: '800', color: '#166534' },
  workerRole: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  workerPhoneText: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnCall: {
    backgroundColor: '#10B981',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnWhatsApp: {
    backgroundColor: '#DCFCE7',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  btnSaveWorker: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
  },
  btnSaveWorkerText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
