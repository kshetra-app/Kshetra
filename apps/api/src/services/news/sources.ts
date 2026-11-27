/**
 * Curated RSS source registry.
 *
 * Following what mainstream aggregators (Google News, SmartNews, Inshorts) do:
 * we pull from reputable outlets' OFFICIAL RSS feeds and only ever store the
 * headline, summary, thumbnail, publisher and a canonical link back. No article
 * bodies or media are re-hosted.
 */
export type NewsLanguageCode = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu';
export type NewsCategory =
  'top' | 'politics' | 'elections' | 'economy' | 'governance' | 'regional' | 'video';
export type NewsScope = 'national' | 'state' | 'constituency';

export interface FeedSource {
  sourceId: string;
  sourceName: string;
  domain: string;
  accent?: string;
  verified?: boolean;
  language: NewsLanguageCode;
  category: NewsCategory;
  scope: NewsScope;
  stateCode?: string;
  rssUrl: string;
  articlePath?: RegExp;
  articleTags?: RegExp;
}

export const FEED_SOURCES: FeedSource[] = [
  {
    sourceId: 'namasthe-telangana',
    sourceName: 'Namasthe Telangana',
    domain: 'ntnews.com',
    language: 'te',
    category: 'regional',
    scope: 'state',
    stateCode: 'TS',
    verified: true,
    rssUrl: 'https://www.ntnews.com/telangana/feed',
  },
  {
    sourceId: 'tv9-telugu',
    sourceName: 'TV9 Telugu',
    domain: 'tv9telugu.com',
    language: 'te',
    category: 'regional',
    scope: 'state',
    stateCode: 'TS',
    verified: true,
    rssUrl: 'https://tv9telugu.com/telangana/feed',
  },
  {
    sourceId: 'tv9-telugu',
    sourceName: 'TV9 Telugu',
    domain: 'tv9telugu.com',
    language: 'te',
    category: 'regional',
    scope: 'state',
    stateCode: 'AP',
    verified: true,
    rssUrl: 'https://tv9telugu.com/andhra-pradesh/feed',
  },
  {
    sourceId: 'tv9-telugu',
    sourceName: 'TV9 Telugu',
    domain: 'tv9telugu.com',
    language: 'te',
    category: 'top',
    scope: 'national',
    verified: true,
    rssUrl: 'https://tv9telugu.com/national/feed',
  },
  {
    sourceId: 'tv9-telugu',
    sourceName: 'TV9 Telugu',
    domain: 'tv9telugu.com',
    language: 'te',
    category: 'politics',
    scope: 'national',
    verified: true,
    rssUrl: 'https://tv9telugu.com/videos/political-videos/feed',
  },
  // ── The Hindu ──
  {
    sourceId: 'the-hindu',
    sourceName: 'The Hindu',
    domain: 'thehindu.com',
    accent: '#C8102E',
    verified: true,
    language: 'en',
    category: 'top',
    scope: 'national',
    rssUrl: 'https://www.thehindu.com/news/national/feeder/default.rss',
  },
  {
    sourceId: 'the-hindu',
    sourceName: 'The Hindu',
    domain: 'thehindu.com',
    accent: '#C8102E',
    verified: true,
    language: 'en',
    category: 'economy',
    scope: 'national',
    rssUrl: 'https://www.thehindu.com/business/Economy/feeder/default.rss',
  },
  {
    sourceId: 'the-hindu-ts',
    sourceName: 'The Hindu',
    domain: 'thehindu.com',
    accent: '#C8102E',
    verified: true,
    language: 'en',
    category: 'regional',
    scope: 'state',
    stateCode: 'TS',
    rssUrl: 'https://www.thehindu.com/news/national/telangana/feeder/default.rss',
  },
  {
    sourceId: 'the-hindu-ap',
    sourceName: 'The Hindu',
    domain: 'thehindu.com',
    accent: '#C8102E',
    verified: true,
    language: 'en',
    category: 'regional',
    scope: 'state',
    stateCode: 'AP',
    rssUrl: 'https://www.thehindu.com/news/national/andhra-pradesh/feeder/default.rss',
  },
  {
    sourceId: 'the-hindu-tn',
    sourceName: 'The Hindu',
    domain: 'thehindu.com',
    accent: '#C8102E',
    verified: true,
    language: 'en',
    category: 'regional',
    scope: 'state',
    stateCode: 'TN',
    rssUrl: 'https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss',
  },
  {
    sourceId: 'the-hindu-ka',
    sourceName: 'The Hindu',
    domain: 'thehindu.com',
    accent: '#C8102E',
    verified: true,
    language: 'en',
    category: 'regional',
    scope: 'state',
    stateCode: 'KA',
    rssUrl: 'https://www.thehindu.com/news/national/karnataka/feeder/default.rss',
  },
  {
    sourceId: 'the-hindu-kl',
    sourceName: 'The Hindu',
    domain: 'thehindu.com',
    accent: '#C8102E',
    verified: true,
    language: 'en',
    category: 'regional',
    scope: 'state',
    stateCode: 'KL',
    rssUrl: 'https://www.thehindu.com/news/national/kerala/feeder/default.rss',
  },

  // ── The Indian Express ──
  {
    sourceId: 'indian-express',
    sourceName: 'The Indian Express',
    domain: 'indianexpress.com',
    accent: '#1A1A1A',
    verified: true,
    language: 'en',
    category: 'top',
    scope: 'national',
    rssUrl: 'https://indianexpress.com/section/india/feed/',
  },
  {
    sourceId: 'indian-express',
    sourceName: 'The Indian Express',
    domain: 'indianexpress.com',
    accent: '#1A1A1A',
    verified: true,
    language: 'en',
    category: 'politics',
    scope: 'national',
    rssUrl: 'https://indianexpress.com/section/political-pulse/feed/',
  },
  {
    sourceId: 'indian-express',
    sourceName: 'The Indian Express',
    domain: 'indianexpress.com',
    accent: '#1A1A1A',
    verified: true,
    language: 'en',
    category: 'elections',
    scope: 'national',
    rssUrl: 'https://indianexpress.com/section/elections/feed/',
    articlePath: /^\/(?:article\/)?elections\//,
  },

  // ── NDTV ──
  {
    sourceId: 'ndtv',
    sourceName: 'NDTV',
    domain: 'ndtv.com',
    accent: '#E4002B',
    verified: true,
    language: 'en',
    category: 'top',
    scope: 'national',
    rssUrl: 'https://feeds.feedburner.com/ndtvnews-india-news',
  },

  // ── Times of India ──
  {
    sourceId: 'toi',
    sourceName: 'Times of India',
    domain: 'timesofindia.indiatimes.com',
    accent: '#EA1D25',
    verified: true,
    language: 'en',
    category: 'top',
    scope: 'national',
    rssUrl: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
  },

  // ── Hindi (Hindustan / Aaj Tak / News18) ──
  {
    sourceId: 'aaj-tak',
    sourceName: 'Aaj Tak',
    domain: 'aajtak.in',
    accent: '#E30613',
    verified: true,
    language: 'hi',
    category: 'top',
    scope: 'national',
    rssUrl: 'https://www.aajtak.in/rssfeeds/?id=home',
  },
  {
    sourceId: 'news18-hindi',
    sourceName: 'News18 Hindi',
    domain: 'hindi.news18.com',
    accent: '#0A66C2',
    verified: true,
    language: 'hi',
    category: 'politics',
    scope: 'national',
    rssUrl: 'https://hindi.news18.com/rss/khabar/nation/nation.xml',
  },

  // ── Regional-language nationals ──
  {
    sourceId: 'the-hindu-tamil',
    sourceName: 'The Hindu Tamil',
    domain: 'hindutamil.in',
    accent: '#C8102E',
    verified: true,
    language: 'ta',
    category: 'top',
    scope: 'state',
    stateCode: 'TN',
    rssUrl: 'https://www.hindutamil.in/rss/latest.xml',
  },
];

