function seedDate(daysAgo: number, hoursOffset: number = 0): string {
  return new Date(Date.now() - (daysAgo * 24 + hoursOffset) * 3600 * 1000).toISOString();
}

import { create } from 'zustand';
import type {
  Post,
  Comment,
  ReactionType,
  PostType,
  PostMedia,
  FeedScope,
  SortOrder,
} from '../lib/feedTypes';
import * as dataService from '../lib/supabaseDataService';
import { enqueue, getPendingOps, type SyncStatus, retryFailedOp } from '../lib/offlineSync';
import { rankPostsV1 } from '../lib/feedRanking';
import { isOnline } from '../lib/networkStatus';
import { isSupabaseConfigured } from '../lib/supabase';
import { IS_LIVE_ENVIRONMENT } from '../lib/environment';
import { logContentAction } from '../lib/contentAccountability';
import { useAuthStore } from './auth';

/**
 * Development-only synthetic posts for offline-first UI previews.
 * Multi-state: TS, AP, KA, MH, and National-scope posts.
 * These records are fixtures and must never appear in production.
 */
const SEED_POSTS: Post[] = [
  // ─── Telangana ──────────────────────────────────────────────
  {
    id: 'seed-ts-1',
    author: { id: 'system', displayName: 'Telangana State Election Authority', isVerified: true },
    stateCode: 'TS',
    content: 'Civic Advisory: Special Summary Revision of Electoral Rolls (SSR 2026) claims and objections window is now open across all 119 Assembly Constituencies. Citizens who turn 18 on or before July 1, 2026, can submit Form 6 online or via your local Booth Level Officer (BLO). #telangana #ssr2026 #voterregistration',
    type: 'alert',
    replyCount: 5,
    reactionCount: 84,
    isPinned: true,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(1, 2),
    updatedAt: seedDate(1, 2),
    hashtags: ['telangana', 'ssr2026', 'voterregistration'],
  },
  {
    id: 'seed-ts-2',
    author: {
      id: 'demo-aspirant-1',
      displayName: 'Priya Reddy',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      isVerified: true,
    },
    stateCode: 'AP',
    constituencyId: 'AP-AC-101',
    constituencyName: 'Macherla',
    content: 'ఈరోజు రెంటచింతల మండల పరిధిలో రైతులతో సాగునీటి సరఫరాపై విస్తృత సమీక్ష నిర్వహించాము. చివరి ఆయకట్టు వరకు నీరందేలా ఇరిగేషన్ అధికారులతో క్షేత్రస్థాయి పరిశీలన చేపట్టడం జరిగింది. రైతన్నల సమస్యలను ప్రభుత్వం దృష్టికి తీసుకెళ్లి పరిష్కారానికి కట్టుబడి ఉన్నాను. #MacherlaFarmers #WaterSecurity #PalnaduDevelopment',
    type: 'discussion',
    replyCount: 184,
    reactionCount: 1248,
    isPinned: true,
    isDeleted: false,
    language: 'te',
    createdAt: seedDate(0, 2),
    updatedAt: seedDate(0, 2),
    hashtags: ['MacherlaFarmers', 'WaterSecurity', 'PalnaduDevelopment'],
    media: [
      {
        id: 'med-pr-1',
        mediaType: 'image',
        url: 'https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?auto=format&fit=crop&w=600&q=80',
        altText: 'Field inspection in Rentachintala',
      },
    ],
  },
  {
    id: 'seed-ts-2-poll',
    author: {
      id: 'demo-aspirant-1',
      displayName: 'Priya Reddy',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      isVerified: true,
    },
    stateCode: 'AP',
    constituencyId: 'AP-AC-101',
    constituencyName: 'Macherla',
    content: 'మాచర్ల పట్టణంలో వచ్చే ఆర్థిక సంవత్సరంలో అత్యవసరంగా చేపట్టాల్సిన మొదటి ప్రాజెక్ట్ ఏది అని మీరు భావిస్తున్నారు? మీ అభిప్రాయాన్ని ఓటు ద్వారా తెలపండి:',
    type: 'poll',
    replyCount: 42,
    reactionCount: 386,
    isPinned: false,
    isDeleted: false,
    language: 'te',
    createdAt: seedDate(0, 6),
    updatedAt: seedDate(0, 6),
    hashtags: ['CitizenPoll', 'MacherlaDevelopment'],
    poll: {
      id: 'poll-pr-1',
      question: 'మాచర్ల పట్టణంలో అత్యవసర మొదటి ప్రాజెక్ట్ ఏది?',
      options: [
        { id: 'opt-1', label: '1. మంచినీటి పైప్‌లైన్ విస్తరణ', voteCount: 1412, sortOrder: 1 },
        { id: 'opt-2', label: '2. బైపాస్ రోడ్డు గుంతల మరమ్మత్తు', voteCount: 546, sortOrder: 2 },
        { id: 'opt-3', label: '3. ప్రభుత్వ ఆసుపత్రి అప్‌గ్రేడేషన్', voteCount: 318, sortOrder: 3 },
      ],
      totalVotes: 2276,
      isClosed: false,
    },
  },
  {
    id: 'seed-ts-3',
    author: { id: 'demo-ts-3', displayName: 'Ravi Kumar' },
    stateCode: 'TS',
    constituencyId: 'TS-AC-75',
    constituencyName: 'Goshamahal',
    content: 'Attended the constituency-level review meeting today. Some interesting stats: 43 new ration cards issued this month, 12 pending pension cases cleared. Progress is slow but visible. #goshamahal #governance',
    type: 'discussion',
    replyCount: 3,
    reactionCount: 15,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 7),
    updatedAt: seedDate(0, 7),
    hashtags: ['goshamahal', 'governance'],
  },
  {
    id: 'seed-ts-4',
    author: { id: 'demo-ts-4', displayName: 'Meena Devi' },
    stateCode: 'TS',
    content: 'Do you think the defection of opposition MLAs to the ruling party has improved project delivery in those constituencies?',
    type: 'poll',
    replyCount: 4,
    reactionCount: 52,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 8),
    updatedAt: seedDate(0, 8),
    hashtags: ['defections', 'governance', 'telangana'],
    poll: {
      id: 'poll-ts-1',
      question: 'Do you think the defection of opposition MLAs to the ruling party has improved project delivery in those constituencies?',
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
    author: { id: 'demo-ts-5', displayName: 'Anil Sharma', isVerified: true },
    stateCode: 'TS',
    constituencyId: 'TS-AC-29',
    constituencyName: 'Sircilla',
    content: 'KTR\'s victory margin in Sircilla — over 51,000 votes — highlights the strength of localized textile park initiatives. Even in competitive political cycles, persistent grassroots infrastructure builds deep incumbency resilience. #sircilla #textiles #governance',
    type: 'opinion',
    replyCount: 3,
    reactionCount: 68,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 10),
    updatedAt: seedDate(0, 10),
    hashtags: ['sircilla', 'textiles', 'governance'],
  },
  {
    id: 'seed-ts-6',
    author: { id: 'demo-ts-6', displayName: 'Fatima Begum' },
    stateCode: 'TS',
    constituencyId: 'TS-AC-77',
    constituencyName: 'Charminar',
    content: 'Water supply schedule in Old City needs urgent rationalization. Pipeline maintenance in Moghalpura has caused intermittent outages. HMWSSB water tankers must be dispatched on regular timings. #charminar #watersupply #hyderabad',
    type: 'discussion',
    replyCount: 3,
    reactionCount: 45,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(1, 2),
    updatedAt: seedDate(1, 2),
    hashtags: ['charminar', 'watersupply', 'hyderabad'],
  },
  {
    id: 'seed-ts-c1',
    author: { id: 'demo-ts-c1', displayName: 'Harish Goud' },
    stateCode: 'TS',
    constituencyId: 'TS-AC-67',
    constituencyName: 'Serilingampally',
    content: 'Nallagandla lake bund walking track is finally getting LED streetlights after 2 years of resident association petitions. Civic persistence delivers results! #serilingampally #nallagandla #civicwin',
    type: 'discussion',
    replyCount: 3,
    reactionCount: 41,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 3),
    updatedAt: seedDate(0, 3),
    hashtags: ['serilingampally', 'nallagandla', 'civicwin'],
  },
  {
    id: 'seed-ts-c2',
    author: { id: 'demo-ts-c2', displayName: 'Deccan Chronicle Civic Desk', isVerified: true },
    stateCode: 'TS',
    constituencyId: 'TS-AC-67',
    constituencyName: 'Serilingampally',
    content: 'GHMC approves ₹48 crore stormwater drain trunk line across Serilingampally to tackle recurring Gachibowli–Kondapur arterial waterlogging before monsoon 2026. #serilingampally #ghmc #drainage',
    type: 'news',
    replyCount: 2,
    reactionCount: 72,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 4),
    updatedAt: seedDate(0, 4),
    hashtags: ['serilingampally', 'ghmc', 'drainage'],
  },

  // ─── Andhra Pradesh ─────────────────────────────────────────
  {
    id: 'seed-ap-1',
    author: { id: 'system', displayName: 'AP Civic Command Centre', isVerified: true },
    stateCode: 'AP',
    content: 'Amaravati Capital City Development Phase 2 tenders officially opened for CRDA arterial road networks and government housing towers. All public notices and town planning maps are open for public consultation. #amaravati #crda #andhrapradesh',
    type: 'alert',
    replyCount: 3,
    reactionCount: 92,
    isPinned: true,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(1, 2),
    updatedAt: seedDate(1, 2),
    hashtags: ['amaravati', 'crda', 'andhrapradesh'],
  },
  {
    id: 'seed-ap-2',
    author: { id: 'demo-ap-2', displayName: 'Srinivas Rao' },
    stateCode: 'AP',
    constituencyId: 'AP-AC-7',
    constituencyName: 'Mangalagiri',
    content: 'Mangalagiri weaving cluster modern design center inaugurated today. Expected to directly support 1,800 handloom artisan families with digital export linkages. #mangalagiri #handlooms #welfare',
    type: 'news',
    replyCount: 3,
    reactionCount: 67,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 5),
    updatedAt: seedDate(0, 5),
    hashtags: ['mangalagiri', 'handlooms', 'welfare'],
  },
  {
    id: 'seed-ap-3',
    author: { id: 'demo-ap-3', displayName: 'Padma Lakshmi' },
    stateCode: 'AP',
    constituencyId: 'AP-AC-145',
    constituencyName: 'Kurnool',
    content: 'The revived Anna Canteen in Kurnool Old Bus Stand is serving nutritious breakfast and meals at ₹5. Has anyone visited recently? How is the hygiene and token management? #annacanteen #kurnool',
    type: 'question',
    replyCount: 3,
    reactionCount: 38,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 7),
    updatedAt: seedDate(0, 7),
    hashtags: ['annacanteen', 'kurnool'],
  },
  {
    id: 'seed-ap-4',
    author: { id: 'demo-ap-4', displayName: 'Rajesh Nayak' },
    stateCode: 'AP',
    content: 'How would you rate the progress of welfare DBT delivery and capital reconstruction across Andhra Pradesh?',
    type: 'poll',
    replyCount: 3,
    reactionCount: 78,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 9),
    updatedAt: seedDate(0, 9),
    hashtags: ['andhrapradesh', 'governance', 'dbt'],
    poll: {
      id: 'poll-ap-1',
      question: 'How would you rate the progress of welfare DBT delivery and capital reconstruction across Andhra Pradesh?',
      options: [
        { id: 'opt-ap1a', label: 'Substantial visible acceleration', voteCount: 88, sortOrder: 0 },
        { id: 'opt-ap1b', label: 'Satisfactory but needs faster execution', voteCount: 65, sortOrder: 1 },
        { id: 'opt-ap1c', label: 'Slow on capital infra', voteCount: 32, sortOrder: 2 },
        { id: 'opt-ap1d', label: 'Needs better fiscal clarity', voteCount: 22, sortOrder: 3 },
      ],
      totalVotes: 207,
      isClosed: false,
    },
  },

  // ─── Karnataka ──────────────────────────────────────────────
  {
    id: 'seed-ka-1',
    author: { id: 'system', displayName: 'BBMP Urban Observatory', isVerified: true },
    stateCode: 'KA',
    content: 'Bengaluru Climate Action Notice: Pre-monsoon desilting of Raja Kaluve (storm drains) completed in Koramangala and Bellandur valleys. Residents can report blocked culverts via Sahaaya 2.0. #bengaluru #bbmp #monsoonprep',
    type: 'alert',
    replyCount: 2,
    reactionCount: 65,
    isPinned: true,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(1, 2),
    updatedAt: seedDate(1, 2),
    hashtags: ['bengaluru', 'bbmp', 'monsoonprep'],
  },
  {
    id: 'seed-ka-2',
    author: { id: 'demo-ka-2', displayName: 'Manjunath B' },
    stateCode: 'KA',
    constituencyId: 'KA-AC-176',
    constituencyName: 'Jayanagar',
    content: 'Jayanagar 4th Block pedestrian sidewalk redesign has been completed. Wide pavements, tree preservation, and designated street-vending bays. Excellent model for other Bengaluru constituencies! #bengaluru #jayanagar #urbanplanning',
    type: 'discussion',
    replyCount: 3,
    reactionCount: 89,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 6),
    updatedAt: seedDate(0, 6),
    hashtags: ['bengaluru', 'jayanagar', 'urbanplanning'],
  },
  {
    id: 'seed-ka-3',
    author: { id: 'demo-ka-3', displayName: 'Lakshmi Narayan' },
    stateCode: 'KA',
    content: 'What should be Karnataka\'s highest public transit investment focus for Tier-2 cities (Mysuru, Hubballi-Dharwad, Belagavi)?',
    type: 'poll',
    replyCount: 2,
    reactionCount: 54,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 8),
    updatedAt: seedDate(0, 8),
    hashtags: ['karnataka', 'tier2', 'transit'],
    poll: {
      id: 'poll-ka-1',
      question: 'What should be Karnataka\'s highest public transit investment focus for Tier-2 cities?',
      options: [
        { id: 'opt-ka1a', label: 'Suburban Electric Rail', voteCount: 94, sortOrder: 0 },
        { id: 'opt-ka1b', label: 'Dedicated BRTS bus corridors', voteCount: 48, sortOrder: 1 },
        { id: 'opt-ka1c', label: 'Ring Road outer expressways', voteCount: 52, sortOrder: 2 },
        { id: 'opt-ka1d', label: 'Intercity High Speed Vande Metro', voteCount: 86, sortOrder: 3 },
      ],
      totalVotes: 280,
      isClosed: false,
    },
  },

  // ─── Maharashtra ────────────────────────────────────────────
  {
    id: 'seed-mh-1',
    author: { id: 'system', displayName: 'BMC Disaster Management', isVerified: true },
    stateCode: 'MH',
    content: 'Mumbai Coastal Road Phase 2 traffic advisory: Marine Drive to Bandra-Worli Sea Link connection opened for uninterrupted transit. Speed limit strictly regulated at 80 km/h with AI speed cameras. #mumbai #coastalroad #traffic',
    type: 'alert',
    replyCount: 2,
    reactionCount: 110,
    isPinned: true,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(1, 2),
    updatedAt: seedDate(1, 2),
    hashtags: ['mumbai', 'coastalroad', 'traffic'],
  },
  {
    id: 'seed-mh-2',
    author: { id: 'demo-mh-2', displayName: 'Sachin Pawar' },
    stateCode: 'MH',
    constituencyId: 'MH-AC-180',
    constituencyName: 'Andheri East',
    content: 'Metro Line 7 + Line 2A integration has reduced Western Express Highway peak hour bottleneck noticeably. However, feeder electric buses from Gundavali and Chakala are sorely missing. #mumbai #metro #andheri',
    type: 'discussion',
    replyCount: 3,
    reactionCount: 76,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 7),
    updatedAt: seedDate(0, 7),
    hashtags: ['mumbai', 'metro', 'andheri'],
  },
  {
    id: 'seed-mh-3',
    author: { id: 'demo-mh-3', displayName: 'Prachi Deshmukh' },
    stateCode: 'MH',
    content: 'Direct benefit transfer schemes vs Capital asset creation — what is the right balance for Maharashtra\'s budget?',
    type: 'poll',
    replyCount: 3,
    reactionCount: 88,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 9),
    updatedAt: seedDate(0, 9),
    hashtags: ['maharashtra', 'economy', 'budget'],
    poll: {
      id: 'poll-mh-1',
      question: 'Direct benefit transfer schemes vs Capital asset creation — what is the right balance for Maharashtra\'s budget?',
      options: [
        { id: 'opt-mh1a', label: 'Prioritize Long-term Infra & Water', voteCount: 112, sortOrder: 0 },
        { id: 'opt-mh1b', label: 'Balanced 50-50 social safety net', voteCount: 84, sortOrder: 1 },
        { id: 'opt-mh1c', label: 'Targeted farmer & women welfare first', voteCount: 68, sortOrder: 2 },
        { id: 'opt-mh1d', label: 'Fiscal deficit containment', voteCount: 36, sortOrder: 3 },
      ],
      totalVotes: 300,
      isClosed: false,
    },
  },

  // ─── National Scope ─────────────────────────────────────────
  {
    id: 'seed-nat-1',
    author: { id: 'demo-nat-1', displayName: 'India Policy Forum', isVerified: true },
    stateCode: 'NATIONAL',
    content: 'The 16th Finance Commission consultations highlight center-state fiscal federalism. Southern states emphasize rewarding fertility replacement and economic contribution, while northern states seek equity criteria. What formula best balances both? #financecommission #federalism #india',
    type: 'news',
    replyCount: 4,
    reactionCount: 145,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 4),
    updatedAt: seedDate(0, 4),
    hashtags: ['financecommission', 'federalism', 'india'],
  },
  {
    id: 'seed-nat-2',
    author: { id: 'demo-nat-2', displayName: 'National Election Watch', isVerified: true },
    stateCode: 'NATIONAL',
    content: 'Should simultaneous elections (One Nation One Election) be implemented for Lok Sabha and State Assemblies with a unified voter roll?',
    type: 'poll',
    replyCount: 4,
    reactionCount: 210,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 11),
    updatedAt: seedDate(0, 11),
    hashtags: ['onoe', 'elections', 'democracy'],
    poll: {
      id: 'poll-nat-1',
      question: 'Should simultaneous elections (One Nation One Election) be implemented for Lok Sabha and State Assemblies?',
      options: [
        { id: 'opt-nat1a', label: 'Yes, saves immense public funds', voteCount: 164, sortOrder: 0 },
        { id: 'opt-nat1b', label: 'No, weakens federal diversity', voteCount: 122, sortOrder: 1 },
        { id: 'opt-nat1c', label: 'Only with strong regional safeguards', voteCount: 78, sortOrder: 2 },
        { id: 'opt-nat1d', label: 'Need a national referendum first', voteCount: 42, sortOrder: 3 },
      ],
      totalVotes: 406,
      isClosed: false,
    },
  },
  {
    id: 'seed-nat-3',
    author: { id: 'demo-nat-3', displayName: 'Arjun Menon' },
    stateCode: 'NATIONAL',
    content: 'Urban voting turnout remains 10-15% lower than rural turnout across virtually every state in India. What concrete reforms would solve urban apathy — remote voting machines, mandatory holiday enforcement, or civic score incentives? #voterturnout #civicduty #elections',
    type: 'opinion',
    replyCount: 3,
    reactionCount: 96,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(1, 8),
    updatedAt: seedDate(1, 8),
    hashtags: ['voterturnout', 'civicduty', 'elections'],
  },
  {
    id: 'seed-nat-4',
    author: { id: 'demo-nat-4', displayName: 'Delimitation Observatory', isVerified: true },
    stateCode: 'NATIONAL',
    content: 'The Post-2026 Delimitation debate: Southern states have kept population growth around 1.6 TFR while northern states average 2.1+. Capping Lok Sabha representation ratio while increasing Rajya Sabha powers is emerging as a pragmatic constitutional compromise. #delimitation #parliament #constitution',
    type: 'discussion',
    replyCount: 3,
    reactionCount: 168,
    isPinned: false,
    isDeleted: false,
    language: 'en',
    createdAt: seedDate(0, 3),
    updatedAt: seedDate(0, 3),
    hashtags: ['delimitation', 'parliament', 'constitution'],
  },
];

