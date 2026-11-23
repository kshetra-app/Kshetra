import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CONTENT_PAGE_SIZE } from '@kshetra/shared';
import { PartyAction } from './PartyActions';
import PostCard from './PostCard';
import PostDetailModal from './PostDetailModal';
import { fetchPartyPagePosts } from '../lib/supabaseDataService';
import { mapSupabasePost, useFeedStore } from '../stores/feed';
import { useTheme } from '../lib/theme';
import type { Post, ReactionType } from '../lib/feedTypes';
import { gateContentAction } from '../lib/contentAccountability';

export default function PartyPagePosts({ pageId, viewerId }: { pageId: string; viewerId?: string }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState<{ id: string; reply: boolean } | null>(null);
  const writing = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    setBusy(true);
    setFailed(false);
    void fetchPartyPagePosts(pageId, viewerId, CONTENT_PAGE_SIZE + 1, offset).then((rows) => {
      if (!active) return;
      const page = rows.slice(0, CONTENT_PAGE_SIZE).map(mapSupabasePost);
      setPosts((old) => offset ? [...new Map([...old, ...page].map((item) => [item.id, item])).values()] : page);
      setMore(rows.length > CONTENT_PAGE_SIZE);
    }).catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [pageId, viewerId, offset, revision]);

  const refresh = () => {
    setOffset(0);
    setRevision((previous) => previous + 1);
  };
  const react = async (post: Post, reaction: ReactionType) => {
    if (writing.current.has(post.id) || !gateContentAction('react_post')) return;
    writing.current.add(post.id);
    try {
      const saved = await useFeedStore.getState().toggleReaction(post.id, reaction, post);
      if (!saved) throw new Error();
      refresh();
    } catch {
      Alert.alert(t('common.error'), t('partyRegistry.reactionFailure', { defaultValue: 'Could not save the reaction.' }));
    } finally {
      writing.current.delete(post.id);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{t('partyRegistry.pagePosts', { defaultValue: 'Page posts' })}</Text>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onPress={() => setDetail({ id: post.id, reply: false })}
          onReply={() => setDetail({ id: post.id, reply: true })} onReact={(value) => void react(post, value)} />
      ))}
      {busy && <ActivityIndicator color={colors.primary} />}
      {!busy && failed && <PartyAction label={t('partyRegistry.retryPosts', { defaultValue: 'Could not load posts. Retry' })}
        onPress={() => setRevision(revision + 1)} />}
      {!busy && !failed && !posts.length && (
        <Text style={{ color: colors.textMuted }}>{t('partyRegistry.noPosts', { defaultValue: 'This Page has no published posts yet.' })}</Text>
      )}
      {!busy && !failed && more && (
        <PartyAction label={t('partyRegistry.morePosts', { defaultValue: 'Load more posts' })}
          onPress={() => setOffset((previous) => previous + CONTENT_PAGE_SIZE)} />
      )}
      {detail && (
        <PostDetailModal visible autoFocusReply={detail.reply} post={posts.find((post) => post.id === detail.id) ?? null}
          onClose={() => { setDetail(null); refresh(); }} onPostChanged={refresh} />
      )}
    </View>
  );
}
