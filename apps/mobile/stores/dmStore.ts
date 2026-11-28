import { create } from 'zustand';
import { IS_LIVE_ENVIRONMENT } from '../lib/environment';
import { apiClient } from '../lib/api';
import { useAuthStore } from './auth';
import {
  type DMConversationItem,
  type DMMessageItem,
  fetchUserConversations,
  fetchConversationMessages,
  sendDirectMessageToConversation,
  editDirectMessage,
  acceptDMRequest,
  declineDMRequest,
  blockAndReportDMUser,
  markConversationMessagesRead,
  fetchDMUnreadCount,
} from '../lib/supabaseDataService';

interface DMState {
  chats: DMConversationItem[];
  requests: DMConversationItem[];
  activeMessages: Record<string, DMMessageItem[]>;
  loading: boolean;
  activeConversationId: string | null;
  unreadCount: number;
  inboxUserId: string | null;

  loadInbox: (userId: string, background?: boolean) => Promise<void>;
  loadThread: (conversationId: string, currentUserId: string, markRead: boolean) => Promise<void>;
  refreshUnreadCount: (userId: string, token?: string | null) => Promise<void>;
  sendMessage: (
    conversationId: string,
    senderId: string,
    content: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video' | 'audio' | 'document',
  ) => Promise<DMMessageItem | null>;
  editMessage: (message: DMMessageItem, content: string) => Promise<void>;
  acceptRequest: (conversationId: string, userId: string) => Promise<boolean>;
  declineRequest: (conversationId: string, userId: string) => Promise<boolean>;
  blockAndReport: (
    userId: string,
    targetUserId: string,
    reason: string,
    description?: string,
    conversationId?: string,
  ) => Promise<boolean>;
  startConversationWithUser: (
    currentUserId: string,
    recipient: { id: string; displayName: string; avatarUrl?: string | null; role?: string; isVerified?: boolean },
    initialText?: string,
  ) => Promise<string | null>;
}

let inboxRevision = 0;
let messageRevision = 0;
const isCurrentUser = (userId: string) => useAuthStore.getState().user?.id === userId;

const DEFAULT_SAMPLE_CHATS: DMConversationItem[] = [
  {
    id: 'conv-sample-chat-1',
    participant_one: 'system',
    participant_two: 'current-user',
    status: 'accepted',
    initiated_by: 'system',
    last_message_at: new Date(Date.now() - 3600000).toISOString(),
    last_message_preview: 'Welcome to Poligram Direct Messages! Connect directly with citizens & leaders.',
    media_accepted_by_one: true,
    media_accepted_by_two: true,
    otherUser: {
      id: 'user-civic-desk',
      displayName: 'Poligram Civic Desk',
      avatarUrl: null,
      role: 'verified_official',
      isVerified: true,
    },
  },
];

const DEFAULT_SAMPLE_REQUESTS: DMConversationItem[] = [
  {
    id: 'conv-sample-request-1',
    participant_one: 'user-sample-requester',
    participant_two: 'current-user',
    status: 'pending',
    initiated_by: 'user-sample-requester',
    last_message_at: new Date(Date.now() - 1800000).toISOString(),
    last_message_preview: 'Namaste! Had a quick question regarding the civic development priorities in our ward.',
    media_accepted_by_one: false,
    media_accepted_by_two: false,
    otherUser: {
      id: 'user-sample-requester',
      displayName: 'Ramesh Goud',
      avatarUrl: null,
      role: 'citizen',
      isVerified: false,
    },
  },
];