/**
 * Rich, contextually accurate comments for ALL seed posts.
 * Provides authentic civic discussions across all states and topics.
 */
const SEED_COMMENTS: Record<string, Comment[]> = {
  'seed-ts-1': [
    {
      id: 'c-ts1-1',
      postId: 'seed-ts-1',
      author: { id: 'user-ts-1', displayName: 'Kavitha R', isVerified: true },
      content: 'Submitted Form 6 through the Voter Helpline App yesterday. The verification OTP arrived instantly.',
      reactionCount: 12,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 1),
      updatedAt: seedDate(1, 1),
    },
    {
      id: 'c-ts1-2',
      postId: 'seed-ts-1',
      author: { id: 'user-ts-2', displayName: 'Venkatesh Rao' },
      content: 'Will BLOs be conducting door-to-door verification this weekend in Hyderabad wards?',
      reactionCount: 7,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 1),
      updatedAt: seedDate(1, 1),
    },
    {
      id: 'c-ts1-3',
      postId: 'seed-ts-1',
      author: { id: 'system', displayName: 'Telangana State Election Authority', isVerified: true },
      content: 'Yes, special camps will be organized at all designated polling stations on Saturday and Sunday from 10:00 AM to 5:00 PM.',
      reactionCount: 24,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 10),
      updatedAt: seedDate(1, 10),
    },
    {
      id: 'c-ts1-4',
      postId: 'seed-ts-1',
      author: { id: 'user-ts-3', displayName: 'Md. Rizwan' },
      content: 'Good initiative. Please ensure college campuses have on-spot voter ID registration drives.',
      reactionCount: 9,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 9),
      updatedAt: seedDate(1, 9),
    },
    {
      id: 'c-ts1-5',
      postId: 'seed-ts-1',
      author: { id: 'user-ts-4', displayName: 'Sunita G' },
      content: 'Sharing this in our resident welfare group. Everyone turning 18 must be registered.',
      reactionCount: 15,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 8),
      updatedAt: seedDate(1, 8),
    },
  ],
  'seed-ts-2': [
    {
      id: 'c-ts2-1',
      postId: 'seed-ts-2',
      author: { id: 'demo-7', displayName: 'Suresh K' },
      content: 'Same issue near Kondapur. Filed a grievance on T-App Folio 2 weeks ago, waiting for acknowledgement.',
      reactionCount: 5,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 5),
      updatedAt: seedDate(0, 5),
    },
    {
      id: 'c-ts2-2',
      postId: 'seed-ts-2',
      author: { id: 'demo-8', displayName: 'Lakshmi P' },
      content: 'The ORR service road jurisdiction rests with HGCL (Hyderabad Growth Corridor Ltd). Email their chief engineer directly; that worked for us in Nanakramguda.',
      reactionCount: 14,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 5),
      updatedAt: seedDate(0, 5),
    },
    {
      id: 'c-ts2-3',
      postId: 'seed-ts-2',
      author: { id: 'demo-ts-c1', displayName: 'Harish Goud' },
      content: 'We are raising this at the zonal corporator review meeting tomorrow. Will post the update here.',
      reactionCount: 8,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 4),
      updatedAt: seedDate(0, 4),
    },
    {
      id: 'c-ts2-4',
      postId: 'seed-ts-2',
      author: { id: 'user-ts-5', displayName: 'Aditya Varma' },
      content: 'Dust pollution on this stretch has become unbearable during morning commutes. Temporary wet-rolling should be done immediately.',
      reactionCount: 11,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 4),
      updatedAt: seedDate(0, 4),
    },
  ],
  'seed-ts-3': [
    {
      id: 'c-ts3-1',
      postId: 'seed-ts-3',
      author: { id: 'user-ts-6', displayName: 'Naresh Joshi' },
      content: 'Glad to hear pensions are being cleared. Many senior citizens in Begum Bazar were waiting since November.',
      reactionCount: 6,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 7),
      updatedAt: seedDate(0, 7),
    },
    {
      id: 'c-ts3-2',
      postId: 'seed-ts-3',
      author: { id: 'user-ts-7', displayName: 'Kishore G' },
      content: 'Any updates on the market drainage renovation near Mozamjahi Market?',
      reactionCount: 4,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 6),
      updatedAt: seedDate(0, 6),
    },
    {
      id: 'c-ts3-3',
      postId: 'seed-ts-3',
      author: { id: 'demo-ts-3', displayName: 'Ravi Kumar' },
      content: 'Yes, that project is in Phase 2, scheduled for tender release next month.',
      reactionCount: 7,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 6),
      updatedAt: seedDate(0, 6),
    },
  ],
  'seed-ts-4': [
    {
      id: 'c-ts4-1',
      postId: 'seed-ts-4',
      author: { id: 'user-ts-8', displayName: 'Chandra Shekar' },
      content: 'Ground reality depends on whether the constituency development fund is actually sanctioned or held up.',
      reactionCount: 18,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 8),
      updatedAt: seedDate(0, 8),
    },
    {
      id: 'c-ts4-2',
      postId: 'seed-ts-4',
      author: { id: 'user-ts-9', displayName: 'Deepak Reddy' },
      content: 'In my constituency, civic work stalled because the contractor payments from the previous term remain unsettled.',
      reactionCount: 9,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 7),
      updatedAt: seedDate(0, 7),
    },
    {
      id: 'c-ts4-3',
      postId: 'seed-ts-4',
      author: { id: 'user-ts-10', displayName: 'Ananya S' },
      content: 'Voters judge by their road, tap water, and power stability. Defections don\'t automatically convert to public goodwill.',
      reactionCount: 22,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 6),
      updatedAt: seedDate(0, 6),
    },
    {
      id: 'c-ts4-4',
      postId: 'seed-ts-4',
      author: { id: 'user-ts-11', displayName: 'Rajender T' },
      content: 'Anti-defection law needs stringent time-bound disqualification within 90 days.',
      reactionCount: 31,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 5),
      updatedAt: seedDate(0, 5),
    },
  ],
  'seed-ts-5': [
    {
      id: 'c-ts5-1',
      postId: 'seed-ts-5',
      author: { id: 'user-ts-12', displayName: 'Mallaiah P' },
      content: 'The powerloom worker insurance scheme and yarn subsidies in Sircilla made a genuine difference to household stability.',
      reactionCount: 19,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 10),
      updatedAt: seedDate(0, 10),
    },
    {
      id: 'c-ts5-2',
      postId: 'seed-ts-5',
      author: { id: 'user-ts-13', displayName: 'Kalyan Chakravarthy' },
      content: 'True, but rural distress in non-weaving mandals needs equal industrial diversification.',
      reactionCount: 8,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 9),
      updatedAt: seedDate(0, 9),
    },
    {
      id: 'c-ts5-3',
      postId: 'seed-ts-5',
      author: { id: 'demo-ts-5', displayName: 'Anil Sharma', isVerified: true },
      content: 'Agreed Kalyan. Sircilla’s challenge now is apparel export competitiveness and modern dyeing eco-parks.',
      reactionCount: 14,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 8),
      updatedAt: seedDate(0, 8),
    },
  ],
  'seed-ts-6': [
    {
      id: 'c-ts6-1',
      postId: 'seed-ts-6',
      author: { id: 'user-ts-14', displayName: 'Syed Farhan' },
      content: 'Water pressure in Shahalibanda is also very low. Tankers take 36 hours to arrive after online booking.',
      reactionCount: 16,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 2),
      updatedAt: seedDate(1, 2),
    },
    {
      id: 'c-ts6-2',
      postId: 'seed-ts-6',
      author: { id: 'user-ts-15', displayName: 'Mirza Baig' },
      content: 'Spoke with General Manager HMWSSB Division II today; pipe replacement work is scheduled for next Tuesday.',
      reactionCount: 21,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 1),
      updatedAt: seedDate(1, 1),
    },
    {
      id: 'c-ts6-3',
      postId: 'seed-ts-6',
      author: { id: 'demo-ts-6', displayName: 'Fatima Begum' },
      content: 'Thank you Mirza bhai! Please post the helpline contact once the work begins.',
      reactionCount: 12,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 1),
      updatedAt: seedDate(0, 1),
    },
  ],
  'seed-ts-c1': [
    {
      id: 'c-tsc1-1',
      postId: 'seed-ts-c1',
      author: { id: 'user-ts-16', displayName: 'Aparna V' },
      content: 'Wonderful news! Evening walks after 7 PM will be much safer for women and elderly walkers.',
      reactionCount: 18,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 3),
      updatedAt: seedDate(0, 3),
    },
    {
      id: 'c-tsc1-2',
      postId: 'seed-ts-c1',
      author: { id: 'user-ts-17', displayName: 'Sanjay N' },
      content: 'Kudos Harish for following up with the lake protection committee continuously.',
      reactionCount: 12,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 2),
      updatedAt: seedDate(0, 2),
    },
    {
      id: 'c-tsc1-3',
      postId: 'seed-ts-c1',
      author: { id: 'user-ts-18', displayName: 'Dr. Ramesh' },
      content: 'Next on the agenda: designated dustbins every 100 meters to keep the bund litter-free.',
      reactionCount: 15,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 2),
      updatedAt: seedDate(0, 2),
    },
  ],
  'seed-ts-c2': [
    {
      id: 'c-tsc2-1',
      postId: 'seed-ts-c2',
      author: { id: 'user-ts-19', displayName: 'Goutham Tej' },
      content: 'High time! The flyover underpass near Cyber Towers flooded 4 times last August.',
      reactionCount: 22,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 3),
      updatedAt: seedDate(0, 3),
    },
    {
      id: 'c-tsc2-2',
      postId: 'seed-ts-c2',
      author: { id: 'user-ts-20', displayName: 'Swathi Mohan' },
      content: 'Hope GHMC monitors the contractors so that open trenches are not left abandoned during peak monsoon.',
      reactionCount: 19,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 3),
      updatedAt: seedDate(0, 3),
    },
  ],
  'seed-ap-1': [
    {
      id: 'c-ap1-1',
      postId: 'seed-ap-1',
      author: { id: 'user-ap-1', displayName: 'Naveen Chowdary' },
      content: 'High court and secretariat connectivity road contracts have also been awarded. Amaravati is regaining serious momentum.',
      reactionCount: 28,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 1),
      updatedAt: seedDate(1, 1),
    },
    {
      id: 'c-ap1-2',
      postId: 'seed-ap-1',
      author: { id: 'user-ap-2', displayName: 'Bhaskar Reddy' },
      content: 'CRDA must ensure farmer annuity payments are credited on the 1st of every month without delays.',
      reactionCount: 19,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 1),
      updatedAt: seedDate(1, 1),
    },
    {
      id: 'c-ap1-3',
      postId: 'seed-ap-1',
      author: { id: 'user-ap-3', displayName: 'Divya P' },
      content: 'Green cover and solar rooftop mandates should be strictly integrated into the building bylaws.',
      reactionCount: 14,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 10),
      updatedAt: seedDate(1, 10),
    },
  ],
  'seed-ap-2': [
    {
      id: 'c-ap2-1',
      postId: 'seed-ap-2',
      author: { id: 'user-ap-4', displayName: 'Subba Rao' },
      content: 'Mangalagiri sarees have GI tag protection, but authentic weavers need direct marketplace apps to cut out middlemen.',
      reactionCount: 23,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 5),
      updatedAt: seedDate(0, 5),
    },
    {
      id: 'c-ap2-2',
      postId: 'seed-ap-2',
      author: { id: 'user-ap-5', displayName: 'Murali Krishna' },
      content: 'The new bypass road from Mangalagiri AIIMS to Vijayawada highway has also eased heavy traffic.',
      reactionCount: 16,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 4),
      updatedAt: seedDate(0, 4),
    },
    {
      id: 'c-ap2-3',
      postId: 'seed-ap-2',
      author: { id: 'demo-ap-2', displayName: 'Srinivas Rao' },
      content: 'Yes Murali, AIIMS doctors and visitors can reach Vijayawada junction in just 18 minutes now.',
      reactionCount: 11,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 3),
      updatedAt: seedDate(0, 3),
    },
  ],
  'seed-ap-3': [
    {
      id: 'c-ap3-1',
      postId: 'seed-ap-3',
      author: { id: 'user-ap-6', displayName: 'Shankar Gowd' },
      content: 'Visited yesterday with my family. The sambar rice and curd rice quality is very good, completely hygienic.',
      reactionCount: 14,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 6),
      updatedAt: seedDate(0, 6),
    },
    {
      id: 'c-ap3-2',
      postId: 'seed-ap-3',
      author: { id: 'user-ap-7', displayName: 'Vijaya Shanti' },
      content: 'Tremendous relief for daily wage workers and patients coming to Kurnool Government General Hospital.',
      reactionCount: 17,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 5),
      updatedAt: seedDate(0, 5),
    },
    {
      id: 'c-ap3-3',
      postId: 'seed-ap-3',
      author: { id: 'demo-ap-3', displayName: 'Padma Lakshmi' },
      content: 'Great to hear! Hope municipal officials maintain this standard throughout the year.',
      reactionCount: 8,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 5),
      updatedAt: seedDate(0, 5),
    },
  ],
  'seed-ap-4': [
    {
      id: 'c-ap4-1',
      postId: 'seed-ap-4',
      author: { id: 'user-ap-8', displayName: 'Krishna Murthy' },
      content: 'Fiscal consolidation while funding capital works will require higher private investments in ports and industrial corridors.',
      reactionCount: 26,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 9),
      updatedAt: seedDate(0, 9),
    },
    {
      id: 'c-ap4-2',
      postId: 'seed-ap-4',
      author: { id: 'user-ap-9', displayName: 'Pradeep Naidu' },
      content: 'The restart of central grant allocations and World Bank loans for Amaravati provides immediate fiscal runway.',
      reactionCount: 19,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 8),
      updatedAt: seedDate(0, 8),
    },
    {
      id: 'c-ap4-3',
      postId: 'seed-ap-4',
      author: { id: 'user-ap-10', displayName: 'Satya Narayana' },
      content: 'Agriculture power subsidy and water release management in Rayalaseema must remain uninterrupted.',
      reactionCount: 15,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 7),
      updatedAt: seedDate(0, 7),
    },
  ],
  'seed-ka-1': [
    {
      id: 'c-ka1-1',
      postId: 'seed-ka-1',
      author: { id: 'user-ka-1', displayName: 'Vinay Hegde' },
      content: 'Bellandur lake wetland dredging has shown improvement, but secondary stormwater inlets still carry silt.',
      reactionCount: 18,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 1),
      updatedAt: seedDate(1, 1),
    },
    {
      id: 'c-ka1-2',
      postId: 'seed-ka-1',
      author: { id: 'user-ka-2', displayName: 'Rashmi Rao' },
      content: 'BBMP Sahaaya helpline response time has improved to under 48 hours for drain clearances.',
      reactionCount: 12,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 1),
      updatedAt: seedDate(1, 1),
    },
  ],
  'seed-ka-2': [
    {
      id: 'c-ka2-1',
      postId: 'seed-ka-2',
      author: { id: 'user-ka-3', displayName: 'Girish Kumar' },
      content: 'TenderSURE design principles applied in Jayanagar demonstrate that human-centric design works in Indian cities.',
      reactionCount: 34,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 6),
      updatedAt: seedDate(0, 6),
    },
    {
      id: 'c-ka2-2',
      postId: 'seed-ka-2',
      author: { id: 'user-ka-4', displayName: 'Chetan M' },
      content: 'Now please replicate this in Indiranagar 100 Feet Road and Koramangala 80 Feet Road.',
      reactionCount: 27,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 5),
      updatedAt: seedDate(0, 5),
    },
    {
      id: 'c-ka2-3',
      postId: 'seed-ka-2',
      author: { id: 'demo-ka-2', displayName: 'Manjunath B' },
      content: 'Agreed Chetan! A public petition to the MLA forum is being drafted right now.',
      reactionCount: 16,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 4),
      updatedAt: seedDate(0, 4),
    },
  ],
  'seed-ka-3': [
    {
      id: 'c-ka3-1',
      postId: 'seed-ka-3',
      author: { id: 'user-ka-5', displayName: 'Siddharth M' },
      content: 'Mysuru and Hubballi-Dharwad already have double-electrified tracks. Running Vande Metro hourly is the most cost-effective solution.',
      reactionCount: 29,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 8),
      updatedAt: seedDate(0, 8),
    },
    {
      id: 'c-ka3-2',
      postId: 'seed-ka-3',
      author: { id: 'user-ka-6', displayName: 'Deepak Shastri' },
      content: 'Hubballi-Dharwad BRTS has been nationally praised. Expanding feeder mini-buses will maximize ridership.',
      reactionCount: 21,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 7),
      updatedAt: seedDate(0, 7),
    },
  ],
  'seed-mh-1': [
    {
      id: 'c-mh1-1',
      postId: 'seed-mh-1',
      author: { id: 'user-mh-1', displayName: 'Rohan Mehta' },
      content: 'Drove through the coastal road tunnel yesterday. Cut down Marine Drive to Worli travel time from 40 mins to 11 mins.',
      reactionCount: 42,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 1),
      updatedAt: seedDate(1, 1),
    },
    {
      id: 'c-mh1-2',
      postId: 'seed-mh-1',
      author: { id: 'user-mh-2', displayName: 'Aditi Sawant' },
      content: 'Now BMC must finish the promenade walking tracks and cycle paths along the Worli seafront as promised.',
      reactionCount: 28,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 1),
      updatedAt: seedDate(1, 1),
    },
  ],
  'seed-mh-2': [
    {
      id: 'c-mh2-1',
      postId: 'seed-mh-2',
      author: { id: 'user-mh-3', displayName: 'Tanmay Kulkarni' },
      content: 'Auto-rickshaw refusal near Gundavali station is rampant. Traffic police need to set up a permanent prepaid booth.',
      reactionCount: 31,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 6),
      updatedAt: seedDate(0, 6),
    },
    {
      id: 'c-mh2-2',
      postId: 'seed-mh-2',
      author: { id: 'user-mh-4', displayName: 'Pooja Bhatt' },
      content: 'BEST mini e-buses on loop routes every 5 minutes from metro stations will permanently solve the problem.',
      reactionCount: 25,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 6),
      updatedAt: seedDate(0, 6),
    },
    {
      id: 'c-mh2-3',
      postId: 'seed-mh-2',
      author: { id: 'demo-mh-2', displayName: 'Sachin Pawar' },
      content: 'Spot on Pooja! We submitted a memorandum to BEST General Manager last Thursday with 650 resident signatures.',
      reactionCount: 19,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 5),
      updatedAt: seedDate(0, 5),
    },
  ],
  'seed-mh-3': [
    {
      id: 'c-mh3-1',
      postId: 'seed-mh-3',
      author: { id: 'user-mh-5', displayName: 'Aniket Shinde' },
      content: 'Drought mitigation in Marathwada through water grid pipelines must be the number one priority. Without irrigation security, farm welfare transfers are mere palliatives.',
      reactionCount: 45,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 8),
      updatedAt: seedDate(0, 8),
    },
    {
      id: 'c-mh3-2',
      postId: 'seed-mh-3',
      author: { id: 'user-mh-6', displayName: 'Sunil Gaikwad' },
      content: 'Women\'s self-help group revolving funds have catalyzed micro-enterprises across western Maharashtra. Social safety nets are essential economic catalysts.',
      reactionCount: 33,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 7),
      updatedAt: seedDate(0, 7),
    },
    {
      id: 'c-mh3-3',
      postId: 'seed-mh-3',
      author: { id: 'user-mh-7', displayName: 'Neeraj Deshpande' },
      content: 'Capital expenditure generates multi-year tax revenues, whereas non-merit subsidies risk rating downgrades. Prudent fiscal management is paramount.',
      reactionCount: 24,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 7),
      updatedAt: seedDate(0, 7),
    },
  ],
  'seed-nat-1': [
    {
      id: 'c-nat1-1',
      postId: 'seed-nat-1',
      author: { id: 'user-nat-1', displayName: 'Prof. Raghavan S', isVerified: true },
      content: 'The 16th Finance Commission must maintain at least 42% untied tax devolution to states while re-weighting ecological and demographic performance criteria.',
      reactionCount: 52,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 4),
      updatedAt: seedDate(0, 4),
    },
    {
      id: 'c-nat1-2',
      postId: 'seed-nat-1',
      author: { id: 'user-nat-2', displayName: 'Amitabh Sen' },
      content: 'Fiscal equalization remains necessary for national harmony, but states that succeed in health and literacy should be awarded explicit incentive bonuses.',
      reactionCount: 41,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 3),
      updatedAt: seedDate(0, 3),
    },
    {
      id: 'c-nat1-3',
      postId: 'seed-nat-1',
      author: { id: 'user-nat-3', displayName: 'Dr. Meenakshi Sundaram' },
      content: 'Cess and surcharges currently bypass divisible pool devolution. Constitutional reform to share non-divisible cesses with states is essential.',
      reactionCount: 68,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 2),
      updatedAt: seedDate(0, 2),
    },
    {
      id: 'c-nat1-4',
      postId: 'seed-nat-1',
      author: { id: 'demo-nat-1', displayName: 'India Policy Forum', isVerified: true },
      content: 'Thank you all for the insightful contributions. A consolidated policy brief including these inputs will be presented in our upcoming parliamentary seminar.',
      reactionCount: 37,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 2),
      updatedAt: seedDate(0, 2),
    },
  ],
  'seed-nat-2': [
    {
      id: 'c-nat2-1',
      postId: 'seed-nat-2',
      author: { id: 'user-nat-4', displayName: 'Advocate Manpreet S' },
      content: 'Frequent election cycles bring persistent governance freezes due to Model Code of Conduct. Synchronizing elections reduces governance downtime.',
      reactionCount: 49,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 11),
      updatedAt: seedDate(0, 11),
    },
    {
      id: 'c-nat2-2',
      postId: 'seed-nat-2',
      author: { id: 'user-nat-5', displayName: 'K. Balachandran' },
      content: 'Regional parties and hyper-local civic issues get overshadowed when national narratives dominate a single synchronized polling day.',
      reactionCount: 62,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 10),
      updatedAt: seedDate(0, 10),
    },
    {
      id: 'c-nat2-3',
      postId: 'seed-nat-2',
      author: { id: 'user-nat-6', displayName: 'Tarun Saxena' },
      content: 'What happens if a state government collapses prematurely after 18 months? Constructive vote of no-confidence provisions must be ironclad.',
      reactionCount: 54,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 9),
      updatedAt: seedDate(0, 9),
    },
    {
      id: 'c-nat2-4',
      postId: 'seed-nat-2',
      author: { id: 'user-nat-7', displayName: 'Farida Khan' },
      content: 'Voter maturity in India is high; citizens routinely split their ballot between national and assembly polls even when conducted simultaneously.',
      reactionCount: 43,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 8),
      updatedAt: seedDate(0, 8),
    },
  ],
  'seed-nat-3': [
    {
      id: 'c-nat3-1',
      postId: 'seed-nat-3',
      author: { id: 'user-nat-8', displayName: 'Vikas Agarwal' },
      content: 'Migrant professionals cannot afford travelling back to home states on polling days. Secure multi-constituency remote electronic voting is overdue.',
      reactionCount: 38,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 8),
      updatedAt: seedDate(1, 8),
    },
    {
      id: 'c-nat3-2',
      postId: 'seed-nat-3',
      author: { id: 'user-nat-9', displayName: 'Smita Patil' },
      content: 'Holding elections on mid-week Wednesdays instead of Mondays or Fridays prevents long weekend holiday getaways.',
      reactionCount: 46,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 7),
      updatedAt: seedDate(1, 7),
    },
    {
      id: 'c-nat3-3',
      postId: 'seed-nat-3',
      author: { id: 'demo-nat-3', displayName: 'Arjun Menon' },
      content: 'Both points are very valid. Election Commission trials for remote voting terminals in metropolitan hubs should be scaled up.',
      reactionCount: 22,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(1, 6),
      updatedAt: seedDate(1, 6),
    },
  ],
  'seed-nat-4': [
    {
      id: 'c-nat4-1',
      postId: 'seed-nat-4',
      author: { id: 'user-nat-10', displayName: 'Dr. K. S. Murthy' },
      content: 'A federal republic cannot penalize states for successful public health, education, and family welfare policies. Representation balance is critical.',
      reactionCount: 75,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 2),
      updatedAt: seedDate(0, 2),
    },
    {
      id: 'c-nat4-2',
      postId: 'seed-nat-4',
      author: { id: 'user-nat-11', displayName: 'Gaurav Srivastava' },
      content: 'Yet population parity per Member of Parliament is fundamental to equal citizen voting weight under Article 81.',
      reactionCount: 42,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 1),
      updatedAt: seedDate(0, 1),
    },
    {
      id: 'c-nat4-3',
      postId: 'seed-nat-4',
      author: { id: 'demo-nat-4', displayName: 'Delimitation Observatory', isVerified: true },
      content: 'That is why expanding Rajya Sabha veto power on federal bills while freezing Lok Sabha seat ratios at 1971 or 2001 census levels is the most balanced solution.',
      reactionCount: 88,
      isDeleted: false,
      language: 'en',
      createdAt: seedDate(0, 1),
      updatedAt: seedDate(0, 1),
    },
  ],
};

