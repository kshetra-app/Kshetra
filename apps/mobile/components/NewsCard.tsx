import { memo } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { NewsItem } from '../lib/newsTypes';
import { formatRelativeTime } from '../lib/newsTypes';

interface NewsCardProps {
  item: NewsItem;
  bookmarked: boolean;
  onToggleBookmark: () => void;
}

function NewsCardBase({ item, bookmarked, onToggleBookmark }: NewsCardProps) {
  const router = useRouter();
  const accent = item.source.accent ?? '#4F8EF7';
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
    <Pressable style={styles.card} onPress={openInApp}>
      <View style={styles.body}>
        {/* Source citation row */}
        <View style={styles.sourceRow}>
          <View style={[styles.sourceDot, { backgroundColor: accent }]} />
          <Text style={styles.sourceName} numberOfLines={1}>
            {item.source.name}
          </Text>
          {item.source.verified && (
            <Ionicons name="checkmark-circle" size={12} color="#4F8EF7" />
          )}
          <Text style={styles.dotSep}>·</Text>
          <Text style={styles.time}>{formatRelativeTime(item.publishedAt)}</Text>
        </View>

        <Text style={styles.title} numberOfLines={3}>
          {item.title}
        </Text>
        {!!item.summary && (
          <Text style={styles.summary} numberOfLines={2}>
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
            <Text style={styles.readAtText}>{isVideo ? 'Watch' : 'Read'} · {item.source.domain}</Text>
          </View>
        </View>
      </View>

      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: accent + '25' }]}>
            <Ionicons name="newspaper-outline" size={22} color={accent} />
          </View>
        )}
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
    borderBottomColor: '#1F2937',
  },
  body: { flex: 1 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  sourceDot: { width: 6, height: 6, borderRadius: 3 },
  sourceName: { fontSize: 11, fontWeight: '800', color: '#D1D5DB', maxWidth: 140 },
  dotSep: { color: '#4B5563', fontSize: 11 },
  time: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  title: { fontSize: 14, fontWeight: '700', color: '#F9FAFB', lineHeight: 19 },
  summary: { fontSize: 12, color: '#9CA3AF', lineHeight: 16, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  langBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, borderWidth: 1 },
  langText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  readAt: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readAtText: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
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
});

export default memo(NewsCardBase);
