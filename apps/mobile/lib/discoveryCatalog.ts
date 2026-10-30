/**
 * Discovery Catalog — Typed, deterministic metadata for user goals, verified
 * feature directory entries, route contracts, and contextual guidance for all 48 screens.
 *
 * Invariant: Zero network calls, zero AI requests, zero fabricated dynamic parameters.
 */

export interface GoalCard {
  id: string;
  titleKey: string;
  descKey: string;
  icon: string;
  color: string;
  targetRoute?: string;
  stepsCount: number;
  badgeKey?: string;
}

export interface FeatureDirectoryItem {
  id: string;
  titleKey: string;
  descKey: string;
  category: 'civic' | 'media' | 'leadership' | 'tools';
  icon: string;
  color: string;
  route: string;
  isDynamic?: boolean;
  featureFlag?: string;
  status: 'available' | 'auth_required' | 'role_required' | 'compatibility_only';
}

export interface ScreenGuideEntry {
  screenKey: string;
  titleKey: string;
  purposeKey: string;
  stepsKeys: string[];
  caveatKey?: string;
  verifiedRoute: string;
  category: 'primary' | 'civic' | 'media' | 'workflow';
}

export const DISCOVERY_GOALS: GoalCard[] = [
  {
    id: 'understand_my_area',
    titleKey: 'discovery.goals.understandArea.title',
    descKey: 'discovery.goals.understandArea.desc',
    icon: 'map',
    color: '#3B82F6',
    targetRoute: '/(tabs)',
    stepsCount: 3,
  },
  {
    id: 'find_representatives',
    titleKey: 'discovery.goals.findRepresentatives.title',
    descKey: 'discovery.goals.findRepresentatives.desc',
    icon: 'people',
    color: '#10B981',
    targetRoute: '/parliament',
    stepsCount: 3,
  },
  {
    id: 'stay_informed',
    titleKey: 'discovery.goals.stayInformed.title',
    descKey: 'discovery.goals.stayInformed.desc',
    icon: 'newspaper',
    color: '#F59E0B',
    targetRoute: '/(tabs)/news',
    stepsCount: 3,
  },
  {
    id: 'participate_community',
    titleKey: 'discovery.goals.participate.title',
    descKey: 'discovery.goals.participate.desc',
    icon: 'chatbubbles',
    color: '#8B5CF6',
    targetRoute: '/(tabs)/community',
    stepsCount: 3,
  },
  {
    id: 'understand_elections',
    titleKey: 'discovery.goals.electionsGov.title',
    descKey: 'discovery.goals.electionsGov.desc',
    icon: 'stats-chart',
    color: '#EC4899',
    targetRoute: '/live-election',
    stepsCount: 3,
  },
  {
    id: 'leadership_journey',
    titleKey: 'discovery.goals.leadershipJourney.title',
    descKey: 'discovery.goals.leadershipJourney.desc',
    icon: 'school',
    color: '#6366F1',
    targetRoute: '/leadership-academy',
    stepsCount: 3,
  },
];

