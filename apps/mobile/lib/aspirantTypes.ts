/**
 * Aspiring Leaders & Civic Participation types.
 * Mirrors Supabase schema from 010_aspiring_leaders.sql.
 */

// ─── BADGE SYSTEM ───

export type BadgeType =
  | 'first_issue'
  | 'issue_warrior'           // 10+ issues reported
  | 'evidence_hunter'         // 5+ evidence submitted
  | 'promise_watchdog'        // 10+ promises followed
  | 'community_voice'         // 20+ comments
  | 'civic_champion'          // civic score > 500
  | 'election_scholar'        // 5+ modules completed
  | 'challenge_crusher'       // 5+ challenges completed
  | 'peoples_choice'          // 50+ endorsements
  | 'transparency_advocate'   // viewed 20+ affidavits
  | 'local_hero'              // completed a community challenge
  | 'mentor'                  // endorsed 10+ aspirants
  | 'trailblazer';            // first aspirant in constituency

export interface CivicBadge {
  type: BadgeType;
  earnedAt: string;
}

// ─── MODULE SYSTEM ───

export type ModuleCategory =
  | 'electoral_process'
  | 'campaign_strategy'
  | 'legal_framework'
  | 'public_speaking'
  | 'community_organizing'
  | 'digital_campaigning'
  | 'policy_making'
  | 'ethics_governance';

export type ModuleDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ContentType = 'article' | 'video' | 'quiz' | 'case_study';

/** A titled block of reading content within a module. */
export interface ModuleSection {
  heading: string;
  body: string;
}

/** An embedded video with attribution to its original source. */
export interface ModuleVideo {
  youtubeId: string;
  title: string;
  channel: string;
  sourceUrl: string;
}

/** A single multiple-choice quiz question. */
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/** A citation/source reference shown to avoid copyright/legal issues. */
export interface ModuleCitation {
  label: string;
  publisher: string;
  url: string;
}

/** Rich content attached to a module (kept separate from metadata). */
export interface ModuleContent {
  sections?: ModuleSection[];
  keyTakeaways?: string[];
  video?: ModuleVideo;
  quiz?: QuizQuestion[];
  citations?: ModuleCitation[];
}

export interface LeadershipModule extends ModuleContent {
  id: string;
  title: string;
  description: string;
  category: ModuleCategory;
  contentType: ContentType;
  contentUrl?: string;
  contentBody?: string;
  durationMinutes: number;
  difficulty: ModuleDifficulty;
  isPremium: boolean;
  sortOrder: number;
}

export interface ModuleProgress {
  moduleId: string;
  completed: boolean;
  quizScore?: number;
  startedAt: string;
  completedAt?: string;
}

// ─── CHALLENGES ───

export type ChallengeCategory = 'civic' | 'awareness' | 'accountability' | 'community';

export interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  points: number;
  targetCount: number;
  stateCode?: string;
  isActive: boolean;
  startsAt: string;
  endsAt?: string;
}

export interface ChallengeParticipation {
  challengeId: string;
  progress: number;
  completed: boolean;
  completedAt?: string;
  evidenceUrl?: string;
}

// ─── ASPIRANT PROFILE ───

export interface AspirantProfile {
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

  // Civic score
  civicScore: number;
  issuesReported: number;
  issuesResolved: number;
  commentsCount: number;
  evidenceSubmitted: number;
  promisesTracked: number;
  communityEndorsements: number;
  modulesCompleted: number;
  challengesCompleted: number;

  isPublic: boolean;
}

// ─── CIVIC SCORE BREAKDOWN ───

export interface CivicScoreBreakdown {
  issuesReported: number;       // 5 pts each
  issuesResolved: number;       // 20 pts each
  commentsCount: number;        // 2 pts each
  evidenceSubmitted: number;    // 10 pts each
  promisesTracked: number;      // 3 pts each
  endorsements: number;         // 5 pts each
  modulesCompleted: number;     // 15 pts each
  challengesCompleted: number;  // points vary
  totalScore: number;
  level: CivicLevel;
}

export type CivicLevel =
  | 'observer'         // 0-99
  | 'contributor'      // 100-299
  | 'advocate'         // 300-599
  | 'leader'           // 600-999
  | 'champion';        // 1000+

// ─── CONFIGS ───

