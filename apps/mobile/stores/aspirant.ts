/**
 * Aspirant Store — Aspiring leaders, civic badges, leadership modules, challenges.
 * Seed data provides demo content for the Civic Awakening module.
 */
import { create } from 'zustand';
import type {
  AspirantProfile,
  CivicBadge,
  BadgeType,
  LeadershipModule,
  ModuleProgress,
  CommunityChallenge,
  ChallengeParticipation,
  CivicScoreBreakdown,
} from '../lib/aspirantTypes';
import { computeCivicScore } from '../lib/aspirantTypes';
import { MODULE_CONTENT } from '../data/leadershipContent';
import * as dataService from '../lib/supabaseDataService';
import { enqueue } from '../lib/offlineSync';
import { useAuthStore } from './auth';

interface AspirantState {
  // Current user aspirant profile (null if not registered)
  profile: AspirantProfile | null;
  badges: CivicBadge[];
  modules: LeadershipModule[];
  moduleProgress: ModuleProgress[];
  challenges: CommunityChallenge[];
  challengeProgress: ChallengeParticipation[];

  // Public aspirants (community directory)
  publicAspirants: AspirantProfile[];

  // Queries
  getCivicScore: () => CivicScoreBreakdown | null;
  getModulesByCategory: (category: string) => LeadershipModule[];
  getCompletedModules: () => string[];
  getActiveChallenges: () => CommunityChallenge[];
  getAspirantsForConstituency: (stateCode: string, acNo: number) => AspirantProfile[];

  // Actions
  registerAsAspirant: (profile: Omit<AspirantProfile, 'id' | 'civicScore' | 'issuesReported' | 'issuesResolved' | 'commentsCount' | 'evidenceSubmitted' | 'promisesTracked' | 'communityEndorsements' | 'modulesCompleted' | 'challengesCompleted'>) => Promise<void>;
  updateProfile: (updates: Partial<AspirantProfile>) => void;
  startModule: (moduleId: string) => Promise<void>;
  completeModule: (moduleId: string, quizScore?: number) => void;
  joinChallenge: (challengeId: string) => Promise<void>;
  updateChallengeProgress: (challengeId: string, progress: number) => void;
  earnBadge: (badgeType: BadgeType) => void;
  endorseAspirant: (aspirantId: string, endorserId?: string) => Promise<void>;
  hydrateAspirants: (stateCode?: string, acNo?: number) => Promise<void>;
  endorsedIds: string[];
}

// ─── SEED: Leadership Academy Modules ───

