/**
 * Poligram Studio Web Broadcaster
 * In-browser WebRTC-WHIP Studio Ingestion Client
 * Standard: IETF WHIP RFC Draft, Zero-Native-Binary Overhead
 */

export function renderStudioHtml(sessionPath?: string): string {
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
    <div id="liveBadge" class="badge-live"><div class="dot"></div><span id="liveLabel"></span></div>
  </header>
  <main>
    <div>
      <div class="video-container">
        <video id="preview" autoplay muted playsinline></video>
      </div>
      <div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 12px;">
        <button id="cameraBtn" class="btn btn-primary" onclick="startCamera()">Enable Camera & Mic</button>
        <button id="goLiveBtn" class="btn btn-primary" style="background: var(--success);" onclick="goLive()">Start broadcast</button>
        <button id="stopLiveBtn" class="btn btn-danger" onclick="stopLive()">End Broadcast</button>
      </div>
    </div>
    <div class="controls-panel">
      <h2>Broadcast Controls</h2>
      ${
        sessionPath
          ? ''
          : `<div class="form-group">
        <label for="whipUrl">WHIP Ingest URL</label>
        <input type="url" id="whipUrl" autocomplete="off">
        <label for="streamToken">Stream Token (Bearer)</label>
        <input type="password" id="streamToken" autocomplete="off">
      </div>`
      }
      <div class="form-group">
        <label>Broadcast status</label>
        <div id="telemetryBox" class="telemetry" role="status">Camera and microphone are off.</div>
      </div>
    </div>
  </main>
  <script>
    const sessionPath = ${JSON.stringify(sessionPath ?? null)};
    const ticket = sessionPath ? location.hash.slice(1) : null;
    if (ticket) history.replaceState(null, '', location.pathname);

    const status = document.getElementById('telemetryBox');
    const startButton = document.getElementById('goLiveBtn');
    const cameraButton = document.getElementById('cameraBtn');
    const stopButton = document.getElementById('stopLiveBtn');
    const preview = document.getElementById('preview');
    const badge = document.getElementById('liveBadge');
    const badgeLabel = document.getElementById('liveLabel');
    let localStream;
    let connection;
    let resourceUrl;
    let refreshTimer;

    if (sessionPath && !ticket) {
      startButton.disabled = true;
      cameraButton.disabled = true;
      status.textContent = 'Open Go Live in Poligram to get a studio session.';
    }

    function authHeaders() {
      const value = ticket || document.getElementById('streamToken')?.value;
      return value ? { Authorization: 'Bearer ' + value } : {};
    }

    function closeCamera() {
      connection?.close();
      connection = null;
      localStream?.getTracks().forEach(track => track.stop());
      localStream = null;
      preview.srcObject = null;
      cameraButton.style.display = 'inline-block';
      badge.style.display = 'none';
      clearInterval(refreshTimer);
    }

    async function startCamera() {
      if (localStream || cameraButton.disabled) return;
      cameraButton.disabled = true;
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        preview.srcObject = localStream;
        cameraButton.style.display = 'none';
        status.textContent = 'Camera and microphone are ready.';
      } catch {
        status.textContent = 'Allow camera and microphone access to broadcast.';
      } finally {
        cameraButton.disabled = false;
      }
    }

    async function confirmMedia() {
      if (!sessionPath || connection?.connectionState !== 'connected') return;
      try {
        const response = await fetch(sessionPath + '/ready', { method: 'POST', headers: authHeaders() });
        if (!response.ok) return;
        const result = await response.json();
        badge.style.display = 'flex';
        badgeLabel.textContent = result.published ? 'LIVE ON AIR' : 'IN REVIEW';
        status.textContent = result.published
          ? 'Your broadcast is live. Keep this tab open.'
          : 'Your camera feed is connected. It will appear in Live after review.';
      } catch {
        status.textContent = 'Checking the broadcast connection…';
      }
    }

    async function goLive() {
      if (startButton.disabled) return;
      startButton.disabled = true;
      try {
        if (!localStream) await startCamera();
        if (!localStream) return;
        const whipUrl = sessionPath ? sessionPath + '/publish' : document.getElementById('whipUrl').value;
        if (!whipUrl) throw new Error('Enter the ingest address for your stream.');
        status.textContent = 'Connecting…';
        const pc = new RTCPeerConnection();
        connection = pc;
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        await pc.setLocalDescription(await pc.createOffer());
        await new Promise(resolve => {
          if (pc.iceGatheringState === 'complete') return resolve();
          const finish = () => {
            clearTimeout(timeout);
            pc.removeEventListener('icegatheringstatechange', check);
            resolve();
          };
          const check = () => { if (pc.iceGatheringState === 'complete') finish(); };
          const timeout = setTimeout(finish, 2500);
          pc.addEventListener('icegatheringstatechange', check);
        });
        const response = await fetch(whipUrl, {
          method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/sdp' },
          body: pc.localDescription.sdp,
        });
        if (!response.ok) throw new Error('Could not start the broadcast (' + response.status + ').');
        const resource = response.headers.get('Location');
        if (resource) {
          const origin = new URL(whipUrl, location.origin);
          const target = new URL(resource, origin);
          if (target.origin !== origin.origin) throw new Error('The stream returned an invalid session address.');
          resourceUrl = target.href;
        }
        pc.addEventListener('connectionstatechange', () => {
          if (pc.connectionState === 'connected') {
            status.textContent = 'Camera feed connected.';
            void confirmMedia();
          } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            badge.style.display = 'none';
            status.textContent = 'Connection interrupted. Keep this tab open while it reconnects.';
          }
        });
        await pc.setRemoteDescription({ type: 'answer', sdp: await response.text() });
        startButton.style.display = 'none';
        stopButton.style.display = 'inline-block';
        if (sessionPath) refreshTimer = setInterval(confirmMedia, 3500);
      } catch (error) {
        closeCamera();
        status.textContent = error instanceof Error ? error.message : 'Could not start the broadcast.';
      } finally {
        startButton.disabled = false;
      }
    }

    async function stopLive() {
      stopButton.disabled = true;
      closeCamera();
      try {
        if (resourceUrl) {
          const response = await fetch(resourceUrl, { method: 'DELETE', headers: authHeaders() });
          if (!response.ok) throw new Error('The server could not confirm the broadcast ended. Try again.');
        }
        resourceUrl = null;
        stopButton.style.display = 'none';
        if (sessionPath) cameraButton.style.display = 'none';
        else startButton.style.display = 'inline-block';
        status.textContent = 'Broadcast ended.';
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Could not confirm the broadcast ended.';
      } finally {
        stopButton.disabled = false;
      }
    }

    addEventListener('pagehide', () => {
      if (sessionPath && resourceUrl) {
        void fetch(resourceUrl, { method: 'DELETE', headers: authHeaders(), keepalive: true }).catch(() => {});
      }
      closeCamera();
    });
  </script>
