import Fastify from 'fastify';
import { publicWebRoutes } from '../routes/publicWeb';

jest.mock('../services/publicWebService', () => ({}));

describe('public invitation landing page', () => {
  const app = Fastify();

  beforeAll(async () => {
    await app.register(publicWebRoutes);
  });

  beforeEach(() => {
    jest.replaceProperty(process, 'env', { ...process.env, APP_ENV: 'staging' });
    delete process.env.POLIGRAM_ANDROID_INSTALL_URL;
    delete process.env.POLIGRAM_IOS_INSTALL_URL;
    delete process.env.POLIGRAM_ANDROID_INSTALL_EXPIRES_AT;
    delete process.env.POLIGRAM_IOS_INSTALL_EXPIRES_AT;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('has unauthenticated app and browser paths with actionable test-build instructions', async () => {
    const landing = await app.inject({ url: '/join' });

    expect(landing.statusCode).toBe(200);
    expect(landing.headers['content-type']).toContain('text/html');
    expect(landing.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(landing.body).toContain('href="kshetra://welcome"');
    expect(landing.body).toContain('href="/public/states/TS"');
    expect(landing.body).toContain('Ask the person who invited you');
    expect(landing.body).not.toContain('Get the Android test build');
  });

  it('shows configured HTTPS install links and ignores non-HTTPS installer destinations', async () => {
    process.env.POLIGRAM_ANDROID_INSTALL_URL = 'https://downloads.example.org/test?release=1&abi=2';
    process.env.POLIGRAM_IOS_INSTALL_URL = 'http://downloads.example.org/ios';

    const landing = await app.inject({ url: '/join' });

    expect(landing.body).toContain('href="https://downloads.example.org/test?release=1&amp;abi=2"');
    expect(landing.body).toContain('Get the Android test build');
    expect(landing.body).toContain('After installing, return here and tap Open Poligram.');
    expect(landing.body).not.toContain('http://downloads.example.org/ios');
    expect(landing.body).toContain('Ask the person who invited you');
  });

  it('does not label a production invitation as a Staging test', async () => {
    process.env.APP_ENV = 'production';
    const landing = await app.inject({ url: '/join' });

    expect(landing.body).toContain('<title>Join Poligram</title>');
    expect(landing.body).not.toContain('Staging');
  });

  it('drops an expired test installer and keeps the browser fallback available', async () => {
    process.env.POLIGRAM_ANDROID_INSTALL_URL = 'https://downloads.example.org/preview.apk';
    process.env.POLIGRAM_ANDROID_INSTALL_EXPIRES_AT = '2025-01-01T00:00:00Z';

    const landing = await app.inject({ url: '/join' });

    expect(landing.body).not.toContain('preview.apk');
    expect(landing.body).toContain('Ask the person who invited you');
    expect(landing.body).toContain('href="/public/states/TS"');
  });

  it('recognizes Railway Staging independently of the Node runtime mode', async () => {
    delete process.env.APP_ENV;
    process.env.RAILWAY_ENVIRONMENT_NAME = 'Staging';
    process.env.NODE_ENV = 'production';
    const landing = await app.inject({ url: '/join' });

    expect(landing.body).toContain('<title>Poligram Staging invitation</title>');
  });
});
