import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DelimitationEvent } from '../lib/delimitationTypes';
import { EVENT_TYPE_CONFIG, IMPACT_SEVERITY_CONFIG } from '../lib/delimitationTypes';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isPastEvent(dateStr: string): boolean {
  return new Date(dateStr).getTime() <= Date.now();
}

interface DelimitationTimelineProps {
  events: DelimitationEvent[];
  maxItems?: number;
  compact?: boolean;
  onEventPress?: (event: DelimitationEvent) => void;
}

export default function DelimitationTimeline({
  events,
  maxItems,
  compact = false,
  onEventPress,
}: DelimitationTimelineProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const displayed = maxItems ? sorted.slice(-maxItems) : sorted;

  if (compact) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compactRow}>
        {displayed.map((event, idx) => {
          const config = EVENT_TYPE_CONFIG[event.eventType];
          const past = isPastEvent(event.date);
          return (
            <Pressable
              key={event.id}
              style={[styles.compactCard, !past && styles.compactFuture]}
              onPress={() => onEventPress?.(event)}
            >
              <Ionicons
                name={config.icon as any}
                size={16}
                color={past ? config.color : '#6B7280'}
              />
              <Text style={[styles.compactDate, !past && styles.compactDateFuture]}>
                {formatDate(event.date)}
              </Text>
              <Text style={styles.compactTitle} numberOfLines={2}>
                {event.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {displayed.map((event, idx) => {
        const config = EVENT_TYPE_CONFIG[event.eventType];
        const sevConfig = IMPACT_SEVERITY_CONFIG[event.significance];
        const past = isPastEvent(event.date);
        const isLast = idx === displayed.length - 1;

        return (
          <Pressable
            key={event.id}
            style={styles.eventRow}
            onPress={() => onEventPress?.(event)}
          >
            {/* Timeline rail */}
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: past ? config.color : '#374151' },
                  event.significance === 'critical' && styles.dotLarge,
                ]}
              />
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: past ? '#374151' : '#1F2937' },
                  ]}
                />
              )}
            </View>

            {/* Content */}
            <View style={[styles.content, !past && styles.futureContent]}>
              <View style={styles.headerRow}>
                <Ionicons
                  name={config.icon as any}
                  size={14}
                  color={past ? config.color : '#6B7280'}
                />
                <Text style={[styles.date, !past && styles.futureText]}>
                  {formatDate(event.date)}
                </Text>
                {!past && (
                  <View style={styles.upcomingBadge}>
                    <Text style={styles.upcomingText}>Upcoming</Text>
                  </View>
                )}
                {event.isVerified && (
                  <Ionicons
                    name="checkmark-circle"
                    size={12}
                    color="#10B981"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>

              <Text style={[styles.title, !past && styles.futureText]}>
                {event.title}
              </Text>

              <Text style={styles.description} numberOfLines={3}>
                {event.description}
              </Text>

              <View style={styles.footerRow}>
                {event.stateCode && (
                  <View style={styles.stateBadge}>
                    <Text style={styles.stateText}>{event.stateCode}</Text>
                  </View>
                )}
                <View style={[styles.severityBadge, { backgroundColor: sevConfig.color + '20' }]}>
                  <Text style={[styles.severityText, { color: sevConfig.color }]}>
                    {sevConfig.label}
                  </Text>
                </View>
                <Text style={styles.sourceLabel}>
                  {config.label}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: 4,
  },
  eventRow: {
    flexDirection: 'row',
    minHeight: 80,
  },
  rail: {
    width: 28,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  dotLarge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  content: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  futureContent: {
    backgroundColor: '#0D1117',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderStyle: 'dashed',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  date: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  futureText: {
    color: '#6B7280',
  },
  upcomingBadge: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  upcomingText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stateBadge: {
    backgroundColor: '#4F8EF720',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stateText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F8EF7',
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sourceLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 'auto',
  },
  // ─── Compact mode ───
  compactRow: {
    paddingVertical: 8,
  },
  compactCard: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 10,
    marginRight: 8,
    width: 140,
    alignItems: 'center',
  },
  compactFuture: {
    borderWidth: 1,
    borderColor: '#1F2937',
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  compactDate: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 4,
  },
  compactDateFuture: {
    color: '#6B7280',
  },
  compactTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },
});