const DEFAULT_SAMPLE_MESSAGES: Record<string, DMMessageItem[]> = {
  'conv-sample-chat-1': [
    {
      id: 'msg-sample-chat-1',
      conversation_id: 'conv-sample-chat-1',
      sender_id: 'user-civic-desk',
      content: 'Welcome to Poligram Direct Messages! Connect directly with citizens & leaders in your constituency.',
      is_media_locked: false,
      read_at: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  'conv-sample-request-1': [
    {
      id: 'msg-sample-req-1',
      conversation_id: 'conv-sample-request-1',
      sender_id: 'user-sample-requester',
      content: 'Namaste! Had a quick question regarding the civic development priorities in our ward. Can we discuss?',
      is_media_locked: false,
      read_at: null,
      created_at: new Date(Date.now() - 1800000).toISOString(),
    },
  ],
};

export const useDMStore = create<DMState>((set, get) => ({
  chats: IS_LIVE_ENVIRONMENT ? [] : DEFAULT_SAMPLE_CHATS,
  requests: IS_LIVE_ENVIRONMENT ? [] : DEFAULT_SAMPLE_REQUESTS,
  activeMessages: IS_LIVE_ENVIRONMENT ? {} : DEFAULT_SAMPLE_MESSAGES,
  loading: false,
  activeConversationId: null,
  unreadCount: 0,
  inboxUserId: null,

  refreshUnreadCount: async (userId: string, token?: string | null) => {
    if (!isCurrentUser(userId)) return;
    try {
      const count = await fetchDMUnreadCount(userId, token);
      if (isCurrentUser(userId)) set({ unreadCount: count });
    } catch {
      // Ignore count fetch errors
    }
  },

  loadInbox: async (userId: string, background = false) => {
    if (!isCurrentUser(userId)) return;
    const revision = ++inboxRevision;
    const isCurrent = () => isCurrentUser(userId) && revision === inboxRevision;
    if (get().inboxUserId !== userId) {
      const hasPreviousOwner = get().inboxUserId !== null;
      set({
        inboxUserId: userId,
        chats: hasPreviousOwner || IS_LIVE_ENVIRONMENT ? [] : get().chats,
        requests: hasPreviousOwner || IS_LIVE_ENVIRONMENT ? [] : get().requests,
        activeMessages: hasPreviousOwner || IS_LIVE_ENVIRONMENT ? {} : get().activeMessages,
        unreadCount: 0,
      });
    }
    if (!background) set({ loading: true });
    try {
      const all = await fetchUserConversations(userId);
      if (!isCurrent()) return;
      if (all !== null) {
        const chats = all.filter((c) => c.status === 'accepted');
        const requests = all.filter((c) => c.status === 'pending');
        set({ chats, requests, loading: false });
      } else if (!IS_LIVE_ENVIRONMENT) {
        set((s) => ({
          chats: s.chats.length > 0 ? s.chats : DEFAULT_SAMPLE_CHATS,
          requests: s.requests.length > 0 ? s.requests : DEFAULT_SAMPLE_REQUESTS,
          loading: false,
        }));
      } else {
        // Preserve already loaded server data on a transient request failure.
        set({ loading: false });
      }
      await get().refreshUnreadCount(userId);
    } catch {
      if (!isCurrent()) return;
      if (IS_LIVE_ENVIRONMENT) set({ loading: false });
      else set((s) => ({
          chats: s.chats.length > 0 ? s.chats : DEFAULT_SAMPLE_CHATS,
          requests: s.requests.length > 0 ? s.requests : DEFAULT_SAMPLE_REQUESTS,
          loading: false,
        }));
    }
  },

  loadThread: async (conversationId: string, currentUserId: string, markRead: boolean) => {
    if (!isCurrentUser(currentUserId) || get().inboxUserId !== currentUserId) return;
    const revision = messageRevision;
    set({ activeConversationId: conversationId });
    try {
      const messages = await fetchConversationMessages(conversationId);
      if (
        messages === null ||
        !isCurrentUser(currentUserId) ||
        revision !== messageRevision ||
        get().activeConversationId !== conversationId
      ) return;
      set((s) => ({
        activeMessages: {
          ...s.activeMessages,
          [conversationId]: messages,
        },
      }));

      // If user opened the thread, mark incoming messages as read and decrement/refresh badge
      if (markRead && messages.some((message) => message.sender_id !== currentUserId && !message.read_at)) {
        await markConversationMessagesRead(conversationId, currentUserId);
        await get().refreshUnreadCount(currentUserId);
      }
    } catch (e) {
      console.warn('[DM] Failed to load thread:', e);
    }
  },

  sendMessage: async (conversationId, senderId, content, mediaUrl, mediaType) => {
    if (!isCurrentUser(senderId) || get().inboxUserId !== senderId) return null;
    const result = await sendDirectMessageToConversation(conversationId, senderId, content, mediaUrl, mediaType);
    if (!result || !isCurrentUser(senderId)) return null;
    ++messageRevision;
    set((s) => {
      const messages = s.activeMessages[conversationId] || [];
      if (messages.some((message) => message.id === result.id)) return s;
      return { activeMessages: { ...s.activeMessages, [conversationId]: [...messages, result] } };
    });
    return result;
  },

  editMessage: async (message, content) => {
    const senderId = message.sender_id;
    const conversationId = message.conversation_id;
    if (!isCurrentUser(senderId) || get().inboxUserId !== senderId) {
      throw new Error('Message owner changed');
    }
    const saved = await editDirectMessage(message, content);
    if (saved?.id !== message.id || saved.sender_id !== senderId || saved.conversation_id !== conversationId) {
      throw new Error('Message edit was not confirmed');
    }
    if (!isCurrentUser(senderId) || get().inboxUserId !== senderId) return;
    messageRevision++;
    set((state) => ({
      activeMessages: {
        ...state.activeMessages,
        [conversationId]: (state.activeMessages[conversationId] ?? []).map((item) =>
          item.id === message.id ? saved : item),
      },
    }));
    void get().loadInbox(senderId, true);
  },

  acceptRequest: async (conversationId, userId) => {
    const accepted = await acceptDMRequest(conversationId, userId).catch(() => false);
    if (!isCurrentUser(userId) || (!accepted && IS_LIVE_ENVIRONMENT)) return false;
    ++inboxRevision;
    set((s) => {
      const item = s.requests.find((r) => r.id === conversationId);
      if (!item) return s;
      return {
        requests: s.requests.filter((r) => r.id !== conversationId),
        chats: [{ ...item, status: 'accepted' }, ...s.chats],
      };
    });
    return true;
  },

  declineRequest: async (conversationId, userId) => {
    const declined = await declineDMRequest(conversationId, userId).catch(() => false);
    if (!isCurrentUser(userId) || (!declined && IS_LIVE_ENVIRONMENT)) return false;
    ++inboxRevision;
    set((s) => ({
      requests: s.requests.filter((r) => r.id !== conversationId),
    }));
    return true;
  },

  blockAndReport: async (userId, targetUserId, reason, description, conversationId) => {
    const success = await blockAndReportDMUser(userId, targetUserId, reason, description, conversationId);
    if (!isCurrentUser(userId)) return false;
    if (success) {
      ++inboxRevision;
      set((s) => ({
        chats: s.chats.filter((c) => c.otherUser?.id !== targetUserId),
        requests: s.requests.filter((r) => r.otherUser?.id !== targetUserId),
      }));
    }
    return success;
  },

  startConversationWithUser: async (currentUserId, recipient, initialText) => {
    if (!isCurrentUser(currentUserId)) return null;
    try {
      const clientToken = initialText?.trim()
        ? `dm_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`
        : undefined;
      const res = await apiClient.request<{ conversation?: { id?: string } }>(`/api/v1/dm/conversations`, {
        method: 'POST',
        body: {
          recipientId: recipient.id,
          initialMessage: initialText,
          ...(clientToken ? { clientToken } : {}),
        },
      });

      if (!isCurrentUser(currentUserId)) return null;
      if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.conversation?.id) {
        await get().loadInbox(currentUserId);
        return res.data.conversation.id;
      }
    } catch (err) {
      console.warn('[DM] Error starting conversation with API, using resilient fallback:', err);
    }

    if (IS_LIVE_ENVIRONMENT) return null;

    // Resilient fallback: ensure conversation is created locally and user is never blocked
    const fallbackConvId = `conv-${currentUserId}-${recipient.id}`;
    const existing =
      get().chats.find((c) => c.id === fallbackConvId || (c.otherUser && c.otherUser.id === recipient.id)) ||
      get().requests.find((c) => c.id === fallbackConvId || (c.otherUser && c.otherUser.id === recipient.id));

    if (existing) {
      return existing.id;
    }

    const fallbackConv: DMConversationItem = {
      id: fallbackConvId,
      participant_one: currentUserId,
      participant_two: recipient.id,
      status: 'accepted',
      initiated_by: currentUserId,
      last_message_at: new Date().toISOString(),
      last_message_preview: initialText || 'Conversation started',
      media_accepted_by_one: true,
      media_accepted_by_two: true,
      otherUser: {
        id: recipient.id,
        displayName: recipient.displayName,
        avatarUrl: recipient.avatarUrl,
        role: recipient.role,
        isVerified: recipient.isVerified,
      },
    };

    set((s) => ({
      chats: [fallbackConv, ...s.chats.filter((c) => c.id !== fallbackConvId)],
    }));

    if (initialText) {
      get().sendMessage(fallbackConvId, currentUserId, initialText);
    }

    return fallbackConvId;
  },
}));
