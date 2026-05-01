/**
 * Parliament Monitor — Tracks Lok Sabha & Rajya Sabha for delimitation mentions
 *
 * Monitors parliamentary proceedings, questions, and committee reports
 * for any discussion related to delimitation, census, or boundary changes.
 *
 * Sources:
 * - sansad.in (official Parliament digital platform)
 * - prsindia.org (PRS Legislative Research)
 * - Lok Sabha / Rajya Sabha question databases
 *
 * Run: `npx ts-node scripts/monitors/parliament-monitor.ts`
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ─── CONFIG ───

const SOURCES = [
  {
    name: 'PRS Legislative Research',
    baseUrl: 'https://prsindia.org',
    paths: ['/billtrack', '/theprsblog'],
    reliability: 90,
  },
  {
    name: 'Sansad TV / Parliament',
    baseUrl: 'https://sansad.in',
    paths: ['/ls/questions', '/rs/questions'],
    reliability: 95,
  },
];

const PARLIAMENT_KEYWORDS = [
  'delimitation',
  'delimitation commission',
  'boundary redraw',
  'constituency revision',
  'article 82',
  'article 170',
  'census 2026',
  'census 2025',
  'seat allocation',
  'lok sabha seats',
  'assembly seats',
  'population freeze',
  'southern states seats',
  'northern states seats',
  'constitutional amendment',
  'reservation of constituencies',
  '84th amendment',
  '87th amendment',
];

const STATE_FILE = path.join(__dirname, '..', '..', 'data', 'monitors', 'parliament-state.json');

// ─── TYPES ───

interface ParliamentEntry {
  id: string;
  title: string;
  date: string;
  source: string;
  url: string;
  type: 'question' | 'debate' | 'bill' | 'committee_report' | 'blog' | 'news';
  house: 'lok_sabha' | 'rajya_sabha' | 'both' | 'unknown';
  keywords: string[];
  relevanceScore: number;
}

interface ParliamentMonitorState {
  lastChecked: string;
  seenIds: string[];
  totalChecks: number;
}

interface ParliamentMonitorResult {
  success: boolean;
  timestamp: string;
  newEntries: ParliamentEntry[];
  errors: string[];
}

// ─── CORE ───

function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : https;
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Kshetra-Delimitation-Monitor/1.0 (research; civic-tech)',
        'Accept': 'text/html,application/xhtml+xml,application/json',
      },
      timeout: 30000,
    }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const redirect = response.headers.location.startsWith('http')
          ? response.headers.location
          : `${url.split('/').slice(0, 3).join('/')}${response.headers.location}`;
        fetchPage(redirect).then(resolve).catch(reject);
        return;
      }
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => resolve(data));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
  });
}

function parseHTMLForEntries(html: string, source: string, baseUrl: string): ParliamentEntry[] {
  const entries: ParliamentEntry[] = [];

  // Extract all links with their text
  const linkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    const [, href, linkText] = match;
    const title = stripHTML(linkText).trim();
    if (!title || title.length < 15) continue;

    const titleLower = title.toLowerCase();
    const matchedKeywords = PARLIAMENT_KEYWORDS.filter((kw) => titleLower.includes(kw));
    if (matchedKeywords.length === 0) continue;

    const url = href.startsWith('http') ? href : `${baseUrl}${href}`;
    const date = extractDateNear(html, match.index);
    const type = inferEntryType(url, title);
    const house = inferHouse(url, title);

    entries.push({
      id: `parl-${hashString(title + date)}`,
      title: title.slice(0, 300),
      date,
      source,
      url,
      type,
      house,
      keywords: matchedKeywords,
      relevanceScore: computeRelevance(matchedKeywords, titleLower),
    });
  }

  return entries;
}

function computeRelevance(keywords: string[], text: string): number {
  let score = 0;
  if (keywords.includes('delimitation')) score += 35;
  if (keywords.includes('delimitation commission')) score += 40;
  if (keywords.includes('boundary redraw')) score += 30;
  if (keywords.includes('article 82') || keywords.includes('article 170')) score += 25;
  if (keywords.includes('census 2026') || keywords.includes('census 2025')) score += 20;
  if (keywords.includes('seat allocation')) score += 20;
  if (keywords.includes('84th amendment') || keywords.includes('87th amendment')) score += 25;
  if (keywords.includes('population freeze')) score += 30;
  if (text.includes('bill') && text.includes('delimitation')) score += 15;
  return Math.min(100, score);
}

function inferEntryType(url: string, title: string): ParliamentEntry['type'] {
  if (url.includes('question') || title.toLowerCase().includes('starred question')) return 'question';
  if (url.includes('bill') || title.toLowerCase().includes('bill')) return 'bill';
  if (url.includes('committee') || title.toLowerCase().includes('committee')) return 'committee_report';
  if (url.includes('debate') || title.toLowerCase().includes('debate')) return 'debate';
  if (url.includes('blog')) return 'blog';
  return 'news';
}

function inferHouse(url: string, title: string): ParliamentEntry['house'] {
  const lower = (url + title).toLowerCase();
  if (lower.includes('lok sabha') || lower.includes('/ls/')) return 'lok_sabha';
  if (lower.includes('rajya sabha') || lower.includes('/rs/')) return 'rajya_sabha';
  return 'unknown';
}

// ─── UTILITIES ───

function stripHTML(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
}

function extractDateNear(html: string, index: number): string {
  const context = html.slice(Math.max(0, index - 300), Math.min(html.length, index + 300));
  const dateMatch = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(\w+ \d{1,2},? \d{4})/i.exec(context);
  if (dateMatch) {
    const parsed = new Date(dateMatch[0]);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

// ─── STATE ───

function loadState(): ParliamentMonitorState {
  try {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch { /* fresh */ }
  return { lastChecked: '', seenIds: [], totalChecks: 0 };
}

