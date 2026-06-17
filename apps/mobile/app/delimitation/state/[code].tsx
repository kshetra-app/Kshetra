import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { computeStateSeatAllocation, computeDistrictSeatDistribution } from '../../../lib/delimitation/seatCalculator';
import { quickDistrictAggregation } from '../../../lib/delimitation/populationAggregator';
import { analyzeStateReservation } from '../../../lib/delimitation/reservationAnalyzer';
import { formatPopulation } from '../../../lib/delimitationTypes';

export default function StateDelimitationDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code: string }>();
  const stateCode = (code ?? '').toUpperCase();

  const allocation = useMemo(() => computeStateSeatAllocation(stateCode), [stateCode]);
  const districtAgg = useMemo(() => quickDistrictAggregation(stateCode), [stateCode]);
  const reservation = useMemo(() => analyzeStateReservation(stateCode), [stateCode]);

  if (!allocation) {
    return (
      <View style={styles.safe}>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <Ionicons name="alert-circle" size={40} color="#EF4444" />
          <Text style={styles.errorText}>{t('constituency.notFound')}: {stateCode}</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const changeColor = allocation.seatChange > 0 ? '#10B981' : allocation.seatChange < 0 ? '#EF4444' : '#6B7280';

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{allocation.stateName}</Text>
          <Text style={styles.headerSubtitle}>{t('delimitation.title')}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]} showsVerticalScrollIndicator={false}>

        {/* Hero Stats */}
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroValue}>{allocation.currentSeats}</Text>
              <Text style={styles.heroLabel}>{t('delimitation.currentSeats')}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#6B7280" />
            <View style={styles.heroStat}>
              <Text style={[styles.heroValue, { color: changeColor }]}>{allocation.projectedSeats}</Text>
              <Text style={styles.heroLabel}>{t('delimitation.projectedSeats')}</Text>
            </View>
            <View style={[styles.changeBadge, { backgroundColor: changeColor + '20' }]}>
              <Text style={[styles.changeText, { color: changeColor }]}>
                {allocation.seatChange > 0 ? '+' : ''}{allocation.seatChange}
              </Text>
            </View>
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>
              Pop: {formatPopulation(allocation.totalPopulation)} · {formatPopulation(allocation.populationPerProjectedSeat)}/seat
            </Text>
            <Text style={styles.heroMetaText}>
              Deviation: {allocation.deviationPercent > 0 ? '+' : ''}{allocation.deviationPercent.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Reservation Breakdown */}
        {reservation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('delimitation.reservation')}</Text>
            <View style={styles.card}>
              <View style={styles.resRow}>
                <Text style={styles.resLabel}>{t('constituency.type')}</Text>
                <Text style={styles.resHeader}>{t('constituency.current')}</Text>
                <Text style={styles.resHeader}>{t('delimitation.projectedSeats')}</Text>
                <Text style={styles.resHeader}>{t('delimitation.seatChange')}</Text>
              </View>
              <View style={styles.resDivider} />

              {/* SC */}
              <View style={styles.resRow}>
                <View style={[styles.resDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.resCategory}>SC ({reservation.scPercent}%)</Text>
                <Text style={styles.resValue}>{reservation.current.scReserved}</Text>
                <Text style={styles.resValue}>{reservation.projected.scReserved}</Text>
                <Text style={[styles.resChange, { color: reservation.change.scChange >= 0 ? '#10B981' : '#EF4444' }]}>
                  {reservation.change.scChange > 0 ? '+' : ''}{reservation.change.scChange}
                </Text>
              </View>

              {/* ST */}
              <View style={styles.resRow}>
                <View style={[styles.resDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.resCategory}>ST ({reservation.stPercent}%)</Text>
                <Text style={styles.resValue}>{reservation.current.stReserved}</Text>
                <Text style={styles.resValue}>{reservation.projected.stReserved}</Text>
                <Text style={[styles.resChange, { color: reservation.change.stChange >= 0 ? '#10B981' : '#EF4444' }]}>
                  {reservation.change.stChange > 0 ? '+' : ''}{reservation.change.stChange}
                </Text>
              </View>

              {/* General */}
              <View style={styles.resRow}>
                <View style={[styles.resDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.resCategory}>{t('delimitation.general')}</Text>
                <Text style={styles.resValue}>{reservation.current.general}</Text>
                <Text style={styles.resValue}>{reservation.projected.general}</Text>
                <Text style={[styles.resChange, { color: reservation.change.generalChange >= 0 ? '#10B981' : '#EF4444' }]}>
                  {reservation.change.generalChange > 0 ? '+' : ''}{reservation.change.generalChange}
                </Text>
              </View>

              {/* Summary */}
              <View style={styles.resDivider} />
              <Text style={styles.resSummary}>{reservation.change.summary}</Text>
            </View>
          </View>
        )}

        {/* District Breakdown */}
        {districtAgg && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('constituency.district')}</Text>
            <Text style={styles.sectionSubtitle}>
              {districtAgg.districts.length} districts · {districtAgg.totalSeats} seats · Ideal: {formatPopulation(districtAgg.idealPopPerSeat)}/seat
            </Text>

            {districtAgg.districts
              .sort((a, b) => b.projectedSeats - a.projectedSeats)
              .map((d) => (
                <View key={d.districtName} style={styles.districtCard}>
                  <View style={styles.districtHeader}>
                    <Text style={styles.districtName}>{d.districtName}</Text>
                    <View style={styles.districtSeatBadge}>
                      <Text style={styles.districtSeatText}>{d.projectedSeats} seats</Text>
                    </View>
                  </View>
                  <View style={styles.districtStats}>
                    <View style={styles.districtStat}>
                      <Text style={styles.dStatValue}>{formatPopulation(d.population)}</Text>
                      <Text style={styles.dStatLabel}>Population</Text>
                    </View>
                    <View style={styles.districtStat}>
                      <Text style={styles.dStatValue}>{formatPopulation(d.populationPerSeat)}</Text>
                      <Text style={styles.dStatLabel}>Pop/Seat</Text>
                    </View>
                    <View style={styles.districtStat}>
                      <Text style={[styles.dStatValue, {
                        color: Math.abs(d.deviationPercent) <= 10 ? '#10B981' : '#EF4444'
                      }]}>
                        {d.deviationPercent > 0 ? '+' : ''}{d.deviationPercent}%
                      </Text>
                      <Text style={styles.dStatLabel}>Deviation</Text>
                    </View>
                  </View>
                  {/* SC/ST bar */}
                  <View style={styles.districtResBar}>
                    <View style={[styles.resSegment, { flex: d.scPercent, backgroundColor: '#F59E0B' }]} />
                    <View style={[styles.resSegment, { flex: d.stPercent, backgroundColor: '#10B981' }]} />
                    <View style={[styles.resSegment, { flex: 100 - d.scPercent - d.stPercent, backgroundColor: '#3B82F620' }]} />
                  </View>
                  <Text style={styles.districtResText}>SC {d.scPercent}% · ST {d.stPercent}% · Urban {d.urbanPercent}%</Text>
                </View>
              ))}
          </View>
        )}

        {/* Hotspots */}
        {reservation && reservation.hotspots.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('delimitation.reservation')}</Text>
            {reservation.hotspots.map((h, i) => (
              <View key={i} style={[styles.hotspotCard, {
                borderLeftColor: h.significance === 'critical' ? '#EF4444' : h.significance === 'high' ? '#F59E0B' : '#3B82F6'
              }]}>
                <View style={styles.hotspotHeader}>
                  <Ionicons
                    name={h.type === 'SC' ? 'people' : 'leaf'}
                    size={14}
                    color={h.type === 'SC' ? '#F59E0B' : '#10B981'}
                  />
                  <Text style={styles.hotspotType}>{h.type}</Text>
                  <Text style={styles.hotspotPct}>{h.percentage}%</Text>
                </View>
                <Text style={styles.hotspotDesc}>{h.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={14} color="#F59E0B" />
          <Text style={styles.disclaimerText}>
            {t('delimitation.disclaimer')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A1A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#EF4444', marginTop: 10, fontWeight: '700' },
  backButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#1F2937', borderRadius: 8 },
  backButtonText: { color: '#FFFFFF', fontWeight: '700' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Hero
  heroCard: { backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  heroStat: { alignItems: 'center' },
  heroValue: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
  heroLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginTop: 2 },
  changeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  changeText: { fontSize: 18, fontWeight: '900' },
  heroMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  heroMetaText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },

  // Section
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  sectionSubtitle: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 8 },

  // Reservation
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 12 },
  resRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 6 },
  resDot: { width: 8, height: 8, borderRadius: 4 },
  resLabel: { flex: 1, fontSize: 11, fontWeight: '700', color: '#6B7280' },
  resHeader: { flex: 1, fontSize: 10, fontWeight: '700', color: '#6B7280', textAlign: 'center' },
  resCategory: { flex: 1, fontSize: 13, fontWeight: '700', color: '#D1D5DB' },
  resValue: { flex: 1, fontSize: 13, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  resChange: { flex: 1, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  resDivider: { height: 1, backgroundColor: '#1F2937', marginVertical: 4 },
  resSummary: { fontSize: 12, color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' },

  // District
  districtCard: { backgroundColor: '#111827', borderRadius: 10, padding: 10, marginBottom: 6 },
  districtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  districtName: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  districtSeatBadge: { backgroundColor: '#4F8EF720', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  districtSeatText: { fontSize: 11, fontWeight: '800', color: '#4F8EF7' },
  districtStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  districtStat: { alignItems: 'center' },
  dStatValue: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  dStatLabel: { fontSize: 9, fontWeight: '600', color: '#6B7280', marginTop: 1 },
  districtResBar: { flexDirection: 'row', height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 8 },
  resSegment: { height: 4 },
  districtResText: { fontSize: 10, color: '#6B7280', marginTop: 4 },

  // Hotspot
  hotspotCard: {
    backgroundColor: '#111827', borderRadius: 8, padding: 10, marginBottom: 6,
    borderLeftWidth: 3,
  },
  hotspotHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hotspotType: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  hotspotPct: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  hotspotDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 4, lineHeight: 16 },

  // Disclaimer
  disclaimer: { flexDirection: 'row', backgroundColor: '#1F2937', borderRadius: 10, padding: 10, gap: 6, marginTop: 8 },
  disclaimerText: { flex: 1, fontSize: 11, color: '#F59E0B', lineHeight: 15 },
});
