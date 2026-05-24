// ─── Journalist Platform Types ───
// Covers: Journalist dashboard, long-form articles, verification,
// portfolios, beats, breaking news, fact-checking, revenue, analytics

// ─── Enums ───

export type JournalistTier = 'citizen' | 'stringer' | 'correspondent' | 'senior' | 'editor' | 'bureau_chief';

export type ArticleStatus = 'draft' | 'submitted' | 'under_review' | 'fact_checking' | 'approved' | 'published' | 'rejected' | 'retracted' | 'archived';

export type ArticleType = 'breaking_news' | 'news_report' | 'investigation' | 'opinion' | 'editorial' | 'photo_essay' | 'video_report' | 'audio_report' | 'data_story' | 'interview' | 'ground_report' | 'explainer';

export type BeatCategory = 'politics' | 'governance' | 'crime' | 'education' | 'health' | 'infrastructure' | 'agriculture' | 'environment' | 'business' | 'culture' | 'sports' | 'general';

export type FactCheckVerdict = 'true' | 'mostly_true' | 'half_true' | 'mostly_false' | 'false' | 'misleading' | 'unverifiable' | 'satire' | 'out_of_context';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended' | 'revoked';

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'infographic' | 'chart';

export type RevenueType = 'tip' | 'subscription' | 'sponsored_story' | 'syndication' | 'platform_bonus';

export type BreakingNewsPriority = 'flash' | 'urgent' | 'developing' | 'update';

// ─── Configs ───

export const JOURNALIST_TIER_CONFIG: Record<JournalistTier, { label: string; icon: string; color: string; minArticles: number; minReputation: number; canPublishDirectly: boolean; revenueShare: number }> = {
  citizen: { label: 'Citizen Journalist', icon: 'person', color: '#6B7280', minArticles: 0, minReputation: 0, canPublishDirectly: false, revenueShare: 0.4 },
  stringer: { label: 'Stringer', icon: 'create', color: '#3B82F6', minArticles: 10, minReputation: 100, canPublishDirectly: false, revenueShare: 0.5 },
  correspondent: { label: 'Correspondent', icon: 'mic', color: '#8B5CF6', minArticles: 50, minReputation: 500, canPublishDirectly: true, revenueShare: 0.6 },
  senior: { label: 'Senior Correspondent', icon: 'newspaper', color: '#F59E0B', minArticles: 200, minReputation: 2000, canPublishDirectly: true, revenueShare: 0.65 },
  editor: { label: 'Editor', icon: 'pencil', color: '#EF4444', minArticles: 500, minReputation: 5000, canPublishDirectly: true, revenueShare: 0.7 },
  bureau_chief: { label: 'Bureau Chief', icon: 'shield-checkmark', color: '#10B981', minArticles: 1000, minReputation: 10000, canPublishDirectly: true, revenueShare: 0.75 },
};

export const ARTICLE_TYPE_CONFIG: Record<ArticleType, { label: string; icon: string; color: string; minWordCount: number; requiresEditor: boolean; priority: number }> = {
  breaking_news: { label: 'Breaking News', icon: 'flash', color: '#EF4444', minWordCount: 100, requiresEditor: false, priority: 1 },
  news_report: { label: 'News Report', icon: 'newspaper', color: '#3B82F6', minWordCount: 300, requiresEditor: true, priority: 2 },
  investigation: { label: 'Investigation', icon: 'search', color: '#8B5CF6', minWordCount: 1000, requiresEditor: true, priority: 3 },
  opinion: { label: 'Opinion', icon: 'chatbubble', color: '#F59E0B', minWordCount: 500, requiresEditor: true, priority: 4 },
  editorial: { label: 'Editorial', icon: 'document-text', color: '#10B981', minWordCount: 800, requiresEditor: true, priority: 5 },
  photo_essay: { label: 'Photo Essay', icon: 'images', color: '#EC4899', minWordCount: 200, requiresEditor: true, priority: 6 },
  video_report: { label: 'Video Report', icon: 'videocam', color: '#F97316', minWordCount: 50, requiresEditor: false, priority: 7 },
  audio_report: { label: 'Audio Report', icon: 'mic', color: '#06B6D4', minWordCount: 50, requiresEditor: false, priority: 8 },
  data_story: { label: 'Data Story', icon: 'bar-chart', color: '#14B8A6', minWordCount: 500, requiresEditor: true, priority: 9 },
  interview: { label: 'Interview', icon: 'people', color: '#A855F7', minWordCount: 500, requiresEditor: true, priority: 10 },
  ground_report: { label: 'Ground Report', icon: 'location', color: '#84CC16', minWordCount: 300, requiresEditor: false, priority: 11 },
  explainer: { label: 'Explainer', icon: 'bulb', color: '#FBBF24', minWordCount: 600, requiresEditor: true, priority: 12 },
};