const hinduStateSections = {
  AR: 'arunachal-pradesh',
  AS: 'assam',
  BR: 'bihar',
  CG: 'chhattisgarh',
  GA: 'goa',
  GJ: 'gujarat',
  HR: 'haryana',
  HP: 'himachal-pradesh',
  JH: 'jharkhand',
  MP: 'madhya-pradesh',
  MH: 'maharashtra',
  MN: 'manipur',
  ML: 'meghalaya',
  MZ: 'mizoram',
  NL: 'nagaland',
  OD: 'odisha',
  PB: 'punjab',
  RJ: 'rajasthan',
  SK: 'sikkim',
  TR: 'tripura',
  UP: 'uttar-pradesh',
  UK: 'uttarakhand',
  WB: 'west-bengal',
  JK: 'jammu-and-kashmir',
  LA: 'ladakh',
  AN: 'andaman-and-nicobar-islands',
  CH: 'chandigarh',
  LD: 'lakshadweep',
};

for (const [stateCode, section] of [
  ...Object.entries(hinduStateSections).map(([code, slug]) => [code, `national/${slug}`]),
  ['DL', 'cities/Delhi'],
  ['PY', 'cities/puducherry'],
]) {
  FEED_SOURCES.push({
    sourceId: 'the-hindu',
    sourceName: 'The Hindu',
    domain: 'thehindu.com',
    language: 'en',
    category: 'regional',
    scope: 'state',
    stateCode,
    rssUrl: `https://www.thehindu.com/news/${section}/feeder/default.rss`,
  });
}

