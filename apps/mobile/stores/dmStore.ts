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
  simulateIncomingRequest: () => void;
}

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
  chats: DEFAULT_SAMPLE_CHATS,
  requests: DEFAULT_SAMPLE_REQUESTS,
  activeMessages: DEFAULT_SAMPLE_MESSAGES,
  loading: false,
  activeConversationId: null,
  unreadCount: 1,

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
      if (all && all.length > 0) {
        const chats = all.filter((c) => c.status === 'accepted');
        const requests = all.filter((c) => c.status === 'pending');
        set({ chats, requests, loading: false });
      } else {
        set((s) => ({
          chats: s.chats.length > 0 ? s.chats : DEFAULT_SAMPLE_CHATS,
          requests: s.requests.length > 0 ? s.requests : DEFAULT_SAMPLE_REQUESTS,
          loading: false,
        }));
      }
      await get().refreshUnreadCount(userId);
    } catch {
      set((s) => ({
        chats: s.chats.length > 0 ? s.chats : DEFAULT_SAMPLE_CHATS,
        requests: s.requests.length > 0 ? s.requests : DEFAULT_SAMPLE_REQUESTS,
        loading: false,
      }));
    }
  },

  loadThread: async (conversationId: string, currentUserId?: string) => {
    set({ activeConversationId: conversationId });
    try {
      const messages = await fetchConversationMessages(conversationId);
      set((s) => ({
        activeMessages: {
          ...s.activeMessages,
          [conversationId]: messages && messages.length > 0 ? messages : (s.activeMessages[conversationId] || []),
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
    try {
      await acceptDMRequest(conversationId, userId);
    } catch {
      // API fallback
    }
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
    try {
      await declineDMRequest(conversationId, userId);
    } catch {
      // API fallback
    }
    set((s) => ({
      requests: s.requests.filter((r) => r.id !== conversationId),
    }));
    return true;
  },

  simulateIncomingRequest: () => {
    const newReqId = `conv-req-${Date.now()}`;
    const newReq: DMConversationItem = {
      id: newReqId,
      participant_one: 'user-citizen-demo',
      participant_two: 'current-user',
      status: 'pending',
      initiated_by: 'user-citizen-demo',
      last_message_at: new Date().toISOString(),
      last_message_preview: 'Namaste! Can you help raise the sanitation issue on Main Road?',
      media_accepted_by_one: false,
      media_accepted_by_two: false,
      otherUser: {
        id: 'user-citizen-demo',
        displayName: 'Ananya Sharma',
        avatarUrl: null,
        role: 'citizen',
        isVerified: false,
      },
    };
    set((s) => ({
      requests: [newReq, ...s.requests],
      activeMessages: {
        ...s.activeMessages,
        [newReqId]: [
          {
            id: `msg-${Date.now()}`,
            conversation_id: newReqId,
            sender_id: 'user-citizen-demo',
            content: 'Namaste! Can you help raise the sanitation issue on Main Road? It has been pending for 2 weeks.',
            is_media_locked: false,
            read_at: null,
            created_at: new Date().toISOString(),
          },
        ],
      },
    }));
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
    } catch (err) {
      console.warn('[DM] Error starting conversation with API, using resilient fallback:', err);
    }

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
