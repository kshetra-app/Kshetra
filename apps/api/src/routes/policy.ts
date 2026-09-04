import type { FastifyPluginAsync } from 'fastify';

/**
 * Grievance Officer & Content Policy Routes (Ticket 0.5)
 * Compliant with Rule 3(2) of Information Technology (Intermediary Guidelines
 * and Digital Media Ethics Code) Rules, 2021.
 */

interface GrievanceRecord {
  id: string;
  complainantName: string;
  email: string;
  phone?: string;
  category: 'copyright' | 'defamation' | 'harassment' | 'misinformation' | 'hate_speech' | 'impersonation' | 'other';
  contentUrl: string;
  description: string;
  status: 'acknowledged' | 'under_review' | 'resolved' | 'rejected';
  submittedAt: string;
  ticketNumber: string;
}

const GRIEVANCE_RECORDS: GrievanceRecord[] = [];

export const policyRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /policy/grievance
   * Statutory Grievance Redressal Policy and Officer Details
   */
  app.get('/policy/grievance', async (request, reply) => {
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kshetra — Grievance Redressal Mechanism & Officer</title>
  <style>
    :root {
      --primary: #1E3A8A;
      --text: #0F172A;
      --text-muted: #475569;
      --bg: #F8FAFC;
      --card-bg: #FFFFFF;
      --border: #E2E8F0;
      --accent: #2563EB;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding-bottom: 60px; line-height: 1.6; }
    header { background-color: var(--primary); color: #fff; padding: 20px 24px; }
    .container { max-width: 860px; margin: 32px auto; padding: 0 20px; }
    .card { background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border); padding: 28px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    h1 { font-size: 24px; margin-bottom: 12px; }
    h2 { font-size: 18px; margin-top: 20px; margin-bottom: 12px; color: var(--primary); border-bottom: 1px solid var(--border); padding-bottom: 6px; }
    p, li { font-size: 15px; color: var(--text-muted); margin-bottom: 12px; }
    ul, ol { margin-left: 24px; margin-bottom: 16px; }
    .officer-box { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 20px; margin: 16px 0; }
    .officer-box strong { color: #1E3A8A; display: block; font-size: 16px; margin-bottom: 6px; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 6px; }
    input, select, textarea { width: 100%; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border); font-size: 14px; }
    button { background: var(--primary); color: #fff; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; cursor: pointer; }
    button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <header>
    <div style="max-width: 860px; margin: 0 auto;">
      <h1>Kshetra Civic Technologies</h1>
      <p style="color: #93C5FD; font-size: 14px;">Grievance Redressal Mechanism (Rule 3(2) of IT Rules, 2021)</p>
    </div>
  </header>

  <div class="container">
    <div class="card">
      <h2>1. Designated Grievance Officer</h2>
      <p>In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the contact details of the designated Resident Grievance Officer for Kshetra are published below:</p>
      
      <div class="officer-box">
        <strong>Name: Srikanth Varma</strong>
        <div>Title: Head of Trust, Safety & Compliance</div>
        <div>Entity: Kshetra Civic Technologies India Private Limited</div>
        <div>Email: <a href="mailto:grievance@kshetra.app" style="color:#2563EB; font-weight: 600;">grievance@kshetra.app</a></div>
        <div>Office Address: Level 4, Block B, Cyber Gateway, HITEC City, Hyderabad, Telangana 500081, India</div>
        <div>Working Hours: Monday to Friday, 09:30 AM to 06:00 PM IST</div>
      </div>

      <h2>2. Statutory Timelines for Grievance Redressal</h2>
      <ul>
        <li><strong>Acknowledgement:</strong> Every grievance or complaint received is acknowledged within <strong>24 hours</strong> of receipt with a unique tracking ticket ID.</li>
        <li><strong>Disposal & Resolution:</strong> The complaint will be reviewed, investigated, and disposed of within <strong>15 days</strong> from the date of receipt.</li>
        <li><strong>Emergency / Sexual / Impersonation Material:</strong> Complaints relating to non-consensual sexually explicit content or deepfakes will be addressed within <strong>24 hours</strong> per Rule 3(2)(b).</li>
      </ul>

      <h2>3. File an Online Grievance or Takedown Request</h2>
      <p>Citizens, political candidates, elected representatives, or designated authorities may submit a formal complaint below:</p>

      <form id="grievanceForm" onsubmit="submitGrievance(event)">
        <div class="form-group">
          <label>Your Full Legal Name *</label>
          <input type="text" id="complainantName" required placeholder="e.g. Ramesh Kumar">
        </div>
        <div class="form-group">
          <label>Email Address *</label>
          <input type="email" id="email" required placeholder="name@example.com">
        </div>
        <div class="form-group">
          <label>Phone Number (Optional)</label>
          <input type="tel" id="phone" placeholder="+91 98765 43210">
        </div>
        <div class="form-group">
          <label>Category of Grievance *</label>
          <select id="category" required>
            <option value="defamation">Defamation / Unsubstantiated False Claim</option>
            <option value="misinformation">Electoral Misinformation / Impersonation</option>
            <option value="hate_speech">Hate Speech / Communally Sensitive Material</option>
            <option value="copyright">Copyright / Intellectual Property Violation</option>
            <option value="harassment">Harassment / Intimidation</option>
            <option value="other">Other Violation of Community Guidelines</option>
          </select>
        </div>
        <div class="form-group">
          <label>URL or Identifier of the Content *</label>
          <input type="text" id="contentUrl" required placeholder="e.g. https://kshetra.app/posts/xyz or post ID">
        </div>
        <div class="form-group">
          <label>Detailed Explanation of Grievance *</label>
          <textarea id="description" rows="4" required placeholder="Describe why this content violates the Community Guidelines or Indian law..."></textarea>
        </div>
        <button type="submit" id="submitBtn">Submit Formal Grievance</button>
      </form>

      <div id="resultMsg" style="display:none; margin-top: 20px; padding: 16px; border-radius: 8px; background: #DCFCE7; color: #15803D;"></div>
    </div>
  </div>

  <script>
    async function submitGrievance(e) {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      const payload = {
        complainantName: document.getElementById('complainantName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        category: document.getElementById('category').value,
        contentUrl: document.getElementById('contentUrl').value,
        description: document.getElementById('description').value
      };

      try {
        const res = await fetch('/api/v1/grievances/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        const msgDiv = document.getElementById('resultMsg');
        msgDiv.style.display = 'block';
        msgDiv.innerHTML = '<strong>Grievance Logged Successfully!</strong><br>Your Ticket ID: <strong>' + data.ticketNumber + '</strong>.<br>An acknowledgement has been recorded per IT Rules 2021. Resolution will be completed within 15 days.';
        document.getElementById('grievanceForm').reset();
      } catch (err) {
        alert('Submission failed: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Formal Grievance';
      }
    }
  </script>
</body>
</html>`;
  });

  /**
   * GET /policy/community-guidelines
   */
  app.get('/policy/community-guidelines', async (request, reply) => {
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kshetra — Content & Community Guidelines</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 860px; margin: 30px auto; padding: 0 20px; color: #0F172A; }
    h1 { color: #1E3A8A; margin-bottom: 8px; }
    h2 { color: #1E3A8A; margin-top: 24px; margin-bottom: 12px; }
    p, li { color: #475569; margin-bottom: 10px; font-size: 15px; }
    ul { margin-left: 24px; }
    .badge { background: #DBEAFE; color: #1E40AF; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; }
  </style>
</head>
<body>
  <h1>Kshetra Community Guidelines & Content Policy</h1>
  <p><span class="badge">Version 1.0</span> · Effective Date: September 2026</p>
  <p>Kshetra is committed to civil, evidence-grounded civic participation. To safeguard democratic discourse, our platform enforces strict moderation policies under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.</p>

  <h2>1. Prohibited Content</h2>
  <ul>
    <li><strong>Defamation & Malicious Accusation:</strong> Unsubstantiated defamatory allegations against citizens or public figures.</li>
    <li><strong>Impersonation:</strong> Creating accounts claiming to represent elected officials, aspirants, or government departments without verification.</li>
    <li><strong>Electoral Disinformation:</strong> Falsifying polling locations, voting procedures, or voter eligibility rules.</li>
    <li><strong>Hate Speech & Communal Incitement:</strong> Promoting enmity between religious, linguistic, or caste communities.</li>
    <li><strong>Fabricated Quotes & Media:</strong> Attributing invented quotes, endorsements, or synthetic media (deepfakes) to real political figures.</li>
  </ul>

  <h2>2. Content Moderation & Enforcement</h2>
  <p>Violations are subject to automated filtering, community vouch/flag gating (Content Promotion Pipeline), moderation review, post removal, and account suspension or permanent banning.</p>
</body>
</html>`;
  });

  /**
   * POST /api/v1/grievances/intake
   * Legal & community grievance complaint intake
   */
  app.post<{
    Body: {
      complainantName: string;
      email: string;
      phone?: string;
      category: 'copyright' | 'defamation' | 'harassment' | 'misinformation' | 'hate_speech' | 'impersonation' | 'other';
      contentUrl: string;
      description: string;
    };
  }>('/api/v1/grievances/intake', async (request, reply) => {
    const { complainantName, email, phone, category, contentUrl, description } = request.body ?? {};

    if (!complainantName || !email || !contentUrl || !description) {
      return reply.status(400).send({
        success: false,
        message: 'complainantName, email, contentUrl, and description are required',
      });
    }

    const ticketNumber = `GRV-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const record: GrievanceRecord = {
      id: `grv_${Date.now()}`,
      complainantName,
      email,
      phone,
      category: category ?? 'other',
      contentUrl,
      description,
      status: 'acknowledged',
      submittedAt: new Date().toISOString(),
      ticketNumber,
    };

    GRIEVANCE_RECORDS.push(record);

    return reply.send({
      success: true,
      ticketNumber,
      message: 'Grievance acknowledged. An acknowledgement receipt has been registered.',
      estimatedResolutionDays: 15,
      grievanceOfficer: {
        name: 'Srikanth Varma',
        email: 'grievance@kshetra.app',
        title: 'Head of Trust & Safety',
      },
    });
  });
};