export const FEATURE_DIRECTORY: FeatureDirectoryItem[] = [
  // Civic & Representation
  {
    id: 'civic_dashboard',
    titleKey: 'more.tiles.civicDashboard',
    descKey: 'discovery.features.civicDashboard.desc',
    category: 'civic',
    icon: 'pulse',
    color: '#0D9488',
    route: '/dashboard',
    status: 'available',
  },
  {
    id: 'intelligence',
    titleKey: 'tabs.intelligence',
    descKey: 'discovery.features.intelligence.desc',
    category: 'civic',
    icon: 'analytics',
    color: '#2563EB',
    route: '/(tabs)/intelligence',
    status: 'available',
  },
  {
    id: 'parliament',
    titleKey: 'profileExtended.parliamentMPs',
    descKey: 'discovery.features.parliament.desc',
    category: 'civic',
    icon: 'business',
    color: '#C5A059',
    route: '/parliament',
    status: 'available',
  },
  {
    id: 'civic_metrics',
    titleKey: 'discovery.features.civicMetrics.title',
    descKey: 'discovery.features.civicMetrics.desc',
    category: 'civic',
    icon: 'bar-chart',
    color: '#059669',
    route: '/civic-metrics',
    status: 'available',
  },
  {
    id: 'local_bodies',
    titleKey: 'discovery.features.localBodies.title',
    descKey: 'discovery.features.localBodies.desc',
    category: 'civic',
    icon: 'git-network',
    color: '#D97706',
    route: '/local-bodies',
    status: 'available',
  },
  {
    id: 'departments',
    titleKey: 'discovery.features.departments.title',
    descKey: 'discovery.features.departments.desc',
    category: 'civic',
    icon: 'shield',
    color: '#4F46E5',
    route: '/departments/dashboard',
    status: 'available',
  },
  {
    id: 'delimitation',
    titleKey: 'more.tiles.delimitation',
    descKey: 'discovery.features.delimitation.desc',
    category: 'civic',
    icon: 'git-branch',
    color: '#B45309',
    route: '/delimitation',
    status: 'available',
  },
  {
    id: 'live_election',
    titleKey: 'more.tiles.liveElection',
    descKey: 'discovery.features.liveElection.desc',
    category: 'civic',
    icon: 'radio',
    color: '#E11D48',
    route: '/live-election',
    status: 'available',
  },

  // Community & Media
  {
    id: 'community_feed',
    titleKey: 'tabs.feed',
    descKey: 'discovery.features.communityFeed.desc',
    category: 'media',
    icon: 'chatbubbles',
    color: '#4F8EF7',
    route: '/(tabs)/community',
    status: 'available',
  },
  {
    id: 'news',
    titleKey: 'tabs.news',
    descKey: 'discovery.features.news.desc',
    category: 'media',
    icon: 'newspaper',
    color: '#F59E0B',
    route: '/(tabs)/news',
    status: 'available',
  },
  {
    id: 'journalist_newsroom',
    titleKey: 'discovery.features.newsroom.title',
    descKey: 'discovery.features.newsroom.desc',
    category: 'media',
    icon: 'mic',
    color: '#0284C7',
    route: '/journalist',
    status: 'available',
  },
  {
    id: 'poligram_live',
    titleKey: 'more.tiles.kshetraLive',
    descKey: 'discovery.features.poligramLive.desc',
    category: 'media',
    icon: 'videocam',
    color: '#DC2626',
    route: '/(tabs)/live',
    status: 'available',
  },
  {
    id: 'shorts',
    titleKey: 'tabs.shorts',
    descKey: 'discovery.features.shorts.desc',
    category: 'media',
    icon: 'play-circle',
    color: '#7C3AED',
    route: '/(tabs)/shorts',
    status: 'available',
  },

  // Leadership & Campaigns
  {
    id: 'pages_leaders',
    titleKey: 'more.pagesHQTitle',
    descKey: 'discovery.features.pagesLeaders.desc',
    category: 'leadership',
    icon: 'people',
    color: '#2563EB',
    route: '/pages',
    status: 'available',
  },
  {
    id: 'leadership_academy',
    titleKey: 'more.tiles.leadershipAcademy',
    descKey: 'discovery.features.leadershipAcademy.desc',
    category: 'leadership',
    icon: 'school',
    color: '#D97706',
    route: '/leadership-academy',
    status: 'available',
  },
  {
    id: 'politician_portal',
    titleKey: 'discovery.features.politicianPortal.title',
    descKey: 'discovery.features.politicianPortal.desc',
    category: 'leadership',
    icon: 'briefcase',
    color: '#059669',
    route: '/politician-portal',
    status: 'role_required',
  },
  {
    id: 'campaign_manager',
    titleKey: 'more.tiles.campaignManager',
    descKey: 'discovery.features.campaignManager.desc',
    category: 'leadership',
    icon: 'megaphone',
    color: '#4F8EF7',
    route: '/campaign-manager',
    status: 'role_required',
  },
  {
    id: 'candidate_xray',
    titleKey: 'more.tiles.candidateXRay',
    descKey: 'discovery.features.candidateXRay.desc',
    category: 'leadership',
    icon: 'scan',
    color: '#0D9488',
    route: '/candidate-xray',
    isDynamic: true,
    status: 'compatibility_only',
  },

  // Tools & Account
  {
    id: 'search',
    titleKey: 'common.search',
    descKey: 'discovery.features.search.desc',
    category: 'tools',
    icon: 'search',
    color: '#4B5563',
    route: '/search',
    status: 'available',
  },
  {
    id: 'ai_assistant',
    titleKey: 'more.tiles.aiAssistant',
    descKey: 'discovery.features.aiAssistant.desc',
    category: 'tools',
    icon: 'sparkles',
    color: '#F59E0B',
    route: '/ai-chat',
    status: 'available',
  },
  {
    id: 'profile',
    titleKey: 'more.tiles.profile',
    descKey: 'discovery.features.profile.desc',
    category: 'tools',
    icon: 'person',
    color: '#4F8EF7',
    route: '/(tabs)/profile',
    status: 'available',
  },
  {
    id: 'messages',
    titleKey: 'discovery.features.messages.title',
    descKey: 'discovery.features.messages.desc',
    category: 'tools',
    icon: 'mail',
    color: '#2563EB',
    route: '/messages',
    status: 'auth_required',
  },
  {
    id: 'notifications',
    titleKey: 'profile.notifications',
    descKey: 'discovery.features.notifications.desc',
    category: 'tools',
    icon: 'notifications',
    color: '#F59E0B',
    route: '/notifications',
    status: 'available',
  },
  {
    id: 'notification_settings',
    titleKey: 'profileExtended.notificationSettings',
    descKey: 'discovery.features.notificationSettings.desc',
    category: 'tools',
    icon: 'settings',
    color: '#8B5CF6',
    route: '/notification-settings',
    status: 'available',
  },
  {
    id: 'moderation_queue',
    titleKey: 'more.tiles.moderation',
    descKey: 'discovery.features.moderation.desc',
    category: 'tools',
    icon: 'shield-half',
    color: '#EC4899',
    route: '/moderation',
    status: 'role_required',
  },
];

