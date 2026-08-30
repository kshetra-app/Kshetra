import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { NewsItem } from '../lib/newsTypes';
import { formatRelativeTime } from '../lib/newsTypes';
import { useTheme } from '../lib/theme';

interface NewsCardProps {
  item: NewsItem;
  bookmarked: boolean;
  onToggleBookmark: () => void;
}

function NewsCardBase({ item, bookmarked, onToggleBookmark }: NewsCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const accent = item.source.accent ?? colors.primary;
  const isVideo = !!item.video;

  // Everything opens inside the app via the in-app reader (WebView / official embed).
  const openInApp = () =>
    router.push({
      pathname: '/reader',
      params: {
        url: item.sourceUrl,
        title: item.title,
        source: item.source.name,
        ...(item.video?.provider === 'youtube' ? { videoId: item.video.embedId, provider: 'youtube' } : {}),
      },
    } as any);

  return (
    <Pressable style={[styles.card, { borderBottomColor: colors.border }]} onPress={openInApp}>
      <View style={styles.body}>
        {/* Source citation row */}
        <View style={styles.sourceRow}>
          <View style={[styles.sourceDot, { backgroundColor: accent }]} />
          <Text style={[styles.sourceName, { color: colors.text }]} numberOfLines={1}>
            {item.source.name}
          </Text>
          {item.source.verified && (
            <Ionicons name="checkmark-circle" size={12} color={colors.gold} />
          )}
          <Text style={[styles.dotSep, { color: colors.textMuted }]}>·</Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>{formatRelativeTime(item.publishedAt)}</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
          {item.title}
        </Text>
        {!!item.summary && (
          <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.summary}
          </Text>
        )}

        {/* Meta / actions */}
        <View style={styles.metaRow}>
          <View style={[styles.langBadge, { borderColor: accent + '50' }]}>
            <Text style={[styles.langText, { color: accent }]}>
              {item.language.toUpperCase()}
            </Text>
          </View>
          <View style={styles.readAt}>
            <Ionicons name={isVideo ? 'play-circle-outline' : 'book-outline'} size={11} color="#6B7280" />
            <Text style={styles.readAtText}>{isVideo ? t('journalist.watch') : t('journalist.read')} · {item.source.domain}</Text>
          </View>
        </View>
      </View>

      {/* Thumbnail — only rendered when the story actually has a related
          image. No dummy/placeholder graphic is shown otherwise; the bookmark
          control is still made available in a compact right-aligned slot. */}
      {item.imageUrl ? (
        <View style={styles.thumbWrap}>
          <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
          {isVideo && (
            <View style={styles.playOverlay}>
              <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 1 }} />
            </View>
          )}
          <Pressable
            hitSlop={8}
            style={styles.bookmarkBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleBookmark();
            }}
          >
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={15}
              color={bookmarked ? '#F59E0B' : '#FFFFFF'}
            />
          </Pressable>
        </View>
      ) : (
        <Pressable
          hitSlop={8}
          style={styles.bookmarkOnly}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleBookmark();
          }}
        >
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={bookmarked ? '#F59E0B' : '#6B7280'}
          />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8DED1',
  },
  body: { flex: 1 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  sourceDot: { width: 6, height: 6, borderRadius: 3 },
  sourceName: { fontSize: 11, fontWeight: '800', color: '#6D5549', maxWidth: 140 },
  dotSep: { color: '#4B5563', fontSize: 11 },
  time: { fontSize: 11, color: '#988275', fontWeight: '600' },
  title: { fontSize: 14, fontWeight: '700', color: '#241814', lineHeight: 19 },
  summary: { fontSize: 12, color: '#6D5549', lineHeight: 16, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  langBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, borderWidth: 1 },
  langText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  readAt: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readAtText: { fontSize: 10, color: '#988275', fontWeight: '600' },
  thumbWrap: { width: 96, height: 96, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumb: { width: 96, height: 96, borderRadius: 12 },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  playOverlay: {
    position: 'absolute', top: '50%', left: '50%',
    marginLeft: -16, marginTop: -16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  bookmarkBtn: {
    position: 'absolute', top: 4, right: 4,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  bookmarkOnly: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'flex-start',
  },
});

export default memo(NewsCardBase);
