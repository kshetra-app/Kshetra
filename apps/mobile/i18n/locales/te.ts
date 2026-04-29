/**
 * Telugu (te) — తెలుగు
 *
 * Native-quality Telugu translations for Kshetra.
 * Every string must feel natural to a Telugu speaker — not machine-translated.
 * Political terminology uses standard Telugu media conventions.
 */
import type { TranslationKeys } from './en';

const te: TranslationKeys = {
  // ── Common ──────────────────────────────────────────────────
  common: {
    appName: 'క్షేత్ర',
    loading: 'లోడ్ అవుతోంది…',
    error: 'ఏదో తప్పు జరిగింది',
    retry: 'మళ్ళీ ప్రయత్నించండి',
    cancel: 'రద్దు చేయండి',
    save: 'సేవ్ చేయండి',
    done: 'పూర్తయింది',
    next: 'తదుపరి',
    back: 'వెనుకకు',
    search: 'వెతకండి',
    close: 'మూసివేయండి',
    delete: 'తొలగించండి',
    edit: 'మార్చండి',
    share: 'షేర్ చేయండి',
    report: 'ఫిర్యాదు',
    ok: 'సరే',
    yes: 'అవును',
    no: 'కాదు',
    all: 'అన్నీ',
    none: 'ఏదీ లేదు',
    seeAll: 'అన్నీ చూడండి',
    comingSoon: 'త్వరలో వస్తుంది',
    noResults: 'ఫలితాలు లేవు',
    pullToRefresh: 'రిఫ్రెష్ చేయడానికి లాగండి',
  },

  // ── Tab Bar ─────────────────────────────────────────────────
  tabs: {
    map: 'మ్యాప్',
    explore: 'అన్వేషించు',
    feed: 'ఫీడ్',
    dashboard: 'డాష్‌బోర్డ్',
    profile: 'ప్రొఫైల్',
  },

  // ── Map Screen ──────────────────────────────────────────────
  map: {
    title: 'క్షేత్ర',
    searchPlaceholder: 'నియోజకవర్గాలను వెతకండి…',
    tapToExplore: 'నియోజకవర్గాన్ని నొక్కి చూడండి',
    locateMe: 'నా లొకేషన్',
    colorModes: {
      party: 'పార్టీ',
      margin: 'మార్జిన్',
      reservation: 'రకం',
      population: 'జనాభా',
      literacy: 'అక్షరాస్యత',
      turnout: 'ఓటింగ్ శాతం',
    },
    compare: 'పోల్చండి',
    setAsHome: 'నా నియోజకవర్గంగా సెట్ చేయండి',
    removeHome: 'నా నియోజకవర్గం నుండి తొలగించండి',
    myConstituency: 'నా నియోజకవర్గం',
    didYouKnow: 'మీకు తెలుసా?',
    legend: 'సూచిక',
  },

  // ── Explore Screen ──────────────────────────────────────────
  explore: {
    title: 'అన్వేషించు',
    searchPlaceholder: 'పేరు, ఎమ్మెల్యే, పార్టీ, జిల్లా ద్వారా వెతకండి…',
    sortBy: 'క్రమం',
    sort: {
      acNo: 'AC #',
      name: 'అ–ఱ',
      marginAsc: 'తక్కువ తేడా',
      marginDesc: 'ఎక్కువ తేడా',
    },
    filters: 'ఫిల్టర్లు',
    party: 'పార్టీ',
    district: 'జిల్లా',
    type: 'రకం',
    clearFilters: 'ఫిల్టర్లు తీసివేయండి',
    favoritesOnly: 'ఇష్టమైనవి మాత్రమే',
    aiSearch: 'AI వెతుకు',
    constituencies: 'నియోజకవర్గాలు',
    margin: 'తేడా',
    seat: 'సీటు',
    gen: 'జనరల్',
    sc: 'ఎస్సీ',
    st: 'ఎస్టీ',
  },

  // ── Constituency Detail ─────────────────────────────────────
  constituency: {
    overview: 'సమగ్ర వివరాలు',
    currentMLA: 'ప్రస్తుత ఎమ్మెల్యే',
    electedAs: 'ఎన్నికైన పార్టీ',
    defectedTo: 'ఫిరాయించిన పార్టీ',
    district: 'జిల్లా',
    type: 'రకం',
    acNumber: 'AC నంబర్',
    election2023: '2023 ఎన్నికలు',
    winner: 'విజేత',
    runnerUp: 'రన్నరప్',
    margin: 'తేడా',
    votes: 'ఓట్లు',
    voteShare: 'ఓటు శాతం',
    demographics: 'జనాభా వివరాలు',
    population: 'జనాభా',
    literacy: 'అక్షరాస్యత శాతం',
    urbanRural: 'పట్టణ / గ్రామీణ',
    genderRatio: 'లింగ నిష్పత్తి',
    scPct: 'ఎస్సీ %',
    stPct: 'ఎస్టీ %',
    history: 'చరిత్ర',
    electionHistory: 'ఎన్నికల చరిత్ర',
    noHistory: 'చరిత్ర సమాచారం అందుబాటులో లేదు',
    trivia: 'మీకు తెలుసా?',
    aiAnalysis: 'AI విశ్లేషణ',
    generateAnalysis: 'AI విశ్లేషణ చేయించండి',
    analyzing: 'విశ్లేషిస్తోంది…',
  },

  // ── Feed Screen ─────────────────────────────────────────────
  feed: {
    title: 'సామాజిక ఫీడ్',
    compose: 'పోస్ట్',
    filters: {
      all: 'అన్నీ',
      discussion: 'చర్చ',
      news: 'వార్తలు',
      question: 'ప్రశ్నలు',
      poll: 'పోల్స్',
      opinion: 'అభిప్రాయం',
      alert: 'హెచ్చరిక',
    },
    emptyFeed: 'ఇంకా పోస్ట్‌లు లేవు. మొదటివారు కండి!',
    trending: 'ట్రెండింగ్',
    share: 'ఈ పోస్ట్‌ను షేర్ చేయండి',
    react: 'రియాక్ట్',
    reply: 'జవాబు',
    replies: 'జవాబులు',
    writeReply: 'జవాబు రాయండి…',
  },

  // ── Compose ─────────────────────────────────────────────────
  compose: {
    title: 'కొత్త పోస్ట్',
    placeholder: 'మీ ఆలోచనలు ఏమిటి?',
    postType: 'పోస్ట్ రకం',
    addHashtags: 'హ్యాష్‌ట్యాగ్‌లు జోడించండి',
    submit: 'పోస్ట్ చేయండి',
    selectConstituency: 'నియోజకవర్గాన్ని ట్యాగ్ చేయండి',
  },

  // ── Dashboard ───────────────────────────────────────────────
  dashboard: {
    title: 'పౌర డాష్‌బోర్డ్',
    tabs: {
      issues: 'సమస్యలు',
      sentiment: 'సెంటిమెంట్',
      headlines: 'శీర్షికలు',
    },
    reportIssue: 'సమస్య నివేదించండి',
    statusFilters: {
      all: 'అన్నీ',
      open: 'ఓపెన్',
      acknowledged: 'స్వీకరించబడింది',
      inProgress: 'పురోగతిలో',
      resolved: 'పరిష్కరించబడింది',
    },
    categories: 'వర్గాలు',
    noIssues: 'సమస్యలు లేవు',
    upvote: 'అప్‌వోట్',
    upvotes: 'అప్‌వోట్లు',
    sentimentScore: 'సెంటిమెంట్ స్కోర్',
    positive: 'సానుకూల',
    negative: 'ప్రతికూల',
    neutral: 'తటస్థ',
    analytics: 'విశ్లేషణలు',
    aiSummary: 'AI సారాంశం',
  },

  // ── Report Issue ────────────────────────────────────────────
  reportIssue: {
    title: 'పౌర సమస్య నివేదించండి',
    issueTitle: 'శీర్షిక',
    description: 'వివరణ',
    category: 'వర్గం',
    severity: 'తీవ్రత',
    location: 'ప్రదేశం',
    submit: 'నివేదిక సమర్పించండి',
    categories: {
      infrastructure: 'మౌలిక సదుపాయాలు',
      water: 'నీటి సరఫరా',
      electricity: 'విద్యుత్',
      sanitation: 'పారిశుద్ధ్యం',
      education: 'విద్య',
      healthcare: 'ఆరోగ్యం',
      transport: 'రవాణా',
      safety: 'భద్రత',
      corruption: 'అవినీతి',
      other: 'ఇతరం',
    },
    severityLevels: {
      low: 'తక్కువ',
      medium: 'మధ్యస్థం',
      high: 'ఎక్కువ',
      critical: 'అత్యవసరం',
    },
  },

  // ── Profile ─────────────────────────────────────────────────
  profile: {
    title: 'ప్రొఫైల్',
    signIn: 'సైన్ ఇన్',
    signOut: 'సైన్ అవుట్',
    editProfile: 'ప్రొఫైల్ మార్చండి',
    notifications: 'నోటిఫికేషన్ సెట్టింగ్‌లు',
    favorites: 'ఇష్టమైనవి',
    language: 'భాష',
    about: 'క్షేత్ర గురించి',
    version: 'వెర్షన్',
    settings: 'సెట్టింగ్‌లు',
    appearance: 'రూపం',
    darkMode: 'డార్క్ మోడ్',
    pushNotifications: 'పుష్ నోటిఫికేషన్లు',
    signedInAs: 'లాగిన్ అయినది',
    guest: 'అతిథి',
    reputation: 'ఖ్యాతి',
    posts: 'పోస్ట్‌లు',
    followers: 'ఫాలోవర్లు',
    following: 'ఫాలో అవుతున్నవి',
  },

  // ── Edit Profile ────────────────────────────────────────────
  editProfile: {
    title: 'ప్రొఫైల్ మార్చండి',
    displayName: 'ప్రదర్శన పేరు',
    bio: 'బయో',
    bioPlaceholder: 'మీ గురించి చెప్పండి…',
    role: 'పాత్ర',
    interests: 'ఆసక్తులు',
    save: 'సేవ్ చేయండి',
    nameRequired: 'పేరు అవసరం',
    nameRequiredMsg: 'దయచేసి మీ ప్రదర్శన పేరును నమోదు చేయండి.',
    roles: {
      citizen: 'పౌరుడు',
      journalist: 'జర్నలిస్ట్',
      activist: 'కార్యకర్త',
      politician: 'రాజకీయ నాయకుడు',
    },
    roleDescriptions: {
      citizen: 'చైతన్యవంతమైన ఓటరు & సమాజ సభ్యుడు',
      journalist: 'రాజకీయాలను కవర్ చేసే మీడియా వృత్తి నిపుణుడు',
      activist: 'సామాజిక లేదా రాజకీయ ఉద్యమకర్త',
      politician: 'ఎన్నికైన లేదా ఔత్సాహిక ప్రజా ప్రతినిధి',
    },
  },

  // ── Notification Settings ───────────────────────────────────
  notificationSettings: {
    title: 'నోటిఫికేషన్ సెట్టింగ్‌లు',
    masterToggle: 'పుష్ నోటిఫికేషన్లు',
    masterDesc: 'మీ నియోజకవర్గంలోని కార్యకలాపాల గురించి అలర్ట్‌లు పొందండి',
    categories: {
      post_reply: 'పోస్ట్ జవాబులు',
      post_replyDesc: 'ఎవరైనా మీ పోస్ట్‌లకు జవాబు ఇచ్చినప్పుడు',
      issue_updates: 'సమస్య నవీకరణలు',
      issue_updatesDesc: 'మీరు ఫాలో చేస్తున్న సమస్యల స్థితి మార్పులు',
      constituency_alerts: 'నియోజకవర్గ హెచ్చరికలు',
      constituency_alertsDesc: 'మీ నియోజకవర్గం నుండి వార్తలు మరియు హెచ్చరికలు',
      headlines: 'బ్రేకింగ్ వార్తలు',
      headlinesDesc: 'ముఖ్యమైన రాజకీయ వార్తలు మరియు నవీకరణలు',
    },
  },

  // ── Onboarding ──────────────────────────────────────────────
  onboarding: {
    welcome: 'క్షేత్రకు స్వాగతం',
    welcomeSubtitle: 'భారతదేశ రాజకీయ మేధస్సు వేదిక',
    getStarted: 'ప్రారంభిద్దాం',
    nameStep: 'మీ పేరు ఏమిటి?',
    namePlaceholder: 'మీ ప్రదర్శన పేరు నమోదు చేయండి',
    roleStep: 'మిమ్మల్ని ఏది బాగా వర్ణిస్తుంది?',
    constituencyStep: 'మీ నియోజకవర్గాన్ని ఎంచుకోండి',
    constituencySearch: 'నియోజకవర్గాలను వెతకండి…',
    interestsStep: 'మీకు ఏ అంశాలు ఆసక్తికరంగా ఉన్నాయి?',
    interestsSubtitle: 'కనీసం 2 అంశాలను ఎంచుకోండి',
    doneStep: 'అంతా సిద్ధం!',
    doneSubtitle: 'మీ వ్యక్తిగత రాజకీయ ఫీడ్ సిద్ధంగా ఉంది',
    finish: 'క్షేత్రలో ప్రవేశించండి',
    skip: 'వదిలేయండి',
    interests: {
      elections: 'ఎన్నికలు',
      governance: 'పాలన',
      infrastructure: 'మౌలిక సదుపాయాలు',
      education: 'విద్య',
      healthcare: 'ఆరోగ్యం',
      economy: 'ఆర్థిక వ్యవస్థ',
      law: 'శాంతి భద్రతలు',
      environment: 'పర్యావరణం',
      technology: 'సాంకేతికత',
      agriculture: 'వ్యవసాయం',
      womensRights: 'మహిళా హక్కులు',
      youthPolitics: 'యువ రాజకీయాలు',
    },
  },

  // ── AI Chat ─────────────────────────────────────────────────
  ai: {
    chatTitle: 'AI సహాయకుడు',
    placeholder: 'ఏదైనా నియోజకవర్గం గురించి అడగండి…',
    thinking: 'ఆలోచిస్తోంది…',
    error: 'AI స్పందించలేకపోయింది. మళ్ళీ ప్రయత్నించండి.',
    suggestions: 'సూచించిన ప్రశ్నలు',
    contextPicker: 'నియోజకవర్గ సందర్భాన్ని ఎంచుకోండి',
    smartSearch: 'AI స్మార్ట్ సెర్చ్',
    summary: 'AI సారాంశం',
    analyze: 'విశ్లేషించండి',
  },

  // ── State Switcher ──────────────────────────────────────────
  stateSwitcher: {
    selectState: 'రాష్ట్రాన్ని ఎంచుకోండి',
    constituencies: 'నియోజకవర్గాలు',
    full: 'పూర్తి',
    comingSoon: 'త్వరలో వస్తుంది',
  },

  // ── Report / Moderation ─────────────────────────────────────
  moderation: {
    reportContent: 'కంటెంట్‌ను రిపోర్ట్ చేయండి',
    reportReason: 'రిపోర్ట్ కారణం',
    reasons: {
      spam: 'స్పామ్',
      harassment: 'వేధింపు',
      misinformation: 'తప్పుడు సమాచారం',
      hateSpeech: 'ద్వేష పూరిత ప్రసంగం',
      violence: 'హింస',
      inappropriate: 'అనుచితమైన కంటెంట్',
      other: 'ఇతరం',
    },
    submit: 'రిపోర్ట్ సమర్పించండి',
    thankYou: 'రిపోర్ట్ చేసినందుకు ధన్యవాదాలు',
  },

  // ── Verification ────────────────────────────────────────────
  verification: {
    verified: 'ధృవీకరించబడింది',
    citizen: 'పౌరుడు',
    journalist: 'జర్నలిస్ట్',
    activist: 'కార్యకర్త',
    politician: 'రాజకీయ నాయకుడు',
    moderator: 'మోడరేటర్',
    admin: 'అడ్మిన్',
  },

  // ── Parties ─────────────────────────────────────────────────
  parties: {
    BJP: 'బీజేపీ',
    INC: 'కాంగ్రెస్',
    BRS: 'బీఆర్ఎస్',
    TDP: 'టీడీపీ',
    AIMIM: 'ఎఐఎంఐఎం',
    YSRCP: 'వైఎస్ఆర్‌సీపీ',
    JSP: 'జనసేన',
    JDS: 'జేడీఎస్',
    IND: 'స్వతంత్ర',
    OTH: 'ఇతరం',
  },

  // ── Language ────────────────────────────────────────────────
  language: {
    title: 'భాష',
    subtitle: 'మీకు ఇష్టమైన భాషను ఎంచుకోండి',
    en: 'English',
    te: 'తెలుగు',
    hi: 'हिन्दी',
    kn: 'ಕನ್ನಡ',
    systemDefault: 'సిస్టమ్ డిఫాల్ట్',
    changeConfirm: 'భాషను {{language}}కు మార్చాలా?',
  },
};

export default te;
