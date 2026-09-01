import { useMemo, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * HLS video player for React Native, implemented with a WebView + hls.js.
 *
 * WHY WebView instead of a native player: the app currently has no native video
 * module (expo-av / expo-video) installed, and adding one requires `expo prebuild`
 * which is fragile on this Windows build pipeline (see TROUBLESHOOTING.md §6).
 * react-native-webview is already a dependency, so this makes streams genuinely
 * watchable today with zero native/build changes.
 *
 * - Uses hls.js (via CDN) where Media Source Extensions are available (Android
 *   System WebView supports MSE).
 * - Falls back to native HLS playback (`<video>` can play `application/vnd.apple.mpegurl`)
 *   on iOS WKWebView / Safari.
 * - Autoplays muted (mobile autoplay policy) with inline controls.
 *
 * NOTE: HLS streaming needs a network connection regardless of player; the CDN
 * hls.js dependency is therefore not an additional offline constraint.
 */
export function HlsPlayer({
  src,
  style,
  autoPlay = true,
  muted = true,
  poster,
  errorText,
  offlineText,
}: {
  src: string;
  style?: StyleProp<ViewStyle>;
  autoPlay?: boolean;
  muted?: boolean;
  poster?: string | null;
  /** i18n-translated error message shown when stream fails */
  errorText?: string;
  /** i18n-translated offline message shown when stream is unavailable */
  offlineText?: string;
}) {
  const [loading, setLoading] = useState(true);

  const html = useMemo(
    () => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html,body { margin:0; padding:0; height:100%; background:#000; overflow:hidden; }
  #v { width:100%; height:100%; object-fit:contain; background:#000; }
  #err {
    position:absolute; inset:0; display:none; align-items:center; justify-content:center;
    color:#9CA3AF; font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    font-size:13px; text-align:center; padding:24px; box-sizing:border-box;
  }
</style>
</head>
<body>
  <video id="v" ${poster ? `poster="${poster}"` : ''} playsinline webkit-playsinline
    ${muted ? 'muted' : ''} ${autoPlay ? 'autoplay' : ''} controls></video>
  <div id="err">${errorText || 'Stream unavailable right now.'}<br/>${offlineText || 'It may be offline or still starting.'}</div>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"></script>
  <script>
    (function () {
      var video = document.getElementById('v');
      var errEl = document.getElementById('err');
      var src = ${JSON.stringify(src)};
      function post(type, extra) {
        try { window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, extra || {}))); } catch (e) {}
      }
      function showError() { errEl.style.display = 'flex'; post('error'); }
      video.addEventListener('playing', function () { post('playing'); });
      video.addEventListener('waiting', function () { post('waiting'); });
      if (window.Hls && window.Hls.isSupported()) {
        var hls = new window.Hls({ lowLatencyMode: true, enableWorker: true });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.MANIFEST_PARSED, function () {
          post('ready');
          if (${autoPlay ? 'true' : 'false'}) { var p = video.play(); if (p && p.catch) p.catch(function(){}); }
        });
        hls.on(window.Hls.Events.ERROR, function (evt, data) {
          if (data && data.fatal) {
            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
              case window.Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
              default: hls.destroy(); showError(); break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.addEventListener('loadedmetadata', function () {
          post('ready');
          if (${autoPlay ? 'true' : 'false'}) { var p = video.play(); if (p && p.catch) p.catch(function(){}); }
        });
        video.addEventListener('error', showError);
      } else {
        showError();
      }
    })();
  </script>
</body>
</html>`,
    [src, autoPlay, muted, poster, errorText, offlineText],
  );

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        androidLayerType="hardware"
        onMessage={(e) => {
          const type = (() => {
            try {
              return JSON.parse(e.nativeEvent.data)?.type as string;
            } catch {
              return '';
            }
          })();
          if (type === 'playing' || type === 'ready' || type === 'error') setLoading(false);
        }}
        setSupportMultipleWindows={false}
      />
      {loading && (
        <View pointerEvents="none" style={styles.loader}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#000000', overflow: 'hidden' },
  web: { flex: 1, backgroundColor: '#000000' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
