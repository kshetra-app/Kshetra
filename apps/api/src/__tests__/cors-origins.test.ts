import { resolveCorsOrigin } from '../lib/corsOrigins';

describe('deployment CORS origins', () => {
  it('allows the Staging reviewer portal even when Railway sets production Node mode', () => {
    const origins = resolveCorsOrigin({
      NODE_ENV: 'production',
      RAILWAY_ENVIRONMENT_NAME: 'Staging',
      CORS_ORIGINS: ' https://review.example.com ',
    });
    expect(origins).toEqual(
      expect.arrayContaining(['http://localhost:3000', 'https://review.example.com']),
    );
  });

  it('keeps localhost out of the Production allowlist by default', () => {
    const origins = resolveCorsOrigin({
      NODE_ENV: 'production',
      RAILWAY_ENVIRONMENT_NAME: 'Production',
      APP_ENV: 'staging',
    });
    expect(origins).toContain('https://poligram.in');
    expect(origins).not.toContain('http://localhost:3000');
  });
});
