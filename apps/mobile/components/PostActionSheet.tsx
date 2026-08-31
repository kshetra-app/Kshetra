import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import type { Post, ReactionType } from '../lib/feedTypes';
import { REACTION_CONFIG } from '../lib/feedTypes';

interface PostActionSheetProps {
  visible: boolean;
  post: Post | null;
  isOwner: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onReport: () => void;
  onReact: (reaction: ReactionType) => void;
}

export default function PostActionSheet({
  visible,
  post,
  isOwner,
  onClose,
  onEdit,
  onDelete,
  onShare,
  onReport,
  onReact,
}: PostActionSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!post) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}>
          <View style={styles.dragIndicator} />

          {/* Quick Reaction Bar */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {t('feed.react')}
          </Text>
          <View style={styles.reactionRow}>
            {(Object.entries(REACTION_CONFIG) as [ReactionType, typeof REACTION_CONFIG[ReactionType]][]).map(
              ([key, config]) => {
                const isSelected = post.userReaction === key;
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.reactionButton,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      isSelected && { borderColor: config.color, borderWidth: 1.5, backgroundColor: config.color + '15' },
                    ]}
                    onPress={() => {
                      onReact(key);
                      onClose();
                    }}
                  >
                    <Text style={styles.reactionEmoji}>{config.emoji}</Text>
                    <Text
                      style={[
                        styles.reactionLabel,
                        { color: colors.textSecondary },
                        isSelected && { color: config.color, fontWeight: '700' },
                      ]}
                    >
                      {t(config.tKey)}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Action List */}
          <View style={styles.actionList}>
            {/* Share */}
            <Pressable
              style={styles.actionItem}
              onPress={() => {
                onClose();
                onShare();
              }}
            >
              <Ionicons name="share-outline" size={20} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                {t('postCard.sharePost')}
              </Text>
            </Pressable>

            {/* Edit (if owner) */}
            {isOwner && (
              <Pressable
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  onEdit();
                }}
              >
                <Ionicons name="create-outline" size={20} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>
                  {t('postCard.editPost')}
                </Text>
              </Pressable>
            )}

            {/* Delete (if owner) */}
            {isOwner && (
              <Pressable
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  onDelete();
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text style={[styles.actionText, { color: '#EF4444' }]}>
                  {t('postCard.deletePost')}
                </Text>
              </Pressable>
            )}

            {/* Report (if not owner) */}
            {!isOwner && (
              <Pressable
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  onReport();
                }}
              >
                <Ionicons name="flag-outline" size={20} color="#EF4444" />
                <Text style={[styles.actionText, { color: '#EF4444' }]}>
                  {t('postCard.reportPost')}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#88888840',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  reactionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 20,
  },
  reactionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 0.5,
    marginVertical: 16,
  },
  actionList: {
    gap: 6,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
