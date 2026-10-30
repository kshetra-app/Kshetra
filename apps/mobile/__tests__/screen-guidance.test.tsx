import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DiscoveryHubSheet from '../components/DiscoveryHubSheet';
import { SCREEN_GUIDES } from '../lib/discoveryCatalog';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: any, opts: any) => {
      const titles: Record<string, string> = {
        'discovery.guides.map.title': 'Map Discovery Guide',
        'discovery.guides.map.purpose': 'Navigate constituencies across India',
        'discovery.guides.explore.title': 'Explore Search Guide',
        'discovery.guides.explore.purpose': 'Search and filter legislative assemblies',
      };
      return titles[key] || opts?.defaultValue || key;
    },
    i18n: { language: 'en' },
  }),
}));

describe('Screen Guidance Integration', () => {
  it('renders Map guidance when sourceScreen is map', () => {
    render(
      <DiscoveryHubSheet
        visible={true}
        onClose={jest.fn()}
        sourceScreen="map"
        initialSection="guide"
      />,
    );

    expect(screen.getByText('Map Discovery Guide')).toBeTruthy();
    expect(screen.getByText('Navigate constituencies across India')).toBeTruthy();
  });

  it('renders Explore guidance when sourceScreen is explore', () => {
    render(
      <DiscoveryHubSheet
        visible={true}
        onClose={jest.fn()}
        sourceScreen="explore"
        initialSection="guide"
      />,
    );

    expect(screen.getByText('Explore Search Guide')).toBeTruthy();
    expect(screen.getByText('Search and filter legislative assemblies')).toBeTruthy();
  });

  it('verifies all screen guides specify valid verified routes', () => {
    const keys = Object.keys(SCREEN_GUIDES);
    expect(keys.length).toBeGreaterThanOrEqual(25);

    for (const key of keys) {
      const entry = SCREEN_GUIDES[key];
      expect(entry.verifiedRoute.startsWith('/')).toBe(true);
      expect(entry.stepsKeys.length).toBeGreaterThan(0);
    }
  });
});
