/**
 * Canonical Aspirants, Communities & Leadership Academy Contracts & DTOs
 * Master Product Blueprint — Domain 4 (JOB 046 - JOB 050)
 */

export type AspirantVerificationTier = 'tier1' | 'tier2';

export type AspirantVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type KYCDocumentType =
  | 'voter_id'
  | 'aadhaar_masked'
  | 'pan'
  | 'election_affidavit'
  | 'party_letter';

export type PageEventType =
  | 'townhall'
  | 'rally'
  | 'volunteer_meet'
  | 'webinar'
  | 'press_conference'
  | 'door_to_door';

export type PageEventRsvpStatus = 'going' | 'interested' | 'cancelled';

export type GroupRole = 'admin' | 'moderator' | 'member';

export type AcademyCategory =
  | 'electoral_process'
  | 'campaign_strategy'
  | 'legal_framework'
  | 'public_speaking'
  | 'community_organizing'
  | 'digital_campaigning'
  | 'policy_making'
  | 'ethics_governance';

export type AcademyDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type AcademyContentType = 'article' | 'video' | 'quiz' | 'case_study';

export interface AspirantRegistrationRequest {
  displayName: string;
  bio?: string;
  stateCode: string;
  targetConstituencyAcNo?: number;
  targetConstituencyName?: string;
  targetElectionYear?: number;
  partyAffiliation?: string;
  isIndependent?: boolean;
  manifestoUrl?: string;
  visionSummary?: string;
  hasCriminalCases?: boolean;
  criminalCasesDetails?: string;
  handle?: string;
}

export interface AspirantKYCSubmissionRequest {
  documentType: KYCDocumentType;
  documentHash: string;
  documentUrl?: string;
  statutoryDeclarationAccepted: boolean;
}

export interface AspirantKYCRecordDTO {
  id: string;
  aspirantId: string;
  documentType: KYCDocumentType;
  verificationTier: AspirantVerificationTier;
  verificationStatus: AspirantVerificationStatus;
  rejectionReason?: string;
  reviewedAt?: string;
  statutoryDeclarationAccepted: boolean;
  createdAt: string;
}

export interface AspirantPublicProfileDTO {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  stateCode: string;
  targetConstituencyAcNo?: number;
  targetConstituencyName?: string;
  targetElectionYear?: number;
  partyAffiliation?: string;
  isIndependent: boolean;
  verificationTier: AspirantVerificationTier;
  verificationStatus: AspirantVerificationStatus;
  manifestoUrl?: string;
  visionSummary?: string;
  hasCriminalCases: boolean;
  criminalCasesDetails?: string;
  handle?: string;
  civicScore: number;
  issuesReported: number;
  issuesResolved: number;
  communityEndorsements: number;
  modulesCompleted: number;
  badges: Array<{ badgeType: string; earnedAt: string }>;
  upcomingEvents: PageEventDTO[];
  createdAt: string;
}

export interface PageCreateRequest {
  title: string;
  handle: string;
  role: 'aspirant' | 'politician' | 'party' | 'journalist';
  category?: string;
  bio?: string;
  constituencyId?: string;
  stateCode?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

export interface PageDTO {
  id: string;
  ownerId: string;
  title: string;
  handle: string;
  role: string;
  category: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  constituencyId?: string;
  stateCode?: string;
  isPro: boolean;
  followerCount: number;
  postCount: number;
  isFollowing?: boolean;
  createdAt: string;
}

export interface PageEventCreateRequest {
  title: string;
  description?: string;
  eventType: PageEventType;
  startTime: string;
  endTime?: string;
  venueName?: string;
  venueAddress?: string;
  constituencyId?: string;
  latitude?: number;
  longitude?: number;
  isVirtual?: boolean;
  meetingLink?: string;
}

export interface PageEventDTO {
  id: string;
  pageId: string;
  title: string;
  description?: string;
  eventType: PageEventType;
  startTime: string;
  endTime?: string;
  venueName?: string;
  venueAddress?: string;
  constituencyId?: string;
  latitude?: number;
  longitude?: number;
  isVirtual: boolean;
  meetingLink?: string;
  rsvpCount: number;
  userRsvp?: PageEventRsvpStatus;
  dispatchedToFollowers: boolean;
  createdAt: string;
}

export interface QuizQuestionDTO {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LeadershipModuleDTO {
  id: string;
  title: string;
  description: string;
  category: AcademyCategory;
  contentType: AcademyContentType;
  durationMinutes: number;
  difficulty: AcademyDifficulty;
  isPremium: boolean;
  sortOrder: number;
  completed?: boolean;
  quizScore?: number;
  quiz?: QuizQuestionDTO[];
}

export interface QuizAnswerSubmission {
  questionId: string;
  selectedIndex: number;
}

export interface QuizSubmissionRequest {
  answers: QuizAnswerSubmission[];
}

export interface QuizResultDTO {
  moduleId: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  passed: boolean;
  badgeAwarded?: string;
  pointsEarned: number;
  explanations: Array<{
    questionId: string;
    correctIndex: number;
    explanation: string;
    wasCorrect: boolean;
  }>;
}
