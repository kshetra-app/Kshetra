/**
 * News aggregation types + feed contract.
 *
 * This is the shared schema between the mobile News tab and the (Phase 2)
 * backend scraping engine. The scraper runs hourly, pulls headlines/videos
 * from official RSS feeds of national + regional news portals, and publishes
 * a `NewsFeed` JSON document that the app reads and refreshes.
 *
 * IMPORTANT (legal): we only ever store/display the headline, a short summary,
 * a thumbnail, the publisher name and a canonical link back to the original
 * article/video ("Read at source"). We never re-host full article bodies or
 * downloaded video files — playback uses the publisher's official embed.
 */

/** Broad, tappable news sections shown as a category rail. */
export type NewsCategory =
  | 'top'
  | 'politics'
  | 'elections'
  | 'economy'
  | 'governance'
  | 'regional'
  | 'video';

/** Languages the user can choose to consume news in. */
export type NewsLanguageCode =
  | 'en'
  | 'hi'
  | 'te'
  | 'ta'
  | 'kn'
  | 'ml'
  | 'mr'
  | 'bn'
  | 'gu';

/** Geographic reach of a news item — mirrors the app's civic scope model. */
export type NewsScope = 'national' | 'state' | 'constituency';

/** A news publisher / portal we aggregate from (via its official RSS feed). */
export interface NewsSource {
  /** Stable slug, e.g. 'the-hindu', 'eenadu', 'sakshi'. */
  id: string;
  /** Display name shown in the citation, e.g. 'The Hindu'. */
  name: string;
  /** Home domain, used for favicon + attribution. */
  domain: string;
  /** Primary language of the portal. */
  language: NewsLanguageCode;
  /** Optional brand colour for the source chip. */
  accent?: string;
  /** Whether this is a verified/established outlet. */
  verified?: boolean;
}

/** A single aggregated news article or video card. */
export interface NewsItem {
  id: string;
  /** Headline as published by the source (never rewritten). */
  title: string;
  /** Short 1-2 line summary/dek (from the RSS <description>). */
  summary?: string;
  /** Thumbnail image URL (from RSS media/enclosure). */
  imageUrl?: string;
  /** Canonical link to the original article/video — REQUIRED for citation. */
  sourceUrl: string;
  /** The publisher this came from. */
  source: NewsSource;
  /** Language this item is written in. */
  language: NewsLanguageCode;
  category: NewsCategory;
  scope: NewsScope;
  /** ISO state code the item is relevant to (undefined = national). */
  stateCode?: string;
  /** Constituency id (`{STATE}-AC-{n}`) when the item is hyper-local. */
  constituencyId?: string;
  /** ISO timestamp the source published the item. */
  publishedAt: string;
  /** Present when the item is a video; official embed only. */
  video?: {
    /** 'youtube' | 'native' — playback provider. */
    provider: 'youtube' | 'native';
    /** YouTube video id or a direct/official embed URL. */
    embedId: string;
    /** Duration in seconds (optional). */
    durationSec?: number;
  };
}

/** The document the hourly scraper publishes and the app consumes. */
export interface NewsFeed {
  /** Schema version for forward-compatibility. */
  version: number;
  /** ISO timestamp of the last successful scrape. */
  generatedAt: string;
  /** Minutes until the next scheduled refresh (default 60). */
  refreshIntervalMin: number;
  sources: NewsSource[];
  items: NewsItem[];
}

export const NEWS_LANGUAGES: { code: NewsLanguageCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
];

export const NEWS_CATEGORIES: { key: NewsCategory; label: string; icon: string }[] = [
  { key: 'top', label: 'Top', icon: 'flame' },
  { key: 'politics', label: 'Politics', icon: 'people' },
  { key: 'elections', label: 'Elections', icon: 'checkbox' },
  { key: 'governance', label: 'Governance', icon: 'business' },
  { key: 'economy', label: 'Economy', icon: 'trending-up' },
  { key: 'regional', label: 'Regional', icon: 'location' },
  { key: 'video', label: 'Video', icon: 'play-circle' },
];

/** Human-friendly "x min ago" formatting for a published timestamp. */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