const SEED_MODULES: LeadershipModule[] = [
  // Electoral Process
  {
    id: 'mod-1',
    title: 'How Indian Elections Work',
    description: 'Understand the complete election process — from nominations to counting day. Learn about ECI, EVMs, VVPATs, and electoral rolls.',
    category: 'electoral_process',
    contentType: 'article',
    durationMinutes: 15,
    difficulty: 'beginner',
    isPremium: false,
    sortOrder: 1,
  },
  {
    id: 'mod-2',
    title: 'Filing Your Nomination',
    description: 'Step-by-step guide to filing nomination papers, required documents, security deposits, affidavits, and common rejection reasons.',
    category: 'electoral_process',
    contentType: 'article',
    durationMinutes: 20,
    difficulty: 'intermediate',
    isPremium: false,
    sortOrder: 2,
  },
  {
    id: 'mod-3',
    title: 'Understanding Election Symbols',
    description: 'How party symbols work, reserved vs free symbols, how independents get symbols, and the legal framework.',
    category: 'electoral_process',
    contentType: 'quiz',
    durationMinutes: 10,
    difficulty: 'beginner',
    isPremium: false,
    sortOrder: 3,
  },

  // Campaign Strategy
  {
    id: 'mod-4',
    title: 'Building a Grassroots Campaign',
    description: 'Learn how to build a winning ground-level campaign — booth-level strategy, volunteer networks, and door-to-door canvassing.',
    category: 'campaign_strategy',
    contentType: 'case_study',
    durationMinutes: 25,
    difficulty: 'intermediate',
    isPremium: false,
    sortOrder: 4,
  },
  {
    id: 'mod-5',
    title: 'Fundraising for Independents',
    description: 'Legal ways to raise campaign funds, crowdfunding, transparency requirements, and election expenditure limits.',
    category: 'campaign_strategy',
    contentType: 'article',
    durationMinutes: 20,
    difficulty: 'advanced',
    isPremium: false,
    sortOrder: 5,
  },

  // Legal Framework
  {
    id: 'mod-6',
    title: 'Representation of the People Act',
    description: 'Key provisions of RPA 1950 & 1951 that every candidate must know — qualifications, disqualifications, corrupt practices, and election petitions.',
    category: 'legal_framework',
    contentType: 'article',
    durationMinutes: 30,
    difficulty: 'intermediate',
    isPremium: false,
    sortOrder: 6,
  },
  {
    id: 'mod-7',
    title: 'Model Code of Conduct',
    description: 'What you can and cannot do during election season. Real examples of MCC violations and their consequences.',
    category: 'legal_framework',
    contentType: 'quiz',
    durationMinutes: 15,
    difficulty: 'beginner',
    isPremium: false,
    sortOrder: 7,
  },

  // Public Speaking
  {
    id: 'mod-8',
    title: 'Crafting Your Political Message',
    description: 'How to define your core message, connect with voters emotionally, and differentiate yourself from opponents.',
    category: 'public_speaking',
    contentType: 'video',
    durationMinutes: 20,
    difficulty: 'beginner',
    isPremium: false,
    sortOrder: 8,
  },

  // Community Organizing
  {
    id: 'mod-9',
    title: 'Ward-Level Community Engagement',
    description: 'Practical guide to organizing ward sabhas, citizen feedback sessions, and building a community volunteer network.',
    category: 'community_organizing',
    contentType: 'case_study',
    durationMinutes: 20,
    difficulty: 'intermediate',
    isPremium: false,
    sortOrder: 9,
  },

  // Digital Campaigning
  {
    id: 'mod-10',
    title: 'Social Media for Politicians',
    description: 'Best practices for using WhatsApp, YouTube, Instagram, and X for political outreach. Content calendar and engagement strategies.',
    category: 'digital_campaigning',
    contentType: 'article',
    durationMinutes: 15,
    difficulty: 'beginner',
    isPremium: false,
    sortOrder: 10,
  },

  // Policy Making
  {
    id: 'mod-11',
    title: 'How to Write a Policy Brief',
    description: 'Structure a policy brief for local governance. Problem statement, evidence, options analysis, and recommendations.',
    category: 'policy_making',
    contentType: 'article',
    durationMinutes: 25,
    difficulty: 'advanced',
    isPremium: false,
    sortOrder: 11,
  },

  // Ethics & Governance
  {
    id: 'mod-12',
    title: 'Ethics in Public Life',
    description: 'The Nolan Principles, conflict of interest, asset disclosure, and building public trust as an elected representative.',
    category: 'ethics_governance',
    contentType: 'article',
    durationMinutes: 20,
    difficulty: 'beginner',
    isPremium: false,
    sortOrder: 12,
  },
];

// ─── SEED: Community Challenges ───

