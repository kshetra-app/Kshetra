import type { FastifyPluginAsync } from 'fastify';

export const manageRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /manage
   * Web Page Manager shell (Ticket 0.4)
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
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding-bottom: 60px; }
    header { background-color: var(--primary); color: #fff; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .badge { background: #3B82F6; color: #fff; font-size: 11px; padding: 4px 8px; border-radius: 6px; font-weight: 700; text-transform: uppercase; margin-left: 8px; }
    .container { max-width: 860px; margin: 36px auto; padding: 0 20px; }
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
    .btn { background: var(--primary); color: #fff; padding: 10px 20px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; font-size: 14px; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
    .btn-gold { background: linear-gradient(135deg, #D97706, #B45309); color: #fff; }
    .pro-box { border: 2px solid var(--gold); border-radius: 12px; padding: 24px; background: #FFFDF5; }
    .feature-list { list-style: none; margin: 16px 0; }
    .feature-list li { display: flex; align-items: center; gap: 8px; font-size: 14px; margin-bottom: 8px; color: #334155; }
    .feature-list li::before { content: "✓"; color: var(--gold); font-weight: 900; }
    .auth-banner { display: flex; justify-content: space-between; align-items: center; background: #EFF6FF; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px; }
    .status-pill { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">KSHETRA <span class="badge">Page Manager</span></div>
    <div id="user-status" style="font-size: 13px;">Logged in as: <strong>demo-leader@kshetra.app</strong></div>
  </header>

  <div class="container">
    <div class="card">
      <div class="page-header">
        <div class="avatar">YR</div>
        <div class="page-info">
          <h3>Youth for Hyderabad <span class="tag tag-aspirant">Aspirant</span> <span class="tag tag-verified">Verified</span> <span id="pro-badge" class="tag tag-pro" style="display:none;">Pro Active</span></h3>
          <span>@youth_for_hyd · Assembly Constituency: Serilingampally (TS-AC-67)</span>
        </div>
      </div>
      <p>Manage your political profile, broadcast constituency manifestos, and monitor public sentiment across your constituency.</p>
    </div>

    <div class="card pro-box">
      <h2>⭐ Kshetra Page Pro</h2>
      <p>Accelerate your political and civic reach with advanced tools built specifically for candidates, leaders, and political parties.</p>
      
      <div id="pro-status-container" style="margin-bottom: 16px;">
        <span id="current-plan-status" class="status-pill" style="background:#E2E8F0; color:#475569;">Free Tier Active</span>
      </div>

      <ul class="feature-list">
        <li>Unlimited constituent surveys with real-time ward heatmaps</li>
        <li>Priority constituency feed distribution</li>
        <li>Multi-admin campaign management dashboard</li>
        <li>Full transparency audit exports for election affidavits</li>
        <li>Direct constituent emergency broadcast alerts</li>
      </ul>

      <div style="margin-top: 20px; display: flex; align-items: center; gap: 16px;">
        <button id="buy-pro-btn" class="btn btn-gold" onclick="handlePurchasePro()">Subscribe to Page Pro (₹1,999/mo)</button>
        <span id="buy-hint" style="font-size: 12px; color: var(--text-muted);">Secure billing via Razorpay · Cancel anytime</span>
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
          document.getElementById('buy-pro-btn').textContent = 'Page Pro Active';
          document.getElementById('buy-pro-btn').disabled = true;
          document.getElementById('buy-pro-btn').style.opacity = '0.7';
        }
      } catch (err) {
        console.error('Failed to load entitlement', err);
      }
    }

    async function handlePurchasePro() {
      const btn = document.getElementById('buy-pro-btn');
      btn.textContent = 'Initiating Checkout...';
      btn.disabled = true;

      try {
        const orderRes = await fetch('/api/v1/pages/' + PAGE_ID + '/pro/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 199900, currency: 'INR' })
        });
        const orderData = await orderRes.json();

        // If in test/sandbox environment or razorpay mock, complete verification
        if (orderData.isSandbox) {
          const verifyRes = await fetch('/api/v1/pages/' + PAGE_ID + '/pro/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: orderData.orderId,
              razorpay_payment_id: 'pay_sandbox_' + Date.now(),
              sandboxBypass: true
            })
          });
          const verifyData = await verifyRes.json();
          alert('Page Pro subscription successfully activated! Mobile app will reflect unlocked tools.');
          checkEntitlement();
        } else {
          // Open Razorpay modal
          const rzp = new Razorpay({
            key: orderData.key,
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'Kshetra',
            description: 'Page Pro Subscription (1 Month)',
            order_id: orderData.orderId,
            handler: async function (response) {
              await fetch('/api/v1/pages/' + PAGE_ID + '/pro/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response)
              });
              alert('Payment successful! Page Pro activated.');
              checkEntitlement();
            }
          });
          rzp.open();
        }
      } catch (err) {
        alert('Failed to process billing: ' + err.message);
      } finally {
        btn.disabled = false;
        checkEntitlement();
      }
    }

    // Initialize entitlement status on load
    checkEntitlement();
  </script>
</body>
</html>`;
  });
};
