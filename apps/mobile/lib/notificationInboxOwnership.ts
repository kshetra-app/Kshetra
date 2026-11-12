export interface NotificationInboxOwnershipState<TItem> {
  ownerUserId?: string | null;
  items: TItem[];
  unreadCount: number;
  loading: boolean;
}

const EMPTY_NOTIFICATION_ITEMS: never[] = [];

/** Clear locally persisted inbox rows whenever the active account changes. */
export function scopeNotificationInbox<TState extends NotificationInboxOwnershipState<unknown>>(
  state: TState,
  userId: string | null,
): TState {
  if (state.ownerUserId === userId) return state;

  return {
    ...state,
    ownerUserId: userId,
    items: [],
    unreadCount: 0,
    loading: false,
  } as TState;
}

/** Hide persisted rows until auth and the inbox owner identify the same account. */
export function selectOwnedNotificationItems<TItem>(
  state: NotificationInboxOwnershipState<TItem>,
  userId: string | null,
): TItem[] {
  return state.ownerUserId === userId
    ? state.items
    : (EMPTY_NOTIFICATION_ITEMS as TItem[]);
}

export function selectOwnedUnreadCount<TItem>(
  state: NotificationInboxOwnershipState<TItem>,
  userId: string | null,
): number {
  return state.ownerUserId === userId ? state.unreadCount : 0;
}

export function isNotificationInboxOwnedBy<TItem>(
  state: NotificationInboxOwnershipState<TItem>,
  userId: string,
): boolean {
  return state.ownerUserId === userId;
}

/** Remove pre-ownership cache rows during the persistence schema upgrade. */
export function migrateNotificationInboxPersistence(
  persistedState: unknown,
  version: number,
): Record<string, unknown> {
  const persisted =
    typeof persistedState === 'object' && persistedState !== null && !Array.isArray(persistedState)
      ? (persistedState as Record<string, unknown>)
      : {};

  if (version < 2 || !Object.prototype.hasOwnProperty.call(persisted, 'ownerUserId')) {
    return {
      ...persisted,
      ownerUserId: null,
      items: [],
      unreadCount: 0,
      loading: false,
    };
  }

  return persisted;
}
