import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import PartyDirectory from '../../components/PartyDirectory';
import { getPartyAccount, type PartyAccount } from '../../lib/partyRegistry';
import { useAuthStore } from '../../stores/auth';
import { useTheme } from '../../lib/theme';

export default function PartyDirectoryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [account, setAccount] = useState<PartyAccount | null>(null);
  useFocusEffect(useCallback(() => {
    let current = true;
    setAccount(null);
    if (user?.id && user.id !== 'anon') {
      void getPartyAccount().then((value) => {
        if (current && value.accountId === user.id) setAccount(value);
      }).catch(() => {});
    }
    return () => { current = false; };
  }, [user?.id]));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: true, title: t('partyRegistry.title', { defaultValue: 'Political parties' }) }} />
      {account?.declaration && (
        <Pressable style={styles.shortcut} accessibilityRole="button" onPress={() => router.push({
          pathname: '/parties/[id]', params: { id: account.declaration!.organization_id },
        })}>
          <Text style={{ color: colors.primary }}>{t('partyRegistry.myDeclaration', { defaultValue: 'My affiliation' })}</Text>
        </Pressable>
      )}
      {account?.canReviewClaims && (
        <Pressable style={styles.shortcut} accessibilityRole="button" onPress={() => router.push('/parties/review')}>
          <Text style={{ color: colors.primary }}>{t('partyRegistry.review', { defaultValue: 'Review official Page claims' })}</Text>
        </Pressable>
      )}
      <PartyDirectory onSelect={(party) => router.push({ pathname: '/parties/[id]', params: { id: party.id } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  shortcut: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
});
