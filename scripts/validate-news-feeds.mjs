/**
 * Validate candidate RSS feeds for the on-device news engine.
 *
 * For each candidate it reports: HTTP status, #items parsed, and % of items
 * that carry a thumbnail image. Only feeds that return items are usable; those
 * with high image coverage are preferred for the thumbnail requirement.
 *
 * Usage: node scripts/validate-news-feeds.mjs
 */

const TIMEOUT_MS = 15000;

const CANDIDATES = [
  // te
  ['te', 'TV9 Telugu', 'https://tv9telugu.com/feed'],
  ['te', 'ABP Desam', 'https://telugu.abplive.com/home/feed'],
  ['te', 'News18 TE cf', 'https://telugu.news18.com/commonfeeds/v1/tel/rss/andhra-pradesh.xml'],
  ['te', 'Oneindia TE', 'https://telugu.oneindia.com/rss/telugu-news.xml'],
  ['te', 'Prabha News', 'https://www.prabhanews.com/feed'],
  ['te', 'Namasthe TS', 'https://www.ntnews.com/feed'],
  // ta
  ['ta', 'News18 TA cf', 'https://tamil.news18.com/commonfeeds/v1/tam/rss/tamil-nadu.xml'],
  ['ta', 'ABP Tamil', 'https://tamil.abplive.com/home/feed'],
  ['ta', 'Vikatan', 'https://www.vikatan.com/feed'],
  ['ta', 'HinduTamil2', 'https://www.hindutamil.in/rss/tamilnadu.xml'],
  ['ta', 'Oneindia TA', 'https://tamil.oneindia.com/rss/tamil-news.xml'],
  ['ta', 'Maalaimalar', 'https://www.maalaimalar.com/feed'],
  // kn
  ['kn', 'News18 KN cf', 'https://kannada.news18.com/commonfeeds/v1/kan/rss/karnataka.xml'],
  ['kn', 'TV9 Kannada', 'https://tv9kannada.com/feed'],
  ['kn', 'Oneindia KN', 'https://kannada.oneindia.com/rss/kannada-news.xml'],
  ['kn', 'Vijaya Karnataka2', 'https://vijaykarnataka.com/rssfeedsdefault.cms'],
  ['kn', 'Prajavani2', 'https://www.prajavani.net/feed'],
  // ml
  ['ml', 'News18 ML cf', 'https://malayalam.news18.com/commonfeeds/v1/mal/rss/kerala.xml'],
  ['ml', 'Asianet', 'https://www.asianetnews.com/rss/kerala'],
  ['ml', 'Oneindia ML', 'https://malayalam.oneindia.com/rss/malayalam-news.xml'],
  ['ml', 'Mathrubhumi2', 'https://www.mathrubhumi.com/news/kerala?format=feed'],
  ['ml', 'Manorama', 'https://www.onmanorama.com/news/kerala.feeds.onmanorama.rss.xml'],
  // mr
  ['mr', 'TV9 Marathi', 'https://www.tv9marathi.com/feed'],
  ['mr', 'ABP Majha', 'https://marathi.abplive.com/home/feed'],
  ['mr', 'News18 MR cf', 'https://marathi.news18.com/commonfeeds/v1/mar/rss/maharashtra.xml'],
  ['mr', 'Lokmat', 'https://www.lokmat.com/rss/national.xml'],
  ['mr', 'Oneindia MR', 'https://marathi.oneindia.com/rss/marathi-news.xml'],
  // bn
  ['bn', 'TV9 Bangla', 'https://tv9bangla.com/feed'],
  ['bn', 'ABP Ananda', 'https://bengali.abplive.com/home/feed'],
  ['bn', 'News18 BN cf', 'https://bengali.news18.com/commonfeeds/v1/ben/rss/west-bengal.xml'],
  ['bn', 'Oneindia BN', 'https://bengali.oneindia.com/rss/bengali-news.xml'],
  ['bn', 'Zee 24 Ghanta', 'https://zeenews.india.com/bengali/rss/india.xml'],
  // gu
  ['gu', 'TV9 Gujarati', 'https://tv9gujarati.com/feed'],
  ['gu', 'ABP Asmita', 'https://gujarati.abplive.com/home/feed'],
  ['gu', 'News18 GU cf', 'https://gujarati.news18.com/commonfeeds/v1/guj/rss/gujarat.xml'],
  ['gu', 'Oneindia GU', 'https://gujarati.oneindia.com/rss/gujarati-news.xml'],
  ['gu', 'Gujarat Samachar', 'https://www.gujaratsamachar.com/rss/top-stories'],
];

function countItems(xml) {
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const tag = isAtom ? 'entry' : 'item';
  const blocks = xml.match(new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, 'gi')) ?? [];
  let withImg = 0;
  for (const b of blocks) {
    if (
      /<media:content[^>]*url=/i.test(b) ||
      /<media:thumbnail[^>]*url=/i.test(b) ||
      /<enclosure[^>]*url=[^>]*image/i.test(b) ||
      /<enclosure[^>]*image[^>]*url=/i.test(b) ||
      /<img[^>]*src=/i.test(b)
    ) withImg++;
  }
  return { items: blocks.length, withImg };
}

async function test(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    if (!res.ok) return { status: res.status };
    const xml = await res.text();
    return { status: res.status, ...countItems(xml) };
  } catch (e) {
    return { status: 'ERR', err: String(e.name || e) };
  } finally {
    clearTimeout(t);
  }
}

const results = await Promise.all(
  CANDIDATES.map(async ([lang, name, url]) => ({ lang, name, url, ...(await test(url)) })),
);

let curLang = '';
for (const r of results.sort((a, b) => a.lang.localeCompare(b.lang))) {
  if (r.lang !== curLang) {
    curLang = r.lang;
    console.log(`\n=== ${curLang.toUpperCase()} ===`);
  }
  const ok = typeof r.items === 'number' && r.items > 0;
  const imgPct = ok ? Math.round((r.withImg / r.items) * 100) : 0;
  const flag = ok ? (imgPct >= 40 ? '✅IMG' : r.withImg > 0 ? '◐img' : '○noimg') : '❌';
  console.log(
    `${flag} ${r.name.padEnd(20)} status=${String(r.status).padEnd(4)} items=${r.items ?? '-'} img=${r.withImg ?? '-'} (${imgPct}%)  ${r.url}`,
  );
}
