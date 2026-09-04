import { create } from 'zustand';
import type {
  PoliticianPortalProfile,
  ConstituentBroadcast,
  PoliticalEvent,
  EManifesto,
  Mentorship,
  Endorsement,
  FundraiseProject,
  PoliticianSurvey,
} from '../lib/politicianPortalTypes';

// ─── Seed Politicians ───
const SEED_POLITICIANS: PoliticianPortalProfile[] = [
  {
    id: 'pp1', userId: 'u-pp1', displayName: 'Revanth Reddy', tier: 'chief_minister', party: 'INC',
    constituencyAcNo: 116, stateCode: 'TS', districtName: 'Rangareddy',
    bio: 'Chief Minister of Telangana. Formerly a TDP MLA, joined INC in 2017. Leading the state through its first INC government since formation.',
    photoUrl: 'https://myneta.info/photos/revanth.jpg', isVerified: true, isActive: true,
    followerCount: 125000, endorsementCount: 45, endorsementScore: 180,
    eventsHosted: 89, issuesResponded: 342, responseRate: 78.5, avgResponseTimeHours: 4.2,
    menteesCount: 3, totalFundsRaised: 0, socialLinks: [{ platform: 'twitter', url: 'https://x.com/reaboraRevanth' }],
    joinedAt: '2024-01-15', lastActiveAt: '2026-05-24',
  },
  {
    id: 'pp2', userId: 'u-pp2', displayName: 'Chandrababu Naidu', tier: 'chief_minister', party: 'TDP',
    constituencyAcNo: 133, stateCode: 'AP', districtName: 'Chittoor',
    bio: 'Chief Minister of Andhra Pradesh. Visionary leader who transformed Hyderabad into a tech hub. Leading AP development with Super Six guarantees.',
    isVerified: true, isActive: true,
    followerCount: 200000, endorsementCount: 67, endorsementScore: 280,
    eventsHosted: 156, issuesResponded: 512, responseRate: 82.3, avgResponseTimeHours: 3.1,
    menteesCount: 5, totalFundsRaised: 0, socialLinks: [],
    joinedAt: '2024-06-01', lastActiveAt: '2026-05-24',
  },
  {
    id: 'pp3', userId: 'u-pp3', displayName: 'Ananya Rao', tier: 'aspirant', party: undefined,
    stateCode: 'TS', districtName: 'Hyderabad',
    bio: 'Young aspiring leader passionate about urban governance, smart city initiatives, and youth empowerment. MBA graduate, 28 years old.',
    isVerified: false, isActive: true,
    followerCount: 1200, endorsementCount: 8, endorsementScore: 12,
    eventsHosted: 4, issuesResponded: 23, responseRate: 65.0, avgResponseTimeHours: 8.5,
    menteesCount: 0, totalFundsRaised: 25000, socialLinks: [{ platform: 'instagram', url: 'https://instagram.com/ananya_for_change' }],
    joinedAt: '2025-08-15', lastActiveAt: '2026-05-23',
  },
  {
    id: 'pp4', userId: 'u-pp4', displayName: 'Siddaramaiah', tier: 'chief_minister', party: 'INC',
    constituencyAcNo: 86, stateCode: 'KA', districtName: 'Mysuru',
    bio: 'Chief Minister of Karnataka. Architect of the landmark 5 Guarantee schemes including Gruha Lakshmi and Shakti.',
    isVerified: true, isActive: true,
    followerCount: 180000, endorsementCount: 52, endorsementScore: 220,
    eventsHosted: 120, issuesResponded: 389, responseRate: 75.0, avgResponseTimeHours: 5.0,
    menteesCount: 2, totalFundsRaised: 0, socialLinks: [],
    joinedAt: '2023-06-01', lastActiveAt: '2026-05-24',
  },
];