const SEED_CHALLENGES: CommunityChallenge[] = [
  {
    id: 'ch-1',
    title: 'Report 3 Civic Issues',
    description: 'Identify and report 3 real civic issues in your constituency — potholes, water supply, streetlights, etc.',
    category: 'civic',
    points: 30,
    targetCount: 3,
    isActive: true,
    startsAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'ch-2',
    title: 'Verify 5 Promise Statuses',
    description: 'Submit evidence (photos or news links) for 5 election promises to help verify their delivery status.',
    category: 'accountability',
    points: 50,
    targetCount: 5,
    isActive: true,
    startsAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'ch-3',
    title: 'Complete the Electoral Process Track',
    description: 'Finish all 3 modules in the Electoral Process category of the Leadership Academy.',
    category: 'awareness',
    points: 40,
    targetCount: 3,
    isActive: true,
    startsAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'ch-4',
    title: 'Organize a Ward Meeting',
    description: 'Organize or attend a ward-level meeting in your locality. Submit a photo as proof.',
    category: 'community',
    points: 100,
    targetCount: 1,
    isActive: true,
    startsAt: '2025-01-01T00:00:00Z',
    endsAt: '2025-12-31T23:59:59Z',
  },
  {
    id: 'ch-5',
    title: 'Share 10 Candidate Affidavits',
    description: 'Help spread transparency! Share candidate affidavit summaries with 10 people via the app.',
    category: 'awareness',
    points: 25,
    targetCount: 10,
    isActive: true,
    startsAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'ch-6',
    title: 'Telangana Promise Watchdog',
    description: 'Follow and track at least 8 election promises specific to Telangana state.',
    category: 'accountability',
    points: 40,
    targetCount: 8,
    stateCode: 'TS',
    isActive: true,
    startsAt: '2025-01-01T00:00:00Z',
  },
];

// ─── SEED: Demo public aspirants ───

