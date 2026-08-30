import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { SeatAllocation } from '../lib/delimitationTypes';
import { formatPopulation } from '../lib/delimitationTypes';
import { useTheme } from '../lib/theme';

interface SeatProjectionCardProps {
  allocation: SeatAllocation;
  compact?: boolean;
  onPress?: (stateCode: string) => void;
}

export default function SeatProjectionCard({ allocation, compact = false, onPress }: SeatProjectionCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const isGainer = allocation.seatChange > 0;
  const isLoser = allocation.seatChange < 0;
  const changeColor = isGainer ? '#10B981' : isLoser ? '#EF4444' : colors.textMuted;
  const changeIcon = isGainer ? 'arrow-up' : isLoser ? 'arrow-down' : 'remove';
  const changeText = isGainer ? `+${allocation.seatChange}` : `${allocation.seatChange}`;

  if (compact) {
    return (
      <Pressable
        onPress={onPress ? () => onPress(allocation.stateCode) : undefined}
        disabled={!onPress}
        style={[styles.compactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.compactLeft}>
          <Text style={[styles.compactState, { color: colors.primary }]}>{allocation.stateCode}</Text>
          <Text style={[styles.compactName, { color: colors.text }]}>{allocation.stateName}</Text>
        </View>
        <View style={styles.compactSeats}>
          <Text style={[styles.compactCurrent, { color: colors.textSecondary }]}>{allocation.currentSeats}</Text>
          <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
          <Text style={[styles.compactProjected, { color: changeColor }]}>
            {allocation.projectedSeats}
          </Text>
        </View>
        <View style={[styles.changeBadge, { backgroundColor: changeColor + '20' }]}>
          <Ionicons name={changeIcon as any} size={10} color={changeColor} />
          <Text style={[styles.changeText, { color: changeColor }]}>{changeText}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress ? () => onPress(allocation.stateCode) : undefined}
      disabled={!onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadowColor }]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.stateName, { color: colors.text }]}>{allocation.stateName}</Text>
          <Text style={[styles.stateCode, { color: colors.primary }]}>{allocation.stateCode}</Text>
        </View>
        <View style={[styles.changeBadgeLarge, { backgroundColor: changeColor + '20' }]}>
          <Ionicons name={changeIcon as any} size={14} color={changeColor} />
          <Text style={[styles.changeTextLarge, { color: changeColor }]}>{changeText}</Text>
        </View>
      </View>

      {/* Seat comparison */}
      <View style={styles.seatRow}>
        <View style={styles.seatBlock}>
          <Text style={[styles.seatLabel, { color: colors.textMuted }]}>{t('delimitation.currentSeats')}</Text>
          <Text style={[styles.seatValue, { color: colors.text }]}>{allocation.currentSeats}</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={colors.goldBorder || colors.border} />
        <View style={styles.seatBlock}>
          <Text style={[styles.seatLabel, { color: colors.textMuted }]}>{t('delimitation.projectedSeats')}</Text>
          <Text style={[styles.seatValue, { color: changeColor }]}>
            {allocation.projectedSeats}
          </Text>
        </View>
      </View>

      {/* Reservation breakdown */}
      <View style={[styles.reservationRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        <View style={styles.resBlock}>
          <View style={[styles.resDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={[styles.resLabel, { color: colors.textSecondary }]}>{t('delimitation.general')} {allocation.general}</Text>
        </View>
        <View style={styles.resBlock}>
          <View style={[styles.resDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.resLabel, { color: colors.textSecondary }]}>{t('delimitation.sc')} {allocation.reservedSC}</Text>
        </View>
        <View style={styles.resBlock}>
          <View style={[styles.resDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.resLabel, { color: colors.textSecondary }]}>{t('delimitation.st')} {allocation.reservedST}</Text>
        </View>
      </View>

      {/* Population stats */}
      <View style={styles.statsRow}>
        <Text style={[styles.statText, { color: colors.textMuted }]}>
          Pop: {formatPopulation(allocation.totalPopulation)}
        </Text>
        <Text style={[styles.statText, { color: colors.textMuted }]}>
          Pop/Seat: {formatPopulation(allocation.populationPerProjectedSeat)}
        </Text>
        <Text style={[styles.statText, { color: Math.abs(allocation.deviationPercent) > 10 ? colors.danger : colors.textMuted }]}>
          Dev: {allocation.deviationPercent > 0 ? '+' : ''}{allocation.deviationPercent.toFixed(1)}%
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stateName: {
    fontSize: 16,
    fontWeight: '800',
  },
  stateCode: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  changeBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  changeTextLarge: {
    fontSize: 16,
    fontWeight: '900',
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 12,
  },
  seatBlock: {
    alignItems: 'center',
  },
  seatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  seatValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  reservationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  resBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // ─── Compact mode ───
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
  },
  compactLeft: {
    flex: 1,
  },
  compactState: {
    fontSize: 10,
    fontWeight: '800',
  },
  compactName: {
    fontSize: 13,
    fontWeight: '700',
  },
  compactSeats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 10,
  },
  compactCurrent: {
    fontSize: 14,
    fontWeight: '700',
  },
  compactProjected: {
    fontSize: 14,
    fontWeight: '900',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
    minWidth: 44,
    justifyContent: 'center',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