// ─── Seed Broadcasts ───
const SEED_BROADCASTS: ConstituentBroadcast[] = [
  {
    id: 'cb1', politicianId: 'pp1', type: 'announcement', title: 'Musi River Rejuvenation Project Update',
    body: 'The first phase of Musi River cleanup has been completed ahead of schedule. 23 km of riverbank has been cleaned and landscaped. Phase 2 tender awarded.',
    mediaUrls: [], targetScope: 'state', targetStateCode: 'TS',
    sentAt: '2026-05-20T10:00:00Z', readCount: 45000, reactionCount: 8900, replyCount: 1200,
    createdAt: '2026-05-20T09:00:00Z',
  },
  {
    id: 'cb2', politicianId: 'pp2', type: 'update', title: 'Super Six Scheme Progress: Tallam Bharosa',
    body: 'Under Tallam Bharosa, ₹20,000 annual support has been credited to 45 lakh farmer families. Total disbursement: ₹9,000 Crore in FY 2025-26.',
    mediaUrls: [], targetScope: 'state', targetStateCode: 'AP',
    sentAt: '2026-05-18T11:00:00Z', readCount: 62000, reactionCount: 12300, replyCount: 2100,
    createdAt: '2026-05-18T10:00:00Z',
  },
  {
    id: 'cb3', politicianId: 'pp3', type: 'event_invite', title: 'Youth Town Hall: Let\'s Build Smart Hyderabad Together',
    body: 'Inviting all young citizens (18-35) to a town hall discussion on urban governance, smart city initiatives, and youth employment. Free entry, refreshments provided.',
    mediaUrls: [], targetScope: 'constituency', targetStateCode: 'TS', targetConstituencyAcNo: 56,
    sentAt: '2026-05-22T09:00:00Z', readCount: 350, reactionCount: 89, replyCount: 23,
    createdAt: '2026-05-22T08:00:00Z',
  },
];

// ─── Seed Events ───
const SEED_EVENTS: PoliticalEvent[] = [
  {
    id: 'pe1', politicianId: 'pp1', politicianName: 'Revanth Reddy', party: 'INC',
    type: 'inauguration', status: 'completed', title: 'Musi Riverfront Park Inauguration',
    description: 'Grand inauguration of the first 5km stretch of Musi Riverfront Park with walking tracks, gardens, and public amenities.',
    venue: 'Musi Riverfront, Chaderghat', address: 'Chaderghat, Hyderabad', stateCode: 'TS',
    districtName: 'Hyderabad', constituencyAcNo: 56,
    startTime: '2026-05-15T10:00:00Z', endTime: '2026-05-15T12:00:00Z',
    expectedAttendance: 5000, actualAttendance: 8500, isPublic: true, rsvpCount: 3200,
    mediaUrls: [], createdAt: '2026-05-01T08:00:00Z', updatedAt: '2026-05-15T12:00:00Z',
  },
  {
    id: 'pe2', politicianId: 'pp3', politicianName: 'Ananya Rao',
    type: 'town_hall', status: 'confirmed', title: 'Youth Town Hall: Smart Hyderabad',
    description: 'Interactive town hall for young citizens to discuss urban governance and employment.',
    venue: 'Shilpakala Vedika', address: 'Madhapur, Hyderabad', stateCode: 'TS',
    districtName: 'Hyderabad', constituencyAcNo: 56,
    startTime: '2026-06-01T17:00:00Z', endTime: '2026-06-01T19:00:00Z',
    expectedAttendance: 200, isPublic: true, rsvpCount: 89,
    mediaUrls: [], createdAt: '2026-05-22T08:00:00Z', updatedAt: '2026-05-22T08:00:00Z',
  },
  {
    id: 'pe3', politicianId: 'pp4', politicianName: 'Siddaramaiah', party: 'INC',
    type: 'rally', status: 'planned', title: 'Gruha Lakshmi Beneficiary Rally',
    description: 'Rally celebrating 1 crore women beneficiaries of the Gruha Lakshmi scheme.',
    venue: 'Palace Grounds', address: 'Bengaluru', stateCode: 'KA',
    startTime: '2026-06-15T16:00:00Z', endTime: '2026-06-15T19:00:00Z',
    expectedAttendance: 50000, isPublic: true, rsvpCount: 12000,
    mediaUrls: [], createdAt: '2026-05-20T08:00:00Z', updatedAt: '2026-05-20T08:00:00Z',
  },
];

