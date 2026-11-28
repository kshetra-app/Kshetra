import { useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as SMS from 'expo-sms';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../lib/constants';
import { IS_STAGING } from '../lib/environment';
import { useTheme } from '../lib/theme';

export default function InviteScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const url = `${API_BASE_URL}/join`;
  const message = `${t(IS_STAGING ? 'invite.testMessage' : 'invite.message')}\n${url}`;

  async function shareInvite(channel: 'sms' | 'share') {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      if (channel === 'share') {
        await Share.share({ message });
      } else if (await SMS.isAvailableAsync()) {
        // The phone's Messages app owns both the recipient selection and the send action.
        await SMS.sendSMSAsync([], message);
      } else {
        setError(t('invite.smsUnavailable'));
      }
    } catch {
      setError(t('invite.openFailed'));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.screen, { paddingBottom: insets.bottom + 24 }]}
    >
      <Stack.Screen options={{ headerShown: true, title: t('invite.title') }} />
      <View style={[styles.icon, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="person-add-outline" size={28} color={colors.primary} />
      </View>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
        {t('invite.heading')}
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{t('invite.instructions')}</Text>

      <View
        style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
          {t('invite.preview')}
        </Text>
        <Text selectable style={[styles.body, { color: colors.text }]}>
          {message}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        testID="invite-text-contact"
        onPress={() => void shareInvite('sms')}
        style={[styles.action, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
        <Text style={[styles.actionText, { color: '#FFFFFF' }]}>{t('invite.textContact')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        testID="invite-share-link"
        onPress={() => void shareInvite('share')}
        style={[
          styles.action,
          styles.secondary,
          { borderColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <Ionicons name="share-social-outline" size={20} color={colors.primary} />
        <Text style={[styles.actionText, { color: colors.text }]}>{t('invite.share')}</Text>
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" style={[styles.body, { color: colors.danger }]}>
          {error}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 14,
  },
  icon: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 27, fontWeight: '800' },
  body: { fontSize: 15 },
  preview: { borderWidth: 1, borderRadius: 16, gap: 8, padding: 16, marginVertical: 6 },
  previewLabel: { fontSize: 13, fontWeight: '700' },
  action: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 12,
  },
  actionText: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  secondary: { borderWidth: 1 },
});
