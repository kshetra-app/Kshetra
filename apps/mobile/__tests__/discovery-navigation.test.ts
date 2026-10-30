import { FEATURE_DIRECTORY, DISCOVERY_GOALS } from '../lib/discoveryCatalog';

describe('Discovery Navigation Contract Verification', () => {
  it('all goals route to verified paths', () => {
    for (const goal of DISCOVERY_GOALS) {
      if (goal.targetRoute) {
        expect(goal.targetRoute.startsWith('/')).toBe(true);
      }
    }
  });

  it('no feature directory route has un-encoded dynamic brackets without isDynamic mark', () => {
    for (const item of FEATURE_DIRECTORY) {
      if (item.route.includes('[') || item.route.includes(':')) {
        expect(item.isDynamic).toBe(true);
      }
    }
  });

  it('guarantees Candidate X-Ray has isDynamic=true and compatibility_only status', () => {
    const xray = FEATURE_DIRECTORY.find((f) => f.id === 'candidate_xray');
    expect(xray).toBeDefined();
    expect(xray?.isDynamic).toBe(true);
    expect(xray?.status).toBe('compatibility_only');
  });

  it('guarantees Civic Dashboard, Intelligence, Parliament, and News are available static routes', () => {
    const staticFeatures = ['civic_dashboard', 'intelligence', 'parliament', 'news'];
    for (const id of staticFeatures) {
      const feat = FEATURE_DIRECTORY.find((f) => f.id === id);
      expect(feat).toBeDefined();
      expect(feat?.status).toBe('available');
      expect(feat?.isDynamic).toBeFalsy();
    }
  });
});
