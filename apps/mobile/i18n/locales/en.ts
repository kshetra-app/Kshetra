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
      data: 'Data',
    },
    compare: 'Compare',
    setAsHome: 'Set as My Constituency',
    removeHome: 'Remove as My Constituency',
    myConstituency: 'My Constituency',
    didYouKnow: 'Did You Know?',
    legend: 'Legend',
  },

  // ── Map Legend ─────────────────────────────────────────────
  mapLegend: {
    legend: 'Legend',
    partyColors: 'Party Colors',
    victoryMargin: 'Victory Margin',
    constituencyType: 'Constituency Type',
    populationDensity: 'Population Density',
    literacyRate: 'Literacy Rate',
    voterTurnout: 'Voter Turnout',
    low: 'Low',
    high: 'High',
    razorThin: 'razor thin',
    selected: 'Selected',
    favourite: 'Favourite',
    gen: 'General (GEN)',
    sc: 'Scheduled Caste (SC)',
    st: 'Scheduled Tribe (ST)',
  },

  // ── Map Search ────────────────────────────────────────────
  mapSearch: {
    placeholder: 'Search constituency, MLA, district...',
    cancel: 'Cancel',
    noResults: 'No constituencies found',
  },

  // ── Map Bottom Sheet ───────────────────────────────────────
  mapSheet: {
    winner2023: '2023 Winner',
    winnerVotes: 'Winner Votes',
    margin: 'Margin',
    runnerUp: 'Runner-up',
    viewFullProfile: 'View Full Profile',
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
    noResultsHint: 'Try adjusting your search or filters',
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
    electionResult: '2023 Election Result',
    currentMlaSection: 'Current MLA',
    districtLabel: 'District',
    notFound: 'Not Found',
    notFoundMsg: 'Constituency #{{id}} not found',
    myHome: 'My Home Constituency',
    setAsHome: 'Set as My Constituency',
    constituencyHistory: 'Constituency History',
    stronghold: 'Stronghold',
    swingSeat: 'Swing Seat',
    current: 'Current',
    assemblyOverview: 'Telangana Assembly Overview',
    turnout: 'Turnout',
    voters: 'voters',
    demographicsSection: 'Demographics',
    populationLabel: 'Population',
    literacyLabel: 'Literacy',
    urbanLabel: 'Urban',
    areaSqKm: 'km²',
    voterProfile: 'Voter Profile (2023)',
    totalVoters: 'Total Voters',
    turnoutLabel: 'Turnout',
    male: 'Male',
    female: 'Female',
    socialComposition: 'Social Composition',
    demoDisclaimer: 'Source: Census 2011 · ECI 2023 voter rolls',
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
    trendingIn: 'Trending in {{state}}',
    share: 'Share this post',
    react: 'React',
    reply: 'Reply',
    replies: 'replies',
    writeReply: 'Write a reply…',
  },

  // ── Post Card ──────────────────────────────────────────────
  postCard: {
    pinned: 'Pinned',
    justNow: 'just now',
    discussion: 'Discussion',
    news: 'News',
    opinion: 'Opinion',
    question: 'Question',
    alert: 'Alert',
    poll: 'Poll',
  },

  // ── Poll Card ─────────────────────────────────────────────
  pollCard: {
    votes: 'votes',
    vote: 'vote',
    closed: 'Closed',
    ends: 'Ends',
  },

  // ── Compose ─────────────────────────────────────────────────
  compose: {
    title: 'New Post',
    replyTo: 'Reply to {{name}}',
    placeholder: "What's on your mind?",
    pollPlaceholder: 'Write your poll question…',
    replyPlaceholder: 'Write your reply…',
    constituencyPlaceholder: "What's happening in your constituency?",
    postType: 'Post Type',
    addHashtags: 'Add hashtags',
    submit: 'Post',
    postingIn: 'Posting in {{name}}',
    pollOptions: 'Poll Options',
    addOption: 'Add option',
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

  // ── MLA Card ───────────────────────────────────────────────
  mla: {
    age: 'Age',
    male: 'Male',
    female: 'Female',
    terms: 'Terms',
    education: 'Education',
    assets: 'Assets',
    cases: 'Cases',
    term_1: '1st term',
    term_2: '2nd term',
    term_3: '3rd term',
    term_n: '{{n}}th term',
  },

  // ── Defection Badge ────────────────────────────────────────
  defection: {
    title: 'Post-Election Defection',
    elected: 'Elected',
    current: 'Current',
    note: 'This MLA switched parties after the 2023 election. Anti-defection proceedings may be pending.',
  },

  // ── Content: Seed data translations ────────────────────────
  content: {
    issueCategories: {
      roads: 'Roads',
      water: 'Water',
      electricity: 'Electricity',
      sanitation: 'Sanitation',
      healthcare: 'Healthcare',
      education: 'Education',
      public_safety: 'Safety',
      transport: 'Transport',
      housing: 'Housing',
      environment: 'Environment',
      corruption: 'Corruption',
      other: 'Other',
    },
    issueSeverity: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
    },
    issueStatus: {
      open: 'Open',
      acknowledged: 'Acknowledged',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
    },
    headlineCategories: {
      politics: 'Politics',
      governance: 'Governance',
      development: 'Development',
      law_and_order: 'Law & Order',
      economy: 'Economy',
      education: 'Education',
      health: 'Health',
      environment: 'Environment',
      opinion: 'Opinion',
    },
    sentimentLabels: {
      positive: 'positive',
      negative: 'negative',
      neutral: 'neutral',
      posts: 'posts',
      moodIndex: 'Constituency Mood Index',
    },
    issues: {
      'issue-1': {
        title: 'ORR service road construction stalled for 3 months',
        description: 'The road widening work near Gachibowli junction has been abandoned mid-construction. Barricades left on road causing daily traffic jams during peak hours. Multiple complaints to GHMC and NHAI with no response.',
      },
      'issue-2': {
        title: 'Irregular water supply in Old City areas',
        description: 'Water tankers not arriving on schedule. HMWSSB helpline busy. Residents in Falaknuma, Shalibanda, Yakutpura affected. Some areas getting water once in 3 days.',
      },
      'issue-3': {
        title: 'Frequent power cuts in Attapur area',
        description: 'Daily power cuts of 2-3 hours during evening peak. Transformer at colony entrance has been faulty for weeks. TSSPDCL complaint number given but no action taken.',
      },
      'issue-4': {
        title: 'PHC in Kompally running without doctor for 2 weeks',
        description: 'Primary Health Centre in Kompally has had no doctor for 14 days. Patients being turned away. Nearest alternative is 8km away in Secunderabad. Critical for elderly and pregnant women.',
      },
      'issue-5': {
        title: 'Open drainage near Vinayak Nagar school',
        description: 'Uncovered drain running alongside the school wall. Children exposed to contaminated water. Mosquito breeding ground. Municipality notified thrice.',
      },
      'issue-6': {
        title: 'Bus service to Shamshabad reduced without notice',
        description: 'TSRTC cut 4 bus routes connecting Maheshwaram to Shamshabad airport. Commuters stranded, forced to use expensive autos. No alternative public transport.',
      },
      'issue-7': {
        title: 'Government school building roof leaking since monsoon',
        description: 'ZP High School main building roof has multiple leaks. Students sitting in wet classrooms. One classroom declared unsafe. Renovation funds sanctioned but work not started.',
      },
      'issue-8': {
        title: 'Streetlights not working on MJ Market to Abids stretch',
        description: 'Multiple streetlights out between MJ Market and Abids road. Dark stretch at night creating safety concerns especially for women. Reported to GHMC but no repair.',
      },
    },
    headlines: {
      'hl-1': {
        title: 'CM Revanth Reddy announces Rs 2,000 crore for urban road upgrades across Hyderabad',
        summary: 'Major road infrastructure push targeting 500km of roads in Greater Hyderabad. Focus on ORR service roads and colony internal roads.',
      },
      'hl-2': {
        title: 'BRS MLAs demand special assembly session on farm loan waiver implementation',
        summary: 'Opposition alleges Rs 31,000 crore promise yet to reach 70% of eligible farmers. Government says Phase 2 disbursement starting next month.',
      },
      'hl-3': {
        title: 'Old City water crisis: HMWSSB to deploy 50 additional tankers',
        summary: 'Emergency measure after widespread complaints. Summer heat and pipeline work causing supply disruption in Charminar, Yakutpura, Karwan constituencies.',
      },
      'hl-4': {
        title: 'Telangana achieves 95% household tap water coverage under Mission Bhagiratha',
        summary: 'State ranks among top 5 nationally. Remaining 5% in remote tribal mandals to be covered by June 2026.',
      },
      'hl-5': {
        title: 'Anti-Defection Law: Supreme Court to hear Telangana BRS petitions next week',
        summary: '10 BRS-to-INC defection cases pending. Court will examine Speaker\'s delayed disqualification proceedings.',
      },
      'hl-6': {
        title: 'TSRTC records highest revenue in April, but rural routes still loss-making',
        summary: 'Urban routes profitable but 40% of rural routes running at loss. Union demands route rationalization instead of cuts.',
      },
      'hl-7': {
        title: 'Telangana Inter Board results: Pass percentage rises to 68.4%',
        summary: 'Improvement of 3.2% over previous year. Medak district tops with 74% pass rate.',
      },
      'hl-8': {
        title: 'Musi riverfront cleanup: Phase 1 demolitions face legal challenge',
        summary: 'High Court issues notices on petitions challenging demolition of encroachments. Government argues pollution cleanup is priority.',
      },
    },
  },

  // ── Language ────────────────────────────────────────────────
  language: {
    title: 'Language',
    subtitle: 'Choose your preferred language',
    en: 'English',
    te: 'తెలుగు',
    hi: 'हिन्दी',
    kn: 'ಕನ್ನಡ',
    mr: 'मराठी',
    systemDefault: 'System Default',
    changeConfirm: 'Change language to {{language}}?',
  },
};

export default en;
export type TranslationKeys = typeof en;
