# KSHETRA — India's Political Operating System

> India's integrated political intelligence and civic technology platform built for the post-delimitation era.

## Vision

KSHETRA is being built as a national political intelligence and civic platform covering India's states and Union Territories, their political geography, elections, representatives, political organizations, local governance, public information, civic participation, and AI-powered intelligence.

The platform is designed around continuously updated, evidence-backed political and geographic data rather than a single-state implementation. National coverage, temporal correctness, provenance, multilingual access, and backend-driven updates are core architectural requirements.

## Product Engines

| Engine | Purpose | Model |
|---|---|---|
| **Political & Constituency Intelligence** | Interactive maps, geography, boundary versions, demographics, election history, representatives and political intelligence | Civic + premium intelligence layers |
| **Media & Civic Information** | Geo-aware news, political timelines, trivia, civic information, multilingual content and verified public information | Free / premium layers |
| **Campaign & Political Operations** | Content distribution, voter segmentation, field operations, analytics and political workflow tools | Paid SaaS |
| **AI Intelligence** | Evidence-backed political research, conversational intelligence, analysis and multilingual assistance | Integrated platform capability |
| **Partner / Developer Platform** | Governed APIs and partner integrations over canonical KSHETRA data | API / SaaS |

## Architecture Principles

- **India-wide by design:** all production features must support the complete applicable national geography and jurisdiction model rather than relying on a pilot state.
- **Canonical backend truth:** the backend and database are the source of truth; mobile/web presentation layers must not become competing sources of canonical political or geographic data.
- **Temporal correctness:** political and geographic facts must support effective dates, historical state, current state and future/scenario state where applicable.
- **Evidence and provenance:** externally sourced facts must retain source, retrieval, verification and transformation metadata appropriate to their use.
- **Continuous updating:** important political, geographic, election, news and civic information should be capable of being refreshed through governed backend data pipelines.
- **Multilingual access:** users should be able to read, search and write in supported Indian languages; localization is not limited to translating static UI labels.
- **Backend-first integration:** production UI features should consume the appropriate backend/API capability rather than maintaining duplicate device-specific implementations of the same business logic.

## Tech Stack

| Layer | Technology |
|---|---|
| **Mobile App** | React Native + Expo (TypeScript) |
| **Maps** | MapLibre React Native |
| **Backend API** | Node.js + Fastify (TypeScript) |
| **Database** | PostgreSQL + PostGIS + pgvector (Supabase) |
| **Shared Types** | `@kshetra/shared` (TypeScript) |
| **AI Layer** | LangChain.js / Python services as applicable |
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
├── data/                # GeoJSON, raw/derived data and ingestion assets
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

1. Pick a task from the current build plan
2. Read the current execution state and relevant architecture documents before changing code
3. Prefer existing canonical backend/domain foundations over creating duplicate implementations
4. Write/update tests first (TDD where applicable)
5. Implement the feature across the complete applicable India-wide domain, not a sample state or constituency
6. Wire production UI/mobile functionality to the backend capability where one exists
7. Run tests — all must pass
8. Update the authoritative project execution documentation
9. Commit with conventional commit message
10. Repeat

## Commit Convention

```
feat:     New feature
fix:      Bug fix
docs:     Documentation only
test:      Adding/updating tests
refactor: Code refactor (no feature change)
chore:    Build, config, tooling changes
style:    Formatting, whitespace (no logic change)
```

## License

Proprietary — All rights reserved.
