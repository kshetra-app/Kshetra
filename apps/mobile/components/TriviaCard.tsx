import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TriviaItem } from '../lib/data';
import { useTriviaHistoryStore } from '../stores/triviaHistory';
import { useTheme } from '../lib/theme';

interface TriviaCardProps {
  /** Specific trivia items to cycle through */
  items: TriviaItem[];
  /** Compact mode for bottom sheet / map overlay */
  compact?: boolean;
  /** Auto-rotate interval in ms (0 = no auto-rotate) */
  rotateInterval?: number;
}

export default function TriviaCard({
  items,
  compact = false,
  rotateInterval = 8000,
}: TriviaCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = items[index % items.length];

  const markSeen = useTriviaHistoryStore((s) => s.markSeen);

  const next = useCallback(() => {
    setIndex((i) => {
      const nextIdx = (i + 1) % items.length;
      if (items[nextIdx]?.id) {
        markSeen(items[nextIdx].id);
      }
      return nextIdx;
    });
  }, [items, markSeen]);

  useEffect(() => {
    if (rotateInterval > 0 && items.length > 1) {
      timerRef.current = setInterval(next, rotateInterval);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [next, rotateInterval, items.length]);

  // Mark the FIRST item as seen on mount:
  useEffect(() => {
    if (items[0]?.id) {
      markSeen(items[0].id);
    }
  }, [items[0]?.id, markSeen]);

  // Resolve translated text — falls back to raw seed text if no i18n key exists
  const headline = t(`trivia.${current?.id}.headline`, { defaultValue: current?.headline ?? '' });
  const body = t(`trivia.${current?.id}.body`, { defaultValue: current?.body ?? '' });

  if (!current || items.length === 0) return null;

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}>
        <Pressable onPress={() => setExpanded((e) => !e)}>
          <View style={styles.compactHeader}>
            <Text style={styles.compactEmoji}>{current.emoji}</Text>
            <Text style={[styles.compactLabel, { color: colors.gold }]}>{t('map.didYouKnow')}</Text>
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-up'}
              size={14}
              color={colors.textMuted}
            />
            {items.length > 1 && (
              <Text style={[styles.compactCounter, { color: colors.textMuted }]}>
                {(index % items.length) + 1}/{items.length}
              </Text>
            )}
          </View>
          <Text style={[styles.compactHeadline, { color: colors.text }]}>{headline}</Text>
        </Pressable>
        {expanded ? (
          <View>
            <Text style={[styles.compactBodyFull, { color: colors.textSecondary }]}>{body}</Text>
            <Text style={[styles.compactSource, { color: colors.textMuted }]}>{current.source}</Text>
            {items.length > 1 && (
              <Pressable style={[styles.compactNextButton, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]} onPress={next}>
                <Ionicons name="shuffle" size={14} color={colors.primary} />
                <Text style={[styles.compactNextText, { color: colors.primary }]}>{t('common.next')}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable onPress={() => setExpanded(true)}>
            <Text style={[styles.compactBody, { color: colors.textSecondary }]} numberOfLines={2}>
              {body}
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border, borderLeftColor: colors.gold }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.emoji}>{current.emoji}</Text>
          <View>
            <Text style={[styles.label, { color: colors.gold }]}>{t('map.didYouKnow')}</Text>
            <Text style={[styles.categoryBadge, { color: colors.textMuted }]}>
              {current.category.replace('_', ' ')}
            </Text>
          </View>
        </View>
        {items.length > 1 && (
          <Pressable style={[styles.nextButton, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]} onPress={next} hitSlop={8}>
            <Ionicons name="shuffle" size={16} color={colors.primary} />
            <Text style={[styles.counterText, { color: colors.primary }]}>
              {(index % items.length) + 1}/{items.length}
            </Text>
          </Pressable>
        )}
      </View>
      <Text style={[styles.headline, { color: colors.text }]}>{headline}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
      <Text style={[styles.source, { color: colors.textMuted }]}>{current.source}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ─── Full card ───
  container: {
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  emoji: {
    fontSize: 28,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  categoryBadge: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  counterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  headline: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  source: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  // ─── Compact (bottom sheet / overlay) ───
  compactContainer: {
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderWidth: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  compactEmoji: {
    fontSize: 16,
  },
  compactLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  compactCounter: {
    fontSize: 10,
  },
  compactHeadline: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  compactBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  compactBodyFull: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  compactSource: {
    fontSize: 10,
    fontStyle: 'italic' as const,
    marginTop: 6,
  },
  compactNextButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-end' as const,
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  compactNextText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
});