// ─── Seed Manifesto ───
const SEED_MANIFESTOS: EManifesto[] = [
  {
    id: 'em1', politicianId: 'pp3', politicianName: 'Ananya Rao', title: 'Vision 2029: Smart, Inclusive, Green Hyderabad',
    preamble: 'A manifesto for the next generation of Hyderabad. Built by youth, for everyone.',
    status: 'published', stateCode: 'TS', constituencyAcNo: 56,
    items: [
      { id: 'mi1', category: 'technology', title: 'Free Public WiFi in All Government Buildings', description: 'Deploy high-speed WiFi in 500+ government offices, hospitals, and schools.', timeline: '12 months', budgetEstimate: '₹50 Cr', beneficiaries: '10 lakh citizens', kpis: ['500 hotspots deployed', '1L daily users'], priority: 'high', supportVotes: 890, opposeVotes: 45 },
      { id: 'mi2', category: 'employment', title: 'Youth Startup Accelerator', description: 'Launch 10 constituency-level startup incubators with seed funding of ₹5L per startup.', timeline: '18 months', budgetEstimate: '₹25 Cr', beneficiaries: '5,000 startups', kpis: ['10 incubators launched', '500 startups funded'], priority: 'high', supportVotes: 1200, opposeVotes: 23 },
      { id: 'mi3', category: 'environment', title: 'Green Lung Initiative', description: 'Plant 1 lakh trees and create 50 urban micro-forests.', timeline: '24 months', budgetEstimate: '₹15 Cr', kpis: ['1L trees planted', '50 micro-forests'], priority: 'medium', supportVotes: 670, opposeVotes: 12 },
    ],
    publishedAt: '2025-09-01', views: 4500, endorsements: 34, feedbackCount: 89,
    createdAt: '2025-08-15', updatedAt: '2025-09-01',
  },
];

// ─── Seed Mentorships (Fictional Demo Data — Not Real Public Figures) ───
// NOTE: All mentorships and endorsements below use synthetic demo personas
// created strictly for UI demonstration and test suites. No real public figures.
const SEED_MENTORSHIPS: Mentorship[] = [
  {
    id: 'ms1', mentorId: 'demo-mentor-1', mentorName: 'Dr. K. S. Sharma (Demo Mentor)', mentorTier: 'mla',
    menteeId: 'pp3', menteeName: 'Ananya Rao', menteeTier: 'aspirant',
    status: 'active', focusAreas: ['Public speaking', 'Campaign strategy', 'Policy writing'],
    sessionsCompleted: 6, nextSessionDate: '2026-06-05T10:00:00Z', startedAt: '2026-01-15',
  },
];

// ─── Seed Endorsements (Fictional Demo Data — Not Real Public Figures) ───
const SEED_ENDORSEMENTS: Endorsement[] = [
  { id: 'en1', endorserId: 'demo-endorser-1', endorserName: 'Dr. K. S. Sharma (Demo)', endorserTier: 'mla', endorseeId: 'pp3', endorseeName: 'Ananya Rao', type: 'leadership', message: 'Ananya demonstrates a committed, data-driven approach to community service and local governance.', isPublic: true, createdAt: '2026-03-01' },
  { id: 'en2', endorserId: 'demo-endorser-2', endorserName: 'Prof. Savitri Devi (Demo)', endorserTier: 'local_leader', endorseeId: 'pp3', endorseeName: 'Ananya Rao', type: 'capability', message: 'Impressed by her focus on urban public infrastructure and young citizen engagement.', isPublic: true, createdAt: '2026-04-15' },
];

// ─── Seed Fundraise Projects ───
const SEED_FUNDRAISE: FundraiseProject[] = [
  {
    id: 'fp1', politicianId: 'pp3', politicianName: 'Ananya Rao', title: 'Community Library for Slum Children',
    description: 'Building a free community library with 5000+ books, WiFi, and study rooms for children in Falaknuma slum area.',
    goalAmount: 500000, raisedAmount: 325000, donorCount: 234, status: 'active',
    category: 'education', stateCode: 'TS', constituencyAcNo: 56,
    startDate: '2026-04-01', endDate: '2026-07-01',
    updates: [
      { text: 'Site identified and lease signed!', date: '2026-04-15', imageUrl: 'https://example.com/library-site.jpg' },
      { text: '50% funding reached! Books purchased.', date: '2026-05-10' },
    ],
    isTransparent: true, createdAt: '2026-04-01',
  },
];

