import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserProfileStore } from '../../stores/userProfile';
import { useAuthStore } from '../../stores/auth';
import { useTheme } from '../../lib/theme';
import { useFeedStore } from '../../stores/feed';

interface ReportItem {
  id: string;
  reporter_id: string;
  post_id?: string | null;
  comment_id?: string | null;
  reported_user_id?: string | null;
  conversation_id?: string | null;
  reason: string;
  description?: string | null;
  status: string;
  created_at: string;
  post?: {
    id: string;
    content: string;
    author_name?: string;
  };
  comment?: {
    id: string;
    content: string;
  };
  reported_user?: {
    user_id?: string;
    display_name?: string;
    avatar_url?: string | null;
    role?: string;
  };
}

export default function GeneralModerationQueueScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const userProfile = useUserProfileStore((s) => s.profile);
  const authSession = useAuthStore((s) => s.session);
  const authUser = useAuthStore((s) => s.user);
  const deletePostLocally = useFeedStore((s) => s.deletePost);

  const role = userProfile?.role ?? 'citizen';
  const isAuthorized = role === 'moderator' || role === 'admin';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {};
    if (authSession?.access_token) {
      headers['Authorization'] = `Bearer ${authSession.access_token}`;
    }
    const currentId = authUser?.id || userProfile?.id;
    if (currentId) {
      headers['x-user-id'] = currentId;
    }
    return headers;
  };

  const loadQueue = async () => {
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://kshetra-api-production-9f06.up.railway.app';
      const res = await fetch(`${apiUrl}/api/v1/moderation/queue`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data && data.data?.queue) {
        setReports(data.data.queue);
      }
    } catch (err) {
      console.warn('Failed to load moderation queue', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadQueue();
    } else {
      setLoading(false);
    }
  }, [isAuthorized]);

  const handleAction = async (report: ReportItem, actionType: 'delete_content' | 'warn' | 'dismiss' | 'escalate') => {
    setActionInProgress(report.id);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://kshetra-api-production-9f06.up.railway.app';
      const res = await fetch(`${apiUrl}/api/v1/moderation/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          moderatorId: authUser?.id || userProfile?.id || 'mod-admin',
          reportId: report.id,
          targetUserId: report.reported_user_id || undefined,
          targetPostId: report.post_id || undefined,
          targetCommentId: report.comment_id || undefined,
          actionType,
          reason: `Moderator action: ${actionType} on report ${report.id}`,
        }),
      });

      const result = await res.json();
      if (result.success) {
        if (actionType === 'delete_content' && report.post_id) {
          deletePostLocally(report.post_id);
        }

        setReports((prev) => prev.filter((r) => r.id !== report.id));
        Alert.alert('Action Applied', `Report processed successfully: ${actionType.replace('_', ' ')}`);
      } else {
        Alert.alert('Error', result.error || 'Failed to apply moderation action');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network request failed');
    } finally {
      setActionInProgress(null);
    }
  };

  if (!isAuthorized) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Ionicons name="shield-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.title, { color: colors.text, marginTop: 16, textAlign: 'center' }]}>
          Access Restricted
        </Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 8, fontSize: 14 }}>
          The General Moderation Queue is strictly reserved for verified Grievance Officers, Moderators, and Administrators under IT Rules 2021.
        </Text>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Return to Feed</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Content Moderation Queue</Text>
        <Pressable onPress={() => { setRefreshing(true); loadQueue(); }} hitSlop={10}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* Notice Banner */}
      <View style={[styles.banner, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
        <Ionicons name="shield-checkmark" size={18} color="#D97706" />
        <Text style={{ fontSize: 13, color: '#92400E', flex: 1, marginLeft: 8 }}>
          Statutory Grievance & Content Review Queue ({reports.length} pending). All actions are recorded in compliance with IT Rules 2021.
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.textMuted }}>Fetching pending reports...</Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="checkmark-done-circle" size={60} color="#10B981" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 }}>
            Queue All Clear!
          </Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 6 }}>
            No pending user reports requiring moderation.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadQueue(); }} />}
        >
          {reports.map((report) => {
            const isActing = actionInProgress === report.id;
            return (
              <View key={report.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={[styles.reasonBadge, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
                      {report.reason.replace('_', ' ')}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {new Date(report.created_at).toLocaleDateString()} {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {report.description && (
                  <Text style={{ fontSize: 13, color: colors.text, marginTop: 8, fontStyle: 'italic' }}>
                    "{report.description}"
                  </Text>
                )}

                {/* Target Content Snippet: Post / Comment vs. DM User / Conversation */}
                {report.reported_user_id ? (
                  <View style={[styles.snippetContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                        REPORTED USER / DIRECT MESSAGE:
                      </Text>
                      {report.reported_user?.role && (
                        <View style={[styles.roleTag, { backgroundColor: colors.border }]}>
                          <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'capitalize' }}>
                            {report.reported_user.role}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                      {report.reported_user?.display_name || `User ID: ${report.reported_user_id.slice(0, 8)}...`}
                    </Text>

                    {report.conversation_id && (
                      <Pressable
                        style={[styles.convLinkBtn, { borderColor: colors.primary, marginTop: 8 }]}
                        onPress={() => router.push(`/messages/${report.conversation_id}` as any)}
                      >
                        <Ionicons name="chatbubbles-outline" size={14} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                          Review Direct Message Thread
                        </Text>
                        <Ionicons name="open-outline" size={12} color={colors.primary} />
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <View style={[styles.snippetContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 4 }}>
                      REPORTED {report.post_id ? 'POST' : 'COMMENT'}:
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.text }} numberOfLines={4}>
                      {report.post?.content || report.comment?.content || 'Content preview not available or already archived.'}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  {!report.reported_user_id && (
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                      onPress={() => handleAction(report, 'delete_content')}
                      disabled={isActing}
                    >
                      <Ionicons name="trash-outline" size={14} color="#fff" />
                      <Text style={styles.actionBtnText}>Remove Content</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
                    onPress={() => handleAction(report, 'warn')}
                    disabled={isActing}
                  >
                    <Ionicons name="warning-outline" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Warn User</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: '#6B7280' }]}
                    onPress={() => handleAction(report, 'dismiss')}
                    disabled={isActing}
                  >
                    <Ionicons name="close-circle-outline" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Dismiss</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
                    onPress={() => handleAction(report, 'escalate')}
                    disabled={isActing}
                  >
                    <Ionicons name="arrow-up-circle-outline" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Escalate</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  reasonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  snippetContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  roleTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  convLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
