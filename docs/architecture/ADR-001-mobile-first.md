# ADR-001: Mobile-First Architecture

**Status**: Accepted
**Date**: 2026-04-26

## Context

KSHETRA needs to serve candidates, journalists, and citizens across India. The founder's vision is mobile-first — the primary interface is a mobile app, with a website as a secondary product.

## Decision

Build the primary product as a React Native (Expo) mobile app. The backend API is a standalone Fastify service. A Next.js website will be added in Phase 2, consuming the same API.

## Rationale

- GPS/location is native on mobile (Find My Constituency = one tap)
- Field workers need offline access in rural areas
- Push notifications for election alerts
- Camera for ground reporting
- React Native shares TypeScript with backend and future web app

## Consequences

- No SEO benefit until website is built (Phase 2)
- App store review process adds deployment friction
- Must handle offline-first data syncing
