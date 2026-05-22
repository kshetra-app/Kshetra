import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/auth';
import { useUserProfileStore } from '../stores/userProfile';
import { useContentPromotionStore } from '../stores/contentPromotion';
import type { PromotableContentType, FlagReason, AlertCategory } from '../lib/contentPromotionTypes';
import {
  FLAG_REASON_CONFIG,
  ALERT_CATEGORY_CONFIG,
  VISIBILITY_LEVEL_CONFIG,
  REVIEW_STATUS_CONFIG,
} from '../lib/contentPromotionTypes';

interface ContentGateActionsProps {
  contentType: PromotableContentType;
  contentId: string;
  compact?: boolean;
}

/**
 * Vouch / Flag / Alert action bar displayed below content cards.
 * Allows community members to vote on content quality and flag problems.
 */
export default function ContentGateActions({
  contentType,
  contentId,
  compact = false,
}: ContentGateActionsProps) {
  const user = useAuthStore((s) => s.user);
  const userProfile = useUserProfileStore((s) => s.profile);
  const userId = user?.id ?? 'anon';

  const getVisibility = useContentPromotionStore((s) => s.getVisibility);
  const hasUserVouched = useContentPromotionStore((s) => s.hasUserVouched);
  const hasUserFlagged = useContentPromotionStore((s) => s.hasUserFlagged);
  const vouchContent = useContentPromotionStore((s) => s.vouchContent);
  const flagContent = useContentPromotionStore((s) => s.flagContent);
  const alertContent = useContentPromotionStore((s) => s.alertContent);

  const [showFlagSheet, setShowFlagSheet] = useState(false);
  const [showAlertSheet, setShowAlertSheet] = useState(false);

  const visibility = getVisibility(contentType, contentId);

  // If no visibility record exists (low-risk or not registered), don't show
  if (!visibility) return null;

  const vouched = hasUserVouched(visibility.id, userId);
  const flagged = hasUserFlagged(visibility.id, userId);
  const visConfig = VISIBILITY_LEVEL_CONFIG[visibility.visibilityLevel];
  const statusConfig = REVIEW_STATUS_CONFIG[visibility.reviewStatus];

  const handleVouch = useCallback(() => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to vouch for content.');
      return;
    }
    if (vouched) return;

    vouchContent({
      contentType,
      contentId,
      userId,
      userRole: userProfile?.role ?? 'citizen',
      userReputation: userProfile?.reputation ?? 0,
    });
  }, [user, vouched, contentType, contentId, userId, userProfile, vouchContent]);

  // Compact mode: just the visibility badge
  if (compact) {
    return (
      <View style={styles.compactRow}>
        <View style={[styles.visibilityBadge, { backgroundColor: visConfig.color + '20' }]}>
          <Ionicons name={visConfig.icon as any} size={10} color={visConfig.color} />
          <Text style={[styles.visibilityText, { color: visConfig.color }]}>
            {visConfig.label}
          </Text>
        </View>
        {visibility.reviewStatus === 'open' && (
          <View style={styles.compactActions}>
            <Pressable
              style={[styles.compactButton, vouched && styles.compactButtonActive]}
              onPress={handleVouch}
              disabled={vouched}
            >
              <Ionicons
                name={vouched ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={14}
                color={vouched ? '#10B981' : '#6B7280'}
              />
              <Text style={[styles.compactCount, vouched && { color: '#10B981' }]}>
                {visibility.vouchCount}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.compactButton, flagged && styles.compactButtonFlagged]}
              onPress={() => !flagged && setShowFlagSheet(true)}
              disabled={flagged}
            >
              <Ionicons
                name={flagged ? 'flag' : 'flag-outline'}
                size={14}
                color={flagged ? '#EF4444' : '#6B7280'}
              />
              {visibility.flagCount > 0 && (
                <Text style={[styles.compactCount, flagged && { color: '#EF4444' }]}>
                  {visibility.flagCount}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  // Full mode
  return (
    <View style={styles.container}>
      {/* Status bar */}
      <View style={styles.statusRow}>
        <View style={[styles.visibilityBadge, { backgroundColor: visConfig.color + '20' }]}>
          <Ionicons name={visConfig.icon as any} size={12} color={visConfig.color} />
          <Text style={[styles.visibilityText, { color: visConfig.color }]}>
            {visConfig.label}
          </Text>
        </View>
        {visibility.reviewStatus !== 'promoted' && (
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
            <Ionicons name={statusConfig.icon as any} size={11} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      {visibility.reviewStatus === 'open' && (
        <View style={styles.actionsRow}>
          {/* Vouch */}
          <Pressable
            style={[styles.actionButton, vouched && styles.actionButtonVouched]}
            onPress={handleVouch}
            disabled={vouched}
          >
            <Ionicons
              name={vouched ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={16}
              color={vouched ? '#10B981' : '#9CA3AF'}
            />
            <Text style={[styles.actionText, vouched && { color: '#10B981' }]}>
              {vouched ? 'Vouched' : 'Vouch'}
            </Text>
            <Text style={[styles.actionCount, vouched && { color: '#10B981' }]}>
              {visibility.vouchCount}
            </Text>
          </Pressable>

          {/* Flag */}
          <Pressable
            style={[styles.actionButton, flagged && styles.actionButtonFlagged]}
            onPress={() => !flagged && setShowFlagSheet(true)}
            disabled={flagged}
          >
            <Ionicons
              name={flagged ? 'flag' : 'flag-outline'}
              size={16}
              color={flagged ? '#EF4444' : '#9CA3AF'}
            />
            <Text style={[styles.actionText, flagged && { color: '#EF4444' }]}>
              {flagged ? 'Flagged' : 'Flag'}
            </Text>
            {visibility.flagCount > 0 && (
              <Text style={[styles.actionCount, flagged && { color: '#EF4444' }]}>
                {visibility.flagCount}
              </Text>
            )}
          </Pressable>

          {/* Alert */}
          <Pressable
            style={styles.actionButton}
            onPress={() => setShowAlertSheet(true)}
          >
            <Ionicons name="alert-circle-outline" size={16} color="#9CA3AF" />
            <Text style={styles.actionText}>Alert</Text>
          </Pressable>
        </View>
      )}

      {/* Restricted notice */}
      {visibility.reviewStatus === 'restricted' && (
        <View style={styles.restrictedBanner}>
          <Ionicons name="eye-off" size={14} color="#EF4444" />
          <Text style={styles.restrictedText}>
            This content has been restricted from wider feeds pending review.
          </Text>
        </View>
      )}

      {/* Flag Sheet */}
      <FlagSheet
        visible={showFlagSheet}
        onClose={() => setShowFlagSheet(false)}
        onSubmit={(reason, description) => {
          flagContent({
            contentType,
            contentId,
            userId,
            userReputation: userProfile?.reputation ?? 0,
            reason,
            description,
          });
          setShowFlagSheet(false);
        }}
      />

      {/* Alert Sheet */}
      <AlertSheet
        visible={showAlertSheet}
        onClose={() => setShowAlertSheet(false)}
        onSubmit={(severity, reason, category) => {
          alertContent({
            contentType,
            contentId,
            userId,
            severity,
            reason,
            category,
          });
          setShowAlertSheet(false);
          Alert.alert('Alert Submitted', 'Moderators have been notified. Thank you for keeping the platform safe.');
        }}
      />
    </View>
  );
}

// ─── Flag Sheet Sub-component ───────────────────────────────────────────────

function FlagSheet({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: FlagReason, description?: string) => void;
}) {
  const [selectedReason, setSelectedReason] = useState<FlagReason | null>(null);
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!selectedReason) return;
    onSubmit(selectedReason, description.trim() || undefined);
    setSelectedReason(null);
    setDescription('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={flagStyles.container}>
        <View style={flagStyles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </Pressable>
          <Text style={flagStyles.title}>Flag Content</Text>
          <Pressable
            onPress={handleSubmit}
            disabled={!selectedReason}
            hitSlop={8}
          >
            <Text style={[flagStyles.submitText, !selectedReason && { opacity: 0.3 }]}>
              Submit
            </Text>
          </Pressable>
        </View>

        <Text style={flagStyles.subtitle}>
          Why should this content be reviewed? Flagging helps prevent harmful content from reaching wider audiences.
        </Text>

        <ScrollView style={flagStyles.scroll}>
          {(Object.entries(FLAG_REASON_CONFIG) as [FlagReason, typeof FLAG_REASON_CONFIG[FlagReason]][]).map(
            ([key, config]) => (
              <Pressable
                key={key}
                style={[
                  flagStyles.reasonRow,
                  selectedReason === key && flagStyles.reasonRowSelected,
                ]}
                onPress={() => setSelectedReason(key)}
              >
                <View style={[flagStyles.reasonIcon, { backgroundColor: getSeverityColor(config.severity) + '20' }]}>
                  <Ionicons name={config.icon as any} size={18} color={getSeverityColor(config.severity)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={flagStyles.reasonLabel}>{config.label}</Text>
                  <Text style={flagStyles.reasonDesc}>{config.description}</Text>
                </View>
                {selectedReason === key && (
                  <Ionicons name="checkmark-circle" size={20} color="#4F8EF7" />
                )}
              </Pressable>
            ),
          )}

          {selectedReason && (
            <View style={flagStyles.descriptionBox}>
              <Text style={flagStyles.descLabel}>Additional details (optional)</Text>
              <TextInput
                style={flagStyles.descInput}
                placeholder="Describe why this is problematic..."
                placeholderTextColor="#4B5563"
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={500}
              />
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Alert Sheet Sub-component ──────────────────────────────────────────────

function AlertSheet({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (severity: 'medium' | 'high' | 'critical', reason: string, category: AlertCategory) => void;
}) {
  const [category, setCategory] = useState<AlertCategory | null>(null);
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!category || !reason.trim()) return;
    onSubmit('critical', reason.trim(), category);
    setCategory(null);
    setReason('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={flagStyles.container}>
        <View style={flagStyles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </Pressable>
          <Text style={flagStyles.title}>Raise Alert</Text>
          <Pressable
            onPress={handleSubmit}
            disabled={!category || !reason.trim()}
            hitSlop={8}
          >
            <Text style={[flagStyles.submitText, (!category || !reason.trim()) && { opacity: 0.3 }]}>
              Submit
            </Text>
          </Pressable>
        </View>

        <View style={flagStyles.alertWarning}>
          <Ionicons name="warning" size={16} color="#EF4444" />
          <Text style={flagStyles.alertWarningText}>
            Alerts are for URGENT issues only. This immediately flags content for moderator review. Misuse may affect your reputation.
          </Text>
        </View>

        <ScrollView style={flagStyles.scroll}>
          <Text style={flagStyles.descLabel}>Category</Text>
          {(Object.entries(ALERT_CATEGORY_CONFIG) as [AlertCategory, typeof ALERT_CATEGORY_CONFIG[AlertCategory]][]).map(
            ([key, config]) => (
              <Pressable
                key={key}
                style={[
                  flagStyles.reasonRow,
                  category === key && flagStyles.reasonRowSelected,
                ]}
                onPress={() => setCategory(key)}
              >
                <View style={[flagStyles.reasonIcon, { backgroundColor: config.color + '20' }]}>
                  <Ionicons name="alert-circle" size={18} color={config.color} />
                </View>
                <Text style={flagStyles.reasonLabel}>{config.label}</Text>
                {category === key && (
                  <Ionicons name="checkmark-circle" size={20} color="#4F8EF7" />
                )}
              </Pressable>
            ),
          )}

          <View style={flagStyles.descriptionBox}>
            <Text style={flagStyles.descLabel}>Explain the urgency *</Text>
            <TextInput
              style={flagStyles.descInput}
              placeholder="Describe what makes this urgent..."
              placeholderTextColor="#4B5563"
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={500}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#EF4444';
    case 'high': return '#F59E0B';
    case 'medium': return '#8B5CF6';
    case 'low': return '#6B7280';
    default: return '#6B7280';
  }
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    gap: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  visibilityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 0.5,
    borderColor: '#1F2937',
  },
  actionButtonVouched: {
    backgroundColor: '#10B98110',
    borderColor: '#10B98130',
  },
  actionButtonFlagged: {
    backgroundColor: '#EF444410',
    borderColor: '#EF444430',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  actionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  restrictedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#EF444410',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#EF444420',
  },
  restrictedText: {
    fontSize: 11,
    color: '#EF4444',
    flex: 1,
    lineHeight: 16,
  },
  // Compact mode
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  compactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  compactButtonActive: {},
  compactButtonFlagged: {},
  compactCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
});

const flagStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1F2937',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4F8EF7',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 8,
  },
  reasonRowSelected: {
    borderColor: '#4F8EF7',
    backgroundColor: '#4F8EF708',
  },
  reasonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reasonDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  descriptionBox: {
    marginTop: 16,
  },
  descLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 6,
  },
  descInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1F2937',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  alertWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    margin: 16,
    padding: 12,
    backgroundColor: '#EF444410',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF444420',
  },
  alertWarningText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
    lineHeight: 18,
  },
});
