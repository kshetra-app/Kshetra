import {
  fetchCivicPublisherFingerprint,
  fingerprintPublisherDocument,
  isCivicPublisherCheckDue,
} from '../services/civicPublisherMonitor';

describe('official civic publisher fingerprints', () => {
  it('ignores duplicate and reordered law links but detects a new document', () => {
    const first = '<a href="/fileShow?fileName=/Uploads/LawDepartment/one.pdf">One</a>';
    const second = '<a href="/fileShow?fileName=/Uploads/LawDepartment/two.pdf">Two</a>';
    const digest = fingerprintPublisherDocument('legislation-index', first + second);
    expect(fingerprintPublisherDocument('legislation-index', second + first + first)).toBe(digest);
    expect(fingerprintPublisherDocument('legislation-index', first)).not.toBe(digest);
  });

  it('ignores the RSS build timestamp but detects edits to published items', () => {
    const feed = (timestamp: string, title: string) =>
      `<rss><channel><lastBuildDate>${timestamp}</lastBuildDate><item><title>${title}</title></item></channel></rss>`;
    const digest = fingerprintPublisherDocument('rss', feed('first', 'Bridge opened'));
    expect(fingerprintPublisherDocument('rss', feed('second', 'Bridge opened'))).toBe(digest);
    expect(fingerprintPublisherDocument('rss', feed('second', 'Bridge opening moved'))).not.toBe(
      digest,
    );
  });

  it('detects revised hearing notices and rejects HTML without hearing records', () => {
    const notice = (date: string) => `<tr><td>Date of Public Hearing: ${date}</td></tr>`;
    const digest = fingerprintPublisherDocument('hearing-notices', notice('05.03.2026'));
    expect(fingerprintPublisherDocument('hearing-notices', notice('06.03.2026'))).not.toBe(digest);
    expect(() =>
      fingerprintPublisherDocument('hearing-notices', '<html>Unavailable</html>'),
    ).toThrow('Publisher response did not contain the expected records');
  });
});

describe('scheduled civic publisher checks', () => {
  const completedAt = Date.UTC(2026, 10, 27, 6);
  const oneHour = 60 * 60 * 1000;
  const lastCheck = {
    transport: 'supabase-mumbai',
    status: 'baseline',
    last_attempt_at: new Date(completedAt).toISOString(),
  };

  it('checks when enabling the new transport and then once a day', () => {
    expect(isCivicPublisherCheckDue({ ...lastCheck, transport: undefined }, completedAt)).toBe(
      true,
    );
    expect(isCivicPublisherCheckDue(lastCheck, completedAt + 24 * oneHour - 1)).toBe(false);
    expect(isCivicPublisherCheckDue(lastCheck, completedAt + 24 * oneHour)).toBe(true);
  });

  it('retries a failed check once an hour', () => {
    const failed = { ...lastCheck, status: 'unavailable' };
    expect(isCivicPublisherCheckDue(failed, completedAt + oneHour - 1)).toBe(false);
    expect(isCivicPublisherCheckDue(failed, completedAt + oneHour)).toBe(true);
  });
});

describe('Mumbai civic publisher worker', () => {
  const worker = new URL('https://example.supabase.co/functions/v1/civic-publisher');
  const source = { id: 'telangana_state_portal', format: 'rss' } as const;
  const feed = '<rss><channel><item><title>Official notice</title></item></channel></rss>';

  afterEach(() => jest.restoreAllMocks());

  it('sends a publisher ID to the authenticated worker and fingerprints its response', async () => {
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(feed, { headers: { 'x-sb-edge-region': 'ap-south-1' } }));
    await expect(fetchCivicPublisherFingerprint(worker, 'scoped-token', source)).resolves.toBe(
      fingerprintPublisherDocument('rss', feed),
    );
    expect(fetch).toHaveBeenCalledWith(
      new URL(worker.href + '?publisher=telangana_state_portal'),
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        headers: { 'x-region': 'ap-south-1', 'x-poligram-civic-token': 'scoped-token' },
      }),
    );
  });

  it('rejects a failed request and a response outside Mumbai', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 504 }))
      .mockResolvedValueOnce(
        new Response(feed, { headers: { 'x-sb-edge-region': 'ap-southeast-1' } }),
      );
    await expect(fetchCivicPublisherFingerprint(worker, 'scoped-token', source)).rejects.toThrow(
      'Publisher worker returned HTTP 504',
    );
    await expect(fetchCivicPublisherFingerprint(worker, 'scoped-token', source)).rejects.toThrow(
      'Publisher worker did not run in the expected region',
    );
  });
});
