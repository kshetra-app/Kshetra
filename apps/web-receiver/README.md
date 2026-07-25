# Kshetra Live Receiver (Universal Web Receiver)

Part of the **Kshetra Live Media Exchange (LMX)** — recipient-side distribution
(product doc Section 7a.2). This is **separate software** from the Kshetra mobile
app: partners are not Kshetra app users, so their presentation tools are an
independent, lightweight build.

## What it is

A single HTML5 page that covers three device classes with one codebase:

- **Windows** — any browser in full-screen / kiosk mode on a PC connected to a
  TV over HDMI. No installation.
- **Android smart TV** — the TV's browser, or a thin WebView wrapper for
  app-store presence and D-pad focus (Phase 2, see doc Section 7a.3).
- **Interactive touchscreens** — Windows/Android panels running a browser; the
  same page works with touch.

## Run

It is a static file. Serve it any way you like:

```bash
# from apps/web-receiver
npx serve .        # or: python -m http.server 8080
```

Then open the URL. Point it at your LMX API by setting the base before load:

```html
<script>window.KSHETRA_API = 'https://your-api.example/api/v1/lmx';</script>
```

If the API is unreachable it falls back to demo feeds so the receiver still
renders (useful for kiosk provisioning and QA).

## Playback

- Uses [`hls.js`](https://github.com/video-dev/hls.js) where MSE is available.
- Falls back to native HLS on Safari and many smart-TV browsers.

## Phase 2

Wrap this page in native shells once proven:

- **Windows**: Electron (autostart + system-tray control).
- **Android TV**: WebView app with proper remote navigation and offline-cached
  dashboards.
