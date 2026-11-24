import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { apiClient, ApiError } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';
import { useAuthStore } from '../../stores/auth';

type Publication = {
  id: string;
  client_request_id: string;
  message: string;
  media_type: 'image' | 'video' | null;
  publish_at: string;
  status: 'scheduled' | 'sending' | 'processing' | 'published' | 'rejected' | 'verifying' | 'cancelled';
  provider_post_id: string | null;
  permalink_url: string | null;
};
type Status = { available: false } | {
  available: true;
  publications: Publication[];
  requestId: string;
};
const authPolicy = { authPolicy: 'authenticated' as const };

function localTime(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const value = new Date(year, month - 1, day, hour, minute);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day ||
    value.getHours() !== hour || value.getMinutes() !== minute || value.getTime() <= Date.now()) {
    return null;
  }
  return value;
}

export default function CampaignFacebookComposer({ path, pageName }: {
  path: string;
  pageName: string | null;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const userId = useAuthStore(s => s.user?.id);
  const endpoint = path + '/publications';
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState('');
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [schedule, setSchedule] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const draftId = useRef<string | null>(null);
  const [locked, setLocked] = useState(false);

  const refresh = useCallback(async () => {
    const result = await apiClient.get<Status>(endpoint, authPolicy);
    if (!mounted.current) return;
    setStatus(result.data);
    if (result.data.available && !draftId.current) draftId.current = result.data.requestId;
  }, [endpoint]);

  useEffect(() => {
    mounted.current = true;
    void refresh().catch(() => {});
    return () => { mounted.current = false; };
  }, [refresh]);

  const pending = status?.available && status.publications.some(
    row => row.status === 'sending' || row.status === 'processing' ||
      (row.status === 'scheduled' && Date.parse(row.publish_at) <= Date.now() + 60_000),
  );
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => { void refresh().catch(() => {}); }, 7000);
    return () => clearInterval(timer);
  }, [pending, refresh]);

  async function pickMedia() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.85,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const allowed = ['image/jpeg', 'image/png', 'video/mp4'];
      if (!allowed.includes(asset?.mimeType ?? '')) {
        throw new Error(t('campaignManager.facebookAttachmentFormats', {
          defaultValue: 'Choose a JPEG, PNG, or MP4 file.',
        }));
      }
      setMedia(asset);
    } catch (error) {
      if (mounted.current) setNotice(error instanceof Error ? error.message : t('common.error'));
    }
  }

  async function perform(work: () => Promise<void>) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setNotice(null);
    try {
      await work();
    } catch (error) {
      if (mounted.current) setNotice(error instanceof Error ? error.message : t('common.error'));
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function confirmSubmit() {
    if (!pageName || !userId || !draftId.current || !status?.available) return;
    if (!message.trim() && !media) {
      setNotice(t('campaignManager.facebookEmptyPost', { defaultValue: 'Write a message or attach media.' }));
      return;
    }
    const when = schedule ? localTime(date, time) : null;
    if (schedule && !when) {
      setNotice(t('campaignManager.facebookScheduleError', { defaultValue: 'Enter a valid date and time in the future.' }));
      return;
    }
    const label = schedule
      ? t('campaignManager.facebookConfirmSchedule', { defaultValue: 'Schedule for {{page}}?', page: pageName })
      : t('campaignManager.facebookConfirmPublish', { defaultValue: 'Publish to {{page}}?', page: pageName });
    const caption = when ? when.toLocaleString() : message.trim();
    Alert.alert(label, caption, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: schedule ? t('campaignManager.facebookSchedule', { defaultValue: 'Schedule' })
          : t('campaignManager.facebookPublish', { defaultValue: 'Publish' }),
        onPress: () => { void perform(async () => {
          const requestId = draftId.current;
          if (!requestId) return;
          let attachment: { path: string; type: 'image' | 'video' } | undefined;
          if (media) {
            const type = media.mimeType === 'video/mp4' ? 'video' : 'image';
            const file = new File(media.uri);
            const limit = (type === 'video' ? 25 : 10) * 1024 * 1024;
            if (!file.exists || !file.size || file.size > limit) {
              throw new Error(t('campaignManager.facebookAttachmentSize', {
                defaultValue: 'Choose a photo up to 10 MB or an MP4 up to 25 MB.',
              }));
            }
            const draftUpload = await apiClient.post<{ path: string; token: string }>(
              endpoint + '/attachment', { requestId, contentType: media.mimeType }, authPolicy,
            );
            const { path, token } = draftUpload.data;
            const { error } = await supabase.storage.from('post-media').uploadToSignedUrl(
              path, token, await file.arrayBuffer(), { contentType: media.mimeType, upsert: false },
            );
            if (error && !/already exists|duplicate/i.test(error.message)) {
              throw new Error(t('campaignManager.facebookAttachmentError', {
                defaultValue: 'The attachment could not be uploaded. Check your connection and retry.',
              }));
            }
            attachment = { path, type };
          }
          // Keep the draft and its request ID together after any uncertain network response.
          setLocked(true);
          try {
            await apiClient.post(endpoint, {
              requestId, message: message.trim(), publishAt: when?.toISOString(), attachment,
            }, authPolicy);
          } catch (error) {
            if (error instanceof ApiError && [400, 401, 403, 422].includes(error.statusCode)) {
              // A definitive validation error can be corrected without reusing an uploaded object.
              draftId.current = null;
              setLocked(false);
              await refresh().catch(() => {});
            }
            throw error;
          }
          if (!mounted.current) return;
          draftId.current = null;
          setLocked(false);
          setMessage('');
          setMedia(null);
          setSchedule(false);
          setDate('');
          setTime('');
          await refresh();
        }); },
      },
    ]);
  }

  if (!status?.available) return null;

  const button = (label: string, onPress: () => void, disabled = busy) => (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={[styles.button, { borderColor: colors.border, opacity: disabled ? 0.5 : 1 }]}>
      <Text style={{ color: colors.primary, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
  const fieldStyle = [styles.input, { borderColor: colors.border, color: colors.text }];
  const dateLabel = t('campaignManager.facebookDate', { defaultValue: 'Date (YYYY-MM-DD)' });
  const timeLabel = t('campaignManager.facebookTime', { defaultValue: 'Local time (HH:mm, 24-hour)' });

  return <View style={styles.panel}>
    {pageName && <>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('campaignManager.facebookNewPost', { defaultValue: 'New Facebook post' })}
      </Text>
      <TextInput accessibilityLabel={t('campaignManager.facebookPostMessage', { defaultValue: 'Post message' })}
        placeholder={t('campaignManager.facebookPostMessage', { defaultValue: 'Post message' })}
        placeholderTextColor={colors.textSecondary} multiline maxLength={5000}
        editable={!busy && !locked} value={message} onChangeText={setMessage}
        style={[fieldStyle, styles.message]} />
      {media
        ? <><Text style={{ color: colors.text }}>{media.fileName ?? media.mimeType}</Text>
          {button(t('campaignManager.facebookRemoveMedia', { defaultValue: 'Remove attachment' }), () => setMedia(null), busy || locked)}</>
        : button(t('campaignManager.facebookAddMedia', { defaultValue: 'Attach a photo or video' }), () => { void pickMedia(); }, busy || locked)}
      {button(schedule ? t('campaignManager.facebookSendNow', { defaultValue: 'Switch to publish now' })
        : t('campaignManager.facebookChooseTime', { defaultValue: 'Set a date and time' }),
      () => setSchedule(!schedule), busy || locked)}
      {schedule && <>
        <TextInput accessibilityLabel={dateLabel} placeholder={dateLabel} placeholderTextColor={colors.textSecondary}
          editable={!busy && !locked} value={date} onChangeText={setDate} maxLength={10} style={fieldStyle} />
        <TextInput accessibilityLabel={timeLabel} placeholder={timeLabel} placeholderTextColor={colors.textSecondary}
          editable={!busy && !locked} value={time} onChangeText={setTime} maxLength={5} style={fieldStyle} />
      </>}
      {button(schedule ? t('campaignManager.facebookSchedule', { defaultValue: 'Schedule' })
        : t('campaignManager.facebookPublish', { defaultValue: 'Publish' }), confirmSubmit)}
    </>}
    {notice && <Text accessibilityLiveRegion="polite" style={{ color: colors.text }}>{notice}</Text>}
    <Text style={[styles.title, { color: colors.text }]}>
      {t('campaignManager.facebookPublicationHistory', { defaultValue: 'Facebook publishing history' })}
    </Text>
    {status.publications.length === 0 && <Text style={{ color: colors.textSecondary }}>
      {t('campaignManager.facebookNoPublications', { defaultValue: 'This campaign has no Facebook posts yet.' })}
    </Text>}
    {status.publications.map(row => <View key={row.id} style={[styles.record, { borderColor: colors.border }]}>
      <Text style={{ color: colors.text }} numberOfLines={3}>{row.message || t('campaignManager.facebookMediaPost', { defaultValue: 'Media post' })}</Text>
      <Text style={{ color: colors.textSecondary }}>
        {t('campaignManager.facebookState.' + row.status, { defaultValue: {
          scheduled: 'Queued', sending: 'Sending', processing: 'Facebook is processing the video',
          published: 'Published', rejected: 'Could not publish', verifying: 'Check Facebook before sending again',
          cancelled: 'Cancelled',
        }[row.status] })} · {new Date(row.publish_at).toLocaleString()}
      </Text>
      {row.permalink_url && /^https:\/\/(?:www\.)?facebook\.com\//.test(row.permalink_url) &&
        button(t('campaignManager.facebookViewPost', { defaultValue: 'View post on Facebook' }),
          () => { void perform(async () => { await Linking.openURL(row.permalink_url!); }); })}
      {row.status === 'scheduled' && button(t('campaignManager.facebookCancelSchedule', { defaultValue: 'Cancel scheduled post' }),
        () => { void perform(async () => { await apiClient.delete(endpoint + '/' + row.id, authPolicy); await refresh(); }); })}
    </View>)}
    {button(t('common.refresh', { defaultValue: 'Refresh' }), () => { void perform(refresh); })}
  </View>;
}

const styles = StyleSheet.create({
  panel: { gap: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  input: { minHeight: 44, padding: 12, borderWidth: 1, borderRadius: 10 },
  message: { minHeight: 90, textAlignVertical: 'top' },
  record: { gap: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
});
