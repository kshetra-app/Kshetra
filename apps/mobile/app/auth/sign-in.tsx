import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/auth';
import { useTheme } from '../../lib/theme';
import DiscoveryHubSheet from '../../components/DiscoveryHubSheet';
import i18n from '../../i18n';

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const loading = useAuthStore((s) => s.loading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(i18n.t('common.error'), i18n.t('auth.credentialsRequired'));
      return;
    }

    const { error } = isSignUp
      ? await signUpWithEmail(email.trim(), password)
      : await signInWithEmail(email.trim(), password);

    if (error) {
      Alert.alert(i18n.t('common.error'), error);
    } else {
      if (isSignUp) {
        Alert.alert(i18n.t('auth.signUp'), i18n.t('auth.confirmationSent'));
      }
      router.back();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: i18n.t(isSignUp ? 'auth.signUp' : 'auth.signIn'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={i18n.t('discovery.screenHelp')}
              style={{ padding: 6, marginRight: 8 }}
              onPress={() => setHelpVisible(true)}
            >
              <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={[styles.inner, { paddingBottom: Math.max(insets.bottom, 16) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.logoContainer}>
          <Text style={[styles.brand, { color: colors.primary }]}>POLIGRAM</Text>
          <Text style={[styles.tagline, { color: colors.textMuted }]}>
            {isSignUp
              ? i18n.t('auth.signUp')
              : i18n.t('auth.signInToSync')}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={i18n.t('auth.email')}
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.goldBorder || colors.border }]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={i18n.t('auth.password')}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <Pressable
            style={[styles.submitButton, { backgroundColor: colors.primary }, loading && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitText}>
              {loading
                ? i18n.t('common.loading')
                : isSignUp
                  ? i18n.t('auth.signUp')
                  : i18n.t('auth.signIn')}
            </Text>
          </Pressable>

          <Pressable
            style={styles.toggleButton}
            onPress={() => setIsSignUp((v) => !v)}
          >
            <Text style={[styles.toggleText, { color: colors.teal }]}>
              {isSignUp
                ? `${i18n.t('auth.hasAccount')} ${i18n.t('auth.signIn')}`
                : `${i18n.t('auth.noAccount')} ${i18n.t('auth.signUp')}`}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <DiscoveryHubSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        sourceScreen="auth-signin"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brand: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 14,
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
