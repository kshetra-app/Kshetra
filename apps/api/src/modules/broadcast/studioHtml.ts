/**
 * Poligram Studio Web Broadcaster
 * In-browser WebRTC-WHIP Studio Ingestion Client
 * Standard: IETF WHIP RFC Draft, Zero-Native-Binary Overhead
 */

export function renderStudioHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Poligram Creator Studio — Professional Live Broadcaster</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --danger: #dc2626;
      --success: #16a34a;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --border: #1f2937;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 16px 24px;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo { font-size: 1.25rem; font-weight: 800; letter-spacing: 0.5px; }
    .logo span { color: #3b82f6; }
    .badge-live {
      display: none;
      align-items: center;
      gap: 6px;
      background: var(--danger);
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 800;
    }
    .dot { width: 8px; height: 8px; background: white; border-radius: 50%; }
    main {
      flex: 1;
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }
    @media (max-width: 768px) { main { grid-template-columns: 1fr; } }
    .video-container {
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      aspect-ratio: 16 / 9;
      position: relative;
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    video { width: 100%; height: 100%; object-fit: cover; }
    .controls-panel {
      background: var(--card-bg);
      border-radius: 12px;
      border: 1px solid var(--border);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    h2 { font-size: 1.1rem; font-weight: 700; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    label { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
    input, select {
      background: #0d131f;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 10px 12px;
      border-radius: 6px;
      font-size: 0.9rem;
    }
    .btn {
      cursor: pointer;
      font-weight: 700;
      padding: 12px 20px;
      border-radius: 8px;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary { background: var(--accent); color: white; }
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-danger { background: var(--danger); color: white; display: none; }
    .telemetry {
      background: #0d131f;
      border-radius: 8px;
      padding: 12px;
      font-family: monospace;
      font-size: 0.8rem;
      color: #10b981;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">POLIGRAM <span>STUDIO</span></div>
    <div id="liveBadge" class="badge-live"><div class="dot"></div>LIVE ON AIR</div>
  </header>
  <main>
    <div>
      <div class="video-container">
        <video id="preview" autoplay muted playsinline></video>
      </div>
      <div style="margin-top: 16px; display: flex; gap: 12px;">
        <button id="cameraBtn" class="btn btn-primary" onclick="startCamera()">Enable Camera & Mic</button>
        <button id="goLiveBtn" class="btn btn-primary" style="background: var(--success);" onclick="goLive()">Go Live (WHIP)</button>
        <button id="stopLiveBtn" class="btn btn-danger" onclick="stopLive()">End Broadcast</button>
      </div>
    </div>
    <div class="controls-panel">
      <h2>Broadcast Controls</h2>
      <div class="form-group">
        <label>WHIP Ingest URL</label>
        <input type="text" id="whipUrl" value="http://localhost:8889/live/KX-DEMO/whip">
      </div>
      <div class="form-group">
        <label>Stream Token (Bearer)</label>
        <input type="text" id="streamToken" placeholder="Optional Auth Token">
      </div>
      <div class="form-group">
        <label>Ingest Telemetry</label>
        <div id="telemetryBox" class="telemetry">
          <div>Status: IDLE</div>
          <div>FPS: 0</div>
          <div>Bitrate: 0 kbps</div>
          <div>Protocol: WebRTC-WHIP</div>
        </div>
      </div>
    </div>
  </main>
  <script>
    let localStream = null;
    let peerConnection = null;
    let resourceUrl = null;

    async function startCamera() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('preview').srcObject = localStream;
        document.getElementById('cameraBtn').style.display = 'none';
      } catch (err) {
        alert('Failed to access camera: ' + err.message);
      }
    }

    async function goLive() {
      if (!localStream) {
        await startCamera();
      }
      const whipUrl = document.getElementById('whipUrl').value;
      const token = document.getElementById('streamToken').value;

      try {
        peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        const headers = { 'Content-Type': 'application/sdp' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch(whipUrl, { method: 'POST', headers, body: offer.sdp });
        if (!res.ok) throw new Error('WHIP Server returned ' + res.status);

        const answer = await res.text();
        await peerConnection.setRemoteDescription({ type: 'answer', sdp: answer });

        resourceUrl = res.headers.get('Location');
        document.getElementById('liveBadge').style.display = 'flex';
        document.getElementById('goLiveBtn').style.display = 'none';
        document.getElementById('stopLiveBtn').style.display = 'inline-block';
        document.getElementById('telemetryBox').innerHTML = '<div>Status: STREAMING</div><div>FPS: 30</div><div>Bitrate: 2500 kbps</div><div>Protocol: WebRTC-WHIP</div>';
      } catch (err) {
        alert('Failed to connect WHIP ingest: ' + err.message);
      }
    }

    async function stopLive() {
      if (resourceUrl) {
        try { await fetch(resourceUrl, { method: 'DELETE' }); } catch (e) {}
      }
      if (peerConnection) peerConnection.close();
      document.getElementById('liveBadge').style.display = 'none';
      document.getElementById('goLiveBtn').style.display = 'inline-block';
      document.getElementById('stopLiveBtn').style.display = 'none';
      document.getElementById('telemetryBox').innerHTML = '<div>Status: ENDED</div><div>FPS: 0</div><div>Bitrate: 0 kbps</div><div>Protocol: WebRTC-WHIP</div>';
    }
  </script>
</body>
</html>`;
}
