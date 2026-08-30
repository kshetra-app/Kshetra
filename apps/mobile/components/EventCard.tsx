import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PoliticalEvent } from '../lib/politicianPortalTypes';
import { EVENT_TYPE_CONFIG } from '../lib/politicianPortalTypes';

interface EventCardProps {
  event: PoliticalEvent;
  onPress?: () => void;
  onRSVP?: () => void;
}

export default function EventCard({ event, onPress, onRSVP }: EventCardProps) {
  const { t } = useTranslation();
  const typeConfig = EVENT_TYPE_CONFIG[event.type];
  const startDate = new Date(event.startTime);
  const isUpcoming = startDate.getTime() > Date.now();
  const isLive = event.status === 'live';

  const formatDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Date strip */}
      <View style={[styles.dateStrip, { backgroundColor: typeConfig.color + '20' }]}>
        <Text style={[styles.dateDay, { color: typeConfig.color }]}>{startDate.getDate()}</Text>
        <Text style={[styles.dateMonth, { color: typeConfig.color }]}>{startDate.toLocaleDateString('en', { month: 'short' }).toUpperCase()}</Text>
      </View>

      <View style={styles.content}>
        {/* Type + Status */}
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.color + '15' }]}>
            <Ionicons name={typeConfig.icon as any} size={12} color={typeConfig.color} />
            <Text style={[styles.typeLabel, { color: typeConfig.color }]}>{typeConfig.label}</Text>
          </View>
          {isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>{t('politicianPortal.live')}</Text>
            </View>
          )}
          {event.status === 'cancelled' && (
            <View style={[styles.typeBadge, { backgroundColor: '#EF444420' }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>{t('politicianPortal.cancelled')}</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

        {/* Politician */}
        <View style={styles.politicianRow}>
          <Ionicons name="person" size={12} color="#6B7280" />
          <Text style={styles.politicianName}>{event.politicianName}</Text>
          {event.party && <Text style={styles.partyLabel}>({event.party})</Text>}
        </View>

        {/* Details */}
        <View style={styles.detailsRow}>
          <View style={styles.detail}>
            <Ionicons name="time" size={12} color="#6B7280" />
            <Text style={styles.detailText}>{formatTime(startDate)}</Text>
          </View>
          <View style={styles.detail}>
            <Ionicons name="location" size={12} color="#6B7280" />
            <Text style={styles.detailText} numberOfLines={1}>{event.venue}</Text>
          </View>
        </View>

        {/* RSVP + Attendance */}
        <View style={styles.footer}>
          <View style={styles.rsvpInfo}>
            <Ionicons name="people" size={14} color="#3B82F6" />
            <Text style={styles.rsvpCount}>{event.rsvpCount} {t('politicianPortal.going')}</Text>
            {event.actualAttendance && <Text style={styles.attended}> · {event.actualAttendance} {t('politicianPortal.attended')}</Text>}
          </View>
          {isUpcoming && onRSVP && (
            <Pressable style={styles.rsvpButton} onPress={onRSVP}>
              <Text style={styles.rsvpButtonText}>RSVP</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 16, marginVertical: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#E8DED1' },
  dateStrip: { width: 56, justifyContent: 'center', alignItems: 'center', paddingVertical: 12 },
  dateDay: { fontSize: 22, fontWeight: '900' },
  dateMonth: { fontSize: 11, fontWeight: '800' },
  content: { flex: 1, padding: 12 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  typeLabel: { fontSize: 10, fontWeight: '700' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF444420', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  liveText: { fontSize: 10, fontWeight: '800', color: '#EF4444' },
  title: { fontSize: 15, fontWeight: '700', color: '#241814', lineHeight: 20, marginBottom: 4 },
  politicianRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  politicianName: { fontSize: 12, fontWeight: '600', color: '#6D5549' },
  partyLabel: { fontSize: 11, color: '#988275' },
  detailsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 11, color: '#988275', maxWidth: 120 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rsvpInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rsvpCount: { fontSize: 12, fontWeight: '600', color: '#3B82F6' },
  attended: { fontSize: 11, color: '#988275' },
  rsvpButton: { backgroundColor: '#3B82F6', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  rsvpButtonText: { fontSize: 12, fontWeight: '800', color: '#241814' },
});
