import { create } from 'zustand';
import type { Post, Comment, ReactionType, PostType, PostMedia, FeedScope } from '../lib/feedTypes';

/**
 * Seed posts for offline-first demo feed.
 * In production, these would come from Supabase.
 * Multi-state: TS, AP, KA, MH + national-scope posts.
 */
const SEED_POSTS: Post[] = [
  // ─── Telangana ──────────────────────────────────────────────
  {
    id: 'seed-ts-1',
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
    id: 'seed-ts-2',
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
    id: 'seed-ts-3',
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
    id: 'seed-ts-4',
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
      id: 'poll-ts-1',
      question: 'Do you think the 10 BRS→INC defections have changed the ground-level governance in those constituencies?',
      options: [
        { id: 'opt-ts1a', label: 'Yes, positive change visible', voteCount: 34, sortOrder: 0 },
        { id: 'opt-ts1b', label: 'No difference at all', voteCount: 58, sortOrder: 1 },
        { id: 'opt-ts1c', label: 'Made things worse', voteCount: 21, sortOrder: 2 },
        { id: 'opt-ts1d', label: 'Too early to tell', voteCount: 47, sortOrder: 3 },
      ],
      totalVotes: 160,
      isClosed: false,
    },
  },
  {
    id: 'seed-ts-5',
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
    id: 'seed-ts-6',
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
    id: 'seed-ts-7',
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
      id: 'poll-ts-2',
      question: 'Which newly elected INC MLA has been most active in their constituency so far?',
      options: [
        { id: 'opt-ts2a', label: 'Duddilla Sridhar Babu (Manthani)', voteCount: 42, sortOrder: 0 },
        { id: 'opt-ts2b', label: 'Ponnam Prabhakar (Husnabad)', voteCount: 28, sortOrder: 1 },
        { id: 'opt-ts2c', label: 'Mynampally Rohith (Medak)', voteCount: 15, sortOrder: 2 },
        { id: 'opt-ts2d', label: 'Someone else (comment below)', voteCount: 33, sortOrder: 3 },
      ],
      totalVotes: 118,
      isClosed: false,
    },
  },

  // ─── Andhra Pradesh ─────────────────────────────────────────
  {
    id: 'seed-ap-1',
    author: { id: 'system', displayName: 'Kshetra Updates', isVerified: true },
    stateCode: 'AP',
    content: 'Welcome to the AP community feed! Discuss TDP-JSP governance, track the Super Six promises, and stay updated on your constituency.',
    type: 'alert',
    replyCount: 0,
    reactionCount: 38,
    isPinned: true,
    isDeleted: false,
    createdAt: '2026-04-28T10:00:00Z',
    updatedAt: '2026-04-28T10:00:00Z',
    hashtags: ['andhrapradesh', 'kshetra'],
  },
  {
    id: 'seed-ap-2',
    author: { id: 'demo-ap-1', displayName: 'Srinivas Rao' },
    stateCode: 'AP',
    constituencyId: 'AP-AC-7',
    constituencyName: 'Mangalagiri',
    content: 'Nara Lokesh won Mangalagiri by over 90k votes in 2024. The constituency is seeing rapid infra development now — new flyover approved, IT park expansion underway. #mangalagiri #tdp #development',
    type: 'discussion',
    replyCount: 14,
    reactionCount: 67,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-29T07:00:00Z',
    updatedAt: '2026-04-29T07:00:00Z',
    hashtags: ['mangalagiri', 'tdp', 'development'],
  },
  {
    id: 'seed-ap-3',
    author: { id: 'demo-ap-2', displayName: 'Padma Lakshmi' },
    stateCode: 'AP',
    constituencyId: 'AP-AC-145',
    constituencyName: 'Kurnool',
    content: 'The Anna Canteen programme restarted in Kurnool last week. Meals at ₹5 again. Has anyone tried it? How is the quality compared to before? #annacanteen #kurnool',
    type: 'question',
    replyCount: 9,
    reactionCount: 28,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-29T05:30:00Z',
    updatedAt: '2026-04-29T05:30:00Z',
    hashtags: ['annacanteen', 'kurnool'],
  },
  {
    id: 'seed-ap-4',
    author: { id: 'demo-ap-3', displayName: 'Rajesh Nayak' },
    stateCode: 'AP',
    content: 'How would you rate the first year of the TDP-JSP-BJP alliance government?',
    type: 'poll',
    replyCount: 21,
    reactionCount: 44,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-29T03:00:00Z',
    updatedAt: '2026-04-29T03:00:00Z',
    hashtags: ['tdp', 'jsp', 'bjp', 'apgovernment'],
    poll: {
      id: 'poll-ap-1',
      question: 'How would you rate the first year of the TDP-JSP-BJP alliance government?',
      options: [
        { id: 'opt-ap1a', label: 'Excellent — visible progress', voteCount: 52, sortOrder: 0 },
        { id: 'opt-ap1b', label: 'Good — but more needed', voteCount: 73, sortOrder: 1 },
        { id: 'opt-ap1c', label: 'Average — mostly promises', voteCount: 41, sortOrder: 2 },
        { id: 'opt-ap1d', label: 'Poor — no real change', voteCount: 29, sortOrder: 3 },
      ],
      totalVotes: 195,
      isClosed: false,
    },
  },
  {
    id: 'seed-ap-5',
    author: { id: 'demo-ap-4', displayName: 'Kavitha Reddy', isVerified: true },
    stateCode: 'AP',
    constituencyId: 'AP-AC-1',
    constituencyName: 'Ichchapuram',
    content: 'Fishing community in Ichchapuram still waiting for the cyclone relief funds promised 6 months ago. The MLA says it is "in process". How long? #ichchapuram #cyclonerelief #fishermen',
    type: 'opinion',
    replyCount: 7,
    reactionCount: 35,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-28T20:00:00Z',
    updatedAt: '2026-04-28T20:00:00Z',
    hashtags: ['ichchapuram', 'cyclonerelief', 'fishermen'],
  },

  // ─── Karnataka ──────────────────────────────────────────────
  {
    id: 'seed-ka-1',
    author: { id: 'system', displayName: 'Kshetra Updates', isVerified: true },
    stateCode: 'KA',
    content: 'Welcome to the Karnataka community feed! Track INC governance performance, discuss your MLA\'s work, and engage with fellow citizens.',
    type: 'alert',
    replyCount: 0,
    reactionCount: 35,
    isPinned: true,
    isDeleted: false,
    createdAt: '2026-04-28T10:00:00Z',
    updatedAt: '2026-04-28T10:00:00Z',
    hashtags: ['karnataka', 'kshetra'],
  },
  {
    id: 'seed-ka-2',
    author: { id: 'demo-ka-1', displayName: 'Manjunath B' },
    stateCode: 'KA',
    constituencyId: 'KA-AC-176',
    constituencyName: 'Jayanagar',
    content: 'Bengaluru\'s pothole crisis continues despite the CM\'s "zero pothole" deadline. Jayanagar 4th Block main road is practically a moon surface. Tagged the MLA 3 times — no response. #bengaluru #potholes #jayanagar',
    type: 'discussion',
    replyCount: 31,
    reactionCount: 78,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-29T06:00:00Z',
    updatedAt: '2026-04-29T06:00:00Z',
    hashtags: ['bengaluru', 'potholes', 'jayanagar'],
  },
  {
    id: 'seed-ka-3',
    author: { id: 'demo-ka-2', displayName: 'Lakshmi Narayan' },
    stateCode: 'KA',
    content: 'Shakti free bus pass scheme — has it actually improved women\'s mobility or just increased bus overcrowding?',
    type: 'poll',
    replyCount: 15,
    reactionCount: 42,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-29T04:00:00Z',
    updatedAt: '2026-04-29T04:00:00Z',
    hashtags: ['shakti', 'freebus', 'karnataka'],
    poll: {
      id: 'poll-ka-1',
      question: 'Shakti free bus pass scheme — has it actually improved women\'s mobility or just increased bus overcrowding?',
      options: [
        { id: 'opt-ka1a', label: 'Great scheme, improved mobility', voteCount: 64, sortOrder: 0 },
        { id: 'opt-ka1b', label: 'Good intent but overcrowding is real', voteCount: 83, sortOrder: 1 },
        { id: 'opt-ka1c', label: 'Needs more buses first', voteCount: 51, sortOrder: 2 },
        { id: 'opt-ka1d', label: 'Fiscally irresponsible', voteCount: 22, sortOrder: 3 },
      ],
      totalVotes: 220,
      isClosed: false,
    },
  },
  {
    id: 'seed-ka-4',
    author: { id: 'demo-ka-3', displayName: 'Deepa Hegde', isVerified: true },
    stateCode: 'KA',
    constituencyId: 'KA-AC-154',
    constituencyName: 'Mysuru',
    content: 'Mysuru constituency is seeing good progress on the ring road project. Phase 1 almost complete. Credit where due — the MLA has been following up regularly with NHAI. #mysuru #infrastructure',
    type: 'news',
    replyCount: 5,
    reactionCount: 33,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-28T21:00:00Z',
    updatedAt: '2026-04-28T21:00:00Z',
    hashtags: ['mysuru', 'infrastructure'],
  },

  // ─── Maharashtra ────────────────────────────────────────────
  {
    id: 'seed-mh-1',
    author: { id: 'system', displayName: 'Kshetra Updates', isVerified: true },
    stateCode: 'MH',
    content: 'Welcome to the Maharashtra community feed! Track Mahayuti governance, discuss civic issues, and hold your representatives accountable.',
    type: 'alert',
    replyCount: 0,
    reactionCount: 40,
    isPinned: true,
    isDeleted: false,
    createdAt: '2026-04-28T10:00:00Z',
    updatedAt: '2026-04-28T10:00:00Z',
    hashtags: ['maharashtra', 'kshetra'],
  },
  {
    id: 'seed-mh-2',
    author: { id: 'demo-mh-1', displayName: 'Sachin Pawar' },
    stateCode: 'MH',
    constituencyId: 'MH-AC-180',
    constituencyName: 'Andheri East',
    content: 'Mumbai Metro Line 7 finally operational after years of delays. Andheri East commuters rejoice! But the last-mile connectivity is still terrible. Auto-rickshaws charging ₹100 for 2 km. #mumbai #metro #andheri',
    type: 'discussion',
    replyCount: 19,
    reactionCount: 52,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-29T05:30:00Z',
    updatedAt: '2026-04-29T05:30:00Z',
    hashtags: ['mumbai', 'metro', 'andheri'],
  },
  {
    id: 'seed-mh-3',
    author: { id: 'demo-mh-2', displayName: 'Prachi Deshmukh' },
    stateCode: 'MH',
    content: 'Ladki Bahin scheme — ₹1500/month to women. Is it empowering or just election-year populism?',
    type: 'poll',
    replyCount: 24,
    reactionCount: 61,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-29T03:30:00Z',
    updatedAt: '2026-04-29T03:30:00Z',
    hashtags: ['ladkibahin', 'maharashtra', 'women'],
    poll: {
      id: 'poll-mh-1',
      question: 'Ladki Bahin scheme — ₹1500/month to women. Is it empowering or just election-year populism?',
      options: [
        { id: 'opt-mh1a', label: 'Genuinely helpful for poor families', voteCount: 87, sortOrder: 0 },
        { id: 'opt-mh1b', label: 'Good intent but amount too low', voteCount: 62, sortOrder: 1 },
        { id: 'opt-mh1c', label: 'Election gimmick', voteCount: 48, sortOrder: 2 },
        { id: 'opt-mh1d', label: 'Fiscal burden — unsustainable', voteCount: 31, sortOrder: 3 },
      ],
      totalVotes: 228,
      isClosed: false,
    },
  },
  {
    id: 'seed-mh-4',
    author: { id: 'demo-mh-3', displayName: 'Amit Jadhav', isVerified: true },
    stateCode: 'MH',
    constituencyId: 'MH-AC-260',
    constituencyName: 'Pune Cantonment',
    content: 'Pune traffic is now worse than Mumbai. The metro construction in Camp area has turned a 10-min commute into a 45-min nightmare. When will Phase 1 be complete? #pune #metro #traffic',
    type: 'opinion',
    replyCount: 11,
    reactionCount: 39,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-28T19:00:00Z',
    updatedAt: '2026-04-28T19:00:00Z',
    hashtags: ['pune', 'metro', 'traffic'],
  },

  // ─── National / Cross-state ─────────────────────────────────
  {
    id: 'seed-nat-1',
    author: { id: 'demo-nat-1', displayName: 'India Policy Watch', isVerified: true },
    stateCode: 'NATIONAL',
    content: 'The 16th Finance Commission report is expected next month. States are lobbying for higher devolution — currently at 41%. How much should states get? #financecommission #federalism #india',
    type: 'news',
    replyCount: 32,
    reactionCount: 91,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-29T08:00:00Z',
    updatedAt: '2026-04-29T08:00:00Z',
    hashtags: ['financecommission', 'federalism', 'india'],
  },
  {
    id: 'seed-nat-2',
    author: { id: 'demo-nat-2', displayName: 'Civic Pulse' },
    stateCode: 'NATIONAL',
    content: 'Which state has the best model for local self-governance (Panchayati Raj)?',
    type: 'poll',
    replyCount: 17,
    reactionCount: 55,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-29T01:00:00Z',
    updatedAt: '2026-04-29T01:00:00Z',
    hashtags: ['panchayatiraj', 'governance', 'localgovernment'],
    poll: {
      id: 'poll-nat-1',
      question: 'Which state has the best model for local self-governance (Panchayati Raj)?',
      options: [
        { id: 'opt-nat1a', label: 'Kerala', voteCount: 89, sortOrder: 0 },
        { id: 'opt-nat1b', label: 'Karnataka', voteCount: 45, sortOrder: 1 },
        { id: 'opt-nat1c', label: 'West Bengal', voteCount: 32, sortOrder: 2 },
        { id: 'opt-nat1d', label: 'Rajasthan', voteCount: 28, sortOrder: 3 },
      ],
      totalVotes: 194,
      isClosed: false,
    },
  },
  {
    id: 'seed-nat-3',
    author: { id: 'demo-nat-3', displayName: 'Arjun Menon' },
    stateCode: 'NATIONAL',
    content: 'India\'s voter turnout has been declining in urban areas across states. In 2024, Bengaluru recorded just 54% turnout vs 70%+ in rural Karnataka. Is urban apathy the biggest threat to democracy? #voterturnout #urbanapathy',
    type: 'opinion',
    replyCount: 26,
    reactionCount: 73,
    isPinned: false,
    isDeleted: false,
    createdAt: '2026-04-28T16:00:00Z',
    updatedAt: '2026-04-28T16:00:00Z',
    hashtags: ['voterturnout', 'urbanapathy'],
  },
];

const SEED_COMMENTS: Record<string, Comment[]> = {
  'seed-ts-2': [
    {
      id: 'c-1',
      postId: 'seed-ts-2',
      author: { id: 'demo-7', displayName: 'Suresh K' },
      content: 'Same issue near Kondapur. Filed complaint on T-App Folio 2 weeks ago, no response.',
      reactionCount: 5,
      isDeleted: false,
      createdAt: '2026-04-29T07:00:00Z',
      updatedAt: '2026-04-29T07:00:00Z',
    },
    {
      id: 'c-2',
      postId: 'seed-ts-2',
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
  scopeFilter: FeedScope;
  loading: boolean;

  setFilter: (filter: PostType | 'all') => void;
  setScopeFilter: (scope: FeedScope) => void;
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
  scopeFilter: 'state' as FeedScope,
  loading: false,

  setFilter: (filter) => set({ feedFilter: filter }),
  setScopeFilter: (scope) => set({ scopeFilter: scope }),

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
