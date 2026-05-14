/**
 * Shared Utilities for all scrapers
 * ══════════════════════════════════════════════════════════════════════
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { UA, DELAY_MS, TIMEOUT_MS } = require('./config');

// ── Sleep ──────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms || DELAY_MS)); }

// ── HTTP GET (follows redirects, returns string or null) ───────────────
function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: { 'User-Agent': options.ua || UA, ...(options.headers || {}) },
      timeout: options.timeout || TIMEOUT_MS,
    };
    mod.get(opts, res => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        const loc = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${u.protocol}//${u.hostname}${res.headers.location}`;
        res.resume();
        return httpGet(loc, options).then(resolve, reject);
      }
      if (res.statusCode !== 200) { resolve(null); res.resume(); return; }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject).on('timeout', function () { this.destroy(); reject(new Error('timeout')); });
  });
}

// ── HTTP HEAD (returns status code) ────────────────────────────────────
function httpHead(url) {
  return new Promise(resolve => {
    try {
      const u = new URL(url);
      const mod = u.protocol === 'https:' ? https : http;
      const req = mod.request({
        hostname: u.hostname, path: u.pathname + u.search,
        method: 'HEAD', headers: { 'User-Agent': UA }, timeout: 10000,
      }, res => resolve(res.statusCode));
      req.on('error', () => resolve(0));
      req.on('timeout', () => { req.destroy(); resolve(0); });
      req.end();
    } catch { resolve(0); }
  });
}

// ── Fuzzy name matching ────────────────────────────────────────────────
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/dr\.|mr\.|mrs\.|smt\.|sri\.|shri\./gi, '')
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 1)
    .sort()
    .join(' ');
}

function nameSimilarity(a, b) {
  const wordsA = normalizeName(a).split(' ');
  const wordsB = normalizeName(b).split(' ');
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

function findBestMatch(name, candidates, threshold = 0.5) {
  let best = null, bestScore = 0;
  for (const c of candidates) {
    const score = nameSimilarity(name, c);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore >= threshold ? { match: best, score: bestScore } : { match: null, score: bestScore };
}

// ── Parse Indian currency amounts ──────────────────────────────────────
function parseINR(str) {
  if (!str) return 0;
  return parseInt(str.replace(/,/g, ''), 10) || 0;
}

// ── Normalize party names ──────────────────────────────────────────────
const PARTY_MAP = {
  'indian national congress': 'INC',
  'bharatiya janata party': 'BJP',
  'bharat rashtra samithi': 'BRS',
  'telangana rashtra samithi': 'TRS',
  'all india majlis-e-ittehadul muslimeen': 'AIMIM',
  'communist party of india (marxist)': 'CPI(M)',
  'communist party of india': 'CPI',
  'telugu desam party': 'TDP',
  'yuvajana sramika rythu congress party': 'YSRCP',
  'ysr congress party': 'YSRCP',
  'janata dal (secular)': 'JD(S)',
  'janata dal (united)': 'JD(U)',
  'shiv sena': 'SHS',
  'shiv sena (uddhav balasaheb thackrey)': 'SHS(UBT)',
  'nationalist congress party': 'NCP',
  'nationalist congress party - sharadchandra pawar': 'NCP(SP)',
  'samajwadi party': 'SP',
  'bahujan samaj party': 'BSP',
  'dravida munnetra kazhagam': 'DMK',
  'all india anna dravida munnetra kazhagam': 'AIADMK',
  'indian union muslim league': 'IUML',
  'all india trinamool congress': 'TMC',
  'aam aadmi party': 'AAP',
  'biju janata dal': 'BJD',
  'rashtriya janata dal': 'RJD',
  'janata dal': 'JD',
  'lok janshakti party': 'LJP',
  'independant': 'IND',
  'independent': 'IND',
};

function normalizeParty(partyStr) {
  if (!partyStr) return 'IND';
  const lower = partyStr.trim().toLowerCase();
  if (PARTY_MAP[lower]) return PARTY_MAP[lower];
  // Check partial matches
  for (const [key, val] of Object.entries(PARTY_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  // Extract abbreviation from parentheses
  const abbr = partyStr.match(/\(([A-Z]{2,})\)/);
  if (abbr) return abbr[1];
  return partyStr.substring(0, 15).trim();
}

// ── Map education strings ──────────────────────────────────────────────
function mapEducation(eduStr) {
  if (!eduStr) return 'others';
  const e = eduStr.toLowerCase();
  if (e.includes('doctorate') || e.includes('phd') || e.includes('ph.d')) return 'doctorate';
  if (e.includes('post graduate') || e.includes('postgraduate')) return 'post_graduate';
  if (e.includes('professional')) return 'professional';
  if (e.includes('graduate')) return 'graduate';
  if (e.includes('12th') || e.includes('higher secondary') || e.includes('hsc')) return '12th_pass';
  if (e.includes('10th') || e.includes('secondary') || e.includes('ssc') || e.includes('matric')) return '10th_pass';
  if (e.includes('8th')) return '8th_pass';
  if (e.includes('5th')) return '5th_pass';
  if (e.includes('literate')) return 'literate';
  if (e.includes('illiterate')) return 'illiterate';
  return 'others';
}

// ── Ensure directory exists ────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Write JSON with pretty print ───────────────────────────────────────
function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ── Read JSON safely ───────────────────────────────────────────────────
function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return null; }
}

// ── Progress logger ────────────────────────────────────────────────────
function progressLog(current, total, msg) {
  process.stdout.write(`\r   [${current}/${total}] ${msg.substring(0, 60).padEnd(60)}`);
}

module.exports = {
  sleep, httpGet, httpHead,
  normalizeName, nameSimilarity, findBestMatch,
  parseINR, normalizeParty, mapEducation,
  ensureDir, writeJSON, readJSON, progressLog,
};
