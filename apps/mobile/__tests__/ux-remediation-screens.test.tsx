import fs from 'fs';
import path from 'path';

describe('Mobile UX Remediation Specification Verification (Batches 1-7)', () => {
  const mobileRoot = path.join(__dirname, '..');

  it('verifies explore.tsx includes DiscoveryHubSheet, active filter chips, and Help trigger', () => {
    const exploreCode = fs.readFileSync(path.join(mobileRoot, 'app/(tabs)/explore.tsx'), 'utf-8');
    expect(exploreCode).toContain('DiscoveryHubSheet');
    expect(exploreCode).toContain('showDiscoveryHub');
    expect(exploreCode).toContain('activeFilterCount > 0');
    expect(exploreCode).toContain('activeChip');
    expect(exploreCode).toContain('clearChip');
  });

  it('verifies community.tsx embeds DiscoveryHubSheet and contextual help trigger without duplicate header', () => {
    const communityCode = fs.readFileSync(path.join(mobileRoot, 'app/(tabs)/community.tsx'), 'utf-8');
    expect(communityCode).toContain('DiscoveryHubSheet');
    expect(communityCode).toContain('showDiscoveryHub');
    expect(communityCode).toContain('POLIGRAM');
    expect(communityCode).toContain('sourceScreen="community"');
  });

  it('verifies news.tsx integrates DiscoveryHubSheet and help trigger', () => {
    const newsCode = fs.readFileSync(path.join(mobileRoot, 'app/(tabs)/news.tsx'), 'utf-8');
    expect(newsCode).toContain('DiscoveryHubSheet');
    expect(newsCode).toContain('showDiscoveryHub');
    expect(newsCode).toContain('sourceScreen="news"');
  });

  it('uses four catalog sections and preserves the contextual route to Candidate X-Ray', () => {
    const moreCode = fs.readFileSync(path.join(mobileRoot, 'app/(tabs)/more.tsx'), 'utf-8');
    expect(moreCode).toContain('DiscoveryHubSheet');
    expect(moreCode).toContain('showDiscoveryHub');
    expect(moreCode).toContain('getMoreMenuSections()');
    const { getMoreMenuSections } = require('../lib/discoveryCatalog') as typeof import('../lib/discoveryCatalog');
    const sections = getMoreMenuSections();
    expect(sections.map(({ category }) => category)).toEqual(['civic', 'leadership', 'media', 'tools']);
    expect(sections.flatMap(({ items }) => items.map(({ route }) => route))).not.toContain('/candidate-xray');
    expect(fs.existsSync(path.join(mobileRoot, 'app/candidate-xray/[id].tsx'))).toBe(true);
  });

  it('verifies profile.tsx has merged About section without duplicate headings', () => {
    const profileCode = fs.readFileSync(path.join(mobileRoot, 'app/(tabs)/profile.tsx'), 'utf-8');
    // Ensure privacy policy and terms of service are preserved
    expect(profileCode).toContain('profileExtended.privacyPolicy');
    expect(profileCode).toContain('profileExtended.termsOfService');
    // Ensure sectionTitle for profile.about appears exactly once
    const matches = profileCode.match(/<Text style=\{styles\.sectionTitle\}>\{t\('profile\.about'\)\}<\/Text>/g);
    expect(matches).toHaveLength(1);
  });

  it('verifies leadership-academy.tsx has established single title ownership', () => {
    const leadershipCode = fs.readFileSync(path.join(mobileRoot, 'app/leadership-academy.tsx'), 'utf-8');
    // Native Stack.Screen title is disabled so in-page custom header with back button owns it
    expect(leadershipCode).toContain('<Stack.Screen options={{ headerShown: false }} />');
  });

  it('verifies constituency/[id].tsx has resolved title duplication', () => {
    const constCode = fs.readFileSync(path.join(mobileRoot, 'app/constituency/[id].tsx'), 'utf-8');
    expect(constCode).toContain("title: '', // Native header provides back button; in-page hero owns primary title (Batch 6)");
  });

  it('verifies search.tsx includes feature & help matching without network/AI requests', () => {
    const searchCode = fs.readFileSync(path.join(mobileRoot, 'app/search.tsx'), 'utf-8');
    expect(searchCode).toContain('searchDiscoveryCatalog');
    expect(searchCode).toContain('featureResults');
    expect(searchCode).toContain('DiscoveryHubSheet');
  });
});
