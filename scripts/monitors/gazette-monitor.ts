/**
 * eGazette Monitor — Scrapes egazette.gov.in for delimitation-related notifications
 *
 * The Gazette of India is the OFFICIAL source for delimitation orders.
 * When the Delimitation Commission publishes final orders, they appear here first.
 *
 * Strategy:
 * 1. Fetch the extraordinary gazette listing page
 * 2. Parse entries for delimitation-related keywords
 * 3. Compare with previously seen entries (stored in state file)
 * 4. If new entries found → trigger notification pipeline
 *
 * Run: `npx ts-node scripts/monitors/gazette-monitor.ts`
 * Scheduled via: `.github/workflows/delimitation-monitor.yml` (every 6 hours)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ─── CONFIG ───

const GAZETTE_BASE_URL = 'https://egazette.gov.in';
const GAZETTE_SEARCH_PATHS = [
  '/SearchResult.aspx?Category=extraordinary', // Extraordinary gazette (where delimitation orders publish)
  '/SearchResult.aspx?Category=ordinary',       // Ordinary gazette (less likely, but monitor anyway)
];

const DELIMITATION_KEYWORDS = [
  'delimitation',
  'delimit',
  'constituency',
  'constituencies',
  'boundary',
  'boundaries',
  'readjustment',
  'election commission',
  'census',
  'lok sabha seats',
  'assembly seats',
  'scheduled castes order',
  'scheduled tribes order',
  'reservation of seats',
  'article 82',
  'article 170',
  'article 330',
  'article 332',
];

const STATE_FILE = path.join(__dirname, '..', '..', 'data', 'monitors', 'gazette-state.json');

// ─── TYPES ───

interface GazetteEntry {
  id: string;
  title: string;
  date: string;
  category: 'extraordinary' | 'ordinary';
  ministry: string;
  url: string;
  keywords: string[];
  relevanceScore: number;
}

interface MonitorState {
  lastChecked: string;
  lastEntryDate: string;
  seenIds: string[];
  totalChecks: number;
  totalNewEntries: number;
}

interface MonitorResult {
  success: boolean;
  timestamp: string;
  newEntries: GazetteEntry[];
  totalScanned: number;
  errors: string[];
}

// ─── CORE FUNCTIONS ───

/**
 * Fetch HTML content from a URL
 */
function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'User-Agent': 'Kshetra-Delimitation-Monitor/1.0 (research; civic-tech)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      timeout: 30000,
    }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchPage(response.headers.location).then(resolve).catch(reject);
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
 * Parse gazette HTML for entries matching delimitation keywords
 * Note: The actual HTML structure of egazette.gov.in will need to be reverse-engineered.
 * This is a pattern-based parser that extracts entries from typical government listing pages.
 */
