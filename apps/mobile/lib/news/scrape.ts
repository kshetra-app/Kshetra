/**
 * On-device news scraper.
 *
 * Fetches official RSS feeds directly from the app and assembles a `NewsFeed`
 * without needing a hosted backend. It is LANGUAGE-AWARE: when the user picks a
 * language we scrape that language's feeds for depth; on the "All languages"
 * view we scrape one image-rich primary feed per language so every language is
 * represented.
 *
 * Legal posture matches the backend: we only keep the headline, summary,
 * thumbnail, publisher and a canonical link back — never article bodies.
 */
import type { NewsCategory, NewsFeed, NewsItem, NewsLanguageCode } from '../newsTypes';
import { fetchFeedXml, parseFeed } from './rssParser';
import {
  FEED_SOURCES,
  primarySources,
  sourcesForLanguage,
  type FeedSource,
} from './sources';

const REFRESH_INTERVAL_MIN = 60;
const MAX_ITEMS = 200;
const PER_SOURCE_CAP = 15;

/** Cheap, stable id from the canonical link (djb2) — no node:crypto on RN. */
function hashId(link: string): string {
  let h = 5381;
  for (let i = 0; i < link.length; i++) h = ((h << 5) + h + link.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

function detectYouTube(link: string): { provider: 'youtube'; embedId: string } | undefined {
  const m = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i);
  return m ? { provider: 'youtube', embedId: m[1] } : undefined;
}

export function classifyNewsCategory(
  title: string,
  summary: string | undefined,
  srcCategory: NewsCategory,
  hasVideo: boolean,
  stateCode?: string,
): NewsCategory {
  if (hasVideo) return 'video';
  if (srcCategory && srcCategory !== 'top') return srcCategory;

  const text = `${title} ${summary ?? ''}`.toLowerCase();

  // 1. Elections
  if (
    /election|elections|\bpoll\b|\bpolls\b|voting|voter|ballot|bypoll|by-poll|evm|exit poll|vote count|assembly poll|lok sabha poll|constituency poll|चुनाव|मतदान|वोट|उपचुनाव|प्रत्याशी|उम्मीदवार|मतगणना|నైజాం|ఎన్నిక|ఎన్నికలు|ఓటు|ఓటింగ్|పోలింగ్|ఉప ఎన్నిక|అభ్యర్థి|ఓట్ల|தேர்தல்|வாக்குப்பதிவு|வாக்கு|வேட்பாளர்|ಚುನಾವಣೆ|ಮತದಾನ|ಅಭ್ಯರ್ಥಿ|निवडणूक|मतदान|उमेदवार|নির্বাচন|ভোট|ভোটগ্রহণ|ચૂંટણી|મતદાન/i.test(
      text,
    )
  ) {
    return 'elections';
  }

  // 2. Economy & Business
  if (
    /econom|gdp|inflation|sensex|nifty|market|markets|rbi|rupee|dollar|stock|stocks|budget|tax|gst|bank|banking|repo rate|trade|export|import|finance|financial|invest|crypto|gold price|petrol|diesel|repo|अर्थव्यवस्था|जीडीपी|महंगाई|सेंसेक्स|निफ्टी|बाजार|आरबीआई|रुपया|बजट|टैक्स|जीएसटी|बैंक|शेयर|निवेश|वित्त|ఆర్థిక|ద్రవ్యోల్బణం|సెన్సెక్స్|నిఫ్టీ|మార్కెట్|రూపాయి|బడ్జెట్|పన్ను|బ్యాంకు|షేర్ల|పెట్టుబడులు|பொருளாதாரம்|பங்குச்சந்தை|பட்ஜெட்|வங்கி|రూபாய்|ಆರ್ಥಿಕತೆ|ಬಜೆಟ್|ಷೇರು|ಮಾರುಕಟ್ಟೆ|ಬ್ಯಾಂಕ್|अर्थव्यवस्था|महागाई|शेअर बाजार|बजेट|बँक|অর্থনীতি|মুদ্রাস্ফীতি|বাজেট|ব্যাংক|શેરબજાર/i.test(
      text,
    )
  ) {
    return 'economy';
  }

  // 3. Politics & Parties
  if (
    /\bbjp\b|congress|\baap\b|\btmc\b|\bdmk\b|\baiadmk\b|\bysrcp\b|\btdp\b|\bbrs\b|\bbsp\b|\bsp\b|\bcpi\b|\bcpm\b|\bncp\b|shiv sena|modi|rahul gandhi|amit shah|minister|chief minister|\bcm\b|\bpm\b|party|parties|\bmla\b|\bmp\b|leader|leaders|opposition|assembly|parliament|rajya sabha|lok sabha|rally|rallies|protest|dharna|coalition|alliance|seat sharing|भाजपा|कांग्रेस|आप|मोदी|राहुल गांधी|अमित शाह|मंत्री|मुख्यमंत्री|प्रधानमंत्री|पार्टी|विधायक|सांसद|नेता|विपक्ष|संसद|विधानसभा|रैली|गठबंधन|బిజెపి|కాంగ్రెస్|మోదీ|రాహుల్ గాంధీ|అమిత్ షా|వైఎస్సార్సీపీ|టిడిపి|బిఆర్ఎస్|జనసేన|ముఖ్యమంత్రి|పార్టీ|ఎమ్మెల్యే|ఎంపీ|నేత|నాయకుడు|విపక్షం|అసెంబ్లీ|పార్లమెంట్|பாஜக|காங்கிரஸ்|திமுக|அதிமுக|முதல்வர்|அமைச்சர்|கட்சி|ಬಿಜೆಪಿ|ಕಾಂಗ್ರೆಸ್|ಜೆಡಿಎಸ್|ಮುಖ್ಯಮಂತ್ರಿ|भाजप|काँग्रेस|शिवसेना|राष्ट्रवादी|বিজেপি|তৃণমূল|ભાજપ/i.test(
      text,
    )
  ) {
    return 'politics';
  }

  // 4. Governance & Public Policy
  if (
    /scheme|schemes|welfare|policy|court|supreme court|high court|judiciary|verdict|ruling|police|cbi|\bed\b|arrest|cabinet|ordinance|ministry|infrastructure|hospital|hospitals|school|schools|highway|metro|railway|water supply|power grid|collector|panchayat|municipal|corporation|civic|development|civic issue|public works|योजना|कल्याण|नीति|सुप्रीम कोर्ट|हाई कोर्ट|अदालत|फैसला|पुलिस|गिरफ्तार|कैबिनेट|मंत्रालय|परियोजना|अस्पताल|स्कूल|हाइवे|मेट्रो|रेलवे|विकास|పథకం|సంక్షేమం|విధానం|కోర్టు|తీర్పు|పోలీస్|అరెస్ట్|కేబినెట్|మంత్రిత్వ శాఖ|ప్రాజెక్ట్|ఆసుపత్రి|పాఠశాల|మెట్రో|రైల్వే|రహదారి|అభివృద్ధి|కలెక్టర్|మున్సిపల్|திட்டம்|நீதிமன்றம்|தீர்ப்பு|காவல்துறை|அரசு|மேம்பாடு|ಯೋಜನೆ|ನ್ಯಾಯಾಲಯ|ತೀರ್ಪು|ಪೊಲೀಸ್|ಸರ್ಕಾರ|ಅಭಿವೃದ್ಧಿ|निकाल|पोलीस|मंत्रिमंडळ|প্রকল্প|আদালত|রায়|পুলিশ|ચુકાદો|સરકાર/i.test(
      text,
    )
  ) {
    return 'governance';
  }

  // 5. Regional
  if (
    stateCode ||
    /hyderabad|amaravati|visakhapatnam|vijayawada|delhi|mumbai|bengaluru|bangalore|chennai|kolkata|kerala|karnataka|tamil nadu|maharashtra|gujarat|uttar pradesh|bihar|rajasthan|punjab|telangana|andhra|హైదరాబాద్|విజయవాడ|విశాఖపట్నం|బెంగళూరు|తెలంగాణ|ఆంధ్రప్రదేశ్|சென்னை|பெங்களூரு|கொல்கத்தா|மும்பை/i.test(
      text,
    )
  ) {
    return 'regional';
  }

  return 'top';
}

async function scrapeSource(src: FeedSource): Promise<NewsItem[]> {
  const xml = await fetchFeedXml(src.rssUrl);
  if (!xml) return [];
  const parsed = parseFeed(xml).slice(0, PER_SOURCE_CAP);
  return parsed.map((p) => {
    const video = detectYouTube(p.link);
    const category = classifyNewsCategory(
      p.title,
      p.summary,
      src.category,
      !!video,
      src.stateCode,
    );
    return {
      id: hashId(p.link),
      title: p.title,
      summary: p.summary,
      imageUrl: p.imageUrl,
      sourceUrl: p.link,
      source: {
        id: src.sourceId,
        name: src.sourceName,
        domain: src.domain,
        language: src.language,
        accent: src.accent,
        verified: src.verified,
      },
      language: src.language,
      category,
      scope: src.scope,
      stateCode: src.stateCode,
      publishedAt: p.publishedAt ?? new Date().toISOString(),
      video,
    } satisfies NewsItem;
  });
}

/**
 * Scrape news for a chosen language (or a multi-language default when null).
 * Returns null if every source failed (caller then falls back to cache/seed).
 */
export async function scrapeNewsOnDevice(
  lang: NewsLanguageCode | null,
): Promise<NewsFeed | null> {
  const targets: FeedSource[] = lang ? sourcesForLanguage(lang) : primarySources();
  // Safety net: if a language somehow has no configured feed, fall back to primaries.
  const sources = targets.length ? targets : primarySources();

  const results = await Promise.allSettled(sources.map(scrapeSource));
  const all: NewsItem[] = [];
  for (const r of results) if (r.status === 'fulfilled') all.push(...r.value);
  if (all.length === 0) return null;

  // Dedupe by canonical link (id), keep first occurrence.
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of all) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }

  deduped.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const items = deduped.slice(0, MAX_ITEMS);

  const sourceMap = new Map<string, NewsItem['source']>();
  for (const it of items) if (!sourceMap.has(it.source.id)) sourceMap.set(it.source.id, it.source);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    refreshIntervalMin: REFRESH_INTERVAL_MIN,
    sources: [...sourceMap.values()],
    items,
  };
}

/** Total configured feed count — handy for diagnostics/tests. */
export const FEED_COUNT = FEED_SOURCES.length;