// ─── Seed Surveys ───
const SEED_SURVEYS: PoliticianSurvey[] = [
  {
    id: 'sv1', politicianId: 'pp1', title: 'What Should Be the Priority for Telangana Budget 2026-27?',
    description: 'Help us prioritize state spending. Your voice matters in shaping the next budget.',
    status: 'active', targetScope: 'state', targetStateCode: 'TS',
    questions: [
      { id: 'q1', type: 'single_choice', text: 'Which sector needs the most investment?', options: ['Healthcare', 'Education', 'Infrastructure', 'Agriculture', 'IT & Employment'], isRequired: true, order: 1 },
      { id: 'q2', type: 'rating', text: 'Rate the current government performance (1-5)', isRequired: true, order: 2 },
      { id: 'q3', type: 'text', text: 'What is the single biggest issue in your constituency?', isRequired: false, order: 3 },
      { id: 'q4', type: 'yes_no', text: 'Do you support the Musi River rejuvenation project?', isRequired: true, order: 4 },
    ],
    responseCount: 8500, startDate: '2026-05-01', endDate: '2026-06-30',
    results: {
      totalResponses: 8500,
      questionResults: [
        { questionId: 'q1', questionText: 'Which sector needs the most investment?', type: 'single_choice', optionCounts: { Healthcare: 2800, Education: 2100, Infrastructure: 1900, Agriculture: 1200, 'IT & Employment': 500 } },
        { questionId: 'q2', questionText: 'Rate the current government performance', type: 'rating', avgRating: 3.4 },
        { questionId: 'q4', questionText: 'Do you support the Musi River project?', type: 'yes_no', optionCounts: { Yes: 5600, No: 2900 } },
      ],
    },
    createdAt: '2026-05-01',
  },
];

// ─── Store Interface ───
interface PoliticianPortalState {
  politicians: PoliticianPortalProfile[];
  broadcasts: ConstituentBroadcast[];
  events: PoliticalEvent[];
  manifestos: EManifesto[];
  mentorships: Mentorship[];
  endorsements: Endorsement[];
  fundraiseProjects: FundraiseProject[];
  surveys: PoliticianSurvey[];
  currentPoliticianId: string | null;

  // Queries
  getPolitician: (id: string) => PoliticianPortalProfile | undefined;
  getPoliticianByState: (stateCode: string) => PoliticianPortalProfile[];
  getEventsForPolitician: (politicianId: string) => PoliticalEvent[];
  getUpcomingEvents: (stateCode?: string) => PoliticalEvent[];
  getBroadcastsForState: (stateCode: string) => ConstituentBroadcast[];
  getManifesto: (politicianId: string) => EManifesto | undefined;
  getMentorshipsForPolitician: (politicianId: string) => Mentorship[];
  getEndorsementsForPolitician: (politicianId: string) => Endorsement[];
  getFundraiseForPolitician: (politicianId: string) => FundraiseProject[];
  getActiveSurveys: (stateCode?: string) => PoliticianSurvey[];

  // Actions
  setCurrentPolitician: (id: string) => void;
  createBroadcast: (broadcast: Partial<ConstituentBroadcast>) => void;
  createEvent: (event: Partial<PoliticalEvent>) => void;
  rsvpEvent: (eventId: string) => void;
  publishManifesto: (manifestoId: string) => void;
  voteManifestoItem: (manifestoId: string, itemId: string, support: boolean) => void;
  endorsePolitician: (endorsement: Partial<Endorsement>) => void;
  donateFundraise: (projectId: string, amount: number) => void;
  respondSurvey: (surveyId: string, answers: Record<string, any>) => void;
}

