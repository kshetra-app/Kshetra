import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';
import POLITICAL_SHORTS from '../data/politicalShortsData';
import type { PoliticalShort } from '../data/politicalShortsData';
import { fetchShorts, incrementShortView, approveShort as approveShortApi, flagShort as flagShortApi } from '../lib/supabaseDataService';
import { enqueue } from '../lib/offlineSync';
import { IS_LIVE_ENVIRONMENT } from '../lib/environment';
import { CONTENT_PAGE_SIZE, type ContentPeriod } from '@kshetra/shared';

const SEEDED_SHORT_IDS = new Set(POLITICAL_SHORTS.map((short) => short.id));

function withoutSeedShorts(value: unknown): PoliticalShort[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (short): short is PoliticalShort =>
      !!short && typeof short === 'object' && typeof short.id === 'string' && !SEEDED_SHORT_IDS.has(short.id),
  );
}

interface ApprovalRecord {
  userId: string;
  constituencyId: string;
}

interface PoliticalShortsState {
  shorts: PoliticalShort[];
  archivedShorts: PoliticalShort[];
  shortsHasMore: Record<ContentPeriod, boolean>;
  shortsLoadingMore: ContentPeriod | null;
  userApprovals: Record<string, ApprovalRecord[]>; // shortId -> approvals
  flaggedShorts: Record<string, string[]>; // shortId -> userIds who flagged

  // Actions
  addShort: (
    short: Omit<PoliticalShort, 'viewCount' | 'likeCount' | 'commentCount' | 'createdAt' | 'visibilityLevel'>
  ) => Promise<void>;
  
  approveShort: (shortId: string, userId: string, userConstituencyId: string) => Promise<void>;
  flagShort: (shortId: string, userId: string) => Promise<void>;
  incrementViews: (shortId: string) => void;
  hydrateShorts: (stateCode?: string, period?: ContentPeriod) => Promise<void>;
  loadMoreShorts: (stateCode?: string, period?: ContentPeriod) => Promise<void>;
  resetShorts: () => void;
}