function parseGazetteHTML(html: string, category: 'extraordinary' | 'ordinary'): GazetteEntry[] {
  const entries: GazetteEntry[] = [];

  // Pattern 1: Table rows with gazette entries (common in government sites)
  // <tr><td>date</td><td>title/ministry</td><td><a href="...">PDF</a></td></tr>
  const tableRowPattern = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  let match;

  while ((match = tableRowPattern.exec(html)) !== null) {
    const [, col1, col2, col3] = match;
    const text = `${col1} ${col2} ${col3}`.toLowerCase();

    // Check for delimitation keywords
    const matchedKeywords = DELIMITATION_KEYWORDS.filter((kw) => text.includes(kw.toLowerCase()));
    if (matchedKeywords.length === 0) continue;

    // Extract URL from anchor tags
    const urlMatch = /href=["']([^"']+)["']/i.exec(col3 || col2 || col1);
    const url = urlMatch ? `${GAZETTE_BASE_URL}${urlMatch[1]}` : '';

    // Extract date
    const dateMatch = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i.exec(col1);
    const date = dateMatch ? normalizeDate(dateMatch[1]) : new Date().toISOString().split('T')[0];

    // Clean title
    const title = stripHTML(col2 || col1).trim();
    if (!title) continue;

    const entry: GazetteEntry = {
      id: `gazette-${category}-${date}-${hashString(title)}`,
      title,
      date,
      category,
      ministry: extractMinistry(text),
      url,
      keywords: matchedKeywords,
      relevanceScore: computeRelevanceScore(matchedKeywords, text),
    };

    entries.push(entry);
  }

  // Pattern 2: Div/list based entries
  const divPattern = /<div[^>]*class=["'][^"']*gazette[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  while ((match = divPattern.exec(html)) !== null) {
    const text = match[1].toLowerCase();
    const matchedKeywords = DELIMITATION_KEYWORDS.filter((kw) => text.includes(kw.toLowerCase()));
    if (matchedKeywords.length === 0) continue;

    const title = stripHTML(match[1]).trim().slice(0, 200);
    const urlMatch = /href=["']([^"']+)["']/i.exec(match[1]);
    const dateMatch = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i.exec(match[1]);

    entries.push({
      id: `gazette-${category}-${dateMatch?.[1] ?? 'unknown'}-${hashString(title)}`,
      title,
      date: dateMatch ? normalizeDate(dateMatch[1]) : new Date().toISOString().split('T')[0],
      category,
      ministry: extractMinistry(text),
      url: urlMatch ? `${GAZETTE_BASE_URL}${urlMatch[1]}` : '',
      keywords: matchedKeywords,
      relevanceScore: computeRelevanceScore(matchedKeywords, text),
    });
  }

  return entries;
}

/**
 * Compute relevance score (0-100) based on keyword matches and context
 */
function computeRelevanceScore(keywords: string[], text: string): number {
  let score = 0;

  // High-value keywords
  if (keywords.includes('delimitation')) score += 40;
  if (keywords.includes('constituency') || keywords.includes('constituencies')) score += 20;
  if (keywords.includes('boundary') || keywords.includes('boundaries')) score += 15;
  if (keywords.includes('readjustment')) score += 30;
  if (keywords.includes('article 82') || keywords.includes('article 170')) score += 25;

  // Medium-value keywords
  if (keywords.includes('election commission')) score += 10;
  if (keywords.includes('census')) score += 10;
  if (keywords.includes('reservation of seats')) score += 15;

  // Context bonuses
  if (text.includes('delimitation commission')) score += 20;
  if (text.includes('draft order') || text.includes('final order')) score += 15;
  if (text.includes('public hearing') || text.includes('objection')) score += 10;

  return Math.min(100, score);
}

// ─── UTILITY FUNCTIONS ───

function stripHTML(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
}