export const usePoliticianPortalStore = create<PoliticianPortalState>((set, get) => ({
  politicians: SEED_POLITICIANS,
  broadcasts: SEED_BROADCASTS,
  events: SEED_EVENTS,
  manifestos: SEED_MANIFESTOS,
  mentorships: SEED_MENTORSHIPS,
  endorsements: SEED_ENDORSEMENTS,
  fundraiseProjects: SEED_FUNDRAISE,
  surveys: SEED_SURVEYS,
  currentPoliticianId: null,

  getPolitician: (id) => get().politicians.find((p) => p.id === id),
  getPoliticianByState: (stateCode) => get().politicians.filter((p) => p.stateCode === stateCode),
  getEventsForPolitician: (politicianId) => get().events.filter((e) => e.politicianId === politicianId),
  getUpcomingEvents: (stateCode) => get().events.filter((e) => (stateCode ? e.stateCode === stateCode : true) && new Date(e.startTime).getTime() > Date.now() && e.status !== 'cancelled').sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
  getBroadcastsForState: (stateCode) => get().broadcasts.filter((b) => b.targetStateCode === stateCode && b.sentAt).sort((a, b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime()),
  getManifesto: (politicianId) => get().manifestos.find((m) => m.politicianId === politicianId && m.status === 'published'),
  getMentorshipsForPolitician: (politicianId) => get().mentorships.filter((m) => m.mentorId === politicianId || m.menteeId === politicianId),
  getEndorsementsForPolitician: (politicianId) => get().endorsements.filter((e) => e.endorseeId === politicianId),
  getFundraiseForPolitician: (politicianId) => get().fundraiseProjects.filter((f) => f.politicianId === politicianId),
  getActiveSurveys: (stateCode) => get().surveys.filter((s) => s.status === 'active' && (stateCode ? s.targetStateCode === stateCode : true)),

  setCurrentPolitician: (id) => set({ currentPoliticianId: id }),

  createBroadcast: (broadcast) => set((s) => ({ broadcasts: [{ id: `cb-${Date.now()}`, politicianId: '', type: 'announcement', title: '', body: '', mediaUrls: [], targetScope: 'constituency', targetStateCode: '', sentAt: new Date().toISOString(), readCount: 0, reactionCount: 0, replyCount: 0, createdAt: new Date().toISOString(), ...broadcast } as ConstituentBroadcast, ...s.broadcasts] })),

  createEvent: (event) => set((s) => ({ events: [...s.events, { id: `pe-${Date.now()}`, politicianId: '', politicianName: '', type: 'meeting', status: 'planned', title: '', description: '', venue: '', address: '', stateCode: '', startTime: '', endTime: '', isPublic: true, rsvpCount: 0, mediaUrls: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...event } as PoliticalEvent] })),

  rsvpEvent: (eventId) => set((s) => ({ events: s.events.map((e) => e.id === eventId ? { ...e, rsvpCount: e.rsvpCount + 1 } : e) })),

  publishManifesto: (manifestoId) => set((s) => ({ manifestos: s.manifestos.map((m) => m.id === manifestoId ? { ...m, status: 'published' as const, publishedAt: new Date().toISOString() } : m) })),

  voteManifestoItem: (manifestoId, itemId, support) => set((s) => ({
    manifestos: s.manifestos.map((m) => m.id === manifestoId ? {
      ...m, items: m.items.map((i) => i.id === itemId ? { ...i, supportVotes: i.supportVotes + (support ? 1 : 0), opposeVotes: i.opposeVotes + (support ? 0 : 1) } : i),
    } : m),
  })),

  endorsePolitician: (endorsement) => set((s) => ({ endorsements: [...s.endorsements, { id: `en-${Date.now()}`, endorserId: '', endorserName: '', endorserTier: 'aspirant', endorseeId: '', endorseeName: '', type: 'general', message: '', isPublic: true, createdAt: new Date().toISOString(), ...endorsement } as Endorsement] })),

  donateFundraise: (projectId, amount) => set((s) => ({ fundraiseProjects: s.fundraiseProjects.map((f) => f.id === projectId ? { ...f, raisedAmount: f.raisedAmount + amount, donorCount: f.donorCount + 1 } : f) })),

  respondSurvey: (surveyId, _answers) => set((s) => ({ surveys: s.surveys.map((sv) => sv.id === surveyId ? { ...sv, responseCount: sv.responseCount + 1 } : sv) })),
}));
