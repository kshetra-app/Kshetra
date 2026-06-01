import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getPartyColor } from '@/lib/constants';
import { tapLight } from '@/lib/haptics';
import { moderateScale as ms } from '@/lib/responsive';
import type { PoliticalLedgerEntry } from '../../../data/seed/telangana-political-timeline';

interface Props {
  event: PoliticalLedgerEntry;
}

export default function PoliticalTimelineCard({ event }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const getEventConfig = (type: string) => {
    switch (type) {
      case 'DEFECTION':
        return { color: '#F59E0B', icon: 'swap-horizontal' as const, label: t('defection.title', 'DEFECTION') };
      case 'GENERAL_ELECTION':
        return { color: '#4F8EF7', icon: 'checkbox' as const, label: t('timeline.general_election', 'ELECTION') };
      case 'BY_ELECTION':
        return { color: '#10B981', icon: 'add-circle' as const, label: t('timeline.by_election', 'BY-ELECTION') };
      case 'DEATH_IN_OFFICE':
        return { color: '#6B7280', icon: 'remove-circle' as const, label: t('timeline.death', 'VACANCY (DEATH)') };
      case 'RESIGNATION':
        return { color: '#6B7280', icon: 'remove-circle' as const, label: t('timeline.resignation', 'VACANCY (RESIGNATION)') };
      case 'DISQUALIFICATION':
        return { color: '#EF4444', icon: 'close-circle' as const, label: t('timeline.disqualification', 'DISQUALIFICATION') };
      case 'PARTY_MERGER':
      case 'MERGER':
        return { color: '#8B5CF6', icon: 'git-merge' as const, label: t('timeline.merger', 'MERGER') };
      default:
        return { color: '#8B5CF6', icon: 'git-branch' as const, label: t('timeline.other', 'EVENT') };
    }
  };

  const config = getEventConfig(event.eventType);

  const handlePress = () => {
    tapLight();
    setExpanded(!expanded);
  };

  const openSource = (url: string) => {
    tapLight();
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Pressable
      style={[styles.container, { borderLeftColor: config.color }]}
      onPress={handlePress}
    >
      <View style={styles.header}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
          <Text style={styles.dateText}>{event.date}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: config.color + '15' }]}>
          <Ionicons name={config.icon} size={10} color={config.color} />
          <Text style={[styles.badgeText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>

      <Text style={styles.explanation}>{event.explanation}</Text>

      {event.memberNames && event.memberNames.length > 0 && (
        <Text style={styles.members}>
          👤 {event.memberNames.join(', ')}
        </Text>
      )}

      {/* Party transfer visualization for defection / mergers */}
      {(event.debitParty || event.creditParty) && (
        <View style={styles.flow}>
          {event.debitParty && (
            <View style={[styles.partyBox, { borderColor: getPartyColor(event.debitParty) }]}>
              <Text style={[styles.partyText, { color: getPartyColor(event.debitParty) }]}>
                {event.debitParty}
              </Text>
            </View>
          )}
          <Ionicons name="arrow-forward" size={16} color="#6B7280" style={styles.arrow} />
          {event.creditParty && (
            <View style={[styles.partyBox, { borderColor: getPartyColor(event.creditParty) }]}>
              <Text style={[styles.partyText, { color: getPartyColor(event.creditParty) }]}>
                {event.creditParty}
              </Text>
            </View>
          )}
        </View>
      )}

      {expanded && (
        <View style={styles.detailsContainer}>
          {event.details && event.details.trim().length > 0 ? (
            <Text style={styles.detailsText}>{event.details}</Text>
          ) : null}

          {event.legalStatus && event.legalStatus !== 'NOT_APPLICABLE' && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>⚖️ {t('timeline.legal_status', 'Anti-Defection Proceeding')}:</Text>
              <Text style={styles.detailValue}>{event.legalStatus}</Text>
            </View>
          )}

          {event.sources && event.sources.length > 0 && (
            <View style={styles.sourcesContainer}>
              <Text style={styles.detailLabel}>📎 {t('timeline.sources', 'Sources')}:</Text>
              {event.sources.map((src, i) => (
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
          )}
        </View>
      )}

      <View style={styles.expandRow}>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color="#9CA3AF"
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: ms(11),
    color: '#9CA3AF',
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: ms(9),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  explanation: {
    fontSize: ms(13),
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 6,
  },
  members: {
    fontSize: ms(11),
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 8,
  },
  flow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  partyBox: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 54,
    alignItems: 'center',
  },
  partyText: {
    fontSize: ms(11),
    fontWeight: '800',
  },
  arrow: {
    alignSelf: 'center',
  },
  detailsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    gap: 8,
  },
  detailsText: {
    fontSize: ms(12),
    color: '#D1D5DB',
    lineHeight: 17,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: ms(11),
    color: '#6B7280',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: ms(11),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sourcesContainer: {
    gap: 4,
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0A1A',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  sourceLinkText: {
    fontSize: ms(10),
    color: '#4F8EF7',
    flex: 1,
    marginRight: 6,
  },
  expandRow: {
    alignItems: 'center',
    marginTop: 4,
  },
});
