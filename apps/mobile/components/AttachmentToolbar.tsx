import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';

interface Props {
  gallery: () => void;
  photo: () => void;
  video: () => void;
  link?: () => void;
}

export default function AttachmentToolbar({ gallery, photo, video, link }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const actions = [
    { icon: 'images', label: t('reportIssueSheet.gallery', { defaultValue: 'Gallery' }), run: gallery },
    { icon: 'camera', label: t('reportIssueSheet.camera', { defaultValue: 'Camera' }), run: photo },
    { icon: 'videocam', label: t('compose.recordVideo', { defaultValue: 'Video' }), run: video },
    ...(link ? [{ icon: 'link', label: t('compose.addLink', { defaultValue: 'Link' }), run: link }] : []),
  ] as const;
  return <View style={styles.row}>{actions.map((action) =>
    <Pressable key={action.icon} accessibilityRole="button" style={styles.action} onPress={action.run}>
      <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} color={colors.primary} size={21} />
      <Text style={{ color: colors.textSecondary }}>{action.label}</Text>
    </Pressable>,
  )}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  action: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, gap: 2 },
});