function normalizeDate(dateStr: string): string {
  const parts = dateStr.split(/[\/-]/);
  if (parts.length !== 3) return dateStr;
  const [d, m, y] = parts;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function extractMinistry(text: string): string {
  if (text.includes('law') && text.includes('justice')) return 'Ministry of Law and Justice';
  if (text.includes('home') || text.includes('affairs')) return 'Ministry of Home Affairs';
  if (text.includes('election')) return 'Election Commission of India';
  if (text.includes('census') || text.includes('registrar')) return 'Registrar General of India';
  return 'Unknown';
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

// ─── STATE MANAGEMENT ───

function loadState(): MonitorState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {
    // Ignore parse errors, start fresh
  }
  return {
    lastChecked: '',
    lastEntryDate: '',
    seenIds: [],
    totalChecks: 0,
    totalNewEntries: 0,
  };
}

function saveState(state: MonitorState): void {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── NOTIFICATION DISPATCH ───

interface NotificationPayload {
  type: 'delimitation_gazette';
  entries: GazetteEntry[];
  timestamp: string;
}

/**
 * Dispatch notifications for new gazette entries.
 * In production, this would:
 * 1. POST to the KSHETRA API notification endpoint
 * 2. Insert into Supabase delimitation_events table
 * 3. Trigger push notifications to subscribed users
 */
async function dispatchNotifications(entries: GazetteEntry[]): Promise<void> {
  if (entries.length === 0) return;

  const payload: NotificationPayload = {
    type: 'delimitation_gazette',
    entries,
    timestamp: new Date().toISOString(),
  };

  // Write to local dispatch log (CI artifact)
  const dispatchFile = path.join(__dirname, '..', '..', 'data', 'monitors', 'gazette-dispatch.json');
  const dir = path.dirname(dispatchFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const existing = fs.existsSync(dispatchFile)
    ? JSON.parse(fs.readFileSync(dispatchFile, 'utf8'))
    : [];
  existing.push(payload);
  fs.writeFileSync(dispatchFile, JSON.stringify(existing, null, 2));

  // If API URL is configured, POST to it
  const apiUrl = process.env.KSHETRA_API_URL;
  if (apiUrl) {
    try {
      const response = await fetch(`${apiUrl}/api/v1/delimitation/monitor-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.KSHETRA_MONITOR_SECRET ?? ''}`,
        },
        body: JSON.stringify(payload),
      });
      console.log(`[gazette-monitor] API dispatch: ${response.status}`);
    } catch (err) {
      console.error('[gazette-monitor] API dispatch failed:', err);
    }
  }

  console.log(`[gazette-monitor] Dispatched ${entries.length} new entries`);
  for (const e of entries) {
    console.log(`  → [${e.relevanceScore}] ${e.date} | ${e.title}`);
  }
}

// ─── MAIN RUNNER ───

export async function runGazetteMonitor(): Promise<MonitorResult> {
  const result: MonitorResult = {
    success: false,
    timestamp: new Date().toISOString(),
    newEntries: [],
    totalScanned: 0,
    errors: [],
  };

  const state = loadState();

  for (const searchPath of GAZETTE_SEARCH_PATHS) {
    const url = `${GAZETTE_BASE_URL}${searchPath}`;
    const category = searchPath.includes('extraordinary') ? 'extraordinary' : 'ordinary';

    try {
      console.log(`[gazette-monitor] Fetching ${category} gazette...`);
      const html = await fetchPage(url);
      const entries = parseGazetteHTML(html, category as 'extraordinary' | 'ordinary');
      result.totalScanned += entries.length;

      // Filter out already-seen entries
      const newEntries = entries.filter((e) => !state.seenIds.includes(e.id));

      // Sort by relevance score descending
      newEntries.sort((a, b) => b.relevanceScore - a.relevanceScore);

      result.newEntries.push(...newEntries);

      // Mark as seen
      for (const e of newEntries) {
        state.seenIds.push(e.id);
      }

      console.log(`[gazette-monitor] ${category}: scanned ${entries.length}, new: ${newEntries.length}`);
    } catch (err: any) {
      const msg = `Failed to fetch ${category} gazette: ${err.message}`;
      result.errors.push(msg);
      console.error(`[gazette-monitor] ${msg}`);
    }
  }

  // Dispatch notifications for high-relevance entries
  const highRelevance = result.newEntries.filter((e) => e.relevanceScore >= 30);
  if (highRelevance.length > 0) {
    await dispatchNotifications(highRelevance);
  }

  // Update state
  state.lastChecked = result.timestamp;
  state.totalChecks += 1;
  state.totalNewEntries += result.newEntries.length;
  if (result.newEntries.length > 0) {
    state.lastEntryDate = result.newEntries[0].date;
  }

  // Keep only last 1000 seen IDs to prevent unbounded growth
  if (state.seenIds.length > 1000) {
    state.seenIds = state.seenIds.slice(-1000);
  }

  saveState(state);
  result.success = result.errors.length === 0;

  console.log(`[gazette-monitor] Complete: ${result.newEntries.length} new, ${result.errors.length} errors`);
  return result;
}

// ─── CLI ENTRY POINT ───

if (require.main === module) {
  runGazetteMonitor()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}