export const FACT_CHECK_CONFIG: Record<FactCheckVerdict, { label: string; icon: string; color: string; emoji: string }> = {
  true: { label: 'True', icon: 'checkmark-circle', color: '#10B981', emoji: '✅' },
  mostly_true: { label: 'Mostly True', icon: 'checkmark', color: '#84CC16', emoji: '🟢' },
  half_true: { label: 'Half True', icon: 'remove-circle', color: '#F59E0B', emoji: '🟡' },
  mostly_false: { label: 'Mostly False', icon: 'close-circle', color: '#F97316', emoji: '🟠' },
  false: { label: 'False', icon: 'close-circle', color: '#EF4444', emoji: '🔴' },
  misleading: { label: 'Misleading', icon: 'warning', color: '#A855F7', emoji: '⚠️' },
  unverifiable: { label: 'Unverifiable', icon: 'help-circle', color: '#6B7280', emoji: '❓' },
  satire: { label: 'Satire', icon: 'happy', color: '#06B6D4', emoji: '😄' },
  out_of_context: { label: 'Out of Context', icon: 'cut', color: '#EC4899', emoji: '✂️' },
};

export const BEAT_CONFIG: Record<BeatCategory, { label: string; icon: string; color: string }> = {
  politics: { label: 'Politics', icon: 'flag', color: '#EF4444' },
  governance: { label: 'Governance', icon: 'business', color: '#3B82F6' },
  crime: { label: 'Crime', icon: 'shield', color: '#F97316' },
  education: { label: 'Education', icon: 'school', color: '#8B5CF6' },
  health: { label: 'Health', icon: 'medkit', color: '#10B981' },
  infrastructure: { label: 'Infrastructure', icon: 'construct', color: '#F59E0B' },
  agriculture: { label: 'Agriculture', icon: 'leaf', color: '#84CC16' },
  environment: { label: 'Environment', icon: 'earth', color: '#06B6D4' },
  business: { label: 'Business', icon: 'trending-up', color: '#A855F7' },
  culture: { label: 'Culture', icon: 'color-palette', color: '#EC4899' },
  sports: { label: 'Sports', icon: 'football', color: '#14B8A6' },
  general: { label: 'General', icon: 'grid', color: '#6B7280' },
};

export const BREAKING_PRIORITY_CONFIG: Record<BreakingNewsPriority, { label: string; color: string; ttlMinutes: number; pushEnabled: boolean }> = {
  flash: { label: '⚡ FLASH', color: '#EF4444', ttlMinutes: 30, pushEnabled: true },
  urgent: { label: '🔴 URGENT', color: '#F97316', ttlMinutes: 120, pushEnabled: true },
  developing: { label: '🟡 DEVELOPING', color: '#F59E0B', ttlMinutes: 360, pushEnabled: false },
  update: { label: '🔵 UPDATE', color: '#3B82F6', ttlMinutes: 720, pushEnabled: false },
};

// ─── Interfaces ───

export interface JournalistProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  tier: JournalistTier;
  verificationStatus: VerificationStatus;
  pressCardUrl?: string;
  outletAffiliation?: string;
  outletRole?: string;
  beats: BeatCategory[];
  coverageAreas: { stateCode: string; districtName?: string; constituencyAcNo?: number }[];
  portfolioUrl?: string;
  socialLinks: { platform: string; url: string }[];
  reputation: number;
  totalArticles: number;
  totalViews: number;
  totalTips: number;
  totalEarnings: number;
  avgRating: number;
  isAvailableForAssignment: boolean;
  joinedAt: string;
  lastActiveAt: string;
  featuredArticleIds: string[];
  badges: JournalistBadge[];
}

export interface JournalistBadge {
  id: string;
  type: 'first_article' | 'viral_story' | 'fact_checker' | 'ground_reporter' | 'data_journalist' | 'election_coverage' | 'investigation_star' | 'community_choice' | 'editor_pick' | 'breaking_first';
  label: string;
  icon: string;
  earnedAt: string;
}