const SEED_PUBLIC_ASPIRANTS: AspirantProfile[] = [
  {
    id: 'asp-1',
    userId: 'demo-aspirant-1',
    displayName: 'Priya Reddy',
    bio: 'Social worker turned civic leader. Dedicated to transparency, rural water security and grassroots governance in Palnadu & Telangana.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    stateCode: 'AP',
    targetConstituencyAcNo: 101,
    targetConstituencyName: 'Macherla',
    targetElectionYear: 2029,
    isIndependent: true,
    civicScore: 842,
    issuesReported: 42,
    issuesResolved: 28,
    commentsCount: 165,
    evidenceSubmitted: 34,
    promisesTracked: 19,
    communityEndorsements: 4210,
    modulesCompleted: 8,
    challengesCompleted: 5,
    isPublic: true,
    motto: 'పల్నాడు సమగ్ర అభివృద్ధి · నిరంతర ప్రజాసేవ (Palnadu Comprehensive Development)',
    liveStatus: 'క్షేత్ర పర్యటన: రెంటచింతల మార్కెట్ యార్డ్‌లో రైతులతో సమీక్ష',
    liveStatusTime: '1h ago',
    journeyBio: 'గ్రామీణ ప్రాంతంలో పుట్టి పెరిగిన ప్రియా రెడ్డి గారు, ఉస్మానియా విశ్వవిద్యాలయం నుంచి పబ్లిక్ పాలసీలో పోస్ట్ గ్రాడ్యుయేషన్ పూర్తి చేశారు. గత 8 సంవత్సరాలుగా పల్నాడు జిల్లాలోని పలు మండలాల్లో తాగునీటి ఎద్దడిపై విస్తృతంగా పోరాడారు. 120కి పైగా స్వచ్ఛంద రక్తదాన శిబిరాలు మరియు మహిళా సాధికారత సదస్సులు నిర్వహించారు.',
    visionPledges: [
      {
        id: 'vis-1',
        title: 'మంచినీటి పైప్‌లైన్ మరియు తాగునీటి భద్రత',
        desc: 'నియోజకవర్గంలోని ప్రతి గ్రామానికి శుద్ధి చేసిన మంచినీటి పైప్‌లైన్ సౌకర్యం కల్పించడం మరియు ఆర్వో ప్లాంట్ల నిరంతర నిర్వహణ.',
        supportCount: 1420,
      },
      {
        id: 'vis-2',
        title: 'రైతు మార్కెట్ యార్డు ఆధునీకరణ & మద్దతు ధర',
        desc: 'మిర్చి, పత్తి రైతులకు గిట్టుబాటు ధర దక్కేలా కోల్డ్ స్టోరేజ్ సౌకర్యం మరియు డిజిటల్ వేలం వ్యవస్థను తీసుకురావడం.',
        supportCount: 1180,
      },
      {
        id: 'vis-3',
        title: 'ప్రాథమిక ఆరోగ్య కేంద్రాల అప్‌గ్రేడేషన్',
        desc: 'మండల స్థాయి పీహెచ్‌సీలలో 24/7 అత్యవసర సేవల విభాగం, ఆక్సిజన్ పడకలు మరియు నిరంతర వైద్యుల నియామకం.',
        supportCount: 954,
      },
    ],
    fieldInitiatives: [
      {
        id: 'init-1',
        title: 'రెంటచింతల ప్రాథమిక పాఠశాలలో మంచినీటి ఆర్వో ప్లాంట్ పునరుద్ధరణ',
        desc: 'గత 6 నెలలుగా మూతపడిన ఆర్వో ప్లాంట్‌ను పంచాయతీ అధికారులను కలిసి మరమ్మతులు చేయించి 350 మంది విద్యార్థులకు స్వచ్ఛమైన తాగునీరు అందించాము.',
        date: '2026-11-01',
        isResolved: true,
      },
      {
        id: 'init-2',
        title: 'మాచర్ల బైపాస్ రోడ్డు గుంతల మరమ్మత్తు ప్రచారం',
        desc: 'ప్రమాదకర గుంతలపై ఆర్‌అండ్‌బీ అధికారులకు వినతిపత్రం అందజేసి 4 కిలోమీటర్ల మేర తాత్కాలిక ప్యాచ్ వర్క్ పూర్తి చేయించాము.',
        date: '2026-10-24',
        isResolved: true,
      },
      {
        id: 'init-3',
        title: 'వెల్దుర్తి మండలంలో వృద్ధాప్య పింఛన్ల దరఖాస్తు క్యాంప్',
        desc: 'అర్హులైన 48 మంది వృద్ధులకు ప్రభుత్వ పింఛను పత్రాల పరిశీలన మరియు దరఖాస్తు నమోదు సహకారం.',
        date: '2026-10-15',
        isResolved: true,
      },
    ],
    disclosures: {
      cleanAffidavit: true,
      zeroCriminalCases: true,
      assetsDeclared: true,
      accountabilityPledge: 'ప్రజా సమస్యలపై ప్రతి నెలా బహిరంగ ప్రజాదర్బార్ నిర్వహించి, ప్రతి వినతి పరిష్కారానికి గడువు నిర్ణయిస్తానని ప్రతిజ్ఞ చేస్తున్నాను.',
    },
    privateTelemetry: {
      boothCoverageText: '218 / 248 బూత్‌లు',
      grassrootsReachPercent: 87.9,
      avgResponseHours: 3.2,
      responseRatePercent: 96,
      profileViews30Days: 182400,
      pendingRequestsCount: 6,
    },
  },
  {
    id: 'asp-2',
    userId: 'demo-aspirant-2',
    displayName: 'Rahul Kumar',
    bio: 'IT professional fighting for transparency in local governance. Track every rupee spent.',
    stateCode: 'TS',
    targetConstituencyAcNo: 93,
    targetConstituencyName: 'Goshamahal',
    targetElectionYear: 2028,
    isIndependent: false,
    partyAffiliation: 'INC',
    civicScore: 450,
    issuesReported: 15,
    issuesResolved: 3,
    commentsCount: 40,
    evidenceSubmitted: 8,
    promisesTracked: 20,
    communityEndorsements: 32,
    modulesCompleted: 5,
    challengesCompleted: 3,
    isPublic: true,
  },
  {
    id: 'asp-3',
    userId: 'demo-aspirant-3',
    displayName: 'Anitha Babu',
    bio: 'Teacher and RTI activist. Education reform is my mission.',
    stateCode: 'TS',
    targetConstituencyAcNo: 29,
    targetConstituencyName: 'Sircilla',
    targetElectionYear: 2028,
    isIndependent: true,
    civicScore: 310,
    issuesReported: 10,
    issuesResolved: 2,
    commentsCount: 30,
    evidenceSubmitted: 5,
    promisesTracked: 12,
    communityEndorsements: 18,
    modulesCompleted: 4,
    challengesCompleted: 2,
    isPublic: true,
  },
];