</body>
</html>`;
}

export function renderReviewPreviewHtml(manifestPath: string): string {
  return `<!doctype html><html lang="en"><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Poligram Live review</title>
  <style>body{margin:0;background:#090d16;color:#fff;font:1rem system-ui} main{margin:auto;max-width:900px;padding:1rem} video{width:100%;background:#000;aspect-ratio:16/9}</style>
  <main><h1>Live review</h1><video controls playsinline muted aria-label="Live preview"></video>
  <p role="status">Loading the private preview…</p></main>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"
    integrity="sha384-w6Gb3fXHb5e1LUYa/hYA5Q41bEDglN5ZPCG7Jvnoo8/X90oGnlPqBlBJCe38mEMm" crossorigin="anonymous"></script>
  <script>
    const ticket = location.hash.slice(1);
    history.replaceState(null, '', location.pathname);
    const status = document.querySelector('[role="status"]');
    if (!ticket || !window.Hls?.isSupported()) {
      status.textContent = 'Open the preview from the Poligram moderation queue in a supported browser.';
    } else {
      const hls = new Hls({ enableWorker: false, xhrSetup: (xhr, url) => {
        if (new URL(url, location.origin).origin === location.origin) xhr.setRequestHeader('Authorization', 'Bearer ' + ticket);
      }});
      hls.on(Hls.Events.MANIFEST_PARSED, () => { status.textContent = 'Private preview. Return to Poligram to save your decision.'; });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          hls.destroy();
          status.textContent = 'Preview ended or expired. Reopen it from the moderation queue.';
        }
      });
      hls.attachMedia(document.querySelector('video'));
      hls.loadSource(${JSON.stringify(manifestPath)});
      addEventListener('pagehide', () => hls.destroy());
    }
  </script></html>`;
}