export interface Article {
  id: string;
  authorId: string;
  authorName: string;
  authorTier: JournalistTier;
  authorAvatarUrl?: string;
  type: ArticleType;
  status: ArticleStatus;
  headline: string;
  subheadline?: string;
  slug: string;
  body: ArticleBlock[];
  summary: string;
  coverImageUrl?: string;
  media: ArticleMedia[];
  tags: string[];
  beats: BeatCategory[];
  sources: ArticleSource[];
  location?: { stateCode: string; districtName?: string; constituencyAcNo?: number; gpsLat?: number; gpsLng?: number };
  wordCount: number;
  readTimeMinutes: number;
  views: number;
  shares: number;
  tips: number;
  tipAmountTotal: number;
  reactions: { like: number; insightful: number; important: number; misleading: number };
  comments: number;
  factCheckId?: string;
  isBreaking: boolean;
  breakingPriority?: BreakingNewsPriority;
  isEditorPick: boolean;
  isFeatured: boolean;
  publishedAt?: string;
  updatedAt: string;
  createdAt: string;
  reviewedBy?: string;
  reviewNote?: string;
  relatedArticleIds: string[];
  constituencyAcNo?: number;
  stateCode?: string;
}

export interface ArticleBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'subheading' | 'quote' | 'image' | 'video' | 'audio' | 'embed' | 'divider' | 'list' | 'data_widget' | 'pullquote' | 'callout';
  content: string;
  mediaUrl?: string;
  caption?: string;
  attribution?: string;
  metadata?: Record<string, string>;
}

export interface ArticleMedia {
  id: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  credit?: string;
  altText?: string;
  durationSeconds?: number;
  sizeBytes?: number;
}

export interface ArticleSource {
  id: string;
  label: string;
  type: 'official_document' | 'interview' | 'press_release' | 'rti_response' | 'court_order' | 'social_media' | 'eyewitness' | 'anonymous' | 'public_record' | 'other';
  url?: string;
  quote?: string;
  isAnonymous: boolean;
  verifiedByEditor: boolean;
}

export interface FactCheck {
  id: string;
  articleId?: string;
  claimText: string;
  claimSource: string;
  claimDate: string;
  verdict: FactCheckVerdict;
  explanation: string;
  evidence: { label: string; url?: string; type: string }[];
  checkedBy: string;
  reviewedBy?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface BreakingNewsItem {
  id: string;
  priority: BreakingNewsPriority;
  headline: string;
  summary: string;
  articleId?: string;
  authorId: string;
  stateCode?: string;
  constituencyAcNo?: number;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
  updateCount: number;
  updates: { text: string; timestamp: string }[];
}

export interface JournalistAnalytics {
  journalistId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  totalArticles: number;
  totalViews: number;
  totalShares: number;
  totalTips: number;
  totalEarnings: number;
  avgReadTime: number;
  topArticles: { id: string; headline: string; views: number }[];
  viewsByBeat: Record<BeatCategory, number>;
  viewsByDay: { date: string; views: number }[];
  engagementRate: number;
  followerCount: number;
  followerGrowth: number;
  reachByState: Record<string, number>;
}

export interface TipTransaction {
  id: string;
  fromUserId: string;
  toJournalistId: string;
  articleId: string;
  amount: number;
  currency: 'INR';
  message?: string;
  createdAt: string;
}

export interface EditorialAssignment {
  id: string;
  editorId: string;
  journalistId: string;
  beat: BeatCategory;
  stateCode: string;
  constituencyAcNo?: number;
  title: string;
  description: string;
  deadline: string;
  status: 'assigned' | 'accepted' | 'in_progress' | 'submitted' | 'completed' | 'cancelled';
  createdAt: string;
}

// ─── Utility Functions ───

export function getJournalistTier(articles: number, reputation: number): JournalistTier {
  const tiers: JournalistTier[] = ['bureau_chief', 'editor', 'senior', 'correspondent', 'stringer', 'citizen'];
  for (const tier of tiers) {
    const config = JOURNALIST_TIER_CONFIG[tier];
    if (articles >= config.minArticles && reputation >= config.minReputation) return tier;
  }
  return 'citizen';
}

export function calculateReadTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

export function canPublishDirectly(tier: JournalistTier): boolean {
  return JOURNALIST_TIER_CONFIG[tier].canPublishDirectly;
}

export function calculateRevenueShare(tier: JournalistTier, amount: number): { journalist: number; platform: number } {
  const share = JOURNALIST_TIER_CONFIG[tier].revenueShare;
  return { journalist: Math.round(amount * share * 100) / 100, platform: Math.round(amount * (1 - share) * 100) / 100 };
}

export function getArticleStatusColor(status: ArticleStatus): string {
  const colors: Record<ArticleStatus, string> = {
    draft: '#6B7280', submitted: '#3B82F6', under_review: '#F59E0B', fact_checking: '#8B5CF6',
    approved: '#10B981', published: '#10B981', rejected: '#EF4444', retracted: '#EF4444', archived: '#4B5563',
  };
  return colors[status];
}

export function isBreakingActive(item: BreakingNewsItem): boolean {
  return item.isActive && new Date(item.expiresAt).getTime() > Date.now();
}
