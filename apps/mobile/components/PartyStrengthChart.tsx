import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getPartyColor } from '@/lib/constants';
import { moderateScale as ms } from '@/lib/responsive';

interface Props {
  electionSeats: Record<string, number>;
  currentSeats: Record<string, number>;
  totalSeats: number;
  defectionsCount: number;
  byelectionsCount: number;
}

export default function PartyStrengthChart({
  electionSeats,
  currentSeats,
  totalSeats,
  defectionsCount,
  byelectionsCount,
}: Props) {
  const { t } = useTranslation();

  // Combine and unique all parties that have seats in either election or current day
  const parties = Array.from(
    new Set([...Object.keys(electionSeats), ...Object.keys(currentSeats)]),
  ).filter((p) => p !== 'VACANT' && p !== 'TOTAL');

  // Sort parties by current seats descending
  parties.sort((a, b) => (currentSeats[b] || 0) - (currentSeats[a] || 0));

  const maxSeats = Math.max(
    ...parties.map((p) => Math.max(electionSeats[p] || 0, currentSeats[p] || 0)),
    1,
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bar-chart" size={18} color="#4F8EF7" />
        <Text style={styles.title}>
          {t('intelligence.party_strength_title', 'Party Strength: Current vs Election Day')}
        </Text>
      </View>

      <View style={styles.chartContainer}>
        {parties.map((party) => {
          const cur = currentSeats[party] || 0;
          const el = electionSeats[party] || 0;
          const diff = cur - el;
          
          const barWidthPercent = (cur / maxSeats) * 100;
          const partyColor = getPartyColor(party);

          return (
            <View key={party} style={styles.row}>
              <View style={styles.partyLabelContainer}>
                <Text style={[styles.partyLabel, { color: partyColor }]}>{party}</Text>
              </View>

              <View style={styles.barContainer}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${barWidthPercent}%`,
                        backgroundColor: partyColor,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.seatsValueContainer}>
                <Text style={styles.seatsText}>{cur}</Text>
                {diff !== 0 && (
                  <Text
                    style={[
                      styles.diffText,
                      { color: diff > 0 ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {diff > 0 ? ` (+${diff})` : ` (${diff})`}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Summary Footer Stats */}
      <View style={styles.footer}>
        <View style={styles.stat}>
          <Ionicons name="swap-horizontal" size={14} color="#F59E0B" />
          <Text style={styles.statText}>
            {defectionsCount} {t('defection.tracker_label', 'defections this term')}
          </Text>
        </View>
        {byelectionsCount > 0 && (
          <View style={styles.stat}>
            <Ionicons name="add-circle" size={14} color="#10B981" />
            <Text style={styles.statText}>
              {byelectionsCount} {t('timeline.by_elections_held', 'by-elections held')}
            </Text>
          </View>
        )}
      </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: ms(13),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chartContainer: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partyLabelContainer: {
    width: 50,
  },
  partyLabel: {
    fontSize: ms(12),
    fontWeight: '800',
  },
  barContainer: {
    flex: 1,
    height: 12,
    justifyContent: 'center',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#1F2937',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  seatsValueContainer: {
    width: 65,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  seatsText: {
    fontSize: ms(12),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  diffText: {
    fontSize: ms(10),
    fontWeight: '600',
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: ms(11),
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
