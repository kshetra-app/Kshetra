import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';
import POLITICAL_SHORTS from '../data/politicalShortsData';
import type { PoliticalShort } from '../data/politicalShortsData';

interface ApprovalRecord {
  userId: string;
  constituencyId: string;
}

interface PoliticalShortsState {
  shorts: PoliticalShort[];
  userApprovals: Record<string, ApprovalRecord[]>; // shortId -> approvals
  flaggedShorts: Record<string, string[]>; // shortId -> userIds who flagged

  // Actions
  addShort: (
    short: Omit<
      PoliticalShort,
      | 'id'
      | 'viewCount'
      | 'likeCount'
      | 'commentCount'
      | 'createdAt'
      | 'visibilityLevel'
      | 'uploadedBy'
    > & { uploadedBy: string }
  ) => void;
  
  approveShort: (shortId: string, userId: string, userConstituencyId: string) => void;
  flagShort: (shortId: string, userId: string) => void;
  incrementViews: (shortId: string) => void;
  resetShorts: () => void;
}

export const usePoliticalShortsStore = create<PoliticalShortsState>()(
  persist(
    (set, get) => ({
      shorts: POLITICAL_SHORTS,
      userApprovals: {},
      flaggedShorts: {},

      addShort: (newShortData) =>
        set((state) => {
          const newShort: PoliticalShort = {
            ...newShortData,
            id: `short-user-${Date.now()}`,
            viewCount: 0,
            likeCount: 0,
            commentCount: 0,
            createdAt: new Date().toISOString(),
            visibilityLevel: 'constituency',
          };
          return {
            shorts: [newShort, ...state.shorts],
          };
        }),

      approveShort: (shortId, userId, userConstituencyId) =>
        set((state) => {
          const currentApprovals = state.userApprovals[shortId] || [];
          
          // Check if already approved by this user
          if (currentApprovals.some((app) => app.userId === userId)) {
            return {};
          }

          const updatedApprovals = [...currentApprovals, { userId, constituencyId: userConstituencyId }];
          
          // Find the short to update
          const shortIndex = state.shorts.findIndex((s) => s.id === shortId);
          if (shortIndex === -1) return {};

          const updatedShorts = [...state.shorts];
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
            shorts: updatedShorts,
          };
        }),

      flagShort: (shortId, userId) =>
        set((state) => {
          const currentFlags = state.flaggedShorts[shortId] || [];
          if (currentFlags.includes(userId)) {
            return {};
          }

          const updatedFlags = [...currentFlags, userId];
          const shortIndex = state.shorts.findIndex((s) => s.id === shortId);
          if (shortIndex === -1) return {};

          const updatedShorts = [...state.shorts];
          const short = { ...updatedShorts[shortIndex] };

          // If flags exceed 5, hide the short from all visibility (essentially soft-delete / suspend)
          if (updatedFlags.length >= 5) {
            updatedShorts.splice(shortIndex, 1); // remove from active list
          } else {
            short.commentCount += 1; // mock visual action updates
            updatedShorts[shortIndex] = short;
          }

          return {
            flaggedShorts: {
              ...state.flaggedShorts,
              [shortId]: updatedFlags,
            },
            shorts: updatedShorts,
          };
        }),

      incrementViews: (shortId) =>
        set((state) => {
          const updatedShorts = state.shorts.map((s) =>
            s.id === shortId ? { ...s, viewCount: s.viewCount + 1 } : s
          );
          return { shorts: updatedShorts };
        }),

      resetShorts: () =>
        set({
          shorts: POLITICAL_SHORTS,
          userApprovals: {},
          flaggedShorts: {},
        }),
    }),
    {
      name: 'kshetra-political-shorts',
      storage: createJSONStorage(() => mmkvStorage),
      // Bump when the seed catalogue changes so existing installs re-seed.
      version: 2,
      migrate: (persisted: any) => ({
        ...(persisted ?? {}),
        shorts: POLITICAL_SHORTS,
        userApprovals: {},
        flaggedShorts: {},
      }),
    }
  )
);
