/**
 * ECI Monitor — Tracks Election Commission of India for delimitation updates
 *
 * eci.gov.in is the primary authority for constituency data.
 * Monitors for:
 * - Delimitation-related press releases
 * - Boundary revision notifications
 * - Draft proposals and public consultation notices
 * - State-wise constituency data updates
 *
 * Run: `npx ts-node scripts/monitors/eci-monitor.ts`
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ─── CONFIG ───

const ECI_BASE_URL = 'https://eci.gov.in';
const ECI_MONITOR_PATHS = [
  '/press-releases',
  '/current-general-elections',
  '/delimitation',
  '/news',
];

const ECI_KEYWORDS = [
  'delimitation',
  'boundary',
  'constituency revision',
  'seat allocation',
  'census',
  'readjustment',
  'draft proposal',
  'public hearing',
  'gazette notification',
  'new constituency',
  'reservation',
  'sc/st seats',
];

const STATE_FILE = path.join(__dirname, '..', '..', 'data', 'monitors', 'eci-state.json');

// ─── TYPES ───

interface ECIEntry {
  id: string;
  title: string;
  date: string;
  url: string;
  section: string;
  keywords: string[];
  relevanceScore: number;
  contentHash: string;
}

interface ECIMonitorState {
  lastChecked: string;
  seenIds: string[];
  contentHashes: Record<string, string>; // URL → hash for diff detection
  totalChecks: number;
}

interface ECIMonitorResult {
  success: boolean;
  timestamp: string;
  newEntries: ECIEntry[];
  changedPages: string[];
  errors: string[];
}

// ─── CORE FUNCTIONS ───

function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Kshetra-Delimitation-Monitor/1.0 (research; civic-tech)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 30000,
    }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const redirect = response.headers.location.startsWith('http')
          ? response.headers.location
          : `${ECI_BASE_URL}${response.headers.location}`;
        fetchPage(redirect).then(resolve).catch(reject);
        return;
      }
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => resolve(data));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.on('timeout', () => { request.destroy(); reject(new Error('Request timeout')); });
  });
}

/**
 * Compute a simple content hash for change detection
 */
function computeContentHash(html: string): string {
  // Strip volatile elements (timestamps, session IDs) and hash the rest
  const normalized = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Parse ECI HTML for delimitation-related entries
 */
function parseECIPage(html: string, section: string): ECIEntry[] {
  const entries: ECIEntry[] = [];
  const text = html.toLowerCase();

  // Pattern: Press releases / news items in list or table format
  // <a href="/press-releases/xxx">Title</a> <span>date</span>
  const linkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    const [, href, linkText] = match;
    const title = stripHTML(linkText).trim();
    if (!title || title.length < 10) continue;

    const titleLower = title.toLowerCase();
    const matchedKeywords = ECI_KEYWORDS.filter((kw) => titleLower.includes(kw));
    if (matchedKeywords.length === 0) continue;

    // Extract date near the link
    const contextStart = Math.max(0, match.index - 200);
    const contextEnd = Math.min(html.length, match.index + match[0].length + 200);
    const context = html.slice(contextStart, contextEnd);
    const dateMatch = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(\w+ \d{1,2},? \d{4})/i.exec(context);
    const date = dateMatch ? normalizeDate(dateMatch[0]) : new Date().toISOString().split('T')[0];

    const url = href.startsWith('http') ? href : `${ECI_BASE_URL}${href}`;

    entries.push({
      id: `eci-${section}-${hashString(title + date)}`,
      title,
      date,
      url,
      section,
      keywords: matchedKeywords,
      relevanceScore: computeRelevance(matchedKeywords, titleLower),
      contentHash: hashString(title),
    });
  }

  return entries;
}

