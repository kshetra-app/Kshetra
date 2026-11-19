import React, { useState } from 'react';
import { Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { PostMedia } from '../lib/feedTypes';
import { validWebLink } from '../lib/feedAttachments';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';

export default function FeedAttachment({ item }: { item: PostMedia }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [viewer, setViewer] = useState('');
  const open = async () => {
    try {
      let url = item.url;
      if (item.storagePath) {
        const result = await supabase.storage.from('post-media').createSignedUrl(item.storagePath, 600);
        if (result.error) throw result.error;
        url = result.data.signedUrl;
      }
      if (!validWebLink(url)) throw new Error();
      if (item.mediaType === 'link') await Linking.openURL(url);
      else setViewer(url);
    } catch { Alert.alert(t('common.error'), t('feed.attachmentUnavailable', { defaultValue: 'This attachment could not be opened. Refresh the post and try again.' })); }
  };
  return <>
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={item.altText || item.mediaType} style={styles.preview}>
      {item.mediaType === 'image' && validWebLink(item.url)
        ? <Image source={{ uri: item.url }} style={styles.image} contentFit="cover" />
        : <View style={styles.row}><Ionicons name={item.mediaType === 'video' ? 'play-circle' : item.mediaType === 'link' ? 'link' : 'image'} size={24} color={colors.primary} />
          <Text numberOfLines={2} style={{ flex: 1, color: colors.primary }}>{item.mediaType === 'link' ? item.url : item.altText || item.mediaType}</Text></View>}
    </Pressable>
    {viewer && <Modal visible onRequestClose={() => setViewer('')} animationType="fade">
      <View style={styles.viewer}>
        <Pressable accessibilityRole="button" style={styles.close} onPress={() => setViewer('')}><Text style={{color:'white'}}>{t('common.close')}</Text></Pressable>
        {item.mediaType === 'image'
          ? <Image source={{uri: viewer}} style={styles.full} contentFit="contain" />
          : <WebView style={styles.full} javaScriptEnabled={false} allowsFullscreenVideo allowsInlineMediaPlayback
            source={{html: '<meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:black"><video controls playsinline style="width:100%;height:100vh" src="' + viewer.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;') + '"></video></body>'}} />}
      </View>
    </Modal>}
  </>;
}
const styles = StyleSheet.create({
  preview: { marginVertical: 4, overflow: 'hidden', borderRadius: 10 },
  image: { width: '100%', height: 180 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  viewer: { flex: 1, backgroundColor: 'black', paddingTop: 28 },
  full: { flex: 1 },
  close: { alignSelf: 'flex-end', padding: 16 },
});
