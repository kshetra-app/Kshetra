import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import { getConstituenciesForState } from '../lib/stateDataAdapter';
import { useMyConstituencyStore } from '../stores/myConstituency';
import type { ConstituencyBrief } from '@kshetra/shared';
import { getLocalizedStateName } from '../lib/seedTranslations';
import {
  getLocalizedConstituencyName,
  getLocalizedDistrictName,
  getLocalizedPartyName,
} from '../lib/stateTranslations';

interface ConstituencySelectorSheetProps {
  visible: boolean;
  stateCode: string;
  stateName: string;
  selectedAcNo?: number;
  onClose: () => void;
  onSelect: (constituency: { id: string; acNo: number; name: string }) => void;
}

export default function ConstituencySelectorSheet({
  visible,
  stateCode,
  stateName,
  selectedAcNo,
  onClose,
  onSelect,
}: ConstituencySelectorSheetProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const home = useMyConstituencyStore((s) => s.home);
  const setHome = useMyConstituencyStore((s) => s.setHome);

  const constituencies = useMemo(() => {
    return getConstituenciesForState(stateCode);
  }, [stateCode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return constituencies;
    return constituencies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        String(c.acNo).includes(q) ||
        (c.currentParty ?? '').toLowerCase().includes(q) ||
        (c.currentMLA ?? '').toLowerCase().includes(q),
    );
  }, [constituencies, search]);

  const handleChoose = (item: ConstituencyBrief) => {
    onSelect({
      id: `${stateCode}-AC-${item.acNo}`,
      acNo: item.acNo,
      name: item.name,
    });
    onClose();
  };

  const handleSetHome = (item: ConstituencyBrief) => {
    setHome({
      acNo: item.acNo,
      name: item.name,
      district: item.district,
      party: item.currentParty ?? '',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background },
          Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight || 20 },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('feed.selectConstituency')}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close-circle" size={26} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Subheader info */}
        <View style={styles.stateBanner}>
          <Text style={[styles.stateBannerText, { color: colors.textSecondary }]}>
            {getLocalizedStateName(stateCode, i18n.language, stateName)} · {constituencies.length} {t('stateSwitcher.constituencies')}
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('feed.searchConstituency')}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.acNo)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isHome = home?.acNo === item.acNo;
            const isSelected = selectedAcNo === item.acNo;

            return (
              <Pressable
                style={[
                  styles.itemCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isSelected && { borderColor: colors.primary, borderWidth: 1.5 },
                ]}
                onPress={() => handleChoose(item)}
              >
                <View style={styles.itemLeft}>
                  <View style={[styles.acBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.acBadgeText, { color: colors.primary }]}>
                      AC {item.acNo}
                    </Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <View style={styles.itemNameRow}>
                      <Text style={[styles.itemName, { color: colors.text }]}>
                        {getLocalizedConstituencyName(item.acNo, stateCode, item.name, i18n.language, (item as any).localName)}
                      </Text>
                      {isHome && (
                        <View style={styles.homeTag}>
                          <Ionicons name="home" size={10} color="#10B981" />
                          <Text style={styles.homeTagText}>{t('feed.myConstituency')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                      {getLocalizedDistrictName(item.district, i18n.language) || item.district}
                      {item.currentParty ? ` · ${getLocalizedPartyName(item.currentParty, i18n.language) || item.currentParty}` : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemActions}>
                  {!isHome && (
                    <Pressable
                      style={[styles.setHomeButton, { borderColor: colors.goldBorder || colors.border }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleSetHome(item);
                      }}
                      hitSlop={6}
                    >
                      <Ionicons name="bookmark-outline" size={13} color={colors.gold || colors.primary} />
                      <Text style={[styles.setHomeText, { color: colors.gold || colors.primary }]}>
                        {t('feed.setAsHome')}
                      </Text>
                    </Pressable>
                  )}
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={isSelected ? colors.primary : colors.textMuted}
                  />
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('feed.noResults')}
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  stateBanner: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  stateBannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  acBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  acBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  homeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#10B98115',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  homeTagText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  setHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  setHomeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
