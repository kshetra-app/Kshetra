# KSHETRA — India's Political Operating System

> India's first integrated political technology platform built for the post-delimitation era.

## Vision

Delimitation will create ~2,500+ new constituencies where no incumbent advantage, data, or campaign infrastructure exists. KSHETRA maps these seats and gives every stakeholder — candidates, parties, media, and citizens — the tools to navigate the new political geography.

## Three Product Engines

| Engine | Purpose | Model |
|---|---|---|
| **Constituency Intelligence** | Interactive maps, boundary overlays, demographics, election history | Free (civic layer) |
| **Media & Journalist Network** | Geo-tagged news, journalist verification, embeddable widgets | Freemium |
| **Campaign Manager** | Content distribution, voter segmentation, field ops, analytics | Paid SaaS |

## Tech Stack

| Layer | Technology |
|---|---|
| **Mobile App** | React Native + Expo (TypeScript) |
| **Maps** | Mapbox GL (`@rnmapbox/maps`) |
| **Backend API** | Node.js + Fastify (TypeScript) |
| **Database** | PostgreSQL + PostGIS + pgvector (Supabase) |
| **Shared Types** | `@kshetra/shared` (TypeScript) |
| **AI Layer** | LangChain.js, Python FastAPI microservice |
| **Monorepo** | Turborepo + npm workspaces |
| **Testing** | Jest + React Native Testing Library |
| **CI/CD** | GitHub Actions + EAS Build |

## Project Structure

```
kshetra/
├── apps/
│   ├── mobile/          # Expo React Native app
│   └── api/             # Fastify backend API
├── packages/
│   └── shared/          # Shared types, constants, utilities
├── data/                # GeoJSON, raw data files
├── docs/                # Architecture docs, ADRs
├── building.md          # Living build log
├── turbo.json           # Turborepo config
└── package.json         # Root workspace config
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Expo CLI (`npx expo`)
- Android Studio / Xcode (for native builds)
- Mapbox access token

### Install

```bash
npm install
```

### Run Mobile App

```bash
npm run dev:mobile
```

### Run Backend API

```bash
npm run dev:api
```

### Run Tests

```bash
npm test
```

## Development Workflow

1. Pick a task from the build plan
2. Write/update tests first (TDD where applicable)
3. Implement the feature
4. Run tests — all must pass
5. Update `building.md` with what was built
6. Commit with conventional commit message
7. Repeat

## Commit Convention

```
feat:     New feature
fix:      Bug fix
docs:     Documentation only
test:     Adding/updating tests
refactor: Code refactor (no feature change)
chore:    Build, config, tooling changes
style:    Formatting, whitespace (no logic change)
```

## License

Proprietary — All rights reserved.