function computeRelevance(keywords: string[], text: string): number {
  let score = 0;
  if (keywords.includes('delimitation')) score += 40;
  if (keywords.includes('boundary')) score += 20;
  if (keywords.includes('draft proposal')) score += 35;
  if (keywords.includes('public hearing')) score += 25;
  if (keywords.includes('gazette notification')) score += 30;
  if (keywords.includes('seat allocation')) score += 25;
  if (keywords.includes('new constituency')) score += 20;
  if (text.includes('delimitation commission')) score += 20;
  if (text.includes('state assembly')) score += 10;
  if (text.includes('lok sabha')) score += 10;
  return Math.min(100, score);
}

// ─── UTILITIES ───

function stripHTML(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
}

function normalizeDate(dateStr: string): string {
  // Handle "DD/MM/YYYY" or "Month DD, YYYY"
  const slashParts = dateStr.split(/[\/-]/);
  if (slashParts.length === 3) {
    const [d, m, y] = slashParts;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Try Date parse for "Month DD, YYYY" format
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
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

// ─── STATE MANAGEMENT ───

function loadState(): ECIMonitorState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch { /* start fresh */ }
  return { lastChecked: '', seenIds: [], contentHashes: {}, totalChecks: 0 };
}

function saveState(state: ECIMonitorState): void {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── NOTIFICATION ───

async function dispatchECIAlerts(entries: ECIEntry[]): Promise<void> {
  if (entries.length === 0) return;

  const dispatchFile = path.join(__dirname, '..', '..', 'data', 'monitors', 'eci-dispatch.json');
  const dir = path.dirname(dispatchFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const payload = { type: 'delimitation_eci', entries, timestamp: new Date().toISOString() };
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
      console.error('[eci-monitor] API dispatch failed:', err);
    }
  }

  console.log(`[eci-monitor] Dispatched ${entries.length} new entries`);
}

// ─── MAIN ───

export async function runECIMonitor(): Promise<ECIMonitorResult> {
  const result: ECIMonitorResult = {
    success: false,
    timestamp: new Date().toISOString(),
    newEntries: [],
    changedPages: [],
    errors: [],
  };

  const state = loadState();

  for (const monitorPath of ECI_MONITOR_PATHS) {
    const url = `${ECI_BASE_URL}${monitorPath}`;

    try {
      console.log(`[eci-monitor] Checking ${monitorPath}...`);
      const html = await fetchPage(url);

      // Content diff detection
      const hash = computeContentHash(html);
      const prevHash = state.contentHashes[url];
      if (prevHash && prevHash !== hash) {
        result.changedPages.push(monitorPath);
        console.log(`[eci-monitor] CHANGE DETECTED on ${monitorPath}`);
      }
      state.contentHashes[url] = hash;

      // Parse for delimitation entries
      const entries = parseECIPage(html, monitorPath);
      const newEntries = entries.filter((e) => !state.seenIds.includes(e.id));
      result.newEntries.push(...newEntries);

      for (const e of newEntries) {
        state.seenIds.push(e.id);
      }
    } catch (err: any) {
      result.errors.push(`${monitorPath}: ${err.message}`);
      console.error(`[eci-monitor] Error on ${monitorPath}: ${err.message}`);
    }
  }

  // Dispatch high-relevance alerts
  const highRelevance = result.newEntries.filter((e) => e.relevanceScore >= 30);
  if (highRelevance.length > 0 || result.changedPages.length > 0) {
    await dispatchECIAlerts(highRelevance);
  }

  // Update state
  state.lastChecked = result.timestamp;
  state.totalChecks += 1;
  if (state.seenIds.length > 1000) state.seenIds = state.seenIds.slice(-1000);
  saveState(state);

  result.success = result.errors.length === 0;
  console.log(`[eci-monitor] Complete: ${result.newEntries.length} new, ${result.changedPages.length} changed pages`);
  return result;
}

if (require.main === module) {
  runECIMonitor()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(r.success ? 0 : 1); })
    .catch((e) => { console.error('Fatal:', e); process.exit(1); });
}
