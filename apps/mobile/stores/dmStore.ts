import { create } from 'zustand';
import {
  type DMConversationItem,
  type DMMessageItem,
  fetchUserConversations,
  fetchConversationMessages,
  sendDirectMessageToConversation,
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

  loadInbox: (userId: string) => Promise<void>;
  loadThread: (conversationId: string, currentUserId?: string) => Promise<void>;
  refreshUnreadCount: (userId: string, token?: string | null) => Promise<void>;
  sendMessage: (
    conversationId: string,
    senderId: string,
    content: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video' | 'audio' | 'document',
  ) => Promise<DMMessageItem | null>;
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

export const useDMStore = create<DMState>((set, get) => ({
  chats: [],
  requests: [],
  activeMessages: {},
  loading: false,
  activeConversationId: null,
  unreadCount: 0,

  refreshUnreadCount: async (userId: string, token?: string | null) => {
    if (!userId) return;
    try {
      const count = await fetchDMUnreadCount(userId, token);
      set({ unreadCount: count });
    } catch {
      // Ignore count fetch errors
    }
  },

  loadInbox: async (userId: string) => {
    set({ loading: true });
    try {
      const all = await fetchUserConversations(userId);
      const chats = all.filter((c) => c.status === 'accepted');
      const requests = all.filter((c) => c.status === 'pending');
      set({ chats, requests, loading: false });
      await get().refreshUnreadCount(userId);
    } catch {
      set({ loading: false });
    }
  },

  loadThread: async (conversationId: string, currentUserId?: string) => {
    set({ activeConversationId: conversationId });
    try {
      const messages = await fetchConversationMessages(conversationId);
      set((s) => ({
        activeMessages: {
          ...s.activeMessages,
          [conversationId]: messages,
        },
      }));

      // If user opened the thread, mark incoming messages as read and decrement/refresh badge
      if (currentUserId) {
        await markConversationMessagesRead(conversationId, currentUserId);
        await get().refreshUnreadCount(currentUserId);
      }
    } catch (e) {
      console.warn('[DM] Failed to load thread:', e);
    }
  },

  sendMessage: async (conversationId, senderId, content, mediaUrl, mediaType) => {
    const optimisticMsg: DMMessageItem = {
      id: `opt-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      is_media_locked: false,
      created_at: new Date().toISOString(),
    };

    // Optimistic insert
    set((s) => ({
      activeMessages: {
        ...s.activeMessages,
        [conversationId]: [...(s.activeMessages[conversationId] || []), optimisticMsg],
      },
    }));

    const result = await sendDirectMessageToConversation(conversationId, senderId, content, mediaUrl, mediaType);
    if (result) {
      // Replace optimistic message
      set((s) => ({
        activeMessages: {
          ...s.activeMessages,
          [conversationId]: (s.activeMessages[conversationId] || []).map((m) =>
            m.id === optimisticMsg.id ? result : m,
          ),
        },
      }));
      return result;
    }
    return null;
  },

  acceptRequest: async (conversationId, userId) => {
    const success = await acceptDMRequest(conversationId, userId);
    if (success) {
      set((s) => {
        const item = s.requests.find((r) => r.id === conversationId);
        if (!item) return s;
        return {
          requests: s.requests.filter((r) => r.id !== conversationId),
          chats: [{ ...item, status: 'accepted' }, ...s.chats],
        };
      });
    }
    return success;
  },

  declineRequest: async (conversationId, userId) => {
    const success = await declineDMRequest(conversationId, userId);
    if (success) {
      set((s) => ({
        requests: s.requests.filter((r) => r.id !== conversationId),
      }));
    }
    return success;
  },

  blockAndReport: async (userId, targetUserId, reason, description, conversationId) => {
    const success = await blockAndReportDMUser(userId, targetUserId, reason, description, conversationId);
    if (success) {
      set((s) => ({
        chats: s.chats.filter((c) => c.otherUser?.id !== targetUserId),
        requests: s.requests.filter((r) => r.otherUser?.id !== targetUserId),
      }));
    }
    return success;
  },

  startConversationWithUser: async (currentUserId, recipient, initialText) => {
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://kshetra-api-production-9f06.up.railway.app';
      const res = await fetch(`${apiUrl}/api/v1/dm/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
        },
        body: JSON.stringify({
          recipientId: recipient.id,
          initialMessage: initialText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation;
        await get().loadInbox(currentUserId);
        return conv.id;
      }
      return null;
    } catch (err) {
      console.warn('[DM] Error starting conversation:', err);
      return null;
    }
  },
}));
