# Mobile UX Remediation --- Repository-Backed Implementation Specification & Integrated Addendum

**Project:** POLIGRAM (repository: `kshetra-app/Kshetra`)\
**Artifact type:** Master Implementation Plan & Integrated Addendum\
**Plan ID:** `PLAN-MOBILE-UX-REMEDIATION-REV-1.1-INTEGRATED`\
**Parent Plan ID:** `PLAN-MOBILE-UX-REMEDIATION-REV-1.0`\
**Baseline branch:** `master`\
**Baseline commit:** `91d5c6346df3d0123da8cb8f1353bb6da7de5299`\
**Status:** APPROVED & AUTHORIZED FOR IMPLEMENTATION (DEC-201)\
**Disposition:** Active Operational Authority for Mobile UX Remediation, Discovery Hub & Page Guidance.

---

## 1. Document title, metadata and purpose

This document defines a conservative, measurable, screen-by-screen remediation of the mobile application's visual density, repeated navigation, duplicated labels, over-expanded filter groups, inconsistent title hierarchy and unnecessarily prominent secondary information, integrated with spatial map navigation, goal-based discovery, feature directory and contextual page guidance without changing existing business logic or removing capabilities.

## 2. Problem statement and objectives

1. One clear purpose and primary action per screen.
2. One visible page-title treatment per screen, unless a deliberate native/immersive pattern requires otherwise.
3. One owner for each user preference and each piece of persisted state.
4. Advanced filters collapsed by default, while preserving all filter dimensions and their semantics.
5. Related sub-features grouped into discoverable, reversible navigation structures.
6. Reduced vertical space spent on redundant headings, repeated labels and decorative containers.
7. Clearer information hierarchy: primary content first, supporting detail second, technical provenance available without dominating.
8. Consistent component spacing, typography, surfaces, selectors, chips, sheets and empty/loading/error states.
9. No loss of route reachability, deep-link compatibility, accessibility, translations, offline support, analytics, attribution, moderation or security controls.
10. Measurable visual improvement validated with repeatable screenshots and functional tests.

## 3. Scope of Work

- All 48 non-layout routes in `apps/mobile/app/`
- Layouts: `_layout.tsx`, `(tabs)/_layout.tsx`
- Discovery Catalog: `apps/mobile/lib/discoveryCatalog.ts`
- Discovery Hub Sheet: `apps/mobile/components/DiscoveryHubSheet.tsx`
- Search feature/help integration: `apps/mobile/app/search.tsx`
- 13 Locales translations for all new guidance, catalog and navigation terms.
- Unit and component tests for catalog, sheet, navigation and screen guidance.
