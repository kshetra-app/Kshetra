import fs from 'fs';
import path from 'path';

describe('Route Manifest Integrity (Section 8 & Appendix A)', () => {
  const mobileAppRoot = path.join(__dirname, '..', 'app');

  const EXPECTED_ROUTES = [
    '(tabs)/index.tsx',
    '(tabs)/community.tsx',
    '(tabs)/dashboard.tsx',
    '(tabs)/explore.tsx',
    '(tabs)/feed.tsx',
    '(tabs)/intelligence.tsx',
    '(tabs)/live.tsx',
    '(tabs)/more.tsx',
    '(tabs)/news.tsx',
    '(tabs)/profile.tsx',
    '(tabs)/shorts.tsx',
    'ai-chat.tsx',
    'auth/sign-in.tsx',
    'campaign-manager/index.tsx',
    'candidate-xray/[id].tsx',
    'civic-metrics/index.tsx',
    'constituency/[id].tsx',
    'delimitation/index.tsx',
    'delimitation/my-impact.tsx',
    'delimitation/simulator.tsx',
    'delimitation/state/[code].tsx',
    'departments/dashboard.tsx',
    'edit-profile.tsx',
    'hierarchy/[id].tsx',
    'issue/[id].tsx',
    'journalist/index.tsx',
    'leadership-academy.tsx',
    'legislator/[id].tsx',
    'live-election/index.tsx',
    'live/[id].tsx',
    'live/distribution.tsx',
    'live/go-live.tsx',
    'live/moderation-queue.tsx',
    'local-bodies/index.tsx',
    'messages/[conversationId].tsx',
    'messages/index.tsx',
    'moderation/index.tsx',
    'notification-settings.tsx',
    'notifications.tsx',
    'onboarding.tsx',
    'pages/index.tsx',
    'parliament/index.tsx',
    'politician-portal/index.tsx',
    'reader.tsx',
    'representative/[id].tsx',
    'representative/edit/[id].tsx',
    'search.tsx',
    'user/[userId].tsx',
  ];

  it('guarantees all 48 non-layout routes exist exactly as specified in the manifest', () => {
    expect(EXPECTED_ROUTES).toHaveLength(48);

    for (const routePath of EXPECTED_ROUTES) {
      const fullPath = path.join(mobileAppRoot, routePath);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });

  it('guarantees both Expo Router layout files exist', () => {
    expect(fs.existsSync(path.join(mobileAppRoot, '_layout.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(mobileAppRoot, '(tabs)', '_layout.tsx'))).toBe(true);
  });
});
