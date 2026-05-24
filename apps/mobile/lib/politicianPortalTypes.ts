// ─── Politician Portal Types ───
// Covers: Self-service dashboard, constituent communication, event/rally management,
// e-manifesto builder, mentorship, endorsements, fundraising, surveys

// ─── Enums ───

export type PoliticianTier = 'aspirant' | 'local_leader' | 'corporator' | 'mla' | 'mp' | 'minister' | 'chief_minister';

export type EventType = 'rally' | 'padayatra' | 'town_hall' | 'press_conference' | 'inauguration' | 'meeting' | 'protest' | 'cultural' | 'charity' | 'workshop';

export type EventStatus = 'planned' | 'confirmed' | 'live' | 'completed' | 'cancelled' | 'postponed';

export type ManifestoCategory = 'education' | 'healthcare' | 'infrastructure' | 'agriculture' | 'employment' | 'women_empowerment' | 'youth' | 'environment' | 'governance' | 'social_justice' | 'economy' | 'security' | 'housing' | 'technology' | 'culture';

export type ManifestoStatus = 'draft' | 'published' | 'archived';

export type FundraiseStatus = 'active' | 'goal_reached' | 'closed' | 'cancelled';

export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived';

export type SurveyQuestionType = 'single_choice' | 'multiple_choice' | 'rating' | 'text' | 'yes_no' | 'ranking';

export type MentorshipStatus = 'seeking' | 'active' | 'completed' | 'paused';

export type EndorsementType = 'general' | 'capability' | 'integrity' | 'leadership' | 'constituency_work' | 'governance';

export type ConstituentMessageType = 'announcement' | 'update' | 'greeting' | 'emergency' | 'survey_invite' | 'event_invite' | 'grievance_response';

// ─── Configs ───

export const POLITICIAN_TIER_CONFIG: Record<PoliticianTier, { label: string; icon: string; color: string; canBroadcast: boolean; maxEventsPerMonth: number; canMentor: boolean }> = {
  aspirant: { label: 'Aspiring Leader', icon: 'star-outline', color: '#6B7280', canBroadcast: false, maxEventsPerMonth: 2, canMentor: false },
  local_leader: { label: 'Local Leader', icon: 'star-half', color: '#3B82F6', canBroadcast: true, maxEventsPerMonth: 5, canMentor: false },
  corporator: { label: 'Corporator', icon: 'star', color: '#8B5CF6', canBroadcast: true, maxEventsPerMonth: 10, canMentor: true },
  mla: { label: 'MLA', icon: 'ribbon', color: '#F59E0B', canBroadcast: true, maxEventsPerMonth: 20, canMentor: true },
  mp: { label: 'MP', icon: 'shield', color: '#EF4444', canBroadcast: true, maxEventsPerMonth: 20, canMentor: true },
  minister: { label: 'Minister', icon: 'shield-checkmark', color: '#10B981', canBroadcast: true, maxEventsPerMonth: 30, canMentor: true },
  chief_minister: { label: 'Chief Minister', icon: 'trophy', color: '#F97316', canBroadcast: true, maxEventsPerMonth: 50, canMentor: true },
};

export const EVENT_TYPE_CONFIG: Record<EventType, { label: string; icon: string; color: string; defaultDurationHours: number }> = {
  rally: { label: 'Public Rally', icon: 'megaphone', color: '#EF4444', defaultDurationHours: 3 },
  padayatra: { label: 'Padayatra', icon: 'walk', color: '#F59E0B', defaultDurationHours: 6 },
  town_hall: { label: 'Town Hall', icon: 'people', color: '#3B82F6', defaultDurationHours: 2 },
  press_conference: { label: 'Press Conference', icon: 'mic', color: '#8B5CF6', defaultDurationHours: 1 },
  inauguration: { label: 'Inauguration', icon: 'ribbon', color: '#10B981', defaultDurationHours: 2 },
  meeting: { label: 'Meeting', icon: 'chatbubbles', color: '#6B7280', defaultDurationHours: 1.5 },
  protest: { label: 'Protest/Dharna', icon: 'hand-left', color: '#F97316', defaultDurationHours: 4 },
  cultural: { label: 'Cultural Event', icon: 'musical-notes', color: '#EC4899', defaultDurationHours: 3 },
  charity: { label: 'Charity/Service', icon: 'heart', color: '#14B8A6', defaultDurationHours: 3 },
  workshop: { label: 'Workshop/Training', icon: 'school', color: '#84CC16', defaultDurationHours: 4 },
};

