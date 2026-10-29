/**
 * Delimitation Share Card Service (JOB 022)
 *
 * Authority: Master Product Blueprint & PLAN-DOMAIN-1-FOUNDATIONAL-GEOGRAPHY-AND-DELIMITATION-REV-1.0
 *
 * Implements immutable share snapshots, Open Graph metadata formulation,
 * and Server-Side Rendered (SSR) HTML previews with DPDP Act 2023 zero-PII compliance.
 */

import crypto from 'node:crypto';
import type {
  CreateShareCardRequest,
  ShareCardSnapshotDTO,
} from '@kshetra/shared';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// In-memory fallback snapshot store when database is in isolated test mode
const inMemoryShareCache = new Map<string, ShareCardSnapshotDTO>();

// Seed baseline demo cards
inMemoryShareCache.set('share_ts_004_504208', {
  shareId: 'share_ts_004_504208',
  pinCode: '504208',
  stateCode: 'TS',
  constituencyName: 'Mancherial',
  acNo: 4,
  impactType: 'NO_CHANGE',
  headline: 'Mancherial AC 4: Personal Delimitation Assessment',
  summary: 'Boundaries remain statutory under Delimitation Order 2008. Rebalancing frozen until post-2026 census data publication.',
  ogImageUrl: 'https://poligram.in/og/delimitation/TS-4.png',
  canonicalShareUrl: 'https://poligram.in/share/delimitation/share_ts_004_504208',
  createdAt: '2026-10-29T12:00:00.000Z',
});

inMemoryShareCache.set('share_ts_072_509338', {
  shareId: 'share_ts_072_509338',
  pinCode: '509338',
  stateCode: 'TS',
  constituencyName: 'Kodangal',
  acNo: 72,
  impactType: 'NO_CHANGE',
  headline: 'Kodangal AC 72: Personal Delimitation Assessment',
  summary: 'Rural Assembly Constituency Kodangal boundaries are preserved under current constitutional regime. No immediate territory shift.',
  ogImageUrl: 'https://poligram.in/og/delimitation/TS-72.png',
  canonicalShareUrl: 'https://poligram.in/share/delimitation/share_ts_072_509338',
  createdAt: '2026-10-29T12:00:00.000Z',
});

export class DelimitationShareService {
  /**
   * Create an immutable share card snapshot (JOB 022)
   */
  async createShareCard(params: CreateShareCardRequest): Promise<ShareCardSnapshotDTO> {
    const {
      pinCode,
      stateCode,
      constituencyName,
      acNo,
      impactType = 'NO_CHANGE',
      domain = 'poligram.in',
    } = params;

    // Strict validation
    if (!pinCode || !/^[1-9][0-9]{5}$/.test(pinCode)) {
      throw new Error('INVALID_PIN_CODE: Postal code must be exactly 6 digits.');
    }
    if (!stateCode || stateCode.length < 2) {
      throw new Error('INVALID_STATE_CODE: State code required.');
    }
    if (!acNo || acNo < 1 || acNo > 1000) {
      throw new Error('INVALID_AC_NO: Constituency number must be between 1 and 1000.');
    }
    if (!constituencyName || constituencyName.trim().length === 0) {
      throw new Error('INVALID_CONSTITUENCY: Constituency name is required.');
    }

    // DPDP Act 2023: Ensure no PII in headline or summary
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
    const phoneRegex = /(?:\+91|0)?[6-9][0-9]{9}/;

    const rawHeadline = params.headline || `${constituencyName} (AC #${acNo}): Personal Delimitation Assessment`;
    const rawSummary = params.summary || `Personal delimitation assessment for PIN ${pinCode} in ${constituencyName}, ${stateCode}. Boundaries assessed under Articles 82 & 170.`;

    if (emailRegex.test(rawHeadline) || emailRegex.test(rawSummary) || phoneRegex.test(rawHeadline) || phoneRegex.test(rawSummary)) {
      throw new Error('DPDP_VIOLATION: Share card content must not contain personal voter identifiers.');
    }

    const shareId = `share_${stateCode.toLowerCase()}_${acNo}_${pinCode}_${crypto.randomBytes(3).toString('hex')}`;
    const baseHost = domain === 'panin.in' ? 'https://panin.in' : 'https://poligram.in';
    const canonicalShareUrl = `${baseHost}/share/delimitation/${shareId}`;
    const ogImageUrl = `${baseHost}/og/delimitation/${stateCode.toUpperCase()}-${acNo}.png`;
    const nowIso = new Date().toISOString();

    const snapshot: ShareCardSnapshotDTO = {
      shareId,
      pinCode,
      stateCode: stateCode.toUpperCase(),
      constituencyName,
      acNo,
      impactType,
      headline: rawHeadline,
      summary: rawSummary,
      ogImageUrl,
      canonicalShareUrl,
      createdAt: nowIso,
    };

    // Persist to Supabase if available
    if (isSupabaseConfigured) {
      try {
        await supabase.from('delimitation_share_snapshots').insert({
          share_id: snapshot.shareId,
          pin_code: snapshot.pinCode,
          state_code: snapshot.stateCode,
          constituency_name: snapshot.constituencyName,
          ac_no: snapshot.acNo,
          impact_type: snapshot.impactType,
          headline: snapshot.headline,
          summary: snapshot.summary,
          og_image_url: snapshot.ogImageUrl,
          canonical_share_url: snapshot.canonicalShareUrl,
          created_at: snapshot.createdAt,
        });
      } catch {
        // Fall back to memory cache
      }
    }

    inMemoryShareCache.set(shareId, snapshot);
    return snapshot;
  }

