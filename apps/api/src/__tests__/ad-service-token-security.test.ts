import { adService } from '../services/adService';

describe('ad telemetry view-token security', () => {
  const originalSecret = process.env.AD_VIEW_TOKEN_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.AD_VIEW_TOKEN_SECRET;
    else process.env.AD_VIEW_TOKEN_SECRET = originalSecret;
  });

  it('signs and verifies tokens with the configured secret', () => {
    process.env.AD_VIEW_TOKEN_SECRET = 'test-view-token-secret-with-at-least-32-bytes';

    const token = adService.generateViewToken('ad-1', 'session-1');

    expect(adService.verifyViewToken(token)).toEqual({
      valid: true,
      adId: 'ad-1',
      userSessionHash: 'session-1',
    });
  });

  it('rejects modified signatures', () => {
    process.env.AD_VIEW_TOKEN_SECRET = 'test-view-token-secret-with-at-least-32-bytes';
    const token = adService.generateViewToken('ad-1', 'session-1');
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    parts[3] = `${parts[3][0] === '0' ? '1' : '0'}${parts[3].slice(1)}`;

    expect(adService.verifyViewToken(Buffer.from(parts.join(':')).toString('base64url')).valid).toBe(
      false,
    );
  });

  it('does not issue or accept tokens when the secret is missing or too short', () => {
    delete process.env.AD_VIEW_TOKEN_SECRET;
    expect(() => adService.generateViewToken('ad-1', 'session-1')).toThrow(
      'AD_VIEW_TOKEN_SECRET must contain at least 32 bytes',
    );
    expect(adService.verifyViewToken('not-a-token').valid).toBe(false);

    process.env.AD_VIEW_TOKEN_SECRET = 'too-short';
    expect(() => adService.generateViewToken('ad-1', 'session-1')).toThrow(
      'AD_VIEW_TOKEN_SECRET must contain at least 32 bytes',
    );
  });
});