const eastMojoSections = {
  AR: 'arunachal-pradesh',
  AS: 'assam',
  MN: 'manipur',
  ML: 'meghalaya',
  MZ: 'mizoram',
  NL: 'nagaland',
  SK: 'sikkim',
  TR: 'tripura',
};
for (const [stateCode, section] of Object.entries(eastMojoSections)) {
  FEED_SOURCES.push({
    sourceId: 'eastmojo',
    sourceName: 'EastMojo',
    domain: 'eastmojo.com',
    language: 'en',
    category: 'regional',
    scope: 'state',
    stateCode,
    rssUrl: `https://eastmojo.com/${section}/feed/`,
  });
}

// Some feeds embed stories from outside their named section. Require a matching
// article section before using such feeds for geography.
const abpEditions: Array<{
  language: NewsLanguageCode;
  name: string;
  host: string;
  sections: Array<[string, string | undefined, string, NewsCategory?]>;
}> = [
  {
    language: 'hi',
    name: 'ABP News',
    host: 'www.abplive.com',
    sections: [
      ['news/india', undefined, 'news/india'],
      ['states/madhya-pradesh', 'MP', 'states/madhya-pradesh'],
      ...Object.entries({
        BR: 'bihar',
        CG: 'chhattisgarh',
        GJ: 'gujarat',
        HR: 'haryana',
        HP: 'himachal-pradesh',
        JH: 'jharkhand',
        MH: 'maharashtra',
        PB: 'punjab',
        RJ: 'rajasthan',
      }).map(([state, slug]): [string, string, string] => [
        `news/states/${slug}`,
        state,
        `states/${slug}`,
      ]),
    ],
  },
  {
    language: 'ta',
    name: 'ABP Nadu',
    host: 'tamil.abplive.com',
    sections: [
      ['news/tamil-nadu', 'TN', 'news/tamil-nadu'],
      ['news/politics', 'TN', 'news/politics', 'politics'],
      ['news/india', undefined, 'news/india'],
    ],
  },
  {
    language: 'mr',
    name: 'ABP Majha',
    host: 'marathi.abplive.com',
    sections: [
      ['news/maharashtra', 'MH', 'news/(?:maharashtra|mumbai|pune|nagpur|nashik|kolhapur)'],
      ['news/india', undefined, 'news/india'],
    ],
  },
  {
    language: 'bn',
    name: 'ABP Ananda',
    host: 'bengali.abplive.com',
    sections: [
      ['news/west-bengal', 'WB', '(?:news/(?:west-bengal|kolkata)|district)'],
      ['news/india', undefined, 'news/india'],
    ],
  },
  {
    language: 'gu',
    name: 'ABP Asmita',
    host: 'gujarati.abplive.com',
    sections: [
      ['news/gujarat', 'GJ', '(?:short-videos/)?news/gujarat'],
      ['news/india', undefined, 'news/india'],
    ],
  },
];

