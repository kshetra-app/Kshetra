/**
 * ModuleDetailModal — full reader for a Leadership Academy module.
 *
 * Renders reading sections, an attributed video (streamed from the original
 * publisher's YouTube channel — not re-hosted), an interactive quiz, key
 * takeaways, and a Sources/citations block. Marking complete records progress
 * (and the quiz score, when a quiz is present) via the aspirant store.
 */
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import {
  MODULE_CATEGORY_CONFIG,
  type LeadershipModule,
} from '../lib/aspirantTypes';

interface ModuleDetailModalProps {
  visible: boolean;
  module: LeadershipModule | null;
  isCompleted: boolean;
  onClose: () => void;
  onComplete: (quizScore?: number) => void;
}

export default function ModuleDetailModal({
  visible,
  module,
  isCompleted,
  onClose,
  onComplete,
}: ModuleDetailModalProps) {
  const insets = useSafeAreaInsets();

  // Quiz state
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const quiz = module?.quiz ?? [];
  const hasQuiz = quiz.length > 0;

  const score = useMemo(() => {
    if (!hasQuiz) return undefined;
    const correct = quiz.filter((q) => answers[q.id] === q.correctIndex).length;
    return Math.round((correct / quiz.length) * 100);
  }, [hasQuiz, quiz, answers]);

  const allAnswered = hasQuiz && quiz.every((q) => answers[q.id] !== undefined);

  const reset = useCallback(() => {
    setAnswers({});
    setSubmitted(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleComplete = useCallback(() => {
    onComplete(hasQuiz ? score : undefined);
    reset();
  }, [onComplete, hasQuiz, score, reset]);

  if (!module) return null;

  const catConfig = MODULE_CATEGORY_CONFIG[module.category];
  const canComplete = !hasQuiz || submitted;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={handleClose} hitSlop={12} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <View style={[styles.catChip, { backgroundColor: catConfig.color + '22' }]}>
            <Ionicons name={catConfig.icon as any} size={12} color={catConfig.color} />
            <Text style={[styles.catChipText, { color: catConfig.color }]}>{catConfig.label}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title + meta */}
          <Text style={styles.title}>{module.title}</Text>
          <Text style={styles.meta}>
            {module.durationMinutes} min · {module.contentType} · {module.difficulty}
          </Text>
          <Text style={styles.description}>{module.description}</Text>

          {/* Video (attributed) */}
          {module.video && <AttributedVideo video={module.video} />}

          {/* Reading sections */}
          {module.sections?.map((s, i) => (
            <View key={i} style={styles.section}>
              <Text style={styles.sectionHeading}>{s.heading}</Text>
              <Text style={styles.sectionBody}>{s.body}</Text>
            </View>
          ))}

          {/* Key takeaways */}
          {module.keyTakeaways && module.keyTakeaways.length > 0 && (
            <View style={styles.takeawaysBox}>
              <View style={styles.takeawaysHeader}>
                <Ionicons name="bulb" size={16} color="#F59E0B" />
                <Text style={styles.takeawaysTitle}>Key Takeaways</Text>
              </View>
              {module.keyTakeaways.map((t, i) => (
                <View key={i} style={styles.takeawayRow}>
                  <Ionicons name="checkmark-circle" size={15} color="#10B981" style={{ marginTop: 1 }} />
                  <Text style={styles.takeawayText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quiz */}
          {hasQuiz && (
            <View style={styles.quizBox}>
              <View style={styles.quizHeaderRow}>
                <Ionicons name="help-circle" size={18} color="#4F8EF7" />
                <Text style={styles.quizTitle}>Knowledge Check</Text>
                {submitted && (
                  <Text
                    style={[
                      styles.quizScore,
                      { color: (score ?? 0) >= 60 ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {score}%
                  </Text>
                )}
              </View>

              {quiz.map((q, qi) => (
                <View key={q.id} style={styles.question}>
                  <Text style={styles.questionText}>
                    {qi + 1}. {q.question}
                  </Text>
                  {q.options.map((opt, oi) => {
                    const selected = answers[q.id] === oi;
                    const isCorrect = oi === q.correctIndex;
                    let optStyle = styles.option;
                    let icon: string | null = selected ? 'radio-button-on' : 'radio-button-off';
                    let iconColor = selected ? '#4F8EF7' : '#6B7280';
                    if (submitted) {
                      if (isCorrect) {
                        optStyle = styles.optionCorrect;
                        icon = 'checkmark-circle';
                        iconColor = '#10B981';
                      } else if (selected && !isCorrect) {
                        optStyle = styles.optionWrong;
                        icon = 'close-circle';
                        iconColor = '#EF4444';
                      } else {
                        icon = 'ellipse-outline';
                        iconColor = '#374151';
                      }
                    }
                    return (
                      <Pressable
                        key={oi}
                        style={optStyle}
                        disabled={submitted}
                        onPress={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      >
                        <Ionicons name={icon as any} size={16} color={iconColor} />
                        <Text style={styles.optionText}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                  {submitted && (
                    <Text style={styles.explanation}>{q.explanation}</Text>
                  )}
                </View>
              ))}

              {!submitted ? (
                <Pressable
                  style={[styles.quizSubmit, !allAnswered && styles.btnDisabled]}
                  disabled={!allAnswered}
                  onPress={() => setSubmitted(true)}
                >
                  <Text style={styles.quizSubmitText}>
                    {allAnswered ? 'Submit Answers' : 'Answer all questions'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable style={styles.retry} onPress={reset}>
                  <Ionicons name="refresh" size={14} color="#9CA3AF" />
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Sources / Citations */}
          {module.citations && module.citations.length > 0 && (
            <View style={styles.sourcesBox}>
              <View style={styles.sourcesHeader}>
                <Ionicons name="library" size={15} color="#9CA3AF" />
                <Text style={styles.sourcesTitle}>Sources & Further Reading</Text>
              </View>
              {module.citations.map((c, i) => (
                <Pressable
                  key={i}
                  style={styles.sourceRow}
                  onPress={() => Linking.openURL(c.url).catch(() => {})}
                >
                  <Ionicons name="link" size={13} color="#4F8EF7" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sourceLabel}>{c.label}</Text>
                    <Text style={styles.sourcePublisher}>{c.publisher}</Text>
                  </View>
                  <Ionicons name="open-outline" size={14} color="#6B7280" />
                </Pressable>
              ))}
              <Text style={styles.legalNote}>
                Educational summary prepared from the public sources above. Videos are streamed
                from the original publisher's official channel with attribution and are not
                re-hosted. All trademarks belong to their respective owners.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer action */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {isCompleted ? (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.completedText}>Module Completed</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.completeBtn, !canComplete && styles.btnDisabled]}
              disabled={!canComplete}
              onPress={handleComplete}
            >
              <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
              <Text style={styles.completeBtnText}>
                {hasQuiz && !submitted ? 'Take the quiz to complete' : 'Mark as Complete'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Attributed video player (YouTube via WebView) ─────────────────
function AttributedVideo({
  video,
}: {
  video: NonNullable<LeadershipModule['video']>;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const html = useMemo(
    () => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;overflow:hidden}html,body{width:100%;height:100%;background:#000}#player{position:absolute;top:0;left:0;width:100%;height:100%}</style>
</head><body><div id="player"></div><script>
var tag=document.createElement('script');tag.src="https://www.youtube.com/iframe_api";document.head.appendChild(tag);
var player;function onYouTubeIframeAPIReady(){player=new YT.Player('player',{width:'100%',height:'100%',videoId:'${video.youtubeId}',playerVars:{playsinline:1,autoplay:0,controls:1,rel:0,modestbranding:1,iv_load_policy:3},events:{onReady:function(){window.ReactNativeWebView.postMessage('ready');},onError:function(){window.ReactNativeWebView.postMessage('error');}}});}
</script></body></html>`,
    [video.youtubeId],
  );

  return (
    <View style={styles.videoWrap}>
      <View style={styles.videoFrame}>
        {!error ? (
          <>
            <WebView
              key={video.youtubeId}
              style={{ flex: 1, backgroundColor: '#000' }}
              source={{ html, baseUrl: 'https://lonelycpp.github.io' }}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={Platform.OS === 'ios'}
              onMessage={(e) => {
                if (e.nativeEvent.data === 'ready') setLoading(false);
                if (e.nativeEvent.data === 'error') { setLoading(false); setError(true); }
              }}
              onError={() => { setLoading(false); setError(true); }}
            />
            {loading && (
              <View style={[StyleSheet.absoluteFill, styles.videoLoader]}>
                <ActivityIndicator color="#4F8EF7" />
              </View>
            )}
          </>
        ) : (
          <Pressable
            style={[StyleSheet.absoluteFill, styles.videoLoader]}
            onPress={() => Linking.openURL(video.sourceUrl).catch(() => {})}
          >
            <Ionicons name="logo-youtube" size={36} color="#FF0000" />
            <Text style={styles.videoErrText}>Tap to watch on YouTube</Text>
          </Pressable>
        )}
      </View>
      {/* Attribution caption (copyright safety) */}
      <Pressable
        style={styles.attribution}
        onPress={() => Linking.openURL(video.sourceUrl).catch(() => {})}
      >
        <Ionicons name="logo-youtube" size={13} color="#FF0000" />
        <Text style={styles.attributionText} numberOfLines={2}>
          “{video.title}” — {video.channel}. Source ↗
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerBtn: { width: 36, height: 36, justifyContent: 'center' },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  catChipText: { fontSize: 11, fontWeight: '700' },
  scroll: { flex: 1, paddingHorizontal: 18 },
  title: { fontSize: 23, fontWeight: '800', color: '#FFFFFF', marginTop: 16 },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 6, textTransform: 'capitalize' },
  description: { fontSize: 14, color: '#9CA3AF', lineHeight: 21, marginTop: 12 },
  // Video
  videoWrap: { marginTop: 18 },
  videoFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoLoader: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', gap: 8 },
  videoErrText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  attribution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  attributionText: { flex: 1, fontSize: 11, color: '#6B7280', fontStyle: 'italic' },
  // Sections
  section: { marginTop: 22 },
  sectionHeading: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  sectionBody: { fontSize: 14, color: '#D1D5DB', lineHeight: 22 },
  // Takeaways
  takeawaysBox: {
    marginTop: 24,
    backgroundColor: '#13131F',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F59E0B33',
  },
  takeawaysHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  takeawaysTitle: { fontSize: 14, fontWeight: '800', color: '#F59E0B' },
  takeawayRow: { flexDirection: 'row', gap: 9, marginBottom: 9 },
  takeawayText: { flex: 1, fontSize: 13, color: '#D1D5DB', lineHeight: 19 },
  // Quiz
  quizBox: {
    marginTop: 24,
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  quizHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  quizTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', flex: 1 },
  quizScore: { fontSize: 16, fontWeight: '900' },
  question: { marginBottom: 18 },
  questionText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 10, lineHeight: 20 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#0A0A1A',
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 7,
  },
  optionCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#10B98115',
    borderWidth: 1,
    borderColor: '#10B98155',
    marginBottom: 7,
  },
  optionWrong: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444455',
    marginBottom: 7,
  },
  optionText: { flex: 1, fontSize: 13, color: '#D1D5DB' },
  explanation: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  quizSubmit: {
    backgroundColor: '#4F8EF7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  quizSubmitText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  retry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  retryText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  // Sources
  sourcesBox: {
    marginTop: 26,
    backgroundColor: '#0E0E18',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  sourcesHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  sourcesTitle: { fontSize: 13, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: '#1A1A28',
  },
  sourceLabel: { fontSize: 13, color: '#E5E7EB', fontWeight: '600', lineHeight: 18 },
  sourcePublisher: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  legalNote: { fontSize: 10, color: '#4B5563', lineHeight: 15, marginTop: 12, fontStyle: 'italic' },
  // Footer
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    backgroundColor: '#0A0A1A',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
  },
  completeBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B98115',
    borderRadius: 12,
    paddingVertical: 14,
  },
  completedText: { fontSize: 15, fontWeight: '800', color: '#10B981' },
  btnDisabled: { opacity: 0.4 },
});