export const SCREEN_GUIDES: Record<string, ScreenGuideEntry> = {
  // Primary Tabs
  map: {
    screenKey: 'map',
    titleKey: 'discovery.guides.map.title',
    purposeKey: 'discovery.guides.map.purpose',
    stepsKeys: [
      'discovery.guides.map.step1',
      'discovery.guides.map.step2',
      'discovery.guides.map.step3',
    ],
    caveatKey: 'discovery.guides.map.caveat',
    verifiedRoute: '/(tabs)',
    category: 'primary',
  },
  explore: {
    screenKey: 'explore',
    titleKey: 'discovery.guides.explore.title',
    purposeKey: 'discovery.guides.explore.purpose',
    stepsKeys: [
      'discovery.guides.explore.step1',
      'discovery.guides.explore.step2',
      'discovery.guides.explore.step3',
    ],
    caveatKey: 'discovery.guides.explore.caveat',
    verifiedRoute: '/(tabs)/explore',
    category: 'primary',
  },
  community: {
    screenKey: 'community',
    titleKey: 'discovery.guides.community.title',
    purposeKey: 'discovery.guides.community.purpose',
    stepsKeys: [
      'discovery.guides.community.step1',
      'discovery.guides.community.step2',
      'discovery.guides.community.step3',
    ],
    caveatKey: 'discovery.guides.community.caveat',
    verifiedRoute: '/(tabs)/community',
    category: 'primary',
  },
  news: {
    screenKey: 'news',
    titleKey: 'discovery.guides.news.title',
    purposeKey: 'discovery.guides.news.purpose',
    stepsKeys: [
      'discovery.guides.news.step1',
      'discovery.guides.news.step2',
      'discovery.guides.news.step3',
    ],
    caveatKey: 'discovery.guides.news.caveat',
    verifiedRoute: '/(tabs)/news',
    category: 'primary',
  },
  more: {
    screenKey: 'more',
    titleKey: 'discovery.guides.more.title',
    purposeKey: 'discovery.guides.more.purpose',
    stepsKeys: [
      'discovery.guides.more.step1',
      'discovery.guides.more.step2',
      'discovery.guides.more.step3',
    ],
    verifiedRoute: '/(tabs)/more',
    category: 'primary',
  },
  profile: {
    screenKey: 'profile',
    titleKey: 'discovery.guides.profile.title',
    purposeKey: 'discovery.guides.profile.purpose',
    stepsKeys: [
      'discovery.guides.profile.step1',
      'discovery.guides.profile.step2',
      'discovery.guides.profile.step3',
    ],
    caveatKey: 'discovery.guides.profile.caveat',
    verifiedRoute: '/(tabs)/profile',
    category: 'primary',
  },

  // Civic, Intelligence & Geography
  dashboard: {
    screenKey: 'dashboard',
    titleKey: 'discovery.guides.dashboard.title',
    purposeKey: 'discovery.guides.dashboard.purpose',
    stepsKeys: [
      'discovery.guides.dashboard.step1',
      'discovery.guides.dashboard.step2',
      'discovery.guides.dashboard.step3',
    ],
    caveatKey: 'discovery.guides.dashboard.caveat',
    verifiedRoute: '/dashboard',
    category: 'civic',
  },
  intelligence: {
    screenKey: 'intelligence',
    titleKey: 'discovery.guides.intelligence.title',
    purposeKey: 'discovery.guides.intelligence.purpose',
    stepsKeys: [
      'discovery.guides.intelligence.step1',
      'discovery.guides.intelligence.step2',
      'discovery.guides.intelligence.step3',
    ],
    caveatKey: 'discovery.guides.intelligence.caveat',
    verifiedRoute: '/(tabs)/intelligence',
    category: 'civic',
  },
  constituency_detail: {
    screenKey: 'constituency_detail',
    titleKey: 'discovery.guides.constituencyDetail.title',
    purposeKey: 'discovery.guides.constituencyDetail.purpose',
    stepsKeys: [
      'discovery.guides.constituencyDetail.step1',
      'discovery.guides.constituencyDetail.step2',
      'discovery.guides.constituencyDetail.step3',
    ],
    caveatKey: 'discovery.guides.constituencyDetail.caveat',
    verifiedRoute: '/constituency/[id]',
    category: 'civic',
  },
  parliament: {
    screenKey: 'parliament',
    titleKey: 'discovery.guides.parliament.title',
    purposeKey: 'discovery.guides.parliament.purpose',
    stepsKeys: [
      'discovery.guides.parliament.step1',
      'discovery.guides.parliament.step2',
      'discovery.guides.parliament.step3',
    ],
    verifiedRoute: '/parliament',
    category: 'civic',
  },
  civic_metrics: {
    screenKey: 'civic_metrics',
    titleKey: 'discovery.guides.civicMetrics.title',
    purposeKey: 'discovery.guides.civicMetrics.purpose',
    stepsKeys: [
      'discovery.guides.civicMetrics.step1',
      'discovery.guides.civicMetrics.step2',
      'discovery.guides.civicMetrics.step3',
    ],
    caveatKey: 'discovery.guides.civicMetrics.caveat',
    verifiedRoute: '/civic-metrics',
    category: 'civic',
  },
  local_bodies: {
    screenKey: 'local_bodies',
    titleKey: 'discovery.guides.localBodies.title',
    purposeKey: 'discovery.guides.localBodies.purpose',
    stepsKeys: [
      'discovery.guides.localBodies.step1',
      'discovery.guides.localBodies.step2',
      'discovery.guides.localBodies.step3',
    ],
    caveatKey: 'discovery.guides.localBodies.caveat',
    verifiedRoute: '/local-bodies',
    category: 'civic',
  },
  hierarchy: {
    screenKey: 'hierarchy',
    titleKey: 'discovery.guides.hierarchy.title',
    purposeKey: 'discovery.guides.hierarchy.purpose',
    stepsKeys: [
      'discovery.guides.hierarchy.step1',
      'discovery.guides.hierarchy.step2',
      'discovery.guides.hierarchy.step3',
    ],
    caveatKey: 'discovery.guides.hierarchy.caveat',
    verifiedRoute: '/hierarchy/[id]',
    category: 'civic',
  },
  departments: {
    screenKey: 'departments',
    titleKey: 'discovery.guides.departments.title',
    purposeKey: 'discovery.guides.departments.purpose',
    stepsKeys: [
      'discovery.guides.departments.step1',
      'discovery.guides.departments.step2',
      'discovery.guides.departments.step3',
    ],
    caveatKey: 'discovery.guides.departments.caveat',
    verifiedRoute: '/departments/dashboard',
    category: 'civic',
  },
  delimitation_index: {
    screenKey: 'delimitation_index',
    titleKey: 'discovery.guides.delimitation.title',
    purposeKey: 'discovery.guides.delimitation.purpose',
    stepsKeys: [
      'discovery.guides.delimitation.step1',
      'discovery.guides.delimitation.step2',
      'discovery.guides.delimitation.step3',
    ],
    caveatKey: 'discovery.guides.delimitation.caveat',
    verifiedRoute: '/delimitation',
    category: 'civic',
  },
  delimitation_impact: {
    screenKey: 'delimitation_impact',
    titleKey: 'discovery.guides.delimitationImpact.title',
    purposeKey: 'discovery.guides.delimitationImpact.purpose',
    stepsKeys: [
      'discovery.guides.delimitationImpact.step1',
      'discovery.guides.delimitationImpact.step2',
      'discovery.guides.delimitationImpact.step3',
    ],
    caveatKey: 'discovery.guides.delimitationImpact.caveat',
    verifiedRoute: '/delimitation/my-impact',
    category: 'civic',
  },
  delimitation_simulator: {
    screenKey: 'delimitation_simulator',
    titleKey: 'discovery.guides.delimitationSimulator.title',
    purposeKey: 'discovery.guides.delimitationSimulator.purpose',
    stepsKeys: [
      'discovery.guides.delimitationSimulator.step1',
      'discovery.guides.delimitationSimulator.step2',
      'discovery.guides.delimitationSimulator.step3',
    ],
    caveatKey: 'discovery.guides.delimitationSimulator.caveat',
    verifiedRoute: '/delimitation/simulator',
    category: 'civic',
  },
  delimitation_state: {
    screenKey: 'delimitation_state',
    titleKey: 'discovery.guides.delimitationState.title',
    purposeKey: 'discovery.guides.delimitationState.purpose',
    stepsKeys: [
      'discovery.guides.delimitationState.step1',
      'discovery.guides.delimitationState.step2',
      'discovery.guides.delimitationState.step3',
    ],
    caveatKey: 'discovery.guides.delimitationState.caveat',
    verifiedRoute: '/delimitation/state/[code]',
    category: 'civic',
  },

  // Media, Broadcasting & Campaigns
  feed: {
    screenKey: 'feed',
    titleKey: 'discovery.guides.feed.title',
    purposeKey: 'discovery.guides.feed.purpose',
    stepsKeys: [
      'discovery.guides.feed.step1',
      'discovery.guides.feed.step2',
      'discovery.guides.feed.step3',
    ],
    verifiedRoute: '/(tabs)/feed',
    category: 'media',
  },
  shorts: {
    screenKey: 'shorts',
    titleKey: 'discovery.guides.shorts.title',
    purposeKey: 'discovery.guides.shorts.purpose',
    stepsKeys: [
      'discovery.guides.shorts.step1',
      'discovery.guides.shorts.step2',
      'discovery.guides.shorts.step3',
    ],
    caveatKey: 'discovery.guides.shorts.caveat',
    verifiedRoute: '/(tabs)/shorts',
    category: 'media',
  },
  live_feed: {
    screenKey: 'live_feed',
    titleKey: 'discovery.guides.liveFeed.title',
    purposeKey: 'discovery.guides.liveFeed.purpose',
    stepsKeys: [
      'discovery.guides.liveFeed.step1',
      'discovery.guides.liveFeed.step2',
      'discovery.guides.liveFeed.step3',
    ],
    caveatKey: 'discovery.guides.liveFeed.caveat',
    verifiedRoute: '/(tabs)/live',
    category: 'media',
  },
  journalist: {
    screenKey: 'journalist',
    titleKey: 'discovery.guides.journalist.title',
    purposeKey: 'discovery.guides.journalist.purpose',
    stepsKeys: [
      'discovery.guides.journalist.step1',
      'discovery.guides.journalist.step2',
      'discovery.guides.journalist.step3',
    ],
    verifiedRoute: '/journalist',
    category: 'media',
  },
  leadership_academy: {
    screenKey: 'leadership_academy',
    titleKey: 'discovery.guides.leadershipAcademy.title',
    purposeKey: 'discovery.guides.leadershipAcademy.purpose',
    stepsKeys: [
      'discovery.guides.leadershipAcademy.step1',
      'discovery.guides.leadershipAcademy.step2',
      'discovery.guides.leadershipAcademy.step3',
    ],
    verifiedRoute: '/leadership-academy',
    category: 'media',
  },
  pages_leaders: {
    screenKey: 'pages_leaders',
    titleKey: 'discovery.guides.pages.title',
    purposeKey: 'discovery.guides.pages.purpose',
    stepsKeys: [
      'discovery.guides.pages.step1',
      'discovery.guides.pages.step2',
      'discovery.guides.pages.step3',
    ],
    verifiedRoute: '/pages',
    category: 'media',
  },
  politician_portal: {
    screenKey: 'politician_portal',
    titleKey: 'discovery.guides.politicianPortal.title',
    purposeKey: 'discovery.guides.politicianPortal.purpose',
    stepsKeys: [
      'discovery.guides.politicianPortal.step1',
      'discovery.guides.politicianPortal.step2',
      'discovery.guides.politicianPortal.step3',
    ],
    caveatKey: 'discovery.guides.politicianPortal.caveat',
    verifiedRoute: '/politician-portal',
    category: 'media',
  },
  live_election: {
    screenKey: 'live_election',
    titleKey: 'discovery.guides.liveElection.title',
    purposeKey: 'discovery.guides.liveElection.purpose',
    stepsKeys: [
      'discovery.guides.liveElection.step1',
      'discovery.guides.liveElection.step2',
      'discovery.guides.liveElection.step3',
    ],
    caveatKey: 'discovery.guides.liveElection.caveat',
    verifiedRoute: '/live-election',
    category: 'media',
  },
  live_player: {
    screenKey: 'live_player',
    titleKey: 'discovery.guides.livePlayer.title',
    purposeKey: 'discovery.guides.livePlayer.purpose',
    stepsKeys: [
      'discovery.guides.livePlayer.step1',
      'discovery.guides.livePlayer.step2',
      'discovery.guides.livePlayer.step3',
    ],
    caveatKey: 'discovery.guides.livePlayer.caveat',
    verifiedRoute: '/live/[id]',
    category: 'media',
  },
  go_live: {
    screenKey: 'go_live',
    titleKey: 'discovery.guides.goLive.title',
    purposeKey: 'discovery.guides.goLive.purpose',
    stepsKeys: [
      'discovery.guides.goLive.step1',
      'discovery.guides.goLive.step2',
      'discovery.guides.goLive.step3',
    ],
    caveatKey: 'discovery.guides.goLive.caveat',
    verifiedRoute: '/live/go-live',
    category: 'media',
  },
  live_distribution: {
    screenKey: 'live_distribution',
    titleKey: 'discovery.guides.liveDistribution.title',
    purposeKey: 'discovery.guides.liveDistribution.purpose',
    stepsKeys: [
      'discovery.guides.liveDistribution.step1',
      'discovery.guides.liveDistribution.step2',
      'discovery.guides.liveDistribution.step3',
    ],
    caveatKey: 'discovery.guides.liveDistribution.caveat',
    verifiedRoute: '/live/distribution',
    category: 'media',
  },
  live_moderation_queue: {
    screenKey: 'live_moderation_queue',
    titleKey: 'discovery.guides.liveModeration.title',
    purposeKey: 'discovery.guides.liveModeration.purpose',
    stepsKeys: [
      'discovery.guides.liveModeration.step1',
      'discovery.guides.liveModeration.step2',
      'discovery.guides.liveModeration.step3',
    ],
    caveatKey: 'discovery.guides.liveModeration.caveat',
    verifiedRoute: '/live/moderation-queue',
    category: 'media',
  },
  campaign_manager: {
    screenKey: 'campaign_manager',
    titleKey: 'discovery.guides.campaignManager.title',
    purposeKey: 'discovery.guides.campaignManager.purpose',
    stepsKeys: [
      'discovery.guides.campaignManager.step1',
      'discovery.guides.campaignManager.step2',
      'discovery.guides.campaignManager.step3',
    ],
    caveatKey: 'discovery.guides.campaignManager.caveat',
    verifiedRoute: '/campaign-manager',
    category: 'media',
  },

  // Detail, Workflows & Safety
  issue_detail: {
    screenKey: 'issue_detail',
    titleKey: 'discovery.guides.issueDetail.title',
    purposeKey: 'discovery.guides.issueDetail.purpose',
    stepsKeys: [
      'discovery.guides.issueDetail.step1',
      'discovery.guides.issueDetail.step2',
      'discovery.guides.issueDetail.step3',
    ],
    verifiedRoute: '/issue/[id]',
    category: 'workflow',
  },
  legislator_profile: {
    screenKey: 'legislator_profile',
    titleKey: 'discovery.guides.legislatorProfile.title',
    purposeKey: 'discovery.guides.legislatorProfile.purpose',
    stepsKeys: [
      'discovery.guides.legislatorProfile.step1',
      'discovery.guides.legislatorProfile.step2',
      'discovery.guides.legislatorProfile.step3',
    ],
    caveatKey: 'discovery.guides.legislatorProfile.caveat',
    verifiedRoute: '/legislator/[id]',
    category: 'workflow',
  },
  representative_profile: {
    screenKey: 'representative_profile',
    titleKey: 'discovery.guides.representativeProfile.title',
    purposeKey: 'discovery.guides.representativeProfile.purpose',
    stepsKeys: [
      'discovery.guides.representativeProfile.step1',
      'discovery.guides.representativeProfile.step2',
      'discovery.guides.representativeProfile.step3',
    ],
    caveatKey: 'discovery.guides.representativeProfile.caveat',
    verifiedRoute: '/representative/[id]',
    category: 'workflow',
  },
  representative_edit: {
    screenKey: 'representative_edit',
    titleKey: 'discovery.guides.representativeEdit.title',
    purposeKey: 'discovery.guides.representativeEdit.purpose',
    stepsKeys: [
      'discovery.guides.representativeEdit.step1',
      'discovery.guides.representativeEdit.step2',
      'discovery.guides.representativeEdit.step3',
    ],
    caveatKey: 'discovery.guides.representativeEdit.caveat',
    verifiedRoute: '/representative/edit/[id]',
    category: 'workflow',
  },
  candidate_xray: {
    screenKey: 'candidate_xray',
    titleKey: 'discovery.guides.candidateXRay.title',
    purposeKey: 'discovery.guides.candidateXRay.purpose',
    stepsKeys: [
      'discovery.guides.candidateXRay.step1',
      'discovery.guides.candidateXRay.step2',
      'discovery.guides.candidateXRay.step3',
    ],
    caveatKey: 'discovery.guides.candidateXRay.caveat',
    verifiedRoute: '/candidate-xray/[id]',
    category: 'workflow',
  },
  user_profile: {
    screenKey: 'user_profile',
    titleKey: 'discovery.guides.userProfile.title',
    purposeKey: 'discovery.guides.userProfile.purpose',
    stepsKeys: [
      'discovery.guides.userProfile.step1',
      'discovery.guides.userProfile.step2',
      'discovery.guides.userProfile.step3',
    ],
    verifiedRoute: '/user/[userId]',
    category: 'workflow',
  },
  edit_profile: {
    screenKey: 'edit_profile',
    titleKey: 'discovery.guides.editProfile.title',
    purposeKey: 'discovery.guides.editProfile.purpose',
    stepsKeys: [
      'discovery.guides.editProfile.step1',
      'discovery.guides.editProfile.step2',
      'discovery.guides.editProfile.step3',
    ],
    verifiedRoute: '/edit-profile',
    category: 'workflow',
  },
  auth_sign_in: {
    screenKey: 'auth_sign_in',
    titleKey: 'discovery.guides.auth.title',
    purposeKey: 'discovery.guides.auth.purpose',
    stepsKeys: [
      'discovery.guides.auth.step1',
      'discovery.guides.auth.step2',
      'discovery.guides.auth.step3',
    ],
    verifiedRoute: '/auth/sign-in',
    category: 'workflow',
  },
  onboarding: {
    screenKey: 'onboarding',
    titleKey: 'discovery.guides.onboarding.title',
    purposeKey: 'discovery.guides.onboarding.purpose',
    stepsKeys: [
      'discovery.guides.onboarding.step1',
      'discovery.guides.onboarding.step2',
      'discovery.guides.onboarding.step3',
    ],
    caveatKey: 'discovery.guides.onboarding.caveat',
    verifiedRoute: '/onboarding',
    category: 'workflow',
  },
  search: {
    screenKey: 'search',
    titleKey: 'discovery.guides.search.title',
    purposeKey: 'discovery.guides.search.purpose',
    stepsKeys: [
      'discovery.guides.search.step1',
      'discovery.guides.search.step2',
      'discovery.guides.search.step3',
    ],
    verifiedRoute: '/search',
    category: 'workflow',
  },
  ai_chat: {
    screenKey: 'ai_chat',
    titleKey: 'discovery.guides.aiChat.title',
    purposeKey: 'discovery.guides.aiChat.purpose',
    stepsKeys: [
      'discovery.guides.aiChat.step1',
      'discovery.guides.aiChat.step2',
      'discovery.guides.aiChat.step3',
    ],
    caveatKey: 'discovery.guides.aiChat.caveat',
    verifiedRoute: '/ai-chat',
    category: 'workflow',
  },
  messages_index: {
    screenKey: 'messages_index',
    titleKey: 'discovery.guides.messages.title',
    purposeKey: 'discovery.guides.messages.purpose',
    stepsKeys: [
      'discovery.guides.messages.step1',
      'discovery.guides.messages.step2',
      'discovery.guides.messages.step3',
    ],
    caveatKey: 'discovery.guides.messages.caveat',
    verifiedRoute: '/messages',
    category: 'workflow',
  },
  messages_thread: {
    screenKey: 'messages_thread',
    titleKey: 'discovery.guides.messageThread.title',
    purposeKey: 'discovery.guides.messageThread.purpose',
    stepsKeys: [
      'discovery.guides.messageThread.step1',
      'discovery.guides.messageThread.step2',
      'discovery.guides.messageThread.step3',
    ],
    caveatKey: 'discovery.guides.messageThread.caveat',
    verifiedRoute: '/messages/[conversationId]',
    category: 'workflow',
  },
  notifications: {
    screenKey: 'notifications',
    titleKey: 'discovery.guides.notifications.title',
    purposeKey: 'discovery.guides.notifications.purpose',
    stepsKeys: [
      'discovery.guides.notifications.step1',
      'discovery.guides.notifications.step2',
      'discovery.guides.notifications.step3',
    ],
    verifiedRoute: '/notifications',
    category: 'workflow',
  },
  notification_settings: {
    screenKey: 'notification_settings',
    titleKey: 'discovery.guides.notificationSettings.title',
    purposeKey: 'discovery.guides.notificationSettings.purpose',
    stepsKeys: [
      'discovery.guides.notificationSettings.step1',
      'discovery.guides.notificationSettings.step2',
      'discovery.guides.notificationSettings.step3',
    ],
    caveatKey: 'discovery.guides.notificationSettings.caveat',
    verifiedRoute: '/notification-settings',
    category: 'workflow',
  },
  moderation: {
    screenKey: 'moderation',
    titleKey: 'discovery.guides.moderation.title',
    purposeKey: 'discovery.guides.moderation.purpose',
    stepsKeys: [
      'discovery.guides.moderation.step1',
      'discovery.guides.moderation.step2',
      'discovery.guides.moderation.step3',
    ],
    caveatKey: 'discovery.guides.moderation.caveat',
    verifiedRoute: '/moderation',
    category: 'workflow',
  },
  reader: {
    screenKey: 'reader',
    titleKey: 'discovery.guides.reader.title',
    purposeKey: 'discovery.guides.reader.purpose',
    stepsKeys: [
      'discovery.guides.reader.step1',
      'discovery.guides.reader.step2',
      'discovery.guides.reader.step3',
    ],
    caveatKey: 'discovery.guides.reader.caveat',
    verifiedRoute: '/reader',
    category: 'workflow',
  },
};

