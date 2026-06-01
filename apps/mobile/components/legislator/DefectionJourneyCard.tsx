import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getPartyColor } from '@/lib/constants';
import { tapLight } from '@/lib/haptics';
import { moderateScale as ms } from '@/lib/responsive';
import type { PoliticalLedgerEntry } from '../../../../data/seed/telangana-political-timeline';

interface Props {
  electedParty: string;
  currentParty: string;
  defectionEvent?: PoliticalLedgerEntry;
}

export default function DefectionJourneyCard({
  electedParty,
  currentParty,
  defectionEvent,
}: Props) {
  const { t } = useTranslation();

  if (electedParty === currentParty && !defectionEvent) return null;

  const fromParty = defectionEvent?.debitParty || electedParty;
  const toParty = defectionEvent?.creditParty || currentParty;
  const dateStr = defectionEvent?.date || t('timeline.unknown_date', 'Date Unknown');

  const openSource = (url: string) => {
    tapLight();
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="warning" size={18} color="#F59E0B" />
        <Text style={styles.title}>
          {t('legislator.party_switch_history', 'Party Switch History')}
        </Text>
      </View>

      {/* Visual Timeline Path */}
      <View style={styles.pathContainer}>
        <View style={[styles.partyDot, { backgroundColor: getPartyColor(fromParty) }]}>
          <Text style={styles.partyDotText}>{fromParty}</Text>
        </View>
        <View style={styles.connector}>
          <View style={styles.line} />
          <View style={styles.dot}>
            <Text style={styles.dateLabel}>{dateStr}</Text>
          </View>
          <View style={styles.line} />
        </View>
        <View style={[styles.partyDot, { backgroundColor: getPartyColor(toParty) }]}>
          <Text style={styles.partyDotText}>{toParty}</Text>
        </View>
      </View>

      {/* Info Details */}
      <View style={styles.infoGrid}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>🗳️ {t('defection.elected', 'Elected On')}:</Text>
          <Text style={[styles.infoValue, { color: getPartyColor(fromParty) }]}>
            {fromParty}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>🏛️ {t('defection.current', 'Current Party')}:</Text>
          <Text style={[styles.infoValue, { color: getPartyColor(toParty) }]}>
            {toParty}
          </Text>
        </View>
        {defectionEvent?.legalStatus && defectionEvent.legalStatus !== 'NOT_APPLICABLE' && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>⚖️ {t('timeline.legal_status', 'Legal Status')}:</Text>
            <Text style={styles.infoValue}>{defectionEvent.legalStatus}</Text>
          </View>
        )}
      </View>

      {defectionEvent?.explanation && (
        <View style={styles.explanationBox}>
          <Text style={styles.explanationText}>
            "{defectionEvent.explanation}"
          </Text>
          {defectionEvent.details ? (
            <Text style={styles.detailsText}>{defectionEvent.details}</Text>
          ) : null}
        </View>
      )}

      {defectionEvent?.sources && defectionEvent.sources.length > 0 && (
        <View style={styles.sources}>
          <Text style={styles.sourcesTitle}>{t('timeline.sources', 'Sources')}:</Text>
          <View style={styles.sourcesList}>
            {defectionEvent.sources.slice(0, 2).map((src, i) => (
              <Pressable
                key={i}
                onPress={() => openSource(src)}
                style={styles.sourceLink}
              >
                <Text style={styles.sourceLinkText} numberOfLines={1}>
                  {src}
                </Text>
                <Ionicons name="open-outline" size={10} color="#4F8EF7" />
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: ms(14),
    fontWeight: '700',
    color: '#F59E0B',
  },
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  partyDot: {
    width: 50,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  partyDotText: {
    fontSize: ms(12),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  connector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 40,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#374151',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    position: 'relative',
    alignItems: 'center',
  },
  dateLabel: {
    position: 'absolute',
    top: 12,
    fontSize: ms(9),
    color: '#9CA3AF',
    fontWeight: '600',
    width: 80,
    textAlign: 'center',
  },
  infoGrid: {
    backgroundColor: '#0A0A1A',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: ms(11),
    color: '#6B7280',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: ms(11),
    color: '#FFFFFF',
    fontWeight: '700',
  },
  explanationBox: {
    borderLeftWidth: 2,
    borderLeftColor: '#F59E0B',
    paddingLeft: 10,
    marginBottom: 12,
    gap: 4,
  },
  explanationText: {
    fontSize: ms(12),
    color: '#E5E7EB',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  detailsText: {
    fontSize: ms(11),
    color: '#9CA3AF',
    lineHeight: 15,
  },
  sources: {
    gap: 6,
  },
  sourcesTitle: {
    fontSize: ms(10),
    color: '#6B7280',
    fontWeight: '600',
  },
  sourcesList: {
    gap: 4,
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0A1A',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sourceLinkText: {
    fontSize: ms(9),
    color: '#4F8EF7',
    flex: 1,
    marginRight: 6,
  },
});
