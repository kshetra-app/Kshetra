import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AlertCategory } from '../lib/notifications';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: AlertCategory;
  timestamp: number;
  read: boolean;
  data?: Record<string, unknown>;
}

interface NotificationsState {
  /** In-app notification inbox */
  items: NotificationItem[];
  /** Per-category enable/disable */
  categories: Record<AlertCategory, boolean>;
  /** Global notifications enabled */
  enabled: boolean;
  /** Unread count */
  unreadCount: number;
  /** Fetching state */
  loading: boolean;

  toggleEnabled: () => void;
  toggleCategory: (cat: AlertCategory) => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  fetchNotifications: (userId: string) => Promise<void>;
  markRead: (id: string, userId?: string) => Promise<void>;
  markAllRead: (userId?: string) => Promise<void>;
  clearAll: () => void;
  subscribeToUserNotifications: (userId: string) => () => void;
}

function mapTriggerToCategory(trigger: string): AlertCategory {
  switch (trigger) {
    case 'issue_status_change':
    case 'issue_upvote_milestone':
      return 'civic_issue';
    case 'new_headline':
      return 'constituency_updates';
    case 'post_reply':
    case 'comment_reply':
    case 'reaction':
      return 'community_activity';
    case 'poll_closed':
      return 'election_results';
    case 'constituency_alert':
      return 'constituency_updates';
    default:
      return 'app_updates';
  }
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: [],
      categories: {
        election_results: true,
        constituency_updates: true,
        new_state_added: true,
        app_updates: true,
        civic_issue: true,
        promise_update: true,
        delimitation_alert: true,
        analytics_insight: true,
        community_activity: true,
      },
      enabled: true,
      unreadCount: 0,
      loading: false,

      toggleEnabled: () =>
        set((s) => ({ enabled: !s.enabled })),

      toggleCategory: (cat) =>
        set((s) => ({
          categories: {
            ...s.categories,
            [cat]: !s.categories[cat],
          },
        })),

      addNotification: (item) =>
        set((s) => {
          const newItem: NotificationItem = {
            ...item,
            id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: Date.now(),
            read: false,
          };
          const items = [newItem, ...s.items].slice(0, 50);
          return {
            items,
            unreadCount: items.filter((n) => !n.read).length,
          };
        }),

      fetchNotifications: async (userId: string) => {
        if (!isSupabaseConfigured || !userId) return;
        set({ loading: true });
        try {
          const { data, error } = await supabase
            .from('notification_log')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

          if (error) throw error;
          if (data) {
            const mapped: NotificationItem[] = data.map((row) => ({
              id: row.id,
              title: row.title,
              body: row.body,
              category: mapTriggerToCategory(row.trigger_type),
              timestamp: new Date(row.created_at).getTime(),
              read: Boolean(row.read),
              data: (row.data as Record<string, unknown>) || undefined,
            }));
            set({
              items: mapped,
              unreadCount: mapped.filter((n) => !n.read).length,
              loading: false,
            });
          }
        } catch (err) {
          console.warn('[NotificationsStore] Failed to fetch notification_log:', err);
          set({ loading: false });
        }
      },

      markRead: async (id: string, userId?: string) => {
        set((s) => {
          const items = s.items.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          );
          return {
            items,
            unreadCount: items.filter((n) => !n.read).length,
          };
        });

        if (isSupabaseConfigured && !id.startsWith('notif-')) {
          try {
            await supabase
              .from('notification_log')
              .update({ read: true, read_at: new Date().toISOString() })
              .eq('id', id);
          } catch (err) {
            console.warn('[NotificationsStore] Failed to mark read in Supabase:', err);
          }
        }
      },

      markAllRead: async (userId?: string) => {
        set((s) => ({
          items: s.items.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));

        if (isSupabaseConfigured && userId) {
          try {
            await supabase
              .from('notification_log')
              .update({ read: true, read_at: new Date().toISOString() })
              .eq('user_id', userId)
              .eq('read', false);
          } catch (err) {
            console.warn('[NotificationsStore] Failed to mark all read in Supabase:', err);
          }
        }
      },

      clearAll: () =>
        set({ items: [], unreadCount: 0 }),

      subscribeToUserNotifications: (userId: string) => {
        if (!isSupabaseConfigured || !userId) return () => {};

        const channel = supabase
          .channel(`user-notif-${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notification_log',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const row = payload.new as any;
              const newItem: NotificationItem = {
                id: row.id,
                title: row.title,
                body: row.body,
                category: mapTriggerToCategory(row.trigger_type),
                timestamp: new Date(row.created_at).getTime(),
                read: Boolean(row.read),
                data: row.data || undefined,
              };

              set((s) => {
                const existing = s.items.find((i) => i.id === newItem.id);
                if (existing) return s;
                const items = [newItem, ...s.items].slice(0, 50);
                return {
                  items,
                  unreadCount: items.filter((n) => !n.read).length,
                };
              });
            },
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      },
    }),
    {
      name: 'kshetra-notifications',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
