import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../lib/api';
import { useTheme } from '../../lib/theme';
import CampaignFacebookComposer from './CampaignFacebookComposer';
import CampaignPublishingAccess from './CampaignPublishingAccess';

interface Receipt {
  status: 'sending' | 'published' | 'rejected' | 'verifying';
  provider_post_id: string | null;
  permalink_url: string | null;
}

type PublishingStatus = { available: false } | {
  available: true;
  page: { page_id: string; page_name: string } | null;
  receipt: Receipt | null;
  testMessage: string;
  publishingEnabled?: boolean;
};

export default function FacebookStagingPublishing({ campaignId }: { campaignId?: string | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [status, setStatus] = useState<PublishingStatus | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const pending = useRef(false);
  const active = useRef(false);
  const reads = useRef(0);
  const path = campaignId ? `/api/v1/campaign/campaigns/${encodeURIComponent(campaignId)}/facebook` : null;

  const refresh = useCallback(async () => {
    if (!path) return;
    const read = ++reads.current;
    setLoading(true);
    setError(false);
    try {
      const result = await apiClient.get<PublishingStatus>(path, { authPolicy: 'authenticated' });
      if (active.current && read === reads.current) setStatus(result.data);
    } catch {
      if (active.current && read === reads.current) setError(true);
    } finally {
      if (active.current && read === reads.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    active.current = true;
    void refresh();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      active.current = false;
      listener.remove();
    };
  }, [refresh]);

  async function perform(action: () => Promise<unknown>) {
    if (pending.current) return;
    pending.current = true;
    setWorking(true);
    try {
      await action();
    } catch (err) {
      if (active.current) {
        Alert.alert(t('common.error'), err instanceof Error ? err.message : undefined);
      }
    } finally {
      pending.current = false;
      if (active.current) {
        setWorking(false);
        await refresh();
      }
    }
  }

  const action = (label: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" disabled={working} onPress={onPress}
      style={[styles.button, { borderColor: colors.border, opacity: working ? 0.5 : 1 }]}>
      <Text style={[styles.actionText, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );

  const connected = status?.available && status.page;
  const receipt = status?.available ? status.receipt : null;

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
        {t('campaignManager.serviceMeta', { defaultValue: 'Facebook Page' })}
      </Text>
      {!path ? (
        <Text style={{ color: colors.textSecondary }}>
          {t('campaignManager.facebookChooseCampaign', { defaultValue: 'Select a campaign you own to manage its Facebook connection.' })}
        </Text>
      ) : (
        <>
          {loading && <ActivityIndicator color={colors.primary} />}
          {error && action(t('campaignManager.facebookRetry', { defaultValue: 'Could not load Facebook publishing. Retry' }), () => void refresh())}
          {!error && status?.available === false && (
            <Text style={{ color: colors.textSecondary }}>
              {t('campaignManager.facebookUnavailable', { defaultValue: 'Facebook test publishing is unavailable in this environment.' })}
            </Text>
          )}
          {!error && status?.available && (
            <>
              {connected ? (
                <>
                  <Text style={[styles.actionText, { color: colors.text }]}>{connected.page_name}</Text>
                  {action(t('campaignManager.facebookDisconnect', { defaultValue: 'Disconnect Page' }), () => {
                    Alert.alert(t('campaignManager.facebookConfirmDisconnect', { defaultValue: 'Disconnect this Facebook Page?' }), undefined, [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('campaignManager.facebookDisconnect', { defaultValue: 'Disconnect Page' }),
                        onPress: () => void perform(() => apiClient.delete(path + '/connection', { authPolicy: 'authenticated' })),
                      },
                    ]);
                  })}
                </>
              ) : action(t('campaignManager.facebookConnect', { defaultValue: 'Connect the Staging Page' }), () => void perform(async () => {
                const { data } = await apiClient.post<{ authorizationUrl: string }>(path + '/connect', undefined, { authPolicy: 'authenticated' });
                const url = new URL(data.authorizationUrl);
                if (url.protocol !== 'https:' || url.hostname !== 'www.facebook.com' || !url.pathname.endsWith('/dialog/oauth')) {
                  throw new Error(t('campaignManager.facebookInvalidLink', { defaultValue: 'Facebook authorization could not be opened.' }));
                }
                await Linking.openURL(url.href);
              }))}
              {receipt?.status === 'published' ? (
                <>
                  <Text selectable style={{ color: colors.text }}>
                    {t('campaignManager.facebookReceipt', { defaultValue: 'Facebook post ID: {{id}}', id: receipt.provider_post_id })}
                  </Text>
                  {receipt.permalink_url && action(t('campaignManager.facebookViewPost', { defaultValue: 'View post on Facebook' }), () => {
                    if (receipt.permalink_url) void Linking.openURL(receipt.permalink_url).catch(() => {});
                  })}
                </>
              ) : receipt?.status === 'sending' || receipt?.status === 'verifying' ? (
                <Text style={{ color: colors.textSecondary }}>
                  {t('campaignManager.facebookAwaitingConfirmation', { defaultValue: 'The test post is awaiting Facebook confirmation. Check the Page before taking further action.' })}
                </Text>
              ) : connected && !status.publishingEnabled && (
                <>
                  <Text style={{ color: colors.textSecondary }}>{status.testMessage}</Text>
                  {receipt?.status === 'rejected' && (
                    <Text style={{ color: colors.textSecondary }}>
                      {t('campaignManager.facebookRejected', { defaultValue: 'Facebook declined the previous test. Check the Page permissions.' })}
                    </Text>
                  )}
                  {action(t('campaignManager.facebookPublishTest', { defaultValue: 'Publish test post' }), () => {
                    Alert.alert(
                      t('campaignManager.facebookConfirmPublish', { defaultValue: 'Publish to {{page}}?', page: connected.page_name }),
                      status.testMessage,
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('campaignManager.facebookPublishTest', { defaultValue: 'Publish test post' }),
                          onPress: () => void perform(() => apiClient.post(path + '/test-post', undefined, { authPolicy: 'authenticated' })),
                        },
                      ],
                    );
                  })}
                </>
              )}
              {status.publishingEnabled && (
                <>
                  <CampaignPublishingAccess path={path} />
                  <CampaignFacebookComposer path={path} pageName={connected ? connected.page_name : null} />
                </>
              )}
              {action(t('common.refresh', { defaultValue: 'Refresh' }), () => void refresh())}
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 16, borderWidth: 1, borderRadius: 14, gap: 12 },
  heading: { fontSize: 19, fontWeight: '700' },
  actionText: { fontWeight: '700', fontSize: 15 },
  button: { minHeight: 44, borderRadius: 10, borderWidth: 1, padding: 12, justifyContent: 'center' },
});
