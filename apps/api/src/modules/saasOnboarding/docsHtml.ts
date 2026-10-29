/**
 * apps/api/src/modules/saasOnboarding/docsHtml.ts
 *
 * Milestone W051 — B2B Political SaaS Customer Acquisition & Developer Portal
 * Futuristic, responsive, interactive developer portal HTML template.
 */

export function renderDeveloperPortalHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PanIN Developer Portal | Institutional Political Data & Delimitation API</title>
  <meta name="description" content="Authoritative B2B Political SaaS & Public/Partner Developer API for India. 63,045 certified entities, statutory electoral geography, historical candidacies, demographics, and delimitation simulations.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #090d16;
      --bg-surface: #101726;
      --bg-card: #151e32;
      --border-subtle: #1e293b;
      --border-accent: #3b82f6;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #3b82f6;
      --primary-glow: rgba(59, 130, 246, 0.25);
      --emerald: #10b981;
      --emerald-glow: rgba(16, 185, 129, 0.2);
      --amber: #f59e0b;
      --purple: #8b5cf6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      line-height: 1.6;
      overflow-x: hidden;
    }
    code, pre {
      font-family: 'Fira Code', monospace;
    }
    header {
      border-bottom: 1px solid var(--border-subtle);
      background: rgba(16, 23, 38, 0.85);
      backdrop-filter: blur(16px);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo-badge {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      color: var(--text-main);
    }
    .badge-icon {
      width: 2.25rem;
      height: 2.25rem;
      background: linear-gradient(135deg, #3b82f6, #10b981);
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.1rem;
      box-shadow: 0 0 15px var(--primary-glow);
    }
    .logo-text { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.025em; }
    .nav-links { display: flex; gap: 1.5rem; align-items: center; }
    .nav-link { color: var(--text-muted); text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: color 0.2s; }
    .nav-link:hover { color: var(--text-main); }
    .btn-cta {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #fff;
      padding: 0.6rem 1.25rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.875rem;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 0 20px var(--primary-glow);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .btn-cta:hover { transform: translateY(-1px); box-shadow: 0 0 25px rgba(59, 130, 246, 0.4); }
    .hero {
      padding: 5rem 2rem 3rem;
      max-width: 1200px;
      margin: 0 auto;
      text-align: center;
    }
    .pill-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.85rem;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--emerald);
      margin-bottom: 1.5rem;
    }
    .pill-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--emerald); box-shadow: 0 0 8px var(--emerald); }
    .hero h1 {
      font-size: 3.25rem;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.03em;
      margin-bottom: 1.25rem;
      background: linear-gradient(180deg, #fff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero p {
      font-size: 1.15rem;
      color: var(--text-muted);
      max-width: 780px;
      margin: 0 auto 2.5rem;
    }
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      max-width: 1100px;
      margin: 0 auto 4rem;
    }
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 1rem;
      padding: 1.5rem;
      text-align: center;
    }
    .stat-val { font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 0.25rem; }
    .stat-label { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .section-title { font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; letter-spacing: -0.02em; }
    .section-desc { color: var(--text-muted); margin-bottom: 2rem; font-size: 1.05rem; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 4rem; }
    @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } .hero h1 { font-size: 2.25rem; } }
    .card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 1rem;
      padding: 2rem;
    }
    .plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 4rem; }
    .plan-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 1.25rem;
      padding: 2.25rem;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .plan-card.popular {
      border-color: var(--primary);
      box-shadow: 0 0 30px var(--primary-glow);
    }
    .popular-tag {
      position: absolute;
      top: -12px;
      right: 24px;
      background: var(--primary);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      text-transform: uppercase;
    }
    .plan-price { font-size: 2.5rem; font-weight: 800; color: #fff; margin: 1rem 0 0.5rem; }
    .plan-price span { font-size: 1rem; color: var(--text-muted); font-weight: 500; }
    .plan-features { list-style: none; margin: 1.5rem 0 2rem; flex: 1; }
    .plan-features li { padding: 0.4rem 0; font-size: 0.9rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; }
    .plan-features li::before { content: "✓"; color: var(--emerald); font-weight: 800; }
    .console-box {
      background: #060910;
      border: 1px solid var(--border-subtle);
      border-radius: 0.75rem;
      padding: 1.5rem;
    }
    .tab-row { display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem; margin-bottom: 1rem; }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-weight: 700;
      font-size: 0.85rem;
      padding: 0.4rem 0.8rem;
      border-radius: 0.4rem;
      cursor: pointer;
    }
    .tab-btn.active { background: var(--bg-card); color: #fff; }
    pre { overflow-x: auto; font-size: 0.875rem; color: #38bdf8; line-height: 1.5; }
    .input-field {
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      color: #fff;
      font-family: 'Plus Jakarta Sans', sans-serif;
      margin-bottom: 1rem;
    }
    .input-field:focus { outline: none; border-color: var(--primary); }
    footer { border-top: 1px solid var(--border-subtle); padding: 3rem 2rem; text-align: center; color: var(--text-muted); font-size: 0.875rem; }
  </style>
</head>
<body>

  <header>
    <a href="/" class="logo-badge">
      <div class="badge-icon">P</div>
      <div class="logo-text">PanIN <span style="font-weight:400; color:var(--text-muted);">Developers</span></div>
    </a>
    <div class="nav-links">
      <a href="#quickstart" class="nav-link">Quickstart</a>
      <a href="#console" class="nav-link">API Console</a>
      <a href="#pricing" class="nav-link">Pricing & Quotas</a>
      <a href="/api/vsaas/v1/openapi.json" target="_blank" class="nav-link">OpenAPI 3.1 Spec</a>
      <a href="#signup" class="btn-cta">Get Free API Key</a>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="pill-status">
        <div class="pill-dot"></div>
        <span>Production API Gateway Active • Post-Deployment Certified (DEC-166)</span>
      </div>
      <h1>Institutional Political Data &<br>Delimitation Simulation API</h1>
      <p>Instant programmatic access to India's certified canonical political dataset: 543 Parliamentary Constituencies, 4,123 Assembly Constituencies, 9,083 political leaders, 4,523 Form 26 affidavits, and governed delimitation models.</p>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-val">63,045</div>
          <div class="stat-label">Synchronized Entities</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">4,123</div>
          <div class="stat-label">Assembly Constituencies</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">543</div>
          <div class="stat-label">Lok Sabha PCs</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">&lt; 50ms</div>
          <div class="stat-label">P95 Gateway Latency</div>
        </div>
      </div>
    </section>

    <div class="container">
      <!-- QUICKSTART SECTION -->
      <section id="quickstart" style="margin-bottom: 4rem;">
        <h2 class="section-title">Developer Quickstart</h2>
        <p class="section-desc">Authenticate machine-to-machine requests with your 256-bit cryptographic API key via header <code>x-api-key: panin_...</code>.</p>
        
        <div class="grid-2">
          <div class="card">
            <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">1. Instant Onboarding via REST</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem;">Register your organization programmatically to receive an active sandbox test key immediately.</p>
            <div class="console-box">
<pre><code>curl -X POST https://api.kshetra.io/api/vsaas/v1/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Ananya Sharma",
    "email": "ananya@electionanalytics.org",
    "organizationName": "Election Analytics Institute",
    "useCase": "academic"
  }'</code></pre>
            </div>
          </div>

          <div class="card">
            <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">2. Query Assembly Constituencies</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem;">Pass your key to query statutory seats, candidates, affidavits, or demographics.</p>
            <div class="console-box">
<pre><code>curl -X GET https://api.kshetra.io/api/vsaas/v1/geo/states/TG/constituencies \\
  -H "x-api-key: panin_test_sk_YOUR_SECRET_KEY"</code></pre>
            </div>
          </div>
        </div>
      </section>

      <!-- INTERACTIVE API CONSOLE -->
      <section id="console" style="margin-bottom: 4rem;">
        <h2 class="section-title">Interactive API Explorer</h2>
        <p class="section-desc">Test real statutory data queries live in your browser using test credentials.</p>

        <div class="card">
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <select id="endpointSelect" class="input-field" style="margin-bottom: 0;">
              <option value="/api/vsaas/v1/geo/states">GET /api/vsaas/v1/geo/states (National Jurisdictions)</option>
              <option value="/api/vsaas/v1/geo/states/TG/constituencies">GET /api/vsaas/v1/geo/states/TG/constituencies (119 Telangana ACs)</option>
              <option value="/api/vsaas/v1/elections">GET /api/vsaas/v1/elections (Election Regimes)</option>
              <option value="/api/vsaas/v1/entities/search?q=INC">GET /api/vsaas/v1/entities/search?q=INC (Entity Search)</option>
              <option value="/api/vsaas/v1/delim/regimes">GET /api/vsaas/v1/delim/regimes (Delimitation Regimes)</option>
              <option value="/api/vsaas/v1/billing/plans">GET /api/vsav1/billing/plans (Public Pricing Tiers)</option>
            </select>
            <button id="sendRequestBtn" class="btn-cta" style="cursor: pointer;">Execute Query</button>
          </div>
          <div class="console-box">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.8rem;">
              <span>RESPONSE PAYLOAD (JSON)</span>
              <span id="responseStatusBadge">STATUS: READY</span>
            </div>
            <pre id="responseOutput"><code>// Select an endpoint above and click "Execute Query" to inspect real production JSON...</code></pre>
          </div>
        </div>
      </section>

      <!-- PRICING TIERS -->
      <section id="pricing" style="margin-bottom: 4rem;">
        <h2 class="section-title">Commercial Subscription Plans</h2>
        <p class="section-desc">Transparent quotas tailored for individuals, growing newsrooms, and national broadcast enterprises.</p>

        <div class="plans-grid">
          <div class="plan-card">
            <h3>Community</h3>
            <p style="color:var(--text-muted); font-size:0.85rem;">For prototyping and civic researchers.</p>
            <div class="plan-price">₹0 <span>/ month</span></div>
            <ul class="plan-features">
              <li>10,000 monthly requests</li>
              <li>60 req / min burst rate</li>
              <li>36 States & Union Territories</li>
              <li>107 Canonical Political Parties</li>
              <li>2 active test API keys</li>
            </ul>
            <a href="#signup" class="btn-cta" style="text-align: center; background: #1e293b;">Sign Up Free</a>
          </div>

          <div class="plan-card popular">
            <div class="popular-tag">Most Popular</div>
            <h3>Professional</h3>
            <p style="color:var(--text-muted); font-size:0.85rem;">For media newsrooms & analytics teams.</p>
            <div class="plan-price">₹4,999 <span>/ month</span></div>
            <ul class="plan-features">
              <li>500,000 monthly requests</li>
              <li>600 req / min burst rate</li>
              <li>All 4,123 Assembly Constituencies</li>
              <li>4,523 Form 26 candidate affidavits</li>
              <li>Full demographics & census stats</li>
              <li>Outbound webhooks events stream</li>
              <li>5 active live & test API keys</li>
            </ul>
            <a href="#signup" class="btn-cta" style="text-align: center;">Get Started with Pro</a>
          </div>

          <div class="plan-card">
            <h3>Enterprise</h3>
            <p style="color:var(--text-muted); font-size:0.85rem;">For national broadcasters & institutions.</p>
            <div class="plan-price">₹49,999 <span>/ month</span></div>
            <ul class="plan-features">
              <li>10,000,000 monthly requests</li>
              <li>3,000 req / min burst capacity</li>
              <li>Governed Delimitation Simulator</li>
              <li>Real-time Delimitation Watch Engine</li>
              <li>20 active API keys with custom scopes</li>
              <li>99.9% Uptime SLA guarantee</li>
            </ul>
            <a href="#signup" class="btn-cta" style="text-align: center; background: #1e293b;">Contact Institutional</a>
          </div>
        </div>
      </section>

      <!-- SELF-SERVICE SIGNUP FORM -->
      <section id="signup" style="margin-bottom: 5rem;">
        <div class="card" style="max-width: 600px; margin: 0 auto;">
          <h2 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 0.5rem; text-align: center;">Register for API Access</h2>
          <p style="color: var(--text-muted); text-align: center; margin-bottom: 2rem;">Provision your institutional tenant and receive your sandbox API key in seconds.</p>

          <form id="signupForm">
            <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">Your Full Name</label>
            <input type="text" id="signupName" class="input-field" placeholder="e.g. Rahul Varma" required>

            <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">Work Email</label>
            <input type="email" id="signupEmail" class="input-field" placeholder="e.g. rahul@mediagroup.in" required>

            <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">Organization / Publication Name</label>
            <input type="text" id="signupOrg" class="input-field" placeholder="e.g. Civic Journalism Foundation" required>

            <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">Primary Use Case</label>
            <select id="signupUseCase" class="input-field">
              <option value="media">Journalism & Media Broadcast</option>
              <option value="academic">Academic & Electoral Research</option>
              <option value="civic_tech">Civic Tech Platform</option>
              <option value="campaign">Campaign Analytics</option>
              <option value="enterprise">Enterprise Data Integration</option>
              <option value="individual">Independent Developer</option>
            </select>

            <button type="submit" class="btn-cta" style="width: 100%; padding: 0.85rem; font-size: 1rem; cursor: pointer;">
              Create Partner Account & Generate Key
            </button>
          </form>

          <div id="signupResult" style="display:none; margin-top: 1.5rem;" class="console-box">
            <h4 style="color: var(--emerald); margin-bottom: 0.5rem;">✓ Account Provisioned Successfully</h4>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Your initial test key is shown below. Copy and store it immediately:</p>
            <pre><code id="signupKeyDisplay"></code></pre>
          </div>
        </div>
      </section>
    </div>
  </main>

  <footer>
    <p>© 2026 PanIN Political Platform. Governed under Master Execution Framework Amendments v1.2–v1.6 & DEC-166.</p>
    <p style="margin-top: 0.5rem; font-size: 0.8rem; color: #64748b;">Zero citizen personal data exposed. Certified statutory provenance from Election Commission of India and Delimitation Commission orders.</p>
  </footer>

  <script>
    // Live API Console Handler
    const endpointSelect = document.getElementById('endpointSelect');
    const sendBtn = document.getElementById('sendRequestBtn');
    const responseOutput = document.getElementById('responseOutput');
    const statusBadge = document.getElementById('responseStatusBadge');

    sendBtn.addEventListener('click', async () => {
      const url = endpointSelect.value;
      statusBadge.textContent = 'FETCHING...';
      statusBadge.style.color = '#38bdf8';
      responseOutput.textContent = '// Querying live API gateway...';

      try {
        const res = await fetch(url);
        const data = await res.json();
        statusBadge.textContent = 'HTTP ' + res.status;
        statusBadge.style.color = res.ok ? '#10b981' : '#f43f5e';
        responseOutput.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        statusBadge.textContent = 'ERROR';
        statusBadge.style.color = '#f43f5e';
        responseOutput.textContent = '// Network error or offline fixture: ' + err.message;
      }
    });

    // Signup Form Handler
    const signupForm = document.getElementById('signupForm');
    const signupResult = document.getElementById('signupResult');
    const signupKeyDisplay = document.getElementById('signupKeyDisplay');

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('signupName').value,
        email: document.getElementById('signupEmail').value,
        organizationName: document.getElementById('signupOrg').value,
        useCase: document.getElementById('signupUseCase').value,
      };

      try {
        const res = await fetch('/api/vsaas/v1/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const resData = await res.json();
        if (res.ok && resData.success) {
          signupResult.style.display = 'block';
          signupKeyDisplay.textContent = resData.data.apiKey.rawKey;
        } else {
          alert('Signup failed: ' + (resData.error?.message || 'Server error'));
        }
      } catch (err) {
        alert('Network error submitting signup: ' + err.message);
      }
    });
  </script>
</body>
</html>`;
}