for (const { language, name, host, sections } of abpEditions) {
  for (const [path, stateCode, articlePath, category] of sections) {
    FEED_SOURCES.push({
      sourceId: `abp-${language}`,
      sourceName: name,
      domain: host,
      language,
      category: category ?? (stateCode ? 'regional' : 'top'),
      scope: stateCode ? 'state' : 'national',
      stateCode,
      rssUrl: `https://${host}/${path}/feed`,
      articlePath: new RegExp(`^/${articlePath}/`),
    });
  }
}

for (const [language, edition, stateCode, section] of [
  ['kn', 'Kannada', 'KA', 'karnataka'],
  ['ml', 'Malayalam', 'KL', 'kerala'],
] as const) {
  const domain = `${edition.toLowerCase()}.oneindia.com`;
  for (const scope of ['state', 'national'] as const) {
    FEED_SOURCES.push({
      sourceId: `oneindia-${language}`,
      sourceName: `Oneindia ${edition}`,
      domain,
      language,
      category: scope === 'state' ? 'regional' : 'top',
      scope,
      stateCode: scope === 'state' ? stateCode : undefined,
      rssUrl: `https://${domain}/rss/feeds/${edition.toLowerCase()}-news-fb.xml`,
      articlePath: new RegExp(`^/news/${scope === 'state' ? section : 'india'}/`),
    });
  }
}

FEED_SOURCES.push(
  {
    sourceId: 'tv9-kannada',
    sourceName: 'TV9 Kannada',
    domain: 'tv9kannada.com',
    language: 'kn',
    category: 'regional',
    scope: 'state',
    stateCode: 'KA',
    rssUrl: 'https://tv9kannada.com/karnataka/feed',
    articlePath: /^\/(?:karnataka|videos)\//,
    articleTags: /^ಕರ್ನಾಟಕ ಸುದ್ದಿ$/u,
  },
  {
    sourceId: 'prajavani',
    sourceName: 'Prajavani',
    domain: 'prajavani.net',
    language: 'kn',
    category: 'regional',
    scope: 'state',
    stateCode: 'KA',
    rssUrl: 'https://www.prajavani.net/feed',
    articlePath: /^\/(?:district\/|news\/karnataka-news\/)/,
  },
  {
    sourceId: 'aapta-news',
    sourceName: 'Aapta News',
    domain: 'aaptanews.com',
    language: 'kn',
    category: 'regional',
    scope: 'state',
    stateCode: 'KA',
    rssUrl: 'https://aaptanews.com/rss/category/ರಾಜ್ಯ',
  },
  {
    sourceId: 'twentyfour',
    sourceName: 'Twentyfour News',
    domain: 'twentyfournews.com',
    language: 'ml',
    category: 'regional',
    scope: 'state',
    stateCode: 'KL',
    rssUrl: 'https://www.twentyfournews.com/feed',
    articleTags: /^kerala news$/i,
  },
  {
    sourceId: 'twentyfour',
    sourceName: 'Twentyfour News',
    domain: 'twentyfournews.com',
    language: 'ml',
    category: 'top',
    scope: 'national',
    rssUrl: 'https://www.twentyfournews.com/feed',
    articleTags: /^(national news|india news)$/i,
  },
  {
    sourceId: 'o-heraldo',
    sourceName: 'O Heraldo',
    domain: 'heraldgoa.in',
    language: 'en',
    category: 'regional',
    scope: 'state',
    stateCode: 'GA',
    rssUrl: 'https://www.heraldgoa.in/feed/',
    articleTags: /^goa$/i,
  },
  {
    sourceId: 'voice-of-sikkim',
    sourceName: 'The Voice of Sikkim',
    domain: 'voiceofsikkim.com',
    language: 'en',
    category: 'regional',
    scope: 'state',
    stateCode: 'SK',
    rssUrl: 'https://www.voiceofsikkim.com/feed/',
    articleTags: /\b(?:sikkim (?:government|police|news)|pak[y]?ong|gyalshing|gangtok)\b/i,
  },
);
