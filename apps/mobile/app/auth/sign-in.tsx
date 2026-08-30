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

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const loading = useAuthStore((s) => s.loading);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    const { error } = isSignUp
      ? await signUpWithEmail(email.trim(), password)
      : await signInWithEmail(email.trim(), password);

    if (error) {
      Alert.alert('Error', error);
    } else {
      if (isSignUp) {
        Alert.alert('Success', 'Check your email for a confirmation link!');
      }
      router.back();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: isSignUp ? 'Create Account' : 'Sign In',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
        }}
      />
      <KeyboardAvoidingView
        style={[styles.inner, { paddingBottom: Math.max(insets.bottom, 16) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.logoContainer}>
          <Text style={[styles.brand, { color: colors.primary }]}>KSHETRA</Text>
          <Text style={[styles.tagline, { color: colors.textMuted }]}>
            {isSignUp
              ? 'Create your account'
              : 'Sign in to sync your data'}
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
              placeholder="Email"
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
              placeholder="Password"
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
                ? 'Please wait...'
                : isSignUp
                  ? 'Create Account'
                  : 'Sign In'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.toggleButton}
            onPress={() => setIsSignUp((v) => !v)}
          >
            <Text style={[styles.toggleText, { color: colors.teal }]}>
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