// ─── Feed Store Interface ───

export type PostSubmissionOutcome = 'synced' | 'queued' | 'local' | 'failed';
export type CommentSubmissionOutcome = 'synced' | 'queued' | 'local' | 'failed';

interface FeedState {
  posts: Post[];
  comments: Record<string, Comment[]>;
  feedFilter: PostType | 'all';
  scopeFilter: FeedScope;
  selectedConstituency: { id: string; name: string } | null;
  selectedHashtag: string | null;
  searchQuery: string;
  sortBy: SortOrder;
  verifiedOnly: boolean;
  loading: boolean;
  isLive: boolean;

  // Filter setters
  setFilter: (filter: PostType | 'all') => void;
  setScopeFilter: (scope: FeedScope) => void;
  setSelectedConstituency: (constituency: { id: string; name: string } | null) => void;
  setHashtagFilter: (tag: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: SortOrder) => void;
  setVerifiedOnly: (val: boolean) => void;
  clearAllFilters: () => void;

  // Post Actions
  addPost: (post: Post) => Promise<PostSubmissionOutcome>;
  editPost: (postId: string, content: string) => Promise<boolean>;
  deletePost: (postId: string) => Promise<boolean>;
  addMediaToPost: (postId: string, media: PostMedia) => void;
  toggleReaction: (postId: string, reaction: ReactionType) => Promise<boolean>;
  votePoll: (postId: string, optionId: string) => Promise<boolean>;

