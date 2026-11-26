import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import en from '../i18n/locales/en';
import te from '../i18n/locales/te';
import hi from '../i18n/locales/hi';
import as from '../i18n/locales/as';
import bn from '../i18n/locales/bn';
import gu from '../i18n/locales/gu';
import kn from '../i18n/locales/kn';
import ml from '../i18n/locales/ml';
import mr from '../i18n/locales/mr';
import ne from '../i18n/locales/ne';
import or from '../i18n/locales/or';
import pa from '../i18n/locales/pa';
import ta from '../i18n/locales/ta';
import {
  FEATURE_DIRECTORY,
  DISCOVERY_GOALS,
  getFeaturedMoreItem,
  getMoreMenuSections,
} from '../lib/discoveryCatalog';

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

  it('keeps Candidate X-Ray out of navigation until it has a usable standalone flow', () => {
    const xray = FEATURE_DIRECTORY.find((f) => f.id === 'candidate_xray');
    expect(xray).toBeUndefined();
  });

  it('guarantees Civic Dashboard, Civic Metrics, Parliament, and News are available static routes', () => {
    const staticFeatures = ['civic_dashboard', 'civic_metrics', 'parliament', 'news'];
    for (const id of staticFeatures) {
      const feat = FEATURE_DIRECTORY.find((f) => f.id === id);
      expect(feat).toBeDefined();
      expect(feat?.status).toBe('available');
      expect(feat?.isDynamic).toBeFalsy();
    }
  });

  it('builds the More menu from one curated feature catalog without duplicate routes', () => {
    const featured = getFeaturedMoreItem();
    expect(featured?.id).toBe('pages_leaders');

    const sections = getMoreMenuSections();
    const sectionItems = sections.flatMap((section) => section.items);
    expect(sectionItems.some((item) => item.id === 'civic_metrics')).toBe(true);
    expect(sectionItems.some((item) => item.id === 'candidate_xray')).toBe(false);

    const menuRoutes = [featured!.route, ...sectionItems.map((item) => item.route)];
    expect(new Set(menuRoutes).size).toBe(menuRoutes.length);
    for (const route of menuRoutes) {
      const path = resolve(__dirname, '../app', route.slice(1));
      const tabPath = resolve(__dirname, '../app/(tabs)', route.slice(1));
      expect([`${path}.tsx`, resolve(path, 'index.tsx'), `${tabPath}.tsx`].some(existsSync)).toBe(
        true,
      );
    }
  });

  it('supplies the new directory messages in all supported languages', () => {
    for (const { pages } of [en, te, hi, as, bn, gu, kn, ml, mr, ne, or, pa, ta]) {
      expect(pages.selectStateForRepresentatives).toBeTruthy();
      expect(pages.noCurrentRepresentatives).toContain('{{state}}');
      expect(pages.browseConstituencies).toBeTruthy();
      expect(pages.currentRepresentativesUnavailable).toBeTruthy();
      expect(pages.verifiedProfilesUnavailable).toBeTruthy();
      expect(pages.verifiedLeaders).toBeTruthy();
    }
  });
});