export const MANIFESTO_CATEGORY_CONFIG: Record<ManifestoCategory, { label: string; icon: string; color: string }> = {
  education: { label: 'Education', icon: 'school', color: '#8B5CF6' },
  healthcare: { label: 'Healthcare', icon: 'medkit', color: '#EF4444' },
  infrastructure: { label: 'Infrastructure', icon: 'construct', color: '#F59E0B' },
  agriculture: { label: 'Agriculture', icon: 'leaf', color: '#84CC16' },
  employment: { label: 'Employment', icon: 'briefcase', color: '#3B82F6' },
  women_empowerment: { label: 'Women Empowerment', icon: 'female', color: '#EC4899' },
  youth: { label: 'Youth Development', icon: 'people', color: '#06B6D4' },
  environment: { label: 'Environment', icon: 'earth', color: '#10B981' },
  governance: { label: 'Good Governance', icon: 'business', color: '#F97316' },
  social_justice: { label: 'Social Justice', icon: 'scale', color: '#A855F7' },
  economy: { label: 'Economy', icon: 'trending-up', color: '#14B8A6' },
  security: { label: 'Security', icon: 'shield', color: '#6B7280' },
  housing: { label: 'Housing', icon: 'home', color: '#FBBF24' },
  technology: { label: 'Technology', icon: 'hardware-chip', color: '#3B82F6' },
  culture: { label: 'Culture & Heritage', icon: 'color-palette', color: '#EC4899' },
};

export const ENDORSEMENT_TYPE_CONFIG: Record<EndorsementType, { label: string; icon: string; weight: number }> = {
  general: { label: 'General Endorsement', icon: 'thumbs-up', weight: 1 },
  capability: { label: 'Capability', icon: 'bulb', weight: 1.5 },
  integrity: { label: 'Integrity', icon: 'shield-checkmark', weight: 2 },
  leadership: { label: 'Leadership', icon: 'flag', weight: 1.5 },
  constituency_work: { label: 'Constituency Work', icon: 'location', weight: 1.5 },
  governance: { label: 'Governance', icon: 'business', weight: 2 },
};

// ─── Interfaces ───

export interface PoliticianPortalProfile {
  id: string;
  userId: string;
  displayName: string;
  tier: PoliticianTier;
  party?: string;
  constituencyAcNo?: number;
  stateCode: string;
  districtName?: string;
  bio: string;
  photoUrl?: string;
  coverPhotoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  officeAddress?: string;
  socialLinks: { platform: string; url: string }[];
  isVerified: boolean;
  isActive: boolean;
  followerCount: number;
  endorsementCount: number;
  endorsementScore: number;
  eventsHosted: number;
  issuesResponded: number;
  responseRate: number;
  avgResponseTimeHours: number;
  manifestoId?: string;
  mentorId?: string;
  menteesCount: number;
  totalFundsRaised: number;
  joinedAt: string;
  lastActiveAt: string;
}

export interface ConstituentBroadcast {
  id: string;
  politicianId: string;
  type: ConstituentMessageType;
  title: string;
  body: string;
  mediaUrls: string[];
  targetScope: 'constituency' | 'district' | 'state';
  targetConstituencyAcNo?: number;
  targetStateCode: string;
  targetDistrictName?: string;
  scheduledAt?: string;
  sentAt?: string;
  readCount: number;
  reactionCount: number;
  replyCount: number;
  createdAt: string;
}