  // Comments Actions
  addComment: (postId: string, comment: Comment) => Promise<CommentSubmissionOutcome>;
  deleteComment: (postId: string, commentId: string) => Promise<boolean>;
  toggleCommentReaction: (postId: string, commentId: string, reaction?: ReactionType) => Promise<boolean>;

  // Follow Graph (Ticket 0.3)
  followedUserIds: string[];
  followedUserOwnerId: string | null;
  followUser: (userId: string) => Promise<boolean>;
  unfollowUser: (userId: string) => Promise<boolean>;
  isFollowing: (userId: string) => boolean;

  // Sync & Realtime
  refreshFeed: (stateCode?: string, constituencyId?: string | null) => Promise<void>;
  hydrateFromServer: (serverPosts: any[]) => void;
  receiveRealtimePost: (serverPost: any) => void;
  receiveRealtimeComment: (serverComment: any) => void;
  receiveRealtimeReaction: (payload: any) => void;
  receiveRealtimeVote: (payload: any) => void;
  reconcilePostSync: (clientToken: string, status: SyncStatus, serverId?: string | null, poll?: Post['poll']) => void;
  reconcileCommentSync: (clientToken: string, status: SyncStatus, serverId?: string | null) => void;
  retryComment: (postId: string, clientToken: string) => Promise<boolean>;
  retryPost: (clientToken: string) => Promise<boolean>;

