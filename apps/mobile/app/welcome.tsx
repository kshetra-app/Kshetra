import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/auth';
import { useTheme } from '../lib/theme';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
    >
      <Stack.Screen options={{ headerShown: true, title: t('common.appName') }} />
      <Ionicons name="people-circle-outline" size={54} color={colors.primary} />
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
        {t('invite.welcome')}
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{t('invite.welcomeBody')}</Text>
      {!user && (
        <>
          <Pressable
            accessibilityRole="button"
            style={[styles.primary, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: '/auth/sign-in', params: { mode: 'signup' } })}
          >
            <Text style={styles.primaryText}>{t('auth.signUp')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={styles.secondary}
            onPress={() => router.push('/auth/sign-in')}
          >
            <Text style={[styles.link, { color: colors.primary }]}>{t('auth.signIn')}</Text>
          </Pressable>
        </>
      )}
      <Pressable
        accessibilityRole="button"
        style={styles.secondary}
        onPress={() => router.replace('/(tabs)/community')}
      >
        <Text style={[styles.link, { color: colors.primary }]}>{t('invite.explore')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 34,
    gap: 16,
  },
  heading: { fontSize: 28, fontWeight: '800' },
  body: { fontSize: 16 },
  primary: {
    minHeight: 52,
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryText: { color: '#FFFFFF', textAlign: 'center', fontSize: 16, fontWeight: '700' },
  secondary: { minHeight: 44, justifyContent: 'center', padding: 8 },
  link: { textAlign: 'center', fontSize: 16, fontWeight: '700' },
});
