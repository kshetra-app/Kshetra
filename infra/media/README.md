# Kshetra Live Media Exchange — Self-Hosted Media Plane

Open-source replacement for AWS MediaLive / CloudFront / SRT that you **host
alongside the source code**. Four complementary tiers, auto-selected per live
event by the control-plane router (`apps/mobile/lib/mediaPipeline.ts`, mirrored in
`apps/api`). SRT is free & built in (Haivision `libsrt`) on every tier.

## Tiers

| Tier | Service | Role | Ingest | Playback |
|---|---|---|---|---|
| 0 | **MediaMTX** | Universal ingest gateway + relay-of-record | RTMP / SRT / WHIP | (relays to SRS) |
| 1 | **OvenMediaEngine** | Sub-second — alerts / breaking | RTMP / SRT / WHIP | **LL-HLS** + WebRTC |
| 2 | **SRS** | Scalable broadcast + edge CDN + DVR | RTMP (from MediaMTX) | **HLS** + FLV + WebRTC |
| 3 | **LiveKit** | Interactive / multi-guest (2-way) | WHIP / SDK | WebRTC SFU |
| edge | **Nginx** | HLS cache + CORS (P2P) + reverse proxy | — | fronts SRS + OME |

**P2P Media Loader** (open source) rides on the HLS tiers client-side to offload
egress to viewers over WebRTC — wire it into the web player / `apps/web-receiver`.

## Auto-routing (which tier a stream gets)

Decided by `selectPipeline()` from signals already on the Live Event Object:

| Signal | Tier chosen |
|---|---|
| `interactive` (guests / two-way) | **LiveKit** |
| `issueCategory ∈ {emergency, breaking_news}` **or** `alertDepartments > 0` | **OME** (LL-HLS + WebRTC) |
| everything else (public / general) | **SRS** (HLS + edge + P2P) |
| every case | ingest via **MediaMTX** |

If a tier isn't deployed, the router degrades gracefully to SRS HLS.

## Run

```bash
cd infra/media
cp .env.example .env          # set PUBLIC_IP to your LAN/host IP, generate LiveKit keys
docker compose up -d          # or bring up a subset: docker compose up -d mediamtx srs edge
```

Then publish a test stream and watch it:

```bash
# Publish (RTMP) to the gateway:
ffmpeg -re -stream_loop -1 -i sample.mp4 -c copy -f flv rtmp://<PUBLIC_IP>:1935/live/KX-DEMO

# Broadcast HLS (via edge cache):   http://<PUBLIC_IP>/live/KX-DEMO.m3u8
# Low-latency LL-HLS (OME):         http://<PUBLIC_IP>:3334/app/KX-DEMO/llhls.m3u8
# SRS WebRTC (WHEP):                http://<PUBLIC_IP>:8000/rtc/v1/whep/?app=live&stream=KX-DEMO
```

The app's `HlsPlayer` plays any of the `.m3u8` URLs as-is.

## Wire the app to the self-hosted plane

Set these (mirror EXPO_PUBLIC_* into `apps/api/.env`) to flip the router from demo
public streams to your real hosts:

```
EXPO_PUBLIC_MEDIA_MODE=self_hosted
EXPO_PUBLIC_MEDIA_SCHEME=https
EXPO_PUBLIC_MEDIA_INGEST_HOST=ingest.yourdomain
EXPO_PUBLIC_MEDIA_SRS_HOST=srs.yourdomain
EXPO_PUBLIC_MEDIA_OME_HOST=ome.yourdomain
EXPO_PUBLIC_MEDIA_LIVEKIT_HOST=livekit.yourdomain
EXPO_PUBLIC_MEDIA_EDGE_HOST=edge.yourdomain
EXPO_PUBLIC_MEDIA_INGEST_PROTOCOL=rtmp   # rtmp | srt | whip
```

`startLiveEvent()` then calls `selectPipeline()` and writes the correct
`mediaIngestUrl` / `mediaPlaybackHls` / `mediaPlaybackWebrtc` onto the event.

## Hosted browser studio

Poligram's Live tab uses the existing `live_events` records and the browser
studio served by the API. The browser captures the camera and microphone over
WebRTC. MediaMTX and FFmpeg deliver H.264/AAC over HLS to the app's existing
player and write recordings to `/recordings` for replay. The Android build
uses the system browser and its existing WebView without a native WebRTC library.

Deploy `mediamtx/Dockerfile` as a separate media service. Keep its HTTP listeners
for ingest, playback, recordings, and control on the private network. Mount a
persistent volume at `/recordings`. On Railway, forward a public TCP proxy to
port `8189`. Set `MTX_WEBRTCADDITIONALHOSTS` to the proxy host, disable the
public UDP candidate, and configure the API with the assigned public port.

The API reads `LIVE_MEDIA_PRIVATE_HOST`, `LIVE_MEDIA_PUBLIC_TCP_PORT`,
`LIVE_STUDIO_ORIGIN`, `LIVE_MEDIA_CONTROL_PASSWORD`, and
`LIVE_STUDIO_SIGNING_KEY`. The last two are secrets. Reference the media
service's `MTX_AUTHINTERNALUSERS_1_PASS` for the control password and limit
the private control API to the server. Go Live becomes available after the
API confirms a connection to that service.

## Production hardening (not enabled by default)

- **TLS** everywhere (certbot / a TLS-terminating proxy); WebRTC needs HTTPS.
- **Auth**: per-stream publish tokens (MediaMTX external-auth webhook validating the
  streamId + token the control plane issued at go-live); signed playback URLs.
- **Public IP / ICE**: set `PUBLIC_IP`, OME `IceCandidate`, SRS `CANDIDATE`,
  LiveKit `use_external_ip` to the reachable address.
- **Scale**: add SRS edge nodes (`cluster { mode remote; origin srs; }`), multiple
  Nginx edges, and P2P Media Loader for egress offload.
