/**
 * Kshetra LMX — WHIP client (WebRTC-HTTP Ingestion Protocol, IETF draft).
 *
 * Pure negotiation logic decoupled from react-native-webrtc so it is unit-testable
 * in Node: it operates on a minimal peer-connection interface and an injectable
 * fetch. `components/LiveBroadcaster` wires a real RTCPeerConnection into it.
 *
 * Flow: create SDP offer -> POST to the WHIP endpoint (Content-Type application/sdp)
 * -> apply the SDP answer -> keep the returned resource URL to DELETE on stop.
 * Works against MediaMTX (:8889), OvenMediaEngine, and other WHIP origins.
 */

export interface SdpDescription {
  type: string; // 'offer' | 'answer'
  sdp?: string;
}

/** The subset of RTCPeerConnection we depend on (satisfied by react-native-webrtc). */
export interface MinimalPeer {
  createOffer(options?: unknown): Promise<SdpDescription>;
  setLocalDescription(desc: SdpDescription): Promise<void>;
  setRemoteDescription(desc: SdpDescription): Promise<void>;
  readonly localDescription: SdpDescription | null;
}

export interface WhipOptions {
  /** Bearer token issued by the control plane at go-live (optional). */
  token?: string;
  /** Injectable fetch (defaults to global fetch); enables testing. */
  fetch?: typeof fetch;
  /** Passed to createOffer (e.g. offerToReceiveVideo:false for a send-only broadcast). */
  offerOptions?: unknown;
}

export interface WhipSession {
  /** WHIP resource URL to DELETE when the broadcast ends (null if server omitted it). */
  resourceUrl: string | null;
}

/** Negotiate a WHIP publish session. Throws on a non-2xx response. */
export async function negotiateWhip(
  pc: MinimalPeer,
  endpoint: string,
  opts: WhipOptions = {},
): Promise<WhipSession> {
  const doFetch = opts.fetch ?? fetch;

  const offer = await pc.createOffer(opts.offerOptions ?? {});
  await pc.setLocalDescription(offer);
  const sdp = pc.localDescription?.sdp ?? offer.sdp;
  if (!sdp) throw new Error('WHIP: local SDP offer is empty');

  const headers: Record<string, string> = { 'Content-Type': 'application/sdp' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await doFetch(endpoint, { method: 'POST', headers, body: sdp });
  if (!res.ok) {
    throw new Error(`WHIP publish failed: HTTP ${res.status} ${res.statusText ?? ''}`.trim());
  }

  const answer = await res.text();
  if (!answer) throw new Error('WHIP: empty SDP answer');
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });

  // The Location header may be relative — resolve against the endpoint.
  const location = res.headers.get('Location');
  let resourceUrl: string | null = null;
  if (location) {
    try {
      resourceUrl = new URL(location, endpoint).toString();
    } catch {
      resourceUrl = location;
    }
  }
  return { resourceUrl };
}

/** Tear down a WHIP session (best-effort DELETE). Never throws. */
export async function stopWhip(resourceUrl: string | null, opts: WhipOptions = {}): Promise<void> {
  if (!resourceUrl) return;
  const doFetch = opts.fetch ?? fetch;
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  try {
    await doFetch(resourceUrl, { method: 'DELETE', headers });
  } catch {
    // best-effort; the server also cleans up when the peer connection drops.
  }
}
