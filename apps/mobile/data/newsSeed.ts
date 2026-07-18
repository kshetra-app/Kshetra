/**
 * Seed news feed used until the Phase-2 hourly scraper is wired in.
 * Shape is identical to what the backend `NewsFeed` document will provide,
 * so swapping the source to a live URL requires no UI changes.
 */
import type { NewsFeed, NewsSource, NewsItem } from '../lib/newsTypes';

export const NEWS_SOURCES: Record<string, NewsSource> = {
  hindu: { id: 'the-hindu', name: 'The Hindu', domain: 'thehindu.com', language: 'en', accent: '#C8102E', verified: true },
  toi: { id: 'toi', name: 'Times of India', domain: 'timesofindia.indiatimes.com', language: 'en', accent: '#EA1D25', verified: true },
  ie: { id: 'indian-express', name: 'The Indian Express', domain: 'indianexpress.com', language: 'en', accent: '#1A1A1A', verified: true },
  ndtv: { id: 'ndtv', name: 'NDTV', domain: 'ndtv.com', language: 'en', accent: '#E4002B', verified: true },
  eenadu: { id: 'eenadu', name: 'Eenadu', domain: 'eenadu.net', language: 'te', accent: '#0A6E3A', verified: true },
  sakshi: { id: 'sakshi', name: 'Sakshi', domain: 'sakshi.com', language: 'te', accent: '#1F4E9B', verified: true },
  jyothy: { id: 'andhrajyothy', name: 'Andhra Jyothy', domain: 'andhrajyothy.com', language: 'te', accent: '#B8272C', verified: true },
  bhaskar: { id: 'dainik-bhaskar', name: 'Dainik Bhaskar', domain: 'bhaskar.com', language: 'hi', accent: '#E5011A', verified: true },
  aajtak: { id: 'aaj-tak', name: 'Aaj Tak', domain: 'aajtak.in', language: 'hi', accent: '#E30613', verified: true },
  dinamalar: { id: 'dinamalar', name: 'Dinamalar', domain: 'dinamalar.com', language: 'ta', accent: '#0F5AA6', verified: true },
};

const now = Date.now();
const ago = (min: number) => new Date(now - min * 60000).toISOString();
/**
 * The seed feed is only a last-resort offline fallback (used when the on-device
 * scraper AND the last-good cache are both unavailable). It intentionally
 * carries NO images — real thumbnails come from live scraped stories, and we
 * never show placeholder/stock graphics. NewsCard renders these text-only.
 */
const img = (_seed: string): string | undefined => undefined;

