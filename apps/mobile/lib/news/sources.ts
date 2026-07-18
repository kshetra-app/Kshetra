/**
 * Curated RSS source registry (on-device mirror of the backend list).
 *
 * We pull from reputable outlets' OFFICIAL RSS feeds and only ever keep the
 * headline, summary, thumbnail, publisher and a canonical link back. No article
 * bodies or media are re-hosted — the reader opens the source URL.
 *
 * Keep this in sync with `apps/api/src/services/news/sources.ts`. When a hosted
 * API is configured the backend list is authoritative; this list is used only
 * for on-device scraping fallback.
 */
import type {
  NewsCategory,
  NewsLanguageCode,
  NewsScope,
} from '../newsTypes';

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
  /**
   * Marks a high-volume, image-rich feed used for the "All languages" view so
   * every language is represented without fetching every feed. When a specific
   * language is selected, ALL that language's feeds are scraped for depth.
   */
  primary?: boolean;
}

/**
 * Every feed below was live-validated (HTTP 200, returns items, carries
 * thumbnails) via `scripts/validate-news-feeds.mjs`. Regional-language feeds
 * are general national+state coverage, so they use scope 'national' to stay
 * visible under both the National and State tabs.
 */
export const FEED_SOURCES: FeedSource[] = [
  // ─────────────── English ───────────────
  { sourceId: 'indian-express', sourceName: 'The Indian Express', domain: 'indianexpress.com', accent: '#1A1A1A', verified: true, language: 'en', category: 'top', scope: 'national', primary: true, rssUrl: 'https://indianexpress.com/section/india/feed/' },
  { sourceId: 'indian-express', sourceName: 'The Indian Express', domain: 'indianexpress.com', accent: '#1A1A1A', verified: true, language: 'en', category: 'politics', scope: 'national', rssUrl: 'https://indianexpress.com/section/political-pulse/feed/' },
  { sourceId: 'indian-express', sourceName: 'The Indian Express', domain: 'indianexpress.com', accent: '#1A1A1A', verified: true, language: 'en', category: 'elections', scope: 'national', rssUrl: 'https://indianexpress.com/section/elections/feed/' },
  { sourceId: 'ndtv', sourceName: 'NDTV', domain: 'ndtv.com', accent: '#E4002B', verified: true, language: 'en', category: 'top', scope: 'national', rssUrl: 'https://feeds.feedburner.com/ndtvnews-india-news' },
  { sourceId: 'ndtv', sourceName: 'NDTV', domain: 'ndtv.com', accent: '#E4002B', verified: true, language: 'en', category: 'economy', scope: 'national', rssUrl: 'https://feeds.feedburner.com/ndtvprofit-latest' },
  { sourceId: 'the-hindu', sourceName: 'The Hindu', domain: 'thehindu.com', accent: '#C8102E', verified: true, language: 'en', category: 'top', scope: 'national', rssUrl: 'https://www.thehindu.com/news/national/feeder/default.rss' },
  { sourceId: 'the-hindu', sourceName: 'The Hindu', domain: 'thehindu.com', accent: '#C8102E', verified: true, language: 'en', category: 'economy', scope: 'national', rssUrl: 'https://www.thehindu.com/business/Economy/feeder/default.rss' },
  { sourceId: 'the-hindu-ts', sourceName: 'The Hindu', domain: 'thehindu.com', accent: '#C8102E', verified: true, language: 'en', category: 'regional', scope: 'state', stateCode: 'TS', rssUrl: 'https://www.thehindu.com/news/national/telangana/feeder/default.rss' },
  { sourceId: 'the-hindu-ap', sourceName: 'The Hindu', domain: 'thehindu.com', accent: '#C8102E', verified: true, language: 'en', category: 'regional', scope: 'state', stateCode: 'AP', rssUrl: 'https://www.thehindu.com/news/national/andhra-pradesh/feeder/default.rss' },
  { sourceId: 'toi', sourceName: 'Times of India', domain: 'timesofindia.indiatimes.com', accent: '#EA1D25', verified: true, language: 'en', category: 'top', scope: 'national', rssUrl: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms' },

  // ─────────────── Hindi ───────────────
  { sourceId: 'news18-hindi', sourceName: 'News18 Hindi', domain: 'hindi.news18.com', accent: '#0A66C2', verified: true, language: 'hi', category: 'top', scope: 'national', primary: true, rssUrl: 'https://hindi.news18.com/rss/khabar/nation/nation.xml' },
  { sourceId: 'ndtv-hindi', sourceName: 'NDTV India', domain: 'ndtv.in', accent: '#E4002B', verified: true, language: 'hi', category: 'top', scope: 'national', rssUrl: 'https://feeds.feedburner.com/ndtvkhabar-latest' },

  // ─────────────── Telugu ───────────────
  { sourceId: 'news18-telugu', sourceName: 'News18 Telugu', domain: 'telugu.news18.com', accent: '#0A66C2', verified: true, language: 'te', category: 'top', scope: 'national', primary: true, rssUrl: 'https://telugu.news18.com/commonfeeds/v1/tel/rss/andhra-pradesh.xml' },
  { sourceId: 'tv9-telugu', sourceName: 'TV9 Telugu', domain: 'tv9telugu.com', accent: '#E4002B', verified: true, language: 'te', category: 'top', scope: 'national', rssUrl: 'https://tv9telugu.com/feed' },
  { sourceId: 'abp-desam', sourceName: 'ABP Desam', domain: 'telugu.abplive.com', accent: '#C8102E', verified: true, language: 'te', category: 'top', scope: 'national', rssUrl: 'https://telugu.abplive.com/home/feed' },
  { sourceId: 'nt-news', sourceName: 'Namasthe Telangana', domain: 'ntnews.com', accent: '#E4002B', verified: true, language: 'te', category: 'top', scope: 'national', rssUrl: 'https://www.ntnews.com/feed' },

  // ─────────────── Tamil ───────────────
  { sourceId: 'news18-tamil', sourceName: 'News18 Tamil', domain: 'tamil.news18.com', accent: '#0A66C2', verified: true, language: 'ta', category: 'top', scope: 'national', primary: true, rssUrl: 'https://tamil.news18.com/commonfeeds/v1/tam/rss/tamil-nadu.xml' },
  { sourceId: 'abp-tamil', sourceName: 'ABP Nadu', domain: 'tamil.abplive.com', accent: '#C8102E', verified: true, language: 'ta', category: 'top', scope: 'national', rssUrl: 'https://tamil.abplive.com/home/feed' },
  { sourceId: 'vikatan', sourceName: 'Vikatan', domain: 'vikatan.com', accent: '#D32F2F', verified: true, language: 'ta', category: 'top', scope: 'national', rssUrl: 'https://www.vikatan.com/feed' },
  { sourceId: 'maalaimalar', sourceName: 'Maalaimalar', domain: 'maalaimalar.com', accent: '#1F4E9B', verified: true, language: 'ta', category: 'top', scope: 'national', rssUrl: 'https://www.maalaimalar.com/feed' },

  // ─────────────── Kannada ───────────────
  { sourceId: 'tv9-kannada', sourceName: 'TV9 Kannada', domain: 'tv9kannada.com', accent: '#E4002B', verified: true, language: 'kn', category: 'top', scope: 'national', primary: true, rssUrl: 'https://tv9kannada.com/feed' },
  { sourceId: 'prajavani', sourceName: 'Prajavani', domain: 'prajavani.net', accent: '#0A6E3A', verified: true, language: 'kn', category: 'top', scope: 'national', rssUrl: 'https://www.prajavani.net/feed' },

  // ─────────────── Malayalam ───────────────
  { sourceId: 'news18-malayalam', sourceName: 'News18 Malayalam', domain: 'malayalam.news18.com', accent: '#0A66C2', verified: true, language: 'ml', category: 'top', scope: 'national', primary: true, rssUrl: 'https://malayalam.news18.com/commonfeeds/v1/mal/rss/kerala.xml' },

  // ─────────────── Marathi ───────────────
  { sourceId: 'news18-marathi', sourceName: 'News18 Lokmat', domain: 'marathi.news18.com', accent: '#0A66C2', verified: true, language: 'mr', category: 'top', scope: 'national', primary: true, rssUrl: 'https://marathi.news18.com/commonfeeds/v1/mar/rss/maharashtra.xml' },
  { sourceId: 'abp-majha', sourceName: 'ABP Majha', domain: 'marathi.abplive.com', accent: '#C8102E', verified: true, language: 'mr', category: 'top', scope: 'national', rssUrl: 'https://marathi.abplive.com/home/feed' },
  { sourceId: 'tv9-marathi', sourceName: 'TV9 Marathi', domain: 'tv9marathi.com', accent: '#E4002B', verified: true, language: 'mr', category: 'top', scope: 'national', rssUrl: 'https://www.tv9marathi.com/feed' },

  // ─────────────── Bengali ───────────────
  { sourceId: 'news18-bangla', sourceName: 'News18 Bangla', domain: 'bengali.news18.com', accent: '#0A66C2', verified: true, language: 'bn', category: 'top', scope: 'national', primary: true, rssUrl: 'https://bengali.news18.com/commonfeeds/v1/ben/rss/west-bengal.xml' },
  { sourceId: 'abp-ananda', sourceName: 'ABP Ananda', domain: 'bengali.abplive.com', accent: '#C8102E', verified: true, language: 'bn', category: 'top', scope: 'national', rssUrl: 'https://bengali.abplive.com/home/feed' },
  { sourceId: 'tv9-bangla', sourceName: 'TV9 Bangla', domain: 'tv9bangla.com', accent: '#E4002B', verified: true, language: 'bn', category: 'top', scope: 'national', rssUrl: 'https://tv9bangla.com/feed' },

  // ─────────────── Gujarati ───────────────
  { sourceId: 'news18-gujarati', sourceName: 'News18 Gujarati', domain: 'gujarati.news18.com', accent: '#0A66C2', verified: true, language: 'gu', category: 'top', scope: 'national', primary: true, rssUrl: 'https://gujarati.news18.com/commonfeeds/v1/guj/rss/gujarat.xml' },
  { sourceId: 'tv9-gujarati', sourceName: 'TV9 Gujarati', domain: 'tv9gujarati.com', accent: '#E4002B', verified: true, language: 'gu', category: 'top', scope: 'national', rssUrl: 'https://tv9gujarati.com/feed' },
  { sourceId: 'abp-asmita', sourceName: 'ABP Asmita', domain: 'gujarati.abplive.com', accent: '#C8102E', verified: true, language: 'gu', category: 'top', scope: 'national', rssUrl: 'https://gujarati.abplive.com/home/feed' },
];

/** All feeds for a given language (used when a specific language is selected). */
export function sourcesForLanguage(lang: NewsLanguageCode): FeedSource[] {
  return FEED_SOURCES.filter((s) => s.language === lang);
}

/** One image-rich feed per language (used for the "All languages" view). */
export function primarySources(): FeedSource[] {
  return FEED_SOURCES.filter((s) => s.primary);
}
