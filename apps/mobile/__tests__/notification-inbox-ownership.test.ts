jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

import {
  isNotificationInboxOwnedBy,
  migrateNotificationInboxPersistence,
  scopeNotificationInbox,
  selectOwnedNotificationItems,
  selectOwnedUnreadCount,
} from '../lib/notificationInboxOwnership';
import { useNotificationsStore } from '../stores/notifications';

describe('notification inbox account ownership', () => {
  const accountAInbox = {
    ownerUserId: 'account-a',
    items: [{ id: 'notification-a', read: false }],
    unreadCount: 1,
    loading: true,
  };

  it('clears saved rows and unread badges when the active account changes', () => {
    expect(scopeNotificationInbox(accountAInbox, 'account-b')).toEqual({
      ownerUserId: 'account-b',
      items: [],
      unreadCount: 0,
      loading: false,
    });
  });

  it('keeps the inbox intact when the same account remains active', () => {
    expect(scopeNotificationInbox(accountAInbox, 'account-a')).toBe(accountAInbox);
  });

  it('hides an inbox until its persisted owner matches the signed-in account', () => {
    expect(selectOwnedNotificationItems(accountAInbox, 'account-b')).toEqual([]);
    expect(selectOwnedUnreadCount(accountAInbox, 'account-b')).toBe(0);
    expect(selectOwnedNotificationItems(accountAInbox, 'account-a')).toBe(accountAInbox.items);
    expect(selectOwnedUnreadCount(accountAInbox, 'account-a')).toBe(1);
  });

  it('does not adopt legacy unowned inbox rows into a signed-out session', () => {
    const legacyInbox = { ...accountAInbox, ownerUserId: undefined };

    expect(selectOwnedNotificationItems(legacyInbox, null)).toEqual([]);
    expect(selectOwnedUnreadCount(legacyInbox, null)).toBe(0);
    expect(isNotificationInboxOwnedBy(legacyInbox, 'account-a')).toBe(false);
  });

  it('clears legacy persisted inbox rows while keeping notification preferences', () => {
    expect(
      migrateNotificationInboxPersistence(
        {
          items: [{ id: 'old-row', read: false }],
          unreadCount: 1,
          enabled: false,
          categories: { app_updates: false },
        },
        1,
      ),
    ).toMatchObject({
      items: [],
      unreadCount: 0,
      loading: false,
      ownerUserId: null,
      enabled: false,
      categories: { app_updates: false },
    });
  });

  it('wires the store account switch action to clear the former account inbox', () => {
    useNotificationsStore.setState({
      ownerUserId: 'account-a',
      items: [{
        id: 'notification-a',
        title: 'Private alert',
        body: 'Account A only',
        category: 'app_updates',
        timestamp: 1,
        read: false,
      }],
      unreadCount: 1,
      loading: false,
    });

    useNotificationsStore.getState().setOwnerUserId('account-b');

    expect(useNotificationsStore.getState().ownerUserId).toBe('account-b');
    expect(useNotificationsStore.getState().items).toEqual([]);
    expect(useNotificationsStore.getState().unreadCount).toBe(0);
  });
});
