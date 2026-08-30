import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BreakingNewsItem } from '../lib/journalistTypes';
import { BREAKING_PRIORITY_CONFIG } from '../lib/journalistTypes';
import { useTheme } from '../lib/theme';

interface BreakingNewsBannerProps {
  item: BreakingNewsItem;
  onPress?: () => void;
  onDismiss?: () => void;
}

export default function BreakingNewsBanner({ item, onPress, onDismiss }: BreakingNewsBannerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const config = BREAKING_PRIORITY_CONFIG[item.priority];

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Pressable style={[styles.banner, { backgroundColor: colors.surface, borderColor: config.color + '60' }]} onPress={onPress}>
      <View style={styles.header}>
        <Animated.View style={[styles.liveDot, { backgroundColor: config.color, opacity: pulseAnim }]} />
        <Text style={[styles.priority, { color: config.color }]}>{config.label}</Text>
        <Text style={[styles.time, { color: colors.textMuted }]}>{item.updateCount > 0 ? t('breakingNews.updates', { n: item.updateCount }) : t('breakingNews.justNow')}</Text>
        {onDismiss && (
          <Pressable onPress={onDismiss} hitSlop={8}>
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      <Text style={[styles.headline, { color: colors.text }]} numberOfLines={2}>{item.headline}</Text>
      <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>{item.summary}</Text>
      {item.updates.length > 0 && (
        <View style={[styles.latestUpdate, { borderTopColor: colors.border }]}>
          <Ionicons name="arrow-forward" size={12} color={config.color} />
          <Text style={[styles.updateText, { color: config.color }]} numberOfLines={1}>
            {item.updates[item.updates.length - 1].text}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 12, marginHorizontal: 16, marginVertical: 6, padding: 14, borderWidth: 1, borderLeftWidth: 3 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  priority: { fontSize: 11, fontWeight: '800', flex: 1 },
  time: { fontSize: 11 },
  headline: { fontSize: 16, fontWeight: '800', lineHeight: 22, marginBottom: 4 },
  summary: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  latestUpdate: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 6, borderTopWidth: 1 },
  updateText: { fontSize: 12, fontWeight: '600', flex: 1 },
});
