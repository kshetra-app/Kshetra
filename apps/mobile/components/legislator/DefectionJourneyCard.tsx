import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getPartyColor } from '../../lib/constants';
import { tapLight } from '../../lib/haptics';
import { moderateScale as ms } from '../../lib/responsive';
import { useTheme } from '../../lib/theme';
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
  const { colors } = useTheme();

  if (electedParty === currentParty && !defectionEvent) return null;

  const fromParty = defectionEvent?.debitParty || electedParty;
  const toParty = defectionEvent?.creditParty || currentParty;
  const dateStr = defectionEvent?.date || t('timeline.unknown_date', 'Date Unknown');

  const openSource = (url: string) => {
    tapLight();
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}>
      <View style={styles.header}>
        <Ionicons name="warning" size={18} color="#D97706" />
        <Text style={[styles.title, { color: colors.text }]}>
          {t('legislator.party_switch_history', 'Party Switch History')}
        </Text>
      </View>

      {/* Visual Timeline Path */}
      <View style={styles.pathContainer}>
        <View style={[styles.partyDot, { backgroundColor: getPartyColor(fromParty) }]}>
          <Text style={styles.partyDotText}>{fromParty}</Text>
        </View>
        <View style={styles.connector}>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <View style={styles.dot}>
            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>{dateStr}</Text>
          </View>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
        </View>
        <View style={[styles.partyDot, { backgroundColor: getPartyColor(toParty) }]}>
          <Text style={styles.partyDotText}>{toParty}</Text>
        </View>
      </View>

      {/* Info Details */}
      <View style={[styles.infoGrid, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>🗳️ {t('defection.elected', 'Elected On')}:</Text>
          <Text style={[styles.infoValue, { color: getPartyColor(fromParty) }]}>
            {fromParty}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>🏛️ {t('defection.current', 'Current Party')}:</Text>
          <Text style={[styles.infoValue, { color: getPartyColor(toParty) }]}>
            {toParty}
          </Text>
        </View>
        {defectionEvent?.legalStatus && defectionEvent.legalStatus !== 'NOT_APPLICABLE' && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>⚖️ {t('timeline.legal_status', 'Legal Status')}:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{defectionEvent.legalStatus}</Text>
          </View>
        )}
      </View>

      {defectionEvent?.explanation && (
        <View style={[styles.explanationBox, { borderLeftColor: colors.gold }]}>
          <Text style={[styles.explanationText, { color: colors.text }]}>
            "{defectionEvent.explanation}"
          </Text>
          {defectionEvent.details ? (
            <Text style={[styles.detailsText, { color: colors.textSecondary }]}>{defectionEvent.details}</Text>
          ) : null}
        </View>
      )}

      {defectionEvent?.sources && defectionEvent.sources.length > 0 && (
        <View style={styles.sources}>
          <Text style={[styles.sourcesTitle, { color: colors.textMuted }]}>{t('timeline.sources', 'Sources')}:</Text>
          <View style={styles.sourcesList}>
            {defectionEvent.sources.slice(0, 2).map((src, i) => (
              <Pressable
                key={i}
                onPress={() => openSource(src)}
                style={[styles.sourceLink, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}
              >
                <Text style={[styles.sourceLinkText, { color: colors.primary }]} numberOfLines={1}>
                  {src}
                </Text>
                <Ionicons name="open-outline" size={10} color={colors.primary} />
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
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
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
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
    position: 'relative',
    alignItems: 'center',
  },
  dateLabel: {
    position: 'absolute',
    top: 12,
    fontSize: ms(9),
    fontWeight: '600',
    width: 80,
    textAlign: 'center',
  },
  infoGrid: {
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
    fontWeight: '600',
  },
  infoValue: {
    fontSize: ms(11),
    fontWeight: '700',
  },
  explanationBox: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    marginBottom: 12,
    gap: 4,
  },
  explanationText: {
    fontSize: ms(12),
    fontStyle: 'italic',
    lineHeight: 17,
  },
  detailsText: {
    fontSize: ms(11),
    lineHeight: 15,
  },
  sources: {
    gap: 6,
  },
  sourcesTitle: {
    fontSize: ms(10),
    fontWeight: '600',
  },
  sourcesList: {
    gap: 4,
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sourceLinkText: {
    fontSize: ms(9),
    flex: 1,
    marginRight: 6,
  },
});
