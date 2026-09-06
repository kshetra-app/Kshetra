import type { FastifyPluginAsync } from 'fastify';

export const manageRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /manage
   * Web Page Manager shell
   * Serves a standalone responsive web dashboard at kshetra.app/manage
   */
  app.get('/manage', async (request, reply) => {
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kshetra — Web Page Manager</title>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    :root {
      --primary: #1E3A8A;
      --primary-accent: #3B82F6;
      --gold: #D97706;
      --gold-light: #FEF3C7;
      --bg: #F8FAFC;
      --card-bg: #FFFFFF;
      --text: #0F172A;
      --text-muted: #64748B;
      --border: #E2E8F0;
      --success: #16A34A;
      --danger: #DC2626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding-bottom: 60px; }
    header { background-color: var(--primary); color: #fff; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .badge { background: #3B82F6; color: #fff; font-size: 11px; padding: 4px 8px; border-radius: 6px; font-weight: 700; text-transform: uppercase; margin-left: 8px; }
    .container { max-width: 900px; margin: 36px auto; padding: 0 20px; }
    .card { background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border); padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h2 { font-size: 18px; margin-bottom: 12px; color: var(--primary); }
    p { color: var(--text-muted); font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
    .page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; background: #E2E8F0; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: var(--primary); }
    .page-info h3 { font-size: 18px; }
    .page-info span { color: var(--text-muted); font-size: 13px; }
    .tag { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .tag-aspirant { background: #EFF6FF; color: #1D4ED8; }
    .tag-verified { background: #DCFCE7; color: #15803D; }
    .tag-pro { background: #FEF3C7; color: #B45309; }
    .btn { background: var(--primary); color: #fff; padding: 10px 18px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; font-size: 14px; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
    .btn-gold { background: linear-gradient(135deg, #D97706, #B45309); color: #fff; }
    .btn-success { background: #16A34A; color: #fff; }
    .btn-danger { background: #DC2626; color: #fff; }
    .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text); }
    .pro-box { border: 2px solid var(--gold); border-radius: 12px; padding: 24px; background: #FFFDF5; }
    .ad-box { border: 2px solid #D97706; border-radius: 12px; padding: 24px; background: #FFFFFF; }
    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-size: 13px; font-weight: 700; margin-bottom: 6px; color: var(--text); }
    .form-input, .form-select { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; background: #fff; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .status-pill { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 12px; text-transform: uppercase; }
    .pill-pending { background: #FEF3C7; color: #B45309; }
    .pill-active { background: #DCFCE7; color: #15803D; }
    .pill-rejected { background: #FEE2E2; color: #B91C1C; }
    .ad-item { border: 1px solid var(--border); border-radius: 8px; padding: 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
    .review-panel { border: 2px dashed #94A3B8; background: #F8FAFC; border-radius: 12px; padding: 20px; margin-top: 24px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">KSHETRA <span class="badge">Page Manager</span></div>
    <div style="display: flex; gap: 14px; align-items: center;">
      <a href="/ad-library" target="_blank" style="color: #fff; font-size: 12px; text-decoration: underline;">Public Ad Library ↗</a>
      <div id="user-status" style="font-size: 13px;">Logged in as: <strong>demo-leader@kshetra.app</strong></div>
    </div>
  </header>

  <div class="container">
    <!-- Page Header Info -->
    <div class="card">
      <div class="page-header">
        <div class="avatar">YR</div>
        <div class="page-info">
          <h3>Youth for Hyderabad <span class="tag tag-aspirant">Aspirant</span> <span class="tag tag-verified">Verified</span> <span id="pro-badge" class="tag tag-pro" style="display:none;">Pro Active</span></h3>
          <span>@youth_for_hyd · Assembly Constituency: Serilingampally (TS-AC-67)</span>
        </div>
      </div>
      <p>Manage your political profile, broadcast constituency manifestos, and promote approved political communications under Election Commission (ECI) / MCMC guidelines.</p>
    </div>

    <!-- LANE 2: Political Ad Promotion -->
    <div class="card ad-box">
      <h2>⚖️ Promote Post (Lane 2 Political Promotion)</h2>
      <p>ECI & Media Certification & Monitoring Committee (MCMC) compliant ad campaigns. Every political ad requires an authorized MCMC clearance certificate and manual compliance review.</p>

      <div id="ad-submit-form">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Target Post ID</label>
            <input type="text" id="adPostId" class="form-input" placeholder="e.g. post-101" value="post-101">
          </div>
          <div class="form-group">
            <label class="form-label">MCMC Certificate ID / Reference</label>
            <input type="text" id="adMcmcId" class="form-input" placeholder="e.g. ECI/MCMC/2026/TS/0893">
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Promotion Budget (INR)</label>
            <input type="number" id="adAmount" class="form-input" placeholder="e.g. 5000" value="5000">
          </div>
          <div class="form-group">
            <label class="form-label">Geographic Target Scope</label>
            <select id="adScope" class="form-select">
              <option value="constituency">My Constituency (TS-AC-67)</option>
              <option value="state">Statewide (Telangana)</option>
            </select>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
          <button id="submitAdBtn" class="btn btn-gold" onclick="handleSubmitPoliticalAd()">
            Submit for MCMC Compliance Review
          </button>
          <span style="font-size: 12px; color: var(--text-muted);">Status will start as <strong>Pending Human Certification</strong></span>
        </div>
      </div>

      <div style="margin-top: 24px;">
        <h3 style="font-size: 15px; margin-bottom: 12px; color: var(--text);">Campaign Submissions for this Page</h3>
        <div id="pageAdsList">
          <div class="ad-item">
            <div>
              <strong>Post: post-101</strong> · MCMC: ECI/MCMC/2026/TS/0891 · ₹2,500
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Scope: CONSTITUENCY (TS-AC-67) · Impressions: 1,420</div>
            </div>
            <span class="status-pill pill-active">Active</span>
          </div>
          <div class="ad-item">
            <div>
              <strong>Post: post-102</strong> · MCMC: ECI/MCMC/2026/TS/0892 · ₹5,000
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Scope: STATE (TS) · Under review</div>
            </div>
            <span class="status-pill pill-pending">Pending Review</span>
          </div>
        </div>
      </div>

      <!-- Human Compliance Reviewer Console -->
      <div class="review-panel">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 15px; color: var(--primary);">🛡️ Compliance Review Queue (Admin / Reviewer Only)</h3>
          <button class="btn btn-outline" style="font-size: 12px; padding: 6px 12px;" onclick="loadReviewQueue()">Refresh Queue</button>
        </div>
        <p style="font-size: 13px; margin-bottom: 12px;">Human compliance action required. Ads can <strong>never</strong> become certified automatically.</p>
        <div id="reviewQueueList">
          <!-- Populated dynamically -->
        </div>
      </div>
    </div>

    <!-- Page Pro Subscription (Razorpay) -->
    <div class="card pro-box">
      <h2>⭐ Kshetra Page Pro</h2>
      <p>Accelerate your political and civic reach with advanced tools built specifically for candidates, leaders, and political parties.</p>
      
      <div id="pro-status-container" style="margin-bottom: 16px;">
        <span id="current-plan-status" class="status-pill" style="background:#E2E8F0; color:#475569;">Free Tier Active</span>
      </div>

      <div style="margin-top: 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px;">
        <button id="buy-monthly-btn" class="btn btn-gold" onclick="handlePurchasePlan('monthly', 49900)">Page Pro Monthly (₹499/mo)</button>
        <button id="buy-annual-btn" class="btn" style="background: #15803D; color: #fff;" onclick="handlePurchasePlan('annual', 499900)">Page Pro Annual (₹4,999/yr — Save 17%)</button>
      </div>
    </div>
  </div>

  <script>
    const PAGE_ID = 'demo-page';

    async function checkEntitlement() {
      try {
        const res = await fetch('/api/v1/pages/' + PAGE_ID + '/entitlement');
        const data = await res.json();
        if (data && data.isPro) {
          document.getElementById('pro-badge').style.display = 'inline-block';
          document.getElementById('current-plan-status').textContent = 'Page Pro Active (Expires: ' + new Date(data.expiresAt).toLocaleDateString() + ')';
          document.getElementById('current-plan-status').style.background = '#DCFCE7';
          document.getElementById('current-plan-status').style.color = '#15803D';
          const mBtn = document.getElementById('buy-monthly-btn');
          const aBtn = document.getElementById('buy-annual-btn');
          if (mBtn) { mBtn.textContent = 'Pro Active'; mBtn.disabled = true; mBtn.style.opacity = '0.6'; }
          if (aBtn) { aBtn.textContent = 'Pro Active'; aBtn.disabled = true; aBtn.style.opacity = '0.6'; }
        }
      } catch (err) {
        console.error('Failed to load entitlement', err);
      }
    }

    async function handleSubmitPoliticalAd() {
      const postId = document.getElementById('adPostId').value.trim();
      const mcmcId = document.getElementById('adMcmcId').value.trim();
      const amountPaise = (parseFloat(document.getElementById('adAmount').value) || 0) * 100;
      const scope = document.getElementById('adScope').value;
      const targetVal = scope === 'constituency' ? 'TS-AC-67' : 'TS';

      if (!postId || !mcmcId || amountPaise <= 0) {
        alert('Please provide valid Post ID, MCMC Certificate ID, and Promotion Budget.');
        return;
      }

      const btn = document.getElementById('submitAdBtn');
      btn.disabled = true;
      btn.textContent = 'Submitting to MCMC Registry...';

      try {
        const res = await fetch('/api/v1/pages/' + PAGE_ID + '/political-ads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'demo-leader-user',
            'x-user-role': 'politician'
          },
          body: JSON.stringify({
            postId,
            mcmcCertificateId: mcmcId,
            amountPaid: amountPaise,
            targetScope: scope,
            targetValue: targetVal
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to submit ad promotion');
        }

        alert('Ad promotion submitted successfully! Initial status: Pending Human Certification.');
        // Append to page ads list
        const list = document.getElementById('pageAdsList');
        const item = document.createElement('div');
        item.className = 'ad-item';
        item.innerHTML = '<div><strong>Post: ' + postId + '</strong> · MCMC: ' + mcmcId + ' · ₹' + (amountPaise / 100).toLocaleString('en-IN') +
          '<div style=\"font-size: 12px; color: var(--text-muted); margin-top: 2px;\">Scope: ' + scope.toUpperCase() + ' (' + targetVal + ') · Pending Human Certification</div></div>' +
          '<span class=\"status-pill pill-pending\">Pending Review</span>';
        list.prepend(item);

        document.getElementById('adMcmcId').value = '';
        loadReviewQueue();
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit for MCMC Compliance Review';
      }
    }

    async function loadReviewQueue() {
      const container = document.getElementById('reviewQueueList');
      try {
        const res = await fetch('/api/v1/admin/political-ads/review-queue', {
          headers: {
            'x-user-id': 'admin-compliance-1',
            'x-user-role': 'admin'
          }
        });
        const data = await res.json();
        if (!data.queue || data.queue.length === 0) {
          container.innerHTML = '<div style=\"padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;\">No ads awaiting compliance certification.</div>';
          return;
        }

        container.innerHTML = data.queue.map(ad => {
          return '<div class=\"ad-item\" id=\"review-ad-' + ad.id + '\">' +
            '<div>' +
              '<strong>Page: ' + (ad.pages?.title || ad.page_id) + '</strong> (Post: ' + ad.post_id + ')<br>' +
              '<span style=\"font-size: 12px; color: var(--text-muted);\">MCMC: ' + ad.mcmc_certificate_id + ' · Budget: ₹' + (ad.amount_paid / 100).toLocaleString('en-IN') + ' · ' + (ad.target_scope || '').toUpperCase() + ' (' + (ad.target_value || '') + ')</span>' +
            '</div>' +
            '<div style=\"display: flex; gap: 8px;\">' +
              '<button class=\"btn btn-success\" style=\"font-size: 12px; padding: 6px 12px;\" onclick=\"handleCertifyAd(\\'' + ad.id + '\\', \\'certify\\')\">Certify & Activate</button>' +
              '<button class=\"btn btn-danger\" style=\"font-size: 12px; padding: 6px 12px;\" onclick=\"handleCertifyAd(\\'' + ad.id + '\\', \\'reject\\')\">Reject</button>' +
            '</div>' +
          '</div>';
        }).join('');
      } catch (err) {
        container.innerHTML = '<div style=\"color: var(--danger); font-size: 13px;\">Failed to load review queue.</div>';
      }
    }

    async function handleCertifyAd(adId, action) {
      if (!confirm('Confirm ' + action.toUpperCase() + ' for this political promotion? This compliance action is logged with your reviewer ID.')) {
        return;
      }

      try {
        const res = await fetch('/api/v1/admin/political-ads/' + adId + '/certify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'admin-compliance-1',
            'x-user-role': 'admin'
          },
          body: JSON.stringify({ action })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Certification failed');
        }

        alert('Action complete: ' + data.message);
        loadReviewQueue();
      } catch (err) {
        alert('Failed to certify ad: ' + err.message);
      }
    }

    async function handlePurchasePlan(billingCycle, amountPaise) {
      alert('Razorpay integration initiated for Page Pro: ' + billingCycle);
    }

    checkEntitlement();
    loadReviewQueue();
  </script>
</body>
</html>`;
  });
};