function saveState(state: ParliamentMonitorState): void {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── DISPATCH ───

async function dispatchAlerts(entries: ParliamentEntry[]): Promise<void> {
  if (entries.length === 0) return;

  const dispatchFile = path.join(__dirname, '..', '..', 'data', 'monitors', 'parliament-dispatch.json');
  const dir = path.dirname(dispatchFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const payload = { type: 'delimitation_parliament', entries, timestamp: new Date().toISOString() };
  const existing = fs.existsSync(dispatchFile) ? JSON.parse(fs.readFileSync(dispatchFile, 'utf8')) : [];
  existing.push(payload);
  fs.writeFileSync(dispatchFile, JSON.stringify(existing, null, 2));

  const apiUrl = process.env.KSHETRA_API_URL;
  if (apiUrl) {
    try {
      await fetch(`${apiUrl}/api/v1/delimitation/monitor-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.KSHETRA_MONITOR_SECRET ?? ''}` },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('[parliament-monitor] API dispatch failed:', err);
    }
  }

  console.log(`[parliament-monitor] Dispatched ${entries.length} entries`);
}

// ─── MAIN ───

export async function runParliamentMonitor(): Promise<ParliamentMonitorResult> {
  const result: ParliamentMonitorResult = {
    success: false,
    timestamp: new Date().toISOString(),
    newEntries: [],
    errors: [],
  };

  const state = loadState();

  for (const source of SOURCES) {
    for (const monitorPath of source.paths) {
      const url = `${source.baseUrl}${monitorPath}`;
      try {
        console.log(`[parliament-monitor] Checking ${source.name} ${monitorPath}...`);
        const html = await fetchPage(url);
        const entries = parseHTMLForEntries(html, source.name, source.baseUrl);
        const newEntries = entries.filter((e) => !state.seenIds.includes(e.id));
        result.newEntries.push(...newEntries);
        for (const e of newEntries) state.seenIds.push(e.id);
      } catch (err: any) {
        result.errors.push(`${source.name} ${monitorPath}: ${err.message}`);
        console.error(`[parliament-monitor] Error: ${err.message}`);
      }
    }
  }

  // Dispatch
  const highRelevance = result.newEntries.filter((e) => e.relevanceScore >= 30);
  if (highRelevance.length > 0) await dispatchAlerts(highRelevance);

  state.lastChecked = result.timestamp;
  state.totalChecks += 1;
  if (state.seenIds.length > 1000) state.seenIds = state.seenIds.slice(-1000);
  saveState(state);

  result.success = result.errors.length === 0;
  console.log(`[parliament-monitor] Complete: ${result.newEntries.length} new entries`);
  return result;
}

if (require.main === module) {
  runParliamentMonitor()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(r.success ? 0 : 1); })
    .catch((e) => { console.error('Fatal:', e); process.exit(1); });
}