export interface PoliticalEvent {
  id: string;
  politicianId: string;
  politicianName: string;
  party?: string;
  type: EventType;
  status: EventStatus;
  title: string;
  description: string;
  venue: string;
  address: string;
  gpsLat?: number;
  gpsLng?: number;
  stateCode: string;
  districtName?: string;
  constituencyAcNo?: number;
  startTime: string;
  endTime: string;
  expectedAttendance?: number;
  actualAttendance?: number;
  isPublic: boolean;
  rsvpCount: number;
  coverImageUrl?: string;
  liveStreamUrl?: string;
  mediaUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EManifesto {
  id: string;
  politicianId: string;
  politicianName: string;
  party?: string;
  title: string;
  preamble: string;
  status: ManifestoStatus;
  items: ManifestoItem[];
  targetElection?: string;
  stateCode: string;
  constituencyAcNo?: number;
  publishedAt?: string;
  views: number;
  endorsements: number;
  feedbackCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ManifestoItem {
  id: string;
  category: ManifestoCategory;
  title: string;
  description: string;
  timeline: string;
  budgetEstimate?: string;
  beneficiaries?: string;
  kpis: string[];
  priority: 'high' | 'medium' | 'low';
  supportVotes: number;
  opposeVotes: number;
}

export interface Mentorship {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorTier: PoliticianTier;
  menteeId: string;
  menteeName: string;
  menteeTier: PoliticianTier;
  status: MentorshipStatus;
  focusAreas: string[];
  sessionsCompleted: number;
  nextSessionDate?: string;
  feedback?: string;
  startedAt: string;
  completedAt?: string;
}

export interface Endorsement {
  id: string;
  endorserId: string;
  endorserName: string;
  endorserTier: PoliticianTier;
  endorseeId: string;
  endorseeName: string;
  type: EndorsementType;
  message: string;
  isPublic: boolean;
  createdAt: string;
}

export interface FundraiseProject {
  id: string;
  politicianId: string;
  politicianName: string;
  title: string;
  description: string;
  goalAmount: number;
  raisedAmount: number;
  donorCount: number;
  status: FundraiseStatus;
  category: ManifestoCategory;
  stateCode: string;
  constituencyAcNo?: number;
  coverImageUrl?: string;
  startDate: string;
  endDate: string;
  updates: { text: string; date: string; imageUrl?: string }[];
  isTransparent: boolean;
  expenditureReport?: string;
  createdAt: string;
}

export interface PoliticianSurvey {
  id: string;
  politicianId: string;
  title: string;
  description: string;
  status: SurveyStatus;
  targetScope: 'constituency' | 'district' | 'state';
  targetStateCode: string;
  targetConstituencyAcNo?: number;
  questions: SurveyQuestion[];
  responseCount: number;
  startDate: string;
  endDate: string;
  results?: SurveyResults;
  createdAt: string;
}

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  text: string;
  options?: string[];
  isRequired: boolean;
  order: number;
}

export interface SurveyResults {
  totalResponses: number;
  questionResults: {
    questionId: string;
    questionText: string;
    type: SurveyQuestionType;
    optionCounts?: Record<string, number>;
    avgRating?: number;
    textResponses?: string[];
  }[];
}

// ─── Utility Functions ───

export function canBroadcast(tier: PoliticianTier): boolean {
  return POLITICIAN_TIER_CONFIG[tier].canBroadcast;
}

export function canMentor(tier: PoliticianTier): boolean {
  return POLITICIAN_TIER_CONFIG[tier].canMentor;
}

export function getMaxEventsPerMonth(tier: PoliticianTier): number {
  return POLITICIAN_TIER_CONFIG[tier].maxEventsPerMonth;
}

export function calculateEndorsementScore(endorsements: Endorsement[]): number {
  return endorsements.reduce((score, e) => {
    const typeWeight = ENDORSEMENT_TYPE_CONFIG[e.type].weight;
    const tierMultiplier = ['chief_minister', 'minister', 'mp', 'mla', 'corporator', 'local_leader', 'aspirant'].indexOf(e.endorserTier);
    const tierWeight = Math.max(1, 7 - tierMultiplier) * 0.5;
    return score + typeWeight * tierWeight;
  }, 0);
}

export function getFundraiseProgress(project: FundraiseProject): number {
  if (project.goalAmount <= 0) return 0;
  return Math.min(100, Math.round((project.raisedAmount / project.goalAmount) * 100));
}

export function getSurveyCompletionRate(survey: PoliticianSurvey): string {
  const required = survey.questions.filter((q) => q.isRequired).length;
  return `${required} required question${required !== 1 ? 's' : ''}`;
}
