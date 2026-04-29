import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getPartyColor } from '@/lib/constants';

interface DefectionBadgeProps {
  electedParty: string;
  currentParty: string;
  compact?: boolean;
}

export default function DefectionBadge({
  electedParty,
  currentParty,
  compact = false,
}: DefectionBadgeProps) {
  const { t } = useTranslation();
  if (electedParty === currentParty) return null;

  if (compact) {
    return (
      <View style={styles.compactBadge}>
        <Ionicons name="swap-horizontal" size={12} color="#F59E0B" />
        <Text style={styles.compactText}>
          {electedParty} → {currentParty}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="swap-horizontal-outline" size={18} color="#F59E0B" />
        <Text style={styles.title}>{t('defection.title')}</Text>
      </View>
      <View style={styles.flow}>
        <View style={[styles.partyBox, { borderColor: getPartyColor(electedParty) }]}>
          <Text style={[styles.partyText, { color: getPartyColor(electedParty) }]}>
            {electedParty}
          </Text>
          <Text style={styles.partyLabel}>{t('defection.elected')}</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color="#6B7280" />
        <View style={[styles.partyBox, { borderColor: getPartyColor(currentParty) }]}>
          <Text style={[styles.partyText, { color: getPartyColor(currentParty) }]}>
            {currentParty}
          </Text>
          <Text style={styles.partyLabel}>{t('defection.current')}</Text>
        </View>
      </View>
      <Text style={styles.note}>
        {t('defection.note')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  flow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  partyBox: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  partyText: {
    fontSize: 18,
    fontWeight: '800',
  },
  partyLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  note: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
    textAlign: 'center',
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
});