  /**
   * Retrieve a share card snapshot by shareId
   */
  async getShareCard(shareId: string): Promise<ShareCardSnapshotDTO | null> {
    if (!shareId) return null;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('delimitation_share_snapshots')
          .select('*')
          .eq('share_id', shareId)
          .single();
        if (!error && data) {
          return {
            shareId: data.share_id,
            pinCode: data.pin_code,
            stateCode: data.state_code,
            constituencyName: data.constituency_name,
            acNo: data.ac_no,
            impactType: data.impact_type,
            headline: data.headline,
            summary: data.summary,
            ogImageUrl: data.og_image_url,
            canonicalShareUrl: data.canonical_share_url,
            createdAt: data.created_at,
            expiresAt: data.expires_at,
          };
        }
      } catch {
        // Fall back to in-memory cache
      }
    }

    return inMemoryShareCache.get(shareId) ?? null;
  }

  /**
   * Render Server-Side (SSR) HTML with Open Graph Meta Tags (JOB 022)
   */
  renderSSRHtml(snapshot: ShareCardSnapshotDTO): string {
    const escape = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const escapedHeadline = escape(snapshot.headline);
    const escapedSummary = escape(snapshot.summary);
    const escapedUrl = escape(snapshot.canonicalShareUrl);
    const escapedImage = escape(snapshot.ogImageUrl);
    const appDeepLink = `kshetra://delimitation/impact?pin=${snapshot.pinCode}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedHeadline} | Poligram Delimitation</title>
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="${escapedHeadline}" />
  <meta property="og:description" content="${escapedSummary}" />
  <meta property="og:image" content="${escapedImage}" />
  <meta property="og:url" content="${escapedUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Poligram by Kshetra" />

  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapedHeadline}" />
  <meta name="twitter:description" content="${escapedSummary}" />
  <meta name="twitter:image" content="${escapedImage}" />

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #0B0F19;
      color: #E2E8F0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .card-container {
      max-width: 560px;
      margin: 24px;
      background: #151D2F;
      border: 1px solid #1E293B;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: rgba(59, 130, 246, 0.15);
      color: #60A5FA;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 22px;
      line-height: 1.3;
      margin: 0 0 16px;
      color: #F8FAFC;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #94A3B8;
      margin: 0 0 24px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 16px;
      background: #0F172A;
      border-radius: 12px;
      margin-bottom: 24px;
      border: 1px solid #1E293B;
    }
    .meta-item-label {
      font-size: 11px;
      color: #64748B;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .meta-item-val {
      font-size: 14px;
      font-weight: 600;
      color: #F1F5F9;
    }
    .cta-btn {
      display: block;
      width: 100%;
      text-align: center;
      padding: 14px 0;
      background: #2563EB;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 14px;
      border-radius: 10px;
      text-decoration: none;
      transition: background 0.2s;
    }
    .cta-btn:hover {
      background: #1D4ED8;
    }
    .secondary-link {
      display: block;
      text-align: center;
      margin-top: 14px;
      font-size: 12px;
      color: #64748B;
      text-decoration: none;
    }
    .secondary-link:hover {
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div class="card-container">
    <div class="badge">Constitutional Delimitation Assessment</div>
    <h1>${escapedHeadline}</h1>
    <p>${escapedSummary}</p>
    <div class="meta-grid">
      <div>
        <div class="meta-item-label">Assembly Constituency</div>
        <div class="meta-item-val">${escape(snapshot.constituencyName)} (#${snapshot.acNo})</div>
      </div>
      <div>
        <div class="meta-item-label">Postal Code</div>
        <div class="meta-item-val">${escape(snapshot.pinCode)}</div>
      </div>
      <div>
        <div class="meta-item-label">State / UT</div>
        <div class="meta-item-val">${escape(snapshot.stateCode)}</div>
      </div>
      <div>
        <div class="meta-item-label">Status Regime</div>
        <div class="meta-item-val">Delimitation Order 2008</div>
      </div>
    </div>
    <a href="${appDeepLink}" class="cta-btn">Open in Kshetra App</a>
    <a href="https://poligram.in/delimitation" class="secondary-link">Explore National Delimitation Map →</a>
  </div>
</body>
</html>`;
  }
}

export const delimitationShareService = new DelimitationShareService();
