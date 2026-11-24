import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../lib/api';
import { useTheme } from '../../lib/theme';

type Access = { available: false } | {
  available: true;
  testMode: true;
  amountPaise: number;
  accessDays: number;
  accessUntil: string | null;
};

const authPolicy = { authPolicy: 'authenticated' as const };
const stagingHost = 'kshetra-api-staging.up.railway.app';

export default function CampaignPublishingAccess({ path }: { path: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [access, setAccess] = useState<Access | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const requestInFlight = useRef(false);

  const refresh = useCallback(async () => {
    const result = await apiClient.get<Access>(path + '/access', authPolicy);
    if (active.current) {
      setAccess(result.data);
      setError(null);
    }
  }, [path]);

  useEffect(() => {
    active.current = true;
    const update = () => refresh().catch(() => {
      if (active.current) setError(t('campaignManager.facebookAccessLoadError', {
        defaultValue: 'Publishing access could not be loaded.',
      }));
    });
    void update();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void update();
    });
    return () => { active.current = false; listener.remove(); };
  }, [refresh, t]);

  async function openCheckout() {
    if (requestInFlight.current || !access?.available || activeUntil) return;
    requestInFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await apiClient.post<{ checkoutUrl: string }>(path + '/access/orders', undefined, authPolicy);
      const url = new URL(result.data.checkoutUrl);
      if (url.origin !== 'https://' + stagingHost ||
        !/^\/api\/v1\/campaign\/facebook\/checkout\/[A-Za-z0-9_-]{43}$/.test(url.pathname) ||
        url.username || url.password || url.search || url.hash) {
        throw new Error(t('campaignManager.facebookCheckoutInvalid', { defaultValue: 'Checkout could not be opened.' }));
      }
      await Linking.openURL(url.href);
    } catch (failure) {
      if (active.current) setError(failure instanceof Error ? failure.message : t('common.error'));
    } finally {
      requestInFlight.current = false;
      if (active.current) setBusy(false);
    }
  }

  if (!access?.available && !error) return null;
  const activeUntil = access?.available && access.accessUntil && Date.parse(access.accessUntil) > Date.now()
    ? new Date(access.accessUntil) : null;
  const price = access?.available ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
    .format(access.amountPaise / 100) : null;

  return <View style={[styles.card, { borderColor: colors.border }]}>
    <Text style={[styles.title, { color: colors.text }]}>
      {t('campaignManager.facebookPublishingAccess', { defaultValue: 'Campaign Publishing access' })}
    </Text>
    {activeUntil ? <Text style={{ color: colors.text }}>
      {t('campaignManager.facebookActiveUntil', {
        defaultValue: 'Test access active until {{date}}', date: activeUntil.toLocaleDateString(),
      })}
    </Text> : access?.available && <Text style={{ color: colors.text }}>
      {t('campaignManager.facebookTestPrice', {
        defaultValue: '{{price}} for {{days}} days in Razorpay Test Mode', price, days: access.accessDays,
      })}
    </Text>}
    {error && <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary }}>{error}</Text>}
    {access?.available && !activeUntil &&
      <Pressable accessibilityRole="button" onPress={() => { void openCheckout(); }} disabled={busy}
        style={[styles.button, { borderColor: colors.border }]}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>
          {busy ? t('common.loading', { defaultValue: 'Loading' })
            : t('campaignManager.facebookOpenTestCheckout', { defaultValue: 'Open test checkout' })}
        </Text>
      </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  button: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
});