  // Reliability & Throttling (Ticket 1.2)
  lastError: string | null;
  clearError: () => void;
  lastPostTime: number;
  lastCommentTime: number;
}

export const useFeedStore = create<FeedState>()((set, get) => ({
  posts: IS_LIVE_ENVIRONMENT ? [] : SEED_POSTS,
  comments: IS_LIVE_ENVIRONMENT ? {} : SEED_COMMENTS,
  followedUserIds: [],
  followedUserOwnerId: null,
  lastError: null,
  clearError: () => set({ lastError: null }),
  lastPostTime: 0,
  lastCommentTime: 0,
  feedFilter: 'all',
  scopeFilter: 'state' as FeedScope,
  selectedConstituency: null,
  selectedHashtag: null,
  searchQuery: '',
  sortBy: 'latest' as SortOrder,
  verifiedOnly: false,
  loading: false,
  isLive: false,

  setFilter: (filter) => set({ feedFilter: filter }),
  setScopeFilter: (scope) => set({ scopeFilter: scope }),
  setSelectedConstituency: (constituency) => set({ selectedConstituency: constituency }),
  setHashtagFilter: (tag) => set({ selectedHashtag: tag }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setVerifiedOnly: (val) => set({ verifiedOnly: val }),

  clearAllFilters: () =>
    set({
      feedFilter: 'all',
      selectedHashtag: null,
      searchQuery: '',
      verifiedOnly: false,
    }),

  addPost: async (post) => {
    // Client-side rate limit: 5 seconds between posts
    const now = Date.now();
    const lastTime = get().lastPostTime;
    if (now - lastTime < 5000) {
      const waitSec = Math.ceil((5000 - (now - lastTime)) / 1000);
      set({ lastError: `Please wait ${waitSec}s before posting again.` });
      return 'failed';
    }

    const userId = useAuthStore.getState().user?.id;
    if (IS_LIVE_ENVIRONMENT && !userId) {
      set({ lastError: 'Sign in before publishing a post.' });
      return 'failed';
    }
    if (IS_LIVE_ENVIRONMENT && post.media?.length) {
      set({ lastError: 'Post attachments cannot be published until media upload is connected.' });
      return 'failed';
    }
    if (IS_LIVE_ENVIRONMENT && post.stateCode.length !== 2) {
      set({ lastError: 'Nationally scoped posts are unavailable until the feed scope is persisted.' });
      return 'failed';
    }
    if (post.type === 'poll' && (!post.poll || post.poll.options.length < 2)) {
      set({ lastError: 'Polls require at least two options.' });
      return 'failed';
    }

    const clientToken = post.clientToken ?? post.id;
    const onlineAtStart = isOnline();

    set((state) => ({
      posts: [{ ...post, syncStatus: !userId ? 'LOCAL_ONLY' : onlineAtStart ? 'SYNCING' : 'QUEUED' }, ...state.posts],
      lastPostTime: now,
      lastError: null,
    }));

    if (!userId) return 'local'; // Non-production local preview.

    const payload = {
      content: post.content,
      type: post.type,
      stateCode: post.stateCode,
      authorId: userId,
      hashtags: post.hashtags ?? [],
      constituencyId: post.constituencyId,
      parentId: post.parentId,
      language: post.language ?? 'en',
      pollOptions: post.type === 'poll' ? post.poll?.options.map((option) => option.label) : undefined,
      clientToken,
    };

    if (!onlineAtStart) {
      try {
        await enqueue('compose_post', payload, clientToken);
        return get().posts.find((item) => item.clientToken === clientToken || item.id === clientToken)?.syncStatus === 'SYNCED'
          ? 'synced'
          : 'queued';
      } catch {
        set((state) => ({
          posts: state.posts.filter((item) => item.clientToken !== clientToken && item.id !== clientToken),
          lastError: 'Could not queue this post. Please try again.',
        }));
        return 'failed';
      }
    }

    try {
      const res = await dataService.composePost(payload);
      const pollCreationConfirmed = post.type !== 'poll' || Boolean(res.poll?.id && res.poll.options.length >= 2);
      if (!res.success || !res.id || !pollCreationConfirmed) {
        if (res.retryable) {
          try {
            await enqueue('compose_post', payload, clientToken);
            const saved = get().posts.find((item) => item.clientToken === clientToken || item.id === clientToken);
            return saved?.syncStatus === 'SYNCED' ? 'synced' : 'queued';
          } catch {
            // Fall through to remove the optimistic record if it could not be queued.
          }
        }
        set((state) => ({
          posts: state.posts.filter((item) => item.clientToken !== clientToken && item.id !== clientToken),
          lastError: res.error || 'Could not submit post. Please try again.',
        }));
        return 'failed';
      }

      get().reconcilePostSync(clientToken, 'SYNCED', res.id, res.poll ?? undefined);
      return 'synced';
    } catch (err: any) {
      const isModViolation = err?.message && err.message.includes('community guidelines');
      set((state) => ({
        posts: state.posts.filter((item) => item.clientToken !== clientToken && item.id !== clientToken),
        lastError: isModViolation ? err.message : 'Could not submit post. Please try again.',
      }));
      return 'failed';
    }
  },

  editPost: async (postId, content) => {
    const post = get().posts.find((item) => item.id === postId);
    if (!post || !content.trim()) return false;
    const userId = useAuthStore.getState().user?.id;
    if (IS_LIVE_ENVIRONMENT && !userId) {
      set({ lastError: 'Sign in to edit this post.' });
      return false;
    }

    if (userId) {
      try {
        if (!await dataService.editPost(postId, content, userId)) {
          set({ lastError: 'Could not save the post edit. Please try again.' });
          return false;
        }
      } catch {
        set({ lastError: 'Could not save the post edit. Please try again.' });
        return false;
      }
    }

    set((state) => ({
      posts: state.posts.map((item) => item.id === postId
        ? {
            ...item,
            content,
            updatedAt: new Date().toISOString(),
            hashtags: content.match(/#(\w+)/g)?.map((tag) => tag.slice(1).toLowerCase()) ?? item.hashtags,
          }
        : item),
      lastError: null,
    }));
    return true;
  },

  deletePost: async (postId) => {
    const post = get().posts.find((item) => item.id === postId);
    if (!post) return false;
    const userId = useAuthStore.getState().user?.id;
    if (IS_LIVE_ENVIRONMENT && !userId) {
      set({ lastError: 'Sign in to delete this post.' });
      return false;
    }

    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, isDeleted: true, content: '[Deleted]' } : p,
      ),
    }));
    if (!userId) return true; // Non-production offline/demo interaction.

    try {
      if (await dataService.deletePost(postId, userId)) return true;
    } catch {
      // Restore the post below if the service did not confirm deletion.
    }

    set((state) => ({
      posts: state.posts.map((item) => item.id === postId ? post : item),
      lastError: 'Could not delete post. Please try again.',
    }));
    return false;
  },

  addMediaToPost: (postId, media) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, media: [...(p.media ?? []), media] } : p,
      ),
    })),

  toggleReaction: async (postId, reaction) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return false;
    const userId = useAuthStore.getState().user?.id;
    if (IS_LIVE_ENVIRONMENT && !userId) {
      set({ lastError: 'Sign in to react to a post.' });
      return false;
    }
    const currentReaction = post.userReaction;
    const isRemoving = currentReaction === reaction;
    const isSwitching = !!currentReaction && !isRemoving;

    // Snapshot for rollback
    const prevReaction = currentReaction;
    const prevCount = post.reactionCount;

    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id !== postId) return p;
        let nextCount = p.reactionCount;
        if (isRemoving) {
          nextCount = Math.max(0, p.reactionCount - 1);
        } else if (!isSwitching) {
          nextCount = p.reactionCount + 1;
        }

        return {
          ...p,
          userReaction: isRemoving ? undefined : reaction,
          reactionCount: nextCount,
        };
      }),
    }));

    if (!userId) return true; // Non-production offline/demo interaction.

    try {
      const success = isRemoving
        ? await dataService.removeReaction(postId, userId)
        : await dataService.reactToPost(postId, userId, reaction);
      if (!success) {
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, userReaction: prevReaction, reactionCount: prevCount } : p,
          ),
          lastError: 'Failed to update reaction.',
        }));
        return false;
      }
      return true;
    } catch {
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, userReaction: prevReaction, reactionCount: prevCount } : p,
        ),
        lastError: 'Network error updating reaction.',
      }));
      return false;
    }
  },

  votePoll: async (postId, optionId) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post || !post.poll) return false;
    if (post.poll.userVotedOptionId) return true;
    const userId = useAuthStore.getState().user?.id;
    if (IS_LIVE_ENVIRONMENT && (!userId || !post.poll.id)) {
      set({ lastError: !userId ? 'Sign in to vote in this poll.' : 'This poll is not connected to a persisted record.' });
      return false;
    }

    // Snapshot for rollback
    const prevPoll = { ...post.poll };

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
    }));

    if (!userId || !post.poll.id) return true; // Non-production offline/demo interaction.

    try {
      if (await dataService.votePoll(post.poll.id, optionId, userId)) return true;
    } catch {
      // Restore the prior poll below if the service did not confirm the vote.
    }

    set((state) => ({
      posts: state.posts.map((p) => p.id === postId ? { ...p, poll: prevPoll } : p),
      lastError: 'Could not record your vote. Please try again.',
    }));
    return false;
  },

  addComment: async (postId, comment) => {
    // Client-side rate limit: 2 seconds between comments
    const now = Date.now();
    const lastTime = get().lastCommentTime;
    if (now - lastTime < 2000) {
      set({ lastError: 'Please wait a moment before sending another comment.' });
      return 'failed';
    }

    const userId = useAuthStore.getState().user?.id;
    const parentPost = get().posts.find((item) => item.id === postId);
    if (IS_LIVE_ENVIRONMENT && !userId) {
      set({ lastError: 'Sign in before commenting.' });
      return 'failed';
    }
    if (IS_LIVE_ENVIRONMENT && parentPost?.syncStatus && parentPost.syncStatus !== 'SYNCED') {
      set({ lastError: 'This post is still syncing. Try commenting after it is published.' });
      return 'failed';
    }

    const clientToken = comment.clientToken ?? comment.id;
    const onlineAtStart = isOnline();

    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: [...(state.comments[postId] ?? []), {
          ...comment,
          clientToken,
          syncStatus: !userId ? 'LOCAL_ONLY' : onlineAtStart ? 'SYNCING' : 'QUEUED',
        }],
      },
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, replyCount: p.replyCount + 1 } : p,
      ),
      lastCommentTime: now,
      lastError: null,
    }));

    if (!userId) return 'local'; // Non-production local preview.

    if (!onlineAtStart) {
      try {
        await enqueue('add_comment', {
          postId,
          userId,
          content: comment.content,
          language: comment.language,
          clientToken,
        }, clientToken);
        const saved = get().comments[postId]?.find((item) => item.clientToken === clientToken || item.id === clientToken);
        return saved?.syncStatus === 'SYNCED' ? 'synced' : 'queued';
      } catch {
        set((state) => ({
          comments: {
            ...state.comments,
            [postId]: (state.comments[postId] ?? []).filter((item) => item.clientToken !== clientToken && item.id !== clientToken),
          },
          posts: state.posts.map((item) => item.id === postId
            ? { ...item, replyCount: Math.max(0, item.replyCount - 1) }
            : item),
          lastError: 'Could not queue this comment. Please try again.',
        }));
        return 'failed';
      }
    }

    const res = await dataService.addPostComment(postId, userId, comment.content, comment.language, clientToken);
    if (res.success && res.id) {
      get().reconcileCommentSync(clientToken, 'SYNCED', res.id);
      return 'synced';
    }

    if (res.retryable) {
      try {
        await enqueue('add_comment', {
          postId,
          userId,
          content: comment.content,
          language: comment.language,
          clientToken,
        }, clientToken);
        const saved = get().comments[postId]?.find((item) => item.clientToken === clientToken || item.id === clientToken);
        return saved?.syncStatus === 'SYNCED' ? 'synced' : 'queued';
      } catch {
        // Fall through to remove the optimistic record if it could not be queued.
      }
    }

    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: (state.comments[postId] ?? []).filter((item) => item.clientToken !== clientToken && item.id !== clientToken),
      },
      posts: state.posts.map((item) => item.id === postId
        ? { ...item, replyCount: Math.max(0, item.replyCount - 1) }
        : item),
      lastError: res.error || 'Failed to submit comment. Please retry.',
    }));
    return 'failed';
  },

  deleteComment: async (postId, commentId) => {
    const comment = (get().comments[postId] ?? []).find((item) => item.id === commentId);
    if (!comment) return false;
    if (comment.isDeleted) return true;
    const userId = useAuthStore.getState().user?.id;
    if (IS_LIVE_ENVIRONMENT && !userId) {
      set({ lastError: 'Sign in before deleting a comment.' });
      return false;
    }
    if (IS_LIVE_ENVIRONMENT && comment.syncStatus && comment.syncStatus !== 'SYNCED') {
      set({ lastError: 'Wait until this comment finishes syncing before deleting it.' });
      return false;
    }

    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: (state.comments[postId] ?? []).map((c) =>
          c.id === commentId ? { ...c, isDeleted: true } : c,
        ),
      },
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, replyCount: Math.max(0, p.replyCount - 1) } : p,
      ),
      lastError: null,
    }));

    if (!userId) return true; // Non-production local preview.
    if (await dataService.deletePostComment(commentId, userId)) return true;

    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: (state.comments[postId] ?? []).map((item) =>
          item.id === commentId ? { ...item, isDeleted: comment.isDeleted } : item,
        ),
      },
      posts: state.posts.map((item) => item.id === postId
        ? { ...item, replyCount: item.replyCount + 1 }
        : item),
      lastError: 'Could not delete this comment. Please try again.',
    }));
    return false;
  },

  toggleCommentReaction: async (postId, commentId, reaction = 'like') => {
    const comment = (get().comments[postId] ?? []).find((item) => item.id === commentId);
    if (!comment) return false;
    const userId = useAuthStore.getState().user?.id;
    if (IS_LIVE_ENVIRONMENT && !userId) {
      set({ lastError: 'Sign in to react to a comment.' });
      return false;
    }

    const previousReaction = comment.userReaction;
    const previousCount = comment.reactionCount;
    const isRemoving = previousReaction === reaction;
    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: (state.comments[postId] ?? []).map((c) => {
          if (c.id !== commentId) return c;
          return {
            ...c,
            userReaction: isRemoving ? undefined : reaction,
            reactionCount: Math.max(0, c.reactionCount + (isRemoving ? -1 : previousReaction ? 0 : 1)),
          };
        }),
      },
    }));

    if (!userId) return true; // Non-production offline/demo interaction.

    try {
      const success = isRemoving
        ? await dataService.removeCommentReaction(commentId, userId)
        : await dataService.reactToComment(commentId, userId, reaction);
      if (success) return true;
    } catch {
      // Restore the prior state below.
    }

    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: (state.comments[postId] ?? []).map((item) =>
          item.id === commentId
            ? { ...item, userReaction: previousReaction, reactionCount: previousCount }
            : item,
        ),
      },
      lastError: 'Failed to update comment reaction.',
    }));
    return false;
  },

  // Follow Graph (Ticket 0.3)
  followUser: async (userId: string) => {
    if (!userId) return false;
    const authUserId = useAuthStore.getState().user?.id;
    if (IS_LIVE_ENVIRONMENT && !authUserId) {
      set({ lastError: 'Sign in to follow this account.' });
      return false;
    }
    if (userId === authUserId) {
      set({ lastError: 'You cannot follow your own account.' });
      return false;
    }
    if (get().followedUserIds.includes(userId)) return true;
    if (authUserId && !await dataService.followUser(authUserId, userId)) {
      set({ lastError: 'Could not follow this account. Please try again.' });
      return false;
    }

    set((state) => ({
      followedUserIds: [...state.followedUserIds, userId],
      followedUserOwnerId: authUserId ?? null,
      lastError: null,
    }));
    await get().refreshFeed();
    return true;
  },

  unfollowUser: async (userId: string) => {
    if (!userId) return false;
    const authUserId = useAuthStore.getState().user?.id;
    if (IS_LIVE_ENVIRONMENT && !authUserId) {
      set({ lastError: 'Sign in to unfollow this account.' });
      return false;
    }
    if (!get().followedUserIds.includes(userId)) return true;
    if (authUserId && !await dataService.unfollowUser(authUserId, userId)) {
      set({ lastError: 'Could not unfollow this account. Please try again.' });
      return false;
    }

    set((state) => ({
      followedUserIds: state.followedUserIds.filter((id) => id !== userId),
      followedUserOwnerId: authUserId ?? null,
      lastError: null,
    }));
    await get().refreshFeed();
    return true;
  },

  isFollowing: (userId: string) => {
    return get().followedUserIds.includes(userId);
  },

  refreshFeed: async (stateCode = 'TS', constituencyId = null) => {
    set({ loading: true });
    try {
      const authUser = useAuthStore.getState().user;
      const requestOwnerId = authUser?.id ?? null;
      const serverFollowedIds = authUser?.id
        ? await dataService.fetchFollowedUserIds(authUser.id)
        : null;
      const currentOwnerId = get().followedUserOwnerId;
      const cachedFollowedIds = currentOwnerId === requestOwnerId ? get().followedUserIds : [];
      const followedIds = Array.isArray(serverFollowedIds) ? serverFollowedIds : cachedFollowedIds;
      if (authUser?.id && Array.isArray(serverFollowedIds)) {
        set({ followedUserIds: serverFollowedIds, followedUserOwnerId: authUser.id });
      } else if (!authUser?.id && IS_LIVE_ENVIRONMENT) {
        set({ followedUserIds: [], followedUserOwnerId: null });
      } else if (currentOwnerId !== requestOwnerId) {
        set({ followedUserIds: cachedFollowedIds, followedUserOwnerId: requestOwnerId });
      }
      const livePosts = await dataService.fetchBlendedFeed(
        authUser?.id,
        constituencyId,
        stateCode,
        50,
        followedIds,
      );
      if (livePosts && livePosts.length > 0) {
        const transformed: Post[] = livePosts.map((p: any) => ({
          id: p.id,
          author: {
            id: p.author_id,
            displayName: p.author_display_name || p.author_name || 'Citizen',
            isVerified: p.author_is_verified ?? false,
            avatarUrl: p.author_avatar_url,
          },
          stateCode: p.state_code,
          constituencyId: p.constituency_id,
          constituencyName: p.constituency_name,
          content: p.content,
          type: (p.type as PostType) ?? 'discussion',
          replyCount: p.reply_count ?? 0,
          reactionCount: p.reaction_count ?? 0,
          isPinned: p.is_pinned ?? false,
          isDeleted: p.is_deleted ?? false,
          language: p.language ?? 'en',
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          hashtags: p.hashtags ?? [],
          userReaction: p.user_reaction,
        }));
        const ranked = rankPostsV1(transformed, { constituencyId, stateCode });
        const localPending = get().posts.filter((p) => p.syncStatus && p.syncStatus !== 'SYNCED');
        const seen = new Set<string>();
        const deduped = [...localPending, ...ranked].filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        set({ posts: deduped, isLive: true, lastError: null });
      } else if (IS_LIVE_ENVIRONMENT) {
        if (livePosts === null) {
          // Keep the last server-backed feed on transient failures; never add demo posts.
          set({ isLive: false, lastError: 'Feed refresh failed. Showing previously loaded posts.' });
        } else {
          const localPending = get().posts.filter((p) => p.syncStatus && p.syncStatus !== 'SYNCED');
          set({ posts: localPending, isLive: true, lastError: null });
        }
      } else {
        // Offline / demo fallback: blend followed authors + constituency posts, ranked by Feed Ranking V1
        const followed = new Set(get().followedUserIds);
        const seenIds = new Set<string>();
        const candidatePool = [...get().posts, ...SEED_POSTS].filter((p) => {
          if (seenIds.has(p.id)) return false;
          seenIds.add(p.id);
          return true;
        });

        const filteredCandidates = candidatePool.filter((p) => {
          if (followed.has(p.author.id)) return true;
          if (constituencyId && p.constituencyId === constituencyId) return true;
          if (!constituencyId && (!p.stateCode || p.stateCode === stateCode)) return true;
          return false;
        });
        const ranked = rankPostsV1(filteredCandidates, { constituencyId, stateCode });

        const localPending = get().posts.filter((p) => p.syncStatus && p.syncStatus !== 'SYNCED');
        const seen = new Set<string>();
        const deduped = [...localPending, ...ranked].filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        set({ posts: deduped });
      }
    } catch (_) {
      if (IS_LIVE_ENVIRONMENT) {
        set({ isLive: false, lastError: 'Feed refresh failed. Showing previously loaded posts.' });
        return;
      }
      // Offline fallback: blend followed authors + constituency posts, ranked by Feed Ranking V1
      const followed = new Set(get().followedUserIds);
      const seenIds = new Set<string>();
      const candidatePool = [...get().posts, ...SEED_POSTS].filter((p) => {
        if (seenIds.has(p.id)) return false;
        seenIds.add(p.id);
        return true;
      });

      const filteredCandidates = candidatePool.filter((p) => {
        if (followed.has(p.author.id)) return true;
        if (constituencyId && p.constituencyId === constituencyId) return true;
        if (!constituencyId && (!p.stateCode || p.stateCode === stateCode)) return true;
        return false;
      });
      const ranked = rankPostsV1(filteredCandidates, { constituencyId, stateCode });

      const localPending = get().posts.filter((p) => p.syncStatus && p.syncStatus !== 'SYNCED');
      const seen = new Set<string>();
      const deduped = [...localPending, ...ranked].filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
      set({ posts: deduped });
    } finally {
      set({ loading: false });
    }
  },

  hydrateFromServer: (serverPosts) => {
    if (!serverPosts) return;
    const serverIds = new Set(serverPosts.map((p: any) => p.id));
    const localOnly = get().posts.filter((p) =>
      !serverIds.has(p.id) && (!IS_LIVE_ENVIRONMENT || (p.syncStatus && p.syncStatus !== 'SYNCED')),
    );
    const transformed: Post[] = serverPosts.map((p: any) => ({
      id: p.id,
      author: {
        id: p.author_id ?? p.author_display_name ?? 'unknown',
        displayName: p.author_display_name ?? 'Anonymous',
        avatarUrl: p.author_avatar_url,
        isVerified: p.author_is_verified ?? false,
      },
      stateCode: p.state_code,
      constituencyId: p.constituency_id,
      constituencyName: p.constituency_name,
      content: p.content,
      type: p.type ?? 'discussion',
      replyCount: p.reply_count ?? 0,
      reactionCount: p.reaction_count ?? 0,
      isPinned: p.is_pinned ?? false,
      isDeleted: p.is_deleted ?? false,
      language: p.language ?? 'en',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      hashtags: p.hashtags ?? [],
      userReaction: p.user_reaction,
      poll: p.poll_id
        ? {
            id: p.poll_id,
            question: p.poll_question,
            totalVotes: p.poll_total_votes ?? 0,
            isClosed: p.poll_is_closed ?? false,
            options: (p.poll_options ?? []).map((o: any) => ({
              id: o.id,
              label: o.label,
              voteCount: o.vote_count ?? 0,
              sortOrder: o.sort_order ?? 0,
            })),
          }
        : undefined,
      media: (p.media ?? []).map((m: any) => ({
        id: m.id,
        mediaType: m.media_type,
        url: m.url,
        altText: m.alt_text,
      })),
    }));
    set({ posts: [...transformed, ...localOnly], isLive: true });
  },

  // ─── Realtime Event Handlers for Live Feed ───
  receiveRealtimePost: (p: any) => {
    if (!p || !p.id) return;
    const exists = get().posts.some((existing) => existing.id === p.id);
    if (exists) {
      set((state) => ({
        posts: state.posts.map((item) =>
          item.id === p.id
            ? {
                ...item,
                content: p.content ?? item.content,
                reactionCount: p.reaction_count ?? item.reactionCount,
                replyCount: p.reply_count ?? item.replyCount,
                isDeleted: p.is_deleted ?? item.isDeleted,
                updatedAt: p.updated_at ?? item.updatedAt,
              }
            : item,
        ),
      }));
    } else {
      const newPost: Post = {
        id: p.id,
        author: {
          id: p.author_id ?? 'anon',
          displayName: p.author_display_name ?? p.author_name ?? p.displayName ?? 'Community Member',
          isVerified: p.author_is_verified ?? p.author_verified ?? false,
          avatarUrl: p.author_avatar_url,
        },
        stateCode: p.state_code ?? 'TS',
        constituencyId: p.constituency_id,
        constituencyName: p.constituency_name,
        content: p.content,
        type: p.type ?? p.post_type ?? 'discussion',
        replyCount: p.reply_count ?? 0,
        reactionCount: p.reaction_count ?? 0,
        isPinned: p.is_pinned ?? false,
        isDeleted: p.is_deleted ?? false,
        language: p.language ?? 'en',
        createdAt: p.created_at ?? new Date().toISOString(),
        updatedAt: p.updated_at ?? new Date().toISOString(),
        hashtags: p.hashtags ?? (p.content?.match(/#(\w+)/g)?.map((h: string) => h.slice(1).toLowerCase()) ?? []),
      };
      set((state) => ({ posts: [newPost, ...state.posts] }));
    }
  },

  receiveRealtimeComment: (c: any) => {
    if (!c || !c.post_id || !c.id) return;
    const postId = c.post_id;
    const currentComments = get().comments[postId] ?? [];
    if (currentComments.some((existing) => existing.id === c.id)) return;

    const newComment: Comment = {
      id: c.id,
      postId,
      author: {
        id: c.author_id ?? 'anon',
        displayName: c.author_display_name ?? c.author_name ?? c.displayName ?? 'Community Member',
        isVerified: c.author_is_verified ?? c.author_verified ?? false,
        avatarUrl: c.author_avatar_url,
      },
      content: c.content,
      reactionCount: c.reaction_count ?? 0,
      isDeleted: c.is_deleted ?? false,
      language: c.language ?? 'en',
      createdAt: c.created_at ?? new Date().toISOString(),
      updatedAt: c.updated_at ?? new Date().toISOString(),
    };

    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: [...(state.comments[postId] ?? []), newComment],
      },
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, replyCount: p.replyCount + 1 } : p,
      ),
    }));
  },

  receiveRealtimeReaction: (r: any) => {
    if (!r) return;
    if (r.post_id) {
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === r.post_id ? { ...p, reactionCount: Math.max(0, p.reactionCount + 1) } : p,
        ),
      }));
    } else if (r.comment_id) {
      set((state) => {
        const nextComments = { ...state.comments };
        for (const [pId, list] of Object.entries(nextComments)) {
          nextComments[pId] = list.map((c) =>
            c.id === r.comment_id ? { ...c, reactionCount: Math.max(0, c.reactionCount + 1) } : c,
          );
        }
        return { comments: nextComments };
      });
    }
  },

  receiveRealtimeVote: (v: any) => {
    if (!v || !v.poll_id || !v.option_id) return;
    set((state) => ({
      posts: state.posts.map((p) => {
        if (!p.poll || p.poll.id !== v.poll_id) return p;
        return {
          ...p,
          poll: {
            ...p.poll,
            totalVotes: p.poll.totalVotes + 1,
            options: p.poll.options.map((opt) =>
              opt.id === v.option_id ? { ...opt, voteCount: opt.voteCount + 1 } : opt,
            ),
          },
        };
      }),
    }));
  },

  reconcilePostSync: (clientToken: string, status: SyncStatus, serverId?: string | null, poll?: Post['poll']) => {
    const post = get().posts.find((item) => item.clientToken === clientToken || item.id === clientToken);
    const shouldRecordConfirmedPost = status === 'SYNCED' && post?.syncStatus !== 'SYNCED';
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.clientToken === clientToken || p.id === clientToken) {
          return {
            ...p,
            id: (status === 'SYNCED' && serverId) ? serverId : p.id,
            poll: status === 'SYNCED' && poll ? poll : p.poll,
            syncStatus: status,
          };
        }
        return p;
      }),
    }));
    if (shouldRecordConfirmedPost && post) {
      void logContentAction('create_post', {
        type: 'post',
        id: serverId || post.id,
        body: post.content,
        screenName: 'compose',
      });
    }
  },

  reconcileCommentSync: (clientToken: string, status: SyncStatus, serverId?: string | null) => {
    let confirmedComment: Comment | undefined;
    set((state) => {
      const nextComments: Record<string, Comment[]> = {};
      for (const [postId, comments] of Object.entries(state.comments)) {
        const matchingComment = comments.find((comment) => comment.clientToken === clientToken || comment.id === clientToken);
        if (matchingComment) confirmedComment = matchingComment;
        nextComments[postId] = comments.map((c) => {
          if (c.clientToken === clientToken || c.id === clientToken) {
            return {
              ...c,
              id: (status === 'SYNCED' && serverId) ? serverId : c.id,
              syncStatus: status,
            };
          }
          return c;
        });
      }
      return {
        comments: nextComments,
        ...(status === 'FAILED' ? { lastError: 'This comment could not be synchronized. Please try again.' } : {}),
      };
    });
    if (status === 'SYNCED' && confirmedComment?.syncStatus !== 'SYNCED' && confirmedComment) {
      void logContentAction('create_comment', {
        type: 'comment',
        id: serverId || confirmedComment.id,
        body: confirmedComment.content,
        screenName: 'post_detail',
      });
    }
  },

  retryComment: async (postId: string, clientToken: string) => {
    const comment = (get().comments[postId] ?? []).find(
      (item) => item.clientToken === clientToken || item.id === clientToken,
    );
    if (!comment || comment.syncStatus !== 'FAILED') return false;
    const userId = useAuthStore.getState().user?.id;
    if (!userId || comment.author.id !== userId) {
      set({ lastError: 'Sign in with the account that created this comment to retry it.' });
      return false;
    }

    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: (state.comments[postId] ?? []).map((item) =>
          item.clientToken === clientToken || item.id === clientToken
            ? { ...item, syncStatus: 'SYNCING' }
            : item,
        ),
      },
      lastError: null,
    }));

    try {
      await enqueue('add_comment', {
        postId,
        userId,
        content: comment.content,
        language: comment.language,
        clientToken,
      }, clientToken);
      const current = get().comments[postId]?.find(
        (item) => item.clientToken === clientToken || item.id === clientToken,
      );
      return current?.syncStatus === 'SYNCED' || current?.syncStatus === 'QUEUED';
    } catch {
      get().reconcileCommentSync(clientToken, 'FAILED');
      set({ lastError: 'Could not retry this comment. Please try again.' });
      return false;
    }
  },

  retryPost: async (clientToken: string) => {
    const post = get().posts.find((item) => item.clientToken === clientToken || item.id === clientToken);
    if (!post) return false;
    const userId = useAuthStore.getState().user?.id;
    if (IS_LIVE_ENVIRONMENT && (!userId || post.author.id !== userId)) {
      set({ lastError: 'Sign in with the account that created this post to retry it.' });
      return false;
    }

    const existingOperation = getPendingOps().some(
      (operation) => operation.clientToken === clientToken || operation.payload?.clientToken === clientToken,
    );
    if (existingOperation && !isOnline()) {
      get().reconcilePostSync(clientToken, 'QUEUED');
      return true;
    }

    set((state) => ({
      posts: state.posts.map((p) =>
        (p.clientToken === clientToken || p.id === clientToken)
          ? { ...p, syncStatus: 'SYNCING' }
          : p
      ),
    }));

    if (existingOperation) {
      await retryFailedOp(clientToken);
      const current = get().posts.find((item) => item.clientToken === clientToken || item.id === clientToken);
      if (current?.syncStatus === 'SYNCED') return true;
      if (current?.syncStatus === 'QUEUED') return true;
    }

    if (!userId) {
      set({ lastError: 'Sign in to retry this post.' });
      get().reconcilePostSync(clientToken, 'FAILED');
      return false;
    }

    try {
      await enqueue('compose_post', {
        content: post.content,
        type: post.type,
        stateCode: post.stateCode,
        authorId: userId,
        hashtags: post.hashtags ?? [],
        constituencyId: post.constituencyId,
        parentId: post.parentId,
        language: post.language ?? 'en',
        pollOptions: post.type === 'poll' ? post.poll?.options.map((option) => option.label) : undefined,
        clientToken,
      }, clientToken);
      const current = get().posts.find((item) => item.clientToken === clientToken || item.id === clientToken);
      return current?.syncStatus === 'SYNCED' || current?.syncStatus === 'QUEUED';
    } catch {
      get().reconcilePostSync(clientToken, 'FAILED');
      set({ lastError: 'Could not retry this post. Please try again.' });
      return false;
    }
  },
}));
