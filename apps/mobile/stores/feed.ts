import { create } from 'zustand';
import type { Post, Comment, ReactionType, PostType, PostMedia } from '../lib/feedTypes';

/**
 * Seed posts for offline-first demo feed.
 * In production, these would come from Supabase.
 */
const SEED_POSTS: Post[] = [
  {
    id: 'seed-1',
    author: { id: 'system', displayName: 'Kshetra Updates', isVerified: true },
    stateCode: 'TS',
    content: 'Welcome to Kshetra! This is the community feed for political discussions in Telangana. Share your views on local governance, ask questions about your constituency, and stay informed.',
    type: 'alert',
    replyCount: 0,
    reactionCount: 42,
    isPinned: true,
    isDeleted: false,
    createdAt: '2026-04-28T10:00:00Z',
    updatedAt: '2026-04-28T10:00:00Z',
    hashtags: ['telangana', 'kshetra', 'welcome'],
  },
  {
    id: 'seed-2',
    author: { id: 'demo-1', displayName: 'Priya Reddy' },
    stateCode: 'TS',
    constituencyId: 'TS-AC-67',
    constituencyName: 'Serilingampally',
    content: 'Road construction on ORR service road near Gachibowli has been stalled for 3 months. Which department should we escalate to? The MLA office says GHMC, GHMC says NHAI. Classic runaround. #infrastructure #serilingampally',
    type: 'question',
    replyCount: 8,
    reactionCount: 23,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-29T06:30:00Z',
    updatedAt: '2026-04-29T06:30:00Z',
    hashtags: ['infrastructure', 'serilingampally'],
  },
  {
    id: 'seed-3',
    author: { id: 'demo-2', displayName: 'Ravi Kumar' },
    stateCode: 'TS',
    constituencyId: 'TS-AC-75',
    constituencyName: 'Goshamahal',
    content: 'Attended the constituency-level review meeting today. Some interesting stats: 43 new ration cards issued this month, 12 pending pension cases cleared. Progress is slow but visible. #goshamahal #governance',
    type: 'discussion',
    replyCount: 3,
    reactionCount: 15,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-29T05:00:00Z',
    updatedAt: '2026-04-29T05:00:00Z',
    hashtags: ['goshamahal', 'governance'],
  },
  {
    id: 'seed-4',
    author: { id: 'demo-3', displayName: 'Meena Devi' },
    stateCode: 'TS',
    content: 'Do you think the 10 BRS→INC defections have changed the ground-level governance in those constituencies?',
    type: 'poll',
    replyCount: 12,
    reactionCount: 31,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-29T04:00:00Z',
    updatedAt: '2026-04-29T04:00:00Z',
    hashtags: ['defections', 'brs', 'inc'],
    poll: {
      id: 'poll-1',
      question: 'Do you think the 10 BRS→INC defections have changed the ground-level governance in those constituencies?',
      options: [
        { id: 'opt-1a', label: 'Yes, positive change visible', voteCount: 34, sortOrder: 0 },
        { id: 'opt-1b', label: 'No difference at all', voteCount: 58, sortOrder: 1 },
        { id: 'opt-1c', label: 'Made things worse', voteCount: 21, sortOrder: 2 },
        { id: 'opt-1d', label: 'Too early to tell', voteCount: 47, sortOrder: 3 },
      ],
      totalVotes: 160,
      isClosed: false,
    },
  },
  {
    id: 'seed-5',
    author: { id: 'demo-4', displayName: 'Anil Sharma', isVerified: true },
    stateCode: 'TS',
    constituencyId: 'TS-AC-29',
    constituencyName: 'Sircilla',
    content: 'KTR\'s margin in Sircilla — 51,489 votes — was the largest in the 2023 election. Even in a year where BRS lost badly overall, this constituency stayed loyal. What makes Sircilla different? #sircilla #brs #ktr',
    type: 'opinion',
    replyCount: 18,
    reactionCount: 56,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-29T02:00:00Z',
    updatedAt: '2026-04-29T02:00:00Z',
    hashtags: ['sircilla', 'brs', 'ktr'],
  },
  {
    id: 'seed-6',
    author: { id: 'demo-5', displayName: 'Fatima Begum' },
    stateCode: 'TS',
    constituencyId: 'TS-AC-77',
    constituencyName: 'Charminar',
    content: 'Water supply issue in Old City getting worse. Tankers not coming on schedule, HMWSSB helpline perpetually busy. Anyone else facing this? #charminar #watersupply #hyderabad',
    type: 'discussion',
    replyCount: 22,
    reactionCount: 45,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-28T22:00:00Z',
    updatedAt: '2026-04-28T22:00:00Z',
    hashtags: ['charminar', 'watersupply', 'hyderabad'],
  },
  {
    id: 'seed-7',
    author: { id: 'demo-6', displayName: 'Venkat Rao' },
    stateCode: 'TS',
    content: 'Which newly elected INC MLA has been most active in their constituency so far?',
    type: 'poll',
    replyCount: 6,
    reactionCount: 19,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-28T18:00:00Z',
    updatedAt: '2026-04-28T18:00:00Z',
    hashtags: ['inc', 'mlareview'],
    poll: {
      id: 'poll-2',
      question: 'Which newly elected INC MLA has been most active in their constituency so far?',
      options: [
        { id: 'opt-2a', label: 'Duddilla Sridhar Babu (Manthani)', voteCount: 42, sortOrder: 0 },
        { id: 'opt-2b', label: 'Ponnam Prabhakar (Husnabad)', voteCount: 28, sortOrder: 1 },
        { id: 'opt-2c', label: 'Mynampally Rohith (Medak)', voteCount: 15, sortOrder: 2 },
        { id: 'opt-2d', label: 'Someone else (comment below)', voteCount: 33, sortOrder: 3 },
      ],
      totalVotes: 118,
      isClosed: false,
    },
  },
];