export const usePoliticalShortsStore = create<PoliticalShortsState>()(
  persist(
    (set, get) => ({
      shorts: IS_LIVE_ENVIRONMENT ? [] : POLITICAL_SHORTS,
      archivedShorts: [],
      shortsHasMore: { recent: true, archive: true },
      shortsLoadingMore: null,
      userApprovals: {},
      flaggedShorts: {},

      addShort: async (newShortData) => {
        const newShort: PoliticalShort = {
          ...newShortData,
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
          createdAt: new Date().toISOString(),
          visibilityLevel: 'constituency',
        };

        set((state) => ({
          shorts: [newShort, ...state.shorts.filter((short) => short.id !== newShort.id)],
        }));
      },

      approveShort: async (shortId, userId, userConstituencyId) => {
        set((state) => {
          const currentApprovals = state.userApprovals[shortId] || [];
          
          // Check if already approved by this user
          if (currentApprovals.some((app) => app.userId === userId)) {
            return {};
          }

          const updatedApprovals = [...currentApprovals, { userId, constituencyId: userConstituencyId }];
          
          // Find the short to update
          const isArchived = state.archivedShorts.some((s) => s.id === shortId);
          const source = isArchived ? state.archivedShorts : state.shorts;
          const shortIndex = source.findIndex((s) => s.id === shortId);
          if (shortIndex === -1) return {};

          const updatedShorts = [...source];
          const short = { ...updatedShorts[shortIndex] };

          // Curation logic based on current visibility level
          if (short.visibilityLevel === 'constituency') {
            // Must be in the same constituency to promote to State level
            if (userConstituencyId === short.constituencyId) {
              const localApprovals = updatedApprovals.filter(
                (app) => app.constituencyId === short.constituencyId
              ).length;

              if (localApprovals >= 3) {
                short.visibilityLevel = 'state';
              }
            }
          } else if (short.visibilityLevel === 'state') {
            // Must be outside the constituency to promote to National level
            if (userConstituencyId !== short.constituencyId) {
              const externalApprovals = updatedApprovals.filter(
                (app) => app.constituencyId !== short.constituencyId
              ).length;

              if (externalApprovals >= 5) {
                short.visibilityLevel = 'national';
              }
            }
          }

          // Increment visual like count
          short.likeCount += 1;
          updatedShorts[shortIndex] = short;

          return {
            userApprovals: {
              ...state.userApprovals,
              [shortId]: updatedApprovals,
            },
            ...(isArchived ? { archivedShorts: updatedShorts } : { shorts: updatedShorts }),
          };
        });

        try {
          const ok = await approveShortApi(shortId, userId, userConstituencyId);
          if (!ok) {
            enqueue('approve_short', { shortId, userId, constituencyId: userConstituencyId });
          }
        } catch {
          enqueue('approve_short', { shortId, userId, constituencyId: userConstituencyId });
        }
      },

      flagShort: async (shortId, userId) => {
        set((state) => {
          const currentFlags = state.flaggedShorts[shortId] || [];
          if (currentFlags.includes(userId)) {
            return {};
          }

          const updatedFlags = [...currentFlags, userId];
          const isArchived = state.archivedShorts.some((s) => s.id === shortId);
          const source = isArchived ? state.archivedShorts : state.shorts;
          const shortIndex = source.findIndex((s) => s.id === shortId);
          if (shortIndex === -1) return {};

          const updatedShorts = [...source];
          const short = { ...updatedShorts[shortIndex] };

          // If flags exceed 5, hide the short from all visibility (essentially soft-delete / suspend)
          if (updatedFlags.length >= 5) {
            updatedShorts.splice(shortIndex, 1); // remove from active list
          } else {
            updatedShorts[shortIndex] = short;
          }

          return {
            flaggedShorts: {
              ...state.flaggedShorts,
              [shortId]: updatedFlags,
            },
            ...(isArchived ? { archivedShorts: updatedShorts } : { shorts: updatedShorts }),
          };
        });

        try {
          const ok = await flagShortApi(shortId, userId);
          if (!ok) {
            enqueue('flag_short', { shortId, userId });
          }
        } catch {
          enqueue('flag_short', { shortId, userId });
        }
      },

      incrementViews: (shortId) => {
        incrementShortView(shortId).catch(() => {});
        set((state) => {
          const updatedShorts = state.shorts.map((s) =>
            s.id === shortId ? { ...s, viewCount: s.viewCount + 1 } : s
          );
          const updatedArchivedShorts = state.archivedShorts.map((s) =>
            s.id === shortId ? { ...s, viewCount: s.viewCount + 1 } : s
          );
          return { shorts: updatedShorts, archivedShorts: updatedArchivedShorts };
        });
      },

      hydrateShorts: async (stateCode?: string, period: ContentPeriod = 'recent') => {
        try {
          const remoteShorts = await fetchShorts(stateCode, period, 0, CONTENT_PAGE_SIZE);
          if (Array.isArray(remoteShorts) && (IS_LIVE_ENVIRONMENT || remoteShorts.length > 0)) {
            set((state) => ({
              ...(period === 'archive' ? { archivedShorts: remoteShorts } : { shorts: remoteShorts }),
              shortsHasMore: { ...state.shortsHasMore, [period]: remoteShorts.length === CONTENT_PAGE_SIZE },
            }));
          }
        } catch (err) {
          console.warn('[PoliticalShortsStore] Failed to hydrate shorts, using cache:', err);
        }
      },

      loadMoreShorts: async (stateCode?: string, period: ContentPeriod = 'recent') => {
        const state = get();
        if (!IS_LIVE_ENVIRONMENT || state.shortsLoadingMore || !state.shortsHasMore[period]) return;
        const offset = period === 'archive' ? state.archivedShorts.length : state.shorts.length;
        set({ shortsLoadingMore: period });
        try {
          const nextPage = await fetchShorts(stateCode, period, offset, CONTENT_PAGE_SIZE);
          if (!Array.isArray(nextPage)) return;
          set((current) => {
            const existing = period === 'archive' ? current.archivedShorts : current.shorts;
            const seen = new Set(existing.map((short) => short.id));
            const additions = nextPage.filter((short: PoliticalShort) => !seen.has(short.id));
            return {
              ...(period === 'archive'
                ? { archivedShorts: [...current.archivedShorts, ...additions] }
                : { shorts: [...current.shorts, ...additions] }),
              shortsHasMore: { ...current.shortsHasMore, [period]: nextPage.length === CONTENT_PAGE_SIZE },
            };
          });
        } catch (err) {
          console.warn('[PoliticalShortsStore] Failed to load more shorts:', err);
        } finally {
          set({ shortsLoadingMore: null });
        }
      },

      resetShorts: () =>
        set({
          shorts: IS_LIVE_ENVIRONMENT ? [] : POLITICAL_SHORTS,
          archivedShorts: [],
          shortsHasMore: { recent: true, archive: true },
          shortsLoadingMore: null,
          userApprovals: {},
          flaggedShorts: {},
        }),
    }),
    {
      name: 'kshetra-political-shorts',
      storage: createJSONStorage(() => mmkvStorage),
      // Bump when the seed catalogue changes so existing installs re-seed.
      version: 5,
      migrate: (persisted: any) => ({
        ...(persisted ?? {}),
        shorts: IS_LIVE_ENVIRONMENT
          ? withoutSeedShorts(persisted?.shorts)
          : POLITICAL_SHORTS,
        archivedShorts: IS_LIVE_ENVIRONMENT ? withoutSeedShorts(persisted?.archivedShorts) : [],
        shortsHasMore: { recent: true, archive: true },
        shortsLoadingMore: null,
        userApprovals: {},
        flaggedShorts: {},
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<PoliticalShortsState>;
        return {
          ...currentState,
          ...persisted,
          // Cached fixture content from older releases must never appear in live builds.
          shorts: IS_LIVE_ENVIRONMENT
            ? withoutSeedShorts(persisted.shorts)
            : persisted.shorts ?? currentState.shorts,
          archivedShorts: IS_LIVE_ENVIRONMENT
            ? withoutSeedShorts(persisted.archivedShorts)
            : persisted.archivedShorts ?? currentState.archivedShorts,
          shortsHasMore: persisted.shortsHasMore ?? currentState.shortsHasMore,
          shortsLoadingMore: null,
        };
      },
    }
  )
);
