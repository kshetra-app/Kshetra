/**
 * Curated RSS source registry.
 *
 * Following what mainstream aggregators (Google News, SmartNews, Inshorts) do:
 * we pull from reputable outlets' OFFICIAL RSS feeds and only ever store the
 * headline, summary, thumbnail, publisher and a canonical link back. No article
 * bodies or media are re-hosted.
 */
export type NewsLanguageCode = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu';
export type NewsCategory = 'top' | 'politics' | 'elections' | 'economy' | 'governance' | 'regional' | 'video';
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
}

export const FEED_SOURCES: FeedSource[] = [
  // ── The Hindu ──
  { sourceId: 'the-hindu', sourceName: 'The Hindu', domain: 'thehindu.com', accent: '#C8102E', verified: true, language: 'en', category: 'top', scope: 'national', rssUrl: 'https://www.thehindu.com/news/national/feeder/default.rss' },
  { sourceId: 'the-hindu', sourceName: 'The Hindu', domain: 'thehindu.com', accent: '#C8102E', verified: true, language: 'en', category: 'politics', scope: 'national', rssUrl: 'https://www.thehindu.com/news/national/feeder/default.rss' },
  { sourceId: 'the-hindu', sourceName: 'The Hindu', domain: 'thehindu.com', accent: '#C8102E', verified: true, language: 'en', category: 'economy', scope: 'national', rssUrl: 'https://www.thehindu.com/business/Economy/feeder/default.rss' },
  { sourceId: 'the-hindu-ts', sourceName: 'The Hindu', domain: 'thehindu.com', accent: '#C8102E', verified: true, language: 'en', category: 'regional', scope: 'state', stateCode: 'TS', rssUrl: 'https://www.thehindu.com/news/national/telangana/feeder/default.rss' },
  { sourceId: 'the-hindu-ap', sourceName: 'The Hindu', domain: 'thehindu.com', accent: '#C8102E', verified: true, language: 'en', category: 'regional', scope: 'state', stateCode: 'AP', rssUrl: 'https://www.thehindu.com/news/national/andhra-pradesh/feeder/default.rss' },
  { sourceId: 'the-hindu-tn', sourceName: 'The Hindu', domain: 'thehindu.com', accent: '#C8102E', verified: true, language: 'en', category: 'regional', scope: 'state', stateCode: 'TN', rssUrl: 'https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss' },
  { sourceId: 'the-hindu-ka', sourceName: 'The Hindu', domain: 'thehindu.com', accent: '#C8102E', verified: true, language: 'en', category: 'regional', scope: 'state', stateCode: 'KA', rssUrl: 'https://www.thehindu.com/news/national/karnataka/feeder/default.rss' },
  { sourceId: 'the-hindu-kl', sourceName: 'The Hindu', domain: 'thehindu.com', accent: '#C8102E', verified: true, language: 'en', category: 'regional', scope: 'state', stateCode: 'KL', rssUrl: 'https://www.thehindu.com/news/national/kerala/feeder/default.rss' },

  // ── The Indian Express ──
  { sourceId: 'indian-express', sourceName: 'The Indian Express', domain: 'indianexpress.com', accent: '#1A1A1A', verified: true, language: 'en', category: 'top', scope: 'national', rssUrl: 'https://indianexpress.com/section/india/feed/' },
  { sourceId: 'indian-express', sourceName: 'The Indian Express', domain: 'indianexpress.com', accent: '#1A1A1A', verified: true, language: 'en', category: 'politics', scope: 'national', rssUrl: 'https://indianexpress.com/section/political-pulse/feed/' },
  { sourceId: 'indian-express', sourceName: 'The Indian Express', domain: 'indianexpress.com', accent: '#1A1A1A', verified: true, language: 'en', category: 'elections', scope: 'national', rssUrl: 'https://indianexpress.com/section/elections/feed/' },

  // ── NDTV ──
  { sourceId: 'ndtv', sourceName: 'NDTV', domain: 'ndtv.com', accent: '#E4002B', verified: true, language: 'en', category: 'top', scope: 'national', rssUrl: 'https://feeds.feedburner.com/ndtvnews-india-news' },
  { sourceId: 'ndtv', sourceName: 'NDTV', domain: 'ndtv.com', accent: '#E4002B', verified: true, language: 'en', category: 'economy', scope: 'national', rssUrl: 'https://feeds.feedburner.com/ndtvprofit-latest' },

  // ── Times of India ──
  { sourceId: 'toi', sourceName: 'Times of India', domain: 'timesofindia.indiatimes.com', accent: '#EA1D25', verified: true, language: 'en', category: 'top', scope: 'national', rssUrl: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms' },
  { sourceId: 'toi', sourceName: 'Times of India', domain: 'timesofindia.indiatimes.com', accent: '#EA1D25', verified: true, language: 'en', category: 'elections', scope: 'national', rssUrl: 'https://timesofindia.indiatimes.com/rssfeeds/54829575.cms' },

  // ── Hindi (Hindustan / Aaj Tak / News18) ──
  { sourceId: 'aaj-tak', sourceName: 'Aaj Tak', domain: 'aajtak.in', accent: '#E30613', verified: true, language: 'hi', category: 'top', scope: 'national', rssUrl: 'https://www.aajtak.in/rssfeeds/?id=home' },
  { sourceId: 'news18-hindi', sourceName: 'News18 Hindi', domain: 'hindi.news18.com', accent: '#0A66C2', verified: true, language: 'hi', category: 'politics', scope: 'national', rssUrl: 'https://hindi.news18.com/rss/khabar/nation/nation.xml' },

  // ── Regional-language nationals ──
  { sourceId: 'the-hindu-tamil', sourceName: 'The Hindu Tamil', domain: 'hindutamil.in', accent: '#C8102E', verified: true, language: 'ta', category: 'top', scope: 'state', stateCode: 'TN', rssUrl: 'https://www.hindutamil.in/rss/latest.xml' },
];