const SEED_COMMENTS: Record<string, Comment[]> = {
  'seed-2': [
    {
      id: 'c-1',
      postId: 'seed-2',
      author: { id: 'demo-7', displayName: 'Suresh K' },
      content: 'Same issue near Kondapur. Filed complaint on T-App Folio 2 weeks ago, no response.',
      reactionCount: 5,
      isDeleted: false,
      createdAt: '2026-04-29T07:00:00Z',
      updatedAt: '2026-04-29T07:00:00Z',
    },
    {
      id: 'c-2',
      postId: 'seed-2',
      author: { id: 'demo-8', displayName: 'Lakshmi P' },
      content: 'Try writing to the District Collector directly. CC the MLA. That worked for us in Kukatpally.',
      reactionCount: 12,
      isDeleted: false,
      createdAt: '2026-04-29T07:30:00Z',
      updatedAt: '2026-04-29T07:30:00Z',
    },
  ],
};

// ─── Feed Store ───

interface FeedState {
  posts: Post[];
  comments: Record<string, Comment[]>;
  feedFilter: PostType | 'all';
  stateFilter: string | null;
  loading: boolean;

  setFilter: (filter: PostType | 'all') => void;
  setStateFilter: (stateCode: string | null) => void;
  getFilteredPosts: () => Post[];
  getComments: (postId: string) => Comment[];
  addPost: (post: Post) => void;
  editPost: (postId: string, content: string) => void;
  deletePost: (postId: string) => void;
  addMediaToPost: (postId: string, media: PostMedia) => void;
  toggleReaction: (postId: string, reaction: ReactionType) => void;
  votePoll: (postId: string, optionId: string) => void;
  addComment: (postId: string, comment: Comment) => void;
}

export const useFeedStore = create<FeedState>()((set, get) => ({
  posts: SEED_POSTS,
  comments: SEED_COMMENTS,
  feedFilter: 'all',
  stateFilter: null,
  loading: false,

  setFilter: (filter) => set({ feedFilter: filter }),
  setStateFilter: (stateCode) => set({ stateFilter: stateCode }),

  getFilteredPosts: () => {
    const { posts, feedFilter, stateFilter } = get();
    let filtered = posts;
    if (stateFilter) {
      filtered = filtered.filter((p) => p.stateCode === stateFilter);
    }
    if (feedFilter !== 'all') {
      filtered = filtered.filter((p) => p.type === feedFilter);
    }
    return filtered;
  },

  getComments: (postId) => get().comments[postId] ?? [],

  addPost: (post) =>
    set((state) => ({
      posts: [post, ...state.posts],
    })),

  editPost: (postId, content) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              content,
              updatedAt: new Date().toISOString(),
              hashtags: content.match(/#(\w+)/g)?.map((h) => h.slice(1).toLowerCase()) ?? p.hashtags,
            }
          : p,
      ),
    })),

  deletePost: (postId) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, isDeleted: true, content: '[Deleted]' } : p,
      ),
    })),

  addMediaToPost: (postId, media) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? { ...p, media: [...(p.media ?? []), media] }
          : p,
      ),
    })),

  toggleReaction: (postId, reaction) =>
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id !== postId) return p;
        const wasReacted = p.userReaction === reaction;
        return {
          ...p,
          userReaction: wasReacted ? undefined : reaction,
          reactionCount: p.reactionCount + (wasReacted ? -1 : 1),
        };
      }),
    })),

  votePoll: (postId, optionId) =>
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id !== postId || !p.poll || p.poll.userVotedOptionId) return p;
        return {
          ...p,
          poll: {
            ...p.poll,
            userVotedOptionId: optionId,
            totalVotes: p.poll.totalVotes + 1,
            options: p.poll.options.map((o) =>
              o.id === optionId ? { ...o, voteCount: o.voteCount + 1 } : o,
            ),
          },
        };
      }),
    })),

  addComment: (postId, comment) =>
    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: [...(state.comments[postId] ?? []), comment],
      },
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, replyCount: p.replyCount + 1 } : p,
      ),
    })),
}));
