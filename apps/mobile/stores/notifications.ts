import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AlertCategory } from '../lib/notifications';

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

  toggleEnabled: () => void;
  toggleCategory: (cat: AlertCategory) => void;
  addNotification: (item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
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

      markRead: (id) =>
        set((s) => {
          const items = s.items.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          );
          return {
            items,
            unreadCount: items.filter((n) => !n.read).length,
          };
        }),

      markAllRead: () =>
        set((s) => ({
          items: s.items.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      clearAll: () =>
        set({ items: [], unreadCount: 0 }),
    }),
    {
      name: 'kshetra-notifications',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
