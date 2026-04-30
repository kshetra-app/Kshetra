import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TriviaItem } from '@/lib/data';

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
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = items[index % items.length];

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (rotateInterval > 0 && items.length > 1) {
      timerRef.current = setInterval(next, rotateInterval);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [next, rotateInterval, items.length]);

  // Resolve translated text — falls back to raw seed text if no i18n key exists
  const headline = t(`trivia.${current?.id}.headline`, { defaultValue: current?.headline ?? '' });
  const body = t(`trivia.${current?.id}.body`, { defaultValue: current?.body ?? '' });

  if (!current || items.length === 0) return null;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Pressable onPress={() => setExpanded((e) => !e)}>
          <View style={styles.compactHeader}>
            <Text style={styles.compactEmoji}>{current.emoji}</Text>
            <Text style={styles.compactLabel}>{t('map.didYouKnow')}</Text>
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-up'}
              size={14}
              color="#6B7280"
            />
            {items.length > 1 && (
              <Text style={styles.compactCounter}>
                {(index % items.length) + 1}/{items.length}
              </Text>
            )}
          </View>
          <Text style={styles.compactHeadline}>{headline}</Text>
        </Pressable>
        {expanded ? (
          <View>
            <Text style={styles.compactBodyFull}>{body}</Text>
            <Text style={styles.compactSource}>{current.source}</Text>
            {items.length > 1 && (
              <Pressable style={styles.compactNextButton} onPress={next}>
                <Ionicons name="shuffle" size={14} color="#9CA3AF" />
                <Text style={styles.compactNextText}>{t('common.next')}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable onPress={() => setExpanded(true)}>
            <Text style={styles.compactBody} numberOfLines={2}>
              {body}
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.emoji}>{current.emoji}</Text>
          <View>
            <Text style={styles.label}>{t('map.didYouKnow')}</Text>
            <Text style={styles.categoryBadge}>
              {current.category.replace('_', ' ')}
            </Text>
          </View>
        </View>
        {items.length > 1 && (
          <Pressable style={styles.nextButton} onPress={next} hitSlop={8}>
            <Ionicons name="shuffle" size={16} color="#9CA3AF" />
            <Text style={styles.counterText}>
              {(index % items.length) + 1}/{items.length}
            </Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.body}>{body}</Text>
      <Text style={styles.source}>{current.source}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ─── Full card ───
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
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
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  categoryBadge: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  counterText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  headline: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 20,
    marginBottom: 8,
  },
  source: {
    fontSize: 10,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  // ─── Compact (bottom sheet / overlay) ───
  compactContainer: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#F59E0B',
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
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  compactCounter: {
    fontSize: 10,
    color: '#6B7280',
  },
  compactHeadline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  compactBody: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  compactBodyFull: {
    fontSize: 12,
    color: '#D1D5DB',
    lineHeight: 18,
    marginTop: 4,
  },
  compactSource: {
    fontSize: 10,
    color: '#4B5563',
    fontStyle: 'italic' as const,
    marginTop: 6,
  },
  compactNextButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'flex-end' as const,
    gap: 4,
    marginTop: 8,
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  compactNextText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600' as const,
  },
});