export const BADGE_CONFIG: Record<BadgeType, { label: string; icon: string; color: string; description: string }> = {
  first_issue: { label: 'First Issue', icon: 'flag', color: '#3B82F6', description: 'Reported your first civic issue' },
  issue_warrior: { label: 'Issue Warrior', icon: 'shield', color: '#EF4444', description: 'Reported 10+ civic issues' },
  evidence_hunter: { label: 'Evidence Hunter', icon: 'camera', color: '#F59E0B', description: 'Submitted 5+ pieces of evidence' },
  promise_watchdog: { label: 'Promise Watchdog', icon: 'eye', color: '#8B5CF6', description: 'Following 10+ election promises' },
  community_voice: { label: 'Community Voice', icon: 'chatbubbles', color: '#10B981', description: 'Posted 20+ comments on issues' },
  civic_champion: { label: 'Civic Champion', icon: 'trophy', color: '#F59E0B', description: 'Achieved 500+ civic score' },
  election_scholar: { label: 'Election Scholar', icon: 'school', color: '#4F8EF7', description: 'Completed 5+ leadership modules' },
  challenge_crusher: { label: 'Challenge Crusher', icon: 'flash', color: '#EC4899', description: 'Completed 5+ community challenges' },
  peoples_choice: { label: "People's Choice", icon: 'heart', color: '#EF4444', description: 'Received 50+ community endorsements' },
  transparency_advocate: { label: 'Transparency Advocate', icon: 'document-text', color: '#06B6D4', description: 'Viewed 20+ candidate affidavits' },
  local_hero: { label: 'Local Hero', icon: 'star', color: '#F59E0B', description: 'Completed a community challenge' },
  mentor: { label: 'Mentor', icon: 'people', color: '#10B981', description: 'Endorsed 10+ aspirants' },
  trailblazer: { label: 'Trailblazer', icon: 'rocket', color: '#8B5CF6', description: 'First aspirant registered in your constituency' },
};

export const MODULE_CATEGORY_CONFIG: Record<ModuleCategory, { label: string; icon: string; color: string }> = {
  electoral_process: { label: 'Electoral Process', icon: 'checkbox', color: '#3B82F6' },
  campaign_strategy: { label: 'Campaign Strategy', icon: 'megaphone', color: '#F59E0B' },
  legal_framework: { label: 'Legal Framework', icon: 'book', color: '#8B5CF6' },
  public_speaking: { label: 'Public Speaking', icon: 'mic', color: '#EC4899' },
  community_organizing: { label: 'Community Organizing', icon: 'people', color: '#10B981' },
  digital_campaigning: { label: 'Digital Campaigning', icon: 'phone-portrait', color: '#06B6D4' },
  policy_making: { label: 'Policy Making', icon: 'document-text', color: '#F97316' },
  ethics_governance: { label: 'Ethics & Governance', icon: 'shield-checkmark', color: '#6B7280' },
};

export const CHALLENGE_CATEGORY_CONFIG: Record<ChallengeCategory, { label: string; icon: string; color: string }> = {
  civic: { label: 'Civic Action', icon: 'flag', color: '#3B82F6' },
  awareness: { label: 'Awareness', icon: 'bulb', color: '#F59E0B' },
  accountability: { label: 'Accountability', icon: 'eye', color: '#EF4444' },
  community: { label: 'Community', icon: 'people', color: '#10B981' },
};

export const CIVIC_LEVEL_CONFIG: Record<CivicLevel, { label: string; minScore: number; color: string; icon: string }> = {
  observer: { label: 'Observer', minScore: 0, color: '#6B7280', icon: 'eye-outline' },
  contributor: { label: 'Contributor', minScore: 100, color: '#3B82F6', icon: 'hand-left' },
  advocate: { label: 'Advocate', minScore: 300, color: '#10B981', icon: 'megaphone' },
  leader: { label: 'Leader', minScore: 600, color: '#F59E0B', icon: 'star' },
  champion: { label: 'Champion', minScore: 1000, color: '#8B5CF6', icon: 'trophy' },
};

// ─── UTILITY FUNCTIONS ───

export function computeCivicScore(profile: Pick<AspirantProfile, 'issuesReported' | 'issuesResolved' | 'commentsCount' | 'evidenceSubmitted' | 'promisesTracked' | 'communityEndorsements' | 'modulesCompleted' | 'challengesCompleted'>): CivicScoreBreakdown {
  const total =
    profile.issuesReported * 5 +
    profile.issuesResolved * 20 +
    profile.commentsCount * 2 +
    profile.evidenceSubmitted * 10 +
    profile.promisesTracked * 3 +
    profile.communityEndorsements * 5 +
    profile.modulesCompleted * 15 +
    profile.challengesCompleted * 10;

  let level: CivicLevel = 'observer';
  if (total >= 1000) level = 'champion';
  else if (total >= 600) level = 'leader';
  else if (total >= 300) level = 'advocate';
  else if (total >= 100) level = 'contributor';

  return {
    issuesReported: profile.issuesReported * 5,
    issuesResolved: profile.issuesResolved * 20,
    commentsCount: profile.commentsCount * 2,
    evidenceSubmitted: profile.evidenceSubmitted * 10,
    promisesTracked: profile.promisesTracked * 3,
    endorsements: profile.communityEndorsements * 5,
    modulesCompleted: profile.modulesCompleted * 15,
    challengesCompleted: profile.challengesCompleted * 10,
    totalScore: total,
    level,
  };
}

export function getCivicLevel(score: number): CivicLevel {
  if (score >= 1000) return 'champion';
  if (score >= 600) return 'leader';
  if (score >= 300) return 'advocate';
  if (score >= 100) return 'contributor';
  return 'observer';
}