export const useAspirantStore = create<AspirantState>()((set, get) => ({
  profile: null,
  badges: [],
  modules: SEED_MODULES.map((m) => ({ ...m, ...MODULE_CONTENT[m.id] })),
  moduleProgress: [],
  challenges: SEED_CHALLENGES,
  challengeProgress: [],
  publicAspirants: SEED_PUBLIC_ASPIRANTS,
  endorsedIds: [],

  getCivicScore: () => {
    const p = get().profile;
    if (!p) return null;
    return computeCivicScore(p);
  },

  getModulesByCategory: (category) =>
    get()
      .modules.filter((m) => m.category === category)
      .sort((a, b) => a.sortOrder - b.sortOrder),

  getCompletedModules: () =>
    get()
      .moduleProgress.filter((mp) => mp.completed)
      .map((mp) => mp.moduleId),

  getActiveChallenges: () =>
    get().challenges.filter((c) => {
      if (!c.isActive) return false;
      const now = new Date();
      if (c.endsAt && new Date(c.endsAt) < now) return false;
      return true;
    }),

  getAspirantsForConstituency: (stateCode, acNo) =>
    get().publicAspirants.filter(
      (a) => a.stateCode === stateCode && a.targetConstituencyAcNo === acNo,
    ),

  registerAsAspirant: async (profileData) => {
    const tempId = `asp-${Date.now()}`;
    const newProfile: AspirantProfile = {
      ...profileData,
      id: tempId,
      civicScore: 0,
      issuesReported: 0,
      issuesResolved: 0,
      commentsCount: 0,
      evidenceSubmitted: 0,
      promisesTracked: 0,
      communityEndorsements: 0,
      modulesCompleted: 0,
      challengesCompleted: 0,
    };
    set({ profile: newProfile });

    // Asynchronously register in Supabase
    try {
      const res = await dataService.registerAspirant(profileData.userId, {
        displayName: profileData.displayName,
        bio: profileData.bio,
        stateCode: profileData.stateCode,
        targetConstituencyAcNo: profileData.targetConstituencyAcNo,
        targetConstituencyName: profileData.targetConstituencyName,
        partyAffiliation: profileData.partyAffiliation,
        isIndependent: profileData.isIndependent,
      });
      if (res.success && res.id) {
        set((state) => ({
          profile: state.profile ? { ...state.profile, id: res.id! } : null,
        }));
      }
    } catch {
      // Offline fallback: profile remains stored locally
    }
  },

  updateProfile: (updates) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    })),

  startModule: async (moduleId) => {
    const exists = get().moduleProgress.find((mp) => mp.moduleId === moduleId);
    if (exists) return;
    set((state) => ({
      moduleProgress: [
        ...state.moduleProgress,
        {
          moduleId,
          completed: false,
          startedAt: new Date().toISOString(),
        },
      ],
    }));

    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      try {
        const ok = await dataService.startModule(userId, moduleId);
        if (!ok) {
          enqueue('start_module', { userId, moduleId });
        }
      } catch {
        enqueue('start_module', { userId, moduleId });
      }
    }
  },

  completeModule: async (moduleId, quizScore) => {
    set((state) => ({
      moduleProgress: state.moduleProgress.map((mp) =>
        mp.moduleId === moduleId
          ? { ...mp, completed: true, quizScore, completedAt: new Date().toISOString() }
          : mp,
      ),
      profile: state.profile
        ? { ...state.profile, modulesCompleted: state.profile.modulesCompleted + 1 }
        : null,
    }));

    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      try {
        const ok = await dataService.completeModule(userId, moduleId, quizScore);
        if (!ok) {
          enqueue('complete_module', { userId, moduleId, quizScore });
        }
      } catch {
        enqueue('complete_module', { userId, moduleId, quizScore });
      }
    }
  },

  joinChallenge: async (challengeId) => {
    const exists = get().challengeProgress.find((cp) => cp.challengeId === challengeId);
    if (exists) return;
    set((state) => ({
      challengeProgress: [
        ...state.challengeProgress,
        { challengeId, progress: 0, completed: false },
      ],
    }));

    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      try {
        const ok = await dataService.joinChallenge(userId, challengeId);
        if (!ok) {
          enqueue('join_challenge', { userId, challengeId });
        }
      } catch {
        enqueue('join_challenge', { userId, challengeId });
      }
    }
  },

  updateChallengeProgress: (challengeId, progress) =>
    set((state) => {
      const challenge = state.challenges.find((c) => c.id === challengeId);
      const isComplete = challenge ? progress >= challenge.targetCount : false;
      return {
        challengeProgress: state.challengeProgress.map((cp) =>
          cp.challengeId === challengeId
            ? {
                ...cp,
                progress,
                completed: isComplete,
                completedAt: isComplete ? new Date().toISOString() : undefined,
              }
            : cp,
        ),
        profile:
          state.profile && isComplete
            ? { ...state.profile, challengesCompleted: state.profile.challengesCompleted + 1 }
            : state.profile,
      };
    }),

  earnBadge: (badgeType) =>
    set((state) => {
      if (state.badges.some((b) => b.type === badgeType)) return state;
      return {
        badges: [...state.badges, { type: badgeType, earnedAt: new Date().toISOString() }],
      };
    }),

  endorseAspirant: async (aspirantId, endorserId) => {
    const currentEndorsed = get().endorsedIds;
    if (currentEndorsed.includes(aspirantId)) return;

    const user = useAuthStore.getState().user;
    const eId = endorserId || user?.id;
    if (!eId || eId === 'anon') {
      throw new Error('Authentication required to endorse an aspirant');
    }

    // Optimistic local update
    set((state) => ({
      endorsedIds: [...state.endorsedIds, aspirantId],
      publicAspirants: state.publicAspirants.map((a) =>
        a.id === aspirantId
          ? {
              ...a,
              communityEndorsements: a.communityEndorsements + 1,
              civicScore: a.civicScore + 5,
            }
          : a,
      ),
    }));

    // Real backend call
    try {
      const ok = await dataService.endorseAspirant(eId, aspirantId);
      if (!ok) {
        enqueue('endorse_aspirant', { endorserId: eId, aspirantId });
      }
    } catch {
      enqueue('endorse_aspirant', { endorserId: eId, aspirantId });
    }
  },

  hydrateAspirants: async (stateCode, acNo) => {
    try {
      const remoteAspirants = await dataService.fetchPublicAspirants(stateCode, acNo);
      if (remoteAspirants && remoteAspirants.length > 0) {
        const mapped: AspirantProfile[] = remoteAspirants.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          displayName: r.display_name,
          bio: r.bio || undefined,
          avatarUrl: r.avatar_url || undefined,
          stateCode: r.state_code,
          targetConstituencyAcNo: r.target_constituency_ac_no,
          targetConstituencyName: r.target_constituency_name,
          targetElectionYear: r.target_election_year || 2028,
          partyAffiliation: r.party_affiliation || undefined,
          isIndependent: r.is_independent ?? true,
          civicScore: r.civic_score || 0,
          issuesReported: r.issues_reported || 0,
          issuesResolved: r.issues_resolved || 0,
          commentsCount: r.comments_count || 0,
          evidenceSubmitted: r.evidence_submitted || 0,
          promisesTracked: r.promises_tracked || 0,
          communityEndorsements: r.community_endorsements || 0,
          modulesCompleted: r.modules_completed || 0,
          challengesCompleted: r.challenges_completed || 0,
          isPublic: r.is_public ?? true,
        }));
        set({ publicAspirants: mapped });
      }
    } catch {
      // Retain existing seeds if fetch fails
    }
  },
}));
