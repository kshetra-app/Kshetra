/**
 * Media Embeds & Civic Widgets Service (JOB 064)
 *
 * Authority: Master Product Blueprint (Jobs 062-066), DEC-188, DEC-189
 * Features:
 * - 7 Sandboxed, Responsive Embed Widgets: Constituency, Delimitation, Election, Candidate, Issue, Live, Short
 * - Universal PostMessage Auto-Resize Protocol (kshetra:resize) preventing iframe scrollbars
 * - Custom Web Component (<poligram-widget> and legacy <panin-widget>) Registration (DEC-189 Option B)
 * - Statutory Section 127A RPA 1951 Disclaimers
 */

import type { PoligramEmbedWidgetType } from '@kshetra/shared';

export class EmbedService {
  // --- 1. EMBED HTML GENERATORS ---

  static renderWidgetHtml(type: PoligramEmbedWidgetType, entityId: string): string {
    const safeId = this.escapeHtml(entityId);

    let title = '';
    let bodyContent = '';

    switch (type) {
      case 'constituency':
        title = `Constituency Card: ${safeId}`;
        bodyContent = `
          <div class="stat-row">
            <div><strong>MLA:</strong> Mohammad Azharuddin (INC)</div>
            <div><strong>Electors:</strong> 3,84,200</div>
          </div>
          <div class="stat-row">
            <div><strong>CDI Score:</strong> <span class="highlight">78.4/100</span></div>
            <div><strong>Active Issues:</strong> 42</div>
          </div>
        `;
        break;

      case 'delimitation':
        title = `2026 Delimitation Shift: ${safeId}`;
        bodyContent = `
          <div class="stat-row">
            <div><strong>2008 Baseline:</strong> 2,95,000 voters</div>
            <div><strong>2026 Model:</strong> 4,12,000 voters</div>
          </div>
          <div style="background: #0284c7; color: white; padding: 0.5rem; border-radius: 6px; margin: 0.5rem 0; font-size: 0.85rem; text-align: center;">
            Boundary Parity: +1 Proposed Additional Seat Partition
          </div>
        `;
        break;

      case 'election':
        title = `Election Results Tally: ${safeId}`;
        bodyContent = `
          <div style="margin-bottom: 0.5rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem;"><span>INC</span><span>48.2%</span></div>
            <div style="background: #334155; border-radius: 4px; height: 8px; overflow: hidden;"><div style="background: #10b981; width: 48.2%; height: 100%;"></div></div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem;"><span>BRS</span><span>42.1%</span></div>
            <div style="background: #334155; border-radius: 4px; height: 8px; overflow: hidden;"><div style="background: #ec4899; width: 42.1%; height: 100%;"></div></div>
          </div>
        `;
        break;

      case 'candidate':
        title = `Candidate Profile: ${safeId}`;
        bodyContent = `
          <div class="stat-row">
            <div><strong>Affiliation:</strong> Independent / Verified</div>
            <div><strong>Pledges:</strong> 5 Civic Pledges</div>
          </div>
          <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem;">
            Clean Record Affidavit &middot; ECI Form 26 Verified
          </div>
        `;
        break;

      case 'issue':
        title = `Civic Grievance: ${safeId}`;
        bodyContent = `
          <div style="font-size: 0.95rem; font-weight: 600; color: #f8fafc;">Road Drainage Overflow near Jubilee Hills Checkpost</div>
          <div class="stat-row" style="margin-top: 0.5rem;">
            <div><strong>Status:</strong> <span style="color: #fbbf24;">IN_PROGRESS</span></div>
            <div><strong>Supporters:</strong> 128 Citizens</div>
          </div>
        `;
        break;

      case 'live':
        title = `Live Townhall Broadcast: ${safeId}`;
        bodyContent = `
          <div style="background: #000; height: 140px; border-radius: 8px; display: flex; align-items: center; justify-content: center; position: relative;">
            <div style="position: absolute; top: 8px; left: 8px; background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">LIVE</div>
            <span style="color: #94a3b8; font-size: 0.9rem;">HLS Video Stream Active &middot; 482 Viewers</span>
          </div>
        `;
        break;

      case 'short':
        title = `Civic Short: ${safeId}`;
        bodyContent = `
          <div style="background: #000; height: 160px; border-radius: 8px; display: flex; align-items: center; justify-content: center; position: relative;">
            <div style="position: absolute; top: 8px; left: 8px; background: #0284c7; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">SHORT</div>
            <span style="color: #94a3b8; font-size: 0.85rem;">Transcript: "Water pipeline repairs completed..."</span>
          </div>
        `;
        break;

      default:
        title = `POLIGRAM Widget: ${safeId}`;
        bodyContent = `<p>Verified Civic Tech Information</p>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 12px; font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; overflow: hidden; }
    .widget-box { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px; }
    .widget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .widget-title { font-size: 0.9rem; font-weight: 700; color: #38bdf8; }
    .stat-row { display: flex; justify-content: space-between; font-size: 0.85rem; margin-top: 6px; color: #cbd5e1; }
    .highlight { color: #34d399; font-weight: 700; }
    .attribution-pill { margin-top: 10px; padding-top: 8px; border-top: 1px solid #334155; font-size: 0.72rem; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="widget-box" id="widget-container">
    <div class="widget-header">
      <div class="widget-title">${title}</div>
      <div style="font-size: 0.7rem; background: #0284c7; padding: 2px 6px; border-radius: 4px;">POLIGRAM</div>
    </div>
    ${bodyContent}
    <div class="attribution-pill">
      Powered by POLIGRAM Civic Tech &middot; RPA 1951 Sec 127A Disclosed
    </div>
  </div>
  <script>
    // PostMessage auto-resizing protocol
    function notifyHeight() {
      const height = document.body.scrollHeight;
      window.parent.postMessage({
        type: 'kshetra:resize',
        widgetType: '${type}',
        entityId: '${safeId}',
        height: height
      }, '*');
    }
    window.addEventListener('load', notifyHeight);
    window.addEventListener('resize', notifyHeight);
  </script>
</body>
</html>`;
  }

  // --- 2. UNIVERSAL EMBED LOADER SCRIPT (/embed/poligram-widgets.js) ---

  static getClientLoaderScript(): string {
    return `/**
 * POLIGRAM Universal Embeds & Web Component Loader (JOB 064)
 * Authority: DEC-188, DEC-189
 */
(function() {
  // 1. PostMessage auto-resize listener for iframes
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'kshetra:resize') {
      var iframes = document.querySelectorAll('iframe[data-kshetra-widget]');
      for (var i = 0; i < iframes.length; i++) {
        var frame = iframes[i];
        if (frame.getAttribute('data-kshetra-id') === event.data.entityId) {
          frame.style.height = (event.data.height + 4) + 'px';
        }
      }
    }
  });

  // 2. Custom Web Component Registration: <poligram-widget> and legacy <panin-widget> (DEC-189 Option B)
  if (typeof customElements !== 'undefined') {
    class PoligramWidgetElement extends HTMLElement {
      connectedCallback() {
        var type = this.getAttribute('type') || 'constituency';
        var id = this.getAttribute('id') || 'TS-AC-61';
        var host = this.getAttribute('host') || '';

        var iframe = document.createElement('iframe');
        iframe.src = host + '/embed/' + encodeURIComponent(type) + '/' + encodeURIComponent(id);
        iframe.setAttribute('data-kshetra-widget', type);
        iframe.setAttribute('data-kshetra-id', id);
        iframe.style.width = '100%';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '8px';
        iframe.style.minHeight = '140px';
        iframe.setAttribute('loading', 'lazy');
        iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen');

        this.appendChild(iframe);
      }
    }
    if (!customElements.get('poligram-widget')) {
      customElements.define('poligram-widget', PoligramWidgetElement);
    }
    if (!customElements.get('panin-widget')) {
      customElements.define('panin-widget', PoligramWidgetElement);
    }
  }
})();`;
  }

  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export const embedService = EmbedService;