/**
 * Deterministic local search across catalog features and user goals.
 * Matches on localized translated strings or key tokens without remote calls.
 */
export function searchDiscoveryCatalog(
  query: string,
  t: (key: string, opts?: any) => string,
): {
  goals: GoalCard[];
  features: FeatureDirectoryItem[];
  guides: ScreenGuideEntry[];
} {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { goals: DISCOVERY_GOALS, features: FEATURE_DIRECTORY, guides: [] };
  }

  const matchedGoals = DISCOVERY_GOALS.filter((g) => {
    const title = t(g.titleKey, { defaultValue: g.id }).toLowerCase();
    const desc = t(g.descKey, { defaultValue: '' }).toLowerCase();
    return title.includes(q) || desc.includes(q) || g.id.includes(q);
  });

  const matchedFeatures = FEATURE_DIRECTORY.filter((f) => {
    const title = t(f.titleKey, { defaultValue: f.id }).toLowerCase();
    const desc = t(f.descKey, { defaultValue: '' }).toLowerCase();
    return title.includes(q) || desc.includes(q) || f.id.includes(q);
  });

  const matchedGuides = Object.values(SCREEN_GUIDES).filter((g) => {
    const title = t(g.titleKey, { defaultValue: g.screenKey }).toLowerCase();
    const purpose = t(g.purposeKey, { defaultValue: '' }).toLowerCase();
    return title.includes(q) || purpose.includes(q) || g.screenKey.includes(q);
  });

  return {
    goals: matchedGoals,
    features: matchedFeatures,
    guides: matchedGuides,
  };
}
