/**
 * English (en) — Base translation
 *
 * All UI strings for the Kshetra app. This is the source of truth.
 * Other locale files must mirror this structure exactly.
 */
const en = {
  // ── Common ──────────────────────────────────────────────────
  common: {
    appName: 'Kshetra',
    loading: 'Loading…',
    error: 'Something went wrong',
    retry: 'Retry',
    cancel: 'Cancel',
    save: 'Save',
    done: 'Done',
    next: 'Next',
    back: 'Back',
    search: 'Search',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    share: 'Share',
    report: 'Report',
    ok: 'OK',
    yes: 'Yes',
    no: 'No',
    all: 'All',
    none: 'None',
    seeAll: 'See All',
    comingSoon: 'Coming Soon',
    noResults: 'No results found',
    pullToRefresh: 'Pull to refresh',
  },

  // ── Tab Bar ─────────────────────────────────────────────────
  tabs: {
    map: 'Map',
    explore: 'Explore',
    feed: 'Feed',
    dashboard: 'Dashboard',
    profile: 'Profile',
  },

  // ── Map Screen ──────────────────────────────────────────────
  map: {
    title: 'Kshetra',
    searchPlaceholder: 'Search constituencies…',
    tapToExplore: 'Tap a constituency to explore',
    locateMe: 'Locate Me',
    colorModes: {
      party: 'Party',
      margin: 'Margin',
      reservation: 'Type',
      population: 'Population',
      literacy: 'Literacy',
      turnout: 'Turnout',
    },
    compare: 'Compare',
    setAsHome: 'Set as My Constituency',
    removeHome: 'Remove as My Constituency',
    myConstituency: 'My Constituency',
    didYouKnow: 'Did You Know?',
    legend: 'Legend',
  },

  // ── Explore Screen ──────────────────────────────────────────
  explore: {
    title: 'Explore',
    searchPlaceholder: 'Search by name, MLA, party, district…',
    sortBy: 'Sort',
    sort: {
      acNo: 'AC #',
      name: 'A–Z',
      marginAsc: 'Closest',
      marginDesc: 'Biggest',
    },
    filters: 'Filters',
    party: 'Party',
    district: 'District',
    type: 'Type',
    clearFilters: 'Clear Filters',
    favoritesOnly: 'Favorites Only',
    aiSearch: 'AI Search',
    constituencies: 'constituencies',
    margin: 'margin',
    seat: 'seat',
    gen: 'General',
    sc: 'SC',
    st: 'ST',
  },

  // ── Constituency Detail ─────────────────────────────────────
  constituency: {
    overview: 'Overview',
    currentMLA: 'Current MLA',
    electedAs: 'Elected as',
    defectedTo: 'Defected to',
    district: 'District',
    type: 'Type',
    acNumber: 'AC No.',
    election2023: '2023 Election',
    winner: 'Winner',
    runnerUp: 'Runner-up',
    margin: 'Margin',
    votes: 'votes',
    voteShare: 'Vote Share',
    demographics: 'Demographics',
    population: 'Population',
    literacy: 'Literacy Rate',
    urbanRural: 'Urban / Rural',
    genderRatio: 'Gender Ratio',
    scPct: 'SC %',
    stPct: 'ST %',
    history: 'History',
    electionHistory: 'Election History',
    noHistory: 'No historical data available',
    trivia: 'Did You Know?',
    aiAnalysis: 'AI Analysis',
    generateAnalysis: 'Generate AI Analysis',
    analyzing: 'Analyzing…',
  },

  // ── Feed Screen ─────────────────────────────────────────────
  feed: {
    title: 'Community Feed',
    compose: 'Post',
    filters: {
      all: 'All',
      discussion: 'Discuss',
      news: 'News',
      question: 'Q&A',
      poll: 'Polls',
      opinion: 'Opinion',
      alert: 'Alert',
    },
    emptyFeed: 'No posts yet. Be the first to share!',
    trending: 'Trending',
    share: 'Share this post',
    react: 'React',
    reply: 'Reply',
    replies: 'replies',
    writeReply: 'Write a reply…',
  },

  // ── Compose ─────────────────────────────────────────────────
  compose: {
    title: 'New Post',
    placeholder: "What's on your mind?",
    postType: 'Post Type',
    addHashtags: 'Add hashtags',
    submit: 'Post',
    selectConstituency: 'Tag a constituency',
  },

  // ── Dashboard ───────────────────────────────────────────────
  dashboard: {
    title: 'Civic Dashboard',
    tabs: {
      issues: 'Issues',
      sentiment: 'Sentiment',
      headlines: 'Headlines',
    },
    reportIssue: 'Report Issue',
    statusFilters: {
      all: 'All',
      open: 'Open',
      acknowledged: 'Ack',
      inProgress: 'In Progress',
      resolved: 'Resolved',
    },
    categories: 'Categories',
    noIssues: 'No issues found',
    upvote: 'Upvote',
    upvotes: 'upvotes',
    sentimentScore: 'Sentiment Score',
    positive: 'Positive',
    negative: 'Negative',
    neutral: 'Neutral',
    analytics: 'Analytics',
    aiSummary: 'AI Summary',
  },

  // ── Report Issue ────────────────────────────────────────────
  reportIssue: {
    title: 'Report Civic Issue',
    issueTitle: 'Title',
    description: 'Description',
    category: 'Category',
    severity: 'Severity',
    location: 'Location',
    submit: 'Submit Report',
    categories: {
      infrastructure: 'Infrastructure',
      water: 'Water Supply',
      electricity: 'Electricity',
      sanitation: 'Sanitation',
      education: 'Education',
      healthcare: 'Healthcare',
      transport: 'Transport',
      safety: 'Safety',
      corruption: 'Corruption',
      other: 'Other',
    },
    severityLevels: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
    },
  },

  // ── Profile ─────────────────────────────────────────────────
  profile: {
    title: 'Profile',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    editProfile: 'Edit Profile',
    notifications: 'Notification Settings',
    favorites: 'Favorites',
    language: 'Language',
    about: 'About Kshetra',
    version: 'Version',
    settings: 'Settings',
    appearance: 'Appearance',
    darkMode: 'Dark Mode',
    pushNotifications: 'Push Notifications',
    signedInAs: 'Signed in as',
    guest: 'Guest',
    reputation: 'Reputation',
    posts: 'Posts',
    followers: 'Followers',
    following: 'Following',
  },

  // ── Edit Profile ────────────────────────────────────────────
  editProfile: {
    title: 'Edit Profile',
    displayName: 'Display Name',
    bio: 'Bio',
    bioPlaceholder: 'Tell us about yourself…',
    role: 'Role',
    interests: 'Interests',
    save: 'Save',
    nameRequired: 'Name Required',
    nameRequiredMsg: 'Please enter your display name.',
    roles: {
      citizen: 'Citizen',
      journalist: 'Journalist',
      activist: 'Activist',
      politician: 'Politician',
    },
    roleDescriptions: {
      citizen: 'Informed voter & community member',
      journalist: 'Media professional covering politics',
      activist: 'Social or political cause advocate',
      politician: 'Elected or aspiring public representative',
    },
  },

  // ── Notification Settings ───────────────────────────────────
  notificationSettings: {
    title: 'Notification Settings',
    masterToggle: 'Push Notifications',
    masterDesc: 'Receive alerts about activity in your constituencies',
    categories: {
      post_reply: 'Post Replies',
      post_replyDesc: 'When someone replies to your posts',
      issue_updates: 'Issue Updates',
      issue_updatesDesc: 'Status changes on issues you follow',
      constituency_alerts: 'Constituency Alerts',
      constituency_alertsDesc: 'News and alerts from your constituency',
      headlines: 'Breaking Headlines',
      headlinesDesc: 'Top political news and updates',
    },
  },

  // ── Onboarding ──────────────────────────────────────────────
  onboarding: {
    welcome: 'Welcome to Kshetra',
    welcomeSubtitle: "India's political intelligence platform",
    getStarted: 'Get Started',
    nameStep: "What's your name?",
    namePlaceholder: 'Enter your display name',
    roleStep: 'What best describes you?',
    constituencyStep: 'Select your constituency',
    constituencySearch: 'Search constituencies…',
    interestsStep: 'What topics interest you?',
    interestsSubtitle: 'Pick at least 2 topics',
    doneStep: "You're all set!",
    doneSubtitle: 'Your personalized political feed is ready',
    finish: 'Enter Kshetra',
    skip: 'Skip',
    interests: {
      elections: 'Elections',
      governance: 'Governance',
      infrastructure: 'Infrastructure',
      education: 'Education',
      healthcare: 'Healthcare',
      economy: 'Economy',
      law: 'Law & Order',
      environment: 'Environment',
      technology: 'Technology',
      agriculture: 'Agriculture',
      womensRights: "Women's Rights",
      youthPolitics: 'Youth Politics',
    },
  },

  // ── AI Chat ─────────────────────────────────────────────────
  ai: {
    chatTitle: 'AI Assistant',
    placeholder: 'Ask about any constituency…',
    thinking: 'Thinking…',
    error: 'AI could not respond. Try again.',
    suggestions: 'Suggested Questions',
    contextPicker: 'Select Constituency Context',
    smartSearch: 'AI Smart Search',
    summary: 'AI Summary',
    analyze: 'Analyze',
  },

  // ── State Switcher ──────────────────────────────────────────
  stateSwitcher: {
    selectState: 'Select State',
    constituencies: 'constituencies',
    full: 'Full',
    comingSoon: 'Coming Soon',
  },

  // ── Report / Moderation ─────────────────────────────────────
  moderation: {
    reportContent: 'Report Content',
    reportReason: 'Reason for report',
    reasons: {
      spam: 'Spam',
      harassment: 'Harassment',
      misinformation: 'Misinformation',
      hateSpeech: 'Hate Speech',
      violence: 'Violence',
      inappropriate: 'Inappropriate Content',
      other: 'Other',
    },
    submit: 'Submit Report',
    thankYou: 'Thank you for reporting',
  },

  // ── Verification ────────────────────────────────────────────
  verification: {
    verified: 'Verified',
    citizen: 'Citizen',
    journalist: 'Journalist',
    activist: 'Activist',
    politician: 'Politician',
    moderator: 'Moderator',
    admin: 'Admin',
  },

  // ── Parties ─────────────────────────────────────────────────
  parties: {
    BJP: 'BJP',
    INC: 'Congress',
    BRS: 'BRS',
    TDP: 'TDP',
    AIMIM: 'AIMIM',
    YSRCP: 'YSRCP',
    JSP: 'JSP',
    JDS: 'JD(S)',
    IND: 'Independent',
    OTH: 'Other',
  },

  // ── Language ────────────────────────────────────────────────
  language: {
    title: 'Language',
    subtitle: 'Choose your preferred language',
    en: 'English',
    te: 'తెలుగు',
    hi: 'हिन्दी',
    kn: 'ಕನ್ನಡ',
    systemDefault: 'System Default',
    changeConfirm: 'Change language to {{language}}?',
  },
};

export default en;
export type TranslationKeys = typeof en;
