import { fingerprintPublisherDocument } from '../services/civicPublisherMonitor';

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
