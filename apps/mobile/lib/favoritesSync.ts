/**
 * Favorites Sync — Bridges local MMKV favorites with Supabase
 *
 * Strategy: local-first, cloud-backup
 * 1. All writes go to MMKV immediately (offline-first)
 * 2. When online + authenticated, sync to Supabase favorites table
 * 3. On login, merge cloud favorites with local (union)
 * 4. On conflict, local wins (most recent action)
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { useFavoritesStore } from '../stores/favorites';

export interface SyncResult {
  synced: boolean;
  added: number;
  removed: number;
  merged: number;
  error: string | null;
}

/**
 * Push local favorites to Supabase.
 * Upserts all local favorites, removes cloud-only ones.
 */
export async function pushFavoritesToCloud(userId: string): Promise<SyncResult> {
  if (!isSupabaseConfigured || !userId) {
    return { synced: false, added: 0, removed: 0, merged: 0, error: 'Not configured or not authenticated' };
  }

  try {
    const localIds = useFavoritesStore.getState().favoriteIds;

    // Get current cloud favorites
    const { data: cloudFavs, error: fetchErr } = await supabase
      .from('favorites')
      .select('constituency_ac_no')
      .eq('user_id', userId);

    if (fetchErr) return { synced: false, added: 0, removed: 0, merged: 0, error: fetchErr.message };

    const cloudIds = (cloudFavs ?? []).map((f: any) => f.constituency_ac_no as number);

    // Items to add to cloud
    const toAdd = localIds.filter((id) => !cloudIds.includes(id));
    // Items to remove from cloud (local removed them)
    const toRemove = cloudIds.filter((id) => !localIds.includes(id));

    let added = 0;
    let removed = 0;

    // Add new favorites
    if (toAdd.length > 0) {
      const { error: insertErr } = await supabase.from('favorites').upsert(
        toAdd.map((acNo) => ({
          user_id: userId,
          constituency_ac_no: acNo,
          created_at: new Date().toISOString(),
        })),
        { onConflict: 'user_id,constituency_ac_no' },
      );
      if (!insertErr) added = toAdd.length;
    }

    // Remove unfavorited
    if (toRemove.length > 0) {
      const { error: delErr } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .in('constituency_ac_no', toRemove);
      if (!delErr) removed = toRemove.length;
    }

    return { synced: true, added, removed, merged: 0, error: null };
  } catch (e: any) {
    return { synced: false, added: 0, removed: 0, merged: 0, error: e.message };
  }
}

/**
 * Pull cloud favorites and merge with local.
 * Union strategy: if it's in cloud OR local, keep it.
 */
export async function pullFavoritesFromCloud(userId: string): Promise<SyncResult> {
  if (!isSupabaseConfigured || !userId) {
    return { synced: false, added: 0, removed: 0, merged: 0, error: 'Not configured or not authenticated' };
  }

  try {
    const { data: cloudFavs, error } = await supabase
      .from('favorites')
      .select('constituency_ac_no')
      .eq('user_id', userId);

    if (error) return { synced: false, added: 0, removed: 0, merged: 0, error: error.message };

    const cloudIds = (cloudFavs ?? []).map((f: any) => f.constituency_ac_no as number);
    const localIds = useFavoritesStore.getState().favoriteIds;

    // Union: merge cloud into local
    const merged = new Set([...localIds, ...cloudIds]);
    const newIds = [...merged];
    const addedCount = newIds.length - localIds.length;

    // Update local store
    if (addedCount > 0) {
      useFavoritesStore.setState({ favoriteIds: newIds });
    }

    return { synced: true, added: addedCount, removed: 0, merged: newIds.length, error: null };
  } catch (e: any) {
    return { synced: false, added: 0, removed: 0, merged: 0, error: e.message };
  }
}

/**
 * Full bidirectional sync.
 * Pull cloud → merge local → push back.
 */
export async function syncFavorites(userId: string): Promise<SyncResult> {
  const pullResult = await pullFavoritesFromCloud(userId);
  if (!pullResult.synced) return pullResult;

  const pushResult = await pushFavoritesToCloud(userId);
  return {
    synced: pushResult.synced,
    added: pullResult.added + pushResult.added,
    removed: pushResult.removed,
    merged: pullResult.merged,
    error: pushResult.error,
  };
}
