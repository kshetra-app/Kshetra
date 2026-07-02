import { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Share,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * In-app reader. Everything stays inside the app — articles load in a WebView
 * and videos play via the publisher's official embed (YouTube iframe). We never
 * open an external browser.
 */
export default function ReaderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    url?: string;
    title?: string;
    source?: string;
    videoId?: string;
    provider?: string;
  }>();

  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const isVideo = !!params.videoId;
  const uri = params.url ?? 'about:blank';

  // For video we use the YouTube IFrame Player API via HTML with a neutral
  // baseUrl (same proven approach as ShortsPlayerModal) to avoid embed Error 152.
  const playerHtml = useMemo(() => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;overflow:hidden}html,body{width:100%;height:100%;background:#000}#player{position:absolute;top:0;left:0;width:100%;height:100%}</style>
</head><body>
<div id="player"></div>
<script>
var tag=document.createElement('script');
tag.src="https://www.youtube.com/iframe_api";
document.head.appendChild(tag);
var player;
function onYouTubeIframeAPIReady(){
  player=new YT.Player('player',{
    width:'100%',height:'100%',
    videoId:'${params.videoId ?? ''}',
    playerVars:{playsinline:1,autoplay:1,controls:1,rel:0,modestbranding:1,iv_load_policy:3}
  });
}
</script>
</body></html>`, [params.videoId]);

  const shareLink = () => {
    const link = isVideo ? `https://www.youtube.com/watch?v=${params.videoId}` : params.url;
    if (link) Share.share({ message: link }).catch(() => {});
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable hitSlop={10} style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {params.title ?? (isVideo ? 'Video' : 'Article')}
          </Text>
          {!!params.source && (
            <Text style={styles.headerSource} numberOfLines={1}>
              {params.source}
            </Text>
          )}
        </View>
        <Pressable hitSlop={10} style={styles.iconBtn} onPress={shareLink}>
          <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Thin progress bar for article loads */}
      {!isVideo && loading && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(8, progress * 100)}%` }]} />
        </View>
      )}

      <WebView
        ref={webRef}
        source={isVideo ? { html: playerHtml, baseUrl: 'https://lonelycpp.github.io' } : { uri }}
        style={styles.web}
        originWhitelist={['*']}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        mixedContentMode="always"
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4F8EF7" />
          </View>
        )}
      />

      {/* Citation footer */}
      {!!params.source && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <Ionicons name="link-outline" size={12} color="#6B7280" />
          <Text style={styles.footerText} numberOfLines={1}>
            Content from {params.source}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingBottom: 10,
    borderBottomWidth: 0.5, borderBottomColor: '#1F2937',
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  headerSource: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 1 },
  progressTrack: { height: 2, backgroundColor: '#1F2937' },
  progressFill: { height: 2, backgroundColor: '#4F8EF7' },
  web: { flex: 1, backgroundColor: '#000000' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A1A' },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingTop: 8,
    borderTopWidth: 0.5, borderTopColor: '#1F2937',
  },
  footerText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
});