export const NEWS_ITEMS: NewsItem[] = [
  // ── National / English ──
  {
    id: 'n-1', title: 'Parliament winter session: key bills tabled on day one',
    summary: 'The government listed several legislative priorities as the session opened amid opposition demands for debate.',
    imageUrl: img('parliament1'), sourceUrl: 'https://www.thehindu.com/news/national/',
    source: NEWS_SOURCES.hindu, language: 'en', category: 'politics', scope: 'national', publishedAt: ago(24),
  },
  {
    id: 'n-2', title: 'Economy grows faster than expected in latest quarter',
    summary: 'Analysts point to resilient domestic demand and public capex as growth drivers.',
    imageUrl: img('economy1'), sourceUrl: 'https://indianexpress.com/section/business/economy/',
    source: NEWS_SOURCES.ie, language: 'en', category: 'economy', scope: 'national', publishedAt: ago(52),
  },
  {
    id: 'n-3', title: 'Election Commission announces poll schedule for upcoming assembly elections',
    summary: 'Model code of conduct comes into effect immediately across the poll-bound states.',
    imageUrl: img('election1'), sourceUrl: 'https://timesofindia.indiatimes.com/elections',
    source: NEWS_SOURCES.toi, language: 'en', category: 'elections', scope: 'national', publishedAt: ago(15),
  },
  {
    id: 'n-4', title: 'Explained: what the new delimitation proposals could mean',
    summary: 'A look at how constituency boundaries and seat counts may shift and who is affected.',
    imageUrl: img('map1'), sourceUrl: 'https://www.ndtv.com/india',
    source: NEWS_SOURCES.ndtv, language: 'en', category: 'governance', scope: 'national', publishedAt: ago(90),
    video: { provider: 'youtube', embedId: 'dQw4w9WgXcQ', durationSec: 214 },
  },

  // ── Telangana / Telugu ──
  {
    id: 'n-5', title: 'హైదరాబాద్‌లో మెట్రో రెండో దశకు ఆమోదం',
    summary: 'నగర రవాణా విస్తరణలో భాగంగా కొత్త కారిడార్లకు ప్రభుత్వం ఆమోదం తెలిపింది.',
    imageUrl: img('metro1'), sourceUrl: 'https://www.eenadu.net/telangana',
    source: NEWS_SOURCES.eenadu, language: 'te', category: 'governance', scope: 'state', stateCode: 'TS', publishedAt: ago(38),
  },
  {
    id: 'n-6', title: 'తెలంగాణ అసెంబ్లీలో వాడీవేడి చర్చ',
    summary: 'రాష్ట్ర బడ్జెట్‌పై అధికార, ప్రతిపక్షాల మధ్య తీవ్ర వాదోపవాదాలు.',
    imageUrl: img('assembly1'), sourceUrl: 'https://www.sakshi.com/telangana',
    source: NEWS_SOURCES.sakshi, language: 'te', category: 'politics', scope: 'state', stateCode: 'TS', publishedAt: ago(70),
  },
  {
    id: 'n-7', title: 'జూబ్లీహిల్స్ నియోజకవర్గంలో అభివృద్ధి పనుల ప్రారంభం',
    summary: 'స్థానిక ఎమ్మెల్యే కొత్త రహదారి, డ్రైనేజీ పనులకు శంకుస్థాపన చేశారు.',
    imageUrl: img('local1'), sourceUrl: 'https://www.andhrajyothy.com/telangana',
    source: NEWS_SOURCES.jyothy, language: 'te', category: 'regional', scope: 'constituency', stateCode: 'TS', constituencyId: 'TS-AC-64', publishedAt: ago(120),
  },

  // ── Andhra Pradesh / Telugu ──
  {
    id: 'n-8', title: 'అమరావతి రాజధాని పనుల్లో వేగం',
    summary: 'కీలక భవన సముదాయాల నిర్మాణానికి కొత్త టెండర్లు పిలిచారు.',
    imageUrl: img('amaravati1'), sourceUrl: 'https://www.eenadu.net/andhra-pradesh',
    source: NEWS_SOURCES.eenadu, language: 'te', category: 'governance', scope: 'state', stateCode: 'AP', publishedAt: ago(46),
  },
  {
    id: 'n-9', title: 'విశాఖ ఉక్కు పరిశ్రమపై కేంద్రం కీలక ప్రకటన',
    summary: 'పెట్టుబడులు, ఉద్యోగాల భద్రతపై కార్మిక సంఘాలు స్పందించాయి.',
    imageUrl: img('steel1'), sourceUrl: 'https://www.sakshi.com/andhra-pradesh',
    source: NEWS_SOURCES.sakshi, language: 'te', category: 'economy', scope: 'state', stateCode: 'AP', publishedAt: ago(85),
  },

  // ── Hindi (national/regional) ──
  {
    id: 'n-10', title: 'चुनावी रैलियों में बड़े नेताओं का जमावड़ा',
    summary: 'प्रमुख दलों ने प्रचार अभियान तेज़ किया, मतदाताओं से किए कई वादे.',
    imageUrl: img('rally1'), sourceUrl: 'https://www.bhaskar.com/national/',
    source: NEWS_SOURCES.bhaskar, language: 'hi', category: 'elections', scope: 'national', publishedAt: ago(33),
  },
  {
    id: 'n-11', title: 'बजट सत्र: विपक्ष और सरकार आमने-सामने',
    summary: 'महंगाई और रोज़गार के मुद्दों पर सदन में तीखी बहस.',
    imageUrl: img('budget1'), sourceUrl: 'https://www.aajtak.in/india',
    source: NEWS_SOURCES.aajtak, language: 'hi', category: 'politics', scope: 'national', publishedAt: ago(58),
    video: { provider: 'youtube', embedId: 'M7lc1UVf-VE', durationSec: 178 },
  },

  // ── Tamil ──
  {
    id: 'n-12', title: 'சட்டப்பேரவையில் புதிய திட்டங்கள் அறிவிப்பு',
    summary: 'கிராமப்புற வளர்ச்சிக்கான நிதி ஒதுக்கீடு அதிகரிக்கப்பட்டது.',
    imageUrl: img('tn1'), sourceUrl: 'https://www.dinamalar.com/',
    source: NEWS_SOURCES.dinamalar, language: 'ta', category: 'governance', scope: 'state', stateCode: 'TN', publishedAt: ago(105),
  },

  // ── More English top stories ──
  {
    id: 'n-13', title: 'Voter roll revision drive begins across districts',
    summary: 'Officials urge citizens to verify enrolment ahead of the deadline.',
    imageUrl: img('voter1'), sourceUrl: 'https://www.thehindu.com/elections/',
    source: NEWS_SOURCES.hindu, language: 'en', category: 'elections', scope: 'national', publishedAt: ago(12),
  },
  {
    id: 'n-14', title: 'Watch: how polling booths are being modernised',
    summary: 'A field report on new accessibility and verification measures at booths.',
    imageUrl: img('booth1'), sourceUrl: 'https://www.ndtv.com/video',
    source: NEWS_SOURCES.ndtv, language: 'en', category: 'video', scope: 'national', publishedAt: ago(140),
    video: { provider: 'youtube', embedId: 'aqz-KE-bpKQ', durationSec: 302 },
  },
];

export const SEED_NEWS_FEED: NewsFeed = {
  version: 1,
  generatedAt: new Date(now).toISOString(),
  refreshIntervalMin: 60,
  sources: Object.values(NEWS_SOURCES),
  items: NEWS_ITEMS,
};
