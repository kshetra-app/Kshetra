import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import type { DelimitationEvent } from '../lib/delimitationTypes';
import { EVENT_TYPE_CONFIG, IMPACT_SEVERITY_CONFIG } from '../lib/delimitationTypes';
import { useTheme } from '../lib/theme';

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
  const { t } = useTranslation();
  const { colors } = useTheme();
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
              style={[
                styles.compactCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                !past && [styles.compactFuture, { backgroundColor: colors.surfaceElevated, borderColor: colors.goldBorder || colors.border }],
              ]}
              onPress={() => onEventPress?.(event)}
            >
              <Ionicons
                name={config.icon as any}
                size={16}
                color={past ? config.color : colors.textMuted}
              />
              <Text style={[styles.compactDate, { color: colors.primary }, !past && { color: colors.textSecondary }]}>
                {formatDate(event.date)}
              </Text>
              <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={2}>
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
                  { backgroundColor: past ? config.color : colors.primaryLight, borderColor: colors.primary, borderWidth: 1.5 },
                  event.significance === 'critical' && styles.dotLarge,
                ]}
              />
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: colors.border },
                  ]}
                />
              )}
            </View>

            {/* Content */}
            <View
              style={[
                styles.content,
                { backgroundColor: colors.surface, borderColor: colors.border },
                !past && [styles.futureContent, { backgroundColor: colors.surfaceElevated, borderColor: colors.goldBorder || colors.border }],
              ]}
            >
              <View style={styles.headerRow}>
                <Ionicons
                  name={config.icon as any}
                  size={14}
                  color={past ? config.color : colors.textMuted}
                />
                <Text style={[styles.date, { color: colors.primary }, !past && { color: colors.textSecondary }]}>
                  {formatDate(event.date)}
                </Text>
                {!past && (
                  <View style={styles.upcomingBadge}>
                    <Text style={styles.upcomingText}>{t('delimitationExtended.upcoming')}</Text>
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

              <Text style={[styles.title, { color: colors.text }]}>
                {event.title}
              </Text>

              <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
                {event.description}
              </Text>

              <View style={styles.footerRow}>
                {event.stateCode && (
                  <View style={[styles.stateBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.stateText, { color: colors.primary }]}>{event.stateCode}</Text>
                  </View>
                )}
                <View style={[styles.severityBadge, { backgroundColor: sevConfig.color + '20' }]}>
                  <Text style={[styles.severityText, { color: sevConfig.color }]}>
                    {sevConfig.label}
                  </Text>
                </View>
                <Text style={[styles.sourceLabel, { color: colors.textMuted }]}>
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
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  content: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    marginLeft: 4,
    borderWidth: 1,
  },
  futureContent: {
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
    lineHeight: 18,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stateText: {
    fontSize: 10,
    fontWeight: '800',
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
    marginLeft: 'auto',
  },
  // ─── Compact mode ───
  compactRow: {
    paddingVertical: 8,
  },
  compactCard: {
    borderRadius: 10,
    padding: 10,
    marginRight: 8,
    minWidth: 120,
    maxWidth: 160,
    alignItems: 'center',
    borderWidth: 1,
  },
  compactFuture: {
    borderStyle: 'dashed',
    opacity: 0.9,
  },
  compactDate: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  compactTitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },
});
